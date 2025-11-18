import { supabase } from "./dbUtils";
import { supabaseAdmin } from "./supabaseAdmin";
import type { User } from "@supabase/supabase-js";

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
  password: string
): Promise<AuthResult> => {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: true,
      user: data.user,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Login failed",
    };
  }
};

// Logout driver
export const logoutDriver = async (): Promise<{
  success: boolean;
  error?: string;
}> => {
  try {
    const { error } = await supabase.auth.signOut();

    if (error) {
      return {
        success: false,
        error: error.message,
      };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Logout failed",
    };
  }
};

// Get current authenticated user
export const getCurrentUser = async (): Promise<User | null> => {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user;
  } catch (error) {
    console.error("Error getting current user:", error);
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
          name: authData.name,
        },
        // Skip email verification for admin-created accounts
        emailRedirectTo: `${window.location.origin}/driver-route`,
      },
    });

    if (error) {
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: true,
      user: data.user ?? undefined,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to create driver account",
    };
  }
};

// Update driver password (called by admin)
// ⚠️ Uses admin client with service role key
export const updateDriverPassword = async (
  authUserId: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    // Use Supabase Admin API to update user password by ID
    const { error } = await supabaseAdmin.auth.admin.updateUserById(
      authUserId,
      { password: newPassword }
    );

    if (error) {
      return {
        success: false,
        error: error.message,
      };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to update password",
    };
  }
};

// Get session
export const getSession = async () => {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return session;
  } catch (error) {
    console.error("Error getting session:", error);
    return null;
  }
};

// Listen to auth state changes
export const onAuthStateChange = (callback: (user: User | null) => void) => {
  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session?.user ?? null);
  });

  return subscription;
};

export const generateRandomPassword = () => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%";
  let pwd = "";
  for (let i = 0; i < 12; i++) {
    pwd += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pwd;
};
