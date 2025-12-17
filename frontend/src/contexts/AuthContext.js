import React, {
  createContext,
  useContext,
  useState,
  useEffect
} from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('token'));

  // 🔹 Backend API base URL (Create React App compatible)
  const API = process.env.REACT_APP_API_BASE_URL;

  // 🔹 Configure axios base URL ONCE
  useEffect(() => {
    if (API) {
      axios.defaults.baseURL = API;
    }
  }, [API]);

  // 🔹 Configure Authorization header
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete axios.defaults.headers.common['Authorization'];
    }
  }, [token]);

  // 🔹 Verify auth on app load
  useEffect(() => {
    const checkAuth = async () => {
      if (token) {
        try {
          const response = await axios.get('/api/auth/verify');

          if (response.data.success) {
            setUser(response.data.data.user);
          } else {
            localStorage.removeItem('token');
            setToken(null);
          }
        } catch (error) {
          console.error('Auth verification failed:', error);
          localStorage.removeItem('token');
          setToken(null);
        }
      }
      setLoading(false);
    };

    checkAuth();
  }, [token]);

  // 🔹 Login
  const login = async (identifier, password) => {
    try {
      const response = await axios.post('/api/auth/login', {
        identifier,
        password
      });

      if (response.data.success) {
        const { user: userData, token: newToken } = response.data.data;

        localStorage.setItem('token', newToken);
        setToken(newToken);
        setUser(userData);

        toast.success('Login successful!');
        return { success: true, user: userData };
      }
    } catch (error) {
      const message =
        error.response?.data?.message || 'Login failed';
      toast.error(message);
      return { success: false, message };
    }
  };

  // 🔹 Register
  const register = async (userData) => {
    try {
      const response = await axios.post(
        '/api/auth/register',
        userData
      );

      if (response.data.success) {
        const { user: newUser, token: newToken } =
          response.data.data;

        localStorage.setItem('token', newToken);
        setToken(newToken);
        setUser(newUser);

        toast.success('Registration successful!');
        return { success: true, user: newUser };
      }
    } catch (error) {
      const message =
        error.response?.data?.message ||
        'Registration failed';
      toast.error(message);
      return { success: false, message };
    }
  };

  // 🔹 Logout
  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    delete axios.defaults.headers.common['Authorization'];
    toast.success('Logged out successfully!');
  };

  // 🔹 Update profile
  const updateProfile = async (profileData) => {
    try {
      const response = await axios.put(
        '/api/auth/profile',
        profileData
      );

      if (response.data.success) {
        setUser(response.data.data.user);
        toast.success('Profile updated successfully!');
        return {
          success: true,
          user: response.data.data.user
        };
      }
    } catch (error) {
      const message =
        error.response?.data?.message ||
        'Profile update failed';
      toast.error(message);
      return { success: false, message };
    }
  };

  // 🔹 Change password
  const changePassword = async (
    currentPassword,
    newPassword
  ) => {
    try {
      const response = await axios.put(
        '/api/auth/change-password',
        {
          currentPassword,
          newPassword
        }
      );

      if (response.data.success) {
        toast.success('Password changed successfully!');
        return { success: true };
      }
    } catch (error) {
      const message =
        error.response?.data?.message ||
        'Password change failed';
      toast.error(message);
      return { success: false, message };
    }
  };

  const value = {
    user,
    loading,
    isAuthenticated: !!user,
    token,
    login,
    register,
    logout,
    updateProfile,
    changePassword
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
