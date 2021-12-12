import Client from '../types/index'

const requestSigner = (url: string, requestOptions: RequestInit) => {
  const signed: Record<string, string> = {
    'Authorization': 'AWS AKI...1g=' + url,
  }

  Object.keys(signed).forEach((key: string) => {
    (requestOptions.headers as Headers).set(key, signed[key]);
  });
}

const client = new Client({
  baseUrl: 'http;//foo.com',
  requestSigner
})

client.read({ resourceType: 'Patient', id: '12', options: { headers: { 'x-header-a': 'bar'} } })

