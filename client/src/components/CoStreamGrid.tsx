import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Crown, Users, Mic, MicOff, Video, VideoOff } from 'lucide-react';
import ParticipantTile from './Streaming/ParticipantTile';

interface Participant {
  id: number;
  user_id: string;
  username: string;
  role: 'host' | 'participant' | 'moderator';
  canvas_position: number;
  is_active: boolean;
}

interface ParticipantSettings {
  backgroundType: 'virtual' | 'color' | 'blur';
  selectedVirtualBg: string;
  solidColor: string;
  avatarEnabled: boolean;
  selectedAvatar: any;
  avatarOpacity: number[];
  sceneLighting?: {
    brightness: number;
    contrast: number;
    warmth: number;
    saturation: number;
    lightAngle: number;
    lightIntensity: number;
  };
}

interface CoStreamGridProps {
  session: {
    id: string | number;
    session_name: string;
    host_id: string;
    grid_layout: string;
    max_participants: number;
  };
  participants: Participant[];
  currentUserId: string;
  // Live video streams
  localStream?: MediaStream | null;
  remoteStreams?: Map<string, MediaStream>;
  cameraStreamForTracking?: MediaStream | null;
  // Participant-specific settings
  participantSettings?: Map<string, ParticipantSettings>;
  // Shared resources
  sharedBackgroundImages?: { [key: string]: HTMLImageElement };
  backgroundsLoaded?: boolean;
  isStreaming?: boolean;
}

