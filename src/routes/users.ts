import { Router, Response } from 'express';
import { User } from '../models/User';
import { UserProfile } from '../models/UserProfile';
import { Content } from '../models/Content';
import { authMiddleware } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { AuthRequest } from '../types/index';

const router = Router();

// GET /users/:id - Get user profile
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) {
      throw new AppError(404, 'User not found');
    }

    const userProfile = await UserProfile.findOne({ userId: req.params.id }).populate([
      { path: 'followers', select: '-password' },
      { path: 'following', select: '-password' },
    ]);

    const contentCount = await Content.countDocuments({ userId: req.params.id });

    return res.status(200).json({
      success: true,
      message: 'User profile retrieved successfully',
      statusCode: 200,
      data: {
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
        },
        profile: {
          bio: userProfile?.bio,
          avatar: userProfile?.avatar,
          followers: userProfile?.followers || [],
          following: userProfile?.following || [],
          contentCount,
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

// PATCH /users/:id - Update user profile
router.patch('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      throw new AppError(401, 'User not authenticated');
    }

    // Only allow updating own profile
    if (req.user.userId !== req.params.id) {
      throw new AppError(403, 'Not authorized to update this profile');
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      throw new AppError(404, 'User not found');
    }

    const { email, bio, avatar } = req.body;

    if (email) user.email = email;
    await user.save();

    let userProfile = await UserProfile.findOne({ userId: req.params.id });
    if (!userProfile) {
      userProfile = new UserProfile({ userId: req.params.id });
    }

    if (bio) userProfile.bio = bio;
    if (avatar) userProfile.avatar = avatar;
    await userProfile.save();

    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      statusCode: 200,
      data: {
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
        },
        profile: {
          bio: userProfile.bio,
          avatar: userProfile.avatar,
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

// POST /users/:id/follow - Follow user
router.post('/:id/follow', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      throw new AppError(401, 'User not authenticated');
    }

    // Can't follow yourself
    if (req.user.userId === req.params.id) {
      throw new AppError(400, 'Cannot follow yourself');
    }

    const targetUser = await User.findById(req.params.id);
    if (!targetUser) {
      throw new AppError(404, 'User not found');
    }

    // Update follower's following list
    let followerProfile = await UserProfile.findOne({ userId: req.user.userId });
    if (!followerProfile) {
      followerProfile = new UserProfile({ userId: req.user.userId });
    }

    if (!followerProfile.following.includes(req.params.id as any)) {
      followerProfile.following.push(req.params.id as any);
      await followerProfile.save();
    }

    // Update target user's followers list
    let targetProfile = await UserProfile.findOne({ userId: req.params.id });
    if (!targetProfile) {
      targetProfile = new UserProfile({ userId: req.params.id });
    }

    if (!targetProfile.followers.includes(req.user.userId as any)) {
      targetProfile.followers.push(req.user.userId as any);
      await targetProfile.save();
    }

    return res.status(200).json({
      success: true,
      message: 'User followed successfully',
      statusCode: 200,
      data: {
        following: followerProfile.following,
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

// DELETE /users/:id/follow - Unfollow user
router.delete('/:id/follow', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      throw new AppError(401, 'User not authenticated');
    }

    const targetUser = await User.findById(req.params.id);
    if (!targetUser) {
      throw new AppError(404, 'User not found');
    }

    // Update follower's following list
    const followerProfile = await UserProfile.findOne({ userId: req.user.userId });
    if (followerProfile) {
      followerProfile.following = followerProfile.following.filter(
        (id: any) => id.toString() !== req.params.id
      );
      await followerProfile.save();
    }

    // Update target user's followers list
    const targetProfile = await UserProfile.findOne({ userId: req.params.id });
    if (targetProfile && req.user) {
      targetProfile.followers = targetProfile.followers.filter(
        (id: any) => id.toString() !== req.user!.userId
      );
      await targetProfile.save();
    }

    return res.status(200).json({
      success: true,
      message: 'User unfollowed successfully',
      statusCode: 200,
      data: {
        following: followerProfile?.following || [],
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
