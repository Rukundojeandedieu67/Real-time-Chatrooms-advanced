/**
 * NEXORA AUTHENTICATION SERVICE (MOCK IMPLEMENTATION)
 * 
 * NOTE FOR BACKEND INTEGRATION:
 * When integrating with Django REST framework / SimpleJWT:
 * - Replace mock delays with fetch / axios requests to endpoints:
 *   POST /api/v1/auth/login/
 *   POST /api/v1/auth/register/
 *   POST /api/v1/auth/logout/
 *   POST /api/v1/auth/password/reset/
 *   POST /api/v1/auth/password/reset/confirm/
 *   POST /api/v1/auth/email/verify/
 */

import { MOCK_CURRENT_USER } from '../mocks/users';

const STORAGE_KEY_AUTH_USER = 'nexora_demo_user';
const STORAGE_KEY_IS_AUTH = 'nexora_demo_is_authenticated';

// Helper to simulate network latency
const delay = (ms = 250) => new Promise(resolve => setTimeout(resolve, ms));

export const authService = {
  /**
   * Check if a demo session is currently active
   */
  async getCurrentUser() {
    await delay(150);
    const stored = localStorage.getItem(STORAGE_KEY_AUTH_USER);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {
        console.error('Failed to parse cached user', e);
      }
    }
    // Default to mock current user for initial seamless demo experience
    return MOCK_CURRENT_USER;
  },

  /**
   * Mock login
   */
  async login({ email, password }) {
    await delay(400);

    // Basic frontend simulation validation
    if (!email || !password) {
      throw new Error('Email and password are required.');
    }

    if (password.length < 6) {
      throw new Error('Invalid credentials. Password must be at least 6 characters.');
    }

    const user = {
      ...MOCK_CURRENT_USER,
      email: email
    };

    localStorage.setItem(STORAGE_KEY_AUTH_USER, JSON.stringify(user));
    localStorage.setItem(STORAGE_KEY_IS_AUTH, 'true');

    return {
      user,
      token: 'mock-jwt-token-nexora-sample',
      message: 'Demo login successful'
    };
  },

  /**
   * Mock registration
   */
  async register({ name, username, email, password }) {
    await delay(500);

    if (!name || !username || !email || !password) {
      throw new Error('All fields are required.');
    }

    if (password.length < 8) {
      throw new Error('Password must be at least 8 characters long.');
    }

    const newUser = {
      ...MOCK_CURRENT_USER,
      id: `usr_${Date.now()}`,
      name,
      username: username.toLowerCase().replace(/\s+/g, '_'),
      email,
      joinedDate: 'Just now'
    };

    localStorage.setItem(STORAGE_KEY_AUTH_USER, JSON.stringify(newUser));
    localStorage.setItem(STORAGE_KEY_IS_AUTH, 'true');

    return {
      user: newUser,
      token: 'mock-jwt-token-nexora-sample',
      message: 'Registration successful. Welcome to NEXORA!'
    };
  },

  /**
   * Mock forgot password request
   */
  async forgotPassword(email) {
    await delay(350);
    if (!email || !email.includes('@')) {
      throw new Error('Please provide a valid email address.');
    }
    return {
      success: true,
      message: `Reset link simulated for ${email}. In production, an email with a secure token will be sent.`
    };
  },

  /**
   * Mock password reset confirmation
   */
  async resetPassword({ token, newPassword }) {
    await delay(350);
    if (!newPassword || newPassword.length < 8) {
      throw new Error('Password must be at least 8 characters long.');
    }
    return {
      success: true,
      message: 'Password has been successfully updated.'
    };
  },

  /**
   * Mock email verification
   */
  async verifyEmail(code) {
    await delay(300);
    if (!code || code.length !== 6) {
      throw new Error('Invalid verification code. Enter the 6-digit code.');
    }
    return {
      success: true,
      message: 'Email address verified successfully!'
    };
  },

  /**
   * Mock logout
   */
  async logout() {
    await delay(150);
    localStorage.removeItem(STORAGE_KEY_AUTH_USER);
    localStorage.setItem(STORAGE_KEY_IS_AUTH, 'false');
    return { success: true };
  }
};
