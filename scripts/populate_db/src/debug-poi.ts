import 'dotenv/config';
import { StrapiClient } from './strapi-client.js';
import type { MuseumAttributes } from './types.js';

async function main() {
  const baseUrl = process.env.STRAPI_BASE_URL || 'http://localhost:1337';
  const apiToken = process.env.STRAPI_API_TOKEN;

  if (!apiToken) {
    console.error('Missing STRAPI_API_TOKEN');
    process.exit(1);
  }

  const client = new StrapiClient({ baseUrl, apiToken });

  try {
    console.log('Fetching museum "Pole Horse De Saint-Lô"...');
    // Using explicit populate parameter which Strapi expects
    const response = await client.find<MuseumAttributes>('museums', {
      'filters[name][$contains]': 'Pole Horse',
      'populate': '*'
    });

    if (response.data.length === 0) {
      console.log('No museums found.');
    } else {
      const museum = response.data[0];
      console.log('Found:', JSON.stringify(museum, null, 2));
    }
    
  } catch (error) {
    console.error('Error fetching data:', error);
  }
}

main();
