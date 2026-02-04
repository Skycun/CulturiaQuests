/**
 * user-settings controller
 * Handles user profile settings including avatar upload with resize
 */
import sharp from 'sharp';
import crypto from 'crypto';

const MAX_FILE_SIZE = 4 * 1024 * 1024;
const ALLOWED_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
const AVATAR_SIZE = 256;

export default {
  /**
   * Receive a base64-encoded image, resize to 256x256 WebP,
   * store in avatars folder, and associate to user.
   */
  async uploadAvatar(ctx) {
    const user = ctx.state.user;
    if (!user) {
      return ctx.unauthorized('You must be logged in');
    }

    const { base64, name, type } = ctx.request.body;
    if (!base64) {
      return ctx.badRequest('base64 is required');
    }

    // Valider le type MIME
    if (!ALLOWED_MIME_TYPES.includes(type)) {
      return ctx.badRequest(`Invalid file type. Allowed: ${ALLOWED_MIME_TYPES.join(', ')}`);
    }

    try {
      // Décoder le base64 (format: "data:image/png;base64,<données>")
      const base64Data = base64.replace(/^data:[^;]+;base64,/, '');
      const fileBuffer = Buffer.from(base64Data, 'base64');

      // Valider la taille du fichier décodé
      if (fileBuffer.length > MAX_FILE_SIZE) {
        return ctx.badRequest('File size exceeds 4MB');
      }

      // Redimensionner en 256x256 WebP
      const avatarBuffer = await sharp(fileBuffer)
        .resize(AVATAR_SIZE, AVATAR_SIZE, { fit: 'cover', position: 'center' })
        .webp({ quality: 85 })
        .toBuffer();

      // Créer ou récupérer le dossier 'avatars'
      let avatarFolder = await strapi.db.query('plugin::upload.folder').findOne({
        where: { name: 'avatars' },
      });

      if (!avatarFolder) {
        avatarFolder = await strapi.db.query('plugin::upload.folder').create({
          data: {
            name: 'avatars',
            pathId: Math.floor(Math.random() * 1000000),
            path: '/avatars',
          },
        });
      }

      // Supprimer l'ancien avatar de l'utilisateur si existant
      const currentUser = await strapi.db.query('plugin::users-permissions.user').findOne({
        where: { id: user.id },
        populate: { avatar: true },
      });

      if (currentUser?.avatar) {
        try {
          await strapi.plugin('upload').service('upload').remove(currentUser.avatar);
        } catch (err) {
          strapi.log.warn('Could not delete old avatar:', err);
        }
      }

      // Écrire le buffer dans un fichier temporaire (requis par le service upload Strapi)
      const fs = await import('fs/promises');
      const os = await import('os');
      const path = await import('path');
      const uniqueId = crypto.randomBytes(8).toString('hex');
      const fileName = `avatar_${user.id}_${uniqueId}.webp`;
      const tmpPath = path.join(os.tmpdir(), fileName);

      await fs.writeFile(tmpPath, avatarBuffer);

      const [newFile] = await strapi.plugin('upload').service('upload').upload({
        data: {
          fileInfo: {
            name: fileName,
            folder: avatarFolder.id,
          },
        },
        files: {
          name: fileName,
          type: 'image/webp',
          size: avatarBuffer.length,
          filepath: tmpPath,
        },
      });

      // Nettoyer le fichier temporaire
      await fs.unlink(tmpPath).catch(() => {});

      // Associer le nouveau fichier à l'utilisateur
      await strapi.db.query('plugin::users-permissions.user').update({
        where: { id: user.id },
        data: { avatar: newFile.id },
      });

      return ctx.send({
        data: {
          avatar: {
            id: newFile.id,
            documentId: newFile.documentId,
            url: newFile.url,
            formats: newFile.formats,
          },
        },
        message: 'Avatar uploaded successfully',
      });
    } catch (error) {
      strapi.log.error('Error uploading avatar:', error);
      return ctx.internalServerError('Failed to upload avatar');
    }
  },

  /**
   * Remove user avatar
   */
  async removeAvatar(ctx) {
    const user = ctx.state.user;
    if (!user) {
      return ctx.unauthorized('You must be logged in');
    }

    try {
      const currentUser = await strapi.db.query('plugin::users-permissions.user').findOne({
        where: { id: user.id },
        populate: { avatar: true },
      });

      if (!currentUser?.avatar) {
        return ctx.badRequest('No avatar to remove');
      }

      try {
        await strapi.plugin('upload').service('upload').remove(currentUser.avatar);
      } catch (err) {
        strapi.log.warn('Could not delete avatar file:', err);
      }

      await strapi.db.query('plugin::users-permissions.user').update({
        where: { id: user.id },
        data: { avatar: null },
      });

      return ctx.send({
        message: 'Avatar removed successfully',
      });
    } catch (error) {
      strapi.log.error('Error removing avatar:', error);
      return ctx.internalServerError('Failed to remove avatar');
    }
  },

  /**
   * Get current user settings (avatar, friend_requests_enabled)
   */
  async getSettings(ctx) {
    const user = ctx.state.user;
    if (!user) {
      return ctx.unauthorized('You must be logged in');
    }

    try {
      const currentUser = await strapi.db.query('plugin::users-permissions.user').findOne({
        where: { id: user.id },
        select: ['id', 'username', 'email', 'friend_requests_enabled'],
        populate: {
          avatar: {
            select: ['id', 'documentId', 'url', 'formats', 'width', 'height'],
          },
        },
      });

      return ctx.send({
        data: {
          username: currentUser.username,
          email: currentUser.email,
          friend_requests_enabled: currentUser.friend_requests_enabled,
          avatar: currentUser.avatar || null,
        },
      });
    } catch (error) {
      strapi.log.error('Error fetching user settings:', error);
      return ctx.internalServerError('Failed to fetch user settings');
    }
  },

  /**
   * Update user settings
   */
  async updateSettings(ctx) {
    const user = ctx.state.user;
    if (!user) {
      return ctx.unauthorized('You must be logged in');
    }

    const { friend_requests_enabled } = ctx.request.body;

    try {
      const updateData: Record<string, any> = {};

      if (typeof friend_requests_enabled === 'boolean') {
        updateData.friend_requests_enabled = friend_requests_enabled;
      }

      if (Object.keys(updateData).length === 0) {
        return ctx.badRequest('No valid settings to update');
      }

      await strapi.db.query('plugin::users-permissions.user').update({
        where: { id: user.id },
        data: updateData,
      });

      return ctx.send({
        data: updateData,
        message: 'Settings updated successfully',
      });
    } catch (error) {
      strapi.log.error('Error updating user settings:', error);
      return ctx.internalServerError('Failed to update user settings');
    }
  },
};
