const fs = require('fs');
const path = require('path');
const File = require('../models/File');

class CleanupService {
  constructor() {
    this.isRunning = false;
    this.intervalId = null;
  }

  // Start the cleanup service
  start() {
    if (this.isRunning) {
      console.log('Cleanup service is already running');
      return;
    }

    console.log('Starting cleanup service...');
    this.isRunning = true;

    // Run cleanup immediately
    this.cleanupExpiredFiles();

    // Schedule cleanup to run every hour
    this.intervalId = setInterval(() => {
      this.cleanupExpiredFiles();
    }, 60 * 60 * 1000); // 1 hour
  }

  // Stop the cleanup service
  stop() {
    if (!this.isRunning) {
      console.log('Cleanup service is not running');
      return;
    }

    console.log('Stopping cleanup service...');
    this.isRunning = false;

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  // Clean up expired files
  async cleanupExpiredFiles() {
    try {
      console.log('Starting expired files cleanup...');
      
      // Find all expired files
      const expiredFiles = await File.findExpiredFiles();
      
      if (expiredFiles.length === 0) {
        console.log('No expired files found');
        return;
      }

      console.log(`Found ${expiredFiles.length} expired files to clean up`);

      let deletedCount = 0;
      let errorCount = 0;

      for (const file of expiredFiles) {
        try {
          // Delete file from disk
          if (fs.existsSync(file.filePath)) {
            fs.unlinkSync(file.filePath);
            console.log(`Deleted file from disk: ${file.originalName}`);
          }

          // Delete file record from database
          await File.findByIdAndDelete(file._id);
          deletedCount++;

          console.log(`Cleaned up expired file: ${file.originalName} (${file.id})`);

        } catch (error) {
          console.error(`Error cleaning up file ${file.originalName}:`, error);
          errorCount++;
        }
      }

      console.log(`Cleanup completed. Deleted: ${deletedCount}, Errors: ${errorCount}`);

      // Log cleanup statistics
      const stats = await this.getCleanupStats();
      console.log('Cleanup stats:', stats);

    } catch (error) {
      console.error('Error during cleanup process:', error);
    }
  }

  // Get cleanup statistics
  async getCleanupStats() {
    try {
      const totalFiles = await File.countDocuments();
      const expiredFiles = await File.findExpiredFiles();
      const activeFiles = totalFiles - expiredFiles.length;

      const totalSize = await File.aggregate([
        { $group: { _id: null, totalSize: { $sum: '$fileSize' } } }
      ]);

      const expiredSize = await File.aggregate([
        { $match: { $or: [{ isExpired: true }, { expiryTime: { $lt: new Date() } }] } },
        { $group: { _id: null, totalSize: { $sum: '$fileSize' } } }
      ]);

      return {
        totalFiles,
        activeFiles,
        expiredFiles: expiredFiles.length,
        totalSize: totalSize[0]?.totalSize || 0,
        expiredSize: expiredSize[0]?.totalSize || 0,
        lastCleanup: new Date()
      };

    } catch (error) {
      console.error('Error getting cleanup stats:', error);
      return null;
    }
  }

  // Force cleanup of specific file
  async cleanupFile(fileId) {
    try {
      const file = await File.findOne({ id: fileId });
      
      if (!file) {
        throw new Error('File not found');
      }

      // Delete file from disk
      if (fs.existsSync(file.filePath)) {
        fs.unlinkSync(file.filePath);
        console.log(`Force deleted file from disk: ${file.originalName}`);
      }

      // Delete file record from database
      await File.findByIdAndDelete(file._id);
      console.log(`Force deleted file record: ${file.originalName}`);

      return { success: true, message: 'File cleaned up successfully' };

    } catch (error) {
      console.error(`Error force cleaning up file ${fileId}:`, error);
      throw error;
    }
  }

  // Clean up orphaned files (files on disk but not in database)
  async cleanupOrphanedFiles() {
    try {
      console.log('Starting orphaned files cleanup...');
      
      const uploadDir = './uploads';
      if (!fs.existsSync(uploadDir)) {
        console.log('Upload directory does not exist');
        return;
      }

      // Get all files in upload directory
      const filesOnDisk = fs.readdirSync(uploadDir);
      
      // Get all file paths from database
      const dbFiles = await File.find({}, 'filePath');
      const dbFilePaths = new Set(dbFiles.map(file => path.basename(file.filePath)));

      let orphanedCount = 0;
      let errorCount = 0;

      for (const fileName of filesOnDisk) {
        const filePath = path.join(uploadDir, fileName);
        
        // Skip if it's not a file
        if (!fs.statSync(filePath).isFile()) {
          continue;
        }

        // Check if file exists in database
        if (!dbFilePaths.has(fileName)) {
          try {
            fs.unlinkSync(filePath);
            orphanedCount++;
            console.log(`Deleted orphaned file: ${fileName}`);
          } catch (error) {
            console.error(`Error deleting orphaned file ${fileName}:`, error);
            errorCount++;
          }
        }
      }

      console.log(`Orphaned files cleanup completed. Deleted: ${orphanedCount}, Errors: ${errorCount}`);

      return {
        orphanedCount,
        errorCount,
        message: `Cleaned up ${orphanedCount} orphaned files`
      };

    } catch (error) {
      console.error('Error during orphaned files cleanup:', error);
      throw error;
    }
  }

  // Get disk usage statistics
  async getDiskUsage() {
    try {
      const uploadDir = './uploads';
      if (!fs.existsSync(uploadDir)) {
        return { totalSize: 0, fileCount: 0 };
      }

      const files = fs.readdirSync(uploadDir);
      let totalSize = 0;
      let fileCount = 0;

      for (const file of files) {
        const filePath = path.join(uploadDir, file);
        const stats = fs.statSync(filePath);
        
        if (stats.isFile()) {
          totalSize += stats.size;
          fileCount++;
        }
      }

      return {
        totalSize,
        fileCount,
        formattedSize: this.formatBytes(totalSize)
      };

    } catch (error) {
      console.error('Error getting disk usage:', error);
      return { totalSize: 0, fileCount: 0, formattedSize: '0 Bytes' };
    }
  }

  // Format bytes to human readable format
  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

// Create singleton instance
const cleanupService = new CleanupService();

// Start cleanup service when module is loaded
if (process.env.NODE_ENV !== 'test') {
  cleanupService.start();
}

module.exports = cleanupService;
