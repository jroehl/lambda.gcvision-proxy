# gcvision-proxy

An aws lambda proxy for the google cloud vision api to work with oauth0 api tokens.

## Needed environment variables

> Add in `.env` file or in circleci context

```bash
GCVISION_KEY=<gcvision-key>

JWKS_URI=<jwks-uri>
AUDIENCE=<token-issuer>
TOKEN_ISSUER=<token-issuer>
```
