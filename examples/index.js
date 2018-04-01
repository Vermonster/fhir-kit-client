/* eslint no-console: "off" */

const { Client } = require('../lib/client');

const fhirClient = new Client({ baseUrl: 'https://sb-fhir-stu3.smarthealthit.org/smartstu3/open' });

// Examples using promises...
fhirClient.smartAuthMetadata().then((response) => {
  console.log(response);
});

fhirClient.read('Patient', '2e27c71e-30c8-4ceb-8c1c-5641e066c0a4').then((response) => {
  console.log(response);
});

fhirClient.vread('Patient', '2e27c71e-30c8-4ceb-8c1c-5641e066c0a4', '1').then((response) => {
  console.log(response);
});

fhirClient.search('Patient', { name: 'abbott' }).then((response) => {
  console.log(response);
});


// Examples using async/await...
async function asyncExamples() {
  let response = await fhirClient.smartAuthMetadata();
  console.log(response);

  console.log('--------');

  response = await fhirClient.read('Patient', '2e27c71e-30c8-4ceb-8c1c-5641e066c0a4');
  console.log(response);

  console.log('--------');

  response = await fhirClient.vread('Patient', '2e27c71e-30c8-4ceb-8c1c-5641e066c0a4', '1');
  console.log(response);

  console.log('--------');

  response = await fhirClient.search('Patient', { name: 'abbott' });
  console.log(response);
}

asyncExamples();
