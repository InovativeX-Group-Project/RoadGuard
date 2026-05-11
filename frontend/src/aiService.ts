
import { IssueType } from "./types";

const API_BASE_URL = 'http://localhost:5000/api';

export interface AILabel {
  name: string;
  confidence: number;
  isObject?: boolean;
}

export interface AIAnalysisResult {
  issueType: IssueType;
  description: string;
  fullDescription?: string;
  rawLabels?: AILabel[];
  severity?: 'Low' | 'Medium' | 'High' | 'Critical';
  urgency?: 'Routine' | 'Moderate' | 'Urgent' | 'Emergency';
  estimatedTime?: string;
  estimatedCostZAR?: string;
  recommendedAction?: string;
  disclaimer?: string;
}

export async function detectRoadDamage(base64Image: string): Promise<AIAnalysisResult> {
  try {
    const token = localStorage.getItem('roadguard_token');
    const response = await fetch(`${API_BASE_URL}/reports/analyze-image`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ image: base64Image }),
    });

    if (!response.ok) {
      throw new Error('AI analysis failed');
    }

    const result = await response.json();
    return {
      issueType: result.issueType || 'Other',
      description: result.description || 'AI analysis completed.',
      fullDescription: result.fullDescription,
      rawLabels: result.rawLabels || [],
      severity: result.severity,
      urgency: result.urgency,
      estimatedTime: result.estimatedTime,
      estimatedCostZAR: result.estimatedCostZAR,
      recommendedAction: result.recommendedAction,
      disclaimer: result.disclaimer,
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
