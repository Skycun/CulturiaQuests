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
        const sanitizedQuery = await this.sanitizeQuery(ctx);
        const results = await strapi.documents('api::post.post').findMany({
             ...sanitizedQuery,
             populate
        });
        const sanitized = await this.sanitizeOutput(results, ctx);
        return this.transformResponse(sanitized);
    }

    // 1. Récupérer l'utilisateur avec ses amis
    // On utilise query car entityService peut être capricieux sur le polymorphisme id/documentId
    const fullUser: any = await strapi.db.query('plugin::users-permissions.user').findOne({
        where: { id: user.id },
        populate: ['friends']
    });

    const friends = fullUser?.friends || [];
    
    // On collecte TOUS les identifiants possibles (id et documentId) pour être sûr
    const friendDocIds = friends.map(f => f.documentId).filter(Boolean);
    const friendNumericIds = friends.map(f => f.id).filter(Boolean);
    
    // On s'ajoute soi-même à la liste
    if (user.documentId) friendDocIds.push(user.documentId);
    friendNumericIds.push(user.id);

    // 2. Algorithme de tri (Priorité au dernier post de chaque ami sur les 7 derniers jours)
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    let priorityPosts = [];
    let excludeDocIds = [];

    // Boucle sur les amis pour prendre leur dernier post récent
    // Note: Dans un environnement réel avec 1000 amis, on optimiserait via une seule query groupée
    for (const fDocId of friendDocIds) {
        const posts = await strapi.documents('api::post.post').findMany({
            filters: {
                author: { documentId: fDocId },
                createdAt: { $gte: oneWeekAgo.toISOString() }
            },
            sort: 'createdAt:desc',
            limit: 1,
            populate
        });

        if (posts && posts.length > 0) {
            priorityPosts.push(posts[0]);
            excludeDocIds.push(posts[0].documentId);
        }
    }

    // 3. Remplissage jusqu'à 30 avec les posts restants des AMIS
    const remainingSlots = 30 - priorityPosts.length;
    let fillerPosts = [];

    if (remainingSlots > 0) {
        fillerPosts = await strapi.documents('api::post.post').findMany({
            filters: {
                author: { 
                    $or: [
                        { documentId: { $in: friendDocIds } },
                        { id: { $in: friendNumericIds } }
                    ]
                },
                documentId: { $notIn: excludeDocIds }
            },
            sort: 'createdAt:desc',
            limit: remainingSlots,
            populate
        });
        
        fillerPosts.forEach(p => excludeDocIds.push(p.documentId));
    }

    // 4. FALLBACK : Si on a toujours moins de 30 posts (ou si le feed est vide), 
    // on prend les derniers posts PUBLICS de n'importe qui pour ne pas avoir un écran vide
    const finalSlots = 30 - (priorityPosts.length + fillerPosts.length);
    let discoveryPosts = [];
    
    if (finalSlots > 0) {
        discoveryPosts = await strapi.documents('api::post.post').findMany({
            filters: {
                documentId: { $notIn: excludeDocIds }
            },
            sort: 'createdAt:desc',
            limit: finalSlots,
            populate
        });
    }

    let allPosts = [...priorityPosts, ...fillerPosts, ...discoveryPosts];
    
    // Tri final par date
    allPosts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // 5. Enrichissement (Likes & Protection Auteur)
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
