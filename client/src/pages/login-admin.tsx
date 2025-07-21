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
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  async function handleLogin() {
    setIsLoading(true);
    
    try {
      console.log('Attempting login with Supabase:', { email });
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (error) {
        console.error('Login failed:', error);
        toast({
          title: 'Login Failed',
          description: error.message || 'Invalid credentials',
          variant: 'destructive'
        });
        
        console.log('Supabase login response:', {
          success: false,
          hasUser: !!data?.user,
          errorMessage: error.message
        });
        
        return;
      }
      
      console.log('Login successful:', {
        user: data.user?.email,
        session: !!data.session
      });
      
      toast({
        title: 'Login Successful',
        description: 'Redirecting to admin dashboard...'
      });
      
      console.log('Login successful - redirecting to admin dashboard');
      
      // Get the user and check for admin role before redirecting
      const { data: userData } = await supabase.auth.getUser();
      const user = userData?.user;
      
      // Use the specialized function for proper admin redirect
      if (user) {
        redirectToAdminDashboard(user);
      } else {
        // Fallback if user data is not available
        window.location.replace('/admin/dashboard');
      }
      
    } catch (error: any) {
      console.error('Login exception:', error);
      
      toast({
        title: 'Login Failed',
        description: error.message || 'An unexpected error occurred',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center p-4 md:p-6 bg-gradient-to-b from-black to-purple-950">
      <Card className="w-full max-w-md border border-primary/30 shadow-lg shadow-primary/20 bg-black/60 backdrop-blur-sm">
        <CardHeader className="border-b border-primary/20">
          <CardTitle className="text-2xl font-bold text-center bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent">
            VIDA³ Admin Login
          </CardTitle>
          <CardDescription className="text-center text-primary/80">
            Administrator access only
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4 pt-4">
          <Alert className="border-primary/30 bg-primary/10">
            <AlertTitle className="text-primary">Superadmin Login</AlertTitle>
            <AlertDescription className="text-primary/80">
              Please provide your admin credentials to access the dashboard
            </AlertDescription>
          </Alert>
          
          <div className="space-y-3">
            <Input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              className="border-primary/30 bg-surface/30 text-primary-foreground"
            />
            <Input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              type="password"
              className="border-primary/30 bg-surface/30 text-primary-foreground"
            />
          </div>
          
          <Button
            onClick={handleLogin}
            disabled={isLoading || !email || !password}
            className="w-full bg-primary hover:bg-primary/90 text-white"
          >
            {isLoading ? (
              <span className="flex items-center">
                <Loader2 className="animate-spin mr-2 h-4 w-4" /> 
                Signing In...
              </span>
            ) : (
              "Sign In"
            )}
          </Button>
        </CardContent>
        
        <CardFooter className="flex flex-col border-t border-primary/20 gap-2 pt-4">
          <p className="text-xs text-primary/70 text-center">
            This login is for administrators only. Regular users should use the standard login page.
          </p>
          
          <Button 
            variant="link" 
            onClick={() => setLocation('/')}
            className="text-xs text-primary/90"
          >
            Return to Home
          </Button>
        </CardFooter>
      </Card>
      
      <div className="mt-6">
        <Badge variant="outline" className="border-primary/30 text-primary/70">
          VIDA³ Administration
        </Badge>
      </div>
    </div>
  );
}