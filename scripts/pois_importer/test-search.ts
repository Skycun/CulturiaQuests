import 'dotenv/config';
import axios from 'axios';

const GOOGLE_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

async function searchPlace(query: string) {
  const url = `https://maps.googleapis.com/maps/api/place/textsearch/json`;
  const response = await axios.get(url, {
    params: {
      query: query,
      key: GOOGLE_API_KEY
    }
  });
  return response.data.results;
}

async function main() {
  // Rechercher le Monument des Fusillés
  console.log("=== Recherche: Monument des Fusillés Saint-Lô ===");
  const results1 = await searchPlace("Monument des Fusillés Saint-Lô");
  results1.forEach((r: any) => {
    console.log(`- ${r.name}`);
    console.log(`  Types: ${r.types?.join(', ')}`);
  });

  // Rechercher les monuments de Saint-Lô
  console.log("\n=== Recherche: monuments Saint-Lô ===");
  const results2 = await searchPlace("monuments historiques Saint-Lô");
  results2.slice(0, 10).forEach((r: any) => {
    console.log(`- ${r.name}`);
    console.log(`  Types: ${r.types?.join(', ')}`);
  });

  // Rechercher les églises
  console.log("\n=== Recherche: églises Saint-Lô ===");
  const results3 = await searchPlace("église Saint-Lô");
  results3.slice(0, 5).forEach((r: any) => {
    console.log(`- ${r.name}`);
    console.log(`  Types: ${r.types?.join(', ')}`);
  });

  // Rechercher avec tourist_attraction
  console.log("\n=== Nearby Search: tourist_attraction ===");
  const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json`;
  const response = await axios.get(url, {
    params: {
      location: '49.1154063,-1.0825895',
      radius: 5000,
      type: 'tourist_attraction',
      key: GOOGLE_API_KEY
    }
  });
  response.data.results.slice(0, 15).forEach((r: any) => {
    console.log(`- ${r.name}`);
    console.log(`  Types: ${r.types?.join(', ')}`);
  });
}

main();
