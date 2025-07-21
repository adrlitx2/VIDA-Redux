import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { User, Sparkles, Clock, Database, ExternalLink } from 'lucide-react';
import { Link } from 'wouter';
import type { Avatar, PresetAvatar, AvatarCategory } from '@shared/schema';

interface AvatarSelectorProps {
  selectedAvatarId?: number;
  selectedAvatarType?: 'user' | 'preset';
  onAvatarSelect: (avatar: Avatar | PresetAvatar, type: 'user' | 'preset') => void;
  userPlan?: string;
  className?: string;
}

export function AvatarSelector({ 
  selectedAvatarId, 
  selectedAvatarType,
  onAvatarSelect,
  userPlan = 'free',
  className 
}: AvatarSelectorProps) {
  const { toast } = useToast();
  const [selectedCategory, setSelectedCategory] = useState<string>('');

  // Fetch user avatars
  const { data: userAvatars = [], isLoading: loadingUserAvatars } = useQuery({
    queryKey: ['/api/avatars'],
    refetchOnWindowFocus: false
  });

  // Fetch preset avatars based on user plan
  const { data: presetAvatars = [], isLoading: loadingPresets } = useQuery({
    queryKey: ['/api/avatars/presets', selectedCategory, userPlan],
    refetchOnWindowFocus: false
  });

  // Fetch avatar categories
  const { data: categories = [], isLoading: loadingCategories } = useQuery({
    queryKey: ['/api/avatars/categories'],
    refetchOnWindowFocus: false
  });

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.name.toLowerCase().endsWith('.glb') && !file.name.toLowerCase().endsWith('.gltf')) {
      toast({
        title: 'Invalid file type',
        description: 'Please select a GLB or GLTF file.',
        variant: 'destructive'
      });
      return;
    }

    // Validate file size (50MB max)
    if (file.size > 50 * 1024 * 1024) {
      toast({
        title: 'File too large',
        description: 'Avatar files must be under 50MB.',
        variant: 'destructive'
      });
      return;
    }

    // Auto-fill name from filename
    if (!uploadForm.name) {
      setUploadForm(prev => ({
        ...prev,
        name: file.name.replace(/\.(glb|gltf)$/i, '')
      }));
    }

    const formData = new FormData();
    formData.append('avatar', file);
    formData.append('name', uploadForm.name || file.name.replace(/\.(glb|gltf)$/i, ''));
    formData.append('category', uploadForm.category);

    uploadMutation.mutate(formData);
  };

  const handleAvatarSelect = (avatar: Avatar | PresetAvatar, type: 'user' | 'preset') => {
    onAvatarSelect(avatar, type);
    
    // Track usage
    trackUsageMutation.mutate({
      avatarId: avatar.id,
      isPreset: type === 'preset'
    });
  };

  const handleDeleteAvatar = (avatarId: number) => {
    if (confirm('Are you sure you want to delete this avatar? This action cannot be undone.')) {
      deleteMutation.mutate(avatarId);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getAvatarBadge = (avatar: Avatar | PresetAvatar) => {
    if ('requiredPlan' in avatar && avatar.requiredPlan !== 'free') {
      return <Badge variant="secondary" className="text-xs">{avatar.requiredPlan}</Badge>;
    }
    if ('isRigged' in avatar && avatar.isRigged) {
      return <Badge variant="outline" className="text-xs">Rigged</Badge>;
    }
    return null;
  };

  const AvatarCard = ({ avatar, type, isSelected }: {
    avatar: Avatar | PresetAvatar;
    type: 'user' | 'preset';
    isSelected: boolean;
  }) => (
    <Card 
      className={`cursor-pointer transition-all hover:shadow-md ${
        isSelected ? 'ring-2 ring-primary bg-primary/5' : ''
      }`}
      onClick={() => handleAvatarSelect(avatar, type)}
    >
      <CardContent className="p-3">
        <div className="relative mb-2">
          <img
            src={avatar.thumbnailUrl}
            alt={avatar.name}
            className="w-full h-24 object-cover rounded"
            onError={(e) => {
              e.currentTarget.src = '/placeholder-avatar.png';
            }}
          />
          <div className="absolute top-1 right-1 flex gap-1">
            {getAvatarBadge(avatar)}
          </div>
          {type === 'user' && (
            <Button
              variant="destructive"
              size="sm"
              className="absolute bottom-1 right-1 h-6 w-6 p-0"
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteAvatar(avatar.id);
              }}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          )}
        </div>
        
        <div className="space-y-1">
          <h4 className="font-medium text-sm truncate">{avatar.name}</h4>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{formatFileSize(avatar.fileSize)}</span>
            {'usageCount' in avatar && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {avatar.usageCount}
              </span>
            )}
          </div>
          {avatar.vertices && (
            <div className="text-xs text-muted-foreground">
              {avatar.vertices.toLocaleString()} vertices
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className={className}>
      <Tabs defaultValue="my-avatars" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="my-avatars" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            My Avatars
          </TabsTrigger>
          <TabsTrigger value="presets" className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            Presets
          </TabsTrigger>
        </TabsList>

        <TabsContent value="my-avatars" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Your Avatars</h3>
            <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="flex items-center gap-2">
                  <Upload className="h-4 w-4" />
                  Upload Avatar
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Upload New Avatar</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="avatar-name">Avatar Name</Label>
                    <Input
                      id="avatar-name"
                      value={uploadForm.name}
                      onChange={(e) => setUploadForm(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Enter avatar name"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="avatar-category">Category</Label>
                    <Select
                      value={uploadForm.category}
                      onValueChange={(value) => setUploadForm(prev => ({ ...prev, category: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="custom">Custom</SelectItem>
                        {categories.map((category) => (
                          <SelectItem key={category.id} value={category.name}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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

          <ScrollArea className="h-64">
            {loadingUserAvatars ? (
              <div className="flex items-center justify-center h-32">
                <Database className="h-8 w-8 animate-spin" />
              </div>
            ) : userAvatars.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <User className="h-12 w-12 mx-auto mb-2" />
                <p>No avatars uploaded yet</p>
                <p className="text-sm">Upload your first GLB avatar to get started</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {userAvatars.map((avatar) => (
                  <AvatarCard
                    key={avatar.id}
                    avatar={avatar}
                    type="user"
                    isSelected={selectedAvatarType === 'user' && selectedAvatarId === avatar.id}
                  />
                ))}
              </div>
            )}
          </ScrollArea>
        </TabsContent>

        <TabsContent value="presets" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Preset Avatars</h3>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All categories</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id.toString()}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <ScrollArea className="h-64">
            {loadingPresets ? (
              <div className="flex items-center justify-center h-32">
                <Database className="h-8 w-8 animate-spin" />
              </div>
            ) : presetAvatars.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Sparkles className="h-12 w-12 mx-auto mb-2" />
                <p>No preset avatars available</p>
                <p className="text-sm">Check back later for new preset options</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {presetAvatars.map((avatar) => (
                  <AvatarCard
                    key={avatar.id}
                    avatar={avatar}
                    type="preset"
                    isSelected={selectedAvatarType === 'preset' && selectedAvatarId === avatar.id}
                  />
                ))}
              </div>
            )}
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}