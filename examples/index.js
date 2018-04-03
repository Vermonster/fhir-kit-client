/* eslint no-console: "off" */

const { Client } = require('../lib/client');

const fhirClient = new Client({ baseUrl: 'https://sb-fhir-stu3.smarthealthit.org/smartstu3/open' });

const examplePatient = { resourceType: 'Patient', identifier: '2e27c71e-30c8-4ceb-8c1c-5641e066c0a4' };
const examplePatientV1 = { resourceType: 'Patient', identifier: '2e27c71e-30c8-4ceb-8c1c-5641e066c0a4', version: '1' };
const exampleNamedPatient = { resourceType: 'Patient', searchParams: { name: 'abbott ' } };

// Examples using promises...
fhirClient.smartAuthMetadata().then((response) => {
  console.log(response);
});

fhirClient.read(examplePatient).then((response) => {
  console.log(response);
});

fhirClient.vread(examplePatientV1).then((response) => {
  console.log(response);
});

fhirClient.search(exampleNamedPatient).then((response) => {
  console.log(response);
});


// Examples using async/await...
async function asyncExamples() {
  let response = await fhirClient.smartAuthMetadata();
  console.log(response);

  console.log('--------');

  response = await fhirClient.read(examplePatient);
  console.log(response);

  console.log('--------');

  response = await fhirClient.vread(examplePatientV1);
  console.log(response);

  console.log('--------');

  response = await fhirClient.search(exampleNamedPatient);
  console.log(response);
}

asyncExamples();
