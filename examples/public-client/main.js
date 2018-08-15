var Client = require('../../lib/client');

switch (window.location.pathname.slice(1)) {
  case 'launch':
    console.log('launch');
    window.Client = Client;
    // get iss and launch query parameters
    // instantiate fhir client and make request get auth url and token url
    // create cookie and save iss, auth url and token url
    // simpleOauthModule.create (if doesnt work in client use another library)
    // redirect to auth url
    break;
  case 'callback':
    console.log('callback');
    // get iss, authorizeUrl and tokenUrl from cookie
    // get code from query parameters
    // simpleOauthModule.create
    // get token with proper options (code, scope, redirect_url, ect)
    // get token and log or write to page
    break;
  default:
    console.log('live');
}
