import { Router, Response } from 'express';
import { Collection } from '../models/Collection';
import { Content } from '../models/Content';
import { authMiddleware } from '../middleware/auth';
import { validateTitle } from '../middleware/validators';
import { AppError } from '../middleware/errorHandler';
import { AuthRequest } from '../types/index';

const router = Router();

// GET /collections - List all collections for user
router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      throw new AppError(401, 'User not authenticated');
    }

    const collections = await Collection.find({ userId: req.user.userId })
      .populate('contentIds')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      message: 'Collections retrieved successfully',
      statusCode: 200,
      data: { collections },
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

// POST /collections - Create new collection
router.post('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      throw new AppError(401, 'User not authenticated');
    }

    const { name, description } = req.body;

    if (!validateTitle(name)) {
      throw new AppError(400, 'Invalid collection name');
    }

    const collection = new Collection({
      userId: req.user.userId,
      name,
      description,
      contentIds: [],
    });

    await collection.save();

    return res.status(201).json({
      success: true,
      message: 'Collection created successfully',
      statusCode: 201,
      data: { collection },
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

// GET /collections/:id - Get specific collection
router.get('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      throw new AppError(401, 'User not authenticated');
    }

    const collection = await Collection.findOne({
      _id: req.params.id,
      userId: req.user.userId,
    }).populate('contentIds');

    if (!collection) {
      throw new AppError(404, 'Collection not found');
    }

    return res.status(200).json({
      success: true,
      message: 'Collection retrieved successfully',
      statusCode: 200,
      data: { collection },
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

// PATCH /collections/:id - Update collection
router.patch('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      throw new AppError(401, 'User not authenticated');
    }

    const collection = await Collection.findOne({
      _id: req.params.id,
      userId: req.user.userId,
    });

    if (!collection) {
      throw new AppError(404, 'Collection not found');
    }

    const { name, description } = req.body;

    if (name) {
      if (!validateTitle(name)) {
        throw new AppError(400, 'Invalid collection name');
      }
      collection.name = name;
    }

    if (description) collection.description = description;

    await collection.save();

    return res.status(200).json({
      success: true,
      message: 'Collection updated successfully',
      statusCode: 200,
      data: { collection },
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

// DELETE /collections/:id - Delete collection
router.delete('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      throw new AppError(401, 'User not authenticated');
    }

    const collection = await Collection.findOne({
      _id: req.params.id,
      userId: req.user.userId,
    });

    if (!collection) {
      throw new AppError(404, 'Collection not found');
    }

    await Collection.deleteOne({ _id: req.params.id });

    return res.status(200).json({
      success: true,
      message: 'Collection deleted successfully',
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

// POST /collections/:id/content - Add content to collection
router.post('/:id/content', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      throw new AppError(401, 'User not authenticated');
    }

    const { contentId } = req.body;

    if (!contentId) {
      throw new AppError(400, 'Content ID is required');
    }

    const collection = await Collection.findOne({
      _id: req.params.id,
      userId: req.user.userId,
    });

    if (!collection) {
      throw new AppError(404, 'Collection not found');
    }

    // Verify content belongs to user
    const content = await Content.findOne({
      _id: contentId,
      userId: req.user.userId,
    });

    if (!content) {
      throw new AppError(404, 'Content not found');
    }

    // Add content to collection if not already there
    if (!collection.contentIds.includes(contentId)) {
      collection.contentIds.push(contentId);
      await collection.save();
    }

    return res.status(200).json({
      success: true,
      message: 'Content added to collection successfully',
      statusCode: 200,
      data: { collection },
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

// DELETE /collections/:id/content/:contentId - Remove content from collection
router.delete('/:id/content/:contentId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      throw new AppError(401, 'User not authenticated');
    }

    const collection = await Collection.findOne({
      _id: req.params.id,
      userId: req.user.userId,
    });

    if (!collection) {
      throw new AppError(404, 'Collection not found');
    }

    // Remove content from collection
    collection.contentIds = collection.contentIds.filter((id: any) => id.toString() !== req.params.contentId);
    await collection.save();

    return res.status(200).json({
      success: true,
      message: 'Content removed from collection successfully',
      statusCode: 200,
      data: { collection },
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
