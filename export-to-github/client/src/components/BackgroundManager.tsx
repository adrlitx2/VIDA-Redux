import { useState, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Upload, Trash2, Image, Eye } from "lucide-react";

interface BackgroundManagerProps {
  onBackgroundsUpdated: () => void;
}

export function BackgroundManager({ onBackgroundsUpdated }: BackgroundManagerProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category: "bedroom",
    file: null as File | null
  });

  const { data: backgrounds = [] } = useQuery({
    queryKey: ['/api/backgrounds'],
    staleTime: 5 * 60 * 1000,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['/api/background-categories'],
    staleTime: 10 * 60 * 1000,
  });

  const uploadMutation = useMutation({
    mutationFn: async (data: FormData) => {
      // Simulate progress updates for user feedback
      setUploadProgress(25);
      await new Promise(resolve => setTimeout(resolve, 200));
      setUploadProgress(50);
      
      const result = await apiRequest("POST", "/api/backgrounds", data);
      
      setUploadProgress(100);
      return result;
    },
    onSuccess: () => {
      onBackgroundsUpdated();
      setIsUploadDialogOpen(false);
      setFormData({ name: "", description: "", category: "bedroom", file: null });
      setUploadProgress(0);
      toast({
        title: "Background Uploaded",
        description: "Your virtual background has been uploaded to IPFS and is ready to use.",
      });
    },
    onError: (error) => {
      setUploadProgress(0);
      toast({
        title: "Upload Failed",
        description: "Failed to upload background. Please try again.",
        variant: "destructive"
      });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (backgroundId: number) => {
      return await apiRequest("DELETE", `/api/backgrounds/${backgroundId}`);
    },
    onSuccess: () => {
      onBackgroundsUpdated();
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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid File Type",
        description: "Please select an image file (JPG, PNG, etc.)",
        variant: "destructive"
      });
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File Too Large",
        description: "Please select an image smaller than 10MB",
        variant: "destructive"
      });
      return;
    }

    setFormData(prev => ({ 
      ...prev, 
      file,
      name: prev.name || file.name.replace(/\.[^/.]+$/, "")
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.file || !formData.name) {
      toast({
        title: "Missing Information",
        description: "Please provide a name and select an image file.",
        variant: "destructive"
      });
      return;
    }

    const data = new FormData();
    data.append('file', formData.file);
    data.append('name', formData.name);
    data.append('description', formData.description);
    data.append('category', formData.category);

    uploadMutation.mutate(data);
  };

  const handleDelete = (backgroundId: number, backgroundName: string) => {
    if (window.confirm(`Are you sure you want to delete "${backgroundName}"?`)) {
      deleteMutation.mutate(backgroundId);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Image className="w-5 h-5" />
          Background Library
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Upload Button */}
        <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className="w-full">
              <Upload className="w-4 h-4 mr-2" />
              Upload New Background
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Upload Virtual Background</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Image File</Label>
                <Input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  required
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Max 10MB. Recommended: 1920x1080 or higher resolution
                </p>
              </div>

              <div>
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Modern Office Space"
                  required
                />
              </div>

              <div>
                <Label htmlFor="description">Description (optional)</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Brief description of the background"
                />
              </div>

              <div>
                <Label htmlFor="category">Category</Label>
                <Select value={formData.category} onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bedroom">Bedroom</SelectItem>
                    <SelectItem value="office">Office</SelectItem>
                    <SelectItem value="studio">Studio</SelectItem>
                    <SelectItem value="outdoor">Outdoor</SelectItem>
                    <SelectItem value="abstract">Abstract</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {uploadMutation.isPending && (
                <div className="space-y-2">
                  <Label>Upload Progress</Label>
                  <Progress value={uploadProgress} className="w-full" />
                  <p className="text-sm text-muted-foreground">{uploadProgress}% uploaded</p>
                </div>
              )}

              <div className="flex gap-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsUploadDialogOpen(false)}
                  className="flex-1"
                  disabled={uploadMutation.isPending}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={uploadMutation.isPending || !formData.file}
                  className="flex-1"
                >
                  {uploadMutation.isPending ? "Uploading..." : "Upload"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Background List */}
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {backgrounds.map((bg: any) => (
            <div
              key={bg.id}
              className="flex items-center justify-between p-2 border rounded-lg hover:bg-muted/50"
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <div className="w-8 h-8 bg-muted rounded border overflow-hidden flex-shrink-0">
                  <img 
                    src={bg.thumbnail_url || bg.url} 
                    alt={bg.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-sm truncate">{bg.name}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {bg.category || 'Uncategorized'}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => window.open(bg.url, '_blank')}
                  className="h-8 w-8 p-0"
                >
                  <Eye className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(bg.id, bg.name)}
                  disabled={deleteMutation.isPending}
                  className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
          {backgrounds.length === 0 && (
            <div className="text-center py-4 text-muted-foreground">
              No backgrounds uploaded yet
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}