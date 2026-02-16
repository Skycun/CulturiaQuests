import axios from 'axios';

async function inspect() {
  const url = 'https://etalab-datasets.geo.data.gouv.fr/contours-administratifs/2024/geojson/epci-100m.geojson';
  console.log('Downloading header of GeoJSON...');
  const { data } = await axios.get(url);
  
  if (data.features && data.features.length > 0) {
    console.log('--- PROPERTIES OF FIRST FEATURE ---');
    console.log(JSON.stringify(data.features[0].properties, null, 2));
  } else {
    console.log('No features found');
  }
}

inspect();
