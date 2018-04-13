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

This provides the same routes above,
but instead of an EHR launching from the `/launch` route, a user would directly
visit the route with two different parameters: iss and scope. For example:

`https://localhost:3000/launch?iss=http://example.com/fhir&scope=openid profile offline_access user/*.* patient/*.* launch/encounter launch/patient`

The EHR will again then provide a launch context and access token.

To run, follow the same instructions above listed for the *examples/smart-ehr* example.

## Upcoming Examples

- [examples/cds-hooks](./examples/cds-hooks): Triggering a Clinical Decision Support (CDS) app from within an EHR according to [CDS Hooks specifications](https://cds-hooks.org/specification/1.0/).
