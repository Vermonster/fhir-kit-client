import { describe, it, expect, beforeEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from './setup.js';
import { readFixture } from './test-utils.js';
import { Client } from '../src/client.js';

const BASE_URL = 'https://healthlake.us-west-2.amazonaws.com';

const awsSignedHeaders: Record<string, string> = {
  Host: 'healthlake.us-west-2.amazonaws.com',
  'X-Amz-Security-Token': 'TOKEN',
  'X-Amz-Date': '20210729T192323Z',
  Authorization:
    'AWS4-HMAC-SHA256 Credential=AAAAAA/20210729/us-west-2/healthlake/aws4_request, SignedHeaders=host;x-amz-date;x-amz-security-token, Signature=SIGNATURE',
};

function mockedAws4Signer(_url: string, options: Record<string, unknown>): Record<string, unknown> {
  return { ...options, headers: awsSignedHeaders, hostname: 'healthlake.us-west-2.amazonaws.com' };
}

const requestSigner = (_url: string, requestOptions: RequestInit): void => {
  let awsSignatureOpts: Record<string, unknown> = {
    service: 'healthlake',
    region: 'us-west-2',
    method: (requestOptions as Record<string, unknown>).method,
  };
  awsSignatureOpts = mockedAws4Signer(_url, awsSignatureOpts);

  const currentHeaders = requestOptions.headers as Headers;
  Object.keys(awsSignatureOpts.headers as Record<string, string>).forEach((key) => {
    currentHeaders.set(key, (awsSignatureOpts.headers as Record<string, string>)[key]);
  });
};

describe('Client with request signer', () => {
  let fhirClient: Client;

  beforeEach(() => {
    fhirClient = new Client({ baseUrl: BASE_URL, requestSigner });
  });

  function mockAndCaptureHeaders(method: 'GET' | 'DELETE' | 'POST', path: string) {
    const capturedHeaders: Record<string, string | null> = {};

    const handler =
      method === 'GET'
        ? http.get(`${BASE_URL}${path}`, ({ request }) => {
          Object.keys(awsSignedHeaders).forEach((k) => {
            capturedHeaders[k] = request.headers.get(k.toLowerCase());
          });
          return HttpResponse.json(readFixture('patient.json'));
        })
        : method === 'DELETE'
          ? http.delete(`${BASE_URL}${path}`, ({ request }) => {
            Object.keys(awsSignedHeaders).forEach((k) => {
              capturedHeaders[k] = request.headers.get(k.toLowerCase());
            });
            return HttpResponse.json(readFixture('patient.json'));
          })
          : http.post(`${BASE_URL}${path}`, ({ request }) => {
            Object.keys(awsSignedHeaders).forEach((k) => {
              capturedHeaders[k] = request.headers.get(k.toLowerCase());
            });
            return HttpResponse.json(readFixture('patient.json'));
          });

    server.use(handler);
    return capturedHeaders;
  }

  it('GET request sends AWS signed headers', async () => {
    const capturedHeaders = mockAndCaptureHeaders('GET', '/Patient/123');
    await fhirClient.request('Patient/123');
    Object.keys(awsSignedHeaders).forEach((key) => {
      expect(capturedHeaders[key]).toBe(awsSignedHeaders[key].toLowerCase() === awsSignedHeaders[key] ? awsSignedHeaders[key] : awsSignedHeaders[key]);
    });
  });

  it('DELETE request sends AWS signed headers', async () => {
    const capturedHeaders = mockAndCaptureHeaders('DELETE', '/Patient/123');
    await fhirClient.request('Patient/123', { method: 'DELETE' });
    expect(capturedHeaders['X-Amz-Date']).toBe(awsSignedHeaders['X-Amz-Date']);
  });

  it('POST request sends AWS signed headers', async () => {
    const capturedHeaders = mockAndCaptureHeaders('POST', '/Patient');
    await fhirClient.request('Patient', { method: 'POST', body: { resourceType: 'patient' } });
    expect(capturedHeaders['X-Amz-Date']).toBe(awsSignedHeaders['X-Amz-Date']);
  });
});
