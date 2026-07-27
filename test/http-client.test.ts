import { HttpResponse, http } from 'msw';
import { describe, expect, it } from 'vitest';
import { HttpClient } from '../src/http-client.js';
import { REQUEST_KEY } from '../src/types.js';
import { server } from './setup.js';

const makeClient = (baseUrl: string) => new HttpClient({ baseUrl });

describe('HttpClient', () => {
  describe('#expandUrl', () => {
    it('returns an absolute URL unchanged', () => {
      const client = makeClient('https://example.com/fhir');
      expect(client.expandUrl('https://other.org/Patient/1')).toBe('https://other.org/Patient/1');
      expect(client.expandUrl('http://other.org/Patient/1')).toBe('http://other.org/Patient/1');
    });

    it('joins baseUrl (no trailing slash) with a plain path', () => {
      const client = makeClient('https://example.com/fhir');
      expect(client.expandUrl('Patient/123')).toBe('https://example.com/fhir/Patient/123');
    });

    it('joins baseUrl (no trailing slash) with a leading-slash path', () => {
      const client = makeClient('https://example.com/fhir');
      expect(client.expandUrl('/Patient/123')).toBe('https://example.com/fhir/Patient/123');
    });

    it('joins baseUrl (trailing slash) with a plain path', () => {
      const client = makeClient('https://example.com/fhir/');
      expect(client.expandUrl('Patient/123')).toBe('https://example.com/fhir/Patient/123');
    });

    it('avoids double slash when baseUrl has trailing slash and path has leading slash', () => {
      const client = makeClient('https://example.com/fhir/');
      expect(client.expandUrl('/Patient/123')).toBe('https://example.com/fhir/Patient/123');
    });

    it('returns baseUrl with a separator for an empty path', () => {
      const client = makeClient('https://example.com/fhir');
      expect(client.expandUrl('')).toBe('https://example.com/fhir/');
    });
  });

  describe('#request keepalive', () => {
    const BASE_URL = 'https://example.com';

    it('defaults to keepalive: true', async () => {
      server.use(http.get(`${BASE_URL}/Basic/1`, () => HttpResponse.json({ resourceType: 'Basic', id: '1' })));
      const client = makeClient(BASE_URL);
      const response = await client.get('Basic/1');
      const request = (response as unknown as Record<string, unknown>)[REQUEST_KEY] as Request;
      expect(request.keepalive).toBe(true);
    });

    it('allows overriding keepalive to false per-request', async () => {
      server.use(http.get(`${BASE_URL}/Basic/1`, () => HttpResponse.json({ resourceType: 'Basic', id: '1' })));
      const client = makeClient(BASE_URL);
      const response = await client.get('Basic/1', { keepalive: false });
      const request = (response as unknown as Record<string, unknown>)[REQUEST_KEY] as Request;
      expect(request.keepalive).toBe(false);
    });
  });
});
