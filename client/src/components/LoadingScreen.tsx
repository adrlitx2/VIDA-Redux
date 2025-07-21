import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";

interface LoadingScreenProps {
  message?: string;
  redirectTo?: string;
}

export function LoadingScreen({ message = "Loading your dashboard...", redirectTo = "/dashboard" }: LoadingScreenProps) {
  const { user, isLoading } = useAuth();
  const [_, setLocation] = useLocation();
  const [dots, setDots] = useState("");

  // Animated dots effect
  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? "" : prev + ".");
    }, 500);
    return () => clearInterval(interval);
  }, []);

  // Redirect when user is authenticated
  useEffect(() => {
    if (!isLoading && user) {
      setTimeout(() => {
        setLocation(redirectTo);
      }, 1000);
    }
  }, [user, isLoading, redirectTo, setLocation]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background">
      <div className="text-center space-y-6">
        {/* Animated VIDA³ Logo */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-500 via-blue-400 to-green-300 bg-clip-text text-transparent animate-pulse">
            VIDA³
          </h1>
        </div>

        {/* Loading Spinner */}
        <div className="relative">
          <div className="w-16 h-16 border-4 border-surface rounded-full animate-spin border-t-primary"></div>
          <div className="absolute inset-0 w-16 h-16 border-4 border-surface rounded-full animate-ping opacity-20 border-t-primary"></div>
        </div>

        {/* Loading Message */}
        <div className="space-y-2">
          <p className="text-lg font-medium text-foreground">
            {message}{dots}
          </p>
          <p className="text-sm text-muted-foreground">
            Setting up your personalized experience
          </p>
        </div>

        {/* Progress Indicators */}
        <div className="flex space-x-2 justify-center">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-2 h-2 rounded-full bg-primary animate-pulse"
              style={{
                animationDelay: `${i * 0.2}s`,
                animationDuration: '1s'
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}