import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut 
} from 'firebase/auth';
import type { User } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../../firebase';

export interface UserDocument {
  email: string;
  role: 'sober' | 'caregiver';
  displayName: string;
  onboardingComplete: boolean;
  linkedUserIds: string[];
}

interface AuthContextType {
  user: User | null;
  userDoc: UserDocument | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName: string, role: 'sober' | 'caregiver') => Promise<void>;
  logout: () => Promise<void>;
  refreshUserDoc: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userDoc, setUserDoc] = useState<UserDocument | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserDoc = async (uid: string): Promise<UserDocument | null> => {
    try {
      const docRef = doc(db, 'users', uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return docSnap.data() as UserDocument;
      }
    } catch (error) {
      console.error('Error fetching user document:', error);
    }
    return null;
  };

  const refreshUserDoc = async () => {
    if (user) {
      const docData = await fetchUserDoc(user.uid);
      setUserDoc(docData);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const docData = await fetchUserDoc(currentUser.uid);
        setUserDoc(docData);
      } else {
        setUserDoc(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      setLoading(false);
      throw error;
    }
  };

  const register = async (
    email: string, 
    password: string, 
    displayName: string, 
    role: 'sober' | 'caregiver'
  ) => {
    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const newUser = userCredential.user;
      
      const newDoc: UserDocument = {
        email,
        displayName,
        role,
        onboardingComplete: false,
        linkedUserIds: []
      };

      await setDoc(doc(db, 'users', newUser.uid), {
        ...newDoc,
        createdAt: serverTimestamp()
      });

      setUserDoc(newDoc);
    } catch (error) {
      setLoading(false);
      throw error;
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await signOut(auth);
    } catch (error) {
      setLoading(false);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ user, userDoc, loading, login, register, logout, refreshUserDoc }}>
      {children}
    </AuthContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
