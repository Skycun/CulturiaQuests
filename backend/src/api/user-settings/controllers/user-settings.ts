/**
 * user-settings controller
 * Handles user profile settings including avatar upload with resize
 */
import sharp from 'sharp';
import path from 'path';
import crypto from 'crypto';

const MAX_FILE_SIZE = 4 * 1024 * 1024;
const ALLOWED_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
const AVATAR_SIZE = 256;
const AVATAR_THUMBNAIL_SIZE = 64;

export default {
  /**
   * Receive a fileId (already uploaded via /api/upload),
   * resize to 256x256 WebP, store in avatars folder, and associate to user.
   */
  async uploadAvatar(ctx) {
    const user = ctx.state.user;
    if (!user) {
      return ctx.unauthorized('You must be logged in');
    }

    const { fileId } = ctx.request.body;
    if (!fileId) {
      return ctx.badRequest('fileId is required');
    }

    try {
      // Récupérer les infos du fichier uploadé
      const fileInfo = await strapi.db.query('plugin::upload.file').findOne({
        where: { id: fileId },
      });

      if (!fileInfo) {
        return ctx.notFound('Uploaded file not found');
      }

      // Valider le type MIME
      if (!ALLOWED_MIME_TYPES.includes(fileInfo.mime)) {
        await strapi.plugin('upload').service('upload').remove(fileInfo);
        return ctx.badRequest(`Invalid file type. Allowed: ${ALLOWED_MIME_TYPES.join(', ')}`);
      }

      // Valider la taille
      if (fileInfo.size > MAX_FILE_SIZE) {
        await strapi.plugin('upload').service('upload').remove(fileInfo);
        return ctx.badRequest('File size exceeds 4MB');
      }

      // Lire le fichier depuis le disque
      const fs = await import('fs/promises');
      const filePath = path.join(process.cwd(), 'public', fileInfo.url);
      const fileBuffer = await fs.readFile(filePath);

      // Redimensionner en 256x256 WebP
      const avatarBuffer = await sharp(fileBuffer)
        .resize(AVATAR_SIZE, AVATAR_SIZE, { fit: 'cover', position: 'center' })
        .webp({ quality: 85 })
        .toBuffer();

      // Supprimer le fichier original uploadé
      await strapi.plugin('upload').service('upload').remove(fileInfo);

      // Créer ou récupérer le dossier 'avatars'
      let avatarFolder = await strapi.db.query('plugin::upload.folder').findOne({
        where: { name: 'avatars' },
      });

      if (!avatarFolder) {
        avatarFolder = await strapi.db.query('plugin::upload.folder').create({
          data: {
            name: 'avatars',
            pathId: crypto.randomBytes(8).toString('hex'),
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

      // Uploader la version redimensionnée via le service upload
      const uniqueId = crypto.randomBytes(8).toString('hex');
      const fileName = `avatar_${user.id}_${uniqueId}.webp`;

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
          buffer: avatarBuffer,
        },
      });

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
