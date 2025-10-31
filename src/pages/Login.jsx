// src/pages/Login.jsx
import { useState } from "react";
import { useAuth } from "../contextproviders/AuthContext";
import { LoginForm } from "../components/login-form";
import { OTPForm } from "../components/otp-form";
import { toast } from "sonner";

function Login() {
  const { login, forgotPassword, verifyOTP } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [awaitingOTP, setAwaitingOTP] = useState(false);
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);
  const [username, setUsername] = useState("");

  const handleLogin = async (data) => {
    setIsSubmitting(true);
    try {
      const result = await login(data.username, data.password);
      
      if (!result.success) {
        toast.error("Login failed", {
          description: result.error || "Please check your credentials and try again."
        });
      } else {
        // Store username for potential OTP verification
        setUsername(data.username);
        
        if (result.complete) {
          // Login completed successfully without additional steps
          toast.success("Login successful", {
            description: "Welcome back!"
          });
          // Navigation will be handled by the auth context/protected routes
        } else if (result.requiresMFA) {
          // Show OTP form for MFA
          setAwaitingOTP(true);
          toast.success("MFA code required", {
            description: "Please enter the verification code sent to your device."
          });
        } else if (result.requiresNewPassword) {
          // Handle new password requirement
          toast.info("New password required", {
            description: "Please contact support to set up your new password."
          });
        } else {
          // Default case - assume OTP needed (for backward compatibility)
          setAwaitingOTP(true);
          toast.success("Verification required", {
            description: "Please enter the verification code."
          });
        }
      }
    } catch (error) {
      console.error("Login error:", error);
      toast.error("Login failed", {
        description: "An unexpected error occurred."
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyOTP = async (otpCode) => {
    setIsVerifying(true);
    try {
      const result = await verifyOTP(username, otpCode);
      
      if (result.success) {
        toast.success("Verification successful", {
          description: "You are now logged in."
        });
        
        // Reset the OTP form
        setAwaitingOTP(false);
        setUsername("");
        
      } else {
        toast.error("Verification failed", {
          description: result.error || "Invalid verification code."
        });
      }
    } catch (error) {
      console.error("Verification error:", error);
      toast.error("Verification failed", {
        description: "An unexpected error occurred."
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleForgotPassword = async (username) => {
    try {
      const result = await forgotPassword(username);
      if (result.success) {
        toast.success("Password reset link sent", {
          description: result.message || "Please check your email for instructions."
        });
        setForgotPasswordOpen(false);
      } else {
        toast.error("Failed to send reset link", {
          description: result.error
        });
      }
    } catch (error) {
      console.error("Forgot password error:", error);
      toast.error("Error", {
        description: "An unexpected error occurred."
      });
    }
  };

  const handleBackToLogin = () => {
    setAwaitingOTP(false);
    setUsername("");
  };

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        {!awaitingOTP ? (
          <LoginForm
            onSubmit={handleLogin}
            isSubmitting={isSubmitting}
            onForgotPasswordClick={() => setForgotPasswordOpen(true)}
            forgotPasswordOpen={forgotPasswordOpen}
            setForgotPasswordOpen={setForgotPasswordOpen}
            onForgotPasswordSubmit={handleForgotPassword}
          />
        ) : (
          <OTPForm
            onVerify={handleVerifyOTP}
            isVerifying={isVerifying}
            onBack={handleBackToLogin}
            username={username}
          />
        )}
      </div>
    </div>
  );
}

export default Login;