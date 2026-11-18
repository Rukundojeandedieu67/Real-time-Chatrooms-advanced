import { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/auth.service';
import { userService } from '../services/user.service';
import { useToast } from './ToastContext';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { addToast } = useToast();

  useEffect(() => {
    let active = true;
    const initAuth = async () => {
      try {
        const currentUser = await authService.getCurrentUser();
        if (!active) return;
        if (currentUser) {
          setUser({ ...currentUser, preferences: {} });
          setIsAuthenticated(true);
          authService.heartbeat(currentUser.status || 'online').catch(() => {});
        } else {
          setIsAuthenticated(false);
        }
      } catch {
        if (active) setIsAuthenticated(false);
      } finally {
        if (active) setIsLoading(false);
      }
    };
    initAuth();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return undefined;
    const timer = setInterval(() => {
      authService.heartbeat(user?.status || 'online').catch(() => {});
    }, 30000);
    return () => clearInterval(timer);
  }, [isAuthenticated, user?.status]);

  const login = async ({ email, password }) => {
    setIsSubmitting(true);
    try {
    const res = await authService.login({ email, password });
    setUser(res.user);
    setIsAuthenticated(true);
    addToast({
      type: 'success',
      title: 'Welcome back',
      message: `Signed in as ${res.user.name}.`,
    });
    return res;
    } finally {
      setIsSubmitting(false);
    }
  };

  const register = async ({ name, username, email, password }) => {
    setIsSubmitting(true);
    try {
    const res = await authService.register({ name, username, email, password });
    if (res.user) {
      setUser(res.user);
      setIsAuthenticated(true);
      addToast({
        type: 'success',
        title: 'Account created',
        message: 'Your account is ready.',
      });
    } else {
      addToast({
        type: 'info',
        title: 'Confirm your email',
        message: 'Check your inbox before signing in.',
      });
    }
    return res;
    } finally {
      setIsSubmitting(false);
    }
  };

  const logout = async () => {
    try {
      await authService.heartbeat('offline');
    } catch {
      /* session may already be gone */
    }
    await authService.logout();
    setUser(null);
    setIsAuthenticated(false);
    addToast({
      type: 'info',
      title: 'Signed out',
      message: 'You have been signed out.',
    });
  };

  const uploadAvatar = async (file) => {
    const updated = await userService.uploadAvatar(file);
    setUser((prev) => ({ ...prev, ...updated }));
    addToast({
      type: 'success',
      title: 'Avatar updated',
      message: 'Your profile image was saved.',
    });
    return updated;
  };

  const updateProfile = async (updates) => {
    const updated = await userService.updateProfile(updates);
    setUser((prev) => ({ ...prev, ...updated }));
    addToast({
      type: 'success',
      title: 'Profile updated',
      message: 'Your profile changes have been saved.',
    });
    return updated;
  };

  const updatePresence = async (status) => {
    const updated = await userService.updatePresence(status);
    setUser((prev) => ({ ...prev, ...updated }));
    authService.heartbeat(updated.status).catch(() => {});
    return updated;
  };

  const updatePreferences = async (preferences) => {
    const updated = await userService.updatePreferences(preferences);
    setUser((prev) => ({ ...prev, ...updated }));
    addToast({
      type: 'success',
      title: 'Settings saved',
      message: 'Appearance preferences are stored on this device.',
    });
    return updated;
  };

  const forgotPassword = (email) => authService.forgotPassword(email);
  const resetPassword = (payload) => authService.resetPassword(payload);
  const changePassword = (payload) => authService.changePassword(payload);
  const resendVerification = (email) => authService.resendVerification(email);

  const value = {
    user,
    isAuthenticated,
        isLoading,
        isSubmitting,
    login,
    register,
    logout,
    uploadAvatar,
    updateProfile,
    updatePresence,
    updatePreferences,
    forgotPassword,
    resetPassword,
    changePassword,
    resendVerification,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
