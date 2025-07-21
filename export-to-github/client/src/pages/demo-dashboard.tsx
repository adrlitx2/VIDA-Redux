import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Play, 
  Pause, 
  Upload, 
  Settings, 
  Crown, 
  Clock, 
  Users, 
  TrendingUp,
  Camera,
  Mic,
  Monitor
} from "lucide-react";
import { useLocation } from "wouter";
import Navbar from "@/components/Navbar";
import MobileNavbar from "@/components/MobileNavbar";

export default function DemoDashboard() {
  const [_, setLocation] = useLocation();
  const [isStreaming, setIsStreaming] = useState(false);

  // Demo user data
  const demoUser = {
    username: "demo_user",
    email: "demo@vida3.com",
    plan: "spartan"
  };

  const demoPlan = {
    id: "spartan",
    name: "Spartan",
    price: 29.99
  };

  const remainingStreamTime = 480; // 8 hours in minutes
  const streamingProgress = ((600 - remainingStreamTime) / 600) * 100;

  const planColors = {
    free: "bg-gray-500",
    reply_guy: "bg-blue-500",
    spartan: "bg-purple-500",
    zeus: "bg-gold-500",
    goat: "bg-gradient-to-r from-purple-500 to-pink-500"
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="hidden md:block">
        <Navbar />
      </div>
      <div className="md:hidden">
        <MobileNavbar />
      </div>
      
      <div className="container mx-auto px-4 py-6 md:py-8 pt-20 md:pt-24">
        {/* Demo Banner */}
        <div className="mb-6 p-4 bg-primary/10 border border-primary/20 rounded-lg">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-primary/20 text-primary">DEMO</Badge>
            <p className="text-sm text-muted-foreground">
              This is a preview of your dashboard. Complete setup with Supabase credentials to enable full functionality.
            </p>
          </div>
        </div>

        {/* Welcome Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground">
                Welcome back, {demoUser.username}!
              </h1>
              <p className="text-muted-foreground">Ready to create amazing avatar streams?</p>
            </div>
            <Badge 
              variant="outline" 
              className={`${planColors[demoPlan.id as keyof typeof planColors]} text-white border-0`}
            >
              <Crown className="w-4 h-4 mr-1" />
              {demoPlan.name} Plan
            </Badge>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="glass-card border-surface">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Streaming Time</p>
                  <p className="text-2xl font-bold">{remainingStreamTime}min</p>
                </div>
                <Clock className="w-8 h-8 text-primary" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="glass-card border-surface">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Avatars</p>
                  <p className="text-2xl font-bold">3</p>
                </div>
                <Users className="w-8 h-8 text-primary" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="glass-card border-surface">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Streams</p>
                  <p className="text-2xl font-bold">12</p>
                </div>
                <Monitor className="w-8 h-8 text-primary" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="glass-card border-surface">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Engagement</p>
                  <p className="text-2xl font-bold">94%</p>
                </div>
                <TrendingUp className="w-8 h-8 text-primary" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="stream" className="space-y-6">
          <TabsList className="glass-card border-surface">
            <TabsTrigger value="stream">Stream Control</TabsTrigger>
            <TabsTrigger value="avatars">My Avatars</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          {/* Stream Control Tab */}
          <TabsContent value="stream" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Stream Controls */}
              <Card className="glass-card border-surface">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Camera className="w-5 h-5" />
                    Stream Controls
                  </CardTitle>
                  <CardDescription>
                    Start streaming with your avatar
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-surface/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${isStreaming ? 'bg-red-500 animate-pulse' : 'bg-gray-500'}`} />
                      <span className="font-medium">
                        {isStreaming ? 'Currently Streaming' : 'Stream Offline'}
                      </span>
                    </div>
                    <Button 
                      onClick={() => setIsStreaming(!isStreaming)}
                      variant={isStreaming ? "destructive" : "default"}
                      className="gap-2"
                    >
                      {isStreaming ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                      {isStreaming ? 'Stop Stream' : 'Start Stream'}
                    </Button>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Stream Quality</span>
                      <Badge variant="outline">HD 1080p</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Audio</span>
                      <div className="flex items-center gap-2">
                        <Mic className="w-4 h-4 text-green-500" />
                        <span className="text-sm">Connected</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Usage Overview */}
              <Card className="glass-card border-surface">
                <CardHeader>
                  <CardTitle>Usage Overview</CardTitle>
                  <CardDescription>
                    Track your streaming time usage
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>Streaming Time Used</span>
                      <span>120 / 600 min</span>
                    </div>
                    <Progress value={streamingProgress} className="h-2" />
                  </div>
                  
                  <div className="pt-4 border-t border-surface">
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={() => setLocation("/pricing")}
                    >
                      <Crown className="w-4 h-4 mr-2" />
                      Upgrade Plan
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Avatars Tab */}
          <TabsContent value="avatars" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Create New Avatar */}
              <Card className="glass-card border-surface border-dashed hover:border-primary/50 transition-colors cursor-pointer"
                    onClick={() => setLocation("/avatars")}>
                <CardContent className="flex flex-col items-center justify-center p-8 text-center">
                  <Upload className="w-12 h-12 text-muted-foreground mb-4" />
                  <h3 className="font-semibold mb-2">Create New Avatar</h3>
                  <p className="text-sm text-muted-foreground">Upload a photo to generate your avatar</p>
                </CardContent>
              </Card>

              {/* Sample Avatars */}
              {[1, 2, 3].map((i) => (
                <Card key={i} className="glass-card border-surface">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">Avatar {i}</CardTitle>
                      <Badge variant="outline">Active</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="aspect-square bg-surface rounded-lg mb-4 flex items-center justify-center">
                      <Avatar className="w-20 h-20">
                        <AvatarFallback>A{i}</AvatarFallback>
                      </Avatar>
                    </div>
                    <div className="space-y-2">
                      <Button variant="outline" size="sm" className="w-full">
                        Select for Stream
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="glass-card border-surface">
                <CardHeader>
                  <CardTitle>Stream Analytics</CardTitle>
                  <CardDescription>Your streaming performance</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span>Total Streams</span>
                      <span className="font-semibold">12</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Total Watch Time</span>
                      <span className="font-semibold">4.2 hours</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Average Viewers</span>
                      <span className="font-semibold">24</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Peak Viewers</span>
                      <span className="font-semibold">67</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-card border-surface">
                <CardHeader>
                  <CardTitle>Engagement Metrics</CardTitle>
                  <CardDescription>How your audience interacts</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span>Chat Messages</span>
                      <span className="font-semibold">1,245</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Followers Gained</span>
                      <span className="font-semibold">+89</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Average Session</span>
                      <span className="font-semibold">21 min</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Return Rate</span>
                      <span className="font-semibold">68%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-6">
            <Card className="glass-card border-surface">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  Account Settings
                </CardTitle>
                <CardDescription>
                  Manage your account preferences
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => setLocation("/account")}
                >
                  Profile Settings
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => setLocation("/billing")}
                >
                  Billing & Subscription
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => setLocation("/pricing")}
                >
                  Upgrade Plan
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}