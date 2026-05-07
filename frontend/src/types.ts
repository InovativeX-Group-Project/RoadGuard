
export type ReportStatus = 'Pending' | 'In Progress' | 'Resolved' | 'Rejected';
export type IssueType = 'Pothole' | 'Crack' | 'Broken Traffic Light' | 'Other';

export interface Report {
  id: string;
  userId: string;
  image: string; // base64 for demo
  issueType: IssueType;
  description: string;
  location: string;
  timestamp: string;
  status: ReportStatus;
  history: StatusHistory[];
  comments: Comment[];
}

export interface StatusHistory {
  status: ReportStatus;
  timestamp: string;
  updatedBy: string;
}

export interface Comment {
  id: string;
  author: string;
  text: string;
  timestamp: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'citizen' | 'admin';
}
