import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Search, Edit3, Shield, ShieldOff, Clock, Users } from "lucide-react";

interface User {
  id: string;
  username: string;
  email: string;
  role: string;
  plan: string;
  stream_time_remaining: number;
  blocked: boolean;
  created_at: string;
  updated_at: string;
  avatar_count: number;
  avatar_max_limit: number;
}

export default function UsersFixed() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [planFilter, setPlanFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [editUser, setEditUser] = useState<User | null>(null);
  const [blockUser, setBlockUser] = useState<User | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  // Form state for edit dialog
  const [formData, setFormData] = useState({
    username: "",
    role: "user",
    plan: "free",
    stream_time_remaining: 0,
  });

  // Load users
  const loadUsers = async () => {
    try {
      const authData = JSON.parse(localStorage.getItem('vida3-auth') || '{}');
      const accessToken = authData?.access_token;
      
      const response = await fetch('/api/admin/users', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      }
    } catch (error) {
      console.error('Failed to load users:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    if (editUser) {
      setFormData({
        username: editUser.username,
        role: editUser.role,
        plan: editUser.plan,
        stream_time_remaining: editUser.stream_time_remaining,
      });
    }
  }, [editUser]);

  // Update user
  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editUser) return;

    setIsProcessing(true);
    
    try {
      const authData = JSON.parse(localStorage.getItem('vida3-auth') || '{}');
      const accessToken = authData?.access_token;
      
      const response = await fetch(`/api/admin/users/${editUser.id}/update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          id: editUser.id,
          ...formData
        }),
      });

      if (response.ok) {
        toast({
          title: "User updated",
          description: "User details have been updated successfully.",
        });
        setEditUser(null);
        loadUsers(); // Reload users
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error: any) {
      toast({
        title: "Update failed",
        description: error.message || "Failed to update user",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Block/unblock user
  const handleBlockUser = async () => {
    if (!blockUser) return;

    setIsProcessing(true);
    
    try {
      const authData = JSON.parse(localStorage.getItem('vida3-auth') || '{}');
      const accessToken = authData?.access_token;
      
      const response = await fetch(`/api/admin/users/${blockUser.id}/block`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          blocked: !blockUser.blocked
        }),
      });

      if (response.ok) {
        toast({
          title: "User status updated",
          description: `User has been ${blockUser.blocked ? 'unblocked' : 'blocked'}.`,
        });
        setBlockUser(null);
        loadUsers(); // Reload users
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error: any) {
      toast({
        title: "Update failed",
        description: error.message || "Failed to update user status",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Filter users
  const filteredUsers = users.filter((user) => {
    const matchesSearch = search === "" || 
      user.username.toLowerCase().includes(search.toLowerCase()) ||
      user.email.toLowerCase().includes(search.toLowerCase());
    
    const matchesPlan = planFilter === "all" || user.plan === planFilter;
    
    const matchesStatus = statusFilter === "all" || 
      (statusFilter === "active" && !user.blocked) ||
      (statusFilter === "blocked" && user.blocked);
    
    return matchesSearch && matchesPlan && matchesStatus;
  });

  // Get initials for avatar fallback
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Get role badge variant
  const getRoleVariant = (role: string) => {
    switch (role) {
      case "superadmin": return "destructive";
      case "admin": return "default";
      default: return "secondary";
    }
  };

  // Get plan badge variant
  const getPlanVariant = (plan: string) => {
    switch (plan) {
      case "goat": return "destructive";
      case "centurion": return "default";
      case "spartan": return "secondary";
      default: return "outline";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">User Management</h1>
          <p className="text-muted-foreground">Manage user accounts, roles, and subscriptions</p>
        </div>
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5" />
          <span className="text-sm font-medium">{filteredUsers.length} users</span>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search by username or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={planFilter} onValueChange={setPlanFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Filter by plan" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Plans</SelectItem>
                <SelectItem value="free">Free</SelectItem>
                <SelectItem value="spartan">Spartan</SelectItem>
                <SelectItem value="centurion">Centurion</SelectItem>
                <SelectItem value="goat">GOAT</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="blocked">Blocked</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Users List */}
      <div className="grid gap-4">
        {filteredUsers.map((user) => (
          <Card key={user.id}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-4">
                  <Avatar className="w-12 h-12">
                    <AvatarImage src="" />
                    <AvatarFallback>{getInitials(user.username || user.email)}</AvatarFallback>
                  </Avatar>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{user.username}</h3>
                      <Badge variant={getRoleVariant(user.role)}>{user.role}</Badge>
                      <Badge variant={getPlanVariant(user.plan)}>{user.plan}</Badge>
                      {user.blocked && <Badge variant="destructive">Blocked</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        <span>{user.stream_time_remaining}min remaining</span>
                      </div>
                      <span>Avatars: {user.avatar_count}/{user.avatar_max_limit}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditUser(user)}
                  >
                    <Edit3 className="w-4 h-4 mr-1" />
                    Edit
                  </Button>
                  <Button
                    variant={user.blocked ? "default" : "destructive"}
                    size="sm"
                    onClick={() => setBlockUser(user)}
                  >
                    {user.blocked ? (
                      <>
                        <Shield className="w-4 h-4 mr-1" />
                        Unblock
                      </>
                    ) : (
                      <>
                        <ShieldOff className="w-4 h-4 mr-1" />
                        Block
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredUsers.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No users found</h3>
            <p className="text-muted-foreground">Try adjusting your search or filter criteria.</p>
          </CardContent>
        </Card>
      )}

      {/* Edit User Dialog */}
      <Dialog open={!!editUser} onOpenChange={(open) => !open && setEditUser(null)}>
        <DialogContent className="modal-content">
          <DialogHeader>
            <DialogTitle>Edit User Details</DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleUpdateUser} className="space-y-4">
            <div>
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                value={formData.username}
                onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                className="modal-input"
              />
            </div>

            <div>
              <Label htmlFor="role">Role</Label>
              <Select
                value={formData.role}
                onValueChange={(value) => setFormData(prev => ({ ...prev, role: value }))}
              >
                <SelectTrigger className="modal-input">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="superadmin">Super Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="plan">Subscription Plan</Label>
              <Select
                value={formData.plan}
                onValueChange={(value) => setFormData(prev => ({ ...prev, plan: value }))}
              >
                <SelectTrigger className="modal-input">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="free">Free</SelectItem>
                  <SelectItem value="spartan">Spartan</SelectItem>
                  <SelectItem value="centurion">Centurion</SelectItem>
                  <SelectItem value="goat">GOAT</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="stream_time">Stream Time Remaining (minutes)</Label>
              <Input
                id="stream_time"
                type="number"
                value={formData.stream_time_remaining}
                onChange={(e) => setFormData(prev => ({ ...prev, stream_time_remaining: parseInt(e.target.value) || 0 }))}
                className="modal-input"
              />
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditUser(null)}
                disabled={isProcessing}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isProcessing}>
                {isProcessing ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Block User Confirmation Dialog */}
      <AlertDialog open={!!blockUser} onOpenChange={(open) => !open && setBlockUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {blockUser?.blocked ? "Unblock User" : "Block User"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to {blockUser?.blocked ? "unblock" : "block"} {blockUser?.username}?
              {!blockUser?.blocked && " This will prevent them from accessing the platform."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBlockUser}
              disabled={isProcessing}
              className={blockUser?.blocked ? "" : "bg-destructive hover:bg-destructive/90"}
            >
              {isProcessing ? "Processing..." : (blockUser?.blocked ? "Unblock" : "Block")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}