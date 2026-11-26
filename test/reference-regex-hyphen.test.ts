import { HttpResponse, http } from 'msw';
import { describe, expect, it } from 'vitest';
import { Client } from '../src/client.js';
import { splitReference } from '../src/utils.js';
import { server } from './setup.js';
import { readFixture } from './test-utils.js';

describe('splitReference and resolve with hyphens and underscores in base URLs', () => {
  it('splits absolute references with hyphenated hostnames and UUID path segments', () => {
    const baseUrl = 'https://fhir-open.cerner.com/r4/ec2458f2-1e24-41c8-b71b-0e701af7583d';
    const result = splitReference(`${baseUrl}/Patient/1234`);
    expect(result).toEqual({
      baseUrl,
      resourceType: 'Patient',
      id: '1234',
    });
  });

  it('splits absolute references with AWS HealthLake style URLs and underscores in paths', () => {
    const baseUrl = 'https://healthlake.us-east-1.amazonaws.com/datastore/abc_123/r4';
    const result = splitReference(`${baseUrl}/Observation/obs-1`);
    expect(result).toEqual({
      baseUrl,
      resourceType: 'Observation',
      id: 'obs-1',
    });
  });

  it('resolves an absolute reference on a foreign server with hyphens in the host and path', async () => {
    const client = new Client({ baseUrl: 'https://example.com' });
    const foreignBase = 'https://fhir-open.example.org/r4/tenant-1_prod';
    const patient = readFixture('patient.json');
    const id = 'eb3271e1-ae1b-4644-9332-41e32c829486';

    server.use(http.get(`${foreignBase}/Patient/${id}`, () => HttpResponse.json(patient)));

    const resolved = await client.resolve({ reference: `${foreignBase}/Patient/${id}` });
    expect(resolved.resourceType).toBe('Patient');
    expect(resolved.id).toBe(id);
  });
});
