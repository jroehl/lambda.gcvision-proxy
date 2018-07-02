module.exports = {
  gcVision: {
    api: 'https://vision.googleapis.com/v1/images:annotate',
    key: process.env.GCVISION_KEY,
  },
  auth0: {
    jwksUri: process.env.JWKS_URI,
    audience: process.env.AUDIENCE,
    tokenIssuer: process.env.TOKEN_ISSUER,
  },
};
