import { describe, expect, it } from 'vitest';
import { HttpClient } from '../src/http-client.js';

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
});
