import {
  CognitoIdentityProviderClient,
  InitiateAuthCommand,
  RespondToAuthChallengeCommand,
  ForgotPasswordCommand,
  ConfirmForgotPasswordCommand,
  GetUserCommand
} from "@aws-sdk/client-cognito-identity-provider";

const client = new CognitoIdentityProviderClient({
  region: "us-east-1"
});

const CLIENT_ID = "5frmk7e0mjhh529bnoqgab2hfm";
const USER_POOL_ID = "us-east-1_XMv5aTHBv";

// Simple session storage for tokens
const TOKEN_STORAGE_KEY = 'cognito_tokens';

export class CognitoAuthServiceV3 {
  
  // Store tokens in localStorage
  static storeTokens(tokens) {
    localStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(tokens));
  }

  // Get stored tokens
  static getStoredTokens() {
    try {
      const stored = localStorage.getItem(TOKEN_STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      return null;
    }
  }

  // Clear stored tokens
  static clearTokens() {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
  }

  // Sign in with username/password
  static async signIn(username, password) {
    try {
      const command = new InitiateAuthCommand({
        AuthFlow: "USER_PASSWORD_AUTH",
        ClientId: CLIENT_ID,
        AuthParameters: {
          USERNAME: username,
          PASSWORD: password
        }
      });

      const result = await client.send(command);

      if (result.ChallengeName) {
        // MFA or other challenge required
        return {
          success: true,
          requiresMFA: true,
          challengeName: result.ChallengeName,
          session: result.Session,
          challengeParameters: result.ChallengeParameters
        };
      }

      if (result.AuthenticationResult) {
        const tokens = {
          accessToken: result.AuthenticationResult.AccessToken,
          idToken: result.AuthenticationResult.IdToken,
          refreshToken: result.AuthenticationResult.RefreshToken,
          expiresIn: result.AuthenticationResult.ExpiresIn
        };

        this.storeTokens(tokens);

        // Parse user info from ID token
        const userInfo = this.parseJWT(tokens.idToken);

        return {
          success: true,
          user: {
            username: userInfo['cognito:username'],
            email: userInfo.email,
            name: userInfo.name || userInfo.email,
            userId: userInfo.sub,
            ...tokens
          }
        };
      }

      return { success: false, error: 'Unknown authentication state' };

    } catch (error) {
      let errorMessage = 'Login failed';
      
      switch (error.name) {
        case 'NotAuthorizedException':
          errorMessage = 'Invalid username or password';
          break;
        case 'UserNotFoundException':
          errorMessage = 'User not found';
          break;
        case 'UserNotConfirmedException':
          errorMessage = 'Please verify your email address';
          break;
        case 'TooManyRequestsException':
          errorMessage = 'Too many attempts. Please try again later';
          break;
        default:
          errorMessage = error.message || 'Login failed';
      }

      return { success: false, error: errorMessage };
    }
  }

  // Complete MFA challenge
  static async completeMFA(session, mfaCode, challengeName) {
    try {
      let challengeResponses = {};
      
      if (challengeName === 'SMS_MFA') {
        challengeResponses['SMS_MFA_CODE'] = mfaCode;
      } else if (challengeName === 'SOFTWARE_TOKEN_MFA') {
        challengeResponses['SOFTWARE_TOKEN_MFA_CODE'] = mfaCode;
      }

      const command = new RespondToAuthChallengeCommand({
        ClientId: CLIENT_ID,
        ChallengeName: challengeName,
        Session: session,
        ChallengeResponses: challengeResponses
      });

      const result = await client.send(command);

      if (result.AuthenticationResult) {
        const tokens = {
          accessToken: result.AuthenticationResult.AccessToken,
          idToken: result.AuthenticationResult.IdToken,
          refreshToken: result.AuthenticationResult.RefreshToken,
          expiresIn: result.AuthenticationResult.ExpiresIn
        };

        this.storeTokens(tokens);

        const userInfo = this.parseJWT(tokens.idToken);

        return {
          success: true,
          user: {
            username: userInfo['cognito:username'],
            email: userInfo.email,
            name: userInfo.name || userInfo.email,
            userId: userInfo.sub,
            ...tokens
          }
        };
      }

      return { success: false, error: 'MFA verification failed' };

    } catch (error) {
      let errorMessage = 'MFA verification failed';
      
      switch (error.name) {
        case 'CodeMismatchException':
          errorMessage = 'Invalid verification code';
          break;
        case 'ExpiredCodeException':
          errorMessage = 'Verification code has expired';
          break;
        default:
          errorMessage = error.message || 'MFA verification failed';
      }

      return { success: false, error: errorMessage };
    }
  }

  // Get current user from stored tokens
  static async getCurrentUser() {
    try {
      const tokens = this.getStoredTokens();
      
      if (!tokens || !tokens.accessToken) {
        return { success: false, error: null };
      }

      // Check if token is expired (simple check)
      const tokenPayload = this.parseJWT(tokens.idToken);
      const now = Math.floor(Date.now() / 1000);
      
      if (tokenPayload.exp < now) {
        // Token expired, try to refresh
        if (tokens.refreshToken) {
          const refreshResult = await this.refreshSession(tokens.refreshToken);
          if (refreshResult.success) {
            return {
              success: true,
              user: refreshResult.user
            };
          }
        }
        
        this.clearTokens();
        return { success: false, error: 'Token expired' };
      }

      return {
        success: true,
        user: {
          username: tokenPayload['cognito:username'],
          email: tokenPayload.email,
          name: tokenPayload.name || tokenPayload.email,
          userId: tokenPayload.sub,
          ...tokens
        }
      };

    } catch (error) {
      console.error('getCurrentUser error:', error);
      return { success: false, error: error.message };
    }
  }

  // Sign out
  static async signOut() {
    this.clearTokens();
    return { success: true };
  }

  // Forgot password
  static async forgotPassword(username) {
    try {
      const command = new ForgotPasswordCommand({
        ClientId: CLIENT_ID,
        Username: username
      });

      await client.send(command);

      return {
        success: true,
        message: 'Password reset code sent to your email'
      };

    } catch (error) {
      let errorMessage = 'Failed to send reset code';
      
      switch (error.name) {
        case 'UserNotFoundException':
          errorMessage = 'User not found';
          break;
        case 'TooManyRequestsException':
          errorMessage = 'Too many requests. Please try again later';
          break;
        default:
          errorMessage = error.message || 'Failed to send reset code';
      }

      return { success: false, error: errorMessage };
    }
  }

  // Confirm forgot password
  static async confirmForgotPassword(username, confirmationCode, newPassword) {
    try {
      const command = new ConfirmForgotPasswordCommand({
        ClientId: CLIENT_ID,
        Username: username,
        ConfirmationCode: confirmationCode,
        Password: newPassword
      });

      await client.send(command);
      return { success: true };

    } catch (error) {
      let errorMessage = 'Failed to reset password';
      
      switch (error.name) {
        case 'CodeMismatchException':
          errorMessage = 'Invalid reset code';
          break;
        case 'ExpiredCodeException':
          errorMessage = 'Reset code has expired';
          break;
        case 'InvalidPasswordException':
          errorMessage = 'Password does not meet requirements';
          break;
        default:
          errorMessage = error.message || 'Failed to reset password';
      }

      return { success: false, error: errorMessage };
    }
  }

  // Parse JWT token (simple implementation)
  static parseJWT(token) {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
      
      return JSON.parse(jsonPayload);
    } catch (error) {
      console.error('Error parsing JWT:', error);
      return {};
    }
  }

  // Refresh session (simplified)
  static async refreshSession(refreshToken) {
    try {
      const command = new InitiateAuthCommand({
        AuthFlow: "REFRESH_TOKEN_AUTH",
        ClientId: CLIENT_ID,
        AuthParameters: {
          REFRESH_TOKEN: refreshToken
        }
      });

      const result = await client.send(command);

      if (result.AuthenticationResult) {
        const tokens = {
          accessToken: result.AuthenticationResult.AccessToken,
          idToken: result.AuthenticationResult.IdToken,
          refreshToken: refreshToken, // Keep the same refresh token
          expiresIn: result.AuthenticationResult.ExpiresIn
        };

        this.storeTokens(tokens);

        const userInfo = this.parseJWT(tokens.idToken);

        return {
          success: true,
          user: {
            username: userInfo['cognito:username'],
            email: userInfo.email,
            name: userInfo.name || userInfo.email,
            userId: userInfo.sub,
            ...tokens
          }
        };
      }

      return { success: false, error: 'Token refresh failed' };

    } catch (error) {
      console.error('Token refresh error:', error);
      this.clearTokens();
      return { success: false, error: error.message };
    }
  }
}