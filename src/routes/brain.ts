import { Router, Response } from 'express';
import { SharedLink } from '../models/SharedLink';
import { Content } from '../models/Content';
import { Collection } from '../models/Collection';
import { User } from '../models/User';
import { authMiddleware } from '../middleware/auth';
import { generateRandomHash } from '../middleware/rateLimit';
import { AppError } from '../middleware/errorHandler';
import { AuthRequest } from '../types/index';

const router = Router();

// POST /brain/share - Create shared link
router.post('/share', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      throw new AppError(401, 'User not authenticated');
    }

    const { permissions = 'view-only', expiresAt } = req.body;

    // Check if user already has a share link
    let sharedLink = await SharedLink.findOne({ userId: req.user.userId });

    if (!sharedLink) {
      const hash = generateRandomHash(16);
      sharedLink = new SharedLink({
        hash,
        userId: req.user.userId,
        permissions,
        expiresAt,
      });
    } else {
      sharedLink.permissions = permissions;
      sharedLink.expiresAt = expiresAt;
    }

    await sharedLink.save();

    return res.status(201).json({
      success: true,
      message: 'Share link created successfully',
      statusCode: 201,
      data: {
        shareLink: {
          hash: sharedLink.hash,
          url: `${process.env.APP_URL}/brain/${sharedLink.hash}`,
          permissions: sharedLink.permissions,
          expiresAt: sharedLink.expiresAt,
        },
      },
    });
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
        statusCode: error.statusCode,
      });
    }
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      statusCode: 500,
    });
  }
});

// GET /brain/share - Get current user's share link
router.get('/share', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      throw new AppError(401, 'User not authenticated');
    }

    const sharedLink = await SharedLink.findOne({ userId: req.user.userId });

    if (!sharedLink) {
      throw new AppError(404, 'No share link found');
    }

    return res.status(200).json({
      success: true,
      message: 'Share link retrieved successfully',
      statusCode: 200,
      data: {
        shareLink: {
          hash: sharedLink.hash,
          url: `${process.env.APP_URL}/brain/${sharedLink.hash}`,
          permissions: sharedLink.permissions,
          expiresAt: sharedLink.expiresAt,
        },
      },
    });
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
        statusCode: error.statusCode,
      });
    }
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      statusCode: 500,
    });
  }
});

// DELETE /brain/share - Delete share link
router.delete('/share', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      throw new AppError(401, 'User not authenticated');
    }

    await SharedLink.deleteOne({ userId: req.user.userId });

    return res.status(200).json({
      success: true,
      message: 'Share link deleted successfully',
      statusCode: 200,
    });
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
        statusCode: error.statusCode,
      });
    }
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      statusCode: 500,
    });
  }
});

// GET /brain/:hash - Get shared brain content (public endpoint)
router.get('/:hash', async (req: AuthRequest, res: Response) => {
  try {
    const { hash } = req.params;

    const sharedLink = await SharedLink.findOne({ hash }).populate('userId');

    if (!sharedLink) {
      throw new AppError(404, 'Share link not found');
    }

    // Check if expired
    if (sharedLink.expiresAt && new Date() > sharedLink.expiresAt) {
      throw new AppError(410, 'Share link has expired');
    }

    const userId = (sharedLink.userId as any)._id;

    // Get all user's content
    const contents = await Content.find({ userId });

    // Get all user's collections
    const collections = await Collection.find({ userId }).populate('contentIds');

    // Get user info
    const user = await User.findById(userId).select('-password');

    return res.status(200).json({
      success: true,
      message: 'Shared content retrieved successfully',
      statusCode: 200,
      data: {
        user: {
          id: user?._id,
          username: user?.username,
        },
        contents,
        collections,
        permissions: sharedLink.permissions,
      },
    });
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
        statusCode: error.statusCode,
      });
    }
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      statusCode: 500,
    });
  }
});

export default router;
