import { Router, Response } from 'express';
import multer from 'multer';
import { Content } from '../models/Content';
import { authMiddleware } from '../middleware/auth';
import { validateTitle, validateUrl, validateContentType } from '../middleware/validators';
import { uploadToCloudinary, deleteFromCloudinary } from '../utils/cloudinary';
import { AppError } from '../middleware/errorHandler';
import { AuthRequest } from '../types/index';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

// GET /content - List all content for user
router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      throw new AppError(401, 'User not authenticated');
    }

    const { page = 1, limit = 10, type, tag } = req.query;
    const skip = ((Number(page) || 1) - 1) * (Number(limit) || 10);

    const filter: any = { userId: req.user.userId };
    if (type) filter.type = type;
    if (tag) filter.tags = { $in: [tag] };

    const contents = await Content.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit) || 10);

    const total = await Content.countDocuments(filter);

    return res.status(200).json({
      success: true,
      message: 'Contents retrieved successfully',
      statusCode: 200,
      data: {
        contents,
        pagination: {
          page: Number(page) || 1,
          limit: Number(limit) || 10,
          total,
          totalPages: Math.ceil(total / (Number(limit) || 10)),
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

// POST /content - Create new content
router.post('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      throw new AppError(401, 'User not authenticated');
    }

    const { type, title, description, contentUrl, tags = [], collectionIds = [] } = req.body;

    // Validation
    if (!validateContentType(type)) {
      throw new AppError(400, 'Invalid content type');
    }

    if (!validateTitle(title)) {
      throw new AppError(400, 'Invalid title');
    }

    if (!validateUrl(contentUrl)) {
      throw new AppError(400, 'Invalid content URL');
    }

    const content = new Content({
      userId: req.user.userId,
      type,
      title,
      description,
      contentUrl,
      tags,
      collectionIds,
    });

    await content.save();

    return res.status(201).json({
      success: true,
      message: 'Content created successfully',
      statusCode: 201,
      data: { content },
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

// GET /content/:id - Get specific content
router.get('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      throw new AppError(401, 'User not authenticated');
    }

    const content = await Content.findOne({
      _id: req.params.id,
      userId: req.user.userId,
    });

    if (!content) {
      throw new AppError(404, 'Content not found');
    }

    return res.status(200).json({
      success: true,
      message: 'Content retrieved successfully',
      statusCode: 200,
      data: { content },
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

// PATCH /content/:id - Update content
router.patch('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      throw new AppError(401, 'User not authenticated');
    }

    const content = await Content.findOne({
      _id: req.params.id,
      userId: req.user.userId,
    });

    if (!content) {
      throw new AppError(404, 'Content not found');
    }

    const { title, description, tags, collectionIds } = req.body;

    if (title) {
      if (!validateTitle(title)) {
        throw new AppError(400, 'Invalid title');
      }
      content.title = title;
    }

    if (description) content.description = description;
    if (tags) content.tags = tags;
    if (collectionIds) content.collectionIds = collectionIds;

    await content.save();

    return res.status(200).json({
      success: true,
      message: 'Content updated successfully',
      statusCode: 200,
      data: { content },
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

// DELETE /content/:id - Delete content
router.delete('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      throw new AppError(401, 'User not authenticated');
    }

    const content = await Content.findOne({
      _id: req.params.id,
      userId: req.user.userId,
    });

    if (!content) {
      throw new AppError(404, 'Content not found');
    }

    // Delete from Cloudinary if it's a file
    if (content.metadata?.cloudinaryId) {
      try {
        await deleteFromCloudinary(content.metadata.cloudinaryId);
      } catch (error) {
        console.error('Error deleting from Cloudinary:', error);
      }
    }

    await Content.deleteOne({ _id: req.params.id });

    return res.status(200).json({
      success: true,
      message: 'Content deleted successfully',
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

// POST /content/upload - Upload file
router.post('/upload', authMiddleware, upload.single('file'), async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      throw new AppError(401, 'User not authenticated');
    }

    if (!req.file) {
      throw new AppError(400, 'No file provided');
    }

    const { title, description, tags = [], type = 'DOCUMENT' } = req.body;

    if (!validateTitle(title)) {
      throw new AppError(400, 'Invalid title');
    }

    // Upload to Cloudinary
    const { url, publicId } = await uploadToCloudinary(req.file.buffer, req.file.originalname);

    const content = new Content({
      userId: req.user.userId,
      type,
      title,
      description,
      contentUrl: url,
      tags: tags ? (typeof tags === 'string' ? [tags] : tags) : [],
      metadata: {
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
        fileType: req.file.originalname.split('.').pop(),
        cloudinaryId: publicId,
      },
    });

    await content.save();

    return res.status(201).json({
      success: true,
      message: 'File uploaded successfully',
      statusCode: 201,
      data: { content },
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

// GET /content/search/:query - Search content
router.get('/search/:query', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      throw new AppError(401, 'User not authenticated');
    }

    const query = String(req.params.query);
    const regex = new RegExp(query, 'i');

    const contents = await Content.find({
      userId: req.user.userId,
      $or: [{ title: regex }, { description: regex }, { tags: regex }],
    }).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      message: 'Search completed successfully',
      statusCode: 200,
      data: { contents },
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
