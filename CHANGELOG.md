# Changelog

### 1.4.1
- Update dependencies to address audit

### 1.4.0
- Replace request with cross-fetch for better client support
- Update npm packages
- Update server example output
- Refactor HttpClient
- Add test for minimial response
- Add test for setting TLS options (key, cert)
- Fix code coverage tool
- Better KeepAlive support
- NOTE: Breaking Change: replaced `Client.requestFor()` function for accessing
  raw HTTP objects with `Client.httpFor()` which returns an object containing
  both the request and the response.

### 1.3.0 (June 12, 2019)
- Add requestOptions (can be used to set cert/key/ca, etc) (thanks @sulkaharo)
- Expose the raw http response object (thanks @sulkaharo)
- Add support for POST searches
- Fix null pointer exception (thanks @yinzara )

### 1.2.4 (May 9, 2019)
- Use `request` errors to avoid throwing errors with no message ([#99](https://github.com/Vermonster/fhir-kit-client/issues/99))

### 1.2.3 (Apr. 15, 2019)
- Refactor parameters to replace `headers` with `options`. Use of the `headers`
  parameter is now DEPRECATED.

  Old style (DEPRECATED):
  ```
  client.read({
    resourceType: 'Patient',
    id: '123',
    headers: { CustomHeader: 'ABC' }
  });
  ```
  New style:
  ```
  client.read({
    resourceType: 'Patient',
    id: '123',
    options: { headers: { CustomHeader: 'ABC' } }
  })
  ```

### 1.2.2 (Feb. 22, 2019)
- Improve error handling in `search` method

### 1.2.1 (Feb. 14, 2019)
- Add missing `request` dependency

### 1.2.0 (Jan. 16, 2019)
- Keep connections alive ([#82](https://github.com/Vermonster/fhir-kit-client/issues/82))
- Support repeated query parameters ([#87](https://github.com/Vermonster/fhir-kit-client/issues/87))

### 1.1.0 (Jan. 16, 2019)
- Add R4 support ([#77](https://github.com/Vermonster/fhir-kit-client/issues/77))
- Fix broken examples ([#79](https://github.com/Vermonster/fhir-kit-client/issues/79))

### 1.0.0 (Dec. 21, 2018)

- Fixed bug handling request errors ([#72](https://github.com/Vermonster/fhir-kit-client/issues/72))
- **Breaking Change:** Throw an error if a client's `baseUrl` is blank ([#73](https://github.com/Vermonster/fhir-kit-client/issues/73))
- Add the ability to add custom headers to a request ([#74](https://github.com/Vermonster/fhir-kit-client/issues/74))
