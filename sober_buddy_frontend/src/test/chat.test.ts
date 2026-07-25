import { describe, expect, it, vi } from 'vitest';
import { chatService } from '../shared/services/chat.service';

// Mock firestore methods
vi.mock('firebase/firestore', () => {
  return {
    collection: vi.fn(),
    doc: vi.fn(),
    getDoc: vi.fn().mockResolvedValue({
      exists: () => true,
      data: () => ({ substance: 'alcohol', copingStrategies: ['walk'] })
    }),
    addDoc: vi.fn().mockResolvedValue({ id: 'mock_doc_id' }),
    updateDoc: vi.fn().mockResolvedValue({}),
    query: vi.fn(),
    where: vi.fn(),
    orderBy: vi.fn(),
    limit: vi.fn(),
    getDocs: vi.fn().mockResolvedValue({
      empty: true,
      docs: []
    }),
    onSnapshot: vi.fn(),
    serverTimestamp: vi.fn().mockReturnValue('mock_timestamp'),
    getFirestore: vi.fn().mockReturnValue({}),
    connectFirestoreEmulator: vi.fn(),
    Timestamp: {
      now: vi.fn()
    }
  };
});

// Mock firebase
vi.mock('../../firebase', () => {
  return {
    db: {}
  };
});

describe('chatService client functions', () => {
  it('creates active session if none is found', async () => {
    const sessionId = await chatService.getOrCreateActiveSession('user123', 'sober');
    expect(sessionId).toBe('mock_doc_id');
  });

  it('runs sendMessage successfully', async () => {
    await expect(chatService.sendMessage('session123', 'user', 'hello')).resolves.not.toThrow();
  });
});
