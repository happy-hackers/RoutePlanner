import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
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
    console.log('[DEBUG] AuthContext.loadDispatcher: Starting...', {
      userId: authUser.id,
      userEmail: authUser.email,
      timestamp: new Date().toISOString()
    });

    try {
      const dispatcherData = await getDispatcherByAuthId(authUser.id);
      console.log('[DEBUG] AuthContext.loadDispatcher: Got dispatcher data:', {
        hasData: !!dispatcherData,
        dispatcherId: dispatcherData?.id,
        dispatcherName: dispatcherData?.name
      });
      setDispatcher(dispatcherData);
    } catch (error) {
      console.error('[DEBUG] AuthContext.loadDispatcher: Error occurred:', {
        error,
        errorMessage: error instanceof Error ? error.message : String(error),
        userId: authUser.id
      });
      setDispatcher(null);
    }
  };

  const refreshDispatcher = async () => {
    if (user) {
      await loadDispatcher(user);
    }
  };

  useEffect(() => {
    console.log('[DEBUG] AuthContext: useEffect mounting, checking current session...');

    // Check current session on mount
    getCurrentUser().then((currentUser) => {
      console.log('[DEBUG] AuthContext: getCurrentUser result:', {
        hasUser: !!currentUser,
        userId: currentUser?.id,
        userEmail: currentUser?.email
      });

      setUser(currentUser);
      if (currentUser) {
        loadDispatcher(currentUser);
      }
      setLoading(false);
    }).catch((error) => {
      console.error('[DEBUG] AuthContext: getCurrentUser error:', {
        error,
        errorMessage: error instanceof Error ? error.message : String(error)
      });
      setLoading(false);
    });

    // Listen for auth state changes
    console.log('[DEBUG] AuthContext: Setting up auth state change listener');
    const subscription = onAuthStateChange((authUser) => {
      console.log('[DEBUG] AuthContext: Auth state changed:', {
        hasUser: !!authUser,
        userId: authUser?.id,
        userEmail: authUser?.email
      });

      setUser(authUser);
      if (authUser) {
        loadDispatcher(authUser);
      } else {
        console.log('[DEBUG] AuthContext: No user, clearing dispatcher');
        setDispatcher(null);
      }
      setLoading(false);
    });

    return () => {
      console.log('[DEBUG] AuthContext: Cleaning up auth subscription');
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
