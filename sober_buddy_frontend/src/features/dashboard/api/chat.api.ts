import { httpsCallable } from 'firebase/functions';
import { functions } from '../../../firebase';
import type { EmergencyScripts } from '../../../shared/types/recovery.types';

export interface CreateSessionResponse {
  sessionId: string;
  role: string;
  userId: string;
}

export interface SendMessageResponse {
  sessionId: string;
  messageId: string;
  transcript: string;
  aiReply: string;
  riskFlag: string;
}

export async function createChatSession(
  role: 'sober' | 'caregiver',
  userId: string,
): Promise<CreateSessionResponse> {
  const callable = httpsCallable(functions, 'createChatSession');
  const result = await callable({ role, userId });
  return result.data as CreateSessionResponse;
}

export async function sendChatMessage(params: {
  sessionId: string;
  userId: string;
  role: 'sober' | 'caregiver';
  transcript: string;
}): Promise<SendMessageResponse> {
  const callable = httpsCallable(functions, 'sendChatMessage');
  const result = await callable(params);
  return result.data as SendMessageResponse;
}

export async function fetchEmergencyScripts(soberId: string): Promise<EmergencyScripts> {
  const callable = httpsCallable(functions, 'generateEmergencyScript');
  const result = await callable({ soberId });
  const data = result.data as EmergencyScripts & { soberId: string };
  return {
    soberScript: data.soberScript,
    caregiverScript: data.caregiverScript,
  };
}

export async function simulateLocationAlert(
  soberId: string,
  locationLabel: string,
): Promise<{ alertId: string }> {
  const callable = httpsCallable(functions, 'simulateLocationAlert');
  const result = await callable({ soberId, locationLabel });
  return result.data as { alertId: string };
}
