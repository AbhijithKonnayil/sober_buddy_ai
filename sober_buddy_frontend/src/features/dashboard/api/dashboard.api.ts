import { collection, doc, getDoc, getDocs, orderBy, query, where } from 'firebase/firestore';
import { db } from '../../../firebase';
import type { AlertEvent, EmergencyContact, SoberProfile } from '../../../shared/types/recovery.types';

export interface DashboardData {
  soberId: string;
  profile: SoberProfile | null;
  contact: EmergencyContact | null;
  relationshipLabel: string;
  soberBuddyName: string;
  alerts: AlertEvent[];
}

export async function fetchDashboardData(
  userId: string,
  isSober: boolean,
  linkedUserIds: string[] = [],
): Promise<DashboardData> {
  let soberId = userId;
  let relationshipLabel = '';
  let soberBuddyName = '';
  const alerts: AlertEvent[] = [];

  if (!isSober) {
    if (!linkedUserIds.length) {
      return {
        soberId,
        profile: null,
        contact: null,
        relationshipLabel,
        soberBuddyName,
        alerts,
      };
    }

    soberId = linkedUserIds[0];

    const [linkSnap, buddySnap] = await Promise.all([
      getDoc(doc(db, 'links', `${soberId}_${userId}`)),
      getDoc(doc(db, 'users', soberId)),
    ]);

    if (linkSnap.exists()) {
      relationshipLabel = linkSnap.data().relationshipLabel || '';
    }
    if (buddySnap.exists()) {
      soberBuddyName = buddySnap.data().displayName || '';
    }
  }

  const [profileSnap, contactSnap] = await Promise.all([
    getDoc(doc(db, 'soberProfiles', soberId)),
    getDoc(doc(db, 'emergencyContacts', `${soberId}_primary`)),
  ]);

  try {
    const alertsQuery = await getDocs(
      query(
        collection(db, 'alertEvents'),
        where('soberId', '==', soberId),
        orderBy('createdAt', 'desc'),
      ),
    );
    alertsQuery.forEach((alertDoc) => {
      alerts.push({
        id: alertDoc.id,
        ...(alertDoc.data() as Omit<AlertEvent, 'id'>),
      });
    });
  } catch {
    // Index may not exist in local dev; alerts remain empty
  }

  return {
    soberId,
    profile: profileSnap.exists() ? (profileSnap.data() as SoberProfile) : null,
    contact: contactSnap.exists() ? (contactSnap.data() as EmergencyContact) : null,
    relationshipLabel,
    soberBuddyName,
    alerts,
  };
}
