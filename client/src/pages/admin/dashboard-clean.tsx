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
import { 
  Table, 
  TableBody, 
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
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Loader2, MoreVertical, LayoutDashboard } from "lucide-react";
import { Link } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";

// Real Supabase connection
import { createClient } from '@supabase/supabase-js';

export default function AdminDashboard() {
  const { user, isAdmin, isSuperAdmin, logout } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Fetch real users from Supabase
  const { data: realUsers = [], isLoading: usersLoading, error: usersError, refetch: refetchUsers } = useQuery({
    queryKey: ["admin-real-users"],
    queryFn: async () => {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseServiceKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
      
      if (!supabaseUrl || !supabaseServiceKey) {
        throw new Error('Supabase credentials not configured');
      }
      
      const adminSupabase = createClient(supabaseUrl, supabaseServiceKey);
      
      const { data, error } = await adminSupabase
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

  // Calculate real stats from Supabase data
  const stats = {
    totalUsers: realUsers.length,
    activeUsers: realUsers.filter(user => !user.blocked).length,
    blockedUsers: realUsers.filter(user => user.blocked).length,
    adminUsers: realUsers.filter(user => user.role === 'admin' || user.role === 'superadmin').length,
  };

  // Transform users for display
  const userData = realUsers.map((user: any) => ({
    id: user.id,
    name: user.username || user.email?.split('@')[0] || 'Unknown User',
    username: user.username || user.email?.split('@')[0] || 'unknown',
    email: user.email,
    role: user.role || 'user',
    plan: user.plan || 'free',
    status: user.blocked ? 'blocked' : 'active',
    lastActive: user.updated_at || user.created_at,
    createdAt: user.created_at,
    avatar: user.avatar_url || '',
  }));

  // Filter users based on search
  const filteredUsers = userData.filter(user => 
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Role update function
  const updateUserRole = async (userId: string, newRole: string) => {
    try {
      setIsLoading(true);
      
      const response = await fetch(`/api/admin/users/${userId}/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole })
      });
      
      if (response.ok) {
        refetchUsers();
        toast({
          title: "Role Updated",
          description: `User role updated to ${newRole}`,
        });
      } else {
        throw new Error('Failed to update role');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update user role",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Status toggle function
  const toggleUserStatus = async (userId: string, blocked: boolean) => {
    try {
      setIsLoading(true);
      
      const response = await fetch(`/api/admin/users/${userId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blocked })
      });
      
      if (response.ok) {
        refetchUsers();
        toast({
          title: blocked ? "User Blocked" : "User Unblocked",
          description: `User has been ${blocked ? 'blocked' : 'unblocked'}`,
        });
      } else {
        throw new Error('Failed to update status');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update user status",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!user || (!isAdmin && !isSuperAdmin)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md glass-card border-surface">
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>You don't have permission to access the admin dashboard.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/">
              <Button className="w-full">Go Home</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-gray-800">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Admin Dashboard</h1>
          <p className="text-muted-foreground">Manage users and platform settings</p>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 lg:grid-cols-2 bg-surface/50 backdrop-blur-sm">
            <TabsTrigger value="overview" className="text-white data-[state=active]:bg-primary data-[state=active]:text-white">
              Overview
            </TabsTrigger>
            <TabsTrigger value="users" className="text-white data-[state=active]:bg-primary data-[state=active]:text-white">
              Users ({stats.totalUsers})
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="glass-card border-surface shadow-glow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Total Users</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalUsers}</div>
                </CardContent>
              </Card>
              
              <Card className="glass-card border-surface shadow-glow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Active Users</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-400">{stats.activeUsers}</div>
                </CardContent>
              </Card>
              
              <Card className="glass-card border-surface shadow-glow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Blocked Users</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-400">{stats.blockedUsers}</div>
                </CardContent>
              </Card>
              
              <Card className="glass-card border-surface shadow-glow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Admin Users</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-400">{stats.adminUsers}</div>
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
              <>
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold">User Management</h2>
                  <Input 
                    placeholder="Search users..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full md:w-64 bg-surface border-surface"
                  />
                </div>
                
                <Card className="glass-card border-surface shadow-glow-sm">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-surface hover:bg-black/40">
                        <TableHead>User</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Plan</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredUsers.map((user) => (
                        <TableRow key={user.id} className="border-surface hover:bg-black/40">
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar>
                                <AvatarImage src={user.avatar} />
                                <AvatarFallback>{user.name.substring(0, 2)}</AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium">{user.name}</p>
                                <p className="text-sm text-muted-foreground">@{user.username}</p>
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
                            <Badge variant="outline" className="capitalize">
                              {user.plan}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className={`w-2 h-2 rounded-full ${
                                user.status === 'blocked' ? 'bg-red-500' : 'bg-green-500'
                              }`}></div>
                              <span className="capitalize">{user.status}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" disabled={isLoading}>
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="bg-surface/95 backdrop-blur-sm border-surface">
                                <DropdownMenuLabel>User Actions</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                
                                {/* Status Management */}
                                <DropdownMenuItem 
                                  onClick={() => toggleUserStatus(user.id, user.status !== 'blocked')}
                                  className={user.status === 'blocked' ? 'text-green-400' : 'text-red-400'}
                                >
                                  {user.status === 'blocked' ? '✓ Unblock User' : '⚠ Block User'}
                                </DropdownMenuItem>
                                
                                <DropdownMenuSeparator />
                                
                                {/* Role Management */}
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
                  
                  {filteredUsers.length === 0 && (
                    <div className="p-8 text-center text-muted-foreground">
                      {searchTerm ? 'No users found matching your search.' : 'No users found.'}
                    </div>
                  )}
                </Card>
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>
      
      <MobileNavbar />
    </div>
  );
}