import React, { createContext, useContext, useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

const FileContext = createContext();

export const useFile = () => {
  const context = useContext(FileContext);
  if (!context) {
    throw new Error('useFile must be used within a FileProvider');
  }
  return context;
};

export const FileProvider = ({ children }) => {
  const [uploading, setUploading] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const uploadFile = async (file, emailData = {}) => {
    setUploading(true);
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      if (emailData.senderEmail) {
        formData.append('senderEmail', emailData.senderEmail);
      }
      
      if (emailData.receiverEmail) {
        formData.append('receiverEmail', emailData.receiverEmail);
      }
      
      if (emailData.expiryHours) {
        formData.append('expiryHours', emailData.expiryHours);
      }

      const response = await axios.post('/api/files/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          // You can emit progress updates here if needed
        },
      });

      if (response.data.success) {
        toast.success('File uploaded successfully!');
        return { success: true, data: response.data.data };
      }
    } catch (error) {
      const message = error.response?.data?.message || 'Upload failed';
      toast.error(message);
      return { success: false, message };
    } finally {
      setUploading(false);
    }
  };

  const getFileInfo = async (fileId) => {
    try {
      const response = await axios.get(`/api/files/${fileId}`);
      
      if (response.data.success) {
        return { success: true, data: response.data.data };
      }
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to get file info';
      return { success: false, message };
    }
  };

  const downloadFile = async (fileId) => {
    setDownloading(true);
    
    try {
      const response = await axios.get(`/api/files/${fileId}/download`, {
        responseType: 'blob',
      });

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      
      // Get filename from response headers or use default
      const contentDisposition = response.headers['content-disposition'];
      let filename = 'download';
      
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }
      
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success('File downloaded successfully!');
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || 'Download failed';
      toast.error(message);
      return { success: false, message };
    } finally {
      setDownloading(false);
    }
  };

  const sendEmailLink = async (fileId, recipientEmail, message = '') => {
    try {
      const response = await axios.post(`/api/files/${fileId}/email`, {
        recipientEmail,
        message
      });

      if (response.data.success) {
        toast.success('Email sent successfully!');
        return { success: true };
      }
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to send email';
      toast.error(message);
      return { success: false, message };
    }
  };

  const deleteFile = async (fileId) => {
    try {
      const response = await axios.delete(`/api/files/${fileId}`);
      
      if (response.data.success) {
        toast.success('File deleted successfully!');
        return { success: true };
      }
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to delete file';
      toast.error(message);
      return { success: false, message };
    }
  };

  const getUserFiles = async (page = 1, limit = 10) => {
    try {
      const response = await axios.get('/api/files', {
        params: { page, limit }
      });
      
      if (response.data.success) {
        return { success: true, data: response.data.data };
      }
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to get files';
      return { success: false, message };
    }
  };

  const value = {
    uploading,
    downloading,
    uploadFile,
    getFileInfo,
    downloadFile,
    sendEmailLink,
    deleteFile,
    getUserFiles
  };

  return (
    <FileContext.Provider value={value}>
      {children}
    </FileContext.Provider>
  );
};
