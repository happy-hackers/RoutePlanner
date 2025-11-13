import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';
import type { Dispatcher } from '../types/dispatchers';
import { getCurrentUser, onAuthStateChange } from '../utils/authUtils';
import { getDispatcherByAuthId } from '../utils/dbUtils';

interface AuthContextType {
  user: User | null;
  dispatcher: Dispatcher | null;
  loading: boolean;
  refreshDispatcher: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [dispatcher, setDispatcher] = useState<Dispatcher | null>(null);
  const [loading, setLoading] = useState(true);

  const loadDispatcher = async (authUser: User) => {
    try {
      const dispatcherData = await getDispatcherByAuthId(authUser.id);
      setDispatcher(dispatcherData);
    } catch (error) {
      setDispatcher(null);
    }
  };

  const refreshDispatcher = async () => {
    if (user) {
      await loadDispatcher(user);
    }
  };

  useEffect(() => {
    // Check current session on mount
    getCurrentUser().then((currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        loadDispatcher(currentUser);
      }
      setLoading(false);
    }).catch(() => {
      setLoading(false);
    });

    // Listen for auth state changes
    const subscription = onAuthStateChange((authUser) => {
      setUser(authUser);
      if (authUser) {
        loadDispatcher(authUser);
      } else {
        setDispatcher(null);
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, dispatcher, loading, refreshDispatcher }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
