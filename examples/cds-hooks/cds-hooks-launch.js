/* eslint import/no-extraneous-dependencies: ['error', {'devDependencies': true}] */
/* eslint no-console: 0, import/no-unresolved: 0 */
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const jwkToPem = require('jwk-to-pem');
const simpleOauthModule = require('simple-oauth2');
const Client = require('../../lib/client');
const axios = require('axios');
const fs = require('fs');

const app = express();

// const pemPath = './ecpublickey.pem';
// const jku = 'http://sandbox.cds-hooks.org/.well-known/jwks.json';

const clientId = '<CLIENT_SECRET>';
const clientSecret = '<CLIENT_KEY>';

/**
 * This is an example of a SMART app responding to CDS Hooks requests from an EHR.
 *
 * In this example, there are two routes:
 *  - /cds-services
 *  - /cds-services/patient-view
 *
 * The EHR will call the cds-services route (the "discovery endpoint")
 * in order to configure any available CDS services for this SMART application.
 *
 * Based on this configuration, the EHR may then post to /cds-services/patient-view
 * with prefetch data as prescribed by the cds-services discovery route and,
 * optionally, FHIR authorization details (i.e., access_token and scope). If
 * an access token is provided, it may then be used by the FHIR client for
 * requests to the EHR, as seen in the MedicationOrder example.

 * Before every request, the EHR is first directed through the `authenticateEHR` middleware.
 *
 * authenticateEHR` expects a JSON Web Token (JWT) from the EHR's authorization
 * request header. It is used to establish that the request is from a trusted party.
 * The JWT can be verified by one of 3 different ways in this example:
 *
 *  1) By setting a PEM file in the current directory on line 15.
 *  2) By generating a PEM file from a `jku` variable set on line 16.
 *  3) By generating a PEM file from a `jku` in the decoded JWT header.
 *
 */

app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

async function authenticateEHR(req, res, next) {
  const token = req.headers.authorization.replace('Bearer ', '');
  const decodedJwt = jwt.decode(token, { complete: true });
  const asymmetricAlgs = ['ES256', 'ES384', 'ES384', 'RS256', 'RS384', 'RS512'];
  const { alg, jku, kid } = decodedJwt.header;

  console.log(`token: ${token}`);
  console.log(`decodedJwt: ${JSON.stringify(decodedJwt)}`);

  let pem;
  let verified;

  if (asymmetricAlgs.includes(alg)) {
    if (typeof pemPath !== 'undefined') {
      // Use existing public key
      try {
        pem = fs.readFileSync(pemPath);
      } catch (err) {
        console.log(err);
      }
    } else if (typeof jku !== 'undefined') {
      // Generate public key with an jwks.json endpoint
      const jwks = await axios.get(jku);
      const targetJwk = jwks.data.keys.find(key => key.kid === kid);

      pem = jwkToPem(targetJwk);
    }

    try {
      verified = jwt.verify(token, pem, { algorithms: [alg] });
      console.log('Verified with PEM');
    } catch (error) {
      console.error('Invalid Token Error', error.message);
      return res.status(401).json('Authentication failed');
    }
  }

  console.log(`Authenticated Token: ${JSON.stringify(verified)}`);

  return next();
}

async function authenticateClient(req, res, next) {
  const { fhirServer, fhirAuthorization } = req.body;

  if (typeof fhirAuthorization === 'undefined') {
    return next();
  }

  const tokenObject = {
    access_token: fhirAuthorization.access_token,
    expires_in: fhirAuthorization.expires_in,
    scope: fhirAuthorization.scope,
  };

  req.fhirClient = new Client({ baseUrl: fhirServer });
  const { authorizeUrl } = await req.fhirClient.smartAuthMetadata();

  console.log(`${authorizeUrl.protocol}//${authorizeUrl.host}`);
  console.log(authorizeUrl.pathname);

  // Create a new oAuth2 object using the Client capability statement:
  const oauth2 = simpleOauthModule.create({
    client: {
      id: clientId,
      secret: clientSecret,
    },
    auth: {
      tokenHost: fhirServer,
      authorizeHost: `${authorizeUrl.protocol}//${authorizeUrl.host}`,
      authorizePath: authorizeUrl.pathname,
    },
  });

  try {
    // Create the access token wrapper
    const { token } = oauth2.accessToken.create(tokenObject);

    console.log('The token is : ', token);

    req.fhirClient.bearerToken = token.access_token;
  } catch (error) {
    console.error('Access Token Error', error.message);
    return res.status(500).json('Authentication failed');
  }

  return next();
}

app.get('/cds-services', authenticateEHR, async (req, res) =>
  res.status(200).json({
    services: [
      {
        enabled: 'true',
        hook: 'patient-view',
        id: 'patient-view',
        name: 'Patient Greeter with Med Count',
        title: 'Patient Greeter with Med Count',
        description: 'Example of CDS service greeting patient based on prefetch and counting meds with FHIR Kit client.',
        prefetch: {
          patientToGreet: 'Patient/{{context.patientId}}',
        },
      },
    ],
  }));

app.post('/cds-services/patient-view', [authenticateEHR, authenticateClient], async (req, res) => {
  let patientGreeting = `Hello ${req.body.prefetch.patientToGreet.resource.name[0].given[0]}! `;

  if (typeof req.fhirClient !== 'undefined') {
    const medOrders = await req.fhirClient.search({ resourceType: 'MedicationOrder', searchParams: { patient: req.body.patient } });
    patientGreeting += `You have ${medOrders.total} medication orders on file.`;
  }

  return res.status(200).json({
    cards: [
      {
        summary: patientGreeting,
        source: {
          label: 'Patient greeting and med count service',
        },
        indicator: 'info',
        suggestions: [],
        links: [],
      },
    ],
    decisions: [],
  });
});

app.listen(3000, () => {
  console.log('Express server started on port 3000');
});
