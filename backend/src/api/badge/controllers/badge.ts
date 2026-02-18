/**
 * badge controller
 */

import { factories } from '@strapi/strapi'

export default factories.createCoreController('api::badge.badge', ({ strapi }) => ({
    async find(ctx) {
        const user = ctx.state.user;
        
        // 1. Fetch all badges standardly
        const sanitizedQuery = await this.sanitizeQuery(ctx);
        const allBadges = await strapi.documents('api::badge.badge').findMany({
             ...sanitizedQuery,
        });
        
        const sanitizedBadges = await this.sanitizeOutput(allBadges, ctx) as any[];

        if (!user) {
            return this.transformResponse(sanitizedBadges);
        }

        // 2. Get User's Guild and Badges
        // Find guild for user
        const guild = await strapi.db.query('api::guild.guild').findOne({
            where: { user: user.id },
            populate: ['unlocked_badges', 'equipped_badges']
        });
        
        if (!guild) {
             return this.transformResponse(sanitizedBadges);
        }

        const unlockedIds = guild.unlocked_badges?.map(b => b.documentId) || [];
        const equippedIds = guild.equipped_badges?.map(b => b.documentId) || [];

        // 3. Map status
        // sanitizedBadges should have documentId if it's Strapi 5 default sanitization
        const enrichedData = sanitizedBadges.map(badge => {
            const bId = badge.documentId;
            const isUnlocked = unlockedIds.includes(bId);
            const isEquipped = equippedIds.includes(bId);
            
            return {
                ...badge,
                unlocked: isUnlocked,
                equipped: isEquipped
            };
        });

        return this.transformResponse(enrichedData);
    },

    async equip(ctx) {
        const user = ctx.state.user;
        if (!user) return ctx.unauthorized();

        const { badges } = ctx.request.body; // Array of documentIds
        if (!Array.isArray(badges)) {
            return ctx.badRequest('badges must be an array of Document IDs');
        }

        if (badges.length > 4) {
            return ctx.badRequest('You can only equip up to 4 badges');
        }

        // 1. Get User's Guild
        const guild = await strapi.db.query('api::guild.guild').findOne({
            where: { user: user.id },
            populate: ['unlocked_badges']
        });
        
        if (!guild) return ctx.notFound('Guild not found for user');

        // 2. Validate Ownership
        const unlockedIds = guild.unlocked_badges?.map(b => b.documentId) || [];
        const allOwned = badges.every(id => unlockedIds.includes(id));

        if (!allOwned) {
            return ctx.badRequest('You do not own all these badges');
        }

        // 3. Update Guild
        // For documents API, we pass array of documentIds for relations
        await strapi.documents('api::guild.guild').update({
            documentId: guild.documentId,
            data: {
                equipped_badges: badges
            }
        });

        return { ok: true, equipped: badges };
    }
}));
