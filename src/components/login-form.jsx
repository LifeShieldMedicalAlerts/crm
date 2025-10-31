// src/components/login-form.jsx
import { useState } from "react";
import { GalleryVerticalEnd } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function LoginForm({
  className,
  onSubmit,
  isSubmitting,
  onForgotPasswordClick,
  forgotPasswordOpen,
  setForgotPasswordOpen,
  onForgotPasswordSubmit,
  ...props
}) {
  const [formData, setFormData] = useState({
    username: "",
    password: ""
  });
  const [forgotUsername, setForgotUsername] = useState("");
  const [errors, setErrors] = useState({});

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ""
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    // Username validation
    if (!formData.username) {
      newErrors.username = "Username is required";
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = "Password is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (validateForm()) {
      onSubmit(formData);
    }
  };

  const handleForgotPasswordSubmit = (e) => {
    e.preventDefault();
    if (forgotUsername) {
      onForgotPasswordSubmit(forgotUsername);
    }
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <form onSubmit={handleSubmit}>
        <div className="flex flex-col gap-6">
          <div className="flex flex-col items-center gap-2">
            <a href="#" className="flex flex-col items-center gap-2 font-medium">
              <div className="flex size-8 items-center justify-center rounded-md">
                <GalleryVerticalEnd className="size-6" />
              </div>
              <span className="sr-only">Acme Inc.</span>
            </a>
            <h1 className="text-xl font-bold">Welcome Back!</h1>
            <div className="text-center text-sm">
              Let's Go Save Some Lives.
            </div>
          </div>
          
          <div className="flex flex-col gap-6">
            <div className="grid gap-6">
              <div className="grid gap-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  name="username"
                  type="text"
                  placeholder="Enter your username"
                  value={formData.username}
                  onChange={handleInputChange}
                  className={errors.username ? "border-red-500" : ""}
                  required
                />
                {errors.username && (
                  <p className="text-sm text-red-500">{errors.username}</p>
                )}
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className={errors.password ? "border-red-500" : ""}
                  required
                />
                {errors.password && (
                  <p className="text-sm text-red-500">{errors.password}</p>
                )}
              </div>
            </div>
            
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Signing In..." : "Login"}
            </Button>
            
            <div className="flex flex-col gap-2 text-center text-sm">
              <Dialog open={forgotPasswordOpen} onOpenChange={setForgotPasswordOpen}>
                <DialogTrigger asChild>
                  <Button variant="link" className="p-0 h-auto text-sm">
                    Forgot your password?
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Reset Password</DialogTitle>
                    <DialogDescription>
                      Enter your username and we'll send you a link to reset your password.
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleForgotPasswordSubmit} className="space-y-4">
                    <div className="grid gap-2">
                      <Label htmlFor="forgot-username">Username</Label>
                      <Input
                        id="forgot-username"
                        type="text"
                        placeholder="Enter your username"
                        value={forgotUsername}
                        onChange={(e) => setForgotUsername(e.target.value)}
                        required
                      />
                    </div>
                    <Button type="submit" className="w-full">
                      Send Reset Link
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
              
              <div className="text-muted-foreground text-xs">
                Don't have an account? Contact your administrator.
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}