import React from 'react';
import { StreamingCanvas } from '../StreamingCanvas';

interface ParticipantTileProps {
  // Participant identification
  participantId?: string;
  participantName?: string;
  isHost?: boolean;
  isLocal?: boolean;
  
  // Live video streams
  localStream?: MediaStream | null;
  remoteStream?: MediaStream | null;
  
  // Visual configuration
  width?: number;
  height?: number;
  backgroundType: 'virtual' | 'color' | 'blur';
  selectedVirtualBg: string;
  solidColor: string;
  cameraEnabled: boolean;
  cameraStream: MediaStream | null;
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
  
  // Shared resources
  sharedBackgroundImages?: { [key: string]: HTMLImageElement };
  backgroundsLoaded?: boolean;
  
  // Streaming configuration
  isStreaming?: boolean;
  onFrameCapture?: (canvas: HTMLCanvasElement) => void;
  
  // Optional participant-specific UI
  showParticipantInfo?: boolean;
  showMuteIndicator?: boolean;
  isMuted?: boolean;
}

const ParticipantTile: React.FC<ParticipantTileProps> = ({
  // Participant identification
  participantId,
  participantName,
  isHost = false,
  isLocal = false,
  
  // Live video streams
  localStream = null,
  remoteStream = null,
  
  // Visual configuration
  width = 1920,
  height = 1080,
  backgroundType,
  selectedVirtualBg,
  solidColor,
  cameraEnabled,
  cameraStream,
  avatarEnabled,
  selectedAvatar,
  avatarOpacity,
  sceneLighting,
  
  // Shared resources
  sharedBackgroundImages,
  backgroundsLoaded,
  
  // Streaming configuration
  isStreaming = false,
  onFrameCapture,
  
  // Optional participant-specific UI
  showParticipantInfo = true,
  showMuteIndicator = true,
  isMuted = false,
}) => {
  return (
    <div className="relative bg-black rounded-lg overflow-hidden w-full h-full flex items-center justify-center">
      <div className="w-full" style={{ aspectRatio: '16/9' }}>
        {/* For co-streaming, always use StreamingCanvas with backgrounds/avatars */}
        {/* The WebRTC streams are used for tracking, not display */}
        <StreamingCanvas
          width={width}
          height={height}
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
          onFrameCapture={onFrameCapture}
        />
        
        {/* Participant Info Overlay */}
        {showParticipantInfo && (
          <div className="absolute top-2 left-2 flex items-center gap-2">
            {/* Host Badge */}
            {isHost && (
              <div className="bg-yellow-500 text-black text-xs px-2 py-1 rounded-full font-semibold">
                HOST
              </div>
            )}
            
            {/* Local User Badge */}
            {isLocal && (
              <div className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full font-semibold">
                YOU
              </div>
            )}
            
            {/* Participant Name */}
            {participantName && (
              <div className="bg-black/70 text-white text-xs px-2 py-1 rounded font-medium">
                {participantName}
              </div>
            )}
          </div>
        )}
        
        {/* Mute Indicator */}
        {showMuteIndicator && isMuted && (
          <div className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.617.793L5.5 14H3a1 1 0 01-1-1V7a1 1 0 011-1h2.5l3.883-3.707zM12.293 7.293a1 1 0 011.414 0L15 8.586l1.293-1.293a1 1 0 111.414 1.414L16.414 10l1.293 1.293a1 1 0 01-1.414 1.414L15 11.414l-1.293 1.293a1 1 0 01-1.414-1.414L13.586 10l-1.293-1.293a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </div>
        )}
        
        {/* Streaming Indicator */}
        {isStreaming && (
          <div className="absolute bottom-2 left-2 flex items-center gap-2 bg-red-500/90 backdrop-blur-sm text-white px-2 py-1 rounded-full text-xs font-semibold">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
            LIVE
          </div>
        )}
      </div>
    </div>
  );
};

export default ParticipantTile; 