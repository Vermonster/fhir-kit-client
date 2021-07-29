/* eslint-disable func-names, no-unused-expressions, no-param-reassign */
const nock = require('nock');
const { expect } = require('chai');
const Client = require('../lib/client');
const { readStreamFor } = require('./test-utils');

describe('Client with request signer', function () {
  const baseUrl = 'https://example.com';
  const awsSignedHeaders = {
    Host: 'healthlake.us-west-2.amazonaws.com',
    'X-Amz-Security-Token': 'IQoJb3JpZ2luX2VjEIv//////////wEaCXVzLXdlc3QtMiJGMEQCIGjCEk2H+cRZxyQd9xTH/3lQWo+/zG693Mf0KeYCuNxDAiBLK8CMZNR50ciEsCxv9zkjChBHhIFuN2jzhE4mNqFZ2Sq4AgiU//////////8BEAIaDDM3MjA4MDM3MDYwMiIMrmweyrv/bY0XttiS+MVnKBNjY4F167TmNahA8aSpjHFin89wRKaScV7iCGHbzKji7uYpLkEzXt79FAZQsnSRBOIGD7lqP6xb/lb3EvWTOCopn2+aOdAtSkJe/IWO960d3TeXyv7VUvtIVnLHgQn1F8hUfpVW3AzjkSJ9aiKQ2NWXvTPooY79nBiilpEUnQqY74QVnCsaquek80UYsjCCN63sZIaos7RTII25YVneb0vMZhle/+Hxnd8DcNzUbbcbwvE6VmtLsz8r2SCqQnOcSgbhhNOt/kd8sxcAzZzB6/6TTP2q1fwzd40+V3Kol9FDC+/IuIBjqeAXUgaC1VPK1ep5XJVIioQjiZDDwF7H4oDkNT8IxryioOa/WNN9zWSxbvBJr+CAtAZJxJa1wUuXgGUNYKMbEHLsBtkSPnHUgxyomdGVZmtC5hgWRNtcNxK9bhps/Hmvs5GmBXJznjsnKhJ8Zkh/DzADh/SyzzUovSXTi8n7DQ/9a6nYu7pofcNMO187u8fIOBLGX2i9IfnOW9xMtYtetr',
    'X-Amz-Date': '20210729T192323Z',
    Authorization: 'AWS4-HMAC-SHA256 Credential=ASIAVNINX4OVBSUDTHU4/20210729/us-west-2/healthlake/aws4_request, SignedHeaders=host;x-amz-date;x-amz-security-token, Signature=95ab2c54f7c7c851e3cc6c6e2406460caf3a2d24949cccccceeeeeffffff',
  };

  function mockedAws4Signer(options) {
    return {
      ...options,
      headers: awsSignedHeaders,
      hostname: 'healthlake.us-west-2.amazonaws.com',
    };
  }

  const requestSigner = (requestOptions) => {
    let awsSignatureOpts = {
      path: requestOptions.path,
      service: 'healthlake',
      region: 'us-west-2',
      method: requestOptions.method,
    };
    awsSignatureOpts = mockedAws4Signer(awsSignatureOpts);

    const currentHeaders = requestOptions.headers;
    Object.keys(awsSignatureOpts.headers).forEach((key) => {
      currentHeaders.append(key, awsSignatureOpts.headers[key]);
    });
  };

  function mockAndCheckResponse(method) {
    const mock = nock(baseUrl)
      .matchHeader('accept', 'application/fhir+json');
    let interceptor;
    if (method === 'GET') {
      interceptor = mock.get('/Patient/123');
    } else if (method === 'POST') {
      interceptor = mock.post('/Patient');
    } else if (method === 'DELETE') {
      interceptor = mock.delete('/Patient/123');
    } else {
      throw new Error();
    }

    interceptor.reply(200, function () {
      const expectedHeaders = this.req.headers;
      Object.keys(awsSignedHeaders).forEach((key) => {
        if (key === 'Host') {
          // the host header is a single value
          expect(expectedHeaders[key.toLowerCase()]).to.eql(awsSignedHeaders[key]);
        } else {
          // otherwise it's a list of values
          expect(expectedHeaders[key.toLowerCase()]).to.eql([awsSignedHeaders[key]]);
        }
      });
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
