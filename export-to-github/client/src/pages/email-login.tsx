import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { useLocation } from 'wouter';

export default function EmailLogin() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [_, setLocation] = useLocation();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    if (!email || !email.includes('@')) {
      toast({
        title: "Invalid Email",
        description: "Please enter a valid email address",
        variant: "destructive",
      });
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Send magic link
      const { data, error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      
      if (error) throw error;
      
      setMagicLinkSent(true);
      
      // Show success message
      toast({
        title: "Email Sent",
        description: "Check your email for a login link!",
      });
    } catch (error: any) {
      console.error('Error sending magic link:', error);
      
      toast({
        title: "Error",
        description: error.message || "Failed to send login link",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">Log in with Email</CardTitle>
          <CardDescription className="text-center">
            {magicLinkSent 
              ? "Check your email for a magic link to log in" 
              : "We'll send you a magic link to log in instantly"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!magicLinkSent ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="modal-input"
                />
              </div>
              <Button 
                type="submit" 
                className="w-full" 
                disabled={isLoading}
              >
                {isLoading ? "Sending..." : "Send Magic Link"}
              </Button>
            </form>
          ) : (
            <div className="text-center py-4">
              <p className="mb-4">We sent a login link to <strong>{email}</strong></p>
              <p className="text-sm text-muted-foreground">
                The link will expire in 1 hour. Check your spam folder if you don't see it.
              </p>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-center">
          <Button 
            variant="link" 
            onClick={() => setLocation('/login')}
          >
            Back to Login Options
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}