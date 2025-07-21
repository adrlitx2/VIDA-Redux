import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

interface User {
  id: string;
  username: string;
  email: string;
  role: string;
  plan: string;
  stream_time_remaining: number;
  blocked: boolean;
}

interface UserManagementDialogProps {
  user: User | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdateSuccess: () => void;
}

export default function UserManagementDialogFixed({
  user,
  open,
  onOpenChange,
  onUpdateSuccess,
}: UserManagementDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    username: user?.username || "",
    role: user?.role || "user",
    plan: user?.plan || "free",
    stream_time_remaining: user?.stream_time_remaining || 0,
  });
  const { toast } = useToast();

  React.useEffect(() => {
    if (user) {
      setFormData({
        username: user.username,
        role: user.role,
        plan: user.plan,
        stream_time_remaining: user.stream_time_remaining,
      });
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsLoading(true);
    
    try {
      // Get auth token directly
      const authData = JSON.parse(localStorage.getItem('vida3-auth') || '{}');
      const accessToken = authData?.access_token;
      
      const response = await fetch(`/api/admin/users/${user.id}/update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          id: user.id,
          ...formData
        }),
      });

      if (response.ok) {
        toast({
          title: "User updated",
          description: "User details have been updated successfully.",
        });
        onUpdateSuccess();
        onOpenChange(false);
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
      setIsLoading(false);
    }
  };

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="modal-content">
        <DialogHeader>
          <DialogTitle>Edit User Details</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
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
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}