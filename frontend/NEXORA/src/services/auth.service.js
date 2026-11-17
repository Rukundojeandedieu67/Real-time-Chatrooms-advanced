import { apiClient, clearSession, getAccessToken, saveSession, storedEmail } from './api.client';
import { toProfile } from './map';

function persistSession(result, email) {
  saveSession({
    access_token: result.access_token,
    refresh_token: result.refresh_token,
    email: email || storedEmail(),
  });
  return toProfile(result.user, email || storedEmail());
}

export const authService = {
  async getCurrentUser() {
    if (!getAccessToken()) return null;
    const profile = await apiClient('/users/me');
    return toProfile(profile);
  },

  async login({ email, password }) {
    const result = await apiClient('/auth/login', {
      method: 'POST',
      auth: false,
      body: { email, password },
    });
    return {
      user: persistSession(result, email),
      access_token: result.access_token,
    };
  },

  async register({ name, username, email, password }) {
    const result = await apiClient('/auth/register', {
      method: 'POST',
      auth: false,
      body: {
        email,
        password,
        username: username.trim().toLowerCase(),
        display_name: name.trim(),
      },
    });
    if (result.email_confirmation_required || !result.access_token) {
      saveSession({ email });
      return { user: null, emailConfirmationRequired: true };
    }
    return {
      user: persistSession(result, email),
      access_token: result.access_token,
      emailConfirmationRequired: false,
    };
  },

  async logout() {
    const token = getAccessToken();
    try {
      if (token) await apiClient('/auth/logout', { method: 'POST', retry: false });
    } finally {
      clearSession();
    }
  },

  async forgotPassword(email) {
    const result = await apiClient('/auth/password/forgot', {
      method: 'POST',
      auth: false,
      body: { email },
    });
    return { success: true, message: result.detail };
  },

  async resetPassword({ token, newPassword }) {
    await apiClient('/auth/password/reset', {
      method: 'POST',
      auth: false,
      body: { token, new_password: newPassword },
    });
    return { success: true };
  },

  async changePassword({ currentPassword, newPassword }) {
    await apiClient('/auth/password/change', {
      method: 'POST',
      body: { current_password: currentPassword, new_password: newPassword },
    });
    return { success: true };
  },

  async resendVerification(email) {
    const result = await apiClient('/auth/email/resend', {
      method: 'POST',
      auth: false,
      body: { email: email || storedEmail() },
    });
    return { success: true, message: result.detail };
  },

  async heartbeat(status = 'online') {
    if (!getAccessToken()) return null;
    const safe = status === 'away' || status === 'offline' ? status : 'online';
    return apiClient('/presence/heartbeat', { method: 'POST', body: { status: safe } });
  },
};
