import { Comment, Report, ReportStatus, User } from './types';

const REPORTS_KEY = 'roadguard_reports';
const USER_KEY = 'roadguard_user';
const USERS_KEY = 'roadguard_users';
const TOKEN_KEY = 'roadguard_token';
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL?.trim() || 'http://localhost:5000/api';
const LAST_SEEN_COMMENT_TS_KEY_PREFIX = 'roadguard_last_seen_comment_ts';

interface StoredUser extends User {
  password: string;
}

const normalizeName = (value: string | null | undefined): string =>
  (value ?? '').trim().toLowerCase();

const getLastSeenStorageKey = (userId: string) =>
  `${LAST_SEEN_COMMENT_TS_KEY_PREFIX}_${userId}`;

const readLastSeenMap = (userId: string): Record<string, string> => {
  const raw = localStorage.getItem(getLastSeenStorageKey(userId));
  if (!raw) {
    return {};
  }

  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      return parsed as Record<string, string>;
    }
  } catch {
    return {};
  }

  return {};
};

const writeLastSeenMap = (userId: string, nextMap: Record<string, string>) => {
  localStorage.setItem(getLastSeenStorageKey(userId), JSON.stringify(nextMap));
};

export const getLastSeenCommentTimestamp = (userId: string, reportId: string): string | null => {
  const map = readLastSeenMap(userId);
  return map[reportId] ?? null;
};

export const markReportCommentsSeen = (userId: string, reportId: string, comments: Comment[]) => {
  if (!comments.length) {
    return;
  }

  const latestTimestamp = comments.reduce<string | null>((latest, comment) => {
    if (!latest) {
      return comment.timestamp;
    }

    return new Date(comment.timestamp).getTime() > new Date(latest).getTime()
      ? comment.timestamp
      : latest;
  }, null);

  if (!latestTimestamp) {
    return;
  }

  const map = readLastSeenMap(userId);
  map[reportId] = latestTimestamp;
  writeLastSeenMap(userId, map);
};

export const getUnreadIncomingCommentsCount = (
  user: User | null,
  report: Report
): number => {
  if (!user) {
    return 0;
  }

  const currentUserName = normalizeName(user.name);
  const lastSeen = getLastSeenCommentTimestamp(user.id, report.id);
  const lastSeenMs = lastSeen ? new Date(lastSeen).getTime() : 0;
  const comments = Array.isArray(report.comments) ? report.comments : [];

  return comments.filter((comment) => {
    const commentMs = new Date(comment.timestamp).getTime();
    if (Number.isNaN(commentMs) || commentMs <= lastSeenMs) {
      return false;
    }

    if (comment.authorUserId) {
      return comment.authorUserId !== user.id;
    }

    return normalizeName(comment.author) !== currentUserName;
  }).length;
};

const DEFAULT_AUTH_USERS: StoredUser[] = [
  {
    id: 'admin-1',
    name: 'Council Staff',
    email: 'staff@roadguard.gov.za',
    role: 'admin',
    password: 'admin123',
  },
];

const INITIAL_REPORTS: Report[] = [
];

const readReports = (): Report[] => {
  const data = localStorage.getItem(REPORTS_KEY);
  if (data) {
    return JSON.parse(data);
  }

  localStorage.setItem(REPORTS_KEY, JSON.stringify(INITIAL_REPORTS));
  return INITIAL_REPORTS;
};

const writeReports = (reports: Report[]) => {
  localStorage.setItem(REPORTS_KEY, JSON.stringify(reports));
};

const getStoredUsers = (): StoredUser[] => {
  const data = localStorage.getItem(USERS_KEY);
  if (data) {
    return JSON.parse(data);
  }

  localStorage.setItem(USERS_KEY, JSON.stringify(DEFAULT_AUTH_USERS));
  return DEFAULT_AUTH_USERS;
};

const saveStoredUsers = (users: StoredUser[]) => {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
};

export const getReports = async (): Promise<Report[]> => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) {
    return [];
  }

  const response = await fetch(`${API_BASE_URL}/reports`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await response.json().catch(() => []);
  if (!response.ok || !Array.isArray(data)) {
    throw new Error('Failed to fetch reports');
  }

  return data;
};

export const getReport = async (id: string): Promise<Report | null> => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) {
    return null;
  }

  const response = await fetch(`${API_BASE_URL}/reports/${id}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (response.status === 404) {
    return null;
  }

  const data = await response.json().catch(() => null);
  if (!response.ok || !data) {
    throw new Error('Failed to fetch report');
  }

  return data;
};

export const saveReport = async (report: Report): Promise<void> => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) {
    throw new Error('Authentication required');
  }

  const payload = {
    issueType: report.issueType,
    description: report.description,
    location: report.location,
    image: report.image,
  };

  const response = await fetch(`${API_BASE_URL}/reports`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || `Failed to save report (HTTP ${response.status})`);
  }
};

export const updateReportStatus = async (reportId: string, status: string): Promise<void> => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) {
    throw new Error('Authentication required');
  }

  const response = await fetch(`${API_BASE_URL}/reports/${reportId}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ status: status as ReportStatus }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to update report status');
  }
};

export const addReportComment = async (reportId: string, text: string): Promise<void> => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) {
    throw new Error('Authentication required');
  }

  const response = await fetch(`${API_BASE_URL}/reports/${reportId}/comments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ text }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to add comment');
  }
};

export const getCurrentUser = (): User | null => {
  const data = localStorage.getItem(USER_KEY);
  if (data) {
    return JSON.parse(data);
  }

  return null;
};

export const setCurrentUser = (user: User) => {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
};

export const clearCurrentUser = () => {
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(TOKEN_KEY);
};

export const signupUser = async ({
  name,
  email,
  password,
}: {
  name: string;
  email: string;
  password: string;
}): Promise<User> => {
  const response = await fetch(`${API_BASE_URL}/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password,
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || 'Signup failed');
  }

  localStorage.setItem(TOKEN_KEY, data.token);
  setCurrentUser(data.user);

  return data.user;
};

export const loginUser = async ({
  email,
  password,
}: {
  email: string;
  password: string;
}): Promise<User> => {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: email.trim().toLowerCase(),
      password,
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || 'Login failed');
  }

  localStorage.setItem(TOKEN_KEY, data.token);
  setCurrentUser(data.user);
  return data.user;
};

export const getAdminUsers = async (): Promise<User[]> => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) {
    return [];
  }

  const response = await fetch(`${API_BASE_URL}/users`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await response.json().catch(() => []);
  if (!response.ok || !Array.isArray(data)) {
    return [];
  }

  return data.filter((u) => u.role === 'admin');
};
