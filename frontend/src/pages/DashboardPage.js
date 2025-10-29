import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Button,
  Card,
  CardContent,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Pagination,
  CircularProgress,
  Alert,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  CloudUpload as CloudUploadIcon,
  Delete as DeleteIcon,
  Download as DownloadIcon,
  ContentCopy as CopyIcon,
  Email as EmailIcon,
  Schedule as ScheduleIcon,
  Info as InfoIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { CopyToClipboard } from 'react-copy-to-clipboard';
import moment from 'moment';
import { useFile } from '../contexts/FileContext';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

const DashboardPage = () => {
  const { user, isAuthenticated } = useAuth();
  const { getUserFiles, deleteFile } = useFile();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [deleteDialog, setDeleteDialog] = useState({ open: false, fileId: null, fileName: '' });
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: { pathname: '/dashboard' } } });
      return;
    }
    loadFiles();
  }, [isAuthenticated, navigate, currentPage]);

  const loadFiles = async () => {
    setLoading(true);
    try {
      const result = await getUserFiles(currentPage, 10);
      if (result.success) {
        setFiles(result.data.files);
        setTotalPages(result.data.pagination.totalPages);
      } else {
        setError(result.message);
      }
    } catch (err) {
      setError('Failed to load files');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (fileId, fileName) => {
    setDeleteDialog({ open: true, fileId, fileName });
  };

  const handleDeleteConfirm = async () => {
    setDeleting(true);
    try {
      const result = await deleteFile(deleteDialog.fileId);
      if (result.success) {
        toast.success('File deleted successfully');
        loadFiles();
      }
    } catch (err) {
      toast.error('Failed to delete file');
    } finally {
      setDeleting(false);
      setDeleteDialog({ open: false, fileId: null, fileName: '' });
    }
  };

  const handleCopyLink = (fileId) => {
    const downloadUrl = `${window.location.origin}/download/${fileId}`;
    navigator.clipboard.writeText(downloadUrl);
    toast.success('Download link copied to clipboard!');
  };

  const formatFileSize = (size) => {
    if (!size) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(size) / Math.log(k));
    return parseFloat((size / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStatusColor = (file) => {
    if (file.isExpired) return 'error';
    const expiryTime = moment(file.expiryTime);
    const now = moment();
    const hoursRemaining = expiryTime.diff(now, 'hours');
    if (hoursRemaining < 1) return 'warning';
    return 'success';
  };

  const getStatusText = (file) => {
    if (file.isExpired) return 'Expired';
    const expiryTime = moment(file.expiryTime);
    const now = moment();
    const hoursRemaining = expiryTime.diff(now, 'hours');
    if (hoursRemaining < 1) return 'Expires Soon';
    return 'Active';
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        {/* Header */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" component="h1" sx={{ fontWeight: 700, mb: 1 }}>
            Dashboard
          </Typography>
          <Typography variant="h6" color="text.secondary">
            Welcome back, {user?.fullName || user?.username}!
          </Typography>
        </Box>

        {/* Stats Cards */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h4" color="primary.main" sx={{ fontWeight: 700 }}>
                  {user?.uploadStats?.totalFiles || 0}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Total Files
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h4" color="success.main" sx={{ fontWeight: 700 }}>
                  {formatFileSize(user?.uploadStats?.totalSize || 0)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Total Size
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h4" color="info.main" sx={{ fontWeight: 700 }}>
                  {user?.uploadStats?.totalDownloads || 0}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Total Downloads
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h4" color="warning.main" sx={{ fontWeight: 700 }}>
                  {files.filter(f => !f.isExpired).length}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Active Files
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Actions */}
        <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
          <Button
            variant="contained"
            startIcon={<CloudUploadIcon />}
            onClick={() => navigate('/upload')}
            sx={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            }}
          >
            Upload New File
          </Button>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={loadFiles}
            disabled={loading}
          >
            Refresh
          </Button>
        </Box>

        {/* Files Table */}
        <Card>
          <CardContent sx={{ p: 0 }}>
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                <CircularProgress />
              </Box>
            ) : error ? (
              <Alert severity="error" sx={{ m: 2 }}>
                {error}
              </Alert>
            ) : files.length === 0 ? (
              <Box sx={{ textAlign: 'center', p: 4 }}>
                <CloudUploadIcon sx={{ fontSize: 64, color: 'grey.400', mb: 2 }} />
                <Typography variant="h6" color="text.secondary" sx={{ mb: 2 }}>
                  No files uploaded yet
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<CloudUploadIcon />}
                  onClick={() => navigate('/upload')}
                >
                  Upload Your First File
                </Button>
              </Box>
            ) : (
              <>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Filename</TableCell>
                        <TableCell>Size</TableCell>
                        <TableCell>Upload Date</TableCell>
                        <TableCell>Expiry</TableCell>
                        <TableCell>Downloads</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell align="right">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {files.map((file) => (
                        <TableRow key={file.id} hover>
                          <TableCell>
                            <Box>
                              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                {file.filename}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                ID: {file.id}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell>{file.size}</TableCell>
                          <TableCell>
                            {moment(file.uploadTime).format('MMM D, YYYY')}
                          </TableCell>
                          <TableCell>
                            <Box>
                              <Typography variant="body2">
                                {moment(file.expiryTime).format('MMM D, YYYY')}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {moment(file.expiryTime).format('h:mm A')}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell>{file.downloadCount}</TableCell>
                          <TableCell>
                            <Chip
                              label={getStatusText(file)}
                              color={getStatusColor(file)}
                              size="small"
                            />
                          </TableCell>
                          <TableCell align="right">
                            <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
                              <IconButton
                                size="small"
                                onClick={() => window.open(`/download/${file.id}`, '_blank')}
                                title="Download"
                              >
                                <DownloadIcon />
                              </IconButton>
                              <IconButton
                                size="small"
                                onClick={() => handleCopyLink(file.id)}
                                title="Copy Link"
                              >
                                <CopyIcon />
                              </IconButton>
                              <IconButton
                                size="small"
                                onClick={() => handleDeleteClick(file.id, file.filename)}
                                color="error"
                                title="Delete"
                              >
                                <DeleteIcon />
                              </IconButton>
                            </Box>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>

                {/* Pagination */}
                {totalPages > 1 && (
                  <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
                    <Pagination
                      count={totalPages}
                      page={currentPage}
                      onChange={(event, page) => setCurrentPage(page)}
                      color="primary"
                    />
                  </Box>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Delete Confirmation Dialog */}
        <Dialog
          open={deleteDialog.open}
          onClose={() => setDeleteDialog({ open: false, fileId: null, fileName: '' })}
        >
          <DialogTitle>Delete File</DialogTitle>
          <DialogContent>
            <Typography>
              Are you sure you want to delete "{deleteDialog.fileName}"? 
              This action cannot be undone and the file will be permanently removed.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button
              onClick={() => setDeleteDialog({ open: false, fileId: null, fileName: '' })}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleDeleteConfirm}
              color="error"
              disabled={deleting}
              startIcon={deleting ? <CircularProgress size={16} /> : <DeleteIcon />}
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogActions>
        </Dialog>
      </motion.div>
    </Container>
  );
};

export default DashboardPage;
