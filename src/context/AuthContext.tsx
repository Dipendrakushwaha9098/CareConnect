import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { fetchCurrentUser } from "@/lib/api";

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: "admin" | "doctor" | "patient";
  verificationStatus?: "PENDING" | "VERIFIED" | "REJECTED";
  isEmailVerified?: boolean;
  status?: "Active" | "Suspended";
  token?: string;
  doctorProfile?: any;
  patientId?: string;
}

interface AuthContextType {
  user: User | null;
  login: (userData: User) => void;
  logout: () => void;
  refreshUser: () => Promise<void>;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem("careConnect_user");
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const stored = localStorage.getItem("careConnect_user");
      if (!stored) {
        setIsLoading(false);
        return;
      }

      const parsed: User = JSON.parse(stored);
      if (!parsed.token) {
        logout();
        setIsLoading(false);
        return;
      }

      const res = await fetchCurrentUser();
      if (res && res.success && res.user) {
        const updatedUser: User = {
          ...res.user,
          token: parsed.token,
        };
        setUser(updatedUser);
        localStorage.setItem("careConnect_user", JSON.stringify(updatedUser));
      } else {
        logout();
      }
    } catch (err) {
      console.warn("Session re-verification failed; logging out:", err);
      logout();
    } finally {
      setIsLoading(false);
    }
  }, [logout]);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = (userData: User) => {
    setUser(userData);
    localStorage.setItem("careConnect_user", JSON.stringify(userData));
  };

  const value = {
    user,
    login,
    logout,
    refreshUser,
    isAuthenticated: !!user,
    isLoading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
