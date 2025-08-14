import { useState, useRef, useEffect, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { io, Socket } from 'socket.io-client';
import { RTMPSourceManager } from "./RTMPSourceManager";
import { BackgroundSettingsPanel } from "./BackgroundSettingsPanel";
import { StreamAvatarSelector } from "./StreamAvatarSelector";
import ThreeModelViewer from "./ThreeModelViewer";
// Unified streaming solution - all methods consolidated
import { useAuth } from "@/hooks/use-auth.tsx";
import { useSubscription } from "@/hooks/use-subscription.tsx";
import { getAuthHeaders } from "@/lib/auth-helper";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { 
  Video, 
  VideoOff, 
  Mic, 
  MicOff, 
  Settings,
  Zap, 
  Play, 
  Square, 
  Users, 
  ExternalLink,
  Monitor,
  Layers,
  Camera,
  Radio,
  Copy,
  Check,
  Edit,
  Trash2,
  RefreshCw,
  Image,
  Upload,
  UserPlus,
  Crown,
  Grid3X3
} from "lucide-react";

// Import streaming components
import UserSearch from "./UserSearch";

import ParticipantTile from "./Streaming/ParticipantTile";
import PendingInvitations from "./PendingInvitations";
import CoStreamGrid from "./CoStreamGrid";
// import { useAvatar } from "@/hooks/use-avatar"; // No longer needed

export default function StableStreamingStudio() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { currentPlan, remainingStreamTime } = useSubscription();
  // Fetch avatars on-demand using React Query
  const { data: avatars = [], isLoading: isLoadingAvatars } = useQuery({
    queryKey: ['avatars'],
    queryFn: async () => {
      if (!user?.id) return [];
      const session = await import('@/lib/supabase').then(m => m.supabase.auth.getSession());
      const token = session.data.session?.access_token;
      if (!token) return [];
      const response = await fetch('/api/avatars', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !!user?.id,
  });
  
  // Avatar state management
  const [selectedAvatar, setSelectedAvatar] = useState<any>(null);
  const [selectedAvatarType, setSelectedAvatarType] = useState<'user' | 'preset'>('user');
  const [avatarEnabled, setAvatarEnabled] = useState(true);

  // Co-streaming state
  const [coStreamEnabled, setCoStreamEnabled] = useState(false);
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [coStreamSession, setCoStreamSession] = useState<any>(null);
  const [participants, setParticipants] = useState<any[]>([]);
  const [gridLayout, setGridLayout] = useState<'2x2' | '3x3' | '4x4' | 'custom'>('2x2');
  const [isHost, setIsHost] = useState(true);
  
  // Participant-specific settings
  const [participantSettings, setParticipantSettings] = useState<Map<string, any>>(new Map());
  
  // WebRTC state for live video streams
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [cameraStreamForTracking, setCameraStreamForTracking] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
  const [peerConnections, setPeerConnections] = useState<Map<string, RTCPeerConnection>>(new Map());

  // Co-streaming Socket.IO
  const coStreamSocketRef = useRef<Socket | null>(null);

  // Debug avatar state
  useEffect(() => {
    console.log('🎭 Avatar Debug:', {
      avatarEnabled,
      selectedAvatar: selectedAvatar?.name,
      selectedAvatarId: selectedAvatar?.id,
      selectedAvatarType,
      shouldRenderAvatar: avatarEnabled && selectedAvatar
    });
  }, [avatarEnabled, selectedAvatar, selectedAvatarType]);

  // Background images from IPFS cache
  const [backgroundImagesLoaded, setBackgroundImagesLoaded] = useState(false);
  const [backgroundImages, setBackgroundImages] = useState<{[key: string]: HTMLImageElement}>({});
  
  // Fetch backgrounds from API to get cached high-res URLs
  const { data: backgrounds = [] } = useQuery<any[]>({
    queryKey: ['/api/backgrounds'],
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false, // Disable refetch on window focus
    retry: 1, // Only retry once
  });

  // Auto-select first avatar when avatars are loaded
  // TEMPORARILY DISABLED TO DEBUG INFINITE LOOP
  // const { data: avatars = [] } = useQuery<any[]>({
  //   queryKey: ['/api/avatars'],
  //   staleTime: 5 * 60 * 1000, // 5 minutes
  //   refetchOnWindowFocus: false, // Disable refetch on window focus
  //   retry: 1, // Only retry once
  // });
  // const avatars: any[] = []; // Temporary empty array

  // Fetch preset avatars and categories for avatar selector
  const { data: presetAvatars = [], isLoading: isLoadingPresets } = useQuery<any[]>({
    queryKey: ['/api/avatars/presets', '', currentPlan?.id || 'free'],
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  const { data: categories = [], isLoading: isLoadingCategories } = useQuery<any[]>({
    queryKey: ['/api/avatars/categories'],
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  // Streaming state
  const [isStreaming, setIsStreaming] = useState(false);
  const [isLive, setIsLive] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');
  const [viewers, setViewers] = useState(0);

  // Video/Audio controls
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [micEnabled, setMicEnabled] = useState(true);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);

  // Background settings
  const [backgroundType, setBackgroundType] = useState<'virtual' | 'color' | 'blur'>('virtual');
  const [selectedVirtualBg, setSelectedVirtualBg] = useState('');
  const [solidColor, setSolidColor] = useState('#F4D03F');
  const [blurAmount, setBlurAmount] = useState<number[]>([20]);
  const [avatarOpacity, setAvatarOpacity] = useState<number[]>([80]);

  // Stream quality and optimization
  const [streamQuality, setStreamQuality] = useState<'720p' | '1080p'>('1080p');
  const [autoOptimizeBitrate, setAutoOptimizeBitrate] = useState(true);
  const [manualBitrate, setManualBitrate] = useState(6000);

  // RTMP Sources management
  const queryClient = useQueryClient();
  const { data: rtmpSources = [] } = useQuery<any[]>({
    queryKey: ['/api/rtmp-sources'],
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false, // Disable refetch on window focus
    retry: 1, // Only retry once
  });

  const [currentSource, setCurrentSource] = useState<any>(null);

  // Scene lighting state
  const [sceneLighting, setSceneLighting] = useState({
    brightness: 75,
    contrast: 50,
    warmth: 60,
    saturation: 80,
    lightAngle: 45,
    lightIntensity: 70
  });

  // RTMP source editing state
  const [editingSource, setEditingSource] = useState<any>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  // Co-streaming functions
  const initializeCoStreamSession = useCallback(async () => {
    if (!coStreamEnabled) return;

    try {
      const response = await fetch('/api/buddy-system/co-stream/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(await getAuthHeaders())
        },
        body: JSON.stringify({
          sessionName: `${user?.username || 'User'}'s Co-Stream`,
          maxParticipants: gridLayout === '2x2' ? 4 : gridLayout === '3x3' ? 9 : 16,
          streamPlatform: 'twitter',
          gridLayout
        })
      });

      if (!response.ok) {
        throw new Error('Failed to create co-stream session');
      }

      const session = await response.json();
      setCoStreamSession(session.session);

      // Add host to participants immediately
      const hostParticipant = {
        id: `host-${user?.id}`,
        user_id: user?.id || '',
        username: user?.user_metadata?.username || user?.email?.split('@')[0] || 'Host',
        role: 'host',
        canvas_position: 0,
        is_active: true
      };
      setParticipants([hostParticipant]);

      // Connect to co-streaming Socket.IO
      connectToCoStreamSocket(session.session.id);

      // Initialize local stream for WebRTC (can be fallback if camera denied)
      const stream = await initializeLocalStream();
      if (!stream) {
        console.error('❌ Failed to initialize local stream');
        return;
      }

      // Get actual camera stream for tracking (separate from WebRTC)
      try {
        const cameraStream = await getCameraStreamForTracking();
        if (cameraStream) {
          setCameraStreamForTracking(cameraStream);
          console.log('✅ Camera stream for tracking obtained');
        } else {
          console.warn('⚠️ No camera stream available for tracking');
        }
      } catch (error) {
        console.error('❌ Failed to get camera stream for tracking:', error);
      }

      toast({
        title: 'Co-Stream Session Created',
        description: 'Ready to invite participants!'
      });

    } catch (error) {
      console.error('Co-stream session creation error:', error);
      toast({
        title: 'Co-Stream Failed',
        description: 'Failed to create co-stream session',
        variant: 'destructive'
      });
    }
  }, [coStreamEnabled, gridLayout, user, toast]);

  // Fetch participants when session is created
  const fetchParticipants = useCallback(async (sessionId: string | number) => {
    try {
      // Add a small delay to ensure backend has processed the host participant
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const response = await fetch(`/api/buddy-system/co-stream/${sessionId}/participants`, {
        headers: {
          ...(await getAuthHeaders())
        }
      });

      if (response.ok) {
        const data = await response.json();
        const backendParticipants = data.participants || [];
        
        // Convert backend participants to the format expected by CoStreamGrid
        const formattedParticipants = backendParticipants.map((participant: any) => ({
          id: participant.id,
          user_id: participant.user_id,
          username: participant.username,
          role: participant.role,
          canvas_position: participant.canvas_position,
          is_active: participant.is_active,
          user: participant.user
        }));
        
        console.log('📊 Formatted participants for CoStreamGrid:', formattedParticipants);
        setParticipants(formattedParticipants);
      } else {
        console.error('Failed to fetch participants:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Failed to fetch participants:', error);
    }
  }, [user]);

  // Fetch participants when session is set
  useEffect(() => {
    if (coStreamSession?.id) {
      fetchParticipants(coStreamSession.id);
    }
  }, [coStreamSession?.id, fetchParticipants]);

  // Update participant settings when current user's settings change
  const updateCurrentUserSettings = useCallback(() => {
    if (user?.id) {
      const currentSettings = {
        backgroundType,
        selectedVirtualBg,
        solidColor,
        avatarEnabled,
        selectedAvatar,
        avatarOpacity,
        sceneLighting
      };
      
      setParticipantSettings(prev => {
        const newSettings = new Map(prev);
        newSettings.set(user.id, currentSettings);
        return newSettings;
      });
      
      // Broadcast settings to other participants if in co-stream
      if (coStreamSession && coStreamSocketRef.current) {
        coStreamSocketRef.current.emit('participant_settings_update', {
          sessionId: coStreamSession.id,
          settings: currentSettings
        });
      }
    }
  }, [user?.id, backgroundType, selectedVirtualBg, solidColor, avatarEnabled, selectedAvatar, avatarOpacity, sceneLighting, coStreamSession]);

  // Update settings when they change
  useEffect(() => {
    if (coStreamEnabled && coStreamSession) {
      console.log('🎨 Settings changed, updating...');
      updateCurrentUserSettings();
    }
  }, [updateCurrentUserSettings, coStreamEnabled, coStreamSession]);

  // Debug remote streams
  useEffect(() => {
    console.log('🔍 Debug remote streams:', {
      remoteStreamsSize: remoteStreams.size,
      remoteStreamsKeys: Array.from(remoteStreams.keys()),
      participants: participants.map(p => ({ id: p.user_id, name: p.username }))
    });
  }, [remoteStreams, participants]);

  // Debug local stream
  useEffect(() => {
    console.log('🎥 Debug local stream:', {
      hasLocalStream: !!localStream,
      localStreamActive: localStream?.active,
      localStreamTracks: localStream?.getTracks().length,
      localStreamId: localStream?.id
    });
  }, [localStream]);

  // Debug participant settings
  useEffect(() => {
    console.log('🎨 Debug participant settings:', {
      settingsSize: participantSettings.size,
      settingsKeys: Array.from(participantSettings.keys()),
      participants: participants.map(p => ({ 
        id: p.user_id, 
        name: p.username, 
        hasSettings: participantSettings.has(p.user_id),
        settings: participantSettings.get(p.user_id)
      }))
    });
  }, [participantSettings, participants]);

  // Get camera stream for tracking (separate from WebRTC stream)
  const getCameraStreamForTracking = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720 },
        audio: false // Only video for tracking
      });
      console.log('📹 Camera stream for tracking obtained');
      return stream;
    } catch (error) {
      console.error('Failed to get camera stream for tracking:', error);
      return null;
    }
  }, []);

  const handleCoStreamMessage = async (message: any) => {
    switch (message.type) {
      case 'participant-joined':
        // Don't add if it's the host (already added)
        if (message.userId !== user?.id) {
          const newParticipant = {
            user_id: message.userId,
            username: message.username,
            role: message.isHost ? 'host' : 'participant',
            canvas_position: 0, // Will be assigned by the grid
            is_active: true
          };
          
          setParticipants(prev => [...prev, newParticipant]);
          
          // Initialize local stream if not already done
          if (!localStream) {
            const stream = await initializeLocalStream();
            if (stream) {
              // Establish WebRTC connection with new participant
              initiateConnection(message.userId);
            }
          } else {
            // Establish WebRTC connection with new participant
            initiateConnection(message.userId);
          }
          
          toast({
            title: 'Participant Joined',
            description: `${message.username} joined the co-stream!`
          });
        }
        break;
      
      case 'session-joined':
        // When joining an existing session, establish connections with all existing participants
        if (message.participants && Array.isArray(message.participants)) {
          console.log(`🔗 Establishing WebRTC connections with ${message.participants.length} existing participants`);
          
          // Add existing participants to the list
          const existingParticipants = message.participants.map((participant: any) => ({
            user_id: participant.user_id,
            username: participant.username,
            role: participant.isHost ? 'host' : 'participant',
            canvas_position: 0, // Will be assigned by the grid
            is_active: true
          }));
          
          setParticipants(existingParticipants);
          
          // Initialize local stream if not already done
          if (!localStream) {
            const stream = await initializeLocalStream();
            if (stream) {
              // Establish connections with all existing participants
              message.participants.forEach((participant: any) => {
                if (participant.user_id !== user?.id) {
                  initiateConnection(participant.user_id);
                }
              });
            }
          } else {
            // Establish connections with all existing participants
            message.participants.forEach((participant: any) => {
              if (participant.user_id !== user?.id) {
                initiateConnection(participant.user_id);
              }
            });
          }
          
          // Broadcast current settings to all participants
          setTimeout(() => {
            updateCurrentUserSettings();
          }, 1000); // Small delay to ensure connections are established
          
          // Request settings from other participants
          setTimeout(() => {
            message.participants.forEach((participant: any) => {
              if (participant.user_id !== user?.id) {
                coStreamSocketRef.current?.emit('request-settings', {
                  targetUserId: participant.user_id
                });
              }
            });
          }, 1500); // Slightly longer delay to ensure settings broadcast is complete
        }
        break;
      
      case 'participant-left':
        // Don't remove the host
        if (message.userId !== user?.id) {
          setParticipants(prev => prev.filter(p => p.user_id !== message.userId));
          toast({
            title: 'Participant Left',
            description: `A participant left the co-stream.`
          });
        }
        break;
      
      case 'canvas_update':
        // Handle canvas updates from other participants
        break;
      
      case 'layout_change':
        setGridLayout(message.data.layout);
        break;
      
      case 'participant_settings_update':
        // Handle settings updates from other participants
        if (message.userId && message.settings) {
          console.log(`📋 Received settings from ${message.userId}:`, message.settings);
          setParticipantSettings(prev => {
            const newSettings = new Map(prev);
            newSettings.set(message.userId, message.settings);
            return newSettings;
          });
        }
        break;
        
      case 'request-settings':
        // Handle settings request from other participants
        if (message.fromUserId) {
          console.log(`📋 Settings requested by ${message.fromUserId}`);
          // Send current settings to the requesting user
          updateCurrentUserSettings();
        }
        break;
    }
  };

  const inviteUserToCoStream = async (userId: string) => {
    if (!coStreamSession) return;

    try {
      const response = await fetch(`/api/buddy-system/co-stream/${coStreamSession.id}/invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(await getAuthHeaders())
        },
        body: JSON.stringify({
          inviteeId: userId,
          message: 'Join my co-stream!'
        })
      });

      if (!response.ok) {
        throw new Error('Failed to send invitation');
      }

      toast({
        title: 'Invitation Sent',
        description: 'Co-stream invitation sent successfully!'
      });

    } catch (error) {
      console.error('Invitation error:', error);
      toast({
        title: 'Invitation Failed',
        description: 'Failed to send co-stream invitation',
        variant: 'destructive'
      });
    }
  };

  // Initialize co-stream session when enabled
  useEffect(() => {
    if (coStreamEnabled && !coStreamSession) {
      initializeCoStreamSession();
    }
  }, [coStreamEnabled, coStreamSession, initializeCoStreamSession]);

  // Cleanup co-stream session when disabled
  useEffect(() => {
    if (!coStreamEnabled && coStreamSession) {
      setCoStreamSession(null);
      setParticipants([]);
      if (coStreamSocketRef.current) {
        coStreamSocketRef.current.disconnect();
        coStreamSocketRef.current = null;
      }
    }
  }, [coStreamEnabled, coStreamSession]);

  // Listen for co-stream join events from invitation acceptance
  useEffect(() => {
    const handleCoStreamJoined = (event: CustomEvent) => {
      const { session, participant } = event.detail;
      console.log('🎯 Co-stream joined via invitation:', { session, participant });
      
      // Enable co-stream mode
      setCoStreamEnabled(true);
      
      // Set the session data
      setCoStreamSession(session);
      
      // Add current user as participant
      setParticipants(prev => [
        ...prev,
        {
          id: participant.id,
          user_id: user?.id || '',
          username: user?.user_metadata?.username || user?.email?.split('@')[0] || 'User',
          role: participant.role,
          canvas_position: participant.canvas_position,
          is_active: true
        }
      ]);

      // Connect to co-streaming Socket.IO
      connectToCoStreamSocket(session.id);

      toast({
        title: 'Co-Stream Mode Enabled',
        description: `You're now in "${session.session_name}" at position ${participant.canvas_position}`,
      });
    };

    window.addEventListener('coStreamJoined', handleCoStreamJoined as EventListener);
    
    return () => {
      window.removeEventListener('coStreamJoined', handleCoStreamJoined as EventListener);
    };
  }, [user, toast]);

  // Connect to co-streaming Socket.IO
  const connectToCoStreamSocket = useCallback((sessionId: string) => {
    if (coStreamSocketRef.current) {
      coStreamSocketRef.current.disconnect();
    }

    try {
      // Get auth token for Socket.IO authentication
      const getAuthToken = async () => {
        const session = await import('@/lib/supabase').then(m => m.supabase.auth.getSession());
        return session.data.session?.access_token;
      };

      getAuthToken().then(token => {
        if (!token) {
          console.error('No auth token available for Socket.IO connection');
          return;
        }

        coStreamSocketRef.current = io(window.location.origin, {
          auth: { token }
        });
        
        coStreamSocketRef.current.on('connect', () => {
          console.log('🎯 Co-stream Socket.IO connected');
          
          // Join the session room
          coStreamSocketRef.current?.emit('join-session', {
            sessionId: sessionId,
            userId: user?.id,
            username: user?.user_metadata?.username || user?.email?.split('@')[0] || 'User',
            isHost: coStreamSession?.host_id === user?.id
          });
        });

        coStreamSocketRef.current.on('participant-joined', (data) => {
          handleCoStreamMessage({ type: 'participant-joined', ...data });
        });

        coStreamSocketRef.current.on('participant-left', (data) => {
          handleCoStreamMessage({ type: 'participant-left', ...data });
        });

        // WebRTC signaling handlers
        coStreamSocketRef.current.on('offer', (data) => {
          handleCoStreamMessage({ type: 'offer', ...data });
        });

        coStreamSocketRef.current.on('answer', (data) => {
          handleCoStreamMessage({ type: 'answer', ...data });
        });

        coStreamSocketRef.current.on('ice-candidate', (data) => {
          handleCoStreamMessage({ type: 'ice-candidate', ...data });
        });

        coStreamSocketRef.current.on('session-joined', (data) => {
          handleCoStreamMessage({ type: 'session-joined', ...data });
        });

        coStreamSocketRef.current.on('participant_settings_update', (data) => {
          handleCoStreamMessage({ type: 'participant_settings_update', ...data });
        });

        coStreamSocketRef.current.on('participant-frame', (data) => {
          handleCoStreamMessage({ type: 'participant-frame', ...data });
        });

        // WebRTC signaling events
        coStreamSocketRef.current.on('offer', (data) => {
          handleWebRTCMessage({ type: 'offer', ...data });
        });

        coStreamSocketRef.current.on('answer', (data) => {
          handleWebRTCMessage({ type: 'answer', ...data });
        });

        coStreamSocketRef.current.on('ice-candidate', (data) => {
          handleWebRTCMessage({ type: 'ice-candidate', ...data });
        });

        coStreamSocketRef.current.on('disconnect', () => {
          console.log('Co-stream Socket.IO disconnected');
        });

        coStreamSocketRef.current.on('connect_error', (error) => {
          console.error('Co-stream Socket.IO error:', error);
        });

      });

    } catch (error) {
      console.error('Failed to connect to co-stream Socket.IO:', error);
    }
  }, [user, coStreamSession]);

  // WebRTC functions for live video streaming
  const initializeLocalStream = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720 },
        audio: true
      });
      setLocalStream(stream);
      console.log('✅ Camera stream obtained successfully');
      return stream;
    } catch (error) {
      console.error('Failed to get local stream:', error);
      
      // Create a fallback stream with a black video track for WebRTC connection
      console.log('🎬 Creating fallback stream for WebRTC connection');
      try {
        // Create a canvas with black background
        const canvas = document.createElement('canvas');
        canvas.width = 1280;
        canvas.height = 720;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = 'black';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          
          // Create a MediaStream from the canvas
          const fallbackStream = canvas.captureStream(30); // 30 FPS
          
          // Add a silent audio track if needed
          const audioContext = new AudioContext();
          const oscillator = audioContext.createOscillator();
          const destination = audioContext.createMediaStreamDestination();
          oscillator.connect(destination);
          oscillator.frequency.setValueAtTime(0, audioContext.currentTime); // Silent
          oscillator.start();
          
          // Combine video and audio tracks
          const combinedStream = new MediaStream([
            ...fallbackStream.getVideoTracks(),
            ...destination.stream.getAudioTracks()
          ]);
          
          setLocalStream(combinedStream);
          console.log('✅ Fallback stream created successfully');
          return combinedStream;
        }
      } catch (fallbackError) {
        console.error('Failed to create fallback stream:', fallbackError);
      }
      
      toast({
        title: 'Camera Access Required',
        description: 'Please allow camera access to join the co-stream',
        variant: 'destructive'
      });
      return null;
    }
  }, [toast]);



  const handleWebRTCMessage = useCallback((message: any) => {
    switch (message.type) {
      case 'offer':
        handleOffer(message);
        break;
      case 'answer':
        handleAnswer(message);
        break;
      case 'ice-candidate':
        handleIceCandidate(message);
        break;
    }
  }, []);

  const handleOffer = async (message: any) => {
    const { offer, fromUserId } = message;
    console.log(`📥 Received WebRTC offer from ${fromUserId}`);
    
    // Ensure we have a local stream before creating the connection
    let streamToUse = localStream;
    if (!streamToUse) {
      console.log(`📹 No local stream available for offer, initializing...`);
      streamToUse = await initializeLocalStream();
      if (!streamToUse) {
        console.error(`❌ Failed to initialize local stream for offer from ${fromUserId}`);
        return;
      }
    }
    
    // Create peer connection with the stream we have
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        { urls: 'stun:stun3.l.google.com:19302' },
        { urls: 'stun:stun4.l.google.com:19302' }
      ]
    });

    // Add local stream tracks to peer connection
    if (streamToUse) {
      console.log(`📹 Adding ${streamToUse.getTracks().length} tracks to peer connection for ${fromUserId}`);
      streamToUse.getTracks().forEach(track => {
        pc.addTrack(track, streamToUse);
      });
    } else {
      console.warn(`⚠️ No local stream available for peer connection with ${fromUserId}`);
    }

    // Handle incoming remote streams
    pc.ontrack = (event) => {
      console.log(`🎥 Received remote stream from ${fromUserId} with ${event.streams.length} streams`);
      console.log(`🎥 Stream details:`, {
        id: event.streams[0]?.id,
        tracks: event.streams[0]?.getTracks().map(t => ({ kind: t.kind, enabled: t.enabled })),
        active: event.streams[0]?.active
      });
      
      // Ensure the stream is active before setting it
      if (event.streams[0] && event.streams[0].active) {
        setRemoteStreams(prev => {
          const newMap = new Map(prev);
          newMap.set(fromUserId, event.streams[0]);
          console.log(`✅ Remote stream set for ${fromUserId}, total streams: ${newMap.size}`);
          return newMap;
        });
      } else {
        console.warn(`⚠️ Received inactive stream from ${fromUserId}`);
      }
    };

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        console.log(`🧊 ICE candidate from ${fromUserId}:`, {
          type: event.candidate.type,
          protocol: event.candidate.protocol,
          address: event.candidate.address,
          port: event.candidate.port
        });
        coStreamSocketRef.current?.emit('ice-candidate', {
          candidate: event.candidate,
          targetUserId: fromUserId
        });
      } else {
        console.log(`✅ ICE gathering complete for ${fromUserId}`);
      }
    };

    // Handle connection state changes
    pc.onconnectionstatechange = () => {
      console.log(`🔗 Connection state with ${fromUserId}: ${pc.connectionState}`);
      if (pc.connectionState === 'connected') {
        console.log(`✅ WebRTC connection established with ${fromUserId}`);
      } else if (pc.connectionState === 'failed') {
        console.error(`❌ WebRTC connection failed with ${fromUserId}`);
      } else if (pc.connectionState === 'disconnected') {
        console.warn(`⚠️ WebRTC connection disconnected with ${fromUserId}`);
      }
    };

    setPeerConnections(prev => new Map(prev.set(fromUserId, pc)));
    
    await pc.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    
    console.log(`📤 Sending WebRTC answer to ${fromUserId}`);
    coStreamSocketRef.current?.emit('answer', {
      answer,
      targetUserId: fromUserId
    });
  };

  const handleAnswer = async (message: any) => {
    const { answer, fromUserId } = message;
    console.log(`📥 Received WebRTC answer from ${fromUserId}`);
    const pc = peerConnections.get(fromUserId);
    if (pc) {
      await pc.setRemoteDescription(new RTCSessionDescription(answer));
      console.log(`✅ WebRTC connection established with ${fromUserId}`);
    } else {
      console.warn(`⚠️ No peer connection found for ${fromUserId}`);
    }
  };

  const handleIceCandidate = async (message: any) => {
    const { candidate, fromUserId } = message;
    console.log(`🧊 Received ICE candidate from ${fromUserId}:`, {
      type: candidate.type,
      protocol: candidate.protocol,
      address: candidate.address,
      port: candidate.port
    });
    const pc = peerConnections.get(fromUserId);
    if (pc) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
        console.log(`✅ ICE candidate added for ${fromUserId}`);
      } catch (error) {
        console.error(`❌ Failed to add ICE candidate for ${fromUserId}:`, error);
      }
    } else {
      console.warn(`⚠️ No peer connection found for ICE candidate from ${fromUserId}`);
    }
  };

  const initiateConnection = useCallback(async (userId: string) => {
    console.log(`🚀 Initiating WebRTC connection with ${userId}`);
    
    // Ensure we have a local stream before creating the connection
    let streamToUse = localStream;
    if (!streamToUse) {
      console.log(`📹 No local stream available, initializing...`);
      streamToUse = await initializeLocalStream();
      if (!streamToUse) {
        console.error(`❌ Failed to initialize local stream for ${userId}`);
        return;
      }
    }
    
    // Create peer connection with the stream we have
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        { urls: 'stun:stun3.l.google.com:19302' },
        { urls: 'stun:stun4.l.google.com:19302' }
      ]
    });

    // Add local stream tracks to peer connection
    if (streamToUse) {
      console.log(`📹 Adding ${streamToUse.getTracks().length} tracks to peer connection for ${userId}`);
      streamToUse.getTracks().forEach(track => {
        pc.addTrack(track, streamToUse);
      });
    } else {
      console.warn(`⚠️ No local stream available for peer connection with ${userId}`);
    }

    // Handle incoming remote streams
    pc.ontrack = (event) => {
      console.log(`🎥 Received remote stream from ${userId} with ${event.streams.length} streams`);
      console.log(`🎥 Stream details:`, {
        id: event.streams[0]?.id,
        tracks: event.streams[0]?.getTracks().map(t => ({ kind: t.kind, enabled: t.enabled })),
        active: event.streams[0]?.active
      });
      
      // Ensure the stream is active before setting it
      if (event.streams[0] && event.streams[0].active) {
        setRemoteStreams(prev => {
          const newMap = new Map(prev);
          newMap.set(userId, event.streams[0]);
          console.log(`✅ Remote stream set for ${userId}, total streams: ${newMap.size}`);
          return newMap;
        });
      } else {
        console.warn(`⚠️ Received inactive stream from ${userId}`);
      }
    };

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        console.log(`🧊 ICE candidate from ${userId}:`, {
          type: event.candidate.type,
          protocol: event.candidate.protocol,
          address: event.candidate.address,
          port: event.candidate.port
        });
        coStreamSocketRef.current?.emit('ice-candidate', {
          candidate: event.candidate,
          targetUserId: userId
        });
      } else {
        console.log(`✅ ICE gathering complete for ${userId}`);
      }
    };

    // Handle connection state changes
    pc.onconnectionstatechange = () => {
      console.log(`🔗 Connection state with ${userId}: ${pc.connectionState}`);
      if (pc.connectionState === 'connected') {
        console.log(`✅ WebRTC connection established with ${userId}`);
      } else if (pc.connectionState === 'failed') {
        console.error(`❌ WebRTC connection failed with ${userId}`);
      } else if (pc.connectionState === 'disconnected') {
        console.warn(`⚠️ WebRTC connection disconnected with ${userId}`);
      }
    };

    setPeerConnections(prev => new Map(prev.set(userId, pc)));
    
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    
    console.log(`📤 Sending WebRTC offer to ${userId}`);
    coStreamSocketRef.current?.emit('offer', {
      offer,
      targetUserId: userId
    });
  }, [localStream, initializeLocalStream]);

  // Calculate optimal bitrate based on subscription tier and quality
  const getOptimalBitrate = useCallback((sourceName: string, quality: '720p' | '1080p' = streamQuality) => {
    const userPlan = user?.supabaseUser?.user_metadata?.plan || 'free';
    
    // Bitrate limits by subscription tier
    const tierLimits = {
      'free': { '720p': 2500, '1080p': 4000 },
      'starter': { '720p': 3500, '1080p': 5500 },
      'goat': { '720p': 6000, '1080p': 9000 }
    };

    // Return tier limit based on user plan
    const limit = tierLimits[userPlan as keyof typeof tierLimits] || tierLimits.free;
    return limit[quality];
  }, [user, streamQuality]);

  // Daily random background selection based on user's subscription tier
  const getDailyRandomBackground = useCallback(() => {
    if (!Array.isArray(backgrounds) || backgrounds.length === 0 || !user?.id) return null;

    // Create a daily seed based on user ID and current date
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    const seed = `${user.id}-${today}`;
    
    // Simple hash function for consistent daily randomization
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      const char = seed.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }

    // Define plan hierarchy for background access - each tier includes all lower tiers
    const planHierarchy = ['free', 'starter', 'goat'];
    // Use user metadata plan directly since that's where the actual plan is stored
    const userPlanString = user?.supabaseUser?.user_metadata?.plan || user?.plan || 'free';
    const userPlanIndex = planHierarchy.indexOf(userPlanString);
    
    // Include current plan and all lower-tier plans
    const accessiblePlans = planHierarchy.slice(0, userPlanIndex + 1);
    
    console.log(`🔍 Plan access debug: user plan="${userPlanString}", accessible plans=[${accessiblePlans.join(', ')}]`);

    // Filter backgrounds by user's subscription tier access
    // Users can access their tier + all lower tiers (free is included in all)
    const accessibleBackgrounds = (backgrounds as any[]).filter((bg: any) => {
      const requiredPlan = bg.required_plan || 'free';
      return accessiblePlans.includes(requiredPlan);
    });
    
    console.log(`🎯 Found ${accessibleBackgrounds.length} accessible backgrounds out of ${backgrounds.length} total`);

    if (accessibleBackgrounds.length === 0) return null;

    // Use hash to select background consistently for the day
    const index = Math.abs(hash) % accessibleBackgrounds.length;
    return accessibleBackgrounds[index];
  }, [backgrounds, user?.id, currentPlan]);

  // Select first source by default
  useEffect(() => {
    if (rtmpSources.length > 0 && !currentSource) {
      setCurrentSource(rtmpSources[0]);
    }
  }, [rtmpSources, currentSource]);

  const createSourceMutation = useMutation({
    mutationFn: async (sourceData: any) => {
      return await apiRequest("POST", "/api/rtmp-sources", sourceData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rtmp-sources"] });
      toast({
        title: "RTMP Source Added",
        description: "New streaming destination has been configured.",
      });
    },
  });

  const updateSourceMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      return await apiRequest("PUT", `/api/rtmp-sources/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rtmp-sources"] });
      toast({
        title: "RTMP Source Updated",
        description: "Streaming destination has been updated.",
      });
    },
  });

  const deleteSourceMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest("DELETE", `/api/rtmp-sources/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rtmp-sources"] });
      toast({
        title: "RTMP Source Deleted",
        description: "Streaming destination has been removed.",
      });
    },
  });

  // Load high-resolution cached images from IPFS system (only once)
  useEffect(() => {
    const loadCachedImages = async () => {
      if (!backgrounds.length || backgroundImagesLoaded) return;

      const imagePromises = backgrounds.map((bg: any) => {
        return new Promise<void>(async (resolve) => {
          try {
            // Skip if already loaded
            if (backgroundImages[bg.id.toString()]) {
              resolve();
              return;
            }
            
            // Get high-res cached version
            const response = await fetch(`/api/backgrounds/${bg.id}/highres`);
            const { url: highResUrl } = await response.json();
            
            const img = document.createElement('img');
            img.crossOrigin = 'anonymous';
            img.onload = () => {
              setBackgroundImages(prev => ({
                ...prev,
                [bg.id.toString()]: img
              }));
              console.log(`✅ Loaded cached ${bg.name}: ${img.naturalWidth}x${img.naturalHeight}`);
              resolve();
            };
            img.onerror = () => {
              console.error(`❌ Failed to load cached ${bg.name}`);
              resolve();
            };
            img.src = highResUrl;
          } catch (error) {
            console.error(`❌ Failed to fetch high-res for ${bg.name}:`, error);
            resolve();
          }
        });
      });
      
      await Promise.all(imagePromises);
      setBackgroundImagesLoaded(true);
      console.log('🎨 All IPFS cached images ready for streaming');
    };
    
    loadCachedImages();
  }, [backgrounds, backgroundImagesLoaded]);

  // Initialize camera (optional for streaming)
  const initializeCamera = useCallback(async () => {
    if (!cameraEnabled) {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
        setCameraStream(null);
      }
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: 1280, height: 720 }, 
        audio: false 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setCameraStream(stream);
        await videoRef.current.play();
      }
      
      toast({
        title: "Camera Connected",
        description: "Camera successfully initialized for streaming.",
      });
    } catch (error) {
      console.log("Camera not available - streaming will work with virtual backgrounds only");
      // Don't show error toast, just silently disable camera
      setCameraEnabled(false);
      setCameraStream(null);
    }
  }, [cameraEnabled, toast]);

  // Initialize camera on mount (non-blocking)
  useEffect(() => {
    if (cameraEnabled) {
      initializeCamera();
    }
  }, [initializeCamera]);

  // Stream controls
  const handleStartStream = useCallback(async () => {
    if (!currentSource) {
      toast({
        title: "No RTMP Source Selected",
        description: "Please select an RTMP source first",
        variant: "destructive"
      });
      return;
    }

    setIsStreaming(true);
    setIsLive(true);
    setConnectionStatus('connecting');

    // Create WebSocket connection for RTMP streaming
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/rtmp-relay`;
    
    try {
      wsRef.current = new WebSocket(wsUrl);
      
      wsRef.current.onopen = () => {
        console.log('WebSocket connected for RTMP streaming');
        setConnectionStatus('connecting');
        
        // Start RTMP stream
        streamIdRef.current = `stream_${Date.now()}`;
        
        // Calculate bitrate based on auto-optimize setting
        const bitrate = autoOptimizeBitrate 
          ? getOptimalBitrate(currentSource.name, streamQuality)
          : parseInt(currentSource.bitrate) || getOptimalBitrate(currentSource.name, streamQuality);
          
        wsRef.current?.send(JSON.stringify({
          type: 'start-webrtc-stream',
          streamId: streamIdRef.current,
          rtmpUrl: currentSource.url || currentSource.rtmp_url,
          streamKey: currentSource.stream_key,
          quality: streamQuality,
          bitrate: bitrate,
          userPlan: user?.supabaseUser?.user_metadata?.plan || user?.plan || 'free',
          coStreamEnabled: coStreamEnabled,
          sessionId: coStreamSession?.id
        }));
        
        console.log(`🚀 Starting stream to ${currentSource.name} with quality: ${streamQuality}, bitrate: ${bitrate}k (${autoOptimizeBitrate ? 'auto-optimized' : 'manual'}) ${coStreamEnabled ? 'with co-streaming' : ''}`);
      };

      wsRef.current.onmessage = (event) => {
        const data = JSON.parse(event.data);
        console.log('WebSocket message:', data);
        
        switch (data.type) {
          case 'webrtc-stream-ready':
            setConnectionStatus('connected');
            setIsLive(true);
            toast({
              title: "Stream Live",
              description: `Successfully streaming to ${currentSource.name}`,
            });
            break;
            
          case 'webrtc-stream-error':
            console.error('Stream error details:', data);
            setConnectionStatus('error');
            setIsStreaming(false);
            setIsLive(false);
            toast({
              title: "Stream Failed",
              description: data.error || data.details || "Failed to connect to RTMP server",
              variant: "destructive"
            });
            break;
            
          case 'webrtc-stream-ended':
            setConnectionStatus('error');
            toast({
              title: "Stream Error",
              description: data.error || "Streaming error occurred",
              variant: "destructive"
            });
            break;
            
          case 'stream-status':
            if (data.status === 'live') {
              setIsLive(true);
              setViewers(Math.floor(Math.random() * 50) + 10);
            }
            break;
        }
      };

      wsRef.current.onerror = () => {
        setConnectionStatus('error');
        toast({
          title: "Connection Failed",
          description: "Failed to connect to streaming server",
          variant: "destructive"
        });
      };

      // Start frame capture at 30 FPS for smooth streaming
      frameIntervalRef.current = setInterval(() => {
        if (canvasRef.current && wsRef.current?.readyState === WebSocket.OPEN) {
          // Capture high-quality frame with optimized compression
          const dataURL = canvasRef.current.toDataURL('image/png', 0.95);
          wsRef.current.send(JSON.stringify({
            type: 'canvas-frame',
            streamId: streamIdRef.current,
            frameData: dataURL
          }));
        }
      }, 33); // 30 FPS (1000ms / 30 = 33ms)

      toast({
        title: "Stream Started",
        description: `Streaming to ${currentSource.name}`,
      });
    } catch (error) {
      setConnectionStatus('error');
      toast({
        title: "Stream Failed",
        description: "Failed to start streaming",
        variant: "destructive"
      });
    }
  }, [currentSource, streamQuality, toast, coStreamEnabled, coStreamSession]);

  const handleStopStream = useCallback(() => {
    setIsStreaming(false);
    setIsLive(false);
    setConnectionStatus('disconnected');
    setViewers(0);
    
    // Stop frame capture
    if (frameIntervalRef.current) {
      clearInterval(frameIntervalRef.current);
      frameIntervalRef.current = null;
    }
    
    // Send stop stream command
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'stop-rtmp-stream',
        streamId: streamIdRef.current
      }));
    }
    
    // Close WebSocket connection
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    
    toast({
      title: "Stream Ended",
      description: "Your stream has been stopped.",
    });
  }, [toast]);

  // Refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const streamIdRef = useRef<string>('');
  const frameIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Co-streaming WebSocket refs
  const coStreamFrameIntervalRef = useRef<NodeJS.Timeout | null>(null);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-6 max-w-7xl">
        <div className="flex flex-col lg:grid lg:grid-cols-3 gap-4 lg:gap-6">
          {/* Main Streaming Panel */}
          <div className="lg:col-span-2 space-y-4 lg:space-y-6">
            {/* Stream Preview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Monitor className="w-5 h-5" />
                  Stream Preview
                  {isLive && (
                    <Badge variant="destructive" className="animate-pulse">
                      <Radio className="w-3 h-3 mr-1" />
                      LIVE
                    </Badge>
                  )}
                  {coStreamEnabled && (
                    <Badge variant="secondary" className="flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      Co-Stream ({participants.length + 1})
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="relative bg-black rounded-lg overflow-hidden" style={{ aspectRatio: '16/9' }}>
                  {/* Dynamic Canvas - Single or Multi-User */}
                  {coStreamEnabled && coStreamSession ? (
                    <CoStreamGrid 
                      session={coStreamSession}
                      participants={participants}
                      currentUserId={user?.id || ''}
                      localStream={localStream}
                      remoteStreams={remoteStreams}
                      cameraStreamForTracking={cameraStreamForTracking}
                      // Participant-specific settings
                      participantSettings={participantSettings}
                      // Shared resources
                      sharedBackgroundImages={backgroundImages}
                      backgroundsLoaded={backgroundImagesLoaded}
                      isStreaming={isStreaming}
                    />
                  ) : (
                    <ParticipantTile
                      // Participant identification
                      participantId={user?.id}
                      participantName={user?.email}
                      isHost={true}
                      isLocal={true}
                      
                      // Visual configuration
                      width={1920}
                      height={1080}
                      backgroundType={backgroundType}
                      selectedVirtualBg={selectedVirtualBg}
                      solidColor={solidColor}
                      cameraEnabled={cameraEnabled}
                      cameraStream={cameraStream}
                      avatarEnabled={avatarEnabled}
                      selectedAvatar={selectedAvatar}
                      avatarOpacity={avatarOpacity}
                      sceneLighting={sceneLighting}
                      
                      // Shared resources
                      sharedBackgroundImages={backgroundImages}
                      backgroundsLoaded={backgroundImagesLoaded}
                      
                      // Streaming configuration
                      isStreaming={isStreaming}
                      onFrameCapture={(canvas: HTMLCanvasElement) => {
                        if (isStreaming && wsRef.current?.readyState === WebSocket.OPEN) {
                          // Get canvas context to verify content quality
                          const ctx = canvas.getContext('2d');
                          const imageData = ctx?.getImageData(0, 0, canvas.width, canvas.height);
                          const hasContent = imageData && Array.from(imageData.data).some((pixel: number) => pixel !== 0);
                          
                          // Only send frames with actual content to prevent flickering
                          if (!hasContent) {
                            console.log('🚫 Skipping empty frame to prevent flickering');
                            return;
                          }
                          
                          // Check if background is properly rendered for virtual backgrounds
                          if (backgroundType === 'virtual' && selectedVirtualBg) {
                            if (!backgroundImagesLoaded || !backgroundImages[selectedVirtualBg]) {
                              console.log('🚫 Skipping frame - background not loaded');
                              return;
                            }
                          }
                          
                          const dataURL = canvas.toDataURL('image/png');
                          
                          // Debug streaming content every few frames
                          if (Math.random() < 0.02) {
                            const centerPixel = ctx?.getImageData(canvas.width/2, canvas.height/2, 1, 1);
                            const pixelData = centerPixel?.data || new Uint8ClampedArray([0, 0, 0, 0]);
                            const r = pixelData[0] || 0;
                            const g = pixelData[1] || 0;
                            const b = pixelData[2] || 0;
                            console.log(`📺 RTMP Send: bg=${backgroundType}, selected=${selectedVirtualBg}, hasContent=${hasContent}, centerRGB(${r},${g},${b}), bgLoaded=${backgroundImagesLoaded}`);
                          }
                          
                          wsRef.current.send(JSON.stringify({
                            type: 'canvas-frame',
                            streamId: streamIdRef.current,
                            frameData: dataURL
                          }));
                        }
                      }}
                      
                      // Optional participant-specific UI
                      showParticipantInfo={false} // Hide for single-user mode
                      showMuteIndicator={false} // Hide for single-user mode
                    />
                  )}

                  {/* Hidden canvas for reference */}
                  <canvas
                    ref={canvasRef}
                    className="hidden"
                    width={1920}
                    height={1080}
                  />

                  {/* Camera Video Element */}
                  <video
                    ref={videoRef}
                    className="hidden"
                    autoPlay
                    muted
                    playsInline
                  />

                  {/* Stream status overlay */}
                  {isStreaming && (
                    <div className="absolute top-4 left-4 flex items-center gap-2 bg-red-500/90 backdrop-blur-sm text-white px-3 py-2 rounded-full text-sm font-semibold shadow-lg animate-pulse">
                      <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                      LIVE
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Stream Controls */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="w-5 h-5" />
                  Stream Controls
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Co-Stream Toggle */}
                <div className="flex items-center justify-between p-3 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 border border-purple-200 dark:border-purple-800 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Users className="w-5 h-5 text-purple-600" />
                    <div>
                      <h4 className="font-medium text-purple-900 dark:text-purple-100">Co-Stream Mode</h4>
                      <p className="text-sm text-purple-700 dark:text-purple-300">
                        Enable multi-user streaming with dynamic grid
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={coStreamEnabled}
                    onCheckedChange={setCoStreamEnabled}
                  />
                </div>

                {/* Pending Invitations - Always show */}
                <div className="p-3 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                  <PendingInvitations />
                </div>

                {/* Unified Streaming Status */}
                {currentSource && (
                  <div className="mb-4 p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                    <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">Professional Streaming Ready</h4>
                    <p className="text-sm text-blue-700 dark:text-blue-300 mb-3">
                      Unified streaming with optimized bitrate settings
                    </p>
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${
                        connectionStatus === 'connected' ? 'bg-green-500' :
                        connectionStatus === 'connecting' ? 'bg-yellow-500' :
                        connectionStatus === 'error' ? 'bg-red-500' : 'bg-gray-400'
                      }`} />
                      <span className="text-sm font-medium">
                        {connectionStatus === 'connected' ? 'Live' :
                         connectionStatus === 'connecting' ? 'Connecting...' :
                         connectionStatus === 'error' ? 'Error' : 'Ready'}
                      </span>
                    </div>
                  </div>
                )}
                
                <div className="flex gap-2">
                  {!isStreaming ? (
                    <Button 
                      onClick={handleStartStream}
                      disabled={!currentSource}
                      className="flex-1"
                    >
                      <Play className="w-4 h-4 mr-2" />
                      Start Stream
                    </Button>
                  ) : (
                    <Button 
                      onClick={handleStopStream}
                      variant="destructive"
                      className="flex-1"
                    >
                      <Square className="w-4 h-4 mr-2" />
                      Stop Stream
                    </Button>
                  )}
                  
                  <Button
                    variant="outline"
                    onClick={() => setCameraEnabled(!cameraEnabled)}
                  >
                    {cameraEnabled ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
                  </Button>
                  
                  <Button
                    variant="outline"
                    onClick={() => setMicEnabled(!micEnabled)}
                  >
                    {micEnabled ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
                  </Button>

                  {/* Invite Button - Only show when co-stream is enabled */}
                  {coStreamEnabled && (
                    <Button
                      variant="outline"
                      onClick={() => setShowInviteDialog(true)}
                      className="flex items-center gap-1"
                    >
                      <UserPlus className="w-4 h-4" />
                      Invite
                    </Button>
                  )}
                </div>

                <div className="text-sm text-muted-foreground">
                  Status: <span className={`font-medium ${
                    connectionStatus === 'connected' ? 'text-green-600' :
                    connectionStatus === 'connecting' ? 'text-yellow-600' :
                    connectionStatus === 'error' ? 'text-red-600' : 'text-gray-600'
                  }`}>
                    {connectionStatus.charAt(0).toUpperCase() + connectionStatus.slice(1)}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Settings Panel */}
          <div className="space-y-6">
            {/* RTMP Sources */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ExternalLink className="w-5 h-5" />
                  RTMP Destinations
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {rtmpSources.map((source: any) => (
                  <div
                    key={source.id}
                    className={`p-3 border rounded-lg transition-colors ${
                      currentSource?.id === source.id
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-950'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div 
                        className="flex-1 cursor-pointer"
                        onClick={() => setCurrentSource(source)}
                      >
                        <div className="font-medium">{source.name}</div>
                        <div className="text-sm text-muted-foreground truncate">
                          {source.url}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigator.clipboard.writeText(`${source.url}/${source.stream_key}`);
                            setCopied(source.id);
                            setTimeout(() => setCopied(false), 2000);
                            toast({
                              title: "Copied",
                              description: "RTMP URL copied to clipboard",
                            });
                          }}
                        >
                          {copied === source.id ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingSource({
                              id: source.id,
                              name: source.name,
                              rtmp_url: source.url,
                              stream_key: source.stream_key,
                              bitrate: source.bitrate || 2500
                            });
                            setIsEditDialogOpen(true);
                          }}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm(`Delete "${source.name}"?`)) {
                              deleteSourceMutation.mutate(source.id);
                            }
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
                
                {/* Add New RTMP Source */}
                <RTMPSourceManager 
                  onSourceAdded={() => {
                    queryClient.invalidateQueries({ queryKey: ["/api/rtmp-sources"] });
                  }}
                />
              </CardContent>
            </Card>



            {/* Avatar Management */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Avatar Selection
                </CardTitle>
              </CardHeader>
              <CardContent>
                <StreamAvatarSelector
                  selectedAvatarId={selectedAvatar?.id}
                  selectedAvatarType={selectedAvatarType}
                  userPlan={currentPlan?.id || 'free'}
                  onAvatarSelect={(avatar, type) => {
                    setSelectedAvatar(avatar);
                    setSelectedAvatarType(type);
                    toast({
                      title: "Avatar Selected",
                      description: `Selected ${avatar.name} for streaming`,
                    });
                  }}
                  className="max-h-80"
                  // Pass avatars data to avoid duplicate queries
                  userAvatars={avatars as any[]}
                  presetAvatars={presetAvatars}
                  categories={categories}
                  isLoadingUserAvatars={isLoadingAvatars}
                  isLoadingPresets={isLoadingPresets}
                  isLoadingCategories={isLoadingCategories}
                />
              </CardContent>
            </Card>

            {/* Background Management */}
            <BackgroundSettingsPanel 
              onBackgroundSelected={(backgroundId) => {
                // Handle different background types based on ID format
                if (backgroundId.startsWith('color-')) {
                  // Handle solid color selection
                  const solidColorBackgrounds = [
                    { id: 'color-1', name: 'Deep Navy', color: '#1a1a2e' },
                    { id: 'color-2', name: 'Forest Green', color: '#2d5016' },
                    { id: 'color-3', name: 'Royal Purple', color: '#533483' },
                    { id: 'color-4', name: 'BAYC Orange', color: '#ff6b35' },
                    { id: 'color-5', name: 'Golden Yellow', color: '#f7c52d' },
                    { id: 'color-6', name: 'Ape Brown', color: '#8b4513' },
                    { id: 'color-7', name: 'Crimson Red', color: '#c5282f' },
                    { id: 'color-8', name: 'Pure Black', color: '#000000' },
                  ];
                  
                  const selectedColor = solidColorBackgrounds.find(bg => bg.id === backgroundId);
                  if (selectedColor) {
                    setBackgroundType('color');
                    setSolidColor(selectedColor.color);
                    setSelectedVirtualBg(backgroundId);
                    toast({
                      title: "Background Changed",
                      description: `Switched to ${selectedColor.name}`,
                    });
                  }
                } else if (backgroundId.startsWith('blur-')) {
                  // Handle blur background selection
                  setBackgroundType('blur');
                  setSelectedVirtualBg(backgroundId);
                  toast({
                    title: "Background Changed",
                    description: "Switched to blur background",
                  });
                } else {
                  // Handle virtual/image background selection
                  setBackgroundType('virtual');
                  setSelectedVirtualBg(backgroundId);
                  const selectedBg = backgrounds.find((bg: any) => bg.id.toString() === backgroundId);
                  if (selectedBg) {
                    toast({
                      title: "Background Changed",
                      description: `Switched to ${selectedBg.name}`,
                    });
                  }
                }
              }}
              selectedBackgroundId={selectedVirtualBg}
              onSceneLightingChange={setSceneLighting}
              sceneLighting={sceneLighting}
            />

          </div>

          {/* Controls Sidebar */}
          <div className="space-y-4 lg:space-y-6">
            {/* Stream Quality */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  Stream Quality
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Resolution</Label>
                  <Select value={streamQuality} onValueChange={(value: any) => setStreamQuality(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="720p">720p (1280x720)</SelectItem>
                      <SelectItem value="1080p">1080p (1920x1080)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Auto-Optimize Bitrate */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="auto-optimize" className="flex items-center gap-2">
                      <Zap className="w-4 h-4" />
                      Auto-Optimize Bitrate
                    </Label>
                    <Switch
                      id="auto-optimize"
                      checked={autoOptimizeBitrate}
                      onCheckedChange={setAutoOptimizeBitrate}
                    />
                  </div>
                  
                  {autoOptimizeBitrate && currentSource && (
                    <div className="p-3 bg-muted rounded-lg">
                      <div className="text-sm text-muted-foreground mb-1">
                        Optimized Bitrate
                      </div>
                      <div className="font-medium">
                        {getOptimalBitrate(currentSource.name, streamQuality).toLocaleString()} kbps
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Automatically adjusted for quality and plan
                      </div>
                    </div>
                  )}
                  
                  {!autoOptimizeBitrate && (
                    <div className="text-sm text-muted-foreground">
                      Manual bitrate control enabled in RTMP source settings
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Edit RTMP Source Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit RTMP Source</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-name" className="text-right">
                Name
              </Label>
              <Input
                id="edit-name"
                value={editingSource?.name || ''}
                onChange={(e) => setEditingSource((prev: any) => ({ ...prev, name: e.target.value }))}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-url" className="text-right">
                RTMP URL
              </Label>
              <Input
                id="edit-url"
                value={editingSource?.rtmp_url || ''}
                onChange={(e) => setEditingSource((prev: any) => ({ ...prev, rtmp_url: e.target.value }))}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-key" className="text-right">
                Stream Key
              </Label>
              <Input
                id="edit-key"
                type="password"
                value={editingSource?.stream_key || ''}
                onChange={(e) => setEditingSource((prev: any) => ({ ...prev, stream_key: e.target.value }))}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-bitrate" className="text-right">
                Bitrate
              </Label>
              <Input
                id="edit-bitrate"
                type="number"
                value={editingSource?.bitrate || 2500}
                onChange={(e) => setEditingSource((prev: any) => ({ ...prev, bitrate: parseInt(e.target.value) }))}
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => {
                if (editingSource) {
                  updateSourceMutation.mutate({
                    id: editingSource.id,
                    data: {
                      name: editingSource.name,
                      url: editingSource.rtmp_url,
                      streamKey: editingSource.stream_key,
                      bitrate: editingSource.bitrate
                    }
                  });
                  setIsEditDialogOpen(false);
                  setEditingSource(null);
                }
              }}
              disabled={updateSourceMutation.isPending}
            >
              {updateSourceMutation.isPending ? 'Updating...' : 'Update Source'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Invite Dialog */}
      <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5" />
              Invite to Co-Stream
            </DialogTitle>
          </DialogHeader>
          <UserSearch
            onUserSelect={(user) => inviteUserToCoStream(user.id)}
            showBuddyActions={false}
          />
        </DialogContent>
      </Dialog>



      {/* Avatar Debug Info */}
      <div className="fixed top-0 right-0 bg-black/80 text-white text-xs p-2 z-[1001]">
        <div>Avatar Enabled: {avatarEnabled ? 'Yes' : 'No'}</div>
        <div>Selected Avatar: {selectedAvatar?.name || 'None'}</div>
        <div>Avatar Type: {selectedAvatarType}</div>
        <div>Container Should Render: {(avatarEnabled && selectedAvatar) ? 'Yes' : 'No'}</div>
      </div>
    </div>
  );
}