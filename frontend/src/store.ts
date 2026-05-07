
import { Report, User } from "./types";

const REPORTS_KEY = 'roadguard_reports';
const USER_KEY = 'roadguard_user';

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

export const getCurrentUser = (): User => {
  const data = localStorage.getItem(USER_KEY);
  if (data) return JSON.parse(data);
  
  // Default demo user
  const defaultUser: User = {
    id: 'user-1',
    name: 'John Smith',
    email: 'john@example.com',
    role: 'citizen'
  };
  localStorage.setItem(USER_KEY, JSON.stringify(defaultUser));
  return defaultUser;
};

export const setCurrentUser = (user: User) => {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
};
