import { Comment, Report, ReportStatus, User } from './types';

const REPORTS_KEY = 'roadguard_reports';
const USER_KEY = 'roadguard_user';
const USERS_KEY = 'roadguard_users';

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
};

export const signupUser = ({
  name,
  email,
  password,
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
    role: 'citizen',
  };

  users.push({ ...newUser, password });
  saveStoredUsers(users);
  setCurrentUser(newUser);

  return newUser;
};

export const loginUser = ({
  email,
  password,
}: {
  email: string;
  password: string;
}): User => {
  const normalizedEmail = email.trim().toLowerCase();
  const users = getStoredUsers();
  let match = users.find((u) => u.email.toLowerCase() === normalizedEmail);

  // Dev-mode relaxed auth: allow login without password verification.
  if (!match) {
    match = {
      id: `user-${Date.now()}`,
      name: normalizedEmail.split('@')[0] || 'Citizen User',
      email: normalizedEmail,
      role: 'citizen',
      password,
    };
    users.push(match);
    saveStoredUsers(users);
  }

  const sessionUser: User = {
    id: match.id,
    name: match.name,
    email: match.email,
    role: match.role,
  };

  setCurrentUser(sessionUser);
  return sessionUser;
};
