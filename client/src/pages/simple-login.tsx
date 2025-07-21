import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { toast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { getAuthHeaders, storeUserBackup } from '@/lib/auth-helper';

export default function SimpleLogin() {
  const [email, setEmail] = useState('test@example.com');
  const [password, setPassword] = useState('password123');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionInfo, setSessionInfo] = useState<any>(null);

  // Check session on load
  useEffect(() => {
    checkCurrentSession();
  }, []);

  async function checkCurrentSession() {
    try {
      const { data } = await supabase.auth.getSession();
      setSessionInfo(data);
      
      if (data.session) {
        console.log('Session found:', {
          userId: data.session.user.id,
          email: data.session.user.email,
          expires: new Date(data.session.expires_at! * 1000).toLocaleString()
        });
      } else {
        console.log('No active session found');
      }
    } catch (error) {
      console.error('Session check error:', error);
    }
  }

  async function handleLogin() {
    setIsLoading(true);
    
    try {
      console.log('Starting login with:', { email, passwordLength: password.length });
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (error) throw error;
      
      console.log('Login successful:', data);
      
      // Save user data as backup
      if (data.user) {
        const userBackup = {
          id: data.user.id,
          email: data.user.email,
          username: data.user.email?.split('@')[0] || 'user',
          created_at: data.user.created_at
        };
        storeUserBackup(userBackup);
      }
      
      // Update session info
      setSessionInfo({ session: data.session });
      
      toast({
        title: 'Login Successful',
        description: 'You are now signed in!'
      });
      
      // Force a session check to update headers
      await checkCurrentSession();
      
      // Test authentication-required endpoint 
      try {
        const headers = await getAuthHeaders();
        const response = await fetch('/api/auth/me?id=' + data.user?.id, {
          headers,
          credentials: 'include'
        });
        
        if (response.ok) {
          const userData = await response.json();
          console.log('Backend user data fetched successfully:', userData);
        } else {
          console.warn('Backend user fetch failed:', response.status);
        }
      } catch (apiError) {
        console.error('API test failed:', apiError);
      }
    } catch (error: any) {
      console.error('Login error:', error);
      
      toast({
        title: 'Login Failed',
        description: error.message || 'Invalid credentials',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSignUp() {
    setIsLoading(true);
    
    try {
      console.log('Starting signup with:', { email, passwordLength: password.length });
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username: email.split('@')[0]
          }
        }
      });
      
      if (error) throw error;
      
      console.log('Signup response:', data);
      
      if (data.user) {
        toast({
          title: 'Account Created',
          description: 'You can now log in with your credentials.'
        });
      } else {
        toast({
          title: 'Partial Success',
          description: 'Account created, but verification may be required.'
        });
      }
    } catch (error: any) {
      console.error('Signup error:', error);
      
      toast({
        title: 'Signup Failed',
        description: error.message || 'Could not create account',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSignOut() {
    setIsLoading(true);
    
    try {
      await supabase.auth.signOut();
      
      setSessionInfo(null);
      
      toast({
        title: 'Signed Out',
        description: 'You have been logged out successfully.'
      });
      
      // Update session info
      await checkCurrentSession();
    } catch (error: any) {
      console.error('Sign out error:', error);
      
      toast({
        title: 'Error',
        description: error.message || 'Could not sign out',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-b from-black to-blue-950">
      <Card className="w-full max-w-md border border-blue-500/30 shadow-lg shadow-blue-500/20 bg-black/60 backdrop-blur-sm">
        <CardHeader className="border-b border-blue-500/20">
          <CardTitle className="text-2xl font-bold text-center bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            VIDA³ Authentication
          </CardTitle>
          <CardDescription className="text-center text-blue-300/80">
            Simple login tool for development
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4 pt-4">
          {sessionInfo?.session ? (
            <Alert className="border-green-500/30 bg-green-500/10">
              <AlertTitle className="text-green-400">Authenticated</AlertTitle>
              <AlertDescription className="text-green-300">
                Logged in as <Badge className="bg-green-500/20 text-green-300">{sessionInfo.session.user.email}</Badge>
              </AlertDescription>
            </Alert>
          ) : (
            <Alert className="border-blue-500/30 bg-blue-500/10">
              <AlertTitle className="text-blue-400">Not Authenticated</AlertTitle>
              <AlertDescription className="text-blue-300">
                Please sign in to continue
              </AlertDescription>
            </Alert>
          )}
          
          <div className="space-y-3">
            <Input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              className="modal-input"
            />
            <Input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              type="password"
              className="modal-input"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <Button
              onClick={handleSignUp}
              disabled={isLoading}
              variant="outline"
              className="border-purple-500/50 hover:bg-purple-500/20 text-purple-300"
            >
              Create Account
            </Button>
            <Button
              onClick={handleLogin}
              disabled={isLoading || !email || !password}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isLoading ? "Processing..." : "Login"}
            </Button>
          </div>
          
          {sessionInfo?.session && (
            <Button
              onClick={handleSignOut}
              variant="destructive"
              className="w-full mt-2"
            >
              Sign Out
            </Button>
          )}
        </CardContent>
        
        <CardFooter className="flex flex-col border-t border-blue-500/20 gap-2 pt-4">
          <p className="text-xs text-blue-400/70 text-center">
            This is a development tool for testing authentication.
            Your session is managed by Supabase and will expire after a period of inactivity.
          </p>
          
          <Button 
            variant="link" 
            onClick={checkCurrentSession}
            className="text-xs text-blue-300"
          >
            Refresh Session Info
          </Button>
          
          <div className="text-xs text-blue-300/70 rounded p-2 bg-blue-950/30 font-mono w-full overflow-auto">
            {sessionInfo ? (
              <pre>
                {JSON.stringify({
                  auth: sessionInfo.session ? 'active' : 'none',
                  user: sessionInfo.session?.user.email || 'n/a',
                  expires: sessionInfo.session 
                    ? new Date(sessionInfo.session.expires_at * 1000).toLocaleString()
                    : 'n/a'
                }, null, 2)}
              </pre>
            ) : (
              <span>No session data</span>
            )}
          </div>
        </CardFooter>
      </Card>
      
      <div className="mt-4 text-center">
        <Button 
          variant="link" 
          onClick={() => window.location.href = '/'}
          className="text-blue-300"
        >
          Back to Home
        </Button>
      </div>
    </div>
  );
}