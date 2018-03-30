const fhirClientModule = require('../lib/client');

let fhirClient = new fhirClientModule({baseUrl: 'https://sb-fhir-stu3.smarthealthit.org/smartstu3/open'});

async function f() {
  let response = await fhirClient.smartAuthMetadata();
  console.log(response);
};

f();
