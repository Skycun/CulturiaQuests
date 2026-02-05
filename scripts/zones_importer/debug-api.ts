import axios from 'axios';

async function testApi() {
  const url = 'https://geo.api.gouv.fr/epcis?fields=code,nom,departement,codeDepartement,codesDepartements';
  console.log('Calling API:', url);
  try {
    const { data } = await axios.get(url);
    console.log('Response status:', 200);
    console.log('Data is array?', Array.isArray(data));
    console.log('Length:', data.length);
    if (data.length > 0) {
      console.log('First item:', JSON.stringify(data[0], null, 2));
    }
  } catch (e: any) {
    console.error('API Error:', e.message);
  }
}

testApi();
