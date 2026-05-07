import { Comment, Report, ReportStatus, User } from './types';

const REPORTS_KEY = 'roadguard_reports';
const USER_KEY = 'roadguard_user';
const USERS_KEY = 'roadguard_users';
const TOKEN_KEY = 'roadguard_token';
const API_BASE_URL = 'http://localhost:5000/api';

interface StoredUser extends User {
  password: string;
}

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
  {
    id: 'rep-mock-1',
    userId: 'user-1',
    image: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=800&q=80',
    issueType: 'Pothole',
    description: 'Large pothole in the middle of the left lane. Hazardous for low cars.',
    location: 'Jan Shoba St, Pretoria',
    timestamp: new Date().toISOString(),
    status: 'In Progress',
    history: [
      {
        status: 'Pending',
        timestamp: new Date().toISOString(),
        updatedBy: 'Self',
      },
    ],
    comments: [
      {
        id: 'c1',
        author: 'Municipal Staff',
        text: 'Crew dispatched to assess.',
        timestamp: new Date().toISOString(),
      },
    ],
  },
  {
    id: 'rep-mock-2',
    userId: 'user-1',
    image: 'https://images.unsplash.com/photo-1590481284891-95562723707c?auto=format&fit=crop&w=800&q=80',
    issueType: 'Broken Traffic Light',
    description: 'Main intersection lights are out. Causing major congestion.',
    location: 'Glyn St & Burnett St, Pretoria',
    timestamp: new Date(Date.now() - 86400000).toISOString(),
    status: 'Resolved',
    history: [
      {
        status: 'Resolved',
        timestamp: new Date().toISOString(),
        updatedBy: 'Council',
      },
    ],
    comments: [],
  },
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
  return readReports();
};

export const getReport = async (id: string): Promise<Report | null> => {
  const reports = readReports();
  return reports.find((r) => r.id === id) || null;
};

export const saveReport = async (report: Report): Promise<void> => {
  const reports = readReports();
  const id = report.id || `rep-${Date.now()}`;
  const index = reports.findIndex((r) => r.id === id);

  const normalizedReport: Report = {
    ...report,
    id,
    timestamp: report.timestamp || new Date().toISOString(),
    status: report.status || 'Pending',
    history: report.history || [
      {
        status: 'Pending',
        timestamp: new Date().toISOString(),
        updatedBy: getCurrentUser()?.name || 'Citizen',
      },
    ],
    comments: report.comments || [],
  };

  if (index >= 0) {
    reports[index] = normalizedReport;
  } else {
    reports.unshift(normalizedReport);
  }

  writeReports(reports);
};

export const updateReportStatus = async (reportId: string, status: string): Promise<void> => {
  const reports = readReports();
  const report = reports.find((r) => r.id === reportId);
  if (!report) {
    return;
  }

  const nextStatus = status as ReportStatus;
  report.status = nextStatus;
  report.history.push({
    status: nextStatus,
    timestamp: new Date().toISOString(),
    updatedBy: getCurrentUser()?.role === 'admin' ? 'Municipal Staff' : 'Citizen',
  });

  writeReports(reports);
};

export const addReportComment = async (reportId: string, text: string): Promise<void> => {
  const reports = readReports();
  const report = reports.find((r) => r.id === reportId);
  if (!report) {
    return;
  }

  const user = getCurrentUser();
  const comment: Comment = {
    id: `comm-${Date.now()}`,
    author: user?.role === 'admin' ? 'Municipal Staff' : (user?.name || 'Citizen'),
    text,
    timestamp: new Date().toISOString(),
  };

  report.comments.push(comment);
  writeReports(reports);
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
