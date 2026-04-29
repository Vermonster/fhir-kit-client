import express from 'express';
import session from 'express-session';
import { AuthorizationCode } from 'simple-oauth2';
import { Client } from 'fhir-kit-client';

const CLIENT_ID = '<CLIENT_ID>';
const CLIENT_SECRET = '<CLIENT_SECRET>';
const REDIRECT_URI = 'http://localhost:3000/callback';

const app = express();

app.use(session({
  secret: 'keyboard cat',
  cookie: { maxAge: 60000 },
  resave: true,
  saveUninitialized: true,
}));

/**
 * Standalone SMART launch — no EHR context initiates the flow.
 *
 * A user visits this URL directly, supplying iss and scope:
 *
 *   http://localhost:3000/launch
 *     ?iss=https://launch.smarthealthit.org/v/r4/fhir
 *     &scope=openid%20profile%20offline_access%20user%2F*.*%20patient%2F*.*
 *
 * The app discovers authorization/token URLs via smartAuthMetadata() and
 * redirects the user to the authorization server.
 */
app.get('/launch', async (req, res) => {
  const { iss, scope } = req.query;

  const fhirClient = new Client({ baseUrl: String(iss) });
  const { authorizeUrl, tokenUrl } = await fhirClient.smartAuthMetadata();

  req.session.iss = iss;

  const oauth2 = new AuthorizationCode({
    client: { id: CLIENT_ID, secret: CLIENT_SECRET },
    auth: {
      tokenHost: tokenUrl.origin,
      tokenPath: tokenUrl.pathname,
      authorizeHost: authorizeUrl.origin,
      authorizePath: authorizeUrl.pathname,
    },
  });

  const authorizationUri = oauth2.authorizeURL({
    redirect_uri: REDIRECT_URI,
    scope: String(scope ?? 'openid profile offline_access user/*.* patient/*.*'),
    state: crypto.randomUUID(),
    extraParams: { aud: iss },
  });

  res.redirect(authorizationUri);
});

/**
 * OAuth2 callback — exchange the authorization code for an access token,
 * then read the in-context patient and return it as JSON.
 */
app.get('/callback', async (req, res) => {
  const { iss } = req.session;
  const { code } = req.query;

  const fhirClient = new Client({ baseUrl: String(iss) });
  const { authorizeUrl, tokenUrl } = await fhirClient.smartAuthMetadata();

  const oauth2 = new AuthorizationCode({
    client: { id: CLIENT_ID, secret: CLIENT_SECRET },
    auth: {
      tokenHost: tokenUrl.origin,
      tokenPath: tokenUrl.pathname,
      authorizeHost: authorizeUrl.origin,
      authorizePath: authorizeUrl.pathname,
    },
  });

  try {
    const tokenResponse = await oauth2.getToken({ code: String(code), redirect_uri: REDIRECT_URI });
    const accessToken = tokenResponse.token;

    fhirClient.bearerToken = String(accessToken.access_token);
    const patient = await fhirClient.read({ resourceType: 'Patient', id: String(accessToken.patient) });

    return res.status(200).json(patient);
  } catch (error) {
    console.error('Access Token Error', error.message);
    return res.status(500).json({ error: 'Authentication failed' });
  }
});

const server = app.listen(3000, 'localhost', () => {
  const addr = server.address();
  console.log(`Standalone SMART Launch endpoint: http://${addr.address}:${addr.port}/launch`);
  console.log('Example URL:');
  console.log(`  http://localhost:3000/launch?iss=https://launch.smarthealthit.org/v/r4/fhir&scope=openid%20profile%20offline_access%20user%2F*.*%20patient%2F*.*`);
});

