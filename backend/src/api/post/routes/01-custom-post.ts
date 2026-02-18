export default {
  routes: [
    {
      method: 'POST',
      path: '/posts/:id/toggle-like',
      handler: 'post.toggleLike',
    }
  ]
}
