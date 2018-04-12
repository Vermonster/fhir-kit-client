/* eslint import/no-extraneous-dependencies: ["error", {"devDependencies": true}] */
/* eslint no-console: 0, import/no-unresolved: 0 */
const express = require('express');
const session = require('express-session');
const simpleOauthModule = require('simple-oauth2');
const Client = require('../lib/client');
require('dotenv').config();

const {
  PORT = 3000,
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI,
} = process.env;

const app = express();

// Use session to pass the iss information to the callback
app.use(session({
  secret: 'keyboard cat',
  cookie: { maxAge: 60000 },
  resave: true,
  saveUninitialized: true,
}));


/**
 * This is an exmple of a SMART app launching from within an EHR.
 *
 * In this example, there are two routes:
 *  - /launch
 *  - /callback
 *
 *
 * The EHR will call the launch route with two parameters: iss and launch. The
 * SMART app will will make a request to the OAuth server's authorization URL.
 * Then will redirect to the SMART app callback.
 *
 * In the callback route, another request is made (using the simple-oauth
 * library) to request a token from the OAuth2 server. The server will then
 * send back a launch_context containing among other things an access token to
 * set in the Authorization header and use for subsequent FHIR requests (to the
 * ISS).
 */
app.get('/launch', async (req, res) => {
  const { iss, launch } = req.query;

  const fhirClient = new Client({ baseUrl: iss });
  const { authorizeUrl, tokenUrl } = await fhirClient.smartAuthMetadata();

  req.session.iss = iss;

  // Create a new oAuth2 object using the Client capability statement:
  const oauth2 = simpleOauthModule.create({
    client: {
      id: CLIENT_ID,
      secret: CLIENT_SECRET,
    },
    auth: {
      tokenHost: `${tokenUrl.protocol}//${tokenUrl.host}`,
      tokenPath: tokenUrl.pathname,
      authorizeHost: `${authorizeUrl.protocol}//${authorizeUrl.host}`,
      authorizePath: authorizeUrl.pathname,
    },
  });

  // Authorization uri definition
  const authorizationUri = oauth2.authorizationCode.authorizeURL({
    redirect_uri: REDIRECT_URI,
    launch,
    aud: iss,
    scope: 'launch openid profile',
    state: '3(#0/!~',
  });

  res.redirect(authorizationUri);
});

// Callback service parsing the authorization token and asking for the access token
app.get('/callback', async (req, res) => {
  const { iss } = req.session;
  console.log(req.session);

  const fhirClient = new Client({ baseUrl: iss });
  const { authorizeUrl, tokenUrl } = await fhirClient.smartAuthMetadata();

  // Create a new oAuth2 object using the Client capability statement:
  const oauth2 = simpleOauthModule.create({
    client: {
      id: CLIENT_ID,
      secret: CLIENT_SECRET,
    },
    auth: {
      tokenHost: `${tokenUrl.protocol}//${tokenUrl.host}`,
      tokenPath: tokenUrl.pathname,
      authorizeHost: `${authorizeUrl.protocol}//${authorizeUrl.host}`,
      authorizePath: authorizeUrl.pathname,
    },
  });

  const { code } = req.query;
  const options = {
    code,
  };

  try {
    const result = await oauth2.authorizationCode.getToken(options);

    const { token } = oauth2.accessToken.create(result);

    console.log('The token is : ', token);

    fhirClient.bearerToken = token.access_token;

    const patient = await fhirClient.read({ resourceType: 'Patient', id: token.patient });

    return res.status(200).json(patient);
  } catch (error) {
    console.error('Access Token Error', error.message);
    return res.status(500).json('Authentication failed');
  }
});

app.listen(PORT, () => {
  console.log(`Express server started on port ${PORT}`);
});

