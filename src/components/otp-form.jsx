// src/components/otp-form.jsx
import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";

export function OTPForm({
  className,
  onVerify,
  isVerifying,
  onBack,
  username,
  ...props
}) {
  const [otpValue, setOtpValue] = useState("");

  const handleComplete = (value) => {
    // This function will be called when all 6 digits are entered
    setOtpValue(value);
    // Automatically submit the form when all 6 digits are entered
    if (value.length === 6) {
      onVerify(value);
    }
  };

  const handleManualSubmit = () => {
    if (otpValue.length === 6) {
      onVerify(otpValue);
    }
  };

  const maskUsername = (username) => {
    if (!username) return '';
    if (username.length <= 2) return username;
    
    return username[0] + '*'.repeat(username.length - 2) + username[username.length - 1];
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader className="text-center">
          <CardTitle>Verification Code</CardTitle>
          <CardDescription>
            <div>
              Enter the six digit code sent to your device
              {username && (
                <div className="mt-2 font-medium text-foreground">
                  User: {maskUsername(username)}
                </div>
              )}
            </div>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex justify-center">
            <InputOTP
              maxLength={6}
              value={otpValue}
              onChange={setOtpValue}
              onComplete={handleComplete}
            >
              <InputOTPGroup>
                <InputOTPSlot index={0} />
                <InputOTPSlot index={1} />
                <InputOTPSlot index={2} />
                <InputOTPSlot index={3} />
                <InputOTPSlot index={4} />
                <InputOTPSlot index={5} />
              </InputOTPGroup>
            </InputOTP>
          </div>
          
          <Button
            type="button"
            className="w-full"
            disabled={isVerifying || otpValue.length !== 6}
            onClick={handleManualSubmit}
          >
            {isVerifying ? "Verifying..." : "Verify Code"}
          </Button>
          
          <div className="flex flex-col gap-2 text-center text-sm">
            <div className="text-muted-foreground">
              Didn't receive the code?
            </div>
            <Button 
              variant="link" 
              className="p-0 h-auto text-sm"
              disabled={isVerifying}
            >
              Resend code
            </Button>
          </div>
          
          {onBack && (
            <Button
              variant="outline"
              className="w-full"
              onClick={onBack}
              disabled={isVerifying}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Login
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}