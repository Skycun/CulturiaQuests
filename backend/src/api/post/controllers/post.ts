/**
 * post controller
 */

import { factories } from '@strapi/strapi'

export default factories.createCoreController('api::post.post', ({ strapi }) => ({
  async create(ctx) {
    const user = ctx.state.user;
    if (!user) {
      return ctx.unauthorized('You must be logged in to create a post');
    }

    const { body } = ctx.request;
    const data = body.data || {};

    const authorId = user.documentId || user.id;

    const post = await strapi.documents('api::post.post').create({
        data: {
            ...data,
            author: authorId
        }
    });
    
    const sanitized = await this.sanitizeOutput(post, ctx);
    return this.transformResponse(sanitized);
  },

  async find(ctx) {
    const user = ctx.state.user;
    
    // Configuration de base pour la population
    const populate: any = [
        'author', 
        'author.avatar', 
        'run_history', 
        'run_history.museum', 
        'run_history.museum.tags', 
        'likes', 
        'best_loot', 
        'best_loot.rarity', 
        'best_loot.icon'
    ];

    if (!user) {
        return this.transformResponse([]);
    }

    // 1. Récupérer l'utilisateur avec ses amis
    const fullUser: any = await strapi.db.query('plugin::users-permissions.user').findOne({
        where: { id: user.id },
        populate: ['friends']
    });

    const friends = fullUser?.friends || [];
    
    // On collecte TOUS les identifiants possibles (id et documentId) pour être sûr
    const friendDocIds = friends.map(f => f.documentId).filter(Boolean);
    const friendNumericIds = friends.map(f => f.id).filter(Boolean);
    
    // On s'ajoute soi-même à la liste pour voir nos propres posts
    if (user.documentId) friendDocIds.push(user.documentId);
    friendNumericIds.push(user.id);

    // 2. Récupérer les posts du cercle social uniquement (Soi-même + Amis)
    const allPosts = await strapi.documents('api::post.post').findMany({
        filters: {
            author: { 
                $or: [
                    { documentId: { $in: friendDocIds } },
                    { id: { $in: friendNumericIds } }
                ]
            }
        },
        sort: 'createdAt:desc',
        limit: 50, // On peut augmenter la limite car c'est filtré
        populate
    }) as any[];

    // 3. Enrichissement (Likes & Protection Auteur)
    const sanitized = await this.sanitizeOutput(allPosts, ctx) as any[];
    
    const enriched = sanitized.map((post, index) => {
        const rawPost = allPosts[index];
        const likes = rawPost.likes || [];
        const isLiked = likes.some(u => (u.documentId === user.documentId) || (u.id === user.id));
        
        // Strapi 5 sanitize peut parfois vider les relations sensibles, on ré-injecte l'auteur si besoin
        const authorData = post.author || rawPost.author || {};
        
        return {
            ...post,
            author: authorData,
            likes: likes.length,
            hasLiked: isLiked
        };
    });

    return this.transformResponse(enriched);
  },

  async toggleLike(ctx) {
      const user = ctx.state.user;
      if (!user) return ctx.unauthorized();
      
      const { id } = ctx.params;
      
      const post = await strapi.documents('api::post.post').findOne({
          documentId: id,
          populate: ['likes']
      });
      
      if (!post) return ctx.notFound();
      
      const likes = post.likes || [];
      const isLiked = likes.some(u => (u.documentId === user.documentId) || (u.id === user.id));
      
      let newLikes;
      const currentLikeIds = likes.map(u => u.documentId || u.id);
      const userKey = user.documentId || user.id;

      if (isLiked) {
          newLikes = currentLikeIds.filter(uid => uid !== userKey);
      } else {
          newLikes = [...currentLikeIds, userKey];
      }
      
      await strapi.documents('api::post.post').update({
          documentId: id,
          data: {
              likes: newLikes
          }
      });
      
      return {
          ok: true,
          liked: !isLiked,
          likes: newLikes.length
      };
  }
}));
