import React, { useState, useRef, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Upload, 
  Trash2, 
  Image, 
  Eye, 
  Edit, 
  Plus, 
  Settings, 
  FolderPlus,
  Grid3X3,
  List
} from "lucide-react";

interface BackgroundSettingsPanelProps {
  onBackgroundSelected?: (backgroundId: string) => void;
  selectedBackgroundId?: string;
}

export function BackgroundSettingsPanel({ onBackgroundSelected, selectedBackgroundId }: BackgroundSettingsPanelProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();
  
  // Check if user has admin privileges
  const isAdmin = user?.roles?.includes('admin') || user?.roles?.includes('superadmin');
  
  // Dialog states
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [isBackgroundEditDialogOpen, setIsBackgroundEditDialogOpen] = useState(false);
  
  // Form states
  const [uploadProgress, setUploadProgress] = useState(0);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [editingBackground, setEditingBackground] = useState<any>(null);
  
  const [uploadForm, setUploadForm] = useState({
    name: "",
    description: "",
    file: null as File | null
  });

  const [categoryForm, setCategoryForm] = useState({
    name: "",
    description: "",
    is_active: true
  });

  const [editForm, setEditForm] = useState({
    name: "",
    description: "",
    category: "",
    required_plan: "free",
    is_active: true
  });

  // Data queries
  const { data: backgrounds = [], refetch: refetchBackgrounds } = useQuery({
    queryKey: ['/api/backgrounds'],
    staleTime: 5 * 60 * 1000,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['/api/backgrounds/categories'],
    staleTime: 10 * 60 * 1000,
  });

  // Check if user has uploaded backgrounds
  const userBackgrounds = useMemo(() => {
    return backgrounds.filter((bg: any) => bg.created_by === user?.id);
  }, [backgrounds, user?.id]);

  // Create combined categories list with "My Backgrounds" if user has uploads
  const displayCategories = useMemo(() => {
    const baseCategories = categories.filter((cat: any) => 
      cat.name !== 'my-backgrounds' // Don't show user categories in the list
    );
    
    if (userBackgrounds.length > 0) {
      return [
        ...baseCategories,
        { id: 'my-backgrounds', name: 'my-backgrounds', description: 'Your uploaded backgrounds' }
      ];
    }
    
    return baseCategories;
  }, [categories, userBackgrounds.length]);

  // Set default category when categories load
  React.useEffect(() => {
    if (displayCategories.length > 0 && !selectedCategory) {
      setSelectedCategory(displayCategories[0]?.name?.toLowerCase() || 'bedroom');
    }
  }, [displayCategories, selectedCategory]);

  // Filter backgrounds by category
  const filteredBackgrounds = useMemo(() => {
    if (!selectedCategory) {
      return backgrounds;
    }
    
    if (selectedCategory === 'my-backgrounds') {
      // Show only user-owned backgrounds
      return userBackgrounds;
    }
    
    // Regular category filtering - check multiple possible category field names
    return backgrounds.filter((bg: any) => {
      const bgCategory = bg.category || bg.categoryName || bg.category_name;
      return bgCategory && bgCategory.toLowerCase() === selectedCategory.toLowerCase();
    });
  }, [backgrounds, selectedCategory, userBackgrounds]);

  // Upload mutation - handles file upload with proper FormData
  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      setUploadProgress(10);
      
      const response = await fetch('/api/backgrounds/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${await (await import('@/lib/supabase')).supabase.auth.getSession().then(s => s.data.session?.access_token)}`,
        },
        body: formData
      });
      
      setUploadProgress(50);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Upload failed' }));
        throw new Error(errorData.message || `Upload failed: ${response.status}`);
      }
      
      setUploadProgress(90);
      const result = await response.json();
      setUploadProgress(100);
      
      return result;
    },
    onSuccess: () => {
      refetchBackgrounds();
      queryClient.invalidateQueries({ queryKey: ['/api/backgrounds'] });
      queryClient.invalidateQueries({ queryKey: ['/api/backgrounds/categories'] });
      setIsUploadDialogOpen(false);
      setUploadForm({ name: "", description: "", file: null });
      setUploadProgress(0);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      toast({
        title: "Background Uploaded",
        description: "Your virtual background has been uploaded successfully and is now available in 'My Backgrounds'.",
      });
    },
    onError: (error: Error) => {
      setUploadProgress(0);
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to upload background. Please try again.",
        variant: "destructive"
      });
    }
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (backgroundId: number) => {
      return await apiRequest("DELETE", `/api/backgrounds/${backgroundId}`);
    },
    onSuccess: () => {
      refetchBackgrounds();
      queryClient.invalidateQueries({ queryKey: ['/api/backgrounds'] });
      toast({
        title: "Background Deleted",
        description: "Background has been removed from your library.",
      });
    },
    onError: () => {
      toast({
        title: "Delete Failed",
        description: "Failed to delete background. Please try again.",
        variant: "destructive"
      });
    }
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      return await apiRequest("PATCH", `/api/backgrounds/${id}`, data);
    },
    onSuccess: () => {
      refetchBackgrounds();
      queryClient.invalidateQueries({ queryKey: ['/api/backgrounds'] });
      setIsBackgroundEditDialogOpen(false);
      setEditingBackground(null);
      toast({
        title: "Background Updated",
        description: "Background settings have been saved.",
      });
    },
    onError: () => {
      toast({
        title: "Update Failed",
        description: "Failed to update background. Please try again.",
        variant: "destructive"
      });
    }
  });

  // Category creation mutation
  const createCategoryMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("POST", "/api/background-categories", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/background-categories'] });
      setIsCategoryDialogOpen(false);
      setCategoryForm({ name: "", description: "", is_active: true });
      toast({
        title: "Category Created",
        description: "New background category has been created.",
      });
    },
    onError: () => {
      toast({
        title: "Creation Failed",
        description: "Failed to create category. Please try again.",
        variant: "destructive"
      });
    }
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid File Type",
        description: "Please select an image file (JPG, PNG, etc.)",
        variant: "destructive"
      });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File Too Large",
        description: "Please select an image smaller than 10MB",
        variant: "destructive"
      });
      return;
    }

    setUploadForm(prev => ({ 
      ...prev, 
      file,
      name: prev.name || file.name.replace(/\.[^/.]+$/, "")
    }));
  };

  const handleUploadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadForm.file || !uploadForm.name) {
      toast({
        title: "Missing Information",
        description: "Please provide a name and select an image file.",
        variant: "destructive"
      });
      return;
    }

    const data = new FormData();
    data.append('file', uploadForm.file);
    data.append('name', uploadForm.name);
    data.append('description', uploadForm.description);

    uploadMutation.mutate(data);
  };

  const handleDelete = (backgroundId: number, backgroundName: string) => {
    if (window.confirm(`Are you sure you want to delete "${backgroundName}"?`)) {
      deleteMutation.mutate(backgroundId);
    }
  };

  const handleEdit = (background: any) => {
    setEditingBackground(background);
    setEditForm({
      name: background.name,
      description: background.description || "",
      category: background.category,
      required_plan: background.required_plan || "free",
      is_active: background.is_active
    });
    setIsBackgroundEditDialogOpen(true);
  };

  const handleUpdateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBackground) return;

    updateMutation.mutate({
      id: editingBackground.id,
      data: editForm
    });
  };

  const handleCategorySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryForm.name) {
      toast({
        title: "Missing Information",
        description: "Please provide a category name.",
        variant: "destructive"
      });
      return;
    }

    createCategoryMutation.mutate(categoryForm);
  };

  return (
    <div className="space-y-6">
      {/* Background Category Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Background Type
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Select background type" />
              </SelectTrigger>
              <SelectContent>
                {displayCategories.map((cat: any) => (
                  <SelectItem key={cat.id} value={cat.name.toLowerCase()}>
                    {cat.name === 'my-backgrounds' ? 'My Backgrounds' : 
                     cat.name.charAt(0).toUpperCase() + cat.name.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
            >
              {viewMode === 'grid' ? <List className="w-4 h-4" /> : <Grid3X3 className="w-4 h-4" />}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Background Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 bg-primary/10 rounded flex items-center justify-center">
                <svg className="w-3 h-3 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              Background Management
            </div>
            <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Background
                </Button>
              </DialogTrigger>
                <DialogContent className="sm:max-w-lg">
                  <DialogHeader className="space-y-3">
                    <DialogTitle className="flex items-center gap-2 text-xl">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                      Upload New Background
                    </DialogTitle>
                    <p className="text-sm text-muted-foreground">
                      Add a custom background to your personal collection
                    </p>
                  </DialogHeader>
                  
                  <form onSubmit={handleUploadSubmit} className="space-y-6">
                    {/* File Upload Section */}
                    <div className="space-y-3">
                      <Label className="text-sm font-medium">Image File</Label>
                      <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
                        <Input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleFileSelect}
                          required
                          className="hidden"
                          id="file-upload"
                        />
                        <label htmlFor="file-upload" className="cursor-pointer">
                          {uploadForm.file ? (
                            <div className="space-y-2">
                              <div className="w-12 h-12 mx-auto bg-green-100 rounded-full flex items-center justify-center">
                                <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                              </div>
                              <p className="text-sm font-medium text-green-700">{uploadForm.file.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {(uploadForm.file.size / 1024 / 1024).toFixed(2)} MB
                              </p>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <div className="w-12 h-12 mx-auto bg-muted rounded-full flex items-center justify-center">
                                <svg className="w-6 h-6 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                              </div>
                              <p className="text-sm font-medium">Click to select an image</p>
                              <p className="text-xs text-muted-foreground">
                                PNG, JPG, JPEG up to 10MB
                              </p>
                            </div>
                          )}
                        </label>
                      </div>
                    </div>

                    {/* Form Fields */}
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="name" className="text-sm font-medium">Background Name</Label>
                        <Input
                          id="name"
                          value={uploadForm.name}
                          onChange={(e) => setUploadForm(prev => ({ ...prev, name: e.target.value }))}
                          placeholder="e.g., Sunset Beach, Cozy Office"
                          required
                          className="h-10"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="description" className="text-sm font-medium">Description (Optional)</Label>
                        <Input
                          id="description"
                          value={uploadForm.description}
                          onChange={(e) => setUploadForm(prev => ({ ...prev, description: e.target.value }))}
                          placeholder="Brief description of your background"
                          className="h-10"
                        />
                      </div>
                    </div>

                    {/* Privacy Notice */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <svg className="w-3 h-3 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-blue-900">Private Upload</p>
                          <p className="text-xs text-blue-700 mt-1">
                            Your background will be added to "My Backgrounds" and only visible to you.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Upload Progress */}
                    {uploadMutation.isPending && (
                      <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
                        <div className="flex items-center justify-between">
                          <Label className="text-sm font-medium">Uploading to IPFS...</Label>
                          <span className="text-sm font-medium text-primary">{uploadProgress}%</span>
                        </div>
                        <Progress value={uploadProgress} className="w-full h-2" />
                        <p className="text-xs text-muted-foreground">
                          Please wait while your background is uploaded and processed
                        </p>
                      </div>
                    )}

                    <DialogFooter className="gap-3 pt-4">
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => setIsUploadDialogOpen(false)}
                        disabled={uploadMutation.isPending}
                        className="flex-1"
                      >
                        Cancel
                      </Button>
                      <Button 
                        type="submit" 
                        disabled={uploadMutation.isPending || !uploadForm.file}
                        className="flex-1"
                      >
                        {uploadMutation.isPending ? "Uploading..." : "Upload"}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            {/* Background Grid/List */}
            <div className={`space-y-2 max-h-96 overflow-y-auto ${
              viewMode === 'grid' ? 'grid grid-cols-2 sm:grid-cols-3 gap-3' : 'space-y-2'
            }`}>
              {filteredBackgrounds.map((bg: any) => (
                <div
                  key={bg.id}
                  className={`border rounded-lg overflow-hidden transition-all cursor-pointer ${
                    selectedBackgroundId === bg.id.toString() 
                      ? 'ring-2 ring-primary border-primary' 
                      : 'hover:border-muted-foreground'
                  } ${viewMode === 'list' ? 'flex items-center' : ''}`}
                  onClick={() => onBackgroundSelected?.(bg.id.toString())}
                >
                  <div className={`bg-muted relative ${
                    viewMode === 'grid' ? 'aspect-video' : 'w-16 h-12 flex-shrink-0'
                  }`}>
                    <img 
                      src={bg.thumbnail_url || bg.url} 
                      alt={bg.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                    <Badge 
                      variant="outline" 
                      className="absolute top-1 right-1 text-xs"
                    >
                      {bg.required_plan || 'free'}
                    </Badge>
                  </div>
                  
                  <div className={`p-3 flex-1 ${viewMode === 'list' ? 'flex items-center justify-between' : ''}`}>
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-sm truncate">{bg.name}</div>
                      {viewMode === 'grid' && (
                        <div className="text-xs text-muted-foreground truncate mt-1">
                          {bg.category || 'Uncategorized'}
                        </div>
                      )}
                    </div>
                    
                    <div className={`flex items-center gap-1 ${viewMode === 'list' ? 'ml-2' : 'mt-2'}`}>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(bg.url, '_blank');
                        }}
                        className="h-6 w-6 p-0"
                      >
                        <Eye className="w-3 h-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEdit(bg);
                        }}
                        className="h-6 w-6 p-0"
                      >
                        <Edit className="w-3 h-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(bg.id, bg.name);
                        }}
                        disabled={deleteMutation.isPending}
                        className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
              
              {filteredBackgrounds.length === 0 && (
                <div className="col-span-full text-center py-8 text-muted-foreground">
                  No backgrounds found in this category
                </div>
              )}
            </div>
          </TabsContent>
          
          {isAdmin && (
            <TabsContent value="categories" className="space-y-4">
              <div className="flex justify-between">
                <h4 className="font-medium">Background Categories</h4>
                <Dialog open={isCategoryDialogOpen} onOpenChange={setIsCategoryDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <FolderPlus className="w-4 h-4 mr-2" />
                      Add Category
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>Create Category</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleCategorySubmit} className="space-y-4">
                      <div>
                        <Label htmlFor="cat-name">Name</Label>
                        <Input
                          id="cat-name"
                          value={categoryForm.name}
                          onChange={(e) => setCategoryForm(prev => ({ ...prev, name: e.target.value }))}
                          placeholder="Category name"
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="cat-description">Description</Label>
                        <Input
                          id="cat-description"
                          value={categoryForm.description}
                          onChange={(e) => setCategoryForm(prev => ({ ...prev, description: e.target.value }))}
                          placeholder="Category description"
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label htmlFor="cat-active">Active</Label>
                        <Switch
                          id="cat-active"
                          checked={categoryForm.is_active}
                          onCheckedChange={(checked) => setCategoryForm(prev => ({ ...prev, is_active: checked }))}
                        />
                      </div>
                      <DialogFooter>
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={() => setIsCategoryDialogOpen(false)}
                        >
                          Cancel
                        </Button>
                        <Button type="submit" disabled={createCategoryMutation.isPending}>
                          {createCategoryMutation.isPending ? "Creating..." : "Create"}
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
              
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {categories.map((cat: any) => (
                  <div key={cat.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <div className="font-medium">{cat.name}</div>
                      <div className="text-sm text-muted-foreground">{cat.description}</div>
                    </div>
                    <Badge variant={cat.is_active ? "default" : "secondary"}>
                      {cat.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                ))}
              </div>
            </TabsContent>
          )}
        </Tabs>

        {/* Edit Background Dialog */}
        <Dialog open={isBackgroundEditDialogOpen} onOpenChange={setIsBackgroundEditDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Background</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleUpdateSubmit} className="space-y-4">
              <div>
                <Label htmlFor="edit-name">Name</Label>
                <Input
                  id="edit-name"
                  value={editForm.name}
                  onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                  required
                />
              </div>
              <div>
                <Label htmlFor="edit-description">Description</Label>
                <Input
                  id="edit-description"
                  value={editForm.description}
                  onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="edit-category">Category</Label>
                <Select value={editForm.category} onValueChange={(value) => setEditForm(prev => ({ ...prev, category: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.filter((cat: any) => cat.name !== 'my-backgrounds').map((cat: any) => (
                      <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="edit-plan">Required Plan</Label>
                <Select value={editForm.required_plan} onValueChange={(value) => setEditForm(prev => ({ ...prev, required_plan: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="free">Free</SelectItem>
                    <SelectItem value="pro">Pro</SelectItem>
                    <SelectItem value="premium">Premium</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="edit-active">Active</Label>
                <Switch
                  id="edit-active"
                  checked={editForm.is_active}
                  onCheckedChange={(checked) => setEditForm(prev => ({ ...prev, is_active: checked }))}
                />
              </div>
              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsBackgroundEditDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? "Updating..." : "Update"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}