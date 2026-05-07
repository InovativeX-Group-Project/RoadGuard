
import { Report, User } from "./types";

const API_BASE_URL = 'http://localhost:5000/api';

// API helper functions
const apiRequest = async (endpoint: string, options: RequestInit = {}) => {
  const token = localStorage.getItem('roadguard_token');
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Network error' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
};

// Authentication functions
export const loginUser = async (credentials: { email: string; password: string }) => {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Login failed');
  }

  const data = await response.json();
  localStorage.setItem('roadguard_token', data.token);
  localStorage.setItem('roadguard_user', JSON.stringify(data.user));
  return data.user;
};

export const signupUser = async (userData: { name: string; email: string; password: string }) => {
  const response = await fetch(`${API_BASE_URL}/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(userData),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Signup failed');
  }

  const data = await response.json();
  localStorage.setItem('roadguard_token', data.token);
  localStorage.setItem('roadguard_user', JSON.stringify(data.user));
  return data.user;
};

export const getReports = async (): Promise<Report[]> => {
  try {
    return await apiRequest('/reports');
  } catch (error) {
    console.error('Error fetching reports:', error);
    // Fallback to localStorage for demo purposes
    const data = localStorage.getItem('roadguard_reports');
    if (data) return JSON.parse(data);
    return [];
  }
};

export const getReport = async (id: string): Promise<Report | null> => {
  try {
    return await apiRequest(`/reports/${id}`);
  } catch (error) {
    console.error('Error fetching report:', error);
    // Fallback to localStorage
    const reports = getReports();
    return reports.find(r => r.id === id) || null;
  }
};

export const saveReport = async (report: Report): Promise<void> => {
  try {
    // For new reports, use the API
    if (!report.id) {
      const formData = new FormData();
      formData.append('issueType', report.issueType);
      formData.append('description', report.description);
      formData.append('location', report.location);

      // Handle image - if it's a data URL, convert to blob
      if (report.image && report.image.startsWith('data:')) {
        const response = await fetch(report.image);
        const blob = await response.blob();
        formData.append('image', blob, 'image.jpg');
      }

      const token = localStorage.getItem('roadguard_token');
      const response = await fetch(`${API_BASE_URL}/reports`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to create report');
      }
    } else {
      // For updates, this would need additional API endpoints
      console.warn('Report updates not implemented in API yet');
    }
  } catch (error) {
    console.error('Error saving report:', error);
    // Fallback to localStorage
    const reports = getReports();
    const index = reports.findIndex(r => r.id === report.id);
    if (index >= 0) {
      reports[index] = report;
    } else {
      reports.unshift(report);
    }
    localStorage.setItem('roadguard_reports', JSON.stringify(reports));
  }
};

export const updateReportStatus = async (reportId: string, status: string): Promise<void> => {
  try {
    await apiRequest(`/reports/${reportId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  } catch (error) {
    console.error('Error updating report status:', error);
  }
};

export const addReportComment = async (reportId: string, text: string): Promise<void> => {
  try {
    await apiRequest(`/reports/${reportId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ text }),
    });
  } catch (error) {
    console.error('Error adding comment:', error);
  }
};

const getStoredUsers = (): StoredUser[] => {
  const data = localStorage.getItem('roadguard_users');
  if (data) {
    return JSON.parse(data);
  }

  localStorage.setItem('roadguard_users', JSON.stringify(DEFAULT_AUTH_USERS));
  return DEFAULT_AUTH_USERS;
};

const saveStoredUsers = (users: StoredUser[]) => {
  localStorage.setItem('roadguard_users', JSON.stringify(users));
};

export const getCurrentUser = (): User | null => {
  const data = localStorage.getItem('roadguard_user');
  if (data) {
    return JSON.parse(data);
  }

  return null;
};

export const setCurrentUser = (user: User) => {
  localStorage.setItem('roadguard_user', JSON.stringify(user));
};

export const clearCurrentUser = () => {
  localStorage.removeItem('roadguard_user');
  localStorage.removeItem('roadguard_token');
};

export const signupUser = ({
  name,
  email,
  password
}: {
  name: string;
  email: string;
  password: string;
}): User => {
  const normalizedEmail = email.trim().toLowerCase();
  const users = getStoredUsers();

  if (users.some((u) => u.email.toLowerCase() === normalizedEmail)) {
    throw new Error('An account with this email already exists.');
  }

  const newUser: User = {
    id: `user-${Date.now()}`,
    name: name.trim(),
    email: normalizedEmail,
    role: 'citizen'
  };

  const stored: StoredUser = {
    ...newUser,
    password
  };

  users.push(stored);
  saveStoredUsers(users);
  setCurrentUser(newUser);

  return newUser;
};

export const loginUser = ({
  email,
  password
}: {
  email: string;
  password: string;
}): User => {
  const normalizedEmail = email.trim().toLowerCase();
  const users = getStoredUsers();
  const match = users.find((u) => u.email.toLowerCase() === normalizedEmail && u.password === password);

  if (!match) {
    throw new Error('Invalid email or password.');
  }

  const sessionUser: User = {
    id: match.id,
    name: match.name,
    email: match.email,
    role: match.role
  };

  setCurrentUser(sessionUser);
  return sessionUser;
};
