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
import { 
  Avatar,
  AvatarFallback,
  AvatarImage 
} from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Loader2, MoreVertical, Settings, Users } from "lucide-react";
import { Link } from "wouter";
import { UserManagementDialog } from "@/components/admin/UserManagementDialog";
import { MarketplaceItemDialog } from "@/components/admin/MarketplaceItemDialog";

// Test data - keeping for all tabs except Users which uses real data
import { 
  dashboardStats, 
  users, 
  marketplaceItems,
  subscriptions 
} from "@/lib/admin-test-data";

// Import for real database access
import { useQuery, useQueryClient } from "@tanstack/react-query";

export default function AdminDashboard() {
  const { user, isAdmin, isSuperAdmin } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("overview");
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [forceAuth] = useState(false); // Change to true for development testing
  
  // Get roles from user metadata for role-based access
  const userRoles = user?.supabaseUser?.app_metadata?.roles || [];
  const allRoles = [...userRoles, user?.role].filter(Boolean);
  const hasRoleInMetadata = userRoles.length > 0;
  
  // Debug role status
  console.log('Dashboard role check:', { hasRoleInMetadata, userRoles: allRoles, isAdmin, isSuperAdmin, forceAuth });

  // Fetch real users from Supabase
  const { data: realUsers = [], isLoading: isLoadingUsers } = useQuery({
    queryKey: ['/api/admin/users'],
    queryFn: async () => {
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(
        import.meta.env.VITE_SUPABASE_URL,
        import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY
      );
      
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (error) {
        console.error('Error fetching users:', error);
        throw new Error(error.message);
      }
      
      return data || [];
    }
  });

  const [stats, setStats] = useState(dashboardStats);
  const [marketplaceData, setMarketplaceData] = useState(marketplaceItems);
  const [subscriptionData, setSubscriptionData] = useState(subscriptions);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [isUserDialogOpen, setIsUserDialogOpen] = useState(false);
  const [selectedMarketplaceItem, setSelectedMarketplaceItem] = useState<any>(null);
  const [isMarketplaceItemDialogOpen, setIsMarketplaceItemDialogOpen] = useState(false);

  // Fetch dashboard data
  useEffect(() => {
    if (isAdmin || forceAuth) {
      // Use our test data for development (except users - using real Supabase data)
      setStats(dashboardStats);
      setMarketplaceData(marketplaceItems);
      setSubscriptionData(subscriptions);
      setIsLoading(false);
    }
  }, [isAdmin, forceAuth]);

  // Fetch data from API
  const fetchDashboardData = async () => {
    if (!isAdmin && !forceAuth) return;
    
    setIsLoading(true);
    try {
      // For development, just simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Set with test data (except users - using real Supabase data)
      setStats(dashboardStats);
      setMarketplaceData(marketplaceItems);
      setSubscriptionData(subscriptions);
      
      toast({
        title: "Data refreshed",
        description: "Dashboard data has been updated",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to fetch dashboard data",
        variant: "destructive",
      });
      
      // Fallback to test data if API fails
      setStats(dashboardStats);
      setMarketplaceData(marketplaceItems);
      setSubscriptionData(subscriptions);
    } finally {
      setIsLoading(false);
    }
  };

  // User management functions
  const handleOpenUserDialog = (user: any) => {
    console.log('Opening user dialog for:', user);
    setSelectedUser(user);
    setIsUserDialogOpen(true);
  };

  const handleCloseUserDialog = () => {
    setSelectedUser(null);
    setIsUserDialogOpen(false);
  };

  const handleUserUpdateSuccess = () => {
    fetchDashboardData();
    toast({
      title: "User updated",
      description: "User settings have been updated successfully",
    });
  };

  // Function to update user role
  const updateUserRole = async (userId: string, newRole: string) => {
    try {
      const response = await apiRequest("POST", "/api/admin/users/role", {
        userId,
        role: newRole
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to update user role");
      }
      
      toast({
        title: "Role updated",
        description: `User role has been updated to ${newRole}`,
      });
      
      // Refresh the user data
      fetchDashboardData();
    } catch (error: any) {
      toast({
        title: "Update failed", 
        description: error.message || "There was a problem updating the user role",
        variant: "destructive",
      });
    }
  };

  // Function to toggle user status (block/unblock)
  const toggleUserStatus = async (userId: string, blocked: boolean) => {
    try {
      const response = await apiRequest("POST", "/api/admin/users/status", {
        userId,
        blocked
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to update user status");
      }
      
      toast({
        title: "Status updated",
        description: `User has been ${blocked ? 'blocked' : 'unblocked'} successfully`,
      });
      
      // Refresh the user data
      fetchDashboardData();
    } catch (error: any) {
      toast({
        title: "Update failed",
        description: error.message || "There was a problem updating the user status", 
        variant: "destructive",
      });
    }
  };

  // Access control
  if (!isAdmin && !forceAuth) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-purple-900/20 to-black text-white">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-96">
            <Card className="glass-card border-surface">
              <CardHeader>
                <CardTitle className="text-red-400">Access Denied</CardTitle>
                <CardDescription>
                  You don't have permission to access the admin dashboard.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
        <MobileNavbar />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-purple-900/20 to-black text-white">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            Admin Dashboard
          </h1>
          <p className="text-muted-foreground">
            Manage users, content, and platform settings
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
          <TabsList className="glass-card border-surface p-1">
            <TabsTrigger value="overview" className="data-[state=active]:bg-primary/20">
              Overview
            </TabsTrigger>
            <TabsTrigger value="users" className="data-[state=active]:bg-primary/20">
              Users
            </TabsTrigger>
            <TabsTrigger value="marketplace" className="data-[state=active]:bg-primary/20">
              Marketplace
            </TabsTrigger>
            <TabsTrigger value="subscriptions" className="data-[state=active]:bg-primary/20">
              Subscriptions
            </TabsTrigger>
            <TabsTrigger value="analytics" className="data-[state=active]:bg-primary/20">
              Analytics
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Stats Cards */}
              <Card className="glass-card border-surface shadow-glow-sm">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalUsers}</div>
                  <p className="text-xs text-muted-foreground">
                    +{stats.newUsers} new this month
                  </p>
                </CardContent>
              </Card>

              <Card className="glass-card border-surface shadow-glow-sm">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active Streams</CardTitle>
                  <div className="h-4 w-4 rounded-full bg-red-500 animate-pulse" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.activeStreams}</div>
                  <p className="text-xs text-muted-foreground">
                    {stats.totalStreams} total streams
                  </p>
                </CardContent>
              </Card>

              <Card className="glass-card border-surface shadow-glow-sm">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
                  <div className="h-4 w-4 text-green-400">$</div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">${stats.monthlyRevenue}</div>
                  <p className="text-xs text-muted-foreground">
                    ${stats.annualRevenue}/year
                  </p>
                  <div className={`text-xs ${stats.revenueGrowth >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {stats.revenueGrowth >= 0 ? '+' : ''}{stats.revenueGrowth}% from last month
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-card border-surface shadow-glow-sm">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Avatars</CardTitle>
                  <div className="h-4 w-4 text-purple-400">🎭</div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalAvatars}</div>
                  <p className="text-xs text-muted-foreground">
                    +{stats.newAvatars} created this month
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Recent Activity */}
            <Card className="glass-card border-surface shadow-glow-sm">
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>Latest platform activity and events</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {stats.recentActivity.map((activity: any, index: number) => (
                    <div key={index} className="flex items-center space-x-4">
                      <div className="flex-shrink-0">
                        <div className={`w-2 h-2 rounded-full ${
                          activity.status === 'success' ? 'bg-green-500' :
                          activity.status === 'warning' ? 'bg-yellow-500' :
                          activity.status === 'error' ? 'bg-red-500' :
                          'bg-blue-500'
                        }`}></div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {activity.user} {activity.action}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {activity.date}
                        </p>
                      </div>
                      <div className={`text-xs ${
                        activity.status === 'success' ? 'text-green-400' :
                        activity.status === 'warning' ? 'text-yellow-400' :
                        activity.status === 'error' ? 'text-red-400' :
                        'text-blue-400'
                      }`}>
                        {activity.status}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">User Management</h2>
              <div className="flex gap-4">
                <Input
                  placeholder="Search users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-64 bg-surface/50 border-surface"
                />
                <Button onClick={fetchDashboardData} disabled={isLoading}>
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Refresh"}
                </Button>
              </div>
            </div>

            <Card className="glass-card border-surface shadow-glow-sm">
              <CardContent className="p-0">
                <div className="relative">
                  {/* Desktop Table View */}
                  <div className="hidden md:block">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-surface hover:bg-black/40">
                          <TableHead>User</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Role</TableHead>
                          <TableHead>Subscription</TableHead>
                          <TableHead>Streaming</TableHead>
                          <TableHead>Avatars</TableHead>
                          <TableHead>Engagement</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {realUsers
                          .filter((user: any) => 
                            (user.username || user.email?.split('@')[0] || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                            (user.email || '').toLowerCase().includes(searchTerm.toLowerCase())
                          )
                          .map((user: any) => (
                          <TableRow key={user.id} className="border-surface hover:bg-black/40">
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <Avatar>
                                  <AvatarImage src={user.avatar_url} />
                                  <AvatarFallback>{(user.username || user.email?.split('@')[0] || 'U').substring(0, 2).toUpperCase()}</AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="font-medium">{user.username || user.email?.split('@')[0] || 'Unknown User'}</p>
                                  <p className="text-sm text-muted-foreground">@{user.username || user.email?.split('@')[0] || 'unknown'}</p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-muted-foreground">{user.email}</TableCell>
                            <TableCell>
                              <Badge variant={
                                user.role === 'superadmin' ? 'destructive' : 
                                user.role === 'admin' ? 'default' : 'outline'
                              } className={
                                user.role === 'superadmin' ? 'bg-purple-500/20 text-purple-400 border-purple-500/40' :
                                user.role === 'admin' ? 'bg-blue-500/20 text-blue-400 border-blue-500/40' :
                                'bg-gray-500/20 text-gray-400 border-gray-500/40'
                              }>
                                {user.role === 'superadmin' ? '👑 Super Admin' : 
                                 user.role === 'admin' ? '🛡️ Admin' : 
                                 '👤 User'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className={
                                  user.plan === 'goat' ? 'bg-gradient-to-r from-yellow-500/20 to-orange-500/20 text-yellow-400 border-yellow-500/40' :
                                  user.plan === 'zeus' ? 'bg-blue-500/20 text-blue-400 border-blue-500/40' :
                                  user.plan === 'spartan' ? 'bg-green-500/20 text-green-400 border-green-500/40' :
                                  user.plan === 'reply_guy' ? 'bg-purple-500/20 text-purple-400 border-purple-500/40' :
                                  'bg-gray-500/20 text-gray-400 border-gray-500/40'
                                }>
                                  {user.plan === 'goat' ? '🐐 GOAT' :
                                   user.plan === 'zeus' ? '⚡ Zeus' :
                                   user.plan === 'spartan' ? '🛡️ Spartan' :
                                   user.plan === 'reply_guy' ? '💬 Reply Guy' :
                                   '🆓 Free'}
                                </Badge>
                              </div>
                            </TableCell>
                            
                            {/* Streaming Activity */}
                            <TableCell>
                              <div className="text-center">
                                <div className="text-sm font-medium">
                                  {Math.floor((user.total_stream_time || 0) / 60)}m
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {user.total_stream_sessions || 0} sessions
                                </div>
                              </div>
                            </TableCell>
                            
                            {/* Avatar Creation */}
                            <TableCell>
                              <div className="text-center">
                                <div className="text-sm font-medium">
                                  {user.avatars_created || 0}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {user.last_avatar_created_at ? 'Recent' : 'None'}
                                </div>
                              </div>
                            </TableCell>
                            
                            {/* Engagement Metrics */}
                            <TableCell>
                              <div className="text-center">
                                <div className="text-sm font-medium flex items-center gap-1">
                                  👥 {user.follower_count || 0}
                                  {user.is_verified && <span className="text-blue-400">✓</span>}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  👁️ {user.viewer_count || 0} viewers
                                </div>
                              </div>
                            </TableCell>
                            
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${
                                  user.blocked ? 'bg-red-500' : 'bg-green-500'
                                }`}></div>
                                <span className="capitalize">
                                  {user.blocked ? 'Blocked' : 'Active'}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon">
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="bg-surface/95 backdrop-blur-sm border-surface">
                                  <DropdownMenuLabel>User Actions</DropdownMenuLabel>
                                  <DropdownMenuItem onClick={() => handleOpenUserDialog(user)}>
                                    Edit Profile
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  
                                  {/* Status Management */}
                                  <DropdownMenuItem 
                                    onClick={() => toggleUserStatus(user.id, !user.blocked)}
                                    className={user.blocked ? 'text-green-400' : 'text-red-400'}
                                  >
                                    {user.blocked ? '✓ Unblock User' : '⚠ Block User'}
                                  </DropdownMenuItem>
                                  
                                  <DropdownMenuSeparator />
                                  
                                  {/* Role Management with Hierarchy */}
                                  {user.role === 'user' && (isAdmin || isSuperAdmin) && (
                                    <DropdownMenuItem onClick={() => updateUserRole(user.id, 'admin')}>
                                      ⬆ Promote to Admin
                                    </DropdownMenuItem>
                                  )}
                                  
                                  {user.role === 'admin' && (
                                    <>
                                      <DropdownMenuItem onClick={() => updateUserRole(user.id, 'user')}>
                                        ⬇ Demote to User
                                      </DropdownMenuItem>
                                      {isSuperAdmin && (
                                        <DropdownMenuItem onClick={() => updateUserRole(user.id, 'superadmin')}>
                                          ⬆ Promote to Super Admin
                                        </DropdownMenuItem>
                                      )}
                                    </>
                                  )}
                                  
                                  {user.role === 'superadmin' && isSuperAdmin && (
                                    <DropdownMenuItem 
                                      onClick={() => updateUserRole(user.id, 'admin')}
                                      className="text-yellow-400"
                                    >
                                      ⬇ Demote to Admin
                                    </DropdownMenuItem>
                                  )}
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
                    {realUsers
                      .filter((user: any) => 
                        (user.username || user.email?.split('@')[0] || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                        (user.email || '').toLowerCase().includes(searchTerm.toLowerCase())
                      )
                      .map((user: any) => (
                      <Card key={user.id} className="glass-card border-surface shadow-glow-sm">
                        <CardHeader className="pb-2">
                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-3">
                              <Avatar>
                                <AvatarImage src={user.avatar_url} />
                                <AvatarFallback>{(user.username || user.email?.split('@')[0] || 'U').substring(0, 2).toUpperCase()}</AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium">{user.username || user.email?.split('@')[0] || 'Unknown User'}</p>
                                <p className="text-sm text-muted-foreground">@{user.username || user.email?.split('@')[0] || 'unknown'}</p>
                              </div>
                            </div>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuItem onClick={() => handleOpenUserDialog(user)}>
                                  Edit User
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => {
                                  console.log('Toggle status for:', user.id);
                                }}>
                                  {user.blocked ? 'Unblock' : 'Block'} User
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <p className="text-muted-foreground">Email</p>
                              <p className="truncate">{user.email}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Role</p>
                              <Badge variant="outline" className="text-xs">
                                {user.role || 'User'}
                              </Badge>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Plan</p>
                              <Badge variant="outline" className="text-xs">
                                {user.plan || 'Free'}
                              </Badge>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Status</p>
                              <Badge variant={user.blocked ? 'destructive' : 'default'} className="text-xs">
                                {user.blocked ? 'Blocked' : 'Active'}
                              </Badge>
                            </div>
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
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Marketplace Management</h2>
              <Button onClick={fetchDashboardData} disabled={isLoading}>
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Refresh"}
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {marketplaceData.map((item: any) => (
                <Card key={item.id} className="glass-card border-surface shadow-glow-sm">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">{item.name}</CardTitle>
                        <CardDescription>${item.price}</CardDescription>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem>Edit Item</DropdownMenuItem>
                          <DropdownMenuItem>View Sales</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-red-400">
                            Remove Item
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Category</span>
                        <span>{item.category}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Sales</span>
                        <span>{item.sales}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Rating</span>
                        <span>⭐ {item.rating}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Status</span>
                        <Badge variant={item.active ? "default" : "secondary"}>
                          {item.active ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Subscriptions Tab */}
          <TabsContent value="subscriptions" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Subscription Management</h2>
              <Button onClick={fetchDashboardData} disabled={isLoading}>
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Refresh"}
              </Button>
            </div>

            {/* Subscription Plans */}
            <Card className="glass-card border-surface shadow-glow-sm">
              <CardHeader>
                <CardTitle>Subscription Plans</CardTitle>
                <CardDescription>Manage pricing and features</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {subscriptionData.plans?.map((plan: any, index: number) => (
                    <Card key={index} className="glass-card shadow-glow-sm">
                      <CardHeader>
                        <CardTitle className="flex justify-between">
                          <span>{plan.name}</span>
                          <Badge variant={plan.featured ? "default" : "outline"}>
                            {plan.featured ? "Featured" : "Standard"}
                          </Badge>
                        </CardTitle>
                        <CardDescription>${plan.price}/month</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <div className="text-sm">
                            <span className="text-muted-foreground">Active Users: </span>
                            <span>{plan.activeUsers}</span>
                          </div>
                          <div className="text-sm">
                            <span className="text-muted-foreground">Features:</span>
                          </div>
                          <ul className="text-xs space-y-1">
                            {plan.features.map((feature: string, index: number) => (
                              <li key={index} className="text-muted-foreground">• {feature}</li>
                            ))}
                          </ul>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Recent Subscriptions */}
            <Card className="glass-card border-surface shadow-glow-sm">
              <CardHeader>
                <CardTitle>Recent Subscriptions</CardTitle>
                <CardDescription>Latest subscription activity</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {subscriptionData.recent?.map((sub: any, index: number) => (
                    <div key={index} className="flex items-center justify-between p-4 border border-surface rounded-lg">
                      <div>
                        <p className="font-medium">{sub.user}</p>
                        <p className="text-sm text-muted-foreground">{sub.plan} - {sub.date}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">${sub.amount}</p>
                        <Badge variant="outline" className="text-xs">
                          {sub.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Analytics & Reports</h2>
              <Button onClick={fetchDashboardData} disabled={isLoading}>
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Refresh"}
              </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="glass-card border-surface shadow-glow-sm">
                <CardHeader>
                  <CardTitle>Platform Growth</CardTitle>
                  <CardDescription>User acquisition and retention metrics</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">User Growth</span>
                      <span className="text-sm font-medium">+{stats.userGrowth}%</span>
                    </div>
                    <Progress value={stats.userGrowth} className="h-2" />
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Stream Growth</span>
                      <span className="text-sm font-medium">+{stats.streamGrowth}%</span>
                    </div>
                    <Progress value={stats.streamGrowth} className="h-2" />
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Avatar Creation</span>
                      <span className="text-sm font-medium">+{stats.avatarGrowth}%</span>
                    </div>
                    <Progress value={stats.avatarGrowth} className="h-2" />
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-card border-surface shadow-glow-sm">
                <CardHeader>
                  <CardTitle>Revenue Analytics</CardTitle>
                  <CardDescription>Financial performance overview</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="text-3xl font-bold">${stats.monthlyRevenue}</div>
                    <div className="text-sm text-muted-foreground">Monthly Revenue</div>
                    
                    <div className="grid grid-cols-2 gap-4 mt-4">
                      <div>
                        <div className="text-lg font-semibold">${stats.annualRevenue}</div>
                        <div className="text-xs text-muted-foreground">Annual Revenue</div>
                      </div>
                      <div>
                        <div className={`text-lg font-semibold ${stats.revenueGrowth >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {stats.revenueGrowth >= 0 ? '+' : ''}{stats.revenueGrowth}%
                        </div>
                        <div className="text-xs text-muted-foreground">Growth Rate</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <MobileNavbar />

      {/* User Management Dialog */}
      {selectedUser && (
        <UserManagementDialog
          user={selectedUser}
          open={isUserDialogOpen}
          onOpenChange={setIsUserDialogOpen}
          onUpdateSuccess={handleUserUpdateSuccess}
        />
      )}

      {/* Marketplace Item Dialog */}
      {selectedMarketplaceItem && (
        <MarketplaceItemDialog
          item={selectedMarketplaceItem}
          open={isMarketplaceItemDialogOpen}
          onOpenChange={setIsMarketplaceItemDialogOpen}
          onUpdateSuccess={fetchDashboardData}
        />
      )}
    </div>
  );
}