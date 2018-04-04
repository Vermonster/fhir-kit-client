/* eslint import/no-extraneous-dependencies: ["error", {"devDependencies": true}] */
/* eslint no-console: 0 */
const express = require('express');
const session = require('express-session');
const simpleOauthModule = require('simple-oauth2');
const { Client } = require('../lib/client');

const app = express();
// Use session to pass the iss to the callback
app.use(session({ secret: 'keyboard cat', cookie: { maxAge: 60000 } }));


// Initial page redirecting to Github
app.get('/launch', async (req, res) => {
  const { iss, launch } = req.query;

  const fhirClient = new Client({ baseUrl: iss });
  const { authorizeUrl, tokenUrl } = await fhirClient.smartAuthMetadata();

  req.session.iss = iss;

  // Create a new oAuth2 object using the Client capability statement:
  const oauth2 = simpleOauthModule.create({
    client: {
      id: '<CLIENT_ID>',
      secret: '<CLIENT_SECRET>',
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
    redirect_uri: 'http://localhost:3000/callback',
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
      id: '<CLIENT_ID>',
      secret: '<CLIENT_SECRET>',
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

    fhirClient.setBearerToken(token.access_token);

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

