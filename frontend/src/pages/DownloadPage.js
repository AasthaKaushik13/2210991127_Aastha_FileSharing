import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Button,
  Card,
  CardContent,
  Grid,
  LinearProgress,
  Chip,
  Alert,
  useTheme,
  useMediaQuery,
  CircularProgress,
} from '@mui/material';
import {
  Download as DownloadIcon,
  Schedule as ScheduleIcon,
  Info as InfoIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  CloudDownload as CloudDownloadIcon,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import moment from 'moment';
import { useFile } from '../contexts/FileContext';
import toast from 'react-hot-toast';

const DownloadPage = () => {
  const { fileId } = useParams();
  const navigate = useNavigate();
  const { getFileInfo, downloadFile, downloading } = useFile();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [fileInfo, setFileInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    const fetchFileInfo = async () => {
      try {
        const result = await getFileInfo(fileId);
        if (result.success) {
          setFileInfo(result.data);
          setIsExpired(result.data.timeRemaining <= 0);
        } else {
          setError(result.message);
        }
      } catch (err) {
        setError('Failed to load file information');
      } finally {
        setLoading(false);
      }
    };

    fetchFileInfo();
  }, [fileId, getFileInfo]);

  // Update countdown timer code
  useEffect(() => {
    if (!fileInfo) return;

    const updateTimer = () => {
      const now = moment();
      const expiry = moment(fileInfo.expiryTime);
      const remaining = expiry.diff(now);

      if (remaining <= 0) {
        setIsExpired(true);
        setTimeRemaining(null);
      } else {
        setTimeRemaining(remaining);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [fileInfo]);

  const formatTimeRemaining = (milliseconds) => {
    if (!milliseconds || milliseconds <= 0) return 'Expired';

    const duration = moment.duration(milliseconds);
    const days = Math.floor(duration.asDays());
    const hours = duration.hours();
    const minutes = duration.minutes();
    const seconds = duration.seconds();

    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m ${seconds}s`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m ${seconds}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    } else {
      return `${seconds}s`;
    }
  };

  const getProgressPercentage = () => {
    if (!fileInfo || !timeRemaining) return 0;
    
    const totalDuration = moment(fileInfo.expiryTime).diff(moment(fileInfo.uploadTime));
    const remainingDuration = timeRemaining;
    const elapsed = totalDuration - remainingDuration;
    
    return Math.min((elapsed / totalDuration) * 100, 100);
  };

  const handleDownload = async () => {
    if (isExpired) {
      toast.error('This file has expired');
      return;
    }

    const result = await downloadFile(fileId);
    if (!result.success) {
      toast.error(result.message);
    }
  };

  const getStatusColor = () => {
    if (isExpired) return 'error';
    if (timeRemaining && timeRemaining < 3600000) return 'warning'; // Less than 1 hour
    return 'success';
  };

  const getStatusIcon = () => {
    if (isExpired) return <ErrorIcon />;
    if (timeRemaining && timeRemaining < 3600000) return <WarningIcon />;
    return <InfoIcon />;
  };

  if (loading) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
          <Box sx={{ textAlign: 'center' }}>
            <CircularProgress size={60} sx={{ mb: 2 }} />
            <Typography variant="h6">Loading file information...</Typography>
          </Box>
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <Alert severity="error" sx={{ mb: 3 }}>
            <Typography variant="h6" sx={{ mb: 1 }}>
              File Not Found
            </Typography>
            <Typography>
              {error}
            </Typography>
          </Alert>
          <Box sx={{ textAlign: 'center' }}>
            <Button
              variant="contained"
              onClick={() => navigate('/')}
              startIcon={<DownloadIcon />}
            >
              Upload a New File
            </Button>
          </Box>
        </motion.div>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        {/* Header */}
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
          >
            <CloudDownloadIcon
              sx={{
                fontSize: 80,
                color: isExpired ? 'error.main' : 'primary.main',
                mb: 2,
              }}
            />
          </motion.div>
          <Typography variant="h4" component="h1" sx={{ fontWeight: 700, mb: 1 }}>
            {isExpired ? 'File Expired' : 'Download File'}
          </Typography>
          <Typography variant="h6" color="text.secondary">
            {isExpired 
              ? 'This file is no longer available for download'
              : 'Your file is ready for download'
            }
          </Typography>
        </Box>

        {/* File Information */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
              File Information
            </Typography>
            
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                  Filename
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 500, wordBreak: 'break-word' }}>
                  {fileInfo?.filename}
                </Typography>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                  File Size
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 500 }}>
                  {fileInfo?.size}
                </Typography>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                  Upload Time
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 500 }}>
                  {moment(fileInfo?.uploadTime).format('MMM D, YYYY [at] h:mm A')}
                </Typography>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                  Download Count
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 500 }}>
                  {fileInfo?.downloadCount || 0} / {fileInfo?.maxDownloads || 100}
                </Typography>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Expiry Status */}
        {!isExpired && (
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                {getStatusIcon()}
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  File Expiry Status
                </Typography>
              </Box>
              
              <Box sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    Time Remaining
                  </Typography>
                  <Chip
                    icon={<ScheduleIcon />}
                    label={formatTimeRemaining(timeRemaining)}
                    color={getStatusColor()}
                    variant="outlined"
                  />
                </Box>
                
                <LinearProgress
                  variant="determinate"
                  value={getProgressPercentage()}
                  color={getStatusColor()}
                  sx={{ height: 8, borderRadius: 4 }}
                />
                
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                  Expires on {moment(fileInfo?.expiryTime).format('MMM D, YYYY [at] h:mm A')}
                </Typography>
              </Box>

              {timeRemaining && timeRemaining < 3600000 && (
                <Alert severity="warning" sx={{ mt: 2 }}>
                  <Typography variant="body2">
                    <strong>Warning:</strong> This file will expire soon! 
                    Please download it as soon as possible.
                  </Typography>
                </Alert>
              )}
            </CardContent>
          </Card>
        )}

        {/* Expired Alert */}
        {isExpired && (
          <Alert severity="error" sx={{ mb: 3 }}>
            <Typography variant="h6" sx={{ mb: 1 }}>
              File Has Expired
            </Typography>
            <Typography>
              This file expired on {moment(fileInfo?.expiryTime).format('MMM D, YYYY [at] h:mm A')} 
              and is no longer available for download. Files are automatically deleted 
              after expiry to maintain security and free up storage space.
            </Typography>
          </Alert>
        )}

        {/* Download Button */}
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Button
            variant="contained"
            size="large"
            startIcon={downloading ? <CircularProgress size={20} color="inherit" /> : <DownloadIcon />}
            onClick={handleDownload}
            disabled={isExpired || downloading}
            sx={{
              px: 6,
              py: 2,
              fontSize: '1.2rem',
              fontWeight: 600,
              background: isExpired 
                ? 'grey.300' 
                : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: isExpired ? 'grey.500' : 'white',
              '&:hover': !isExpired ? {
                transform: 'translateY(-2px)',
                boxShadow: '0 8px 25px rgba(102, 126, 234, 0.4)',
              } : {},
              '&:disabled': {
                background: 'grey.300',
                color: 'grey.500',
              },
              transition: 'all 0.3s ease',
            }}
          >
            {downloading 
              ? 'Downloading...' 
              : isExpired 
                ? 'File Expired' 
                : 'Download File'
            }
          </Button>
        </Box>

        {/* Information Card */}
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
              <InfoIcon sx={{ color: 'info.main', mt: 0.5 }} />
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                  About File Sharing
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  • Files are automatically deleted after the expiry time to ensure security
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  • Download links are unique and secure
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  • Maximum file size: 100MB
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  • Need to share a file? <Button 
                    variant="text" 
                    size="small" 
                    onClick={() => navigate('/upload')}
                    sx={{ p: 0, minWidth: 'auto', textTransform: 'none' }}
                  >
                    Upload a new file
                  </Button>
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </motion.div>
    </Container>
  );
};

export default DownloadPage;
