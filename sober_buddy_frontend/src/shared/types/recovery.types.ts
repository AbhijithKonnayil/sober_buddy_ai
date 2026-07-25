export type UserRole = 'sober' | 'caregiver';

export type RiskLevel = 'low' | 'medium' | 'high';

export interface SoberProfile {
  substance: string;
  triggers: string[];
  copingStrategies: string[];
  filledBy: 'self' | 'caregiver';
  confirmedBySober: boolean;
  riskTier: RiskLevel;
}

export interface EmergencyContact {
  name: string;
  relationship: string;
  phone: string;
  notifyConsent: boolean;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  transcript: string;
  riskFlag?: RiskLevel;
}

export interface EmergencyScripts {
  soberScript: string;
  caregiverScript: string;
}

export interface AlertEvent {
  id: string;
  triggerType: 'location' | 'chat_risk';
  status: 'pending' | 'escalated' | 'resolved';
  locationLabel?: string;
  createdAt?: { seconds: number };
}

export interface EducationArticle {
  id: string;
  title: string;
  substance: string;
  body: string;
  tags: string[];
}
