import { describe, it, expect, beforeEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from './setup.js';
import { readFixture } from './test-utils.js';
import { Client } from '../src/client.js';
import { Pagination } from '../src/pagination.js';

const BASE_URL = 'https://example.com';

function expectHistoryBundle(response: Record<string, unknown>, total: number): void {
  expect(response.resourceType).toBe('Bundle');
  expect(response.type).toBe('history');
  expect(response.total).toBe(total);
}

describe('Client', () => {
  let fhirClient: Client;

  beforeEach(() => {
    fhirClient = new Client({ baseUrl: BASE_URL });
  });

  it('throws an error if baseUrl is blank', () => {
    expect(() => new Client()).toThrow('baseUrl cannot be blank');
    expect(() => { fhirClient.baseUrl = ''; }).toThrow('baseUrl cannot be blank');
  });

  it('throws an error if baseUrl is not a string', () => {
    expect(() => new Client({ baseUrl: 1 as unknown as string })).toThrow('baseUrl must be a string');
  });

  it('initializes with config', () => {
    expect(fhirClient.baseUrl).toBe(BASE_URL);
    expect(fhirClient.pagination).toBeInstanceOf(Pagination);
  });

  it('throws correct error with request error', async () => {
    server.use(http.get(`${BASE_URL}/Basic/1`, () => HttpResponse.error()));
    await expect(fhirClient.read({ resourceType: 'Basic', id: '1' })).rejects.toThrow();
  });

  describe('#smartAuthMetadata', () => {
    function mockSmartEndpoints(metadataFixture: string): void {
      server.use(
        http.get(`${BASE_URL}/metadata`, () => HttpResponse.json(readFixture(metadataFixture))),
        http.get(`${BASE_URL}/.well-known/smart-configuration`, () => new HttpResponse(null, { status: 404 })),
        http.get(`${BASE_URL}/.well-known/openid-configuration`, () => new HttpResponse(null, { status: 404 })),
      );
    }

    it('builds a request with custom headers', async () => {
      let capturedHeaders: Headers | null = null;
      server.use(
        http.get(`${BASE_URL}/metadata`, ({ request }) => {
          capturedHeaders = request.headers;
          return HttpResponse.json(readFixture('no-smart-oauth-uri-capability-statement.json'));
        }),
        http.get(`${BASE_URL}/.well-known/smart-configuration`, () => new HttpResponse(null, { status: 404 })),
        http.get(`${BASE_URL}/.well-known/openid-configuration`, () => new HttpResponse(null, { status: 404 })),
      );

      const authMetadata = await fhirClient.smartAuthMetadata({ options: { headers: { abc: 'XYZ' } } });
      expect(authMetadata).toEqual({});
      expect(capturedHeaders?.get('abc')).toBe('XYZ');
    });

    it('returns an empty object when SMART URIs are not present', async () => {
      mockSmartEndpoints('no-smart-oauth-uri-capability-statement.json');
      const authMetadata = await fhirClient.smartAuthMetadata();
      expect(authMetadata).toEqual({});
    });

    it('returns SMART OAuth URIs when they are present', async () => {
      mockSmartEndpoints('valid-capability-statement.json');
      const authMetadata = await fhirClient.smartAuthMetadata();
      expect(authMetadata).toEqual({
        authorizeUrl: new URL('https://sb-auth.smarthealthit.org/authorize'),
        tokenUrl: new URL('https://sb-auth.smarthealthit.org/token'),
        registerUrl: new URL('https://sb-auth.smarthealthit.org/register'),
        manageUrl: new URL('https://sb-auth.smarthealthit.org/manage'),
      });
    });
  });

  describe('#capabilityStatement', () => {
    it('builds a request with custom headers', async () => {
      let capturedHeaders: Headers | null = null;
      server.use(http.get(`${BASE_URL}/metadata`, ({ request }) => {
        capturedHeaders = request.headers;
        return HttpResponse.json(readFixture('no-smart-oauth-uri-capability-statement.json'));
      }));

      const capabilityStatement = await fhirClient.capabilityStatement({ headers: { abc: 'XYZ' } });
      expect(capabilityStatement.resourceType).toBe('CapabilityStatement');
      expect(capturedHeaders?.get('abc')).toBe('XYZ');
    });

    it('returns a FHIR resource from the FHIR server', async () => {
      server.use(http.get(`${BASE_URL}/metadata`, () => HttpResponse.json(readFixture('no-smart-oauth-uri-capability-statement.json'))));
      const capabilityStatement = await fhirClient.capabilityStatement();
      expect(capabilityStatement.resourceType).toBe('CapabilityStatement');
    });
  });

  describe('#resolve', () => {
    it('builds a request with custom headers', async () => {
      const resourceType = 'Patient';
      const id = 'eb3271e1-ae1b-4644-9332-41e32c829486';
      const reference = `${resourceType}/${id}`;
      const absoluteReference = `${BASE_URL}/${reference}`;
      let capturedHeaders: Headers | null = null;
      server.use(http.get(`${BASE_URL}/${reference}`, ({ request }) => {
        capturedHeaders = request.headers;
        return HttpResponse.json(readFixture('patient.json'));
      }));

      const response = await fhirClient.resolve({ reference: absoluteReference, options: { headers: { abc: 'XYZ' } } });
      expect(response.resourceType).toBe(resourceType);
      expect(response.id).toBe(id);
      expect(capturedHeaders?.get('abc')).toBe('XYZ');
    });

    it('resolves a reference and returns a resource', async () => {
      const resourceType = 'Patient';
      const id = 'eb3271e1-ae1b-4644-9332-41e32c829486';
      const reference = `${resourceType}/${id}`;
      const absoluteReference = `${BASE_URL}/${reference}`;
      server.use(http.get(`${BASE_URL}/${reference}`, () => HttpResponse.json(readFixture('patient.json'))));

      const response = await fhirClient.resolve({ reference: absoluteReference });
      expect(response.resourceType).toBe(resourceType);
      expect(response.id).toBe(id);
    });
  });

  describe('#bearerToken=', () => {
    it('sets the Authorization header to a Bearer token', async () => {
      let capturedAuth: string | null = null;
      server.use(http.get(`${BASE_URL}/Patient/test-access-token`, ({ request }) => {
        capturedAuth = request.headers.get('authorization');
        return HttpResponse.json(readFixture('patient.json'));
      }));

      fhirClient.bearerToken = 'XYZ';
      await fhirClient.read({ resourceType: 'Patient', id: 'test-access-token' });
      expect(capturedAuth).toBe('Bearer XYZ');
    });

    it('sets the header only for the current instance', async () => {
      let capturedAuth: string | null | undefined = undefined;
      server.use(http.get(`${BASE_URL}/Patient/test-access-token`, ({ request }) => {
        capturedAuth = request.headers.get('authorization');
        return HttpResponse.json(readFixture('patient.json'));
      }));

      const otherFhirClient = new Client({ baseUrl: BASE_URL });
      fhirClient.bearerToken = 'XYZ';
      await otherFhirClient.read({ resourceType: 'Patient', id: 'test-access-token' });
      expect(capturedAuth).toBeNull();
    });
  });

  describe('#customHeaders=', () => {
    it('sets custom headers on requests', async () => {
      fhirClient.customHeaders = { abc: 'XYZ' };
      let capturedHeaders: Headers | null = null;
      server.use(http.get(`${BASE_URL}/Patient/test-access-token`, ({ request }) => {
        capturedHeaders = request.headers;
        return HttpResponse.json(readFixture('patient.json'));
      }));

      expect(fhirClient.customHeaders).toEqual({ abc: 'XYZ' });
      await fhirClient.read({ resourceType: 'Patient', id: 'test-access-token', options: { headers: { def: 'UVW' } } });
      expect(capturedHeaders?.get('abc')).toBe('XYZ');
      expect(capturedHeaders?.get('def')).toBe('UVW');
    });

    it('can be overridden by custom request headers', async () => {
      fhirClient.customHeaders = { abc: 'XYZ' };
      let capturedAbc: string | null = null;
      server.use(http.get(`${BASE_URL}/Patient/test-access-token`, ({ request }) => {
        capturedAbc = request.headers.get('abc');
        return HttpResponse.json(readFixture('patient.json'));
      }));

      await fhirClient.read({ resourceType: 'Patient', id: 'test-access-token', options: { headers: { abc: 'DEF' } } });
      expect(capturedAbc).toBe('DEF');
    });
  });

  describe('API verbs', () => {
    describe('#request', () => {
      it('HEAD request', async () => {
        server.use(http.head(`${BASE_URL}/Patient/123`, () => new HttpResponse(null, { status: 200 })));
        await fhirClient.request('Patient/123', { method: 'HEAD' });
      });

      it('GET request', async () => {
        server.use(http.get(`${BASE_URL}/Patient/123`, () => HttpResponse.json(readFixture('patient.json'))));
        const response = await fhirClient.request('Patient/123');
        expect(response.resourceType).toBe('Patient');
        expect(response.id).toBe('eb3271e1-ae1b-4644-9332-41e32c829486');
      });

      it('GET request with custom headers', async () => {
        let capturedHeaders: Headers | null = null;
        server.use(http.get(`${BASE_URL}/Patient/123`, ({ request }) => {
          capturedHeaders = request.headers;
          return new HttpResponse(null, { status: 200 });
        }));

        await fhirClient.request('Patient/123', { options: { headers: { accept: 'application/json', 'x-header-a': 'foo' } } });
        expect(capturedHeaders?.get('accept')).toBe('application/json');
        expect(capturedHeaders?.get('x-header-a')).toBe('foo');
      });

      it('DELETE request', async () => {
        server.use(http.delete(`${BASE_URL}/Patient/123`, () => new HttpResponse(null, { status: 200 })));
        await fhirClient.request('Patient/123', { method: 'DELETE' });
      });

      it('POST request', async () => {
        server.use(http.post(`${BASE_URL}/Patient`, () => new HttpResponse(null, { status: 200 })));
        await fhirClient.request('Patient', { method: 'POST', body: { resourceType: 'patient' } });
      });
    });

    describe('#read', () => {
      it('builds requests with custom headers', async () => {
        server.use(http.get(`${BASE_URL}/Patient/test-access-token`, () => HttpResponse.json(readFixture('patient.json'))));

        const response = await fhirClient.read({ resourceType: 'Patient', id: 'test-access-token', options: { headers: { abc: 'XYZ' } } });
        const { request } = Client.httpFor(response);
        expect(request?.headers.has('abc')).toBe(true);
        expect(request?.headers.get('abc')).toBe('XYZ');
      });

      it('throws errors for a missing resource', async () => {
        server.use(http.get(`${BASE_URL}/Patient/abcdef`, () => HttpResponse.json(readFixture('patient-not-found.json'), { status: 404 })));

        await expect(fhirClient.read({ resourceType: 'Patient', id: 'abcdef' })).rejects.toMatchObject({
          response: { status: 404, data: { resourceType: 'OperationOutcome' } },
        });
      });

      it('handles non-json error responses', async () => {
        const errorBody = 'An error occurred';
        server.use(http.get(`${BASE_URL}/Patient/abcdef`, () => new HttpResponse(errorBody, { status: 404 })));

        await expect(fhirClient.read({ resourceType: 'Patient', id: 'abcdef' })).rejects.toMatchObject({
          response: { status: 404, data: errorBody },
        });
      });
    });

    describe('#vread', () => {
      it('returns a matching resource', async () => {
        server.use(http.get(`${BASE_URL}/Patient/eb3271e1-ae1b-4644-9332-41e32c829486/_history/1`, () => HttpResponse.json(readFixture('patient.json'))));

        const response = await fhirClient.vread({ resourceType: 'Patient', id: 'eb3271e1-ae1b-4644-9332-41e32c829486', version: '1' });
        expect(response.resourceType).toBe('Patient');
        expect(response.id).toBe('eb3271e1-ae1b-4644-9332-41e32c829486');
      });

      it('builds a request with custom headers', async () => {
        let capturedAbc: string | null = null;
        server.use(http.get(`${BASE_URL}/Patient/eb3271e1-ae1b-4644-9332-41e32c829486/_history/1`, ({ request }) => {
          capturedAbc = request.headers.get('abc');
          return HttpResponse.json(readFixture('patient.json'));
        }));

        const response = await fhirClient.vread({ resourceType: 'Patient', id: 'eb3271e1-ae1b-4644-9332-41e32c829486', version: '1', options: { headers: { abc: 'XYZ' } } });
        expect(response.resourceType).toBe('Patient');
        expect(capturedAbc).toBe('XYZ');
      });

      it('throws errors for an absent resource', async () => {
        server.use(http.get(`${BASE_URL}/Patient/abcdef/_history/1`, () => HttpResponse.json(readFixture('patient-not-found.json'), { status: 404 })));

        await expect(fhirClient.vread({ resourceType: 'Patient', id: 'abcdef', version: '1' })).rejects.toMatchObject({
          response: { status: 404, data: { resourceType: 'OperationOutcome' } },
        });
      });

      it('throws errors for an absent version of an existing resource', async () => {
        server.use(http.get(`${BASE_URL}/Patient/eb3271e1-ae1b-4644-9332-41e32c829486/_history/2`, () => HttpResponse.json(readFixture('patient-version-not-found.json'), { status: 404 })));

        await expect(fhirClient.vread({ resourceType: 'Patient', id: 'eb3271e1-ae1b-4644-9332-41e32c829486', version: '2' })).rejects.toMatchObject({
          response: { status: 404, data: { resourceType: 'OperationOutcome' } },
        });
      });
    });

    describe('#operation', () => {
      it('runs system-level POST operation', async () => {
        server.use(http.post(`${BASE_URL}/$everything`, () => new HttpResponse(null, { status: 200 })));
        await fhirClient.operation({ name: 'everything' });
      });

      it('runs system-level POST operation with input', async () => {
        const patient = readFixture('patient.json');
        server.use(http.post(`${BASE_URL}/$convert`, async ({ request }) => HttpResponse.json(await request.json())));

        const response = await fhirClient.operation({ name: 'convert', method: 'POST', input: patient });
        expect(response.resourceType).toBe('Patient');
        expect(response.id).toBe('eb3271e1-ae1b-4644-9332-41e32c829486');
      });

      it('runs system-level GET operation', async () => {
        server.use(http.get(`${BASE_URL}/$everything`, () => new HttpResponse(null, { status: 200 })));
        await fhirClient.operation({ name: 'everything', method: 'GET' });
      });

      it('runs type-level GET operation', async () => {
        server.use(http.get(`${BASE_URL}/ConceptMap/$translate`, () => new HttpResponse(null, { status: 200 })));

        const input = {
          code: 'preliminary',
          source: 'http://hl7.org/fhir/ValueSet/composition-status',
          system: 'http://hl7.org/fhir/composition-status',
          target: 'http://hl7.org/fhir/ValueSet/v3-ActStatus',
        };

        await fhirClient.operation({ resourceType: 'ConceptMap', name: 'translate', method: 'GET', input });
      });

      it('runs instance-level POST operation', async () => {
        server.use(http.post(`${BASE_URL}/PlanDefinition/123/$apply`, () => new HttpResponse(null, { status: 200 })));
        await fhirClient.operation({ resourceType: 'PlanDefinition', id: '123', name: 'apply' });
      });
    });

    describe('#search', () => {
      it('raises an error when both "resourceType" and "searchParams" are missing', () => {
        const expectedError = 'search requires either searchParams or a resourceType';
        expect(() => fhirClient.search()).toThrow(expectedError);
        expect(() => fhirClient.search({ searchParams: {} })).toThrow(expectedError);
      });

      it('routes to resourceSearch when given resourceType without compartment', async () => {
        server.use(http.get(`${BASE_URL}/Patient`, () => HttpResponse.json(readFixture('search-results.json'))));
        const response = await fhirClient.search({ resourceType: 'Patient', searchParams: { name: 'abbott' } });
        expect(response.resourceType).toBe('Bundle');
      });

      it('routes to systemSearch when only searchParams are given', async () => {
        server.use(http.get(`${BASE_URL}/`, () => HttpResponse.json(readFixture('system-search-results.json'))));
        const response = await fhirClient.search({ searchParams: { name: 'abbott' } });
        expect(response.resourceType).toBe('Bundle');
      });

      it('routes to compartmentSearch when given a compartment param', async () => {
        server.use(http.get(`${BASE_URL}/Patient/123/Condition`, () => HttpResponse.json(readFixture('compartment-search-results.json'))));
        const response = await fhirClient.search({
          resourceType: 'Condition',
          compartment: { resourceType: 'Patient', id: '123' },
          searchParams: { category: 'problem' },
        });
        expect(response.resourceType).toBe('Bundle');
      });
    });

    describe('#resourceSearch', () => {
      it('builds a request with custom headers', async () => {
        let capturedAbc: string | null = null;
        server.use(http.get(`${BASE_URL}/Patient`, ({ request }) => {
          capturedAbc = request.headers.get('abc');
          return HttpResponse.json(readFixture('search-results.json'));
        }));

        const response = await fhirClient.resourceSearch({ resourceType: 'Patient', searchParams: { name: 'abbott' }, options: { headers: { abc: 'XYZ' } } });
        expect(response.resourceType).toBe('Bundle');
        expect(response.id).toBe('95a2de95-08c7-418e-b4d0-2dd6fc8cc37e');
        expect(capturedAbc).toBe('XYZ');
      });

      it('returns a matching search results bundle', async () => {
        server.use(http.get(`${BASE_URL}/Patient`, () => HttpResponse.json(readFixture('search-results.json'))));
        const response = await fhirClient.resourceSearch({ resourceType: 'Patient', searchParams: { name: 'abbott' } });
        expect(response.resourceType).toBe('Bundle');
        expect(response.id).toBe('95a2de95-08c7-418e-b4d0-2dd6fc8cc37e');
      });

      it('performs a POST search', async () => {
        let capturedContentType: string | null = null;
        server.use(http.post(`${BASE_URL}/Patient/_search`, ({ request }) => {
          capturedContentType = request.headers.get('content-type');
          return HttpResponse.json(readFixture('search-results.json'));
        }));

        const response = await fhirClient.resourceSearch({ resourceType: 'Patient', searchParams: { name: 'abbott' }, options: { postSearch: true } });
        expect(response.resourceType).toBe('Bundle');
        expect(capturedContentType).toContain('application/x-www-form-urlencoded');
      });

      it('supports repeated query params', async () => {
        let capturedUrl: string | null = null;
        server.use(http.get(`${BASE_URL}/Patient`, ({ request }) => {
          capturedUrl = request.url;
          return HttpResponse.json(readFixture('search-results.json'));
        }));

        const response = await fhirClient.resourceSearch({ resourceType: 'Patient', searchParams: { _include: ['Observation', 'MedicationRequest'] } });
        expect(response.resourceType).toBe('Bundle');
        expect(capturedUrl).toContain('_include=Observation');
        expect(capturedUrl).toContain('_include=MedicationRequest');
      });

      it('supports searching with no query parameters', async () => {
        server.use(http.get(`${BASE_URL}/Patient`, () => HttpResponse.json(readFixture('search-results.json'))));

        let response = await fhirClient.resourceSearch({ resourceType: 'Patient' });
        expect(response.resourceType).toBe('Bundle');

        response = await fhirClient.resourceSearch({ resourceType: 'Patient', searchParams: {} });
        expect(response.resourceType).toBe('Bundle');
      });
    });

    describe('#systemSearch', () => {
      it('builds a request with custom headers', async () => {
        let capturedAbc: string | null = null;
        server.use(http.get(`${BASE_URL}/`, ({ request }) => {
          capturedAbc = request.headers.get('abc');
          return HttpResponse.json(readFixture('system-search-results.json'));
        }));

        const response = await fhirClient.systemSearch({ searchParams: { name: 'abcdef' }, options: { headers: { abc: 'XYZ' } } });
        expect(response.resourceType).toBe('Bundle');
        expect(response.id).toBe('95a2de95-08c7-418e-b4d0-2dd6fc8cc37e');
        expect(capturedAbc).toBe('XYZ');
      });

      it('returns a matching search results bundle', async () => {
        server.use(http.get(`${BASE_URL}/`, () => HttpResponse.json(readFixture('system-search-results.json'))));
        const response = await fhirClient.systemSearch({ searchParams: { name: 'abcdef' } });
        expect(response.resourceType).toBe('Bundle');
        expect(response.id).toBe('95a2de95-08c7-418e-b4d0-2dd6fc8cc37e');
      });

      it('performs a POST search', async () => {
        let capturedContentType: string | null = null;
        server.use(http.post(`${BASE_URL}/_search`, ({ request }) => {
          capturedContentType = request.headers.get('content-type');
          return HttpResponse.json(readFixture('system-search-results.json'));
        }));

        const response = await fhirClient.systemSearch({ searchParams: { name: 'abcdef' }, options: { postSearch: true } });
        expect(response.resourceType).toBe('Bundle');
        expect(capturedContentType).toContain('application/x-www-form-urlencoded');
      });

      it('supports repeated query params', async () => {
        let capturedUrl: string | null = null;
        server.use(http.get(`${BASE_URL}/`, ({ request }) => {
          capturedUrl = request.url;
          return HttpResponse.json(readFixture('system-search-results.json'));
        }));

        const response = await fhirClient.systemSearch({ searchParams: { name: 'abcdef', _include: ['Observation', 'MedicationRequest'] } });
        expect(response.resourceType).toBe('Bundle');
        expect(capturedUrl).toContain('name=abcdef');
        expect(capturedUrl).toContain('_include=Observation');
        expect(capturedUrl).toContain('_include=MedicationRequest');
      });
    });

    describe('#compartmentSearch', () => {
      it('throws an error without the required compartment arguments', () => {
        expect(() => fhirClient.compartmentSearch({} as never)).toThrow();
      });

      it('builds a request with custom headers', async () => {
        let capturedAbc: string | null = null;
        server.use(http.get(`${BASE_URL}/Patient/385800201/Condition`, ({ request }) => {
          capturedAbc = request.headers.get('abc');
          return HttpResponse.json(readFixture('compartment-search-results.json'));
        }));

        const response = await fhirClient.compartmentSearch({ compartment: { resourceType: 'Patient', id: '385800201' }, resourceType: 'Condition', options: { headers: { abc: 'XYZ' } } });
        expect(response.resourceType).toBe('Bundle');
        expect(response.type).toBe('searchset');
        expect(response.total).toBe(6);
        expect(capturedAbc).toBe('XYZ');
      });

      it('returns a matching search results bundle with query params', async () => {
        server.use(http.get(`${BASE_URL}/Patient/385800201/Condition`, () => HttpResponse.json(readFixture('compartment-search-with-query-results.json'))));
        const response = await fhirClient.compartmentSearch({ compartment: { resourceType: 'Patient', id: '385800201' }, resourceType: 'Condition', searchParams: { category: 'problem' } });
        expect(response.resourceType).toBe('Bundle');
        expect(response.type).toBe('searchset');
        expect(response.total).toBe(6);
      });

      it('performs a POST search', async () => {
        server.use(http.post(`${BASE_URL}/Patient/385800201/Condition/_search`, () => HttpResponse.json(readFixture('compartment-search-with-query-results.json'))));
        const response = await fhirClient.compartmentSearch({ compartment: { resourceType: 'Patient', id: '385800201' }, resourceType: 'Condition', searchParams: { category: 'problem' }, options: { postSearch: true } });
        expect(response.resourceType).toBe('Bundle');
        expect(response.total).toBe(6);
      });

      it('supports repeated query params', async () => {
        let capturedUrl: string | null = null;
        server.use(http.get(`${BASE_URL}/Patient/385800201/Condition`, ({ request }) => {
          capturedUrl = request.url;
          return HttpResponse.json(readFixture('compartment-search-with-query-results.json'));
        }));

        const response = await fhirClient.compartmentSearch({
          compartment: { resourceType: 'Patient', id: '385800201' },
          resourceType: 'Condition',
          searchParams: { category: 'problem', _include: ['Observation', 'MedicationRequest'] },
        });
        expect(response.resourceType).toBe('Bundle');
        expect(capturedUrl).toContain('category=problem');
        expect(capturedUrl).toContain('_include=Observation');
      });

      it('returns a matching search results bundle without query params', async () => {
        server.use(http.get(`${BASE_URL}/Patient/385800201/Condition`, () => HttpResponse.json(readFixture('compartment-search-results.json'))));
        const response = await fhirClient.compartmentSearch({ compartment: { resourceType: 'Patient', id: '385800201' }, resourceType: 'Condition' });
        expect(response.resourceType).toBe('Bundle');
        expect(response.type).toBe('searchset');
        expect(response.total).toBe(6);
      });
    });

    describe('pagination', () => {
      describe('#nextPage', () => {
        it('builds a request with custom headers', async () => {
          let capturedAbc: string | null = null;
          server.use(http.get(`${BASE_URL}/`, ({ request }) => {
            capturedAbc = request.headers.get('abc');
            return HttpResponse.json(readFixture('search-results-page-2.json'));
          }));

          const bundle = readFixture('search-results-page-1.json');
          const options = { headers: { abc: 'XYZ' } };
          const response = await fhirClient.nextPage({ bundle: bundle as never, options });
          const url = 'https://example.com/?_getpages=678cd733-8823-4324-88a7-51d369cf78a9&_getpagesoffset=3&_count=3&_pretty=true&_bundletype=searchset';
          expect((response as Record<string, unknown[]>).link[0].url).toBe(url);
          expect(capturedAbc).toBe('XYZ');
        });

        it('returns the next page of results', async () => {
          server.use(http.get(`${BASE_URL}/`, () => HttpResponse.json(readFixture('search-results-page-2.json'))));
          const bundle = readFixture('search-results-page-1.json');
          const response = await fhirClient.nextPage({ bundle: bundle as never });
          const url = 'https://example.com/?_getpages=678cd733-8823-4324-88a7-51d369cf78a9&_getpagesoffset=3&_count=3&_pretty=true&_bundletype=searchset';
          expect((response as Record<string, unknown[]>).link[0].url).toBe(url);
        });

        it('returns undefined if no next page exists', () => {
          const results = readFixture('search-results.json');
          expect(fhirClient.nextPage({ bundle: results as never })).toBeUndefined();
        });
      });

      describe('#prevPage', () => {
        it('builds a request with custom headers', async () => {
          let capturedAbc: string | null = null;
          server.use(http.get(`${BASE_URL}/`, ({ request }) => {
            capturedAbc = request.headers.get('abc');
            return HttpResponse.json(readFixture('search-results-page-1.json'));
          }));

          const bundle = readFixture('search-results-page-2.json');
          const options = { headers: { abc: 'XYZ' } };
          const response = await fhirClient.prevPage({ bundle: bundle as never, options });
          const url = 'https://example.com/Patient?_count=3&gender=female';
          expect((response as Record<string, unknown[]>).link[0].url).toBe(url);
          expect(capturedAbc).toBe('XYZ');
        });

        it('returns the previous page of results', async () => {
          server.use(http.get(`${BASE_URL}/`, () => HttpResponse.json(readFixture('search-results-page-1.json'))));
          const bundle = readFixture('search-results-page-2.json');
          const response = await fhirClient.prevPage({ bundle: bundle as never });
          const url = 'https://example.com/Patient?_count=3&gender=female';
          expect((response as Record<string, unknown[]>).link[0].url).toBe(url);
        });

        it('returns undefined if no previous page exists', () => {
          const bundle = readFixture('search-results.json');
          expect(fhirClient.prevPage({ bundle: bundle as never })).toBeUndefined();
        });

        it('detects and responds to "prev" relations', async () => {
          server.use(http.get(`${BASE_URL}/`, () => HttpResponse.json(readFixture('search-results-page-1.json'))));
          const bundle = readFixture('search-results-page-2.json') as { link: Array<{ relation: string; url: string }> };
          bundle.link[2].relation = 'prev';
          const response = await fhirClient.prevPage({ bundle: bundle as never });
          const url = 'https://example.com/Patient?_count=3&gender=female';
          expect((response as Record<string, unknown[]>).link[0].url).toBe(url);
        });
      });
    });

    describe('#create', () => {
      const newPatient = {
        resourceType: 'Patient',
        active: true,
        name: [{ use: 'official', family: 'Coleman', given: ['Lisa', 'P.'] }],
        gender: 'female',
        birthDate: '1948-04-14',
      };

      it('builds a request with custom headers', async () => {
        let capturedAbc: string | null = null;
        server.use(http.post(`${BASE_URL}/Patient`, ({ request }) => {
          capturedAbc = request.headers.get('abc');
          return HttpResponse.json(readFixture('patient-created.json'), { status: 201 });
        }));

        const response = await fhirClient.create({ resourceType: newPatient.resourceType, body: newPatient, options: { headers: { abc: 'XYZ' } } });
        expect(response.resourceType).toBe('OperationOutcome');
        expect(capturedAbc).toBe('XYZ');
      });

      it('returns a successful operation outcome', async () => {
        server.use(http.post(`${BASE_URL}/Patient`, () => HttpResponse.json(readFixture('patient-created.json'), { status: 201 })));
        const response = await fhirClient.create({ resourceType: newPatient.resourceType, body: newPatient });
        expect(response.resourceType).toBe('OperationOutcome');
        expect((response as Record<string, Array<{ diagnostics: string }>>).issue[0].diagnostics).toContain('Successfully created resource');
      });

      it('throws an error if the resource type format is invalid', () => {
        const newRecord = { resourceType: 'https://bad/Foo', name: [{ use: 'official', family: 'Coleman' }] };
        expect(() => fhirClient.create({ resourceType: newRecord.resourceType, body: newRecord })).toThrow('Invalid resourceType');
      });

      it('returns successfully without body when status is 201 and response is empty (Prefer: return=minimal)', async () => {
        server.use(http.post(`${BASE_URL}/Patient`, () => new HttpResponse(null, { status: 201 })));
        const response = await fhirClient.create({ resourceType: newPatient.resourceType, body: newPatient, options: { headers: { accept: 'application/fhir+json' } } });
        const { response: httpResponse } = Client.httpFor(response);
        expect(Object.keys(response)).toHaveLength(0);
        expect(httpResponse?.status).toBe(201);
      });
    });

    describe('#delete', () => {
      it('builds a request with custom headers', async () => {
        let capturedAbc: string | null = null;
        server.use(http.delete(`${BASE_URL}/Patient/152746`, ({ request }) => {
          capturedAbc = request.headers.get('abc');
          return HttpResponse.json(readFixture('patient-deleted.json'));
        }));

        const response = await fhirClient.delete({ resourceType: 'Patient', id: '152746', options: { headers: { abc: 'XYZ' } } });
        expect(response.resourceType).toBe('OperationOutcome');
        expect(capturedAbc).toBe('XYZ');
      });

      it('returns a successful operation outcome', async () => {
        server.use(http.delete(`${BASE_URL}/Patient/152746`, () => HttpResponse.json(readFixture('patient-deleted.json'))));
        const response = await fhirClient.delete({ resourceType: 'Patient', id: '152746' });
        expect(response.resourceType).toBe('OperationOutcome');
        expect((response as Record<string, Array<{ diagnostics: string }>>).issue[0].diagnostics).toContain('Successfully deleted 1 resource');
      });

      it('throws an error for a missing resource', async () => {
        server.use(http.delete(`${BASE_URL}/Patient/abcdef`, () => HttpResponse.json(readFixture('patient-not-found.json'), { status: 404 })));
        await expect(fhirClient.delete({ resourceType: 'Patient', id: 'abcdef' })).rejects.toMatchObject({
          response: { status: 404, data: { resourceType: 'OperationOutcome' } },
        });
      });
    });

    describe('#update', () => {
      const body = { resourceType: 'Patient', id: '152747', birthDate: '1948-10-10' };

      it('builds a request with custom headers', async () => {
        let capturedAbc: string | null = null;
        server.use(http.put(`${BASE_URL}/Patient/152747`, ({ request }) => {
          capturedAbc = request.headers.get('abc');
          return HttpResponse.json(readFixture('patient-updated.json'));
        }));

        const response = await fhirClient.update({ resourceType: 'Patient', id: '152747', body, options: { headers: { abc: 'XYZ' } } });
        expect(response.resourceType).toBe('OperationOutcome');
        expect(capturedAbc).toBe('XYZ');
      });

      it('returns a successful operation outcome', async () => {
        server.use(http.put(`${BASE_URL}/Patient/152747`, () => HttpResponse.json(readFixture('patient-updated.json'))));
        const response = await fhirClient.update({ resourceType: 'Patient', id: '152747', body });
        expect(response.resourceType).toBe('OperationOutcome');
        expect((response as Record<string, Array<{ diagnostics: string }>>).issue[0].diagnostics).toContain('_history/2');
      });

      it('returns a successful operation outcome for a conditional update', async () => {
        server.use(http.put(`${BASE_URL}/Patient`, () => HttpResponse.json(readFixture('patient-updated.json'))));
        const response = await fhirClient.update({ resourceType: 'Patient', searchParams: { identifier: 'urn:1.2.3|152747' }, body });
        expect(response.resourceType).toBe('OperationOutcome');
        expect((response as Record<string, Array<{ diagnostics: string }>>).issue[0].diagnostics).toContain('_history/2');
      });

      it('throws an error for a missing resource', async () => {
        server.use(http.put(`${BASE_URL}/Patient/abcdef`, () => HttpResponse.json(readFixture('patient-not-found.json'), { status: 404 })));
        await expect(fhirClient.update({ resourceType: 'Patient', id: 'abcdef', body })).rejects.toMatchObject({
          response: { status: 404, data: { resourceType: 'OperationOutcome' } },
        });
      });
    });

    describe('#patch', () => {
      it('builds a request with custom headers', async () => {
        const JSONPatch = [{ op: 'replace', path: '/gender', value: 'male' }];
        let capturedAbc: string | null = null;
        server.use(http.patch(`${BASE_URL}/Patient/152747`, ({ request }) => {
          capturedAbc = request.headers.get('abc');
          return HttpResponse.json(readFixture('patient-patched.json'));
        }));

        const response = await fhirClient.patch({ resourceType: 'Patient', id: '152747', jsonPatch: JSONPatch, options: { headers: { abc: 'XYZ' } } });
        expect(response.resourceType).toBe('OperationOutcome');
        expect(capturedAbc).toBe('XYZ');
      });

      it('returns a successful operation outcome', async () => {
        const JSONPatch = [{ op: 'replace', path: '/gender', value: 'male' }];
        let capturedContentType: string | null = null;
        server.use(http.patch(`${BASE_URL}/Patient/152747`, ({ request }) => {
          capturedContentType = request.headers.get('content-type');
          return HttpResponse.json(readFixture('patient-patched.json'));
        }));

        const response = await fhirClient.patch({ resourceType: 'Patient', id: '152747', jsonPatch: JSONPatch });
        expect(response.resourceType).toBe('OperationOutcome');
        expect(capturedContentType).toContain('application/json-patch+json');
        expect((response as Record<string, Array<{ diagnostics: string }>>).issue[0].diagnostics).toContain('_history/3');
      });

      it('throws an error when given an invalid patch', async () => {
        const invalidPatch = [{ op: 'replace', path: '/gender', value: 0 }];
        server.use(http.patch(`${BASE_URL}/Patient/152747`, () => HttpResponse.json(readFixture('patient-not-patched.json'), { status: 500 })));

        await expect(fhirClient.patch({ resourceType: 'Patient', id: '152747', jsonPatch: invalidPatch })).rejects.toMatchObject({
          response: { status: 500, data: { resourceType: 'OperationOutcome' } },
        });
      });
    });

    describe('#batch', () => {
      it('builds a request with custom headers', async () => {
        let capturedAbc: string | null = null;
        server.use(http.post(`${BASE_URL}/`, ({ request }) => {
          capturedAbc = request.headers.get('abc');
          return HttpResponse.json(readFixture('batch-results.json'));
        }));

        const body = readFixture('batch-request.json');
        const response = await fhirClient.batch({ body, options: { headers: { abc: 'XYZ' } } });
        expect(response.resourceType).toBe('Bundle');
        expect(response.type).toBe('batch-response');
        expect(capturedAbc).toBe('XYZ');
      });

      it('returns a matching batch response bundle', async () => {
        server.use(http.post(`${BASE_URL}/`, () => HttpResponse.json(readFixture('batch-results.json'))));
        const body = readFixture('batch-request.json');
        const response = await fhirClient.batch({ body });
        expect(response.resourceType).toBe('Bundle');
        expect(response.type).toBe('batch-response');
        const entry = (response as Record<string, Array<Record<string, unknown>>>).entry;
        expect((entry[0].resource as { resourceType: string }).resourceType).toBe('OperationOutcome');
        expect((entry[1].response as { status: string }).status).toBe('201 Created');
        expect((entry[2].response as { status: string }).status).toBe('200 OK');
        expect((entry[3].response as { status: string }).status).toBe('204 No Content');
        expect((entry[4].response as { status: string }).status).toBe('200 OK');
      });

      it('returns a bundle of errors if any operations are unsuccessful', async () => {
        server.use(http.post(`${BASE_URL}/`, () => HttpResponse.json(readFixture('batch-error-results.json'))));
        const body = readFixture('batch-error-request.json');
        const response = await fhirClient.batch({ body });
        expect(response.resourceType).toBe('Bundle');
        const entry = (response as Record<string, Array<Record<string, unknown>>>).entry;
        expect((entry[1].response as { status: string }).status).toBe('500 Internal Server Error');
        expect((entry[3].response as { status: string }).status).toBe('404 Not Found');
        expect((entry[4].response as { status: string }).status).toBe('200 OK');
      });
    });

    describe('#transaction', () => {
      it('builds a request with custom headers', async () => {
        let capturedAbc: string | null = null;
        server.use(http.post(`${BASE_URL}/`, ({ request }) => {
          capturedAbc = request.headers.get('abc');
          return HttpResponse.json(readFixture('transaction-results.json'));
        }));

        const body = readFixture('transaction-request.json');
        const response = await fhirClient.transaction({ body, options: { headers: { abc: 'XYZ' } } });
        expect(response.resourceType).toBe('Bundle');
        expect(response.type).toBe('transaction-response');
        expect(capturedAbc).toBe('XYZ');
      });

      it('returns a transaction response bundle', async () => {
        server.use(http.post(`${BASE_URL}/`, () => HttpResponse.json(readFixture('transaction-results.json'))));
        const body = readFixture('transaction-request.json');
        const response = await fhirClient.transaction({ body });
        expect(response.resourceType).toBe('Bundle');
        expect(response.type).toBe('transaction-response');
        const entry = (response as Record<string, Array<Record<string, unknown>>>).entry;
        expect((entry[0].response as { status: string }).status).toBe('201 Created');
        expect((entry[1].response as { status: string }).status).toBe('200 OK');
        expect((entry[2].response as { status: string }).status).toBe('204 No Content');
        expect((entry[3].response as { status: string }).status).toBe('200 OK');
      });

      it('throws an error if any operations are unsuccessful', async () => {
        server.use(http.post(`${BASE_URL}/`, () => HttpResponse.json(readFixture('transaction-error-response.json'), { status: 404 })));
        const body = readFixture('transaction-error-request.json');
        await expect(fhirClient.transaction({ body })).rejects.toMatchObject({
          response: { status: 404, data: { resourceType: 'OperationOutcome' } },
        });
      });
    });

    describe('#history', () => {
      it('calls resourceHistory when given the "resourceType" and "id" params', async () => {
        server.use(http.get(`${BASE_URL}/Patient/152747/_history`, () => HttpResponse.json(readFixture('resource-history.json'))));
        const response = await fhirClient.history({ resourceType: 'Patient', id: '152747' });
        expectHistoryBundle(response as Record<string, unknown>, 20);
      });

      it('calls typeHistory when given "resourceType" but not "id"', async () => {
        server.use(http.get(`${BASE_URL}/Patient/_history`, () => HttpResponse.json(readFixture('type-history.json'))));
        const response = await fhirClient.history({ resourceType: 'Patient' });
        expectHistoryBundle(response as Record<string, unknown>, 15);
      });

      it('calls systemHistory when given no arguments', async () => {
        server.use(http.get(`${BASE_URL}/_history`, () => HttpResponse.json(readFixture('system-history.json'))));
        const response = await fhirClient.history();
        expectHistoryBundle(response as Record<string, unknown>, 152750);
      });
    });

    describe('#resourceHistory', () => {
      it('builds a request with custom headers', async () => {
        let capturedAbc: string | null = null;
        server.use(http.get(`${BASE_URL}/Patient/152747/_history`, ({ request }) => {
          capturedAbc = request.headers.get('abc');
          return HttpResponse.json(readFixture('resource-history.json'));
        }));

        const response = await fhirClient.resourceHistory({ resourceType: 'Patient', id: '152747', options: { headers: { abc: 'XYZ' } } });
        expectHistoryBundle(response as Record<string, unknown>, 20);
        expect(capturedAbc).toBe('XYZ');
      });

      it('returns a history bundle for a resource', async () => {
        server.use(http.get(`${BASE_URL}/Patient/152747/_history`, () => HttpResponse.json(readFixture('resource-history.json'))));
        const response = await fhirClient.resourceHistory({ resourceType: 'Patient', id: '152747' });
        expectHistoryBundle(response as Record<string, unknown>, 20);
      });
    });

    describe('#typeHistory', () => {
      it('builds a request with custom headers', async () => {
        let capturedAbc: string | null = null;
        server.use(http.get(`${BASE_URL}/Patient/_history`, ({ request }) => {
          capturedAbc = request.headers.get('abc');
          return HttpResponse.json(readFixture('type-history.json'));
        }));

        const response = await fhirClient.typeHistory({ resourceType: 'Patient', options: { headers: { abc: 'XYZ' } } });
        expectHistoryBundle(response as Record<string, unknown>, 15);
        expect(capturedAbc).toBe('XYZ');
      });

      it('returns a history bundle for a resource type', async () => {
        server.use(http.get(`${BASE_URL}/Patient/_history`, () => HttpResponse.json(readFixture('type-history.json'))));
        const response = await fhirClient.typeHistory({ resourceType: 'Patient' });
        expectHistoryBundle(response as Record<string, unknown>, 15);
      });
    });

    describe('#systemHistory', () => {
      it('builds a request with custom headers', async () => {
        let capturedAbc: string | null = null;
        server.use(http.get(`${BASE_URL}/_history`, ({ request }) => {
          capturedAbc = request.headers.get('abc');
          return HttpResponse.json(readFixture('system-history.json'));
        }));

        const response = await fhirClient.systemHistory({ options: { headers: { abc: 'XYZ' } } });
        expectHistoryBundle(response as Record<string, unknown>, 152750);
        expect(capturedAbc).toBe('XYZ');
      });

      it('returns a history bundle for all resources', async () => {
        server.use(http.get(`${BASE_URL}/_history`, () => HttpResponse.json(readFixture('system-history.json'))));
        const response = await fhirClient.systemHistory();
        expectHistoryBundle(response as Record<string, unknown>, 152750);
      });
    });
  });

  describe('#noUrlInjection', () => {
    it('rejects url injection through resourceType', () => {
      expect(() => fhirClient.read({ resourceType: 'https://bad-server/Patient', id: '123' })).toThrow(/Invalid resourceType/);
    });

    it('rejects url injection through resourceType and id', () => {
      expect(() => fhirClient.read({ resourceType: 'https:/', id: 'bad-server/Patient/123' })).toThrow(/Invalid resourceType/);
    });
  });
});
