import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { User } from '../models/User';
import { UserProfile } from '../models/UserProfile';
import { validateUsername, validatePassword, validateEmail } from '../middleware/validators';
import { checkRateLimit, getClientIp } from '../middleware/rateLimit';
import { createToken } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { AuthRequest } from '../types/index';

const router = Router();

// POST /auth/signup
router.post('/signup', async (req: AuthRequest, res: Response) => {
  try {
    const clientIp = getClientIp(req);
    if (!checkRateLimit(clientIp)) {
      throw new AppError(429, 'Too many requests. Please try again later.');
    }

    const { username, password, email } = req.body;

    // Validation
    if (!validateUsername(username)) {
      throw new AppError(400, 'Invalid username. Must be 3-30 characters, alphanumeric with dashes/underscores.');
    }

    if (!validatePassword(password)) {
      throw new AppError(400, 'Password must be at least 6 characters long.');
    }

    if (email && !validateEmail(email)) {
      throw new AppError(400, 'Invalid email format.');
    }

    // Check if user exists
    const existingUser = await User.findOne({ username: username.toLowerCase() });
    if (existingUser) {
      throw new AppError(409, 'Username already taken.');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = new User({
      username: username.toLowerCase(),
      password: hashedPassword,
      email,
    });

    await user.save();

    // Create user profile
    const userProfile = new UserProfile({
      userId: user._id,
      followers: [],
      following: [],
    });

    await userProfile.save();

    // Generate token
    const token = await createToken({
      userId: user._id.toString(),
      username: user.username,
    });

    return res.status(201).json({
      success: true,
      message: 'User created successfully',
      statusCode: 201,
      data: {
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
        },
        token,
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

// POST /auth/signin
router.post('/signin', async (req: AuthRequest, res: Response) => {
  try {
    const clientIp = getClientIp(req);
    if (!checkRateLimit(clientIp)) {
      throw new AppError(429, 'Too many requests. Please try again later.');
    }

    const { username, password } = req.body;

    // Validation
    if (!username || !password) {
      throw new AppError(400, 'Username and password are required.');
    }

    // Find user
    const user = await User.findOne({ username: username.toLowerCase() });
    if (!user) {
      throw new AppError(401, 'Invalid username or password.');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new AppError(401, 'Invalid username or password.');
    }

    // Generate token
    const token = await createToken({
      userId: user._id.toString(),
      username: user.username,
    });

    return res.status(200).json({
      success: true,
      message: 'Signed in successfully',
      statusCode: 200,
      data: {
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
        },
        token,
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
