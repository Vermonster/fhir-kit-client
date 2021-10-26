/* eslint-disable func-names, no-unused-expressions */
const { expect } = require('chai');

const { readFixture } = require('./test-utils');

const {
  authFromCapability,
  authFromWellKnown,
} = require('../lib/smart');

describe('smart', function () {
  describe('#authFromWellKnown', function () {
    it('parses successfully', function () {
      const wellKnown = readFixture(('well-known.json'));
      const {
        authorizeUrl,
        tokenUrl,
      } = authFromWellKnown(wellKnown);

      expect(authorizeUrl).to.deep.equal(new URL('https://launch.smarthealthit.org/v/r4/auth/authorize'));
      expect(tokenUrl).to.deep.equal(new URL('https://launch.smarthealthit.org/v/r4/auth/token'));
    });

    it('returns undefined if not avail', function () {
      const wellKnown = {};
      const {
        authorizeUrl,
        tokenUrl,
      } = authFromWellKnown(wellKnown);

      expect(authorizeUrl).to.be.undefined;
      expect(tokenUrl).to.be.undefined;
    });
  });

  describe('#authFromCapability', function () {
    it('parses successfully', function () {
      const capabilityStatement = readFixture(('valid-capability-statement.json'));
      const {
        authorizeUrl,
        tokenUrl,
        registerUrl,
        manageUrl,
      } = authFromCapability(capabilityStatement);

      expect(authorizeUrl).to.deep.equal(new URL('https://sb-auth.smarthealthit.org/authorize'));
      expect(tokenUrl).to.deep.equal(new URL('https://sb-auth.smarthealthit.org/token'));
      expect(registerUrl).to.deep.equal(new URL('https://sb-auth.smarthealthit.org/register'));
      expect(manageUrl).to.deep.equal(new URL('https://sb-auth.smarthealthit.org/manage'));
    });

    it('returns undefined if not avail', function () {
      const capabilityStatement = {};
      const {
        authorizeUrl,
        tokenUrl,
        registerUrl,
        manageUrl,
      } = authFromCapability(capabilityStatement);

      expect(authorizeUrl).to.be.undefined;
      expect(tokenUrl).to.be.undefined;
      expect(registerUrl).to.undefined;
      expect(manageUrl).to.undefined;
    });
  });
});
