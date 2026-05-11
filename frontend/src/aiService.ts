
import { IssueType } from "./types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL?.trim() || 'http://localhost:5000/api';

export interface AILabel {
  name: string;
  confidence: number;
  isObject?: boolean;
}

export interface AIAnalysisResult {
  issueType: IssueType;
  issueGroup?: 'Road surface damage' | 'Traffic infrastructure damage' | 'Safety hazards';
  description: string;
  fullDescription?: string;
  rawLabels?: AILabel[];
  severity?: 'Low' | 'Medium' | 'High' | 'Critical';
  recommendedAction?: string;
}

export async function detectRoadDamage(base64Image: string, location?: string): Promise<AIAnalysisResult> {
  try {
    const token = localStorage.getItem('roadguard_token');
    const response = await fetch(`${API_BASE_URL}/reports/analyze-image`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ image: base64Image, location }),
    });

    if (!response.ok) {
      throw new Error('AI analysis failed');
    }

    const result = await response.json();
    return {
      issueType: result.issueType || 'Other',
      issueGroup: result.issueGroup,
      description: result.description || 'AI analysis completed.',
      fullDescription: result.fullDescription,
      rawLabels: result.rawLabels || [],
      severity: result.severity,
      recommendedAction: result.recommendedAction,
    };
  } catch (error) {
    console.error('AI Detection failed:', error);
    return {
      issueType: 'Other',
      description: 'AI analysis failed. Please provide details manually.',
      rawLabels: [],
    };
  }
}

export async function generateDescriptionFromContext(issueType: string, location?: string): Promise<AIAnalysisResult> {
  try {
    const token = localStorage.getItem('roadguard_token');
    const response = await fetch(`${API_BASE_URL}/reports/generate-description`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ issueType, location }),
    });

    if (!response.ok) {
      throw new Error('AI description generation failed');
    }

    const result = await response.json();
    return {
      issueType: result.issueType || issueType,
      issueGroup: result.issueGroup,
      description: result.description || 'AI description generated.',
      fullDescription: result.fullDescription,
      rawLabels: result.rawLabels || [],
      severity: result.severity,
      recommendedAction: result.recommendedAction,
    };
  } catch (error) {
    console.error('AI description generation failed:', error);
    return {
      issueType: 'Other',
      description: 'Failed to generate AI description. Please type details manually.',
      rawLabels: [],
    };
  }
}
