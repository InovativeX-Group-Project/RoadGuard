
import { Report, User } from "./types";

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
    password: 'admin123'
  }
];

export const getReports = (): Report[] => {
  const data = localStorage.getItem(REPORTS_KEY);
  if (data) return JSON.parse(data);
  
  // Initial mock data for first-time use
  const initial: Report[] = [
    {
      id: "rep-mock-1",
      userId: "user-1",
      image: "https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=800&q=80",
      issueType: "Pothole",
      description: "Large pothole in the middle of the left lane. Hazardous for low cars.",
      location: "Jan Shoba St, Pretoria",
      timestamp: new Date().toISOString(),
      status: "In Progress",
      history: [{ status: "Pending", timestamp: new Date().toISOString(), updatedBy: "Self" }],
      comments: [
        { id: "c1", author: "Staff", text: "Crew dispatched to assess.", timestamp: new Date().toISOString() }
      ]
    },
    {
      id: "rep-mock-2",
      userId: "user-1",
      image: "https://images.unsplash.com/photo-1590481284891-95562723707c?auto=format&fit=crop&w=800&q=80",
      issueType: "Broken Traffic Light",
      description: "Main intersection lights are out. Causing major congestion.",
      location: "Glyn St & Burnett St, Pretoria",
      timestamp: new Date(Date.now() - 86400000).toISOString(),
      status: "Resolved",
      history: [{ status: "Resolved", timestamp: new Date().toISOString(), updatedBy: "Council" }],
      comments: []
    }
  ];
  localStorage.setItem(REPORTS_KEY, JSON.stringify(initial));
  return initial;
};

export const saveReport = (report: Report) => {
  const reports = getReports();
  const index = reports.findIndex(r => r.id === report.id);
  if (index >= 0) {
    reports[index] = report;
  } else {
    reports.unshift(report);
  }
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
