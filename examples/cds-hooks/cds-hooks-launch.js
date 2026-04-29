import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import jwkToPem from 'jwk-to-pem';
import { Client, CapabilityTool } from 'fhir-kit-client';

const app = express();

/**
 * Whitelist of known EHR issuers.  Replace with your own validation logic.
 *
 * const pemPath = './ecpublickey.pem';  // option 1: pre-loaded PEM file
 * const jku     = 'https://sandbox.cds-hooks.org/.well-known/jwks.json';  // option 2: static JKU
 */
const whitelistedEHRs = [
  { iss: 'https://sandbox.cds-hooks.org', sub: '48163c5e-88b5-4cb3-92d3-23b800caa927' },
];

app.use(cors());
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

/**
 * Verify the EHR-supplied JWT before processing any CDS hook request.
 *
 * Supports three verification strategies (in priority order):
 *  1. Pre-loaded PEM file (`pemPath` constant above)
 *  2. Static JKU constant (`jku` constant above)
 *  3. `jku` claim in the decoded JWT header
 */
async function authenticateEHR(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Missing Authorization header' });

  const token = authHeader.replace('Bearer ', '');
  const decodedJwt = jwt.decode(token, { complete: true });
  const asymmetricAlgs = ['ES256', 'ES384', 'RS256', 'RS384', 'RS512'];
  const { alg, jku: jkuHeader, kid } = decodedJwt.header;
  const { iss, sub } = decodedJwt.payload;

  const isWhitelisted = whitelistedEHRs.find((ehr) => ehr.iss === iss && ehr.sub === sub);
  if (!isWhitelisted) return res.status(401).json({ error: 'EHR not whitelisted' });

  if (asymmetricAlgs.includes(alg)) {
    let pem;

    // Option 1: static PEM file
    // pem = readFileSync(pemPath);

    // Option 2/3: fetch JWKS and derive PEM
    if (typeof jkuHeader !== 'undefined') {
      const jwksResponse = await fetch(jkuHeader);
      const jwks = await jwksResponse.json();
      const targetJwk = jwks.keys.find((key) => key.kid === kid);
      pem = jwkToPem(targetJwk);
    }

    try {
      jwt.verify(token, pem, { algorithms: [alg] });
    } catch (error) {
      console.error('Invalid Token Error', error.message);
      return res.status(401).json({ error: 'Authentication failed' });
    }
  }

  return next();
}

/**
 * Attach a FHIR client to `req.fhirClient`, setting the bearer token if the
 * EHR provided FHIR authorization context in the hook request body.
 */
async function authenticateClient(req, res, next) {
  const { fhirServer, fhirAuthorization } = req.body;

  req.fhirClient = new Client({ baseUrl: fhirServer });

  if (fhirAuthorization?.access_token) {
    req.fhirClient.bearerToken = fhirAuthorization.access_token;
  }

  return next();
}

/** CDS Hooks discovery endpoint */
app.get('/cds-services', (_req, res) => res.status(200).json({
  services: [
    {
      hook: 'patient-view',
      id: 'patient-greeter',
      title: 'Patient Greeter with Med Count',
      description: 'Greets the patient by name and reports their active medication count.',
      prefetch: {
        patientToGreet: 'Patient/{{context.patientId}}',
      },
    },
  ],
}));

/** patient-view hook handler */
app.post('/cds-services/patient-greeter', [authenticateEHR, authenticateClient], async (req, res) => {
  const prefetchPatient = req.body.prefetch?.patientToGreet;
  const givenName = prefetchPatient?.name?.[0]?.given?.[0] ?? 'there';
  let patientGreeting = `Hello ${givenName}! `;

  if (req.fhirClient) {
    const capabilityStatement = await req.fhirClient.capabilityStatement();
    const capabilities = new CapabilityTool(capabilityStatement);

    const medRequestSupport = capabilities.supportFor({
      resourceType: 'MedicationRequest',
      interaction: 'search-type',
    });
    const medOrderSupport = capabilities.supportFor({
      resourceType: 'MedicationOrder',
      interaction: 'search-type',
    });

    const searchParams = { patient: req.body.context.patientId };
    let medOrders = { total: 0 };

    if (medRequestSupport) {
      medOrders = await req.fhirClient.search({ resourceType: 'MedicationRequest', searchParams });
    } else if (medOrderSupport) {
      medOrders = await req.fhirClient.search({ resourceType: 'MedicationOrder', searchParams });
    }

    patientGreeting += `You have ${medOrders.total ?? 0} medication orders on file.`;
  }

  return res.status(200).json({
    cards: [
      {
        summary: patientGreeting,
        source: { label: 'Patient greeting and med count service' },
        indicator: 'info',
      },
    ],
  });
});

const server = app.listen(3000, 'localhost', () => {
  const addr = server.address();
  console.log(`CDS Discovery endpoint: http://${addr.address}:${addr.port}/cds-services`);
});
