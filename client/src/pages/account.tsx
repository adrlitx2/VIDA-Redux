import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useSubscription } from "@/hooks/use-subscription";
import { useAvatar } from "@/hooks/use-avatar";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Link } from "wouter";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";

import Navbar from "@/components/Navbar";
import MobileNavbar from "@/components/MobileNavbar";
import Footer from "@/components/Footer";

// Form validation schema
const profileFormSchema = z.object({
  username: z.string().min(3, {
    message: "Username must be at least 3 characters.",
  }),
  email: z.string().email({
    message: "Please enter a valid email address.",
  }),
  twitterHandle: z.string().optional(),
});

export default function Account() {
  const { user, logout } = useAuth();
  const { currentPlan, remainingStreamTime } = useSubscription();
  const { avatars } = useAvatar();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  // Get subscription name with proper formatting
  const getPlanDisplayName = (planId: string = "free") => {
    switch (planId) {
      case "free":
        return "Free";
      case "reply-guy":
        return "Reply Guy";
      case "spartan":
        return "Spartan";
      case "zeus":
        return "Zeus";
      case "goat":
        return "GOAT";
      default:
        return planId.charAt(0).toUpperCase() + planId.slice(1);
    }
  };

  // Get plan badge color
  const getPlanBadgeClass = (planId: string = "free") => {
    switch (planId) {
      case "free":
        return "bg-blue-500/20 text-blue-300";
      case "reply-guy":
        return "bg-green-500/20 text-green-300";
      case "spartan":
        return "bg-yellow-500/20 text-yellow-300";
      case "zeus":
        return "bg-purple-500/20 text-purple-300";
      case "goat":
        return "bg-gradient-to-r from-purple-400 to-pink-400 text-white";
      default:
        return "bg-blue-500/20 text-blue-300";
    }
  };

  // Get role badge color
  const getRoleBadgeClass = (role: string = "user") => {
    switch (role) {
      case "user":
        return "bg-blue-500/20 text-blue-300";
      case "admin":
        return "bg-purple-500/20 text-purple-300";
      case "superadmin":
        return "bg-gradient-to-r from-red-400 to-purple-400 text-white";
      default:
        return "bg-blue-500/20 text-blue-300";
    }
  };

  // Form setup for profile editing
  const form = useForm<z.infer<typeof profileFormSchema>>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      username: user?.username || "",
      email: user?.email || "",
      twitterHandle: user?.twitterHandle || "",
    },
  });

  // Update profile information
  async function onSubmit(values: z.infer<typeof profileFormSchema>) {
    if (!user) return;

    setIsLoading(true);
    try {
      const response = await apiRequest("PATCH", "/api/auth/update-profile", {
        ...values,
      });

      if (response.ok) {
        toast({
          title: "Profile Updated",
          description: "Your profile has been successfully updated.",
        });
      } else {
        throw new Error("Failed to update profile");
      }
    } catch (error: any) {
      toast({
        title: "Update Failed",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  // Calculate streaming time in hours and minutes
  const formatStreamingTime = (minutes: number) => {
    if (minutes >= 60) {
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;
      return `${hours}h ${remainingMinutes}m`;
    }
    return `${minutes}m`;
  };

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Not Logged In</CardTitle>
            <CardDescription>Please log in to view your account settings.</CardDescription>
          </CardHeader>
          <CardFooter>
            <Link href="/login">
              <Button className="w-full">Log In</Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <MobileNavbar />

      <div className="flex-1 container py-8 px-4 md:px-6 mt-16">
        <div className="flex flex-col md:flex-row gap-10 max-w-6xl mx-auto">
          {/* Left sidebar - Account summary */}
          <div className="w-full md:w-1/3">
            <Card className="bg-black/60 border-surface mb-8">
              <CardHeader>
                <CardTitle className="text-xl font-bold">Account Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className="h-16 w-16 rounded-full overflow-hidden border border-surface bg-primary/20 flex items-center justify-center">
                    {user.avatarUrl ? (
                      <img 
                        src={user.avatarUrl} 
                        alt={user.username} 
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-2xl font-bold text-primary">
                        {user.username.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div>
                    <h3 className="font-medium text-lg">{user.username}</h3>
                    <p className="text-muted-foreground text-sm">{user.email}</p>
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  <div>
                    <span className="text-sm text-muted-foreground">User Role:</span>
                    <Badge className={`ml-2 ${getRoleBadgeClass(user.role)}`}>
                      {user.role || "User"}
                    </Badge>
                  </div>

                  <div>
                    <span className="text-sm text-muted-foreground">Subscription:</span>
                    <Badge className={`ml-2 ${getPlanBadgeClass(currentPlan?.id)}`}>
                      {getPlanDisplayName(currentPlan?.id)}
                    </Badge>
                  </div>

                  <div>
                    <span className="text-sm text-muted-foreground">Member Since:</span>
                    <span className="ml-2 text-sm">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  <div>
                    <span className="text-sm text-muted-foreground">Streaming Time:</span>
                    <span className="ml-2 text-sm">
                      {formatStreamingTime(remainingStreamTime)} remaining this week
                    </span>
                  </div>

                  <div>
                    <span className="text-sm text-muted-foreground">Avatars:</span>
                    <span className="ml-2 text-sm">{avatars?.length || 0} created</span>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex flex-col gap-2">
                <Link href="/pricing" className="w-full">
                  <Button variant="default" className="w-full" size="sm">
                    Upgrade Plan
                  </Button>
                </Link>
                <Link href="/subscription/success" className="w-full">
                  <Button variant="outline" className="w-full" size="sm">
                    Manage Subscription
                  </Button>
                </Link>
                <Button
                  variant="destructive"
                  size="sm"
                  className="w-full mt-1"
                  onClick={() => logout()}
                >
                  Sign Out
                </Button>
              </CardFooter>
            </Card>
          </div>

          {/* Right content area - Settings tabs */}
          <div className="w-full md:w-2/3">
            <Tabs defaultValue="profile" className="w-full">
              <TabsList className="w-full grid grid-cols-3 mb-8">
                <TabsTrigger value="profile">Profile</TabsTrigger>
                <TabsTrigger value="preferences">Preferences</TabsTrigger>
                <TabsTrigger value="account">Security</TabsTrigger>
              </TabsList>

              {/* Profile Tab */}
              <TabsContent value="profile">
                <Card className="bg-black/60 border-surface">
                  <CardHeader>
                    <CardTitle className="text-xl font-bold">Edit Profile</CardTitle>
                    <CardDescription>
                      Update your personal information and public profile
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Form {...form}>
                      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        <FormField
                          control={form.control}
                          name="username"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Username</FormLabel>
                              <FormControl>
                                <Input {...field} className="bg-black/30 border-surface" />
                              </FormControl>
                              <FormDescription>
                                This is your public display name
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Email</FormLabel>
                              <FormControl>
                                <Input {...field} className="bg-black/30 border-surface" />
                              </FormControl>
                              <FormDescription>
                                Your email address is used for notifications and login
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="twitterHandle"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Twitter Handle (Optional)</FormLabel>
                              <FormControl>
                                <Input {...field} className="bg-black/30 border-surface" />
                              </FormControl>
                              <FormDescription>
                                Link your Twitter account for easy sharing
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <Button type="submit" disabled={isLoading}>
                          {isLoading ? "Saving..." : "Save Changes"}
                        </Button>
                      </form>
                    </Form>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Preferences Tab */}
              <TabsContent value="preferences">
                <Card className="bg-black/60 border-surface">
                  <CardHeader>
                    <CardTitle className="text-xl font-bold">Preferences</CardTitle>
                    <CardDescription>
                      Customize your app experience and notification settings
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-4">
                      <h3 className="text-base font-medium">Appearance</h3>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <Label htmlFor="glow-effects">Glow Effects</Label>
                            <p className="text-sm text-muted-foreground">
                              Enable neon glow effects on UI elements
                            </p>
                          </div>
                          <Switch id="glow-effects" defaultChecked={true} />
                        </div>
                        
                        <div className="flex items-center justify-between mt-2">
                          <div className="space-y-0.5">
                            <Label htmlFor="animations">UI Animations</Label>
                            <p className="text-sm text-muted-foreground">
                              Enable smooth transitions and animations
                            </p>
                          </div>
                          <Switch id="animations" defaultChecked={true} />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h3 className="text-base font-medium">Notifications</h3>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <Label htmlFor="email-notifications">Email Notifications</Label>
                            <p className="text-sm text-muted-foreground">
                              Receive updates and news via email
                            </p>
                          </div>
                          <Switch id="email-notifications" defaultChecked={true} />
                        </div>

                        <div className="flex items-center justify-between pt-2">
                          <div className="space-y-0.5">
                            <Label htmlFor="streaming-alerts">Streaming Alerts</Label>
                            <p className="text-sm text-muted-foreground">
                              Get notified when your streaming time is running low
                            </p>
                          </div>
                          <Switch id="streaming-alerts" defaultChecked={true} />
                        </div>
                      </div>
                    </div>

                    <div className="pt-2">
                      <Button variant="outline">Save Preferences</Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Security Tab */}
              <TabsContent value="account">
                <Card className="bg-black/60 border-surface">
                  <CardHeader>
                    <CardTitle className="text-xl font-bold">Security</CardTitle>
                    <CardDescription>
                      Manage your account security and connected services
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-4">
                      <h3 className="text-base font-medium">Password</h3>
                      <div className="grid gap-4">
                        <div className="grid gap-2">
                          <Label htmlFor="current-password">Current Password</Label>
                          <Input
                            id="current-password"
                            type="password"
                            className="bg-black/30 border-surface"
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="new-password">New Password</Label>
                          <Input
                            id="new-password"
                            type="password"
                            className="bg-black/30 border-surface"
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="confirm-password">Confirm New Password</Label>
                          <Input
                            id="confirm-password"
                            type="password"
                            className="bg-black/30 border-surface"
                          />
                        </div>
                        <Button variant="outline" className="w-fit">Change Password</Button>
                      </div>
                    </div>

                    <div className="space-y-4 pt-4 border-t border-surface">
                      <h3 className="text-base font-medium">Connected Accounts</h3>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center">
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 24 24"
                                fill="currentColor"
                                className="w-6 h-6 text-white"
                              >
                                <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
                              </svg>
                            </div>
                            <div>
                              <p className="font-medium">Twitter</p>
                              <p className="text-sm text-muted-foreground">
                                {user.twitterHandle || "Not connected"}
                              </p>
                            </div>
                          </div>
                          <Button size="sm" variant="outline">
                            {user.twitterHandle ? "Disconnect" : "Connect"}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}