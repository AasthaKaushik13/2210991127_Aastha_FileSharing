const mongoose = require('mongoose');

const fileSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true
  },
  filename: {
    type: String,
    required: true
  },
  originalName: {
    type: String,
    required: true
  },
  filePath: {
    type: String,
    required: true
  },
  mimeType: {
    type: String,
    required: true
  },
  fileSize: {
    type: Number,
    required: true
  },
  uploadTime: {
    type: Date,
    default: Date.now
  },
  expiryTime: {
    type: Date,
    required: true
  },
  senderEmail: {
    type: String,
    validate: {
      validator: function(email) {
        return !email || /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(email);
      },
      message: 'Please enter a valid email address'
    }
  },
  receiverEmail: {
    type: String,
    validate: {
      validator: function(email) {
        return !email || /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(email);
      },
      message: 'Please enter a valid email address'
    }
  },
  downloadCount: {
    type: Number,
    default: 0
  },
  maxDownloads: {
    type: Number,
    default: 100
  },
  isExpired: {
    type: Boolean,
    default: false
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  accessLog: [{
    ip: String,
    userAgent: String,
    downloadTime: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true
});

// Index for faster queries
fileSchema.index({ id: 1 });
fileSchema.index({ expiryTime: 1 });
fileSchema.index({ isExpired: 1 });

// Virtual for file extension
fileSchema.virtual('fileExtension').get(function() {
  return this.originalName.split('.').pop().toLowerCase();
});

// Virtual for file size in human readable format
fileSchema.virtual('fileSizeFormatted').get(function() {
  const bytes = this.fileSize;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  if (bytes === 0) return '0 Bytes';
  const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
});

// Method to check if file is expired
fileSchema.methods.isFileExpired = function() {
  return new Date() > this.expiryTime;
};

// Method to check if download limit reached
fileSchema.methods.isDownloadLimitReached = function() {
  return this.downloadCount >= this.maxDownloads;
};

// Static method to find expired files
fileSchema.statics.findExpiredFiles = function() {
  return this.find({
    $or: [
      { isExpired: true },
      { expiryTime: { $lt: new Date() } }
    ]
  });
};

// Pre-save middleware to set expiry time if not provided
fileSchema.pre('save', function(next) {
  if (!this.expiryTime) {
    // Default expiry: 24 hours from upload
    this.expiryTime = new Date(Date.now() + 24 * 60 * 60 * 1000);
  }
  next();
});

// Pre-save middleware to update isExpired field
fileSchema.pre('save', function(next) {
  this.isExpired = this.isFileExpired();
  next();
});

module.exports = mongoose.model('File', fileSchema);
