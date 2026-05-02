import React, {
  createContext,
  useContext,
  useState,
  useEffect
} from 'react';

import * as api from '../services/api';
import {
  getToken,
  saveToken,
  clearToken
} from '../services/auth';

const AuthContext = createContext(null);

const normalizeUser = (user) => {
  if (!user) return null;

  return {
    ...user,
    first_name:
      user.first_name ||
      user.firstName ||
      '',

    last_name:
      user.last_name ||
      user.lastName ||
      '',

    school_name:
      user.school_name ||
      user.schoolName ||
      '',

    school_logo:
      user.school_logo ||
      user.schoolLogo ||
      '',

    school_id:
      user.school_id ||
      user.schoolId ||
      null
  };
};

export function AuthProvider({
  children
}) {
  const [user, setUser] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  useEffect(() => {
    const fetchUser =
      async () => {
        const token =
          getToken();

        if (!token) {
          setLoading(false);
          return;
        }

        try {
          const response =
            await api.getProfile();

          setUser(
            normalizeUser(
              response.data
            )
          );
        } catch (error) {
          clearToken();
          setUser(null);
        } finally {
          setLoading(false);
        }
      };

    fetchUser();
  }, []);

  const login = async (
    email,
    password
  ) => {
    const response =
      await api.login({
        email,
        password
      });

    saveToken(
      response.data.token
    );

    setUser(
      normalizeUser(
        response.data.user
      )
    );

    return response.data;
  };

  const logout = () => {
    clearToken();
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context =
    useContext(
      AuthContext
    );

  if (!context) {
    throw new Error(
      'useAuth must be used within AuthProvider'
    );
  }

  return context;
}