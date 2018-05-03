/* eslint import/no-extraneous-dependencies: ["error", {"devDependencies": true}] */
/* eslint no-console: 0, import/no-unresolved: 0 */
const express = require('express');
const session = require('express-session');
const cors = require('cors');
const bodyParser = require('body-parser');
const simpleOauthModule = require('simple-oauth2');
const Client = require('../../lib/client');

const app = express();

app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// Discovery endpoint
// Lists available CDS hooks services
app.get('/cds-services', async (req, res) => {
  // SEE http://cds-hooks.org/specification/1.0/#fhir-resource-access

  return res.status(200).json({
    'services': [
      {
        'enabled': 'true',
        'hook': 'patient-view',
        'id': 'patient-view',
        'name': 'Patient Greeter with Med Count',
        'title': 'Patient Greeter with Med Count',
        'description': 'Example of CDS service greeting patient based on prefetch and counting meds with FHIR Kit client.',
        'prefetch': {
          'patientToGreet': 'Patient/{{Patient.id}}'
        }
      }
    ]
  });
});


app.post('/cds-services/patient-view', async (req, res) => {
  // SEE http://cds-hooks.org/specification/1.0/#fhir-resource-access

  // EXAMPLE:
  // {
  //   "fhirAuthorization" : {
  //     "access_token" : "some-opaque-fhir-access-token",
  //     "token_type" : "Bearer",
  //     "expires_in" : 300,
  //     "scope" : "patient/Patient.read patient/Observation.read",
  //     "subject" : "cds-service4"
  //   }
  // }

  const { fhirServer, fhirAuthorization } = req.body;

  const tokenObject = {
    access_token: fhirAuthorization.access_token,
    expires_in: fhirAuthorization.expires_in,
    scope: fhirAuthorization.scope
  }

  const fhirClient = new Client({ baseUrl: fhirServer });
  const { authorizeUrl } = await fhirClient.smartAuthMetadata();

  // Create a new oAuth2 object using the Client capability statement:
  const oauth2 = simpleOauthModule.create({
    client: {
      id: '<CLIENT_ID>',
      secret: '<CLIENT_SECRET>',
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

    fhirClient.bearerToken = token.access_token;

    const medOrders = await fhirClient.search({resourceType: 'MedicationOrder', searchParams: {patient: req.body.patient }});

    return res.status(200).json( {
       "cards": [
         {
           "summary": `Hello ${req.body.prefetch.patientToGreet.resource.name[0].given[0]}! You have ${medOrders.total} medication orders on file.`,
           "source": {
             "label": "Patient greeting and med count service"
           },
           "indicator": "info",
           "suggestions": [],
           "links": []
         }
       ],
       "decisions": []
     })
  } catch (error) {
    console.error('Access Token Error', error.message);
    return res.status(500).json('Authentication failed');
  }
});

app.listen(3000, () => {
  console.log('Express server started on port 3000');
});
