import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from 'wouter';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';
import { redirectToAdminDashboard } from '@/lib/auth-helper';

export default function LoginAdmin() {
  const [email, setEmail] = useState('admin@vida3.ai');
  const [password, setPassword] = useState('Admin123!');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { toast } = useToast();
  const [_, setLocation] = useLocation();

  async function handleLogin() {
    if (!email || !password) {
      setError('Please provide both email and password');
      return;
    }

    setLoading(true);
    setError('');

    try {
      console.log('Attempting login with Supabase:', { email });
      
      // Login with Supabase
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (error) {
        throw error;
      }
      
      // Login successful
      toast({
        title: 'Login Successful',
        description: 'Redirecting to admin dashboard...'
      });
      
      console.log('Login successful - redirecting to admin dashboard');
      
      // Get the user and check for admin role before redirecting
      const user = data?.user;
      
      // Use the specialized function for proper admin redirect
      if (user) {
        // Log the user metadata to help with debugging
        console.log('User has admin privileges:', { 
          userRoles: user.app_metadata?.roles || []
        });
        
        // Force a hard redirect with session parameters
        const adminUrl = `/admin/dashboard?auth=1&sessionId=${Date.now()}`;
        window.location.href = adminUrl;
      } else {
        // Fallback if user data is not available
        window.location.replace('/admin/dashboard');
      }
      
    } catch (error: any) {
      console.error('Login exception:', error);
      
      setError(error.message || 'Failed to login');
      toast({
        title: 'Login Failed',
        description: error.message || 'Failed to login',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <Card className="bg-black/60 border-surface">
          <CardHeader className="space-y-1">
            <div className="flex items-center justify-between">
              <CardTitle className="text-2xl font-bold">Admin Login</CardTitle>
              <Badge variant="destructive" className="uppercase">Restricted</Badge>
            </div>
            <CardDescription>
              Enter your credentials to access the admin dashboard
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertTitle>Login Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none" htmlFor="email">
                Email
              </label>
              <Input
                id="email"
                placeholder="admin@example.com"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-black/40"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none" htmlFor="password">
                Password
              </label>
              <Input
                id="password"
                placeholder="••••••••"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-black/40"
              />
            </div>
          </CardContent>
          
          <CardFooter>
            <Button 
              className="w-full text-lg font-semibold" 
              onClick={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Logging in...
                </>
              ) : (
                'Login to Admin'
              )}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}