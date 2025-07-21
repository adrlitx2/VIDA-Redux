import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Shield, User, UserCog } from "lucide-react";
import { ScrollIndicator } from "@/components/ui/scroll-indicator";

export type UserData = {
  id: string;
  username: string;
  email: string;
  role: string;
  plan: string;
  status: string;
  streamTime?: number;
  avatars?: number;
};

interface UserManagementDialogProps {
  user: UserData;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdateSuccess?: () => void;
  isSuperAdmin: boolean;
}

export function UserManagementDialog({
  user,
  open,
  onOpenChange,
  onUpdateSuccess,
  isSuperAdmin,
}: UserManagementDialogProps) {
  const { toast } = useToast();
  const [selectedPlan, setSelectedPlan] = useState(user?.plan || 'free');
  const [isLoading, setIsLoading] = useState(false);
  const [role, setRole] = useState(user?.role || 'user');
  const [status, setStatus] = useState(user?.status || 'active');

  const handleUpdateUser = async () => {
    console.log('handleUpdateUser called', {
      currentRole: role,
      userRole: user.role,
      currentStatus: status,
      userStatus: user.status,
      currentPlan: selectedPlan,
      userPlan: user.plan,
      roleChanged: role !== user.role,
      statusChanged: status !== user.status,
      planChanged: selectedPlan !== user.plan
    });
    
    if (role === user.role && status === user.status && selectedPlan === user.plan) {
      console.log('No changes detected, closing dialog');
      onOpenChange(false);
      return;
    }

    setIsLoading(true);
    try {
      // Use unified API endpoint for all updates to ensure proper sync
      const updateData: any = {};
      
      if (role !== user.role) {
        updateData.role = role;
      }
      
      if (status !== user.status) {
        updateData.status = status;
      }
      
      if (selectedPlan !== user.plan) {
        updateData.plan = selectedPlan;
      }
      
      console.log('Updating user with unified API:', { userId: user.id, updateData });
      
      const result = await apiRequest("POST", `/api/admin/users/${user.id}/update`, updateData);

      // Check if response contains success flag for new endpoint format
      if (result && !result.success) {
        throw new Error(result.message || "Failed to update user");
      }
      
      console.log('User updated successfully via unified API');
      
      // Show success notification
      const updates = [];
      if (updateData.role) updates.push(`role to ${role}`);
      if (updateData.plan) updates.push(`plan to ${selectedPlan}`);
      if (updateData.status) updates.push(`status to ${status}`);
      
      toast({
        title: "User updated successfully",
        description: `Updated ${user.username}'s ${updates.join(', ')}`,
      });

      // Call the success callback to refresh the user list
      if (onUpdateSuccess) {
        onUpdateSuccess();
      }
      
      onOpenChange(false);
    } catch (error: any) {
      console.error('UserManagementDialog update error:', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        response: error.response
      });
      toast({
        title: "Update failed",
        description: error.message || "There was a problem updating the user",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-background/95 backdrop-blur-md border border-border/50">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCog className="h-5 w-5 text-primary" />
            Manage User
          </DialogTitle>
          <DialogDescription>
            Update user roles and account status
          </DialogDescription>
        </DialogHeader>

        <ScrollIndicator>
          <div className="space-y-3 sm:space-y-4 px-1">
            {/* User Profile Card */}
            <div className="bg-muted/30 rounded-lg p-3 sm:p-4">
              <div className="flex flex-col items-center space-y-2 sm:space-y-3">
                <div className="h-16 w-16 rounded-full bg-muted-foreground/20 flex items-center justify-center">
                  <User className="h-8 w-8 text-primary" />
                </div>
                <div className="text-center space-y-1">
                  <h3 className="font-semibold text-base sm:text-lg">{user.username}</h3>
                  <p className="text-muted-foreground text-xs sm:text-sm">{user.email}</p>
                </div>
                <div className="flex gap-2">
                  <Badge variant={user.role === "superadmin" ? "destructive" : user.role === "admin" ? "default" : "secondary"}>
                    {user.role}
                  </Badge>
                  <Badge variant={user.status === "active" ? "default" : "destructive"}>
                    {user.status}
                  </Badge>
                </div>
              </div>
            </div>

            {/* User Management Form */}
            <form className="space-y-3 sm:space-y-4">
              <div>
                <Label htmlFor="role" className="text-sm font-medium">
                  Role
                </Label>
                <Select
                  value={role}
                  onValueChange={setRole}
                  disabled={!isSuperAdmin && role === "superadmin"}
                >
                  <SelectTrigger id="role" className="mt-1 h-10">
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">User</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                {isSuperAdmin && (
                  <SelectItem value="superadmin">Super Admin</SelectItem>
                )}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">
              Determines user permissions and access level
            </p>
          </div>
          <div>
            <Label htmlFor="plan" className="text-sm font-medium">
              Subscription Plan
            </Label>
            <Select value={selectedPlan} onValueChange={setSelectedPlan}>
              <SelectTrigger id="plan" className="mt-1 h-10">
                <SelectValue placeholder="Select subscription plan" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="free">Free</SelectItem>
                <SelectItem value="reply-guy">Reply Guy ($9.99)</SelectItem>
                <SelectItem value="spartan">Spartan ($29.99)</SelectItem>
                <SelectItem value="zeus">Zeus ($79.99)</SelectItem>
                <SelectItem value="goat">GOAT ($199.99)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">
              Changes billing and feature access immediately
            </p>
          </div>
          <div>
            <Label htmlFor="status" className="text-sm font-medium">
              Status
            </Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger id="status" className="mt-1 h-10 modal-toggle">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="blocked">Blocked</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">
              Blocked users cannot access the platform
              </p>
              </div>
            </form>

            <div className="flex gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleUpdateUser}
                disabled={isLoading || (role === user.role && status === user.status && selectedPlan === user.plan)}
                className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
              >
                {isLoading ? "Updating..." : "Save Changes"}
              </Button>
            </div>
          </div>
        </ScrollIndicator>
      </DialogContent>
    </Dialog>
  );
}