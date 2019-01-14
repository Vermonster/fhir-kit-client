/* eslint import/no-extraneous-dependencies: ["error", {"devDependencies": true}] */
/* eslint no-console: 0, import/no-unresolved: 0 */
const express = require('express');
const session = require('express-session');
const simpleOauthModule = require('simple-oauth2');
const Client = require('../../lib/client');

const CLIENT_ID = '<CLIENT_ID>';
const CLIENT_SECRET = '<CLIENT_SECRET>';

const app = express();

// Use session to pass the iss information to the callback
app.use(session({
  secret: 'keyboard cat',
  cookie: { maxAge: 60000 },
  resave: true,
  saveUninitialized: true,
}));


/**
 * This is an example of a SMART app launching absent of an EHR context.
 *
 * In this example, there are two routes:
 *  - /launch
 *  - /callback
 *
 * A user will visit the launch route independent of the EHR with two parameters,
 # the ISS and scope. For example:
 #
 # https://localhost:3000/launch?iss=http://example.com/fhir&scope=openid%20profile
 # %20offline_access%20user%2F*.*%20patient%2F*.*%20launch%2Fencounter%20launch%2Fpatient
 #
 * The SMART app will make a request to the OAuth server's authorization URL.
 * Then, it will redirect to the SMART app callback.
 *
 * In the callback route, another request is made (using the simple-oauth
 * library) to request a token from the OAuth2 server. The server will then
 * send back a launch_context containing, among other things, an access token to
 * set in the Authorization header and use for subsequent FHIR requests (to the
 * ISS).
 */
app.get('/launch', async (req, res) => {
  const { iss, scope } = req.query;
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
    options: {
      authorizationMethod: 'body',
    },
  });

  // Authorization uri definition
  const authorizationUri = oauth2.authorizationCode.authorizeURL({
    redirect_uri: 'http://localhost:3000/callback',
    aud: iss,
    scope,
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
    options: {
      authorizationMethod: 'body',
    },
  });

  const { code } = req.query;
  const options = {
    code,
    redirect_uri: 'http://localhost:3000/callback',
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

app.listen(3000, () => {
  console.log('Express server started on port 3000');
});
