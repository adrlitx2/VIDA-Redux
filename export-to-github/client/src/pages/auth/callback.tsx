import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";

export default function AuthCallback() {
  const [location, setLocation] = useLocation();
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Get the URL hash
        const hash = window.location.hash;
        
        if (hash) {
          // Handle the OAuth callback
          const { data, error } = await supabase.auth.getSession();
          
          if (error) {
            throw error;
          }

          if (data.session) {
            // Register the user in our database if needed
            const response = await fetch("/api/auth/register", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                id: data.session.user.id,
                email: data.session.user.email,
                username: data.session.user.user_metadata.username || 
                          data.session.user.user_metadata.preferred_username || 
                          data.session.user.email?.split('@')[0] || 
                          `user_${Math.floor(Math.random() * 10000)}`,
              }),
            });

            if (!response.ok) {
              console.error("Failed to register user in database");
            }

            toast({
              title: "Login Successful",
              description: "Welcome to VIDA³!",
            });
            
            // Redirect to home page
            setLocation("/");
          } else {
            // No session, redirect to login
            setError("Authentication failed");
            setLocation("/login");
          }
        } else {
          // No hash, redirect to login
          setLocation("/login");
        }
      } catch (error: any) {
        console.error("Auth callback error:", error);
        setError(error.message || "Authentication failed");
        
        toast({
          title: "Authentication Failed",
          description: error.message || "There was an error during authentication",
          variant: "destructive",
        });
        
        // Redirect to login page after error
        setLocation("/login");
      }
    };

    handleCallback();
  }, [setLocation, toast]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      {error ? (
        <div className="text-red-500">{error}</div>
      ) : (
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
          <p className="text-lg text-center">Completing authentication...</p>
        </div>
      )}
    </div>
  );
}