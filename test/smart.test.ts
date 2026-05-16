import { describe, expect, it } from 'vitest';
import { authFromCapability, authFromWellKnown } from '../src/smart.js';
import { readFixture } from './test-utils.js';

describe('smart', () => {
  describe('authFromWellKnown', () => {
    it('parses successfully', () => {
      const wellKnown = readFixture('well-known.json');
      const { authorizeUrl, tokenUrl } = authFromWellKnown(wellKnown);
      expect(authorizeUrl).toEqual(new URL('https://launch.smarthealthit.org/v/r4/auth/authorize'));
      expect(tokenUrl).toEqual(new URL('https://launch.smarthealthit.org/v/r4/auth/token'));
    });

    it('parses registerUrl from registration_endpoint', () => {
      const { registerUrl } = authFromWellKnown({
        resourceType: 'WellKnown',
        registration_endpoint: 'https://auth.example.com/register',
      });
      expect(registerUrl).toEqual(new URL('https://auth.example.com/register'));
    });

    it('returns undefined if not available', () => {
      const { authorizeUrl, tokenUrl } = authFromWellKnown({});
      expect(authorizeUrl).toBeUndefined();
      expect(tokenUrl).toBeUndefined();
    });
  });

  describe('authFromCapability', () => {
    it('parses successfully', () => {
      const capabilityStatement = readFixture('valid-capability-statement.json');
      const { authorizeUrl, tokenUrl, registerUrl, manageUrl } = authFromCapability(capabilityStatement);
      expect(authorizeUrl).toEqual(new URL('https://sb-auth.smarthealthit.org/authorize'));
      expect(tokenUrl).toEqual(new URL('https://sb-auth.smarthealthit.org/token'));
      expect(registerUrl).toEqual(new URL('https://sb-auth.smarthealthit.org/register'));
      expect(manageUrl).toEqual(new URL('https://sb-auth.smarthealthit.org/manage'));
    });

    it('returns undefined if not available', () => {
      const { authorizeUrl, tokenUrl, registerUrl, manageUrl } = authFromCapability({});
      expect(authorizeUrl).toBeUndefined();
      expect(tokenUrl).toBeUndefined();
      expect(registerUrl).toBeUndefined();
      expect(manageUrl).toBeUndefined();
    });
  });
});
