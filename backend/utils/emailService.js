const nodemailer = require('nodemailer');
const path = require('path');

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.EMAIL_PORT) || 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      },
      tls: {
        rejectUnauthorized: false
      }
    });

    // Verify connection configuration
    this.transporter.verify((error, success) => {
      if (error) {
        console.log('Email service configuration error:', error);
      } else {
        console.log('Email service is ready to send messages');
      }
    });
  }

  // Send file download link email
  async sendFileLinkEmail(fileData, recipientEmail, senderEmail = null) {
    try {
      const downloadUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/download/${fileData.id}`;
      const expiryDate = new Date(fileData.expiryTime).toLocaleString();
      
      const mailOptions = {
        from: {
          name: 'FileShare',
          address: process.env.EMAIL_USER
        },
        to: recipientEmail,
        subject: `File shared with you: ${fileData.originalName}`,
        html: this.generateFileShareEmailTemplate({
          fileName: fileData.originalName,
          fileSize: fileData.fileSizeFormatted,
          downloadUrl: downloadUrl,
          expiryDate: expiryDate,
          senderEmail: senderEmail,
          downloadCount: fileData.downloadCount,
          maxDownloads: fileData.maxDownloads
        })
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log('File share email sent successfully:', result.messageId);
      return { success: true, messageId: result.messageId };
    } catch (error) {
      console.error('Error sending file share email:', error);
      throw new Error('Failed to send email');
    }
  }

  // Send upload confirmation email
  async sendUploadConfirmationEmail(fileData, userEmail) {
    try {
      const downloadUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/download/${fileData.id}`;
      const expiryDate = new Date(fileData.expiryTime).toLocaleString();
      
      const mailOptions = {
        from: {
          name: 'FileShare',
          address: process.env.EMAIL_USER
        },
        to: userEmail,
        subject: `File uploaded successfully: ${fileData.originalName}`,
        html: this.generateUploadConfirmationEmailTemplate({
          fileName: fileData.originalName,
          fileSize: fileData.fileSizeFormatted,
          downloadUrl: downloadUrl,
          expiryDate: expiryDate
        })
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log('Upload confirmation email sent successfully:', result.messageId);
      return { success: true, messageId: result.messageId };
    } catch (error) {
      console.error('Error sending upload confirmation email:', error);
      throw new Error('Failed to send confirmation email');
    }
  }

  // Generate HTML template for file share email
  generateFileShareEmailTemplate(data) {
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>File Shared with You</title>
        <style>
            body {
                font-family: Arial, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
            }
            .header {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 30px;
                text-align: center;
                border-radius: 10px 10px 0 0;
            }
            .content {
                background: #f9f9f9;
                padding: 30px;
                border-radius: 0 0 10px 10px;
            }
            .file-info {
                background: white;
                padding: 20px;
                border-radius: 8px;
                margin: 20px 0;
                border-left: 4px solid #667eea;
            }
            .download-btn {
                display: inline-block;
                background: #667eea;
                color: white;
                padding: 15px 30px;
                text-decoration: none;
                border-radius: 5px;
                font-weight: bold;
                margin: 20px 0;
            }
            .download-btn:hover {
                background: #5a6fd8;
            }
            .warning {
                background: #fff3cd;
                border: 1px solid #ffeaa7;
                color: #856404;
                padding: 15px;
                border-radius: 5px;
                margin: 20px 0;
            }
            .footer {
                text-align: center;
                margin-top: 30px;
                color: #666;
                font-size: 12px;
            }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>📁 File Shared with You</h1>
            <p>Someone has shared a file with you using FileShare</p>
        </div>
        
        <div class="content">
            <div class="file-info">
                <h3>📄 ${data.fileName}</h3>
                <p><strong>File Size:</strong> ${data.fileSize}</p>
                <p><strong>Expires:</strong> ${data.expiryDate}</p>
                ${data.senderEmail ? `<p><strong>From:</strong> ${data.senderEmail}</p>` : ''}
                <p><strong>Downloads:</strong> ${data.downloadCount}/${data.maxDownloads}</p>
            </div>
            
            <div style="text-align: center;">
                <a href="${data.downloadUrl}" class="download-btn">Download File</a>
            </div>
            
            <div class="warning">
                <strong>⚠️ Important:</strong> This file will expire automatically and be deleted after the expiry date. Please download it soon.
            </div>
            
            <p>If the download button doesn't work, copy and paste this link into your browser:</p>
            <p style="word-break: break-all; background: #f0f0f0; padding: 10px; border-radius: 3px;">
                ${data.downloadUrl}
            </p>
        </div>
        
        <div class="footer">
            <p>This email was sent by FileShare - Secure File Sharing</p>
            <p>If you didn't expect this email, you can safely ignore it.</p>
        </div>
    </body>
    </html>
    `;
  }

  // Generate HTML template for upload confirmation email
  generateUploadConfirmationEmailTemplate(data) {
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>File Upload Successful</title>
        <style>
            body {
                font-family: Arial, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
            }
            .header {
                background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
                color: white;
                padding: 30px;
                text-align: center;
                border-radius: 10px 10px 0 0;
            }
            .content {
                background: #f9f9f9;
                padding: 30px;
                border-radius: 0 0 10px 10px;
            }
            .file-info {
                background: white;
                padding: 20px;
                border-radius: 8px;
                margin: 20px 0;
                border-left: 4px solid #28a745;
            }
            .download-btn {
                display: inline-block;
                background: #28a745;
                color: white;
                padding: 15px 30px;
                text-decoration: none;
                border-radius: 5px;
                font-weight: bold;
                margin: 20px 0;
            }
            .download-btn:hover {
                background: #218838;
            }
            .info {
                background: #d1ecf1;
                border: 1px solid #bee5eb;
                color: #0c5460;
                padding: 15px;
                border-radius: 5px;
                margin: 20px 0;
            }
            .footer {
                text-align: center;
                margin-top: 30px;
                color: #666;
                font-size: 12px;
            }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>✅ File Upload Successful</h1>
            <p>Your file has been uploaded and is ready to share</p>
        </div>
        
        <div class="content">
            <div class="file-info">
                <h3>📄 ${data.fileName}</h3>
                <p><strong>File Size:</strong> ${data.fileSize}</p>
                <p><strong>Expires:</strong> ${data.expiryDate}</p>
            </div>
            
            <div style="text-align: center;">
                <a href="${data.downloadUrl}" class="download-btn">View Download Link</a>
            </div>
            
            <div class="info">
                <strong>ℹ️ Your file is now ready to share!</strong><br>
                Share the download link with anyone you want. The file will automatically expire and be deleted after the expiry date.
            </div>
            
            <p>Share this link:</p>
            <p style="word-break: break-all; background: #f0f0f0; padding: 10px; border-radius: 3px;">
                ${data.downloadUrl}
            </p>
        </div>
        
        <div class="footer">
            <p>This email was sent by FileShare - Secure File Sharing</p>
            <p>Thank you for using our service!</p>
        </div>
    </body>
    </html>
    `;
  }

  // Test email configuration
  async testEmailConfiguration() {
    try {
      await this.transporter.verify();
      return { success: true, message: 'Email configuration is valid' };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }
}

module.exports = new EmailService();
