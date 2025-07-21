import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { useLocation } from "wouter";

export default function RegisterSimple() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const [_, navigate] = useLocation();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);

    try {
      console.log("Registering with Supabase:", { email, password });
      // Register with Supabase directly
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username
          }
        }
      });

      if (error) {
        throw error;
      }

      console.log("Registration successful:", data);
      
      if (data.user) {
        try {
          // Create user in our backend
          const response = await fetch("/api/auth/register", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              id: data.user.id,
              email,
              username,
            }),
          });

          const responseText = await response.text();
          console.log("Backend registration response:", responseText);
          
          if (!response.ok) {
            console.error("Backend registration failed:", responseText);
            toast({
              title: "Account Created",
              description: "Your Supabase account was created but we had trouble completing the registration in our system. You may need to log in again.",
            });
          } else {
            console.log("Backend registration successful");
            toast({
              title: "Registration Successful!",
              description: "Your account has been created successfully!",
            });
          }
        } catch (backendError) {
          console.error("Error communicating with backend:", backendError);
          toast({
            title: "Account Created",
            description: "Your Supabase account was created but we had trouble completing the registration in our system.",
          });
        }
      }

      // Toast already shown above, no need for duplicate

      // Navigate to home page
      navigate("/");
    } catch (error: any) {
      console.error("Registration failed:", error);
      toast({
        title: "Registration Failed",
        description: error.message || "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="container mx-auto flex items-center justify-center min-h-screen">
      <Card className="w-full max-w-md border-primary/20 bg-black/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-3xl font-bold tracking-tight text-center bg-gradient-to-r from-purple-500 via-blue-400 to-green-300 bg-clip-text text-transparent">
            Create Your VIDA³ Account
          </CardTitle>
          <CardDescription className="text-center">
            Sign up to start creating amazing avatars
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="border-primary/20 bg-black/50"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="border-primary/20 bg-black/50"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="border-primary/20 bg-black/50"
              />
            </div>
            <Button type="submit" disabled={isLoading} className="w-full">
              {isLoading ? "Creating Account..." : "Create Account"}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex justify-center">
          <Button variant="link" onClick={() => navigate("/login")}>
            Already have an account? Log in
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}