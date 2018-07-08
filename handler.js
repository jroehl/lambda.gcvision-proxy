require('dotenv').config();

const rp = require('request-promise-native');

const {
  gcVision, auth0, initialCredits, ocrType,
} = require('./config');
const authenticate = require('./authenticate');

function HttpException(message, code = 400, status = 'BAD_REQUEST') {
  this.code = code;
  this.status = status;
  this.message = message;
}

const getUser = async (id, managementToken) => {
  const user = await rp({
    json: true,
    uri: `${auth0.tokenIssuer}api/v2/users/${id}`,
    headers: {
      authorization: `Bearer ${managementToken}`,
    },
  });
  return user;
};

const updateUser = async (id, managementToken, metaData) => {
  const user = await rp({
    method: 'PATCH',
    json: true,
    uri: `${auth0.tokenIssuer}api/v2/users/${id}`,
    headers: {
      authorization: `Bearer ${managementToken}`,
    },
    body: { app_metadata: metaData },
  });
  return user;
};

const getManagementToken = async () => {
  const { management, tokenIssuer, token } = auth0;
  if (token) return token;
  const res = await rp({
    method: 'POST',
    json: true,
    uri: `${tokenIssuer}oauth/token`,
    headers: {
      'content-type': 'application/json',
    },
    body: {
      client_id: management.clientId,
      client_secret: management.clientSecret,
      audience: `${tokenIssuer}api/v2/`,
      grant_type: 'client_credentials',
    },
  });
  return res.access_token;
};

/**
 * Proxy the event to the google cloud vision api endpoint
 * @param {object} event
 * @returns {promise}
 */
module.exports.proxy = async ({ body, requestContext }) => {
  try {
    const { base64 } = typeof body === 'string' ? JSON.parse(body) : body;
    if (!base64) {
      throw new HttpException(
        'Base64 image string must be added to request body',
        400,
        'BAD_REQUEST',
      );
    }

    const managementToken = await getManagementToken();
    const { principalId: id } = requestContext.authorizer; // user id

    const user = await getUser(id, managementToken);
    const { app_metadata: appMetadata = {} } = user;
    const { credits = initialCredits } = appMetadata;

    if (!credits) {
      throw new HttpException(
        'Not enough credits to request OCR - please top up',
        402,
        'CREDITS_REQUIRED',
      );
    }

    console.log(`${id} (${credits}): Request "${ocrType}" send to "${gcVision.api}"`);
    const {
      responses: [response], // one request === one response
    } = await rp({
      uri: gcVision.api,
      method: 'POST',
      qs: { key: gcVision.key },
      json: true,
      body: {
        requests: [
          {
            image: { content: base64 },
            features: [{ type: ocrType }],
          },
        ],
      },
    });

    // update credits after successful ocr
    const {
      app_metadata: { credits: updatedCredits },
    } = await updateUser(id, managementToken, { credits: credits - 1 });

    return {
      statusCode: response.code,
      body: JSON.stringify({
        meta: { credits: updatedCredits },
        ocr: response,
      }),
    };
  } catch (err) {
    console.error(err);
    const statusCode = err.code || 400;
    return (
      err.response || {
        statusCode,
        body: JSON.stringify({
          error: {
            code: statusCode,
            message: err.message,
            status: err.status || 'BAD_REQUEST',
          },
        }),
      }
    );
  }
};

// module.exports.topUp = async (event) => {
// };

/**
 * Custom authorization handler
 * @param {object} event
 * @returns {promise}
 */
module.exports.authorizer = async (event, _, callback) => {
  try {
    const auth = await authenticate(event);
    console.log(JSON.stringify(auth, null, 2));
    return auth;
  } catch (err) {
    console.error(err);
    return callback('Unauthorized');
  }
};
