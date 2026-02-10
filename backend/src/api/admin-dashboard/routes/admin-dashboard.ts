const route = (method: string, path: string, handler: string) => ({
  method,
  path: `/admin-dashboard${path}`,
  handler: `admin-dashboard.${handler}`,
  config: { policies: [], middlewares: [] },
});

export default {
  routes: [
    route('GET', '/check', 'check'),
    route('GET', '/overview', 'getOverview'),
    route('GET', '/players', 'getPlayers'),
    route('GET', '/players/:id', 'getPlayerDetail'),
    route('PUT', '/players/:id/toggle-block', 'toggleBlockPlayer'),
    route('PUT', '/players/:id/role', 'changePlayerRole'),
    route('GET', '/map', 'getMapData'),
    route('GET', '/economy', 'getEconomy'),
    route('GET', '/expeditions', 'getExpeditions'),
    route('GET', '/quiz', 'getQuizAnalytics'),
    route('GET', '/social', 'getSocialStats'),
  ],
};
