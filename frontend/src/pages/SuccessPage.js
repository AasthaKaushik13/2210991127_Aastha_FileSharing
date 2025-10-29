import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CopyToClipboard } from 'react-copy-to-clipboard';
import {
  Box,
  Container,
  Typography,
  Button,
  Card,
  CardContent,
  Grid,
  TextField,
  InputAdornment,
  IconButton,
  Alert,
  Chip,
  Divider,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  ContentCopy as CopyIcon,
  Email as EmailIcon,
  Share as ShareIcon,
  Download as DownloadIcon,
  Schedule as ScheduleIcon,
  Info as InfoIcon,
  ArrowBack as ArrowBackIcon,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import moment from 'moment';
import { useFile } from '../contexts/FileContext';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

const SuccessPage = () => {
  const { fileId } = useParams();
  const navigate = useNavigate();
  const { getFileInfo, sendEmailLink } = useFile();
  const { isAuthenticated } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [fileInfo, setFileInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [emailAddress, setEmailAddress] = useState('');
  const [emailMessage, setEmailMessage] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);
  const [copied, setCopied] = useState(false);

  const downloadUrl = `${window.location.origin}/download/${fileId}`;

  useEffect(() => {
    const fetchFileInfo = async () => {
      try {
        const result = await getFileInfo(fileId);
        if (result.success) {
          setFileInfo(result.data);
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

  const handleCopyLink = () => {
    setCopied(true);
    toast.success('Link copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendEmail = async () => {
    if (!emailAddress) {
      toast.error('Please enter an email address');
      return;
    }

    setSendingEmail(true);
    try {
      const result = await sendEmailLink(fileId, emailAddress, emailMessage);
      if (result.success) {
        toast.success('Email sent successfully!');
        setEmailAddress('');
        setEmailMessage('');
      }
    } catch (err) {
      toast.error('Failed to send email');
    } finally {
      setSendingEmail(false);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `File: ${fileInfo?.filename}`,
          text: `Check out this file: ${fileInfo?.filename}`,
          url: downloadUrl,
        });
      } catch (err) {
        console.log('Error sharing:', err);
      }
    } else {
      handleCopyLink();
    }
  };

  const formatTimeRemaining = (expiryTime) => {
    const now = moment();
    const expiry = moment(expiryTime);
    const duration = moment.duration(expiry.diff(now));

    if (duration.asHours() >= 24) {
      return `${Math.floor(duration.asDays())} days`;
    } else if (duration.asHours() >= 1) {
      return `${Math.floor(duration.asHours())} hours`;
    } else {
      return `${Math.floor(duration.asMinutes())} minutes`;
    }
  };

  if (loading) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="h6">Loading file information...</Typography>
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
        <Button
          variant="contained"
          onClick={() => navigate('/upload')}
          startIcon={<ArrowBackIcon />}
        >
          Upload Another File
        </Button>
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
        {/* Success Header */}
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
          >
            <CheckCircleIcon
              sx={{
                fontSize: 80,
                color: 'success.main',
                mb: 2,
              }}
            />
          </motion.div>
          <Typography variant="h4" component="h1" sx={{ fontWeight: 700, mb: 1 }}>
            Upload Successful!
          </Typography>
          <Typography variant="h6" color="text.secondary">
            Your file is ready to share
          </Typography>
        </Box>

        {/* File Information */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
              File Details
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" color="text.secondary">
                  Filename
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 500 }}>
                  {fileInfo?.filename}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" color="text.secondary">
                  File Size
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 500 }}>
                  {fileInfo?.size}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" color="text.secondary">
                  Upload Time
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 500 }}>
                  {moment(fileInfo?.uploadTime).format('MMM D, YYYY [at] h:mm A')}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" color="text.secondary">
                  Expires In
                </Typography>
                <Chip
                  icon={<ScheduleIcon />}
                  label={formatTimeRemaining(fileInfo?.expiryTime)}
                  color="warning"
                  variant="outlined"
                />
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Download Link */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
              Shareable Download Link
            </Typography>
            <TextField
              fullWidth
              value={downloadUrl}
              InputProps={{
                readOnly: true,
                endAdornment: (
                  <InputAdornment position="end">
                    <CopyToClipboard text={downloadUrl} onCopy={handleCopyLink}>
                      <IconButton
                        edge="end"
                        color={copied ? 'success' : 'primary'}
                      >
                        <CopyIcon />
                      </IconButton>
                    </CopyToClipboard>
                  </InputAdornment>
                ),
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  backgroundColor: 'grey.50',
                },
              }}
            />
            <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Button
                variant="contained"
                startIcon={<CopyIcon />}
                onClick={handleCopyLink}
                size="small"
              >
                Copy Link
              </Button>
              <Button
                variant="outlined"
                startIcon={<ShareIcon />}
                onClick={handleShare}
                size="small"
              >
                Share
              </Button>
              <Button
                variant="outlined"
                startIcon={<DownloadIcon />}
                onClick={() => window.open(downloadUrl, '_blank')}
                size="small"
              >
                Test Download
              </Button>
            </Box>
          </CardContent>
        </Card>

        {/* Email Sharing */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
              Send via Email
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Recipient Email"
                  type="email"
                  value={emailAddress}
                  onChange={(e) => setEmailAddress(e.target.value)}
                  placeholder="recipient@example.com"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <EmailIcon />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Message (Optional)"
                  multiline
                  rows={3}
                  value={emailMessage}
                  onChange={(e) => setEmailMessage(e.target.value)}
                  placeholder="Add a personal message..."
                />
              </Grid>
              <Grid item xs={12}>
                <Button
                  variant="contained"
                  startIcon={<EmailIcon />}
                  onClick={handleSendEmail}
                  disabled={sendingEmail || !emailAddress}
                  sx={{
                    background: 'linear-gradient(135deg, #28a745 0%, #20c997 100%)',
                  }}
                >
                  {sendingEmail ? 'Sending...' : 'Send Email'}
                </Button>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Information Card */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
              <InfoIcon sx={{ color: 'info.main', mt: 0.5 }} />
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                  Important Information
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  • This file will automatically expire and be deleted after{' '}
                  {formatTimeRemaining(fileInfo?.expiryTime)}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  • The download link can be shared with anyone
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  • Maximum downloads: {fileInfo?.maxDownloads || 100}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  • Current downloads: {fileInfo?.downloadCount || 0}
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Button
            variant="outlined"
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate('/upload')}
          >
            Upload Another File
          </Button>
          {isAuthenticated && (
            <Button
              variant="contained"
              onClick={() => navigate('/dashboard')}
            >
              View Dashboard
            </Button>
          )}
        </Box>
      </motion.div>
    </Container>
  );
};

export default SuccessPage;
