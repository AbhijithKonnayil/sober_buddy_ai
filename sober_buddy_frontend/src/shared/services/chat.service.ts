import { 
  collection, 
  doc, 
  getDoc,
  addDoc, 
  updateDoc, 
  query, 
  where, 
  orderBy, 
  limit, 
  getDocs, 
  onSnapshot, 
  serverTimestamp, 
  Timestamp 
} from 'firebase/firestore';
import { db } from '../../firebase';

export interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  transcript: string;
  timestamp: Timestamp | null;
  riskFlag: 'none' | 'low' | 'medium' | 'high';
  matchedTriggers: string[];
}

export const chatService = {
  /**
   * Retrieves the most recent chat session or creates a new one
   */
  async getOrCreateActiveSession(userId: string, role: 'sober' | 'caregiver'): Promise<string> {
    const sessionsRef = collection(db, 'chatSessions');
    const q = query(
      sessionsRef,
      where('userId', '==', userId),
      where('role', '==', role),
      orderBy('startedAt', 'desc'),
      limit(1)
    );

    try {
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        const docSnap = querySnapshot.docs[0];
        const data = docSnap.data();
        const startedAt = data.startedAt as Timestamp;
        
        // If the session was started within the last 12 hours, reuse it
        const twelveHoursAgo = Date.now() - 12 * 60 * 60 * 1000;
        if (startedAt && startedAt.toMillis() > twelveHoursAgo) {
          return docSnap.id;
        }
      }

      // Otherwise, create a new session
      const newSessionRef = await addDoc(sessionsRef, {
        userId,
        role,
        startedAt: serverTimestamp(),
        lastMessageAt: serverTimestamp(),
        highestRiskFlag: 'none'
      });
      return newSessionRef.id;
    } catch (error) {
      console.error('Error getting or creating chat session:', error);
      // Fallback local ID if firebase write fails
      return 'local_session_' + Date.now();
    }
  },

  /**
   * Sends a message in the specified session
   */
  async sendMessage(
    sessionId: string, 
    sender: 'user' | 'ai', 
    text: string, 
    riskFlag: 'none' | 'low' | 'medium' | 'high' = 'none',
    matchedTriggers: string[] = []
  ): Promise<void> {
    try {
      const messagesRef = collection(db, 'chatSessions', sessionId, 'messages');
      await addDoc(messagesRef, {
        sender,
        transcript: text,
        timestamp: serverTimestamp(),
        riskFlag,
        matchedTriggers
      });

      // Update the parent session's timestamp
      const sessionDocRef = doc(db, 'chatSessions', sessionId);
      await updateDoc(sessionDocRef, {
        lastMessageAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error sending message to Firestore:', error);
    }
  },

  /**
   * Subscribes to real-time updates of messages in a session
   */
  subscribeToMessages(sessionId: string, onUpdate: (messages: ChatMessage[]) => void) {
    const messagesRef = collection(db, 'chatSessions', sessionId, 'messages');
    const q = query(messagesRef, orderBy('timestamp', 'asc'));

    return onSnapshot(q, (snapshot) => {
      const messages: ChatMessage[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        messages.push({
          id: docSnap.id,
          sender: data.sender,
          transcript: data.transcript || '',
          timestamp: data.timestamp,
          riskFlag: data.riskFlag || 'none',
          matchedTriggers: data.matchedTriggers || []
        });
      });
      onUpdate(messages);
    }, (error) => {
      console.error('Error subscribing to messages:', error);
    });
  },

  /**
   * Trigger a client-side simulated AI response if no backend is writing.
   * This checks if the last message in the thread is from the user after 3 seconds,
   * and if so, writes an AI response.
   */
  async triggerDemoFallbackReply(sessionId: string, userMessageText: string, soberId: string) {
    // Wait 3.5 seconds to see if a backend writes a reply
    setTimeout(async () => {
      try {
        const messagesRef = collection(db, 'chatSessions', sessionId, 'messages');
        const q = query(messagesRef, orderBy('timestamp', 'desc'), limit(1));
        const snap = await getDocs(q);
        
        if (!snap.empty) {
          const lastMsg = snap.docs[0].data();
          
          // If the last message is still the user's message, simulate the AI writing
          if (lastMsg.sender === 'user') {
            // Fetch Sober profile to personalize the reply
            let substance = 'substances';
            let coping = 'taking a deep breath';
            
            const profileSnap = await getDoc(doc(db, 'soberProfiles', soberId));
            if (profileSnap.exists()) {
              const data = profileSnap.data();
              substance = data.substance || 'substances';
              if (data.copingStrategies && data.copingStrategies.length > 0) {
                // Map internal values to readable labels
                const copingMap: Record<string, string> = {
                  call: 'calling a supportive buddy',
                  walk: 'going for a walk',
                  music: 'listening to music',
                  meditate: 'practicing meditation',
                  journal: 'journaling',
                  prayer: 'prayer',
                  ai: 'talking to me'
                };
                coping = copingMap[data.copingStrategies[0]] || data.copingStrategies[0];
              }
            }

            // Simple rules-based conversational router for demo response
            let aiText = '';
            const lowerText = userMessageText.toLowerCase();

            if (lowerText.includes('craving') || lowerText.includes('drink') || lowerText.includes('use') || lowerText.includes('smoke')) {
              aiText = `I hear you, and it takes courage to speak up when a craving hits. Since you are recovering from ${substance}, cravings can feel intense right now, but they usually peak within 15 minutes. Remember your plan: you mentioned that ${coping} helps. Want to try that first, or should we contact your crisis support?`;
            } else if (lowerText.includes('stress') || lowerText.includes('work') || lowerText.includes('pressure') || lowerText.includes('anxious')) {
              aiText = `Stress is a major trigger for you. Let's take a pause. In your onboarding, you noted that ${coping} works well for stress relief. Let's step away from the immediate environment for 5 minutes and focus on your recovery.`;
            } else if (lowerText.includes('lonely') || lowerText.includes('sad') || lowerText.includes('depressed')) {
              aiText = `Loneliness can make recovery feel isolating, but you aren't alone. I am here with you, and we can also check in with your primary emergency contact if you want to reach out to a human friend. Let's start with ${coping}.`;
            } else {
              aiText = `Thank you for sharing that with me. Grounding yourself in the present moment is a great recovery practice. Let's continue working on your recovery goals today!`;
            }

            await this.sendMessage(sessionId, 'ai', aiText);
          }
        }
      } catch (err) {
        console.error('Error writing fallback AI message:', err);
      }
    }, 3500);
  }
};
export default chatService;
