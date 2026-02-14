import React, { useContext, useState, createContext } from 'react';
import { apiEndpoints } from '../config/api';

// Create Auth context
const AuthContext = createContext();

// Custom hook to access the context
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// AuthProvider component to wrap your app
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Real login function connected to backend
  const login = async (email, password) => {
    setIsLoading(true);
    try {
      const response = await fetch(apiEndpoints.login, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setUser(data.user);
        setIsAuthenticated(true);
        localStorage.setItem('userData', JSON.stringify(data.user));
        localStorage.setItem('authToken', data.token);
        return { success: true, user: data.user };
      } else {
        return { success: false, message: data.message || 'Login failed' };
      }
    } catch (error) {
      return { success: false, message: 'Network error' };
    } finally {
      setIsLoading(false);
    }
  };

  // Real signup function connected to backend
  const signup = async (userData) => {
    setIsLoading(true);
    try {
      const response = await fetch(apiEndpoints.signup, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setUser(data.user);
        setIsAuthenticated(true);
        localStorage.setItem('userData', JSON.stringify(data.user));
        localStorage.setItem('authToken', data.token);
        return { success: true, user: data.user };
      } else {
        return { success: false, message: data.message || 'Signup failed' };
      }
    } catch (error) {
      return { success: false, message: 'Network error' };
    } finally {
      setIsLoading(false);
    }
  };

  // Logout function
  const logout = () => {
    setUser(null);
    setIsAuthenticated(false);
    localStorage.removeItem('userData');
    localStorage.removeItem('authToken');
  };

  // Load from localStorage on first load
  React.useEffect(() => {
    const savedUser = localStorage.getItem('userData');
    const authToken = localStorage.getItem('authToken');

    if (savedUser && authToken) {
      setUser(JSON.parse(savedUser));
      setIsAuthenticated(true);
    }
  }, []);

  return (
    <AuthContext.Provider value={{ 
      user, 
      isAuthenticated, 
      isLoading,
      login, 
      signup,
      logout 
    }}>
      {children}
    </AuthContext.Provider>
  );
}