export default function CoStreamGrid({ 
  session, 
  participants, 
  currentUserId,
  // Live video streams
  localStream = null,
  remoteStreams = new Map(),
  cameraStreamForTracking = null,
  // Participant-specific settings
  participantSettings = new Map(),
  // Shared resources
  sharedBackgroundImages,
  backgroundsLoaded = false,
  isStreaming = false
}: CoStreamGridProps) {
  const [localAudioEnabled, setLocalAudioEnabled] = useState(true);
  const [localVideoEnabled, setLocalVideoEnabled] = useState(true);

  // Calculate grid dimensions based on participant count
  const getGridDimensions = () => {
    const participantCount = participants.length;
    
    // Dynamic grid calculation based on participant count
    if (participantCount <= 1) {
      return { cols: 1, rows: 1, total: 1 };
    } else if (participantCount <= 2) {
      return { cols: 2, rows: 1, total: 2 };
    } else if (participantCount <= 4) {
      return { cols: 2, rows: 2, total: 4 };
    } else if (participantCount <= 6) {
      return { cols: 3, rows: 2, total: 6 };
    } else if (participantCount <= 9) {
      return { cols: 3, rows: 3, total: 9 };
    } else {
      return { cols: 4, rows: 4, total: 16 };
    }
  };

  const { cols, rows, total } = getGridDimensions();

  // Create grid cells
  const gridCells = Array.from({ length: total }, (_, index) => {
    const participant = participants.find(p => p.canvas_position === index);
    return { position: index, participant };
  });

  const getParticipantDisplayName = (participant: Participant) => {
    if (participant.user_id === currentUserId) {
      return `${participant.username} (You)`;
    }
    return participant.username;
  };

  const isHost = (participant: Participant) => participant.role === 'host';
  const isCurrentUser = (participant: Participant) => participant.user_id === currentUserId;

  // Debug participant streams
  useEffect(() => {
    participants.forEach(participant => {
      const remoteStream = remoteStreams.get(participant.user_id);
      console.log(`🎬 ParticipantTile debug for ${participant.username}:`, {
        isCurrentUser: isCurrentUser(participant),
        hasLocalStream: !!localStream,
        hasRemoteStream: !!remoteStream,
        remoteStreamActive: remoteStream?.active,
        remoteStreamTracks: remoteStream?.getTracks().length
      });
    });
  }, [participants, remoteStreams, localStream, isCurrentUser]);

  return (
    <div className="w-full space-y-4">
      {/* Session Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold">{session.session_name}</h3>
          <Badge variant="secondary">{session.grid_layout}</Badge>
          <Badge variant="outline">
            <Users className="w-3 h-3 mr-1" />
            {participants.length}/{session.max_participants}
          </Badge>
        </div>
        
        {/* Local Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setLocalAudioEnabled(!localAudioEnabled)}
            className={`p-2 rounded-full transition-colors ${
              localAudioEnabled 
                ? 'bg-green-600 hover:bg-green-700 text-white' 
                : 'bg-red-600 hover:bg-red-700 text-white'
            }`}
          >
            {localAudioEnabled ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
          </button>
          <button
            onClick={() => setLocalVideoEnabled(!localVideoEnabled)}
            className={`p-2 rounded-full transition-colors ${
              localVideoEnabled 
                ? 'bg-green-600 hover:bg-green-700 text-white' 
                : 'bg-red-600 hover:bg-red-700 text-white'
            }`}
          >
            {localVideoEnabled ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
          </button>
        </div>
      </div>

             {/* Dynamic Grid */}
       <div 
         className="w-full aspect-video bg-gray-900 rounded-lg overflow-hidden"
         style={{
           display: 'grid',
           gridTemplateColumns: `repeat(${cols}, 1fr)`,
           gridTemplateRows: `repeat(${rows}, 1fr)`,
           gap: '4px',
           padding: '4px'
         }}
       >
         {gridCells.map(({ position, participant }) => (
           <div key={position} className="relative w-full h-full">
             {participant ? (
               <ParticipantTile
                 // Participant identification
                 participantId={participant.user_id}
                 participantName={participant.username}
                 isHost={isHost(participant)}
                 isLocal={isCurrentUser(participant)}
                 
                 // Live video streams
                 localStream={isCurrentUser(participant) ? localStream : null}
                 remoteStream={isCurrentUser(participant) ? null : remoteStreams.get(participant.user_id) || null}
                 
                 // Participant-specific visual configuration
                 width={640}
                 height={480}
                 backgroundType={participantSettings.get(participant.user_id)?.backgroundType || 'virtual'}
                 selectedVirtualBg={participantSettings.get(participant.user_id)?.selectedVirtualBg || ''}
                 solidColor={participantSettings.get(participant.user_id)?.solidColor || '#000'}
                 cameraEnabled={isCurrentUser(participant)} // Only current user has camera enabled
                 cameraStream={isCurrentUser(participant) ? cameraStreamForTracking : null} // Use actual camera stream for tracking
                 avatarEnabled={participantSettings.get(participant.user_id)?.avatarEnabled || false}
                 selectedAvatar={participantSettings.get(participant.user_id)?.selectedAvatar || null}
                 avatarOpacity={participantSettings.get(participant.user_id)?.avatarOpacity || [80]}
                 sceneLighting={participantSettings.get(participant.user_id)?.sceneLighting}
                 
                 // Shared resources
                 sharedBackgroundImages={sharedBackgroundImages}
                 backgroundsLoaded={backgroundsLoaded}
                 
                 // Streaming configuration
                 isStreaming={isStreaming}
                 
                 // Optional participant-specific UI
                 showParticipantInfo={true}
                 showMuteIndicator={true}
                 isMuted={!localAudioEnabled}
               />
             ) : (
               <div className="h-full flex items-center justify-center bg-gray-700 border-dashed border-2 border-gray-600">
                 <div className="text-center text-gray-500">
                   <Users className="w-8 h-8 mx-auto mb-2" />
                   <p className="text-xs">Empty Slot</p>
                 </div>
               </div>
             )}
           </div>
         ))}
       </div>

      {/* Participants List */}
      <div className="bg-gray-800 rounded-lg p-4">
        <h4 className="text-sm font-semibold mb-3 text-gray-300">Participants</h4>
        <div className="space-y-2">
          {participants.map((participant) => (
            <div 
              key={participant.id} 
              className="flex items-center justify-between p-2 bg-gray-700 rounded"
            >
              <div className="flex items-center gap-2">
                {isHost(participant) && <Crown className="w-4 h-4 text-yellow-400" />}
                <span className="text-sm font-medium">
                  {getParticipantDisplayName(participant)}
                </span>
                <Badge variant="outline" className="text-xs">
                  Pos {participant.canvas_position}
                </Badge>
              </div>
              <div className="flex items-center gap-1">
                <div className={`w-2 h-2 rounded-full ${
                  participant.is_active ? 'bg-green-500' : 'bg-red-500'
                }`} />
                <span className="text-xs text-gray-400">
                  {participant.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
} 