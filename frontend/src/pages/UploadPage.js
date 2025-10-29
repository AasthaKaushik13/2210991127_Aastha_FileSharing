import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import {
  Box,
  Container,
  Typography,
  Button,
  TextField,
  Card,
  CardContent,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  LinearProgress,
  Chip,
  IconButton,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  CloudUpload as CloudUploadIcon,
  Delete as DeleteIcon,
  Email as EmailIcon,
  Schedule as ScheduleIcon,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { useFile } from '../contexts/FileContext';
import { useAuth } from '../contexts/AuthContext';

const UploadPage = () => {
  const { uploadFile, uploading } = useFile();
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [file, setFile] = useState(null);
  const [senderEmail, setSenderEmail] = useState(user?.email || '');
  const [receiverEmail, setReceiverEmail] = useState('');
  const [expiryHours, setExpiryHours] = useState(user?.preferences?.defaultExpiryHours || 24);
  const [error, setError] = useState('');

  const onDrop = useCallback((acceptedFiles, rejectedFiles) => {
    setError('');
    
    if (rejectedFiles.length > 0) {
      const rejection = rejectedFiles[0];
      if (rejection.errors[0]?.code === 'file-too-large') {
        setError('File size must be less than 100MB');
      } else if (rejection.errors[0]?.code === 'file-invalid-type') {
        setError('File type not supported');
      } else {
        setError('File rejected. Please try a different file.');
      }
      return;
    }

    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0]);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxFiles: 1,
    maxSize: 100 * 1024 * 1024, // 100MB
    accept: {
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-powerpoint': ['.ppt'],
      'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
      'text/plain': ['.txt'],
      'text/csv': ['.csv'],
      'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp', '.svg'],
      'video/*': ['.mp4', '.avi', '.mov', '.wmv', '.webm'],
      'audio/*': ['.mp3', '.wav', '.ogg', '.mpeg'],
      'application/zip': ['.zip'],
      'application/x-rar-compressed': ['.rar'],
      'application/x-7z-compressed': ['.7z'],
      'application/gzip': ['.gz'],
      'application/x-tar': ['.tar'],
      'application/json': ['.json'],
      'application/xml': ['.xml'],
      'text/xml': ['.xml'],
    },
  });

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleRemoveFile = () => {
    setFile(null);
    setError('');
  };

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a file to upload');
      return;
    }

    if (senderEmail && !validateEmail(senderEmail)) {
      setError('Please enter a valid sender email address');
      return;
    }

    if (receiverEmail && !validateEmail(receiverEmail)) {
      setError('Please enter a valid receiver email address');
      return;
    }

    setError('');

    const emailData = {
      senderEmail: senderEmail || undefined,
      receiverEmail: receiverEmail || undefined,
      expiryHours,
    };

    const result = await uploadFile(file, emailData);

    if (result.success) {
      navigate(`/success/${result.data.id}`);
    } else {
      setError(result.message);
    }
  };

  const expiryOptions = [
    { value: 1, label: '1 Hour' },
    { value: 6, label: '6 Hours' },
    { value: 12, label: '12 Hours' },
    { value: 24, label: '24 Hours' },
    { value: 48, label: '48 Hours' },
    { value: 72, label: '72 Hours' },
    { value: 168, label: '7 Days' },
  ];

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Typography variant="h4" component="h1" sx={{ fontWeight: 700, mb: 2 }}>
            Upload Your File
          </Typography>
          <Typography variant="h6" color="text.secondary">
            Select a file and get a shareable download link instantly
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        <Grid container spacing={3}>
          {/* File Upload Area */}
          <Grid item xs={12}>
            <Card>
              <CardContent sx={{ p: 0 }}>
                {!file ? (
                  <Box
                    {...getRootProps()}
                    sx={{
                      p: 4,
                      textAlign: 'center',
                      border: `2px dashed ${isDragActive ? theme.palette.primary.main : theme.palette.grey[300]}`,
                      borderRadius: 2,
                      backgroundColor: isDragActive ? 'primary.50' : 'grey.50',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        borderColor: 'primary.main',
                        backgroundColor: 'primary.50',
                      },
                    }}
                  >
                    <input {...getInputProps()} />
                    <CloudUploadIcon
                      sx={{
                        fontSize: 64,
                        color: isDragActive ? 'primary.main' : 'grey.400',
                        mb: 2,
                      }}
                    />
                    <Typography variant="h6" sx={{ mb: 1, fontWeight: 600 }}>
                      {isDragActive
                        ? 'Drop your file here'
                        : 'Drag & drop a file here, or click to browse'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      Supports: PDF, DOC, XLS, PPT, Images, Videos, Archives, and more
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Maximum file size: 100MB
                    </Typography>
                  </Box>
                ) : (
                  <Box sx={{ p: 3 }}>
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        p: 2,
                        backgroundColor: 'grey.50',
                        borderRadius: 2,
                        border: '1px solid',
                        borderColor: 'grey.200',
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                        <CloudUploadIcon sx={{ mr: 2, color: 'primary.main' }} />
                        <Box>
                          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                            {file.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {formatFileSize(file.size)}
                          </Typography>
                        </Box>
                      </Box>
                      <IconButton onClick={handleRemoveFile} color="error">
                        <DeleteIcon />
                      </IconButton>
                    </Box>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Upload Options */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
                  Upload Options
                </Typography>

                <Grid container spacing={3}>
                  {/* Sender Email */}
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Your Email (Optional)"
                      type="email"
                      value={senderEmail}
                      onChange={(e) => setSenderEmail(e.target.value)}
                      placeholder="your.email@example.com"
                      InputProps={{
                        startAdornment: <EmailIcon sx={{ mr: 1, color: 'text.secondary' }} />,
                      }}
                      helperText="We'll send you a confirmation email"
                    />
                  </Grid>

                  {/* Receiver Email */}
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Recipient Email (Optional)"
                      type="email"
                      value={receiverEmail}
                      onChange={(e) => setReceiverEmail(e.target.value)}
                      placeholder="recipient@example.com"
                      InputProps={{
                        startAdornment: <EmailIcon sx={{ mr: 1, color: 'text.secondary' }} />,
                      }}
                      helperText="We'll send the download link to this email"
                    />
                  </Grid>

                  {/* Expiry Time */}
                  <Grid item xs={12}>
                    <FormControl fullWidth>
                      <InputLabel>File Expiry Time</InputLabel>
                      <Select
                        value={expiryHours}
                        label="File Expiry Time"
                        onChange={(e) => setExpiryHours(e.target.value)}
                        startAdornment={<ScheduleIcon sx={{ mr: 1, color: 'text.secondary' }} />}
                      >
                        {expiryOptions.map((option) => (
                          <MenuItem key={option.value} value={option.value}>
                            {option.label}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                </Grid>

                {!isAuthenticated && (
                  <Box sx={{ mt: 3, p: 2, backgroundColor: 'info.50', borderRadius: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      💡 <strong>Tip:</strong> Create a free account to track your uploads, 
                      manage files, and access advanced features.
                    </Typography>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Upload Button */}
          <Grid item xs={12}>
            <Button
              fullWidth
              variant="contained"
              size="large"
              onClick={handleUpload}
              disabled={!file || uploading}
              sx={{
                py: 2,
                fontSize: '1.1rem',
                fontWeight: 600,
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: '0 8px 25px rgba(102, 126, 234, 0.4)',
                },
                '&:disabled': {
                  background: 'grey.300',
                  color: 'grey.500',
                },
                transition: 'all 0.3s ease',
              }}
            >
              {uploading ? (
                <>
                  <LinearProgress sx={{ width: '100%', mr: 2 }} />
                  Uploading...
                </>
              ) : (
                <>
                  <CloudUploadIcon sx={{ mr: 1 }} />
                  Upload File
                </>
              )}
            </Button>
          </Grid>
        </Grid>
      </motion.div>
    </Container>
  );
};

export default UploadPage;
