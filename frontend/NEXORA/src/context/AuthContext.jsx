import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authService } from '../services/auth.service';
import { userService } from '../services/user.service';
import { useToast } from './ToastContext';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(true); // Default true for demo exploration
  const [isLoading, setIsLoading] = useState(true);
  const { addToast } = useToast();

  // Load current user on initial mount
  useEffect(() => {
    const initAuth = async () => {
      try {
        const currentUser = await authService.getCurrentUser();
        if (currentUser) {
          setUser(currentUser);
          setIsAuthenticated(true);
        } else {
          setIsAuthenticated(false);
        }
      } catch (err) {
        console.error('Failed to initialize demo auth state:', err);
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = async ({ email, password }) => {
    setIsLoading(true);
    try {
      const res = await authService.login({ email, password });
      setUser(res.user);
      setIsAuthenticated(true);
      addToast({
        type: 'success',
        title: 'Welcome Back!',
        message: `Signed in as ${res.user.name} (Simulation Mode).`
      });
      return res;
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Sign In Failed',
        message: err.message || 'Could not authenticate.'
      });
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async ({ name, username, email, password }) => {
    setIsLoading(true);
    try {
      const res = await authService.register({ name, username, email, password });
      setUser(res.user);
      setIsAuthenticated(true);
      addToast({
        type: 'success',
        title: 'Account Created',
        message: 'Welcome to NEXORA! Your account is active.'
      });
      return res;
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Registration Error',
        message: err.message || 'Failed to create account.'
      });
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await authService.logout();
      setUser(null);
      setIsAuthenticated(false);
      addToast({
        type: 'info',
        title: 'Signed Out',
        message: 'You have been safely signed out of NEXORA.'
      });
    } catch (err) {
      console.error(err);
    }
  };

  const updateProfile = async (updates) => {
    try {
      const updated = await userService.updateProfile(updates);
      setUser(updated);
      addToast({
        type: 'success',
        title: 'Profile Updated',
        message: 'Your profile changes have been saved.'
      });
      return updated;
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Update Failed',
        message: 'Could not update profile.'
      });
      throw err;
    }
  };

  const updatePresence = async (status, statusMessage = '') => {
    try {
      const updated = await userService.updatePresence(status, statusMessage);
      setUser(updated);
      return updated;
    } catch (err) {
      console.error('Failed to update presence', err);
    }
  };

  const updatePreferences = async (preferences) => {
    try {
      const updated = await userService.updatePreferences(preferences);
      setUser(updated);
      addToast({
        type: 'success',
        title: 'Settings Saved',
        message: 'Preferences updated successfully.'
      });
      return updated;
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Preferences Error',
        message: 'Failed to update preferences.'
      });
      throw err;
    }
  };

  const forgotPassword = async (email) => {
    return await authService.forgotPassword(email);
  };

  const resetPassword = async (payload) => {
    return await authService.resetPassword(payload);
  };

  const verifyEmail = async (code) => {
    return await authService.verifyEmail(code);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoading,
        login,
        register,
        logout,
        updateProfile,
        updatePresence,
        updatePreferences,
        forgotPassword,
        resetPassword,
        verifyEmail
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
