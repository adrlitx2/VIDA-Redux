import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  Upload, Settings, Plus, Edit, Trash2, 
  Grid3X3, List, Lock, Image as ImageIcon,
  CheckCircle, AlertCircle
} from "lucide-react";

interface BackgroundSettingsPanelProps {
  onBackgroundSelected?: (backgroundId: string) => void;
  selectedBackgroundId?: string;
  onSceneLightingChange?: (lighting: {
    brightness: number;
    contrast: number;
    warmth: number;
    saturation: number;
    lightAngle: number;
    lightIntensity: number;
  }) => void;
  sceneLighting?: {
    brightness: number;
    contrast: number;
    warmth: number;
    saturation: number;
    lightAngle: number;
    lightIntensity: number;
  };
}

export function BackgroundSettingsPanel({ 
  onBackgroundSelected, 
  selectedBackgroundId, 
  onSceneLightingChange, 
  sceneLighting = {
    brightness: 75,
    contrast: 50,
    warmth: 60,
    saturation: 80,
    lightAngle: 45,
    lightIntensity: 70
  }
}: BackgroundSettingsPanelProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // State - dynamically set based on selected background
  const [selectedCategory, setSelectedCategory] = useState<string>('bedroom');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [uploadForm, setUploadForm] = useState({
    file: null as File | null,
    name: '',
    description: '',
    category: '',
    requiredPlan: 'free'
  });

  // Lighting preset functions
  const applyLightingPreset = (presetName: string) => {
    const presets = {
      cool: { brightness: 90, contrast: 60, warmth: 30, saturation: 85, lightAngle: 30, lightIntensity: 80 },
      warm: { brightness: 80, contrast: 45, warmth: 85, saturation: 90, lightAngle: 60, lightIntensity: 75 },
      natural: { brightness: 75, contrast: 50, warmth: 60, saturation: 80, lightAngle: 45, lightIntensity: 70 },
      studio: { brightness: 95, contrast: 70, warmth: 50, saturation: 75, lightAngle: 15, lightIntensity: 90 },
      dramatic: { brightness: 60, contrast: 80, warmth: 40, saturation: 70, lightAngle: 75, lightIntensity: 85 },
      cinematic: { brightness: 70, contrast: 75, warmth: 45, saturation: 65, lightAngle: 55, lightIntensity: 80 }
    };
    
    if (presets[presetName as keyof typeof presets] && onSceneLightingChange) {
      onSceneLightingChange(presets[presetName as keyof typeof presets]);
      toast({
        title: "Lighting Applied",
        description: `${presetName.charAt(0).toUpperCase() + presetName.slice(1)} lighting preset applied`,
      });
    }
  };

  // Check user auth
  const { data: user } = useQuery({ queryKey: ['/api/auth/user'] });

  // Data fetching
  const { data: backgrounds } = useQuery({ 
    queryKey: ['/api/backgrounds'],
    refetchInterval: 30000
  });
  
  const { data: categories } = useQuery({ 
    queryKey: ['/api/backgrounds/categories'],
    refetchInterval: 30000
  });

  // Define solid color backgrounds with BAYC-complimentary colors
  const solidColorBackgrounds = [
    { id: 'color-1', name: 'Deep Navy', color: '#1a1a2e', category: 'color' },
    { id: 'color-2', name: 'Forest Green', color: '#2d5016', category: 'color' },
    { id: 'color-3', name: 'Royal Purple', color: '#533483', category: 'color' },
    { id: 'color-4', name: 'BAYC Orange', color: '#ff6b35', category: 'color' },
    { id: 'color-5', name: 'Golden Yellow', color: '#f7c52d', category: 'color' },
    { id: 'color-6', name: 'Ape Brown', color: '#8b4513', category: 'color' },
    { id: 'color-7', name: 'Crimson Red', color: '#c5282f', category: 'color' },
    { id: 'color-8', name: 'Pure Black', color: '#000000', category: 'color' },
  ];

  // Define blur background options
  const blurBackgrounds = [
    { id: 'blur-light', name: 'Light Blur', intensity: 5, category: 'blur' },
    { id: 'blur-medium', name: 'Medium Blur', intensity: 10, category: 'blur' },
    { id: 'blur-heavy', name: 'Heavy Blur', intensity: 20, category: 'blur' },
  ];

  // Auto-select category based on currently selected background
  useEffect(() => {
    if (selectedBackgroundId && Array.isArray(backgrounds)) {
      const selectedBg = (backgrounds as any[]).find((bg: any) => bg.id.toString() === selectedBackgroundId);
      if (selectedBg && selectedBg.category) {
        const bgCategory = selectedBg.category.toLowerCase();
        if (bgCategory !== selectedCategory) {
          setSelectedCategory(bgCategory);
        }
      }
    }
  }, [selectedBackgroundId, backgrounds, selectedCategory]);

  // Filter backgrounds by category and user ownership
  const getFilteredBackgrounds = () => {
    if (selectedCategory === 'color') {
      return solidColorBackgrounds;
    }
    if (selectedCategory === 'blur') {
      return blurBackgrounds;
    }
    if (selectedCategory === 'my-backgrounds') {
      return (backgrounds || []).filter((bg: any) => bg.user_id === user?.id);
    }
    return (backgrounds || []).filter((bg: any) => bg.category?.toLowerCase() === selectedCategory);
  };

  const filteredBackgrounds = getFilteredBackgrounds();

  // Get categories to display based on user's uploaded backgrounds
  const userHasBackgrounds = (backgrounds || []).some((bg: any) => bg.user_id === user?.id);
  const displayCategories = [
    { id: 'blur', name: 'blur', description: 'Blur background effect' },
    { id: 'color', name: 'color', description: 'Solid color backgrounds' },
    ...(categories || []),
    ...(userHasBackgrounds ? [{ id: 'my-backgrounds', name: 'my-backgrounds', description: 'Your uploaded backgrounds' }] : [])
  ];

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      return await apiRequest('/api/backgrounds/upload', {
        method: 'POST',
        body: formData
      });
    },
    onSuccess: () => {
      toast({
        title: "Background Uploaded",
        description: "Your background has been uploaded successfully.",
      });
      setIsUploadDialogOpen(false);
      setUploadForm({ file: null, name: '', description: '', category: '', requiredPlan: 'free' });
      queryClient.invalidateQueries({ queryKey: ['/api/backgrounds'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to upload background.",
        variant: "destructive",
      });
    },
  });

  // Handle file upload
  const handleUploadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadForm.file || !uploadForm.name) {
      toast({
        title: "Missing Information",
        description: "Please provide a file and name.",
        variant: "destructive",
      });
      return;
    }

    const formData = new FormData();
    formData.append('file', uploadForm.file);
    formData.append('name', uploadForm.name);
    formData.append('description', uploadForm.description);
    formData.append('category', 'my-backgrounds'); // Always upload to user's private category
    formData.append('required_plan', uploadForm.requiredPlan);

    uploadMutation.mutate(formData);
  };

  return (
    <div className="space-y-6">
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
                      <Upload className="w-4 h-4 text-primary" />
                    </div>
                    Upload New Background
                  </DialogTitle>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground bg-blue-50 dark:bg-blue-950/30 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
                    <Lock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <span>This background will be private and only visible to you under "My Backgrounds"</span>
                  </div>
                </DialogHeader>
                <form onSubmit={handleUploadSubmit} className="space-y-6">
                  {/* File Upload Area */}
                  <div className="space-y-4">
                    <Label htmlFor="background-file" className="text-base font-medium">Background Image</Label>
                    <div 
                      className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                        uploadForm.file 
                          ? 'border-green-300 bg-green-50 dark:bg-green-950/30 dark:border-green-700' 
                          : 'border-muted-foreground/30 hover:border-muted-foreground/50'
                      }`}
                    >
                      <input
                        id="background-file"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setUploadForm(prev => ({ ...prev, file }));
                            if (!uploadForm.name) {
                              setUploadForm(prev => ({ ...prev, name: file.name.replace(/\.[^/.]+$/, "") }));
                            }
                          }
                        }}
                      />
                      
                      {uploadForm.file ? (
                        <div className="space-y-3">
                          <div className="flex items-center justify-center">
                            <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
                          </div>
                          <div>
                            <p className="font-medium text-green-900 dark:text-green-100">{uploadForm.file.name}</p>
                            <p className="text-sm text-green-700 dark:text-green-300">
                              {(uploadForm.file.size / 1024 / 1024).toFixed(2)} MB
                            </p>
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => document.getElementById('background-file')?.click()}
                            className="border-green-300 text-green-700 dark:text-green-300"
                          >
                            Change File
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <div className="flex items-center justify-center">
                            <ImageIcon className="w-12 h-12 text-muted-foreground/50" />
                          </div>
                          <div>
                            <p className="text-lg font-medium">Choose an image</p>
                            <p className="text-sm text-muted-foreground">PNG, JPG, GIF up to 10MB</p>
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => document.getElementById('background-file')?.click()}
                            className="mt-3"
                          >
                            <Upload className="w-4 h-4 mr-2" />
                            Select File
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Background Details */}
                  <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name" className="text-base font-medium">Background Name</Label>
                      <Input
                        id="name"
                        value={uploadForm.name}
                        onChange={(e) => setUploadForm(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Enter background name"
                        className="h-11"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="description" className="text-base font-medium">Description (Optional)</Label>
                      <Textarea
                        id="description"
                        value={uploadForm.description}
                        onChange={(e) => setUploadForm(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Describe your background..."
                        className="min-h-[80px] resize-none"
                      />
                    </div>
                  </div>

                  {/* Upload Progress */}
                  {uploadMutation.isPending && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400">
                        <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                        Uploading to IPFS...
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div className="bg-primary h-2 rounded-full transition-all duration-300 animate-pulse" style={{ width: '60%' }}></div>
                      </div>
                    </div>
                  )}

                  <DialogFooter className="flex-col sm:flex-row gap-3">
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
                      disabled={uploadMutation.isPending || !uploadForm.file}
                      className="flex-1"
                    >
                      {uploadMutation.isPending ? "Uploading..." : "Upload"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Background Type Controls */}
          <div className="flex items-center gap-3 mb-4 pb-4 border-b">
            <Label className="text-sm font-medium">Background Type:</Label>
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

          {/* Background Grid/List */}
          <div className={`max-h-96 overflow-y-auto ${
            viewMode === 'grid' 
              ? 'grid grid-cols-2 sm:grid-cols-3 gap-3 px-3 sm:px-0' 
              : 'space-y-2'
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
                <div className={`relative ${
                  viewMode === 'grid' ? 'aspect-video' : 'w-16 h-12 flex-shrink-0'
                }`}>
                  {/* Render different background types */}
                  {selectedCategory === 'color' ? (
                    <div 
                      className="w-full h-full rounded"
                      style={{ backgroundColor: bg.color }}
                    />
                  ) : selectedCategory === 'blur' ? (
                    <div className="w-full h-full bg-gradient-to-br from-gray-300 to-gray-500 dark:from-gray-600 dark:to-gray-800 rounded relative">
                      <div className="absolute inset-0 bg-white/20 backdrop-blur-sm rounded flex items-center justify-center">
                        <div className="text-xs font-medium text-gray-700 dark:text-gray-300">
                          Blur {bg.intensity}px
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-muted w-full h-full">
                      <img 
                        src={bg.thumbnailUrl || bg.imageUrl} 
                        alt={bg.name}
                        className="w-full h-full object-cover"
                        crossOrigin="anonymous"
                        onError={(e) => {
                          console.error('Background image failed to load:', bg.imageUrl, e);
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    </div>
                  )}
                  
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
                        {selectedCategory === 'color' ? 'Solid Color' : 
                         selectedCategory === 'blur' ? 'Blur Effect' : 
                         bg.category || 'Uncategorized'}
                      </div>
                    )}
                  </div>
                  
                  <div className={`flex items-center gap-1 ${viewMode === 'list' ? 'ml-2' : 'mt-2'}`}>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="w-6 h-6"
                      onClick={(e) => {
                        e.stopPropagation();
                        onBackgroundSelected?.(bg.id.toString());
                      }}
                    >
                      <CheckCircle className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredBackgrounds.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <ImageIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No backgrounds available in this category</p>
              {selectedCategory === 'my-backgrounds' && (
                <p className="text-sm mt-1">Upload your first background to get started!</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Scene Lighting Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="w-5 h-5 bg-yellow-500/10 rounded flex items-center justify-center">
              <svg className="w-3 h-3 text-yellow-600 dark:text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            Scene Lighting
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Lighting Controls */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Brightness</Label>
              <Slider
                value={[sceneLighting.brightness]}
                max={100}
                step={1}
                className="w-full"
                onValueChange={(value) => onSceneLightingChange?.({ ...sceneLighting, brightness: value[0] })}
              />
              <div className="text-xs text-muted-foreground text-center">{sceneLighting.brightness}%</div>
            </div>
            
            <div className="space-y-2">
              <Label className="text-sm font-medium">Contrast</Label>
              <Slider
                value={[sceneLighting.contrast]}
                max={100}
                step={1}
                className="w-full"
                onValueChange={(value) => onSceneLightingChange?.({ ...sceneLighting, contrast: value[0] })}
              />
              <div className="text-xs text-muted-foreground text-center">{sceneLighting.contrast}%</div>
            </div>
            
            <div className="space-y-2">
              <Label className="text-sm font-medium">Warmth</Label>
              <Slider
                value={[sceneLighting.warmth]}
                max={100}
                step={1}
                className="w-full"
                onValueChange={(value) => onSceneLightingChange?.({ ...sceneLighting, warmth: value[0] })}
              />
              <div className="text-xs text-muted-foreground text-center">{sceneLighting.warmth}%</div>
            </div>
            
            <div className="space-y-2">
              <Label className="text-sm font-medium">Saturation</Label>
              <Slider
                value={[sceneLighting.saturation]}
                max={100}
                step={1}
                className="w-full"
                onValueChange={(value) => onSceneLightingChange?.({ ...sceneLighting, saturation: value[0] })}
              />
              <div className="text-xs text-muted-foreground text-center">{sceneLighting.saturation}%</div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Light Angle</Label>
              <Slider
                value={[sceneLighting.lightAngle]}
                max={90}
                step={1}
                className="w-full"
                onValueChange={(value) => onSceneLightingChange?.({ ...sceneLighting, lightAngle: value[0] })}
              />
              <div className="text-xs text-muted-foreground text-center">{sceneLighting.lightAngle}°</div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Light Intensity</Label>
              <Slider
                value={[sceneLighting.lightIntensity]}
                max={100}
                step={1}
                className="w-full"
                onValueChange={(value) => onSceneLightingChange?.({ ...sceneLighting, lightIntensity: value[0] })}
              />
              <div className="text-xs text-muted-foreground text-center">{sceneLighting.lightIntensity}%</div>
            </div>
          </div>

          {/* Lighting Presets */}
          <div className="pt-2 border-t">
            <Label className="text-sm font-medium mb-3 block">Lighting Presets</Label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <Button variant="outline" size="sm" className="h-auto py-2 px-3" onClick={() => applyLightingPreset('cool')}>
                <div className="text-center">
                  <div className="w-4 h-4 bg-blue-400 rounded-full mx-auto mb-1"></div>
                  <div className="text-xs">Cool</div>
                </div>
              </Button>
              <Button variant="outline" size="sm" className="h-auto py-2 px-3" onClick={() => applyLightingPreset('warm')}>
                <div className="text-center">
                  <div className="w-4 h-4 bg-orange-400 rounded-full mx-auto mb-1"></div>
                  <div className="text-xs">Warm</div>
                </div>
              </Button>
              <Button variant="outline" size="sm" className="h-auto py-2 px-3" onClick={() => applyLightingPreset('natural')}>
                <div className="text-center">
                  <div className="w-4 h-4 bg-green-400 rounded-full mx-auto mb-1"></div>
                  <div className="text-xs">Natural</div>
                </div>
              </Button>
              <Button variant="outline" size="sm" className="h-auto py-2 px-3" onClick={() => applyLightingPreset('studio')}>
                <div className="text-center">
                  <div className="w-4 h-4 bg-purple-400 rounded-full mx-auto mb-1"></div>
                  <div className="text-xs">Studio</div>
                </div>
              </Button>
              <Button variant="outline" size="sm" className="h-auto py-2 px-3" onClick={() => applyLightingPreset('dramatic')}>
                <div className="text-center">
                  <div className="w-4 h-4 bg-red-500 rounded-full mx-auto mb-1"></div>
                  <div className="text-xs">Dramatic</div>
                </div>
              </Button>
              <Button variant="outline" size="sm" className="h-auto py-2 px-3" onClick={() => applyLightingPreset('cinematic')}>
                <div className="text-center">
                  <div className="w-4 h-4 bg-yellow-500 rounded-full mx-auto mb-1"></div>
                  <div className="text-xs">Cinematic</div>
                </div>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}