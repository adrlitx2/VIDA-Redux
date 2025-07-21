import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { toast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { useLocation } from 'wouter';
import { Separator } from '@/components/ui/separator';

export default function AuthTest() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [sessionStatus, setSessionStatus] = useState<{session: any} | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [_, setLocation] = useLocation();

  // Function to check and refresh session status
  const checkSession = async () => {
    const { data } = await supabase.auth.getSession();
    console.log("Session check:", data);
    setSessionStatus(data as any);
    return data;
  };

  // Check session on component mount
  useEffect(() => {
    checkSession();
  }, []);

  // Login with password
  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      console.log("Attempting signin with:", { email, passwordLength: password.length });
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        console.log("Standard login failed:", error);
        throw error;
      }
      
      toast({
        title: "Success",
        description: "Logged in successfully!",
      });
      
      await checkSession();
    } catch (error: any) {
      toast({
        title: "Login Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Login with magic link
  const handleMagicLinkLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      
      if (error) throw error;
      
      toast({
        title: "Magic Link Sent",
        description: "Check your email for a login link!",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Sign out
  const handleSignOut = async () => {
    setIsLoading(true);
    
    try {
      await supabase.auth.signOut();
      toast({
        title: "Signed Out",
        description: "You have been signed out successfully.",
      });
      await checkSession();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background">
      <div className="w-full max-w-md space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Authentication Test Page</CardTitle>
            <CardDescription>Testing Supabase authentication integration</CardDescription>
          </CardHeader>
          <CardContent>
            <Alert className="mb-4" variant={sessionStatus?.session ? "default" : "destructive"}>
              <AlertTitle>Session Check</AlertTitle>
              <AlertDescription>
                {sessionStatus?.session ? "You are logged in - Session is active" : "No active session"}
              </AlertDescription>
            </Alert>
            
            {sessionStatus?.session && (
              <div className="space-y-2 mb-4">
                <div className="flex justify-between items-center">
                  <span className="font-medium">User ID:</span>
                  <Badge variant="outline">{sessionStatus.session.user.id}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-medium">Email:</span>
                  <Badge variant="outline">{sessionStatus.session.user.email}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-medium">Expires At:</span>
                  <Badge variant="outline">
                    {new Date(sessionStatus.session.expires_at * 1000).toLocaleString()}
                  </Badge>
                </div>
              </div>
            )}
            
            <form onSubmit={handlePasswordLogin} className="space-y-4">
              <div className="space-y-2">
                <Input
                  id="email"
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Input
                  id="password"
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <div className="flex space-x-2">
                <Button type="submit" disabled={isLoading} className="flex-1">
                  {isLoading ? "Processing..." : "Login with Password"}
                </Button>
                <Button 
                  type="button"
                  variant="outline"
                  onClick={handleMagicLinkLogin}
                  disabled={isLoading || !email}
                  className="flex-1"
                >
                  Send Magic Link
                </Button>
              </div>
            </form>
            
            <Separator className="my-4" />
            
            <div className="flex justify-between">
              <Button 
                variant="destructive" 
                onClick={handleSignOut}
                disabled={isLoading || !sessionStatus?.session}
              >
                Sign Out
              </Button>
              <Button 
                variant="secondary" 
                onClick={checkSession}
                disabled={isLoading}
              >
                Check Session
              </Button>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="link" onClick={() => setLocation('/login')}>
              Back to Login
            </Button>
            <Button variant="link" onClick={() => setLocation('/register')}>
              Register
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}