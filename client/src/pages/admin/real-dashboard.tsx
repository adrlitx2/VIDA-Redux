import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  Activity, 
  TrendingUp, 
  DollarSign,
  Settings,
  Loader2
} from "lucide-react";
import { UserManagementDialog } from "@/components/admin/UserManagementDialog";

export default function RealAdminDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [isUserDialogOpen, setIsUserDialogOpen] = useState(false);

  // Check if user is admin
  const userRoles = user?.supabaseUser?.app_metadata?.roles || [];
  const isAdmin = userRoles.includes("admin") || userRoles.includes("superadmin");
  const isSuperAdmin = userRoles.includes("superadmin");

  // Fetch real users from backend API
  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ["real-admin-users"],
    queryFn: async () => {
      const response = await fetch('/api/admin/users');
      
      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }
      
      const data = await response.json();
      console.log('Fetched real users from API:', data);
      return data || [];
    }
  });

  // Dashboard stats based on real data
  const stats = {
    totalUsers: users.length,
    activeUsers: users.filter(u => u.status === 'active').length,
    paidUsers: users.filter(u => u.plan !== 'free').length,
    totalRevenue: users.reduce((sum, u) => {
      const planPrices = { free: 0, reply_guy: 9.99, spartan: 29.99, zeus: 79.99, goat: 199.99 };
      return sum + (planPrices[u.plan as keyof typeof planPrices] || 0);
    }, 0)
  };

  // User management functions
  const handleOpenUserDialog = (user: any) => {
    setSelectedUser(user);
    setIsUserDialogOpen(true);
  };

  const handleUserUpdateSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ["real-admin-users"] });
    toast({
      title: "User updated",
      description: "User has been updated successfully",
    });
  };

  // Access control check after all hooks
  if (!user || !isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-muted-foreground">Access Denied</h1>
          <p className="text-muted-foreground">You need admin privileges to access this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <MobileNavbar />
      
      <div className="flex-1 container py-8 px-4 md:px-6 mt-16 mb-20">
        <div className="mb-6 flex flex-col md:flex-row justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Admin Dashboard
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage real users from your Supabase database
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={isSuperAdmin ? "border-red-500 text-red-500" : "border-blue-500 text-blue-500"}>
              {isSuperAdmin ? "Super Admin" : "Admin"}
            </Badge>
            <Button variant="outline" onClick={() => queryClient.invalidateQueries({ queryKey: ["real-admin-users"] })}>
              Refresh Data
            </Button>
          </div>
        </div>
        
        {/* Admin Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-5 bg-surface">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="marketplace">Marketplace</TabsTrigger>
            <TabsTrigger value="content">Content</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>
          
          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card className="bg-black/60 border-surface">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalUsers}</div>
                  <p className="text-xs text-muted-foreground">
                    Real database users
                  </p>
                </CardContent>
              </Card>
              
              <Card className="bg-black/60 border-surface">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active Users</CardTitle>
                  <Activity className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.activeUsers}</div>
                  <p className="text-xs text-muted-foreground">
                    Currently active
                  </p>
                </CardContent>
              </Card>
              
              <Card className="bg-black/60 border-surface">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Paid Users</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.paidUsers}</div>
                  <p className="text-xs text-muted-foreground">
                    Subscribed users
                  </p>
                </CardContent>
              </Card>
              
              <Card className="bg-black/60 border-surface">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Revenue</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">${stats.totalRevenue.toFixed(2)}</div>
                  <p className="text-xs text-muted-foreground">
                    Monthly recurring
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          {/* Users Tab */}
          <TabsContent value="users" className="space-y-6">
            {usersLoading ? (
              <div className="h-96 flex items-center justify-center">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
              </div>
            ) : (
              <Card className="bg-black/60 border-surface">
                <CardHeader>
                  <CardTitle>Real Database Users</CardTitle>
                  <CardDescription>
                    Manage actual users from your Supabase database - subscription changes will save!
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow className="border-surface">
                        <TableHead>User</TableHead>
                        <TableHead>Plan</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((user: any) => (
                        <TableRow key={user.id} className="border-surface">
                          <TableCell>
                            <div className="font-medium">{user.username || user.email}</div>
                            <div className="text-sm text-muted-foreground">{user.email}</div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="capitalize">
                              {user.plan?.replace('_', ' ') || 'free'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant="outline" 
                              className={user.status === "active" ? "border-green-500 text-green-500" : "border-red-500 text-red-500"}
                            >
                              {user.status || 'active'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {user.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => handleOpenUserDialog(user)}
                            >
                              Edit
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  
                  {users.length === 0 && (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">No users found in database</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>
          
          {/* Marketplace Tab */}
          <TabsContent value="marketplace" className="space-y-6">
            <Card className="bg-black/60 border-surface">
              <CardHeader>
                <CardTitle>Marketplace Management</CardTitle>
                <CardDescription>Manage avatar items, add-ons, and marketplace content</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <p className="text-muted-foreground">Marketplace management features coming soon</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Content Tab */}
          <TabsContent value="content" className="space-y-6">
            <Card className="bg-black/60 border-surface">
              <CardHeader>
                <CardTitle>Content Management</CardTitle>
                <CardDescription>Manage avatars, streaming content, and moderation</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <p className="text-muted-foreground">Content management features coming soon</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <Card className="bg-black/60 border-surface">
                <CardHeader>
                  <CardTitle>Revenue Analytics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">${stats.totalRevenue.toFixed(2)}</div>
                  <p className="text-xs text-muted-foreground">Monthly recurring revenue</p>
                </CardContent>
              </Card>
              
              <Card className="bg-black/60 border-surface">
                <CardHeader>
                  <CardTitle>User Growth</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalUsers}</div>
                  <p className="text-xs text-muted-foreground">Total registered users</p>
                </CardContent>
              </Card>
            </div>
            
            <Card className="bg-black/60 border-surface">
              <CardHeader>
                <CardTitle>Platform Analytics</CardTitle>
                <CardDescription>Detailed insights and metrics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <p className="text-muted-foreground">Advanced analytics dashboard coming soon</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* User Management Dialog */}
      {selectedUser && (
        <UserManagementDialog
          user={{
            id: selectedUser.id,
            username: selectedUser.username || selectedUser.email,
            email: selectedUser.email,
            role: selectedUser.role || "user",
            plan: selectedUser.plan || "free",
            status: selectedUser.status || "active"
          }}
          open={isUserDialogOpen}
          onOpenChange={setIsUserDialogOpen}
          onUpdateSuccess={handleUserUpdateSuccess}
          isSuperAdmin={isSuperAdmin}
        />
      )}
    </div>
  );
}