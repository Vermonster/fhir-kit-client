/* eslint-disable func-names, no-unused-expressions, no-param-reassign */
const nock = require('nock');
const { expect } = require('chai');
const Client = require('../lib/client');
const { readStreamFor } = require('./test-utils');

describe('Client with request signer', function () {
  const baseUrl = 'https://healthlake.us-west-2.amazonaws.com';
  const awsSignedHeaders = {
    Host: 'healthlake.us-west-2.amazonaws.com',
    'X-Amz-Security-Token': 'TOKEN',
    'X-Amz-Date': '20210729T192323Z',
    Authorization: 'AWS4-HMAC-SHA256 Credential=AAAAAA/20210729/us-west-2/healthlake/aws4_request, SignedHeaders=host;x-amz-date;x-amz-security-token, Signature=SIGNATURE',
  };

  function mockedAws4Signer(url, options) {
    return {
      ...options,
      headers: awsSignedHeaders,
      hostname: 'healthlake.us-west-2.amazonaws.com',
    };
  }

  const requestSigner = (url, requestOptions) => {
    let awsSignatureOpts = {
      path: requestOptions.path,
      service: 'healthlake',
      region: 'us-west-2',
      method: requestOptions.method,
    };
    awsSignatureOpts = mockedAws4Signer(url, awsSignatureOpts);

    const currentHeaders = requestOptions.headers;
    for (const key of Object.keys(awsSignatureOpts.headers)) {
      currentHeaders.set(key, awsSignatureOpts.headers[key]);
    }
  };

  function mockAndCheckResponse(method) {
    const mock = nock(baseUrl)
      .matchHeader('accept', 'application/fhir+json');
    let interceptor;
    switch (method) {
      case 'GET': {
        interceptor = mock.get('/Patient/123');

        break;
      }
      case 'POST': {
        interceptor = mock.post('/Patient');

        break;
      }
      case 'DELETE': {
        interceptor = mock.delete('/Patient/123');

        break;
      }
      default: {
        throw new Error(`Invalid method ${method}`);
      }
    }

    interceptor.reply(200, function () {
      const expectedHeaders = this.req.headers;
      for (const key of Object.keys(awsSignedHeaders)) {
        if (key === 'Host') {
          // the host header is a single value
          expect(expectedHeaders[key.toLowerCase()]).to.eql(awsSignedHeaders[key]);
        } else {
          // otherwise it's a list of values
          expect(expectedHeaders[key.toLowerCase()]).to.eql([awsSignedHeaders[key]]);
        }
      }
      return readStreamFor('patient.json');
    });
  }

  beforeEach(function () {
    const config = {
      baseUrl,
      requestSigner,
    };
    this.fhirClient = new Client(config);
  });

  it('GET request', async function () {
    mockAndCheckResponse('GET');
    await this.fhirClient.request('Patient/123');
  });

  it('DELETE request', async function () {
    mockAndCheckResponse('DELETE');
    await this.fhirClient.request('Patient/123', { method: 'DELETE' });
  });

  it('POST request', async function () {
    mockAndCheckResponse('POST');
    await this.fhirClient.request('Patient',
      {
        method: 'POST',
        body: { resourceType: 'patient' },
      });
  });
});
