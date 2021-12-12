# Changelog

### 1.8.1
- Address potential URL injection
- Update typescript definitions

### 1.8.0
- Add support for per-request signing (used by AWS HealthLake) thanks @ericfuxealth and @sdhakal-xealth!
- Export CapabilityTool
- Officially drop support for Node 10

### 1.7.2
- Security updates

### 1.7.1
- Fix a few problems with typescript definitions
- Change to GH actions
- Allow for longer FHIR ids (some systems use ids over 64)

### 1.7.0
- Downgrade debug so it works in old IE (for Epic and other citrix-based EHRs)

### 1.6.8
- Fix typescript interface for smart metadata

### 1.6.6 / 7 (re-tagged due to error)
- Introduce typescript support
- A few library version bumps

### 1.6.5
- Minor updates

### 1.6.4
- Update to use correct mime-type (thanks @oliveregger)
- Update examples (human name)(thanks @oliveregger)

### 1.6.3
- Fixed logging headers (thanks @jpnarkinsky and @awatson1978)
- Updates SMART auth to not use set headers the deprecated way
- Remove flatted

### 1.6.2
- Add new client.request method to create request directly
- Fix a bug where console.dir was not working with react native. NOTE: We will
  finally remove deprecation warnings and migrate to the new API in 1.7.0.
- Update a dep in the examples

### 1.6.1
- Fix a bug with headers when calling smart auth

### 1.6.0
- Add support for .well-known (fetching SMART URIs)

### 1.5.3
- Remove require url, as we are on node 10+ now

### 1.5.2
- Add content-type default header if missing (fixes #129)
- Update dependencies

### 1.5.1
- Add support for operations

### 1.5.0
- Drop support for node 8
- Remove universal-url
- Update dependencies

### 1.4.2
- Update README

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
