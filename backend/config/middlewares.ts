export default [
  'strapi::logger',
  'strapi::errors',
  {
    name: 'strapi::security',
    config: {
      contentSecurityPolicy: {
        useDefaults: true,
        directives: {
          'connect-src': ["'self'", 'https:', 'http:'],
          'script-src': ["'self'", "'unsafe-inline'", 'cdn.jsdelivr.net', 'unpkg.com'],
          'media-src': [
            "'self'",
            'data:',
            'blob:',
            'market-assets.strapi.io',
            'tile.openstreetmap.org',
            '*.tile.openstreetmap.org',
            'basemaps.cartocdn.com',
          ],
          'img-src': [
            "'self'",
            'data:',
            'blob:',
            'market-assets.strapi.io',
            'strapi.io',
            'tile.openstreetmap.org',
            '*.tile.openstreetmap.org',
            'basemaps.cartocdn.com',
            'unpkg.com',
          ],
        },
      },
    },
  },
  'strapi::cors',
  'strapi::poweredBy',
  'strapi::query',
  'strapi::body',
  'strapi::session',
  'strapi::favicon',
  'strapi::public',
];
