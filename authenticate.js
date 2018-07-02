const jwksClient = require('jwks-rsa');
const jwt = require('jsonwebtoken');
const util = require('util');

const { auth0 } = require('./config');

/**
 * Extract and return the Bearer Token from the Lambda event parameters
 * @param {object} params
 * @returns {string}
 */
const getToken = (params) => {
  if (!params.type || params.type !== 'TOKEN') {
    throw new Error('Expected "event.type" parameter to have value "TOKEN"');
  }

  const tokenString = params.authorizationToken;
  if (!tokenString) {
    throw new Error('Expected "event.authorizationToken" parameter to be set');
  }

  const match = tokenString.match(/^Bearer (.*)$/);
  if (!match || match.length < 2) {
    throw new Error(`Invalid Authorization token - ${tokenString} does not match "Bearer .*"`);
  }
  return match[1];
};

/**
 * Handle authentication
 * @param {object} params
 * @returns {object}
 */
module.exports = async (params) => {
  const token = getToken(params);

  const decoded = jwt.decode(token, { complete: true });
  if (!decoded || !decoded.header || !decoded.header.kid) throw new Error('invalid token');

  const client = jwksClient({
    cache: true,
    rateLimit: true,
    jwksRequestsPerMinute: 10, // Default value
    jwksUri: auth0.jwksUri,
  });

  const getSigningKey = util.promisify(client.getSigningKey);

  const { publicKey, rsaPublicKey } = await getSigningKey(decoded.header.kid);
  const signingKey = publicKey || rsaPublicKey;

  const { sub, scope } = await jwt.verify(token, signingKey, {
    audience: auth0.audience,
    issuer: auth0.tokenIssuer,
  });

  return {
    principalId: sub,
    context: { scope },
    policyDocument: {
      Version: '2012-10-17', // default version
      Statement: [
        {
          Action: 'execute-api:Invoke', // default action
          Effect: 'Allow',
          Resource: params.methodArn,
        },
      ],
    },
  };
};
