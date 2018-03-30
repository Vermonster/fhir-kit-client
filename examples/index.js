const fhirClientModule = require('../lib/client');

let fhirClient = new fhirClientModule({baseUrl: 'https://sb-fhir-stu3.smarthealthit.org/smartstu3/open'});

async function examples() {
  let response = await fhirClient.smartAuthMetadata();
  console.log(response);

  console.log("--------");

  response = await fhirClient.get('Patient', '2e27c71e-30c8-4ceb-8c1c-5641e066c0a4');
  console.log(response);

  console.log("--------");

  response = await fhirClient.search('Patient', { name: 'abbott' });
  console.log(response);
};

examples();
