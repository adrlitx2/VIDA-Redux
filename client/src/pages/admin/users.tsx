import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { BadgeGlow } from "@/components/ui/badge-glow";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import Navbar from "@/components/Navbar";
import MobileNavbar from "@/components/MobileNavbar";
import { Sidebar } from "./Sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function AdminUsers() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [planFilter, setPlanFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [editUser, setEditUser] = useState<any | null>(null);
  const [blockUser, setBlockUser] = useState<any | null>(null);

  // Check if user is admin
  if (!user || (user.role !== "admin" && user.role !== "superadmin")) {
    setLocation("/login");
    return null;
  }

  // Fetch users
  const { data: users, isLoading } = useQuery({
    queryKey: ["/api/admin/users", search, planFilter, statusFilter],
  });

  // Update user mutation
  const updateUserMutation = useMutation({
    mutationFn: async (userData: any) => {
      try {
        const response = await apiRequest("POST", `/api/admin/users/${userData.id}/update`, userData);
        // Backend returns success response, no need to check response.success
        return response;
      } catch (error) {
        console.error('Direct mutation error:', error);
        throw error;
      }
    },
    onSuccess: () => {
      toast({
        title: "User updated",
        description: "User details have been updated successfully.",
      });
      setEditUser(null);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
    },
    onError: (error: any) => {
      console.error('Users.tsx update error:', error);
      toast({
        title: "Update failed",
        description: `Failed to update user: ${error.message || error}`,
        variant: "destructive",
      });
    },
  });

  // Block/unblock user mutation
  const blockUserMutation = useMutation({
    mutationFn: async ({ id, blocked }: { id: string, blocked: boolean }) => {
      try {
        const response = await apiRequest("POST", `/api/admin/users/${id}/block`, { blocked });
        // Backend returns success response, no need to check response.success
        return response;
      } catch (error) {
        console.error('Direct block mutation error:', error);
        throw error;
      }
    },
    onSuccess: () => {
      toast({
        title: "User status updated",
        description: `User has been ${blockUser?.blocked ? 'unblocked' : 'blocked'}.`,
      });
      setBlockUser(null);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
    },
    onError: (error) => {
      toast({
        title: "Operation failed",
        description: `Failed to update user status: ${error}`,
        variant: "destructive",
      });
    },
  });

  // Handle user update
  const handleUpdateUser = () => {
    if (editUser) {
      updateUserMutation.mutate(editUser);
    }
  };

  // Handle block/unblock user
  const handleBlockUser = () => {
    if (blockUser) {
      blockUserMutation.mutate({
        id: blockUser.id,
        blocked: !blockUser.blocked,
      });
    }
  };

  // Filter users based on search and filters
  const filteredUsers = Array.isArray(users) ? users.filter((user: any) => {
    const matchesSearch = search === "" || 
      user.username.toLowerCase().includes(search.toLowerCase()) ||
      user.email.toLowerCase().includes(search.toLowerCase());
    
    const matchesPlan = planFilter === "all" || user.plan === planFilter;
    
    const matchesStatus = statusFilter === "all" || 
      (statusFilter === "active" && !user.blocked) ||
      (statusFilter === "blocked" && user.blocked);
    
    return matchesSearch && matchesPlan && matchesStatus;
  }) : [];

  // Get initials for avatar fallback
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase();
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <MobileNavbar />
      <div className="container mx-auto px-4 py-20">
        <div className="flex flex-col md:flex-row gap-6">
          {/* Sidebar Navigation */}
          <div className="md:w-64 w-full mb-6 md:mb-0">
            <Sidebar />
          </div>

          {/* Main Content */}
          <div className="flex-1">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8">
              <div>
                <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
                <p className="text-muted-foreground">
                  Manage platform users, roles, and subscriptions.
                </p>
              </div>
              <div className="mt-4 md:mt-0">
                <Button>
                  <i className="ri-add-line mr-2"></i> Add User
                </Button>
              </div>
            </div>

            {/* Filter Controls */}
            <Card className="mb-6 bg-surface/40 backdrop-blur-lg border-surface-light/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Users</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1">
                    <Input
                      placeholder="Search by username or email..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <Select value={planFilter} onValueChange={setPlanFilter}>
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Filter by plan" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Plans</SelectItem>
                        <SelectItem value="free">Free</SelectItem>
                        <SelectItem value="reply_guy">Reply Guy</SelectItem>
                        <SelectItem value="spartan">Spartan</SelectItem>
                        <SelectItem value="zeus">Zeus</SelectItem>
                        <SelectItem value="goat">GOAT</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Filter by status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="blocked">Blocked</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Users Table */}
            <Card className="bg-surface/40 backdrop-blur-lg border-surface-light/20 overflow-hidden">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Plan</TableHead>
                        <TableHead>Joined</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoading ? (
                        Array(5).fill(0).map((_, index) => (
                          <TableRow key={index}>
                            {Array(6).fill(0).map((_, cellIndex) => (
                              <TableCell key={cellIndex}>
                                <div className="h-6 bg-surface-light animate-pulse rounded"></div>
                              </TableCell>
                            ))}
                          </TableRow>
                        ))
                      ) : filteredUsers?.length > 0 ? (
                        filteredUsers.map((user: any) => (
                          <TableRow key={user.id}>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <Avatar>
                                  <AvatarImage src={user.avatarUrl} alt={user.username} />
                                  <AvatarFallback>{getInitials(user.username)}</AvatarFallback>
                                </Avatar>
                                <div>
                                  <div className="font-medium">{user.username}</div>
                                  <div className="text-xs text-muted-foreground">{user.email}</div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant={user.role === 'superadmin' ? 'destructive' : user.role === 'admin' ? 'default' : 'secondary'}>
                                {user.role}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{user.plan}</Badge>
                            </TableCell>
                            <TableCell>{formatDate(user.createdAt)}</TableCell>
                            <TableCell>
                              {user.blocked ? (
                                <BadgeGlow variant="destructive">Blocked</BadgeGlow>
                              ) : (
                                <BadgeGlow variant="secondary">Active</BadgeGlow>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button variant="outline" size="sm" onClick={() => setEditUser(user)}>
                                  <i className="ri-edit-line"></i>
                                </Button>
                                <Button 
                                  variant={user.blocked ? "outline" : "destructive"} 
                                  size="sm" 
                                  onClick={() => setBlockUser(user)}
                                >
                                  <i className={`ri-${user.blocked ? 'lock-unlock-line' : 'lock-line'}`}></i>
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-10">
                            <div className="flex flex-col items-center justify-center text-muted-foreground">
                              <i className="ri-user-search-line text-3xl mb-2"></i>
                              <p>No users found</p>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            {/* Edit User Dialog */}
            <Dialog open={!!editUser} onOpenChange={(open) => !open && setEditUser(null)}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Edit User</DialogTitle>
                  <DialogDescription>
                    Update user details and subscription plan
                  </DialogDescription>
                </DialogHeader>

                {editUser && (
                  <div className="space-y-4 py-4">
                    <div className="flex items-center gap-4 mb-6">
                      <Avatar className="h-16 w-16">
                        <AvatarImage src={editUser.avatarUrl} alt={editUser.username} />
                        <AvatarFallback>{getInitials(editUser.username)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="font-semibold">{editUser.username}</h3>
                        <p className="text-sm text-muted-foreground">{editUser.email}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Username</label>
                        <Input 
                          value={editUser.username}
                          onChange={(e) => setEditUser({...editUser, username: e.target.value})}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Role</label>
                        <Select 
                          value={editUser.role}
                          onValueChange={(value) => setEditUser({...editUser, role: value})}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select role" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="user">User</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                            {user.role === 'superadmin' && (
                              <SelectItem value="superadmin">Super Admin</SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Subscription Plan</label>
                      <Select 
                        value={editUser.plan}
                        onValueChange={(value) => setEditUser({...editUser, plan: value})}
                      >
                        <SelectTrigger className="modal-toggle">
                          <SelectValue placeholder="Select plan" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="free">Free</SelectItem>
                          <SelectItem value="reply_guy">Reply Guy ($20/month)</SelectItem>
                          <SelectItem value="spartan">Spartan ($99/month)</SelectItem>
                          <SelectItem value="zeus">Zeus ($149/month)</SelectItem>
                          <SelectItem value="goat">GOAT ($200/month)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Streaming Time (minutes)</label>
                      <Input 
                        type="number"
                        value={editUser.streamTimeRemaining}
                        onChange={(e) => setEditUser({...editUser, streamTimeRemaining: parseInt(e.target.value)})}
                        className="modal-input"
                      />
                    </div>
                  </div>
                )}

                <DialogFooter>
                  <Button variant="outline" onClick={() => setEditUser(null)}>Cancel</Button>
                  <Button onClick={handleUpdateUser} disabled={updateUserMutation.isPending}>
                    {updateUserMutation.isPending ? 'Saving...' : 'Save Changes'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Block User Confirmation Dialog */}
            <Dialog open={!!blockUser} onOpenChange={(open) => !open && setBlockUser(null)}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {blockUser?.blocked ? 'Unblock User' : 'Block User'}
                  </DialogTitle>
                  <DialogDescription>
                    {blockUser?.blocked
                      ? 'This will restore the user\'s access to the platform.'
                      : 'This will prevent the user from accessing the platform.'}
                  </DialogDescription>
                </DialogHeader>

                {blockUser && (
                  <div className="py-4">
                    <div className="flex items-center gap-4 mb-6">
                      <Avatar>
                        <AvatarImage src={blockUser.avatarUrl} alt={blockUser.username} />
                        <AvatarFallback>{getInitials(blockUser.username)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="font-semibold">{blockUser.username}</h3>
                        <p className="text-sm text-muted-foreground">{blockUser.email}</p>
                      </div>
                    </div>

                    <p className="text-muted-foreground mb-4">
                      {blockUser.blocked
                        ? 'Are you sure you want to unblock this user?'
                        : 'Are you sure you want to block this user?'}
                    </p>
                  </div>
                )}

                <DialogFooter>
                  <Button variant="outline" onClick={() => setBlockUser(null)}>Cancel</Button>
                  <Button 
                    variant={blockUser?.blocked ? "default" : "destructive"} 
                    onClick={handleBlockUser}
                    disabled={blockUserMutation.isPending}
                  >
                    {blockUserMutation.isPending 
                      ? 'Processing...' 
                      : blockUser?.blocked 
                        ? 'Unblock User' 
                        : 'Block User'
                    }
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>
    </div>
  );
}
