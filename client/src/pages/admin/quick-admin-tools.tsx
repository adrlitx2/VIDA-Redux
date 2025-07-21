import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";

export default function QuickAdminTools() {
  const [email, setEmail] = useState("adam.d.roorda@gmail.com");
  const [isLoading, setIsLoading] = useState(false);
  const [promotionResult, setPromotionResult] = useState<any>(null);
  const [subscriptionResult, setSubscriptionResult] = useState<any>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  async function handlePromoteToSuperAdmin() {
    setIsLoading(true);
    
    try {
      const response = await apiRequest("POST", "/api/admin/promote-to-superadmin", {
        email
      });
      
      const result = await response.json();
      setPromotionResult(result);
      
      toast({
        title: "Success",
        description: "User has been promoted to superadmin!",
      });
    } catch (error: any) {
      console.error("Error promoting user:", error);
      
      toast({
        title: "Error",
        description: error.message || "Failed to promote user",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }
  
  async function handleUpgradeToGoat() {
    setIsLoading(true);
    
    try {
      const response = await apiRequest("POST", "/api/admin/update-subscription", {
        email,
        planId: "goat"
      });
      
      const result = await response.json();
      setSubscriptionResult(result);
      
      toast({
        title: "Success",
        description: "User has been upgraded to GOAT tier!",
      });
    } catch (error: any) {
      console.error("Error upgrading subscription:", error);
      
      toast({
        title: "Error",
        description: error.message || "Failed to upgrade subscription",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md">
        <CardHeader className="bg-black/60">
          <CardTitle className="text-xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
            Quick Admin Tools
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Easily manage user roles and subscriptions
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4 pt-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">User Email</label>
            <Input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              className="border-surface"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-3 pt-4">
            <Button
              onClick={handlePromoteToSuperAdmin}
              disabled={isLoading || !email}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              {isLoading ? "Processing..." : "Make SuperAdmin"}
            </Button>
            
            <Button
              onClick={handleUpgradeToGoat}
              disabled={isLoading || !email}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isLoading ? "Processing..." : "Upgrade to GOAT"}
            </Button>
          </div>
          
          {promotionResult && (
            <div className="mt-4 p-3 rounded-md bg-purple-500/10 border border-purple-500/20">
              <h3 className="text-sm font-medium text-purple-400 mb-1">Promotion Result</h3>
              <div className="text-xs text-purple-300 font-mono overflow-auto max-h-24">
                <pre>{JSON.stringify(promotionResult, null, 2)}</pre>
              </div>
            </div>
          )}
          
          {subscriptionResult && (
            <div className="mt-4 p-3 rounded-md bg-blue-500/10 border border-blue-500/20">
              <h3 className="text-sm font-medium text-blue-400 mb-1">Subscription Result</h3>
              <div className="text-xs text-blue-300 font-mono overflow-auto max-h-24">
                <pre>{JSON.stringify(subscriptionResult, null, 2)}</pre>
              </div>
            </div>
          )}
        </CardContent>
        
        <CardFooter className="flex-col items-start border-t border-surface pt-4">
          <div className="mb-2 w-full">
            <p className="text-xs text-muted-foreground">
              Current user: {user ? user.email : "Not logged in"}
              {user && (
                <Badge 
                  className={`ml-2 ${user.role === 'superadmin' ? 'bg-purple-500/20 text-purple-300' : 'bg-blue-500/20 text-blue-300'}`}
                >
                  {user.role || "user"}
                </Badge>
              )}
            </p>
            
            {user && (
              <p className="text-xs text-muted-foreground mt-1">
                Subscription: 
                <Badge 
                  className="ml-2 bg-gradient-to-r from-purple-500/20 to-blue-500/20 text-blue-300"
                >
                  {user.plan || "free"}
                </Badge>
              </p>
            )}
          </div>
          
          <p className="text-xs text-muted-foreground">
            After making changes, you may need to log out and log back in to see the changes reflected in your account.
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}