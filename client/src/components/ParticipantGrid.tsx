import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Users, 
  Video, 
  VideoOff, 
  Mic, 
  MicOff, 
  Settings, 
  Crown,
  User,
  MoreVertical
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import ParticipantTile from "./Streaming/ParticipantTile";

interface Participant {
  id: string;
  userId: string;
  username: string;
  role: 'host' | 'participant' | 'moderator';
  canvasPosition: number;
  isActive: boolean;
  streamQuality: 'low' | 'medium' | 'high';
  hasVideo: boolean;
  hasAudio: boolean;
  user?: {
    id: string;
    username: string;
    email: string;
    role: string;
    plan: string;
  };
  // New props for ParticipantTile
  isLocal?: boolean;
  backgroundType?: 'virtual' | 'solid' | 'image';
  selectedVirtualBg?: string;
  solidColor?: string;
  cameraStream?: MediaStream;
  avatarEnabled?: boolean;
  selectedAvatar?: string;
  avatarOpacity?: number[];
  sceneLighting?: string;
  sharedBackgroundImages?: string[];
  backgroundsLoaded?: boolean;
  isStreaming?: boolean;
}

interface ParticipantGridProps {
  sessionId?: number;
  participants: Participant[];
  layout: '2x2' | '3x3' | '4x4' | 'custom';
  isHost: boolean;
  onLayoutChange: (layout: '2x2' | '3x3' | '4x4' | 'custom') => void;
  onParticipantKick?: (userId: string) => void;
  onParticipantMute?: (userId: string, type: 'video' | 'audio') => void;
  onPositionChange?: (userId: string, newPosition: number) => void;
  // Visual configuration props from parent
  backgroundType?: 'virtual' | 'color' | 'blur';
  selectedVirtualBg?: string;
  solidColor?: string;
  cameraEnabled?: boolean;
  cameraStream?: MediaStream | null;
  avatarEnabled?: boolean;
  selectedAvatar?: any;
  avatarOpacity?: number[];
  sceneLighting?: {
    brightness: number;
    contrast: number;
    warmth: number;
    saturation: number;
    lightAngle: number;
    lightIntensity: number;
  };
  sharedBackgroundImages?: { [key: string]: HTMLImageElement };
  backgroundsLoaded?: boolean;
  isStreaming?: boolean;
}

