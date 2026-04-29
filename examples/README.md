# Launch Examples

This directory contains example apps demonstrating SMART App Launch and CDS Hooks workflows with `fhir-kit-client` v2.

All examples require **Node 18+** and use ESM (`import`/`export`).

## Setup

1. `npm install` in the project root
2. `npm install` in the example subdirectory you want to run
3. Edit `CLIENT_ID` (and `CLIENT_SECRET` for confidential apps) in the launch file
4. `npm start` — serves the app on port 3000

To test with an external SMART sandbox, tunnel localhost:3000 with [ngrok](https://ngrok.com/) or similar.
The [SMART App Launch sandbox](https://launch.smarthealthit.org) accepts any CLIENT_ID/CLIENT_SECRET values.

---

## [examples/confidential-smart-ehr](./confidential-smart-ehr)

EHR-launched SMART app running on a trusted server with a client secret.

The EHR visits `/launch?iss=<FHIR_URL>&launch=<LAUNCH_TOKEN>`. The app discovers
the authorization URL via `client.smartAuthMetadata()`, redirects the user to the
EHR's authorization server, and exchanges the authorization code for an access token
in the `/callback` route.

**Use this pattern when your app runs server-side and can protect a `CLIENT_SECRET`.**

## [examples/public-smart-ehr](./public-smart-ehr)

EHR-launched SMART app for environments that cannot protect a client secret
(e.g. a downloaded desktop app). Identical to the confidential example except
no `CLIENT_SECRET` is used.

The app's redirect URI must be pre-registered with the EHR before launch.

## [examples/smart-standalone](./smart-standalone)

Standalone SMART launch — a user visits `/launch` directly (without an EHR
initiating the flow), supplying `iss` and `scope` query parameters:

```
http://localhost:3000/launch?iss=https://launch.smarthealthit.org/v/r4/fhir&scope=openid%20profile%20offline_access%20user%2F*.*%20patient%2F*.*
```

The remainder of the OAuth2 flow is the same as the EHR-launched examples.

## [examples/cds-hooks](./cds-hooks)

An Express server that acts as a [CDS Hooks](https://cds-hooks.org/) service.

- `GET /cds-services` — discovery endpoint listing available hooks
- `POST /cds-services/patient-greeter` — handles a `patient-view` hook, greets
  the patient by name and counts their MedicationRequests using the FHIR client

Requests are authenticated with a JWT signed by the EHR. See the source for
three supported verification methods (PEM file, JWK endpoint, JWT header `jku`).

