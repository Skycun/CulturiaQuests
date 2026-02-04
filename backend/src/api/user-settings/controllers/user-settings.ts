/**
 * user-settings controller
 * Handles user profile settings including avatar upload
 */
import type { Core } from '@strapi/strapi';
import sharp from 'sharp';
import path from 'path';
import crypto from 'crypto';

// Maximum file size in bytes (4MB)
const MAX_FILE_SIZE = 4 * 1024 * 1024;
// Allowed MIME types
const ALLOWED_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
// Avatar dimensions
const AVATAR_SIZE = 256;
const AVATAR_THUMBNAIL_SIZE = 64;

export default {
  /**
   * Upload or update user avatar
   * Accepts multipart form data with 'avatar' field
   * Creates resized versions and stores in media library
   */
  async uploadAvatar(ctx) {
    const user = ctx.state.user;
    if (!user) {
      return ctx.unauthorized('You must be logged in');
    }

    // Get uploaded file from request
    const { files } = ctx.request;
    if (!files || !files.avatar) {
      return ctx.badRequest('No avatar file provided');
    }

    const uploadedFile = Array.isArray(files.avatar) ? files.avatar[0] : files.avatar;

    // Validate file size
    if (uploadedFile.size > MAX_FILE_SIZE) {
      return ctx.badRequest(`File size exceeds maximum of ${MAX_FILE_SIZE / 1024 / 1024}MB`);
    }

    // Validate MIME type
    if (!ALLOWED_MIME_TYPES.includes(uploadedFile.type)) {
      return ctx.badRequest(`Invalid file type. Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}`);
    }

    try {
      const strapi = (global as any).strapi as Core.Strapi;

      // Generate unique filename
      const uniqueId = crypto.randomBytes(8).toString('hex');
      const baseName = `avatar_${user.id}_${uniqueId}`;

      // Read the uploaded file
      const fs = await import('fs/promises');
      const fileBuffer = await fs.readFile(uploadedFile.path);

      // Create resized avatar (main version)
      const avatarBuffer = await sharp(fileBuffer)
        .resize(AVATAR_SIZE, AVATAR_SIZE, {
          fit: 'cover',
          position: 'center',
        })
        .webp({ quality: 85 })
        .toBuffer();

      // Create thumbnail version
      const thumbnailBuffer = await sharp(fileBuffer)
        .resize(AVATAR_THUMBNAIL_SIZE, AVATAR_THUMBNAIL_SIZE, {
          fit: 'cover',
          position: 'center',
        })
        .webp({ quality: 80 })
        .toBuffer();

      // Get or create 'avatars' folder in media library
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

      // Delete old avatar files if they exist
      const currentUser = await strapi.db.query('plugin::users-permissions.user').findOne({
        where: { id: user.id },
        populate: { avatar: true },
      });

      if (currentUser?.avatar) {
        try {
          // Delete main avatar file
          await strapi.plugin('upload').service('upload').remove(currentUser.avatar);
        } catch (err) {
          strapi.log.warn('Could not delete old avatar:', err);
        }
      }

      // Upload main avatar using Strapi's upload service
      const mainAvatarFile = {
        name: `${baseName}.webp`,
        type: 'image/webp',
        size: avatarBuffer.length,
        buffer: avatarBuffer,
      };

      const [uploadedAvatar] = await strapi.plugin('upload').service('upload').upload({
        data: {
          fileInfo: {
            name: mainAvatarFile.name,
            folder: avatarFolder.id,
          },
        },
        files: mainAvatarFile,
      });

      // Update user with new avatar
      await strapi.db.query('plugin::users-permissions.user').update({
        where: { id: user.id },
        data: { avatar: uploadedAvatar.id },
      });

      // Clean up temp file
      try {
        await fs.unlink(uploadedFile.path);
      } catch (err) {
        // Ignore cleanup errors
      }

      return ctx.send({
        data: {
          avatar: {
            id: uploadedAvatar.id,
            documentId: uploadedAvatar.documentId,
            url: uploadedAvatar.url,
            formats: uploadedAvatar.formats,
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
      const strapi = (global as any).strapi as Core.Strapi;

      // Get current user with avatar
      const currentUser = await strapi.db.query('plugin::users-permissions.user').findOne({
        where: { id: user.id },
        populate: { avatar: true },
      });

      if (!currentUser?.avatar) {
        return ctx.badRequest('No avatar to remove');
      }

      // Delete avatar file
      try {
        await strapi.plugins.upload.services.upload.remove(currentUser.avatar);
      } catch (err) {
        strapi.log.warn('Could not delete avatar file:', err);
      }

      // Remove avatar reference from user
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
      const strapi = (global as any).strapi as Core.Strapi;

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
      const strapi = (global as any).strapi as Core.Strapi;

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