export default function ParticipantGrid({
  sessionId,
  participants,
  layout,
  isHost,
  onLayoutChange,
  onParticipantKick,
  onParticipantMute,
  onPositionChange,
  // Visual configuration props
  backgroundType = 'virtual',
  selectedVirtualBg = '',
  solidColor = '#000',
  cameraEnabled = false,
  cameraStream = null,
  avatarEnabled = false,
  selectedAvatar = null,
  avatarOpacity = [80],
  sceneLighting,
  sharedBackgroundImages,
  backgroundsLoaded = false,
  isStreaming = false
}: ParticipantGridProps) {
  const [hoveredParticipant, setHoveredParticipant] = useState<string | null>(null);
  const [showControls, setShowControls] = useState(false);
  const canvasRefs = useRef<{ [key: string]: HTMLCanvasElement | null }>({});
  const { toast } = useToast();

  // Dynamic grid configuration based on participant count
  const getDynamicGridConfig = () => {
    const totalParticipants = participants.length;
    
    // Auto-adjust layout based on participant count
    let dynamicLayout = layout;
    if (totalParticipants <= 1) {
      dynamicLayout = '2x2'; // Single participant gets a 2x2 grid
    } else if (totalParticipants <= 4) {
      dynamicLayout = '2x2';
    } else if (totalParticipants <= 9) {
      dynamicLayout = '3x3';
    } else {
      dynamicLayout = '4x4';
    }

    switch (dynamicLayout) {
      case '2x2':
        return {
          cols: 2,
          rows: 2,
          maxParticipants: 4,
          cellClass: 'aspect-video',
          layout: '2x2'
        };
      case '3x3':
        return {
          cols: 3,
          rows: 3,
          maxParticipants: 9,
          cellClass: 'aspect-square',
          layout: '3x3'
        };
      case '4x4':
        return {
          cols: 4,
          rows: 4,
          maxParticipants: 16,
          cellClass: 'aspect-square',
          layout: '4x4'
        };
      default:
        return {
          cols: 2,
          rows: 2,
          maxParticipants: 4,
          cellClass: 'aspect-video',
          layout: '2x2'
        };
    }
  };

  const gridConfig = getDynamicGridConfig();

  // Get participant by position
  const getParticipantByPosition = (position: number) => {
    return participants.find(p => p.canvasPosition === position);
  };

  // Get user initials for avatar
  const getUserInitials = (username: string) => {
    return username
      .split(' ')
      .map(name => name[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Get role icon
  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'host':
        return <Crown className="h-4 w-4 text-yellow-500" />;
      case 'moderator':
        return <Settings className="h-4 w-4 text-blue-500" />;
      default:
        return <User className="h-4 w-4 text-gray-500" />;
    }
  };

  // Get plan color
  const getPlanColor = (plan: string) => {
    switch (plan) {
      case 'goat':
        return 'bg-purple-500';
      case 'zeus':
        return 'bg-blue-500';
      case 'spartan':
        return 'bg-green-500';
      case 'reply-guy':
        return 'bg-yellow-500';
      default:
        return 'bg-gray-500';
    }
  };

  // Handle canvas update
  const updateCanvas = (userId: string, imageData: string) => {
    const canvas = canvasRefs.current[userId];
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    };
    img.src = imageData;
  };

  // Handle participant actions
  const handleParticipantAction = async (action: string, userId: string, data?: any) => {
    try {
      const response = await fetch(`/api/co-stream/${sessionId}/${action}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('supabase.auth.token')}`
        },
        body: JSON.stringify({ userId, ...data })
      });

      if (!response.ok) {
        throw new Error('Action failed');
      }

      toast({
        title: 'Action Successful',
        description: `${action} completed successfully`
      });
    } catch (error) {
      console.error(`${action} error:`, error);
      toast({
        title: 'Action Failed',
        description: `Failed to ${action}`,
        variant: 'destructive'
      });
    }
  };

  // Generate grid cells - only show cells for actual participants
  const generateGridCells = () => {
    const cells = [];
    const totalParticipants = participants.length;
    
    // If no participants, show a single cell for the host
    if (totalParticipants === 0) {
      cells.push(
        <div
          key="host-placeholder"
          className="relative aspect-video bg-gray-900 rounded-lg overflow-hidden border-2 border-gray-800 col-span-2 row-span-2"
        >
          <div className="flex items-center justify-center h-full text-gray-400">
            <div className="text-center">
              <Crown className="h-8 w-8 mx-auto mb-2" />
              <p className="text-sm">Host Stream</p>
            </div>
          </div>
        </div>
      );
      return cells;
    }

    // Generate cells for actual participants
    for (let i = 0; i < totalParticipants; i++) {
      const participant = participants[i];
      if (!participant) continue;

      cells.push(
        <ParticipantTile
          key={participant.userId}
          participantId={participant.userId}
          participantName={participant.username}
          isHost={participant.role === 'host'}
          isLocal={participant.isLocal}
          // Use visual configuration props from parent (StableStreamingStudio)
          width={640}
          height={480}
          backgroundType={backgroundType}
          selectedVirtualBg={selectedVirtualBg}
          solidColor={solidColor}
          cameraEnabled={cameraEnabled}
          cameraStream={cameraStream}
          avatarEnabled={avatarEnabled}
          selectedAvatar={selectedAvatar}
          avatarOpacity={avatarOpacity}
          sceneLighting={sceneLighting}
          sharedBackgroundImages={sharedBackgroundImages}
          backgroundsLoaded={backgroundsLoaded}
          isStreaming={isStreaming}
          // Optional participant-specific UI
          showParticipantInfo={true}
          showMuteIndicator={true}
          isMuted={participant.hasAudio === false}
        />
      );
    }

    return cells;
  };

  return (
    <div className="w-full">
      {participants.length === 1 ? (
        // Render the ParticipantTile directly, no grid or wrapper
        generateGridCells()[0]
      ) : (
        <div
          className={`grid gap-4`}
          style={{
            gridTemplateColumns: `repeat(${gridConfig.cols}, minmax(0, 1fr))`,
            gridTemplateRows: `repeat(${gridConfig.rows}, minmax(0, 1fr))`,
          }}
        >
          {generateGridCells().map((cell, idx) => (
            <div key={idx} className="w-full aspect-[16/9]">{cell}</div>
          ))}
        </div>
      )}
    </div>
  );
} 
 