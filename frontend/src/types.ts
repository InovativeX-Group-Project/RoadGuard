
export type ReportStatus = 'Pending' | 'In Progress' | 'Resolved' | 'Rejected';
export type IssueType =
  | 'Pothole'
  | 'Broken Street Light'
  | 'Cracked Road'
  | 'Faded Road Markings'
  | 'Broken Traffic Light'
  | 'Damaged Pavement/Sidewalk'
  | 'Blocked Storm Drain'
  | 'Water Leak on Road'
  | 'Sinkhole'
  | 'Loose Gravel'
  | 'Fallen Road Sign'
  | 'Damaged Guardrail'
  | 'Uneven Road Surface'
  | 'Flooded Road'
  | 'Illegal Dumping'
  | 'Overgrown Bushes'
  | 'Missing Manhole Cover'
  | 'Broken Speed Hump'
  | 'Oil Spill'
  | 'Exposed Electrical Cables'
  | 'Other';

export const ISSUE_TYPE_OPTIONS: IssueType[] = [
  'Pothole',
  'Broken Street Light',
  'Cracked Road',
  'Faded Road Markings',
  'Broken Traffic Light',
  'Damaged Pavement/Sidewalk',
  'Blocked Storm Drain',
  'Water Leak on Road',
  'Sinkhole',
  'Loose Gravel',
  'Fallen Road Sign',
  'Damaged Guardrail',
  'Uneven Road Surface',
  'Flooded Road',
  'Illegal Dumping',
  'Overgrown Bushes',
  'Missing Manhole Cover',
  'Broken Speed Hump',
  'Oil Spill',
  'Exposed Electrical Cables',
  'Other',
];

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
