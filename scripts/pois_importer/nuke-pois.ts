import axios from 'axios';
import dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env
dotenv.config({ path: path.resolve(__dirname, '../../.env') }); // Root
dotenv.config({ path: path.resolve(__dirname, '.env') });       // Local

const STRAPI_BASE_URL = process.env.STRAPI_BASE_URL || 'http://localhost:1337';
const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN;

async function nukeCollection(collection: string) {
  console.log(`\n💥 Nuking collection: ${collection.toUpperCase()}...`);
  
  const client = axios.create({
    baseURL: STRAPI_BASE_URL,
    headers: { Authorization: `Bearer ${STRAPI_API_TOKEN}` }
  });

  let totalDeleted = 0;
  let hasItems = true;

  while (hasItems) {
    // Get a batch of items
    // We use fields[0]=id to be light
    const res = await client.get(`/api/${collection}`, {
      params: {
        'pagination[pageSize]': 100,
        'fields[0]': 'documentId', // v5 uses documentId for delete
        'fields[1]': 'id'          // fallback
      }
    });

    const items = res.data.data;
    if (items.length === 0) {
      hasItems = false;
      break;
    }

    console.log(`   Found batch of ${items.length} items to delete...`);

    // Delete them one by one (Strapi doesn't have bulk delete endpoint by default)
    // We use Promise.all for speed
    await Promise.all(items.map(async (item: any) => {
      const idToDelete = item.documentId || item.id;
      try {
        await client.delete(`/api/${collection}/${idToDelete}`);
        process.stdout.write('x');
      } catch (e: any) {
        process.stdout.write('E');
      }
    }));
    
    totalDeleted += items.length;
    console.log(''); // New line
  }

  console.log(`✅ Deleted ${totalDeleted} items from ${collection}.`);
}

async function main() {
  console.log('☢️  NUKE POIS & MUSEUMS SCRIPT ☢️');
  console.log('This will DELETE ALL data in "museums" and "pois".');
  console.log('Waiting 3 seconds before start... (Ctrl+C to cancel)');
  
  await new Promise(resolve => setTimeout(resolve, 3000));

  try {
    await nukeCollection('museums');
    await nukeCollection('pois');
    console.log('\n✨ All clean! You can now run the import script.');
  } catch (e: any) {
    console.error('Error:', e.message);
  }
}

main();