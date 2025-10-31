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

  const getBearerToken = async () => {
    try {
      if (user && user.idToken) { 
        return user.idToken;
      }

      const result = await CognitoAuthService.refreshSession();
      if (result.success) {
        return result.idToken; 
      }

      return null;
    } catch (error) {
      console.error('Error getting bearer token:', error);
      return null;
    }
  };

  const refreshSession = async () => {
    try {
      console.log('Refreshing session...');
      const result = await CognitoAuthService.refreshSession();

      if (result.success) {
        setUser(prevUser => ({
          ...prevUser,
          accessToken: result.accessToken,
          idToken: result.idToken
        }));
        return { success: true };
      } else {
        setUser(null);
        return { success: false, error: result.error };
      }
    } catch (error) {
      console.error('Session refresh error:', error);
      setUser(null);
      return { success: false, error: error.message };
    }
  };

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