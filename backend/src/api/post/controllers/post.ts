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

    // 1. Récupérer la guilde de l'utilisateur courant
    const myGuild: any = await strapi.db.query('api::guild.guild').findOne({
        where: { user: { id: user.id } },
        select: ['documentId'],
    });

    // Initialiser la liste avec soi-même
    const friendUserDocIds: string[] = user.documentId ? [user.documentId] : [];
    const friendUserNumericIds: number[] = [user.id];

    if (myGuild) {
        // 2. Trouver toutes les amitiés acceptées impliquant la guilde courante
        const acceptedFriendships: any[] = await strapi.db.query('api::player-friendship.player-friendship').findMany({
            where: {
                status: 'accepted',
                $or: [
                    { requester: { documentId: myGuild.documentId } },
                    { receiver: { documentId: myGuild.documentId } },
                ],
            },
            populate: {
                requester: {
                    select: ['documentId'],
                    populate: { user: { select: ['id', 'documentId'] } },
                },
                receiver: {
                    select: ['documentId'],
                    populate: { user: { select: ['id', 'documentId'] } },
                },
            },
        });

        // 3. Extraire les IDs utilisateur des guildes amies
        for (const friendship of acceptedFriendships) {
            const friendGuild = friendship.requester?.documentId === myGuild.documentId
                ? friendship.receiver
                : friendship.requester;

            const friendUser = friendGuild?.user;
            if (friendUser?.documentId) friendUserDocIds.push(friendUser.documentId);
            if (friendUser?.id) friendUserNumericIds.push(friendUser.id);
        }
    }

    // 4. Récupérer les posts du cercle social (Soi-même + Amis)
    const allPosts = await strapi.documents('api::post.post').findMany({
        filters: {
            author: {
                $or: [
                    { documentId: { $in: friendUserDocIds } },
                    { id: { $in: friendUserNumericIds } }
                ]
            }
        },
        sort: 'createdAt:desc',
        limit: 50,
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
