const express = require('express');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');

const User = require('../models/User');
const { generateToken, authenticateToken, requireAuth } = require('../middleware/auth');

const router = express.Router();

// Validation middleware
const validateRegistration = [
  body('username')
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be between 3 and 30 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  body('firstName').optional().isLength({ max: 50 }).withMessage('First name must be less than 50 characters'),
  body('lastName').optional().isLength({ max: 50 }).withMessage('Last name must be less than 50 characters')
];

const validateLogin = [
  body('identifier')
    .notEmpty()
    .withMessage('Email or username is required'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

// Register new user
router.post('/register', validateRegistration, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        errors: errors.array() 
      });
    }

    const { username, email, password, firstName, lastName } = req.body;

    // Check if user already exists
    const existingUser = await User.findByEmailOrUsername(email) || await User.findByEmailOrUsername(username);
    if (existingUser) {
      return res.status(400).json({ 
        error: 'User already exists',
        message: 'A user with this email or username already exists' 
      });
    }

    // Create new user
    const user = new User({
      username,
      email,
      password,
      firstName,
      lastName
    });

    await user.save();

    // Generate token
    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          uploadStats: user.uploadStats
        },
        token
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({ 
        error: 'Duplicate field',
        message: `${field} already exists` 
      });
    }
    
    res.status(500).json({ 
      error: 'Registration failed',
      message: 'An error occurred during registration' 
    });
  }
});

// Login user
router.post('/login', validateLogin, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        errors: errors.array() 
      });
    }

    const { identifier, password } = req.body;

    // Find user by email or username
    const user = await User.findByEmailOrUsername(identifier);
    if (!user) {
      return res.status(401).json({ 
        error: 'Invalid credentials',
        message: 'Email/username or password is incorrect' 
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({ 
        error: 'Account disabled',
        message: 'Your account has been disabled' 
      });
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({ 
        error: 'Invalid credentials',
        message: 'Email/username or password is incorrect' 
      });
    }

    // Update last login
    await user.updateLastLogin();

    // Generate token
    const token = generateToken(user._id);

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          uploadStats: user.uploadStats,
          lastLogin: user.lastLogin
        },
        token
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      error: 'Login failed',
      message: 'An error occurred during login' 
    });
  }
});

// Get current user profile
router.get('/profile', authenticateToken, requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    res.json({
      success: true,
      data: {
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          fullName: user.fullName,
          uploadStats: user.uploadStats,
          preferences: user.preferences,
          lastLogin: user.lastLogin,
          createdAt: user.createdAt
        }
      }
    });

  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ 
      error: 'Failed to get profile',
      message: 'An error occurred while retrieving profile information' 
    });
  }
});

// Update user profile
router.put('/profile', 
  authenticateToken, 
  requireAuth,
  [
    body('firstName').optional().isLength({ max: 50 }).withMessage('First name must be less than 50 characters'),
    body('lastName').optional().isLength({ max: 50 }).withMessage('Last name must be less than 50 characters'),
    body('preferences.defaultExpiryHours').optional().isInt({ min: 1, max: 168 }).withMessage('Expiry hours must be between 1 and 168'),
    body('preferences.emailNotifications').optional().isBoolean().withMessage('Email notifications must be a boolean')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          errors: errors.array() 
        });
      }

      const { firstName, lastName, preferences } = req.body;
      const user = await User.findById(req.user.id);

      // Update allowed fields
      if (firstName !== undefined) user.firstName = firstName;
      if (lastName !== undefined) user.lastName = lastName;
      if (preferences) {
        if (preferences.defaultExpiryHours !== undefined) {
          user.preferences.defaultExpiryHours = preferences.defaultExpiryHours;
        }
        if (preferences.emailNotifications !== undefined) {
          user.preferences.emailNotifications = preferences.emailNotifications;
        }
      }

      await user.save();

      res.json({
        success: true,
        message: 'Profile updated successfully',
        data: {
          user: {
            id: user._id,
            username: user.username,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            fullName: user.fullName,
            preferences: user.preferences
          }
        }
      });

    } catch (error) {
      console.error('Update profile error:', error);
      res.status(500).json({ 
        error: 'Failed to update profile',
        message: 'An error occurred while updating profile' 
      });
    }
  }
);

// Change password
router.put('/change-password',
  authenticateToken,
  requireAuth,
  [
    body('currentPassword').notEmpty().withMessage('Current password is required'),
    body('newPassword')
      .isLength({ min: 6 })
      .withMessage('New password must be at least 6 characters long')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage('New password must contain at least one uppercase letter, one lowercase letter, and one number')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          errors: errors.array() 
        });
      }

      const { currentPassword, newPassword } = req.body;
      const user = await User.findById(req.user.id);

      // Verify current password
      const isCurrentPasswordValid = await user.comparePassword(currentPassword);
      if (!isCurrentPasswordValid) {
        return res.status(400).json({ 
          error: 'Invalid current password',
          message: 'The current password you entered is incorrect' 
        });
      }

      // Update password
      user.password = newPassword;
      await user.save();

      res.json({
        success: true,
        message: 'Password changed successfully'
      });

    } catch (error) {
      console.error('Change password error:', error);
      res.status(500).json({ 
        error: 'Failed to change password',
        message: 'An error occurred while changing password' 
      });
    }
  }
);

// Verify token endpoint
router.get('/verify', authenticateToken, (req, res) => {
  if (req.user) {
    res.json({
      success: true,
      message: 'Token is valid',
      data: {
        user: {
          id: req.user._id,
          username: req.user.username,
          email: req.user.email
        }
      }
    });
  } else {
    res.status(401).json({
      success: false,
      message: 'Token is invalid or expired'
    });
  }
});

module.exports = router;
