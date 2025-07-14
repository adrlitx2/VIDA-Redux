import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAvatar } from "@/hooks/use-avatar";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { GlassCard } from "@/components/ui/glass-card";

type AvatarCreatorProps = {
  className?: string;
};

export function AvatarCreator({ className }: AvatarCreatorProps) {
  const { toast } = useToast();
  const { avatarImage, isStreaming, startStreaming, stopStreaming } = useAvatar();
  const [expression, setExpression] = useState("neutral");
  const [voiceModifier, setVoiceModifier] = useState("none");
  const [background, setBackground] = useState("studio");
  const [animation, setAnimation] = useState("idle");

  const toggleStream = () => {
    if (isStreaming) {
      stopStreaming();
      toast({
        title: "Stream Ended",
        description: "Your avatar stream has been stopped"
      });
    } else {
      startStreaming();
      toast({
        title: "Stream Started",
        description: "Your avatar is now streaming"
      });
    }
  };

  return (
    <GlassCard className={className}>
      <div className="p-6 border-b border-surface">
        <div className="flex justify-between items-center">
          <h3 className="text-xl font-bold">Avatar Preview</h3>
          <div className="flex space-x-2">
            <button className="p-2 rounded-lg bg-surface hover:bg-surface-light transition">
              <i className="ri-settings-3-line text-white"></i>
            </button>
            <button className="p-2 rounded-lg bg-surface hover:bg-surface-light transition">
              <i className="ri-fullscreen-line text-white"></i>
            </button>
          </div>
        </div>
      </div>
      <div className="p-6 relative">
        {/* Avatar Preview */}
        <div className="aspect-video rounded-2xl overflow-hidden bg-background-dark relative">
          {avatarImage ? (
            <img src={avatarImage} alt="3D avatar" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <p className="text-gray-400">No avatar selected</p>
            </div>
          )}
          
          {/* Camera Controls Overlay */}
          <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
            <div className="flex space-x-3">
              <button className="w-10 h-10 rounded-full bg-surface flex items-center justify-center">
                <i className="ri-camera-fill text-white"></i>
              </button>
              <button className="w-10 h-10 rounded-full bg-surface flex items-center justify-center">
                <i className="ri-mic-fill text-white"></i>
              </button>
            </div>
            <Button 
              onClick={toggleStream}
              className={`px-4 py-2 rounded-xl text-white text-sm font-medium ${isStreaming ? 'bg-destructive animate-pulse' : 'bg-accent'}`}
            >
              {isStreaming ? 'END STREAM' : 'GO LIVE'}
            </Button>
          </div>
        </div>
        
        {/* Avatar Controls */}
        <div className="mt-6 grid grid-cols-2 gap-4">
          <div className="space-y-4">
            <div>
              <label className="text-sm text-gray-300 block mb-2">Expression</label>
              <Select value={expression} onValueChange={setExpression}>
                <SelectTrigger className="w-full bg-surface border border-surface-light rounded-xl p-3 text-white">
                  <SelectValue placeholder="Select expression" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="neutral">Neutral</SelectItem>
                  <SelectItem value="happy">Happy</SelectItem>
                  <SelectItem value="sad">Sad</SelectItem>
                  <SelectItem value="surprised">Surprised</SelectItem>
                  <SelectItem value="angry">Angry</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm text-gray-300 block mb-2">Voice Modifier</label>
              <Select value={voiceModifier} onValueChange={setVoiceModifier}>
                <SelectTrigger className="w-full bg-surface border border-surface-light rounded-xl p-3 text-white">
                  <SelectValue placeholder="Select voice modifier" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="deep">Deep</SelectItem>
                  <SelectItem value="high">High Pitch</SelectItem>
                  <SelectItem value="robot">Robot</SelectItem>
                  <SelectItem value="echo">Echo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <label className="text-sm text-gray-300 block mb-2">Background</label>
              <Select value={background} onValueChange={setBackground}>
                <SelectTrigger className="w-full bg-surface border border-surface-light rounded-xl p-3 text-white">
                  <SelectValue placeholder="Select background" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="studio">Studio</SelectItem>
                  <SelectItem value="space">Space</SelectItem>
                  <SelectItem value="cyberpunk">Cyberpunk City</SelectItem>
                  <SelectItem value="forest">Forest</SelectItem>
                  <SelectItem value="custom">Custom...</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm text-gray-300 block mb-2">Animation</label>
              <Select value={animation} onValueChange={setAnimation}>
                <SelectTrigger className="w-full bg-surface border border-surface-light rounded-xl p-3 text-white">
                  <SelectValue placeholder="Select animation" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="idle">Idle</SelectItem>
                  <SelectItem value="speaking">Speaking</SelectItem>
                  <SelectItem value="excited">Excited</SelectItem>
                  <SelectItem value="thinking">Thinking</SelectItem>
                  <SelectItem value="custom">Custom...</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>
    </GlassCard>
  );
}

export default AvatarCreator;
