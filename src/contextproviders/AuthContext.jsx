// src/contexts/AuthContext.jsx
import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { CognitoAuthServiceV3 as CognitoAuthService } from "../services/cognitoAuth";
import { toast } from "sonner";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [dbUser, setDbUser] = useState(null);
  const isFetching = useRef(false);
  const [initError, setInitError] = useState(false)
  const [loading, setLoading] = useState(true);
  const [loginStep, setLoginStep] = useState('initial');
  const [mfaUser, setMfaUser] = useState(null);
  const isRefreshing = useRef(false);
  const refreshPromise = useRef(null);

  useEffect(() => {
    checkCurrentUser();
  }, []);


  useEffect(() => {
    if (!user || isFetching.current === true) return;
    const pullAgentInfo = async () => {
      try {
        isFetching.current = true;
        const token = await getBearerToken();
        const result = await fetch('https://8n2m6cwkz3.execute-api.us-east-1.amazonaws.com/latest/agent/fetchconfig', {
          method: 'POST',
          headers:{
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({userId: user?.userId })
        });

        if(!result.ok){
          throw new Error('Config Error')
        }

        const _res = await result.json();

        if (_res?.success !== false) {
          setDbUser(_res?.data);
        }
        isFetching.current = false;
      } catch (error) {
        setInitError("Failed to configure, please restart your app.")
        isFetching.current = false;
      }
    }
    pullAgentInfo();
  }, [user])

  const checkCurrentUser = async () => {
    try {
      console.log('Checking for current user...');
      const result = await CognitoAuthService.getCurrentUser();

      if (result.success) {
        console.log('Current user found:', result.user);
        setUser(result.user);
      } else {
        console.log('No authenticated user found');
        setUser(null);
      }
    } catch (error) {
      console.error('Error checking current user:', error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (username, password) => {
    try {
      setLoading(true);
      console.log('Attempting login for:', username);

      const result = await CognitoAuthService.signIn(username, password);
      console.log('Login result:', result);

      if (!result.success) {
        return { success: false, error: result.error };
      }

      if (result.requiresMFA) {
        setMfaUser(result.cognitoUser);
        setLoginStep('mfa');
        return {
          success: true,
          requiresMFA: true,
          challengeName: result.challengeName
        };
      } else if (result.requiresNewPassword) {
        setMfaUser(result.cognitoUser);
        setLoginStep('new-password');
        return {
          success: true,
          requiresNewPassword: true,
          userAttributes: result.userAttributes
        };
      } else {
        setUser(result.user);
        setLoginStep('initial');
        return { success: true, complete: true };
      }
    } catch (error) {
      console.error('Login error:', error);
      return {
        success: false,
        error: error.message || 'Login failed'
      };
    } finally {
      setLoading(false);
    }
  };


  const verifyOTP = async (username, code) => {
    try {
      setLoading(true);
      console.log('Verifying MFA code');

      if (!mfaUser) {
        return { success: false, error: 'MFA session expired' };
      }

      const result = await CognitoAuthService.completeMFA(mfaUser, code);

      if (result.success) {
        setUser(result.user);
        setMfaUser(null);
        setLoginStep('initial');
        console.log('MFA verification successful');
        return { success: true };
      } else {
        return { success: false, error: result.error };
      }
    } catch (error) {
      console.error('MFA verification error:', error);
      return {
        success: false,
        error: error.message || 'Verification failed'
      };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      console.log('Logging out');
      await CognitoAuthService.signOut();
      setUser(null);
      setMfaUser(null);
      setLoginStep('initial');
      console.log('Logout successful');
    } catch (error) {
      console.error('Logout error:', error);
      // Clear state even if logout fails
      setUser(null);
      setMfaUser(null);
      setLoginStep('initial');
    }
  };

  const forgotPassword = async (username) => {
    try {
      console.log('Sending password reset for:', username);
      const result = await CognitoAuthService.forgotPassword(username);

      if (result.success) {
        console.log('Password reset code sent');
        return {
          success: true,
          message: result.message || 'Password reset code sent to your email'
        };
      } else {
        return { success: false, error: result.error };
      }
    } catch (error) {
      console.error('Forgot password error:', error);
      return {
        success: false,
        error: error.message || 'Failed to send reset code'
      };
    }
  };

  const confirmForgotPassword = async (username, code, newPassword) => {
    try {
      console.log('Confirming password reset for:', username);
      const result = await CognitoAuthService.confirmForgotPassword(username, code, newPassword);

      if (result.success) {
        console.log('Password reset successful');
        return { success: true };
      } else {
        return { success: false, error: result.error };
      }
    } catch (error) {
      console.error('Confirm password reset error:', error);
      return {
        success: false,
        error: error.message || 'Failed to reset password'
      };
    }
  };

  const refreshSession = useCallback(async () => {
  // Prevent concurrent refresh attempts
  if (isRefreshing.current) {
    console.log('Token refresh already in progress, waiting...');
    return refreshPromise.current;
  }

  isRefreshing.current = true;
  refreshPromise.current = (async () => {
    try {
      console.log('Refreshing session...');
      
      let refreshToken = user?.refreshToken;
      
      if (!refreshToken) {
        const storedTokens = CognitoAuthService.getStoredTokens();
        refreshToken = storedTokens?.refreshToken;
      }
      
      if (!refreshToken) {
        console.error('No refresh token available');
        setUser(null);
        return { success: false, error: 'No refresh token available' };
      }

      const result = await CognitoAuthService.refreshSession(refreshToken);

      if (result.success) {
        console.log('Session refresh successful');
        setUser(result.user);
        return { 
          success: true, 
          idToken: result.user.idToken 
        };
      } else {
        console.error('Session refresh failed:', result.error);
        setUser(null);
        return { success: false, error: result.error };
      }
    } catch (error) {
      console.error('Session refresh error:', error);
      setUser(null);
      return { success: false, error: error.message };
    } finally {
      isRefreshing.current = false;
      refreshPromise.current = null;
    }
  })();

  return refreshPromise.current;
},[user]);

const getBearerToken = useCallback(async () => {
  try {
    if (user?.idToken) {
      try {
        const payload = JSON.parse(atob(user.idToken.split('.')[1]));
        const expiresAt = payload.exp * 1000;
        const timeUntilExpiry = expiresAt - Date.now();

        if (timeUntilExpiry > 5 * 60 * 1000) {
          console.log('Using cached token (valid for', Math.floor(timeUntilExpiry / 60000), 'more minutes)');
          return user.idToken;
        }
        
        console.log('Token expiring soon or expired, refreshing...');
      } catch (parseError) {
        console.error('Error parsing token:', parseError);
      }
    }

    console.log('Calling refreshSession from getBearerToken');
    const result = await refreshSession();
    
    if (result.success && result.idToken) {
      console.log('Got fresh token from refresh');
      return result.idToken;
    }

    console.error('Failed to get token from refresh');
    return null;
  } catch (error) {
    console.error('Error getting bearer token:', error);
    return null;
  }
}, [user, refreshSession]);


  const value = {
    user,
    dbUser,
    loading,
    initError,
    loginStep,
    setLoginStep,
    login,
    verifyOTP,
    logout,
    forgotPassword,
    confirmForgotPassword,
    getBearerToken,
    refreshSession,
    checkCurrentUser,
    isAuthenticated: !!user
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === null) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};