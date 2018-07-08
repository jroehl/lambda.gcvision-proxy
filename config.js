module.exports = {
  initialCredits: 30,
  ocrType: 'DOCUMENT_TEXT_DETECTION',
  gcVision: {
    api: 'https://vision.googleapis.com/v1/images:annotate',
    key: process.env.GCVISION_KEY,
  },
  auth0: {
    jwksUri: process.env.JWKS_URI,
    audience: process.env.AUDIENCE,
    tokenIssuer: process.env.TOKEN_ISSUER,
    management: {
      clientId: process.env.CLIENT_ID,
      clientSecret: process.env.CLIENT_SECRET,
      token: process.env.TOKEN,
    },
  },
};
