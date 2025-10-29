const express = require('express');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');
const moment = require('moment');
const { body, validationResult } = require('express-validator');

const File = require('../models/File');
const User = require('../models/User');
const { upload, handleUploadError, cleanupOnError } = require('../middleware/upload');
const emailService = require('../utils/emailService');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Validation middleware
const validateEmail = [
  body('senderEmail').optional().isEmail().normalizeEmail(),
  body('receiverEmail').optional().isEmail().normalizeEmail(),
  body('expiryHours').optional().isInt({ min: 1, max: 168 }).withMessage('Expiry must be between 1 and 168 hours'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  }
];

// Upload file endpoint
router.post('/upload', 
  authenticateToken, // Optional authentication
  upload.single('file'),
  cleanupOnError,
  validateEmail,
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ 
          error: 'No file uploaded',
          message: 'Please select a file to upload' 
        });
      }

      // Generate unique file ID
      const fileId = uuidv4();
      
      // Calculate expiry time
      const expiryHours = req.body.expiryHours || 24;
      const expiryTime = moment().add(expiryHours, 'hours').toDate();

      // Create file record
      const fileData = new File({
        id: fileId,
        filename: req.file.filename,
        originalName: req.file.originalname,
        filePath: req.file.path,
        mimeType: req.file.mimetype,
        fileSize: req.file.size,
        expiryTime: expiryTime,
        senderEmail: req.body.senderEmail,
        receiverEmail: req.body.receiverEmail,
        createdBy: req.user ? req.user.id : null
      });

      await fileData.save();

      // Update user stats if authenticated
      if (req.user) {
        await req.user.updateUploadStats(req.file.size);
      }

      // Send confirmation email to sender if provided
      if (req.body.senderEmail) {
        try {
          await emailService.sendUploadConfirmationEmail(fileData, req.body.senderEmail);
        } catch (emailError) {
          console.error('Failed to send confirmation email:', emailError);
          // Don't fail the upload if email fails
        }
      }

      // Send file link email to receiver if provided
      if (req.body.receiverEmail) {
        try {
          await emailService.sendFileLinkEmail(fileData, req.body.receiverEmail, req.body.senderEmail);
        } catch (emailError) {
          console.error('Failed to send file link email:', emailError);
          // Don't fail the upload if email fails
        }
      }

      res.status(201).json({
        success: true,
        message: 'File uploaded successfully',
        data: {
          id: fileData.id,
          filename: fileData.originalName,
          size: fileData.fileSizeFormatted,
          expiryTime: fileData.expiryTime,
          downloadUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/download/${fileData.id}`,
          senderEmail: fileData.senderEmail,
          receiverEmail: fileData.receiverEmail
        }
      });

    } catch (error) {
      console.error('Upload error:', error);
      
      // Clean up uploaded file on error
      if (req.file && fs.existsSync(req.file.path)) {
        try {
          fs.unlinkSync(req.file.path);
        } catch (cleanupError) {
          console.error('Error cleaning up file:', cleanupError);
        }
      }
      
      res.status(500).json({ 
        error: 'Upload failed',
        message: 'An error occurred while uploading the file' 
      });
    }
  }
);

// Get file metadata
router.get('/:id', async (req, res) => {
  try {
    const file = await File.findOne({ id: req.params.id });
    
    if (!file) {
      return res.status(404).json({ 
        error: 'File not found',
        message: 'The requested file does not exist or has expired' 
      });
    }

    // Check if file is expired
    if (file.isFileExpired()) {
      return res.status(410).json({ 
        error: 'File expired',
        message: 'This file has expired and is no longer available',
        expiredAt: file.expiryTime
      });
    }

    // Check download limit
    if (file.isDownloadLimitReached()) {
      return res.status(410).json({ 
        error: 'Download limit reached',
        message: 'Maximum number of downloads reached for this file'
      });
    }

    res.json({
      success: true,
      data: {
        id: file.id,
        filename: file.originalName,
        size: file.fileSizeFormatted,
        mimeType: file.mimeType,
        uploadTime: file.uploadTime,
        expiryTime: file.expiryTime,
        downloadCount: file.downloadCount,
        maxDownloads: file.maxDownloads,
        timeRemaining: moment(file.expiryTime).diff(moment(), 'hours', true)
      }
    });

  } catch (error) {
    console.error('Get file error:', error);
    res.status(500).json({ 
      error: 'Failed to retrieve file',
      message: 'An error occurred while retrieving file information' 
    });
  }
});

// Download file endpoint
router.get('/:id/download', async (req, res) => {
  try {
    const file = await File.findOne({ id: req.params.id });
    
    if (!file) {
      return res.status(404).json({ 
        error: 'File not found',
        message: 'The requested file does not exist or has expired' 
      });
    }

    // Check if file is expired
    if (file.isFileExpired()) {
      return res.status(410).json({ 
        error: 'File expired',
        message: 'This file has expired and is no longer available' 
      });
    }

    // Check download limit
    if (file.isDownloadLimitReached()) {
      return res.status(410).json({ 
        error: 'Download limit reached',
        message: 'Maximum number of downloads reached for this file' 
      });
    }

    // Check if file exists on disk
    if (!fs.existsSync(file.filePath)) {
      return res.status(404).json({ 
        error: 'File not found',
        message: 'File has been removed from storage' 
      });
    }

    // Increment download count
    file.downloadCount += 1;
    
    // Log access information
    file.accessLog.push({
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent')
    });
    
    await file.save();

    // Update user download stats if file was uploaded by a user
    if (file.createdBy) {
      try {
        const user = await User.findById(file.createdBy);
        if (user) {
          await user.updateDownloadStats();
        }
      } catch (error) {
        console.error('Error updating user download stats:', error);
      }
    }

    // Set appropriate headers and send file
    res.setHeader('Content-Disposition', `attachment; filename="${file.originalName}"`);
    res.setHeader('Content-Type', file.mimeType);
    res.setHeader('Content-Length', file.fileSize);

    const fileStream = fs.createReadStream(file.filePath);
    fileStream.pipe(res);

    fileStream.on('error', (error) => {
      console.error('File stream error:', error);
      res.status(500).json({ 
        error: 'Download failed',
        message: 'An error occurred while downloading the file' 
      });
    });

  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({ 
      error: 'Download failed',
      message: 'An error occurred while downloading the file' 
    });
  }
});

// Send file link via email
router.post('/:id/email', 
  authenticateToken,
  [
    body('recipientEmail').isEmail().normalizeEmail(),
    body('message').optional().isString().isLength({ max: 500 })
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const file = await File.findOne({ id: req.params.id });
      
      if (!file) {
        return res.status(404).json({ 
          error: 'File not found',
          message: 'The requested file does not exist' 
        });
      }

      // Check if file is expired
      if (file.isFileExpired()) {
        return res.status(410).json({ 
          error: 'File expired',
          message: 'This file has expired and is no longer available' 
        });
      }

      // Send email
      const senderEmail = req.user ? req.user.email : file.senderEmail;
      await emailService.sendFileLinkEmail(file, req.body.recipientEmail, senderEmail);

      res.json({
        success: true,
        message: 'File link sent successfully',
        recipientEmail: req.body.recipientEmail
      });

    } catch (error) {
      console.error('Email send error:', error);
      res.status(500).json({ 
        error: 'Failed to send email',
        message: 'An error occurred while sending the email' 
      });
    }
  }
);

// Delete file endpoint (admin or file owner only)
router.delete('/:id', 
  authenticateToken,
  async (req, res) => {
    try {
      const file = await File.findOne({ id: req.params.id });
      
      if (!file) {
        return res.status(404).json({ 
          error: 'File not found',
          message: 'The requested file does not exist' 
        });
      }

      // Check if user is authorized to delete this file
      if (file.createdBy && file.createdBy.toString() !== req.user.id) {
        return res.status(403).json({ 
          error: 'Unauthorized',
          message: 'You are not authorized to delete this file' 
        });
      }

      // Delete file from disk
      if (fs.existsSync(file.filePath)) {
        fs.unlinkSync(file.filePath);
      }

      // Delete file record from database
      await File.findByIdAndDelete(file._id);

      res.json({
        success: true,
        message: 'File deleted successfully'
      });

    } catch (error) {
      console.error('Delete file error:', error);
      res.status(500).json({ 
        error: 'Delete failed',
        message: 'An error occurred while deleting the file' 
      });
    }
  }
);

// Get user's files (authenticated users only)
router.get('/', 
  authenticateToken,
  async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const skip = (page - 1) * limit;

      const files = await File.find({ createdBy: req.user.id })
        .sort({ uploadTime: -1 })
        .skip(skip)
        .limit(limit);

      const totalFiles = await File.countDocuments({ createdBy: req.user.id });

      res.json({
        success: true,
        data: {
          files: files.map(file => ({
            id: file.id,
            filename: file.originalName,
            size: file.fileSizeFormatted,
            uploadTime: file.uploadTime,
            expiryTime: file.expiryTime,
            downloadCount: file.downloadCount,
            isExpired: file.isExpired,
            downloadUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/download/${file.id}`
          })),
          pagination: {
            currentPage: page,
            totalPages: Math.ceil(totalFiles / limit),
            totalFiles,
            hasNext: page < Math.ceil(totalFiles / limit),
            hasPrev: page > 1
          }
        }
      });

    } catch (error) {
      console.error('Get user files error:', error);
      res.status(500).json({ 
        error: 'Failed to retrieve files',
        message: 'An error occurred while retrieving your files' 
      });
    }
  }
);

// Handle multer errors
router.use(handleUploadError);

module.exports = router;
