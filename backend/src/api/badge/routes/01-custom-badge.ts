export default {
  routes: [
    {
      method: 'PUT',
      path: '/badges/equip', // Short alias or /guild/badges/equip? Plan said /badges/equip in one place, verify.
      // "Endpoint personnalisé (ex: PUT /api/badges/equip)"
      handler: 'badge.equip',
    }
  ]
}
