import { supabase } from './dbUtils';
import type { User, AuthError } from '@supabase/supabase-js';
import type { Dispatcher } from '../types/dispatchers';

export interface AuthResult {
  success: boolean;
  user?: User;
  error?: string;
}

export interface DriverAuthData {
  email: string;
  password: string;
  dispatcherId: number;
  name: string;
}

// Login driver with email and password
export const loginDriver = async (
  email: string,
  password: string,
  rememberMe: boolean = false
): Promise<AuthResult> => {
  console.log('[DEBUG] authUtils.loginDriver: Starting login...', {
    email,
    rememberMe,
    timestamp: new Date().toISOString()
  });

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
      options: {
        // If remember me is checked, session persists for 30 days, otherwise 24 hours
        ...(rememberMe && {
          data: {
            remember_me: true
          }
        })
      }
    });

    console.log('[DEBUG] authUtils.loginDriver: Sign in result:', {
      hasData: !!data,
      hasUser: !!data?.user,
      hasSession: !!data?.session,
      userId: data?.user?.id,
      userEmail: data?.user?.email,
      hasError: !!error,
      errorMessage: error?.message,
      errorStatus: error?.status
    });

    if (error) {
      console.error('[DEBUG] authUtils.loginDriver: Login error:', {
        error,
        message: error.message,
        status: error.status,
        name: error.name
      });
      return {
        success: false,
        error: error.message
      };
    }

    console.log('[DEBUG] authUtils.loginDriver: Login successful');
    return {
      success: true,
      user: data.user
    };
  } catch (error) {
    console.error('[DEBUG] authUtils.loginDriver: Exception caught:', {
      error,
      errorMessage: error instanceof Error ? error.message : String(error)
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Login failed'
    };
  }
};

// Logout driver
export const logoutDriver = async (): Promise<{ success: boolean; error?: string }> => {
  try {
    const { error } = await supabase.auth.signOut();

    if (error) {
      return {
        success: false,
        error: error.message
      };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Logout failed'
    };
  }
};

// Get current authenticated user
export const getCurrentUser = async (): Promise<User | null> => {
  console.log('[DEBUG] authUtils.getCurrentUser: Starting...');

  try {
    const { data: { user }, error } = await supabase.auth.getUser();

    console.log('[DEBUG] authUtils.getCurrentUser: Result:', {
      hasUser: !!user,
      userId: user?.id,
      userEmail: user?.email,
      hasError: !!error,
      errorMessage: error?.message
    });

    if (error) {
      console.error('[DEBUG] authUtils.getCurrentUser: Error:', {
        error,
        message: error.message
      });
    }

    return user;
  } catch (error) {
    console.error('[DEBUG] authUtils.getCurrentUser: Exception:', {
      error,
      errorMessage: error instanceof Error ? error.message : String(error)
    });
    return null;
  }
};

// Check if user is authenticated
export const isAuthenticated = async (): Promise<boolean> => {
  const user = await getCurrentUser();
  return user !== null;
};

// Create driver auth account (called by admin)
export const createDriverAuth = async (
  authData: DriverAuthData
): Promise<AuthResult> => {
  try {
    const { data, error } = await supabase.auth.signUp({
      email: authData.email,
      password: authData.password,
      options: {
        data: {
          dispatcher_id: authData.dispatcherId,
          name: authData.name
        },
        // Skip email verification for admin-created accounts
        emailRedirectTo: `${window.location.origin}/driver-route`
      }
    });

    if (error) {
      return {
        success: false,
        error: error.message
      };
    }

    return {
      success: true,
      user: data.user ?? undefined
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create driver account'
    };
  }
};

// Update driver password (called by admin)
export const updateDriverPassword = async (
  userId: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    // Note: This requires the user to be logged in
    // For admin to reset another user's password, we'd need the admin API
    // For now, this is a placeholder - you may need to implement password reset via email

    const { error } = await supabase.auth.updateUser({
      password: newPassword
    });

    if (error) {
      return {
        success: false,
        error: error.message
      };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update password'
    };
  }
};

// Get session
export const getSession = async () => {
  console.log('[DEBUG] authUtils.getSession: Starting...');

  try {
    const { data: { session }, error } = await supabase.auth.getSession();

    console.log('[DEBUG] authUtils.getSession: Result:', {
      hasSession: !!session,
      hasAccessToken: !!session?.access_token,
      userId: session?.user?.id,
      userEmail: session?.user?.email,
      expiresAt: session?.expires_at,
      hasError: !!error,
      errorMessage: error?.message
    });

    if (error) {
      console.error('[DEBUG] authUtils.getSession: Error:', {
        error,
        message: error.message
      });
    }

    return session;
  } catch (error) {
    console.error('[DEBUG] authUtils.getSession: Exception:', {
      error,
      errorMessage: error instanceof Error ? error.message : String(error)
    });
    return null;
  }
};

// Listen to auth state changes
export const onAuthStateChange = (callback: (user: User | null) => void) => {
  const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session?.user ?? null);
  });

  return subscription;
};
