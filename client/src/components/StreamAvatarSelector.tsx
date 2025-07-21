import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { User, Sparkles, Clock, Database, ExternalLink, Upload } from 'lucide-react';
import { Link } from 'wouter';
import { apiRequest } from '@/lib/queryClient';
import type { Avatar, PresetAvatar, AvatarCategory } from '@shared/schema';

interface StreamAvatarSelectorProps {
  selectedAvatarId?: number;
  selectedAvatarType?: 'user' | 'preset';
  onAvatarSelect: (avatar: Avatar | PresetAvatar, type: 'user' | 'preset') => void;
  userPlan?: string;
  className?: string;
}

export function StreamAvatarSelector({ 
  selectedAvatarId, 
  selectedAvatarType,
  onAvatarSelect,
  userPlan = 'free',
  className 
}: StreamAvatarSelectorProps) {
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

  // Track avatar usage
  const trackUsageMutation = useMutation({
    mutationFn: async ({ avatarId, isPreset }: { avatarId: number; isPreset: boolean }) => {
      return await apiRequest(`/api/avatars/${avatarId}/use`, {
        method: 'POST',
        body: JSON.stringify({ isPreset })
      });
    }
  });

  const handleAvatarSelect = (avatar: Avatar | PresetAvatar, type: 'user' | 'preset') => {
    onAvatarSelect(avatar, type);
    
    // Track usage
    trackUsageMutation.mutate({
      avatarId: avatar.id,
      isPreset: type === 'preset'
    });
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

  const isPlanSufficient = (requiredPlan: string) => {
    const planHierarchy = ['free', 'starter', 'goat'];
    const userPlanIndex = planHierarchy.indexOf(userPlan);
    const requiredPlanIndex = planHierarchy.indexOf(requiredPlan);
    return userPlanIndex >= requiredPlanIndex;
  };

  const AvatarCard = ({ avatar, type, isSelected }: {
    avatar: Avatar | PresetAvatar;
    type: 'user' | 'preset';
    isSelected: boolean;
  }) => {
    const canSelect = type === 'user' || isPlanSufficient(avatar.requiredPlan || 'free');
    
    return (
      <Card 
        className={`cursor-pointer transition-all hover:shadow-md ${
          isSelected ? 'ring-2 ring-primary bg-primary/5' : ''
        } ${!canSelect ? 'opacity-50' : ''}`}
        onClick={() => canSelect && handleAvatarSelect(avatar, type)}
      >
        <CardContent className="p-3">
          <div className="relative mb-2">
            <img
              src={avatar.thumbnailUrl}
              alt={avatar.name}
              className="w-full h-20 object-cover rounded"
              onError={(e) => {
                e.currentTarget.src = '/placeholder-avatar.png';
              }}
            />
            <div className="absolute top-1 right-1 flex gap-1">
              {getAvatarBadge(avatar)}
            </div>
            {!canSelect && (
              <div className="absolute inset-0 bg-black/20 rounded flex items-center justify-center">
                <Badge variant="destructive" className="text-xs">
                  Requires {avatar.requiredPlan || 'premium'}
                </Badge>
              </div>
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
  };

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
            <Link href="/avatars">
              <Button variant="outline" size="sm" className="flex items-center gap-2">
                <Upload className="h-4 w-4" />
                Manage Avatars
                <ExternalLink className="h-3 w-3" />
              </Button>
            </Link>
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
                <Link href="/avatars">
                  <Button variant="outline" size="sm" className="mt-2">
                    Upload Your First Avatar
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {userAvatars.map((avatar: any) => (
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
                {categories.map((category: any) => (
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
                {presetAvatars.map((avatar: any) => (
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