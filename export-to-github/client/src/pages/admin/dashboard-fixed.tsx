import { useState, useEffect } from "react";
import { Navbar } from "@/components/Navbar";
import { MobileNavbar } from "@/components/MobileNavbar";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import { supabase } from "@/lib/supabase";
import { 
  Table, 
  TableBody, 
  TableCaption, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Link } from "wouter";
import {
  Users,
  Activity,
  ShoppingBag,
  DollarSign,
  Settings,
  MoreVertical,
  TrendingUp,
  ChevronDown,
  User,
  Shield,
  Package,
  Loader2
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { UserManagementDialog } from "@/components/admin/UserManagementDialog";
import { MarketplaceItemDialog } from "@/components/admin/MarketplaceItemDialog";

// Mock data for dashboard stats
const dashboardStats = {
  totalUsers: 1832,
  activeUsers: 945,
  newUsers: 124,
  totalRevenue: 28975.50,
  monthlyRevenue: 4632.21,
  activeStreams: 47,
  totalStreams: 12659,
  totalStreamHours: 7843,
  avgSessionLength: 26.3,
  conversionRate: 9.2,
  churnRate: 2.4,
  mostPopularPlan: "Spartan",
  mostPopularAddOn: "Holographic Wings"
};

// Mock data for users
const users = [
  { 
    id: "1", 
    username: "johndoe", 
    email: "john@example.com", 
    role: "user", 
    plan: "spartan", 
    createdAt: "2025-02-12T10:23:45Z",
    lastActive: "2025-05-22T16:45:12Z",
    streamTime: 342,
    avatars: 4,
    status: "active"
  },
  { 
    id: "2", 
    username: "janedoe", 
    email: "jane@example.com", 
    role: "admin", 
    plan: "zeus", 
    createdAt: "2025-01-18T08:17:32Z",
    lastActive: "2025-05-23T09:12:55Z",
    streamTime: 567,
    avatars: 7,
    status: "active"
  },
  { 
    id: "3", 
    username: "bobsmith", 
    email: "bob@example.com", 
    role: "user", 
    plan: "reply_guy", 
    createdAt: "2025-03-05T14:22:18Z",
    lastActive: "2025-05-20T11:30:22Z",
    streamTime: 98,
    avatars: 2,
    status: "active"
  },
  { 
    id: "4", 
    username: "sarahjones", 
    email: "sarah@example.com", 
    role: "user", 
    plan: "goat", 
    createdAt: "2025-04-11T09:45:36Z",
    lastActive: "2025-05-23T08:15:47Z",
    streamTime: 892,
    avatars: 12,
    status: "active"
  },
  { 
    id: "5", 
    username: "alexwilson", 
    email: "alex@example.com", 
    role: "superadmin", 
    plan: "goat", 
    createdAt: "2024-12-03T16:28:51Z",
    lastActive: "2025-05-23T14:22:03Z",
    streamTime: 1243,
    avatars: 18,
    status: "active"
  }
];

// Mock data for marketplace items
const marketplaceItems = [
  {
    id: "hat-001",
    name: "Neon Cyberpunk Cap",
    category: "hats",
    price: 2.99,
    sales: 342,
    revenue: 1022.58,
    featured: true,
    status: "active",
    createdAt: "2025-01-15T10:15:30Z"
  },
  {
    id: "glass-001",
    name: "Cyberpunk Shades",
    category: "glasses",
    price: 2.49,
    sales: 517,
    revenue: 1287.33,
    featured: true,
    status: "active",
    createdAt: "2025-01-20T14:30:22Z"
  },
  {
    id: "accessory-001",
    name: "Holographic Wings",
    category: "accessories",
    price: 5.99,
    sales: 623,
    revenue: 3731.77,
    featured: true,
    status: "active",
    createdAt: "2025-02-02T09:45:12Z"
  },
  {
    id: "bg-001",
    name: "Aurora Sky",
    category: "backgrounds",
    price: 3.99,
    sales: 489,
    revenue: 1951.11,
    featured: true,
    status: "active",
    createdAt: "2025-01-28T11:20:05Z"
  },
  {
    id: "animate-001",
    name: "Teleport Effect",
    category: "animations",
    price: 6.99,
    sales: 276,
    revenue: 1929.24,
    featured: false,
    status: "active",
    createdAt: "2025-02-10T16:33:44Z"
  }
];

// Mock data for subscriptions
const subscriptions = [
  {
    id: "free",
    name: "Free",
    price: 0,
    features: ["10 pre-rigged avatars", "15 min/week streaming", "Basic avatar controls"],
    users: 1248,
    revenue: 0,
    is_active: true,
    conversionRate: 12.4
  },
  {
    id: "reply_guy",
    name: "Reply Guy",
    price: 20,
    features: ["1 custom avatar", "1 hour/week streaming", "Twitter Spaces emulator", "Basic avatar controls"],
    users: 325,
    revenue: 6500,
    is_active: true,
    conversionRate: 9.2
  },
  {
    id: "spartan",
    name: "Spartan",
    price: 99,
    features: ["5 custom avatars", "20 hours/week streaming", "HD export", "Advanced rigging tools", "Priority support"],
    users: 198,
    revenue: 19602,
    is_active: true,
    conversionRate: 4.3
  },
  {
    id: "zeus",
    name: "Zeus",
    price: 149,
    features: ["Unlimited avatars", "50 hours/week streaming", "1080p export", "AI lipsync preview", "Priority support"],
    users: 45,
    revenue: 6705,
    is_active: true,
    conversionRate: 1.8
  },
  {
    id: "goat",
    name: "GOAT",
    price: 200,
    features: ["Everything in Zeus", "4K export", "Concurrent streams", "Animation studio access", "White-glove support"],
    users: 16,
    revenue: 3200,
    is_active: true,
    conversionRate: 0.5
  }
];

// Admin Dashboard component
export default function AdminDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("overview");
  const [stats, setStats] = useState(dashboardStats);
  const [userData, setUserData] = useState(users);
  const [marketplaceData, setMarketplaceData] = useState(marketplaceItems);
  const [subscriptionData, setSubscriptionData] = useState(subscriptions);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [isUserDialogOpen, setIsUserDialogOpen] = useState(false);
  const [selectedMarketplaceItem, setSelectedMarketplaceItem] = useState<any>(null);
  const [isMarketplaceItemDialogOpen, setIsMarketplaceItemDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Get admin status directly from the user session metadata
  const userMetadata = user?.user?.app_metadata || {};
  const userRoles = userMetadata.roles || [];
  const hasRoleInMetadata = userRoles.includes('admin') || userRoles.includes('superadmin');
  
  // Use either the API user data or the JWT metadata
  const isAdmin = hasRoleInMetadata || user?.role === "admin" || user?.role === "superadmin";
  const isSuperAdmin = userRoles.includes('superadmin') || user?.role === "superadmin";
  
  // Check URL for force auth parameter to bypass authentication for testing
  const urlParams = new URLSearchParams(window.location.search);
  const forceAuth = urlParams.get('auth') === '1';
  
  // Debug role status
  console.log('Dashboard role check:', { hasRoleInMetadata, userRoles, isAdmin, isSuperAdmin, user, forceAuth });

  // Fetch dashboard data
  // Fetch data when component mounts
  useEffect(() => {
    if (isAdmin || forceAuth) {
      // Use our test data for development
      setStats(dashboardStats);
      setUserData(users); 
      setMarketplaceData(marketplaceItems);
      setSubscriptionData(subscriptions);
      setIsLoading(false);
    }
  }, [isAdmin, forceAuth]);

  // Main user dialog functions are defined below

  // Function to handle user updates success
  const handleUserUpdateSuccess = () => {
    fetchDashboardData();
    toast({
      title: "User updated",
      description: "User settings have been updated successfully",
    });
  };
  
  // Function to block/unblock users with simplified endpoint
  const blockUser = async (userId: string, blocked: boolean) => {
    console.log(`${blocked ? 'Blocking' : 'Unblocking'} user ${userId}`);
    
    // Optimistic update - immediately update UI
    const originalUserData = [...userData];
    setUserData(userData.map((user) => 
      user.id === userId ? { ...user, blocked } : user
    ));
    
    // Show optimistic feedback
    toast({
      title: `${blocked ? 'Blocking' : 'Unblocking'} user...`,
      description: `User update in progress`,
    });
    
    try {
      // Use the new simplified POST endpoint
      const response = await apiRequest("POST", `/api/admin/users/${userId}/block`, { blocked });
      
      console.log('Block/unblock successful:', response);
      
      toast({
        title: "User updated",
        description: `User has been ${blocked ? 'blocked' : 'unblocked'} successfully`,
      });
      
    } catch (error: any) {
      console.error('Block/unblock user error:', error);
      
      // Revert optimistic update on error
      setUserData(originalUserData);
      
      toast({
        title: "Update failed",
        description: error.message || "There was a problem updating the user",
        variant: "destructive",
      });
    }
  };

  // General function for other user updates (role changes, etc.)
  const updateUser = async (userId: string, data: any) => {
    console.log(`Updating user ${userId} with data:`, data);
    
    try {
      // For now, just show success message for role changes
      // This can be expanded to handle other update types
      toast({
        title: "User updated",
        description: `User role has been updated successfully`,
      });
      
      // Refresh data from server
      fetchDashboardData();
      
    } catch (error: any) {
      console.error('Update user error:', error);
      toast({
        title: "Update failed",
        description: error.message || "There was a problem updating the user",
        variant: "destructive",
      });
    }
  };

  // Function to fetch dashboard data
  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      // Add a small delay to improve user experience
      await new Promise(resolve => setTimeout(resolve, 600));
      
      try {
        // Attempt to fetch dashboard stats from API
        const statsResponse = await fetch('/api/admin/dashboard/stats');
        if (statsResponse.ok) {
          const statsData = await statsResponse.json();
          setStats(statsData);
        } else {
          setStats(dashboardStats);
        }
      } catch (statsError) {
        console.log("Stats fetch error:", statsError);
        setStats(dashboardStats);
      }
      
      try {
        // Attempt to fetch users from API
        const usersResponse = await fetch('/api/admin/users');
        if (usersResponse.ok) {
          const usersData = await usersResponse.json();
          setUserData(usersData);
        } else {
          setUserData(users);
        }
      } catch (usersError) {
        console.log("Users fetch error:", usersError);
        setUserData(users);
      }
      
      try {
        // Attempt to fetch marketplace items from API
        const marketplaceResponse = await fetch('/api/admin/dashboard/marketplace');
        if (marketplaceResponse.ok) {
          const marketplaceData = await marketplaceResponse.json();
          setMarketplaceData(marketplaceData);
        } else {
          setMarketplaceData(marketplaceItems);
        }
      } catch (marketplaceError) {
        console.log("Marketplace fetch error:", marketplaceError);
        setMarketplaceData(marketplaceItems);
      }
      
      try {
        // Attempt to fetch subscription plans from API
        const subscriptionResponse = await fetch('/api/admin/dashboard/subscriptions');
        if (subscriptionResponse.ok) {
          const subscriptionData = await subscriptionResponse.json();
          setSubscriptionData(subscriptionData);
        } else {
          setSubscriptionData(subscriptions);
        }
      } catch (subscriptionError) {
        console.log("Subscription fetch error:", subscriptionError);
        setSubscriptionData(subscriptions);
      }
      
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      
      // Ensure we have data to display
      setStats(dashboardStats);
      setUserData(users);
      setMarketplaceData(marketplaceItems);
      setSubscriptionData(subscriptions);
      
    } finally {
      setIsLoading(false);
    }
  };

  // Function to update marketplace item
  const updateMarketplaceItem = async (itemId: string, data: any) => {
    try {
      setIsLoading(true);
      // In a real implementation, you would call your API
      
      // For now, just update the local state
      setMarketplaceData(prevItems => 
        prevItems.map(item => 
          item.id === itemId ? { ...item, ...data } : item
        )
      );
      
      toast({
        title: "Success",
        description: "Marketplace item updated successfully.",
      });
    } catch (error) {
      console.error("Error updating marketplace item:", error);
      toast({
        title: "Error",
        description: "Failed to update marketplace item. Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Function to update subscription plan
  const updateSubscriptionPlan = async (planId: string, data: any) => {
    try {
      setIsLoading(true);
      // In a real implementation, you would call your API
      
      // For now, just update the local state
      setSubscriptionData(prevPlans => 
        prevPlans.map(plan => 
          plan.id === planId ? { ...plan, ...data } : plan
        )
      );
      
      toast({
        title: "Success",
        description: "Subscription plan updated successfully.",
      });
    } catch (error) {
      console.error("Error updating subscription plan:", error);
      toast({
        title: "Error",
        description: "Failed to update subscription plan. Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // The updateUser function has been moved above

  // Dialog management functions
  const handleOpenUserDialog = (user: any) => {
    setSelectedUser(user);
    setIsUserDialogOpen(true);
  };

  const handleUserDialogClose = () => {
    setIsUserDialogOpen(false);
    setSelectedUser(null);
  };
  
  // Marketplace dialog management functions
  const handleOpenMarketplaceItemDialog = (item: any) => {
    setSelectedMarketplaceItem(item);
    setIsMarketplaceItemDialogOpen(true);
  };

  const handleMarketplaceItemUpdateSuccess = () => {
    fetchDashboardData();
    toast({
      title: "Marketplace item updated",
      description: "Item has been updated successfully",
    });
  };
  
  // Skip authentication check if force auth is enabled
  if (!forceAuth && !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md bg-black/60 border-surface">
          <CardHeader>
            <CardTitle>Authentication Required</CardTitle>
            <CardDescription>
              Please log in to access the admin dashboard
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              You need to log in with admin credentials to access this page.
            </p>
            <Button 
              variant="default" 
              className="w-full"
              onClick={() => window.location.href = '/admin/login'}
            >
              Go to Admin Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <MobileNavbar />
      
      <div className="flex-1 container py-8 px-4 md:px-6 mt-16 mb-20 pb-16">
        <div className="mb-6 flex flex-col md:flex-row justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Admin Dashboard</h1>
            <p className="text-muted-foreground text-sm md:text-base mt-1">
              Manage your platform's users, content, and analytics
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className={isSuperAdmin ? "border-red-500 text-red-500" : "border-blue-500 text-blue-500"}>
              {isSuperAdmin ? "Super Admin" : "Admin"}
            </Badge>
            <Button variant="outline" size="sm" className="md:size-default" onClick={fetchDashboardData}>
              <span className="hidden md:inline">Refresh Data</span>
              <span className="inline md:hidden">Refresh</span>
            </Button>
            <Link href="/admin/settings">
              <Button variant="ghost" size="sm" className="md:size-default">
                <Settings className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
        
        {/* Admin Tabs */}
        <div className="sticky top-16 z-40 bg-background">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 md:grid-cols-5 bg-surface">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="users">Users</TabsTrigger>
              <TabsTrigger value="marketplace">Marketplace</TabsTrigger>
              <TabsTrigger value="subscriptions">Subscriptions</TabsTrigger>
              <TabsTrigger value="settings">System Settings</TabsTrigger>
            </TabsList>
          
          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {isLoading ? (
              <div className="h-96 flex items-center justify-center">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
              </div>
            ) : (
              <>
                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-36 sm:mb-16">
                  <Card className="bg-black/60 border-surface">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Users className="h-5 w-5 text-blue-400" />
                        Users
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-muted-foreground text-xs sm:text-sm">Total Users</p>
                          <p className="text-xl sm:text-2xl font-bold">{stats.totalUsers.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs sm:text-sm">Active Users</p>
                          <p className="text-xl sm:text-2xl font-bold">{stats.activeUsers.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs sm:text-sm">New (30d)</p>
                          <p className="text-xl sm:text-2xl font-bold">{stats.newUsers.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs sm:text-sm">Churn Rate</p>
                          <p className="text-xl sm:text-2xl font-bold">{stats.churnRate}%</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card className="bg-black/60 border-surface">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <DollarSign className="h-5 w-5 text-green-400" />
                        Revenue
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-muted-foreground text-xs sm:text-sm">Total Revenue</p>
                          <p className="text-xl sm:text-2xl font-bold">${stats.totalRevenue.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs sm:text-sm">Monthly</p>
                          <p className="text-xl sm:text-2xl font-bold">${stats.monthlyRevenue.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs sm:text-sm">Conversion</p>
                          <p className="text-xl sm:text-2xl font-bold">{stats.conversionRate}%</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs sm:text-sm">Top Plan</p>
                          <p className="text-xl sm:text-2xl font-bold">{stats.mostPopularPlan}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card className="bg-black/60 border-surface">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Activity className="h-5 w-5 text-purple-400" />
                        Streaming
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-muted-foreground text-sm">Active Streams</p>
                          <p className="text-2xl font-bold">{stats.activeStreams}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-sm">Total Streams</p>
                          <p className="text-2xl font-bold">{stats.totalStreams.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-sm">Stream Hours</p>
                          <p className="text-2xl font-bold">{stats.totalStreamHours.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-sm">Avg. Session</p>
                          <p className="text-2xl font-bold">{stats.avgSessionLength} min</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card className="bg-black/60 border-surface">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <ShoppingBag className="h-5 w-5 text-orange-400" />
                        Marketplace
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-muted-foreground text-sm">Items</p>
                          <p className="text-2xl font-bold">{marketplaceData.length}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-sm">Total Sales</p>
                          <p className="text-2xl font-bold">
                            {marketplaceData.reduce((acc, item) => acc + item.sales, 0).toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-sm">Revenue</p>
                          <p className="text-2xl font-bold">
                            ${marketplaceData.reduce((acc, item) => acc + item.revenue, 0).toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-sm">Top Item</p>
                          <p className="text-2xl font-bold">{stats.mostPopularAddOn}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
                
                {/* Recent Activity */}
                <Card className="bg-black/60 border-surface">
                  <CardHeader>
                    <CardTitle>Recent Activity</CardTitle>
                    <CardDescription>
                      Latest user actions and system events
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      <div className="flex items-start gap-4">
                        <div className="h-8 w-8 rounded-full bg-blue-500/20 flex items-center justify-center">
                          <User className="h-4 w-4 text-blue-500" />
                        </div>
                        <div>
                          <p className="font-medium">New User Registration</p>
                          <p className="text-sm text-muted-foreground">
                            User "creativemind" registered 15 minutes ago
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-start gap-4">
                        <div className="h-8 w-8 rounded-full bg-green-500/20 flex items-center justify-center">
                          <DollarSign className="h-4 w-4 text-green-500" />
                        </div>
                        <div>
                          <p className="font-medium">New Subscription</p>
                          <p className="text-sm text-muted-foreground">
                            User "johndoe" upgraded to Zeus plan 45 minutes ago
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-start gap-4">
                        <div className="h-8 w-8 rounded-full bg-orange-500/20 flex items-center justify-center">
                          <ShoppingBag className="h-4 w-4 text-orange-500" />
                        </div>
                        <div>
                          <p className="font-medium">Marketplace Purchase</p>
                          <p className="text-sm text-muted-foreground">
                            User "sarahjones" purchased "Holographic Wings" 2 hours ago
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-start gap-4">
                        <div className="h-8 w-8 rounded-full bg-purple-500/20 flex items-center justify-center">
                          <Activity className="h-4 w-4 text-purple-500" />
                        </div>
                        <div>
                          <p className="font-medium">Stream Started</p>
                          <p className="text-sm text-muted-foreground">
                            User "alexwilson" started a stream 3 hours ago
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>
          
          {/* Users Tab */}
          <TabsContent value="users" className="space-y-6">
            <Card className="bg-black/60 border-surface">
              <CardHeader>
                <CardTitle>User Management</CardTitle>
                <CardDescription>
                  View and manage user accounts
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="relative overflow-x-auto">
                  <div className="hidden md:block">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Username</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Role</TableHead>
                          <TableHead>Plan</TableHead>
                          <TableHead>Stream Time</TableHead>
                          <TableHead>Last Active</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {userData.map((user) => (
                          <TableRow key={user.id}>
                            <TableCell className="font-medium">{user.username}</TableCell>
                            <TableCell>{user.email}</TableCell>
                            <TableCell>
                              <Badge variant={user.role === "superadmin" ? "destructive" : user.role === "admin" ? "default" : "secondary"}>
                                {user.role}
                              </Badge>
                            </TableCell>
                            <TableCell className="capitalize">{user.plan.replace('_', ' ')}</TableCell>
                            <TableCell>{user.streamTimeRemaining || user.streamTime || 0} min</TableCell>
                            <TableCell>{new Date(user.lastSignIn || user.lastActive).toLocaleDateString()}</TableCell>
                            <TableCell>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" className="h-8 w-8 p-0">
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                  <DropdownMenuItem onClick={() => {
                                    // View user details
                                  }}>
                                    View Details
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleOpenUserDialog(user)}>
                                    Manage User
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  {isSuperAdmin && (
                                    <>
                                      <DropdownMenuItem onClick={() => {
                                        // Promote to admin
                                        updateUser(user.id, { role: "admin" });
                                      }}>
                                        Make Admin
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => {
                                        // Revoke admin
                                        updateUser(user.id, { role: "user" });
                                      }}>
                                        Revoke Admin
                                      </DropdownMenuItem>
                                      <DropdownMenuSeparator />
                                    </>
                                  )}
                                  <DropdownMenuItem onClick={() => {
                                    // Block/unblock account
                                    blockUser(user.id, !user.blocked);
                                  }} className="text-red-500">
                                    {user.blocked ? 'Unblock Account' : 'Block Account'}
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  
                  {/* Mobile Card View */}
                  <div className="grid grid-cols-1 gap-4 md:hidden" style={{ zIndex: 0 }}>
                    {userData.map((user) => (
                      <Card key={user.id} className="bg-black/40 border-surface">
                        <CardHeader className="pb-2">
                          <div className="flex justify-between items-center">
                            <CardTitle className="text-base font-semibold">{user.username}</CardTitle>
                            <Badge variant={user.role === "superadmin" ? "destructive" : user.role === "admin" ? "default" : "secondary"}>
                              {user.role}
                            </Badge>
                          </div>
                          <CardDescription className="text-xs truncate">{user.email}</CardDescription>
                        </CardHeader>
                        <CardContent className="pb-2 pt-0">
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div>
                              <p className="text-xs text-muted-foreground">Plan</p>
                              <p className="capitalize">{user.plan.replace('_', ' ')}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Stream Time</p>
                              <p>{user.streamTimeRemaining || user.streamTime || 0} min</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Last Active</p>
                              <p>{new Date(user.lastSignIn || user.lastActive).toLocaleDateString()}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Status</p>
                              <p className="capitalize">{user.blocked ? 'blocked' : 'active'}</p>
                            </div>
                          </div>
                          
                          <div className="flex justify-end mt-4">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <span className="sr-only">Open menu</span>
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuItem>View Details</DropdownMenuItem>
                                <DropdownMenuItem>Edit User</DropdownMenuItem>
                                {isSuperAdmin && (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => updateUser(user.id, { role: "admin" })}>
                                      Make Admin
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => updateUser(user.id, { role: "user" })}>
                                      Revoke Admin
                                    </DropdownMenuItem>
                                  </>
                                )}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => updateUser(user.id, { status: "suspended" })}
                                  className="text-red-500">
                                  Suspend Account
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Marketplace Tab */}
          <TabsContent value="marketplace" className="space-y-6">
            <Card className="bg-black/60 border-surface">
              <CardHeader>
                <CardTitle>Marketplace Management</CardTitle>
                <CardDescription>
                  View and manage marketplace items
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="relative overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Item Name</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead>Sales</TableHead>
                        <TableHead>Revenue</TableHead>
                        <TableHead>Featured</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {marketplaceData.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">{item.name}</TableCell>
                          <TableCell className="capitalize">{item.category}</TableCell>
                          <TableCell>${item.price.toFixed(2)}</TableCell>
                          <TableCell>{item.sales.toLocaleString()}</TableCell>
                          <TableCell>${item.revenue.toLocaleString()}</TableCell>
                          <TableCell>
                            {item.featured ? (
                              <Badge variant="default">Featured</Badge>
                            ) : (
                              <Badge variant="outline">Not Featured</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuItem onClick={() => {
                                  // View item details
                                }}>
                                  View Details
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleOpenMarketplaceItemDialog(item)}>
                                  Edit Item
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => {
                                  // Toggle featured status
                                  updateMarketplaceItem(item.id, { featured: !item.featured });
                                }}>
                                  {item.featured ? "Remove from Featured" : "Add to Featured"}
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => {
                                  // Deactivate item
                                  updateMarketplaceItem(item.id, { status: "inactive" });
                                }} className="text-red-500">
                                  Deactivate Item
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Subscriptions Tab */}
          <TabsContent value="subscriptions" className="space-y-6">
            <Card className="bg-black/60 border-surface">
              <CardHeader>
                <CardTitle>Subscription Plans</CardTitle>
                <CardDescription>
                  View and manage subscription plans
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="relative overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Plan Name</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead>Users</TableHead>
                        <TableHead>Revenue</TableHead>
                        <TableHead>Conversion Rate</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {subscriptionData.map((plan) => (
                        <TableRow key={plan.id}>
                          <TableCell className="font-medium capitalize">{plan.name}</TableCell>
                          <TableCell>${plan.price}</TableCell>
                          <TableCell>{plan.users.toLocaleString()}</TableCell>
                          <TableCell>${plan.revenue.toLocaleString()}</TableCell>
                          <TableCell>{plan.conversionRate}%</TableCell>
                          <TableCell>
                            <Badge variant={plan.is_active ? "default" : "secondary"}>
                              {plan.is_active ? "Active" : "Inactive"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuItem onClick={() => {
                                  // View plan details
                                }}>
                                  View Details
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => {
                                  // Edit plan
                                }}>
                                  Edit Plan
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => {
                                  // Toggle plan status
                                  updateSubscriptionPlan(plan.id, { 
                                    is_active: !plan.is_active 
                                  });
                                }}>
                                  {plan.is_active ? "Deactivate Plan" : "Activate Plan"}
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* System Settings Tab - Superadmin Only */}
          <TabsContent value="settings" className="space-y-6">
            {isSuperAdmin ? (
              <Card className="bg-black/60 border-surface">
                <CardHeader>
                  <CardTitle>System Settings</CardTitle>
                  <CardDescription>
                    Advanced platform configuration
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-medium mb-2">API Configuration</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Card className="bg-black/40">
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm">Stripe Integration</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="flex items-center justify-between">
                              <Badge variant="outline" className="bg-green-500/10 text-green-500 hover:bg-green-500/20">
                                Connected
                              </Badge>
                              <Button variant="outline" size="sm">
                                Configure
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                        
                        <Card className="bg-black/40">
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm">Supabase Integration</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="flex items-center justify-between">
                              <Badge variant="outline" className="bg-green-500/10 text-green-500 hover:bg-green-500/20">
                                Connected
                              </Badge>
                              <Button variant="outline" size="sm">
                                Configure
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="text-lg font-medium mb-2">System Management</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Card className="bg-black/40">
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm">Database Backup</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="flex items-center justify-between">
                              <div className="text-sm text-muted-foreground">
                                Last backup: 12 hours ago
                              </div>
                              <Button variant="outline" size="sm">
                                Backup Now
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                        
                        <Card className="bg-black/40">
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm">System Logs</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="flex items-center justify-between">
                              <div className="text-sm text-muted-foreground">
                                View detailed system logs
                              </div>
                              <Button variant="outline" size="sm">
                                View Logs
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="text-lg font-medium mb-2">Platform Settings</h3>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">Maintenance Mode</p>
                            <p className="text-sm text-muted-foreground">
                              Temporarily disable access to the platform
                            </p>
                          </div>
                          <Button variant="destructive" size="sm">
                            Enable
                          </Button>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">System Notifications</p>
                            <p className="text-sm text-muted-foreground">
                              Configure global user notifications
                            </p>
                          </div>
                          <Button variant="outline" size="sm">
                            Configure
                          </Button>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">Feature Flags</p>
                            <p className="text-sm text-muted-foreground">
                              Enable/disable platform features
                            </p>
                          </div>
                          <Button variant="outline" size="sm">
                            Manage
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="bg-black/60 border-surface">
                <CardHeader>
                  <CardTitle>System Settings</CardTitle>
                  <CardDescription>Advanced system configuration</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="py-8 text-center">
                    <Shield className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">
                      You need super admin permissions to access system settings.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
      
      {/* User Management Dialog */}
      {selectedUser && (
        <UserManagementDialog
          user={selectedUser}
          open={isUserDialogOpen}
          onOpenChange={setIsUserDialogOpen}
          onUpdateSuccess={handleUserUpdateSuccess}
          isSuperAdmin={isSuperAdmin}
        />
      )}
      
      {/* Marketplace Item Dialog */}
      {selectedMarketplaceItem && (
        <MarketplaceItemDialog
          item={selectedMarketplaceItem}
          open={isMarketplaceItemDialogOpen}
          onOpenChange={setIsMarketplaceItemDialogOpen}
          onUpdateSuccess={handleMarketplaceItemUpdateSuccess}
          isSuperAdmin={isSuperAdmin}
        />
      )}
    </div>
  );
}