import React, { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Upload, Trash2, Edit, Eye, Plus, Settings } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

export function AdminPresetAvatarManager() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<any>(null);
  const [newPreset, setNewPreset] = useState({
    name: '',
    categoryId: '',
    requiredPlan: 'free',
    isActive: true
  });

  // Fetch preset avatars
  const { data: presetAvatars = [], isLoading } = useQuery({
    queryKey: ['/api/admin/preset-avatars'],
    refetchOnWindowFocus: false
  });

  // Fetch categories
  const { data: categories = [] } = useQuery({
    queryKey: ['/api/avatars/categories'],
    refetchOnWindowFocus: false
  });

  // Upload preset avatar mutation
  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      return await apiRequest('/api/admin/preset-avatars/upload', {
        method: 'POST',
        body: formData
      });
    },
    onSuccess: () => {
      toast({
        title: 'Preset avatar uploaded',
        description: 'The preset avatar has been added successfully.'
      });
      setUploadDialogOpen(false);
      setNewPreset({ name: '', categoryId: '', requiredPlan: 'free', isActive: true });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/preset-avatars'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Upload failed',
        description: error.message || 'Failed to upload preset avatar',
        variant: 'destructive'
      });
    }
  });

  // Update preset avatar mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      return await apiRequest(`/api/admin/preset-avatars/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data)
      });
    },
    onSuccess: () => {
      toast({
        title: 'Preset updated',
        description: 'The preset avatar has been updated successfully.'
      });
      setEditDialogOpen(false);
      setSelectedPreset(null);
      queryClient.invalidateQueries({ queryKey: ['/api/admin/preset-avatars'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Update failed',
        description: error.message || 'Failed to update preset avatar',
        variant: 'destructive'
      });
    }
  });

  // Delete preset avatar mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest(`/api/admin/preset-avatars/${id}`, {
        method: 'DELETE'
      });
    },
    onSuccess: () => {
      toast({
        title: 'Preset deleted',
        description: 'The preset avatar has been removed.'
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/preset-avatars'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Delete failed',
        description: error.message || 'Failed to delete preset avatar',
        variant: 'destructive'
      });
    }
  });

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.glb') && !file.name.toLowerCase().endsWith('.gltf')) {
      toast({
        title: 'Invalid file type',
        description: 'Please select a GLB or GLTF file.',
        variant: 'destructive'
      });
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      toast({
        title: 'File too large',
        description: 'Avatar files must be under 50MB.',
        variant: 'destructive'
      });
      return;
    }

    const formData = new FormData();
    formData.append('avatar', file);
    formData.append('name', newPreset.name || file.name.replace(/\.(glb|gltf)$/i, ''));
    formData.append('categoryId', newPreset.categoryId);
    formData.append('requiredPlan', newPreset.requiredPlan);
    formData.append('isActive', newPreset.isActive.toString());

    uploadMutation.mutate(formData);
  };

  const handleEdit = (preset: any) => {
    setSelectedPreset({
      ...preset,
      categoryId: preset.categoryId?.toString() || ''
    });
    setEditDialogOpen(true);
  };

  const handleUpdate = () => {
    if (!selectedPreset) return;
    
    updateMutation.mutate({
      id: selectedPreset.id,
      data: {
        name: selectedPreset.name,
        categoryId: selectedPreset.categoryId ? parseInt(selectedPreset.categoryId) : null,
        requiredPlan: selectedPreset.requiredPlan,
        isActive: selectedPreset.isActive
      }
    });
  };

  const handleDelete = (preset: any) => {
    if (confirm(`Are you sure you want to delete "${preset.name}"? This action cannot be undone.`)) {
      deleteMutation.mutate(preset.id);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Preset Avatar Management</h2>
          <p className="text-muted-foreground">Manage built-in avatars available to users</p>
        </div>
        
        <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add Preset Avatar
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Upload Preset Avatar</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="preset-name">Avatar Name</Label>
                <Input
                  id="preset-name"
                  value={newPreset.name}
                  onChange={(e) => setNewPreset(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter avatar name"
                />
              </div>
              
              <div>
                <Label htmlFor="preset-category">Category</Label>
                <Select
                  value={newPreset.categoryId}
                  onValueChange={(value) => setNewPreset(prev => ({ ...prev, categoryId: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category: any) => (
                      <SelectItem key={category.id} value={category.id.toString()}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="preset-plan">Required Plan</Label>
                <Select
                  value={newPreset.requiredPlan}
                  onValueChange={(value) => setNewPreset(prev => ({ ...prev, requiredPlan: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="free">Free</SelectItem>
                    <SelectItem value="starter">Starter</SelectItem>
                    <SelectItem value="goat">GOAT</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="preset-active"
                  checked={newPreset.isActive}
                  onCheckedChange={(checked) => setNewPreset(prev => ({ ...prev, isActive: checked }))}
                />
                <Label htmlFor="preset-active">Active</Label>
              </div>

              <div>
                <Label>GLB/GLTF File</Label>
                <Button
                  variant="outline"
                  onClick={handleFileSelect}
                  className="w-full"
                  disabled={uploadMutation.isPending}
                >
                  {uploadMutation.isPending ? 'Uploading...' : 'Select File'}
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".glb,.gltf"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          <div className="col-span-full text-center py-8">
            <Settings className="h-8 w-8 animate-spin mx-auto mb-2" />
            <p>Loading preset avatars...</p>
          </div>
        ) : presetAvatars.length === 0 ? (
          <div className="col-span-full text-center py-8 text-muted-foreground">
            <Upload className="h-12 w-12 mx-auto mb-2" />
            <p>No preset avatars found</p>
            <p className="text-sm">Upload your first preset avatar to get started</p>
          </div>
        ) : (
          presetAvatars.map((preset: any) => (
            <Card key={preset.id} className="overflow-hidden">
              <div className="aspect-video relative">
                <img
                  src={preset.thumbnailUrl}
                  alt={preset.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.src = '/placeholder-avatar.png';
                  }}
                />
                <div className="absolute top-2 right-2 flex gap-1">
                  <Badge variant={preset.isActive ? "default" : "secondary"}>
                    {preset.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                  {preset.requiredPlan !== 'free' && (
                    <Badge variant="outline">{preset.requiredPlan}</Badge>
                  )}
                </div>
              </div>
              
              <CardContent className="p-4">
                <div className="space-y-2">
                  <h3 className="font-semibold truncate">{preset.name}</h3>
                  <div className="text-sm text-muted-foreground">
                    <p>Category: {categories.find((c: any) => c.id === preset.categoryId)?.name || 'None'}</p>
                    <p>Usage: {preset.usageCount || 0} times</p>
                    <p>Size: {Math.round(preset.fileSize / 1024)} KB</p>
                  </div>
                  
                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(preset)}
                      className="flex-1"
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(preset)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Preset Avatar</DialogTitle>
          </DialogHeader>
          {selectedPreset && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-name">Avatar Name</Label>
                <Input
                  id="edit-name"
                  value={selectedPreset.name}
                  onChange={(e) => setSelectedPreset({ ...selectedPreset, name: e.target.value })}
                />
              </div>
              
              <div>
                <Label htmlFor="edit-category">Category</Label>
                <Select
                  value={selectedPreset.categoryId}
                  onValueChange={(value) => setSelectedPreset({ ...selectedPreset, categoryId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No category</SelectItem>
                    {categories.map((category: any) => (
                      <SelectItem key={category.id} value={category.id.toString()}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="edit-plan">Required Plan</Label>
                <Select
                  value={selectedPreset.requiredPlan}
                  onValueChange={(value) => setSelectedPreset({ ...selectedPreset, requiredPlan: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="free">Free</SelectItem>
                    <SelectItem value="starter">Starter</SelectItem>
                    <SelectItem value="goat">GOAT</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="edit-active"
                  checked={selectedPreset.isActive}
                  onCheckedChange={(checked) => setSelectedPreset({ ...selectedPreset, isActive: checked })}
                />
                <Label htmlFor="edit-active">Active</Label>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdate} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? 'Updating...' : 'Update'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}