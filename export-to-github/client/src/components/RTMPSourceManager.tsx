import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Settings } from "lucide-react";

interface RTMPSourceManagerProps {
  onSourceAdded: () => void;
}

export function RTMPSourceManager({ onSourceAdded }: RTMPSourceManagerProps) {
  const { toast } = useToast();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    rtmp_url: "",
    stream_key: "",
    platform: "x" as "x" | "youtube" | "twitch" | "custom",
    bitrate: 6000
  });

  const createSourceMutation = useMutation({
    mutationFn: async (sourceData: any) => {
      return await apiRequest("POST", "/api/rtmp-sources", sourceData);
    },
    onSuccess: () => {
      onSourceAdded();
      setIsAddDialogOpen(false);
      setFormData({ name: "", rtmp_url: "", stream_key: "", platform: "x", bitrate: 6000 });
      toast({
        title: "RTMP Source Added",
        description: "New streaming destination has been configured.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to add RTMP source. Please try again.",
        variant: "destructive"
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.rtmp_url || !formData.stream_key) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive"
      });
      return;
    }
    createSourceMutation.mutate(formData);
  };

  const platformPresets = {
    x: {
      name: "X.com Live",
      rtmp_url: "rtmp://live-video.x.com/live",
      placeholder_key: "Your X Live stream key",
      bitrate: 6000 // X.com recommended for 1080p
    },
    youtube: {
      name: "YouTube Live",
      rtmp_url: "rtmp://a.rtmp.youtube.com/live2",
      placeholder_key: "Your YouTube stream key",
      bitrate: 9000 // YouTube recommended for 1080p60
    },
    twitch: {
      name: "Twitch",
      rtmp_url: "rtmp://live.twitch.tv/live",
      placeholder_key: "Your Twitch stream key",
      bitrate: 6000 // Twitch max bitrate
    },
    custom: {
      name: "Custom RTMP",
      rtmp_url: "",
      placeholder_key: "Stream key",
      bitrate: 6000 // 1080p default
    }
  };

  const handlePlatformChange = (platform: string) => {
    const preset = platformPresets[platform as keyof typeof platformPresets];
    setFormData(prev => ({
      ...prev,
      platform: platform as any,
      name: preset.name,
      rtmp_url: preset.rtmp_url,
      bitrate: preset.bitrate
    }));
  };

  return (
    <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full">
          <Plus className="w-4 h-4 mr-2" />
          Add RTMP Destination
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add RTMP Streaming Destination</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="platform">Platform</Label>
            <Select value={formData.platform} onValueChange={handlePlatformChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="x">X.com Live</SelectItem>
                <SelectItem value="youtube">YouTube Live</SelectItem>
                <SelectItem value="twitch">Twitch</SelectItem>
                <SelectItem value="custom">Custom RTMP</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="e.g., X Live Stream"
              required
            />
          </div>

          <div>
            <Label htmlFor="rtmp_url">RTMP URL</Label>
            <Input
              id="rtmp_url"
              value={formData.rtmp_url}
              onChange={(e) => setFormData(prev => ({ ...prev, rtmp_url: e.target.value }))}
              placeholder="rtmp://live-video.x.com/live"
              required
              disabled={formData.platform !== 'custom'}
            />
          </div>

          <div>
            <Label htmlFor="stream_key">Stream Key</Label>
            <Input
              id="stream_key"
              type="password"
              value={formData.stream_key}
              onChange={(e) => setFormData(prev => ({ ...prev, stream_key: e.target.value }))}
              placeholder={platformPresets[formData.platform].placeholder_key}
              required
            />
          </div>

          {/* Platform-specific helper text */}
          {formData.platform === 'x' && (
            <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-lg text-sm">
              <div className="font-medium text-blue-900 dark:text-blue-100 mb-2">How to get your X.com stream key:</div>
              <ol className="text-blue-800 dark:text-blue-200 space-y-1 list-decimal list-inside">
                <li>Go to <a href="https://studio.x.com" target="_blank" rel="noopener noreferrer" className="underline">studio.x.com</a></li>
                <li>Click "Go Live" or "Create Live Stream"</li>
                <li>Choose "Use streaming software" option</li>
                <li>Copy the "Stream key" from the settings</li>
                <li>Paste it in the field above</li>
              </ol>
              <div className="mt-2 text-xs text-blue-700 dark:text-blue-300">
                Note: Your X account must have live streaming enabled
              </div>
            </div>
          )}

          {formData.platform === 'youtube' && (
            <div className="bg-red-50 dark:bg-red-950 p-3 rounded-lg text-sm">
              <div className="font-medium text-red-900 dark:text-red-100 mb-2">How to get your YouTube stream key:</div>
              <ol className="text-red-800 dark:text-red-200 space-y-1 list-decimal list-inside">
                <li>Go to <a href="https://studio.youtube.com" target="_blank" rel="noopener noreferrer" className="underline">YouTube Studio</a></li>
                <li>Click "Create" → "Go Live"</li>
                <li>Select "Stream" tab</li>
                <li>Copy the "Stream key" from the settings</li>
                <li>Paste it in the field above</li>
              </ol>
              <div className="mt-2 text-xs text-red-700 dark:text-red-300">
                Note: Channel must have no live streaming restrictions in the past 90 days
              </div>
            </div>
          )}

          {formData.platform === 'twitch' && (
            <div className="bg-purple-50 dark:bg-purple-950 p-3 rounded-lg text-sm">
              <div className="font-medium text-purple-900 dark:text-purple-100 mb-2">How to get your Twitch stream key:</div>
              <ol className="text-purple-800 dark:text-purple-200 space-y-1 list-decimal list-inside">
                <li>Go to <a href="https://dashboard.twitch.tv" target="_blank" rel="noopener noreferrer" className="underline">Twitch Creator Dashboard</a></li>
                <li>Click "Settings" → "Stream"</li>
                <li>Find "Primary Stream key" section</li>
                <li>Click "Copy" to copy your stream key</li>
                <li>Paste it in the field above</li>
              </ol>
              <div className="mt-2 text-xs text-purple-700 dark:text-purple-300">
                Keep your stream key private - it's like a password for your channel
              </div>
            </div>
          )}

          {formData.platform === 'custom' && (
            <div className="bg-gray-50 dark:bg-gray-950 p-3 rounded-lg text-sm">
              <div className="font-medium text-gray-900 dark:text-gray-100 mb-2">Custom RTMP Setup:</div>
              <div className="text-gray-800 dark:text-gray-200 space-y-1">
                <p>• Enter the RTMP server URL provided by your streaming platform</p>
                <p>• Enter the stream key or access token</p>
                <p>• Common formats: rtmp://server.example.com/live</p>
                <p>• Some platforms use RTMPS (secure) instead of RTMP</p>
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setIsAddDialogOpen(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={createSourceMutation.isPending}
              className="flex-1"
            >
              {createSourceMutation.isPending ? "Adding..." : "Add Source"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}