# Launch Examples

This directory contains example apps demonstrating an application launch.

## [examples/smart-ehr](./examples/smart-ehr)

This example provides two routes, `/launch` and `/callback`, through which an EHR
may launch the SMART app within the EHR's provided launch context.

To use:
1. `yarn install`
2. Run `yarn start` to serve the web app through port 3000.
3. Change `<CLIENT_ID>` and `<CLIENT_SECRET>` as needed.
4. To test with external servers, try tunneling to localhost:3000 with a service like [ngrok](http://ngrok.com/).

An EHR can then visit the launch route with two parameters: iss and launch. The
SMART app will make a request to the OAuth server's authorization URL.
Then, it will redirect to the SMART app callback.

In the callback route, another request is made (using the simple-oauth
library) to request a token from the OAuth2 server. The server will then
send back a launch_context containing, among other things, an access token to
set in the Authorization header and use for subsequent FHIR requests (to the
ISS).

## [examples/smart-standalone](./examples/smart-standalone)

This example provides the same routes above,
but instead of an EHR launching from the `/launch` route, a user would directly
visit the route with two different parameters: iss and scope. For example:

`https://localhost:3000/launch?iss=http://example.com/fhir&scope=openid%20profile%20offline_access%20user%2F*.*%20patient%2F*.*%20launch%2Fencounter%20launch%2Fpatient`

The EHR will again then provide a launch context and access token.

To run, follow the same instructions above listed for the *examples/smart-ehr* example.

## [examples/cds-hooks](./examples/cds-hooks)

This example triggers a Clinical Decision Support (CDS) app from within an EHR according to [CDS Hooks specifications](https://cds-hooks.org/specification/1.0/).

The `/cds-services` route provides a CDS Hooks "discovery endpoint" that dictates to an EHR which
CDS services the SMART app offers and serves configuration data for the EHR to consume.

Once an EHR consumes this discovery endpoint and is configured to supply the dictated prefetch data,
it will be able to launch the `cds-services/patient-view` route. The EHR would post to this route a request body armed with FHIR authorization, prefetch data, and more.

In this example app, an access token may be supplied to the FHIR client instance in order to make an asynchronous `MedicationOrder` request based on the provided EHR patient. The resulting CDS Hook "card" greets the patient
by name based on prefetch data and offers a count of medication orders based on the asynchronous request.
(Note that if no data is required beyond that supplied in the prefetch, a card could be served without needing the FHIR client instance.)

### JWT (JSON Web Token) Validation

All requests in the example are first directed through the `authenticateEHR` middleware.

`authenticateEHR` expects a JSON Web Token (JWT) from the EHR's authorization request header. It is used to establish that the request is from a trusted party. The JWT can be verified by one of 3 different ways in this example:

  1) By setting a PEM file in the current directory on line 15 of `cds-hooks-launch.js`.
  2) By generating a PEM file from a `jku` variable set on line 16.
  3) By generating a PEM file from a `jku` in the decoded JWT header.

The library `jwk-to-pem` takes RSA or EC fields from a JWK to generate a public key. Both RSA and ECC algorithms are supported.

To generate a public key through a private key from the EHR, use openssl, .e.g:

`openssl ec -in ecprivatekey.pem -pubout -out ecpublickey.pem`
