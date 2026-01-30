import { factories } from '@strapi/strapi';

const MAX_PENDING_REQUESTS = 20;

export default factories.createCoreController('api::player-friendship.player-friendship', ({ strapi }) => ({
  /**
   * Find all player friendships (sent and received) for the authenticated user
   */
  async find(ctx) {
    const user = ctx.state.user;
    if (!user) {
      return ctx.unauthorized('You must be logged in');
    }

    // Get user's guild
    const guild = await strapi.db.query('api::guild.guild').findOne({
      where: { user: { id: user.id } },
      select: ['documentId'],
    });

    if (!guild) {
      return ctx.notFound('Guild not found');
    }

    // Find all friendships where user is requester or receiver
    const friendships = await strapi.db.query('api::player-friendship.player-friendship').findMany({
      where: {
        $or: [
          { requester: { documentId: guild.documentId } },
          { receiver: { documentId: guild.documentId } },
        ],
      },
      populate: {
        requester: {
          select: ['documentId', 'name', 'exp'],
          populate: {
            user: {
              select: ['username'],
            },
          },
        },
        receiver: {
          select: ['documentId', 'name', 'exp'],
          populate: {
            user: {
              select: ['username'],
            },
          },
        },
      },
    });

    return ctx.send({ data: friendships, myGuildDocumentId: guild.documentId });
  },

  /**
   * Search for a user by exact username
   */
  async searchUser(ctx) {
    const user = ctx.state.user;
    if (!user) {
      return ctx.unauthorized('You must be logged in');
    }

    const { username } = ctx.query;
    if (!username || typeof username !== 'string') {
      return ctx.badRequest('Username is required');
    }

    // Find user by exact username
    const targetUser = await strapi.db.query('plugin::users-permissions.user').findOne({
      where: { username },
      select: ['id', 'username', 'friend_requests_enabled'],
      populate: {
        guild: {
          select: ['documentId', 'name', 'exp'],
        },
      },
    });

    if (!targetUser) {
      return ctx.send({ data: null, message: 'User not found' });
    }

    // Check if target user accepts friend requests
    if (targetUser.friend_requests_enabled === false) {
      return ctx.send({ data: null, message: 'This user does not accept friend requests' });
    }

    // Don't allow searching for yourself
    if (targetUser.id === user.id) {
      return ctx.send({ data: null, message: 'You cannot add yourself as a friend' });
    }

    if (!targetUser.guild) {
      return ctx.send({ data: null, message: 'User has no guild' });
    }

    // Return public info only
    return ctx.send({
      data: {
        username: targetUser.username,
        guildName: targetUser.guild.name,
        guildDocumentId: targetUser.guild.documentId,
        guildLevel: Math.floor(Math.sqrt(Number(targetUser.guild.exp || 0) / 75)) + 1,
      },
    });
  },

  /**
   * Send a friend request
   */
  async sendRequest(ctx) {
    const user = ctx.state.user;
    if (!user) {
      return ctx.unauthorized('You must be logged in');
    }

    const { receiverGuildDocumentId } = ctx.request.body;
    if (!receiverGuildDocumentId) {
      return ctx.badRequest('receiverGuildDocumentId is required');
    }

    // Get user's guild
    const myGuild = await strapi.db.query('api::guild.guild').findOne({
      where: { user: { id: user.id } },
      select: ['documentId'],
    });

    if (!myGuild) {
      return ctx.notFound('Your guild not found');
    }

    // Cannot add yourself
    if (myGuild.documentId === receiverGuildDocumentId) {
      return ctx.badRequest('You cannot send a friend request to yourself');
    }

    // Check if receiver guild exists and get its user
    const receiverGuild = await strapi.db.query('api::guild.guild').findOne({
      where: { documentId: receiverGuildDocumentId },
      populate: {
        user: {
          select: ['id', 'friend_requests_enabled'],
        },
      },
    });

    if (!receiverGuild) {
      return ctx.notFound('Receiver guild not found');
    }

    // Check if receiver accepts friend requests
    if (receiverGuild.user?.friend_requests_enabled === false) {
      return ctx.badRequest('This user does not accept friend requests');
    }

    // Check for existing relation
    const existingRelation = await strapi.service('api::player-friendship.player-friendship').findExistingRelation(
      myGuild.documentId,
      receiverGuildDocumentId
    );

    if (existingRelation) {
      if (existingRelation.status === 'accepted') {
        return ctx.badRequest('You are already friends with this user');
      }
      if (existingRelation.status === 'pending') {
        return ctx.badRequest('A friend request already exists between you and this user');
      }
      if (existingRelation.status === 'rejected') {
        // Allow resending if previously rejected - update existing
        const updated = await strapi.documents('api::player-friendship.player-friendship').update({
          documentId: existingRelation.documentId,
          data: {
            status: 'pending',
            requester: myGuild.documentId,
            receiver: receiverGuildDocumentId,
          },
        });
        return ctx.send({ data: updated, message: 'Friend request sent' });
      }
    }

    // Check pending requests limit
    const pendingCount = await strapi.service('api::player-friendship.player-friendship').countPendingRequests(myGuild.documentId);
    if (pendingCount >= MAX_PENDING_REQUESTS) {
      return ctx.badRequest(`You have reached the maximum of ${MAX_PENDING_REQUESTS} pending friend requests`);
    }

    // Create friend request
    const newFriendship = await strapi.documents('api::player-friendship.player-friendship').create({
      data: {
        status: 'pending',
        requester: myGuild.documentId,
        receiver: receiverGuildDocumentId,
        publishedAt: new Date(),
      },
    });

    return ctx.send({ data: newFriendship, message: 'Friend request sent' });
  },

  /**
   * Accept a friend request
   */
  async acceptRequest(ctx) {
    const user = ctx.state.user;
    if (!user) {
      return ctx.unauthorized('You must be logged in');
    }

    const { id } = ctx.params;
    if (!id) {
      return ctx.badRequest('Friendship ID is required');
    }

    // Get user's guild
    const myGuild = await strapi.db.query('api::guild.guild').findOne({
      where: { user: { id: user.id } },
      select: ['documentId'],
    });

    if (!myGuild) {
      return ctx.notFound('Your guild not found');
    }

    // Find the friendship
    const friendship = await strapi.db.query('api::player-friendship.player-friendship').findOne({
      where: { documentId: id },
      populate: {
        receiver: { select: ['documentId'] },
      },
    });

    if (!friendship) {
      return ctx.notFound('Friend request not found');
    }

    // Only receiver can accept
    if (friendship.receiver?.documentId !== myGuild.documentId) {
      return ctx.forbidden('You can only accept requests sent to you');
    }

    if (friendship.status !== 'pending') {
      return ctx.badRequest('This request is no longer pending');
    }

    // Accept the request
    const updated = await strapi.documents('api::player-friendship.player-friendship').update({
      documentId: id,
      data: { status: 'accepted' },
    });

    return ctx.send({ data: updated, message: 'Friend request accepted' });
  },

  /**
   * Reject a friend request
   */
  async rejectRequest(ctx) {
    const user = ctx.state.user;
    if (!user) {
      return ctx.unauthorized('You must be logged in');
    }

    const { id } = ctx.params;
    if (!id) {
      return ctx.badRequest('Friendship ID is required');
    }

    // Get user's guild
    const myGuild = await strapi.db.query('api::guild.guild').findOne({
      where: { user: { id: user.id } },
      select: ['documentId'],
    });

    if (!myGuild) {
      return ctx.notFound('Your guild not found');
    }

    // Find the friendship
    const friendship = await strapi.db.query('api::player-friendship.player-friendship').findOne({
      where: { documentId: id },
      populate: {
        receiver: { select: ['documentId'] },
      },
    });

    if (!friendship) {
      return ctx.notFound('Friend request not found');
    }

    // Only receiver can reject
    if (friendship.receiver?.documentId !== myGuild.documentId) {
      return ctx.forbidden('You can only reject requests sent to you');
    }

    if (friendship.status !== 'pending') {
      return ctx.badRequest('This request is no longer pending');
    }

    // Reject the request
    const updated = await strapi.documents('api::player-friendship.player-friendship').update({
      documentId: id,
      data: { status: 'rejected' },
    });

    return ctx.send({ data: updated, message: 'Friend request rejected' });
  },

  /**
   * Remove a friend or cancel a pending request
   */
  async removeFriend(ctx) {
    const user = ctx.state.user;
    if (!user) {
      return ctx.unauthorized('You must be logged in');
    }

    const { id } = ctx.params;
    if (!id) {
      return ctx.badRequest('Friendship ID is required');
    }

    // Get user's guild
    const myGuild = await strapi.db.query('api::guild.guild').findOne({
      where: { user: { id: user.id } },
      select: ['documentId'],
    });

    if (!myGuild) {
      return ctx.notFound('Your guild not found');
    }

    // Find the friendship
    const friendship = await strapi.db.query('api::player-friendship.player-friendship').findOne({
      where: { documentId: id },
      populate: {
        requester: { select: ['documentId'] },
        receiver: { select: ['documentId'] },
      },
    });

    if (!friendship) {
      return ctx.notFound('Friendship not found');
    }

    // Only requester or receiver can remove
    const isRequester = friendship.requester?.documentId === myGuild.documentId;
    const isReceiver = friendship.receiver?.documentId === myGuild.documentId;

    if (!isRequester && !isReceiver) {
      return ctx.forbidden('You are not part of this friendship');
    }

    // Delete the friendship
    await strapi.documents('api::player-friendship.player-friendship').delete({
      documentId: id,
    });

    return ctx.send({ message: 'Friendship removed' });
  },

  /**
   * Toggle friend requests setting for the authenticated user
   */
  async toggleFriendRequests(ctx) {
    const user = ctx.state.user;
    if (!user) {
      return ctx.unauthorized('You must be logged in');
    }

    // Get current setting
    const currentUser = await strapi.db.query('plugin::users-permissions.user').findOne({
      where: { id: user.id },
      select: ['documentId', 'friend_requests_enabled'],
    });

    const newValue = !currentUser.friend_requests_enabled;

    // Update user setting
    await strapi.db.query('plugin::users-permissions.user').update({
      where: { id: user.id },
      data: { friend_requests_enabled: newValue },
    });

    return ctx.send({
      data: { friend_requests_enabled: newValue },
      message: newValue ? 'Friend requests enabled' : 'Friend requests disabled',
    });
  },
}));
