require('dotenv').config();

const rp = require('request-promise-native');

const { gcVision } = require('./config');
const authenticate = require('./authenticate');

/**
 * Proxy the event to the google cloud vision api endpoint
 * @param {object} event
 * @returns {promise}
 */
module.exports.proxy = async (event) => {
  try {
    const { base64 } = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
    if (!base64) throw new Error('Base64 image string must be added to request body');

    console.log(`Request "DOCUMENT_TEXT_DETECTION" send to "${gcVision.api}"`);
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
            features: [{ type: 'DOCUMENT_TEXT_DETECTION' }],
          },
        ],
      },
    });
    return {
      statusCode: response.code,
      body: JSON.stringify(response),
    };
  } catch (err) {
    console.error(err);
    return (
      err.response || {
        statusCode: 400,
        body: JSON.stringify({
          error: {
            code: 400,
            message: err.message,
            status: 'BAD_REQUEST',
          },
        }),
      }
    );
  }
};

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
