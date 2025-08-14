import { createContext, useContext, useState, ReactNode } from "react";
import { useLocation } from "wouter";
import { apiRequest } from "../lib/queryClient";
import { useAuth } from "./use-auth";
import { useToast } from "./use-toast";
import { supabase } from "@/lib/supabase";
import { getAuthHeaders } from "@/lib/auth-helper";
import { useAutoRigging } from "../App";

type Avatar = {
  id: number;
  name: string;
  type: string;
  thumbnailUrl: string;
  previewUrl: string;
  modelUrl: string;
  fileUrl: string;
  vertices: number;
  controlPoints: number;
  fileSize: number;
  isPremium: boolean;
  createdAt: string;
  userId: number;
};

interface AvatarContextType {
  avatars: Avatar[];
  selectedAvatar: Avatar | null;
  isLoading: boolean;
  isStreaming: boolean;
  isGenerating: boolean;
  avatarImage: string | null;
  createAvatarFrom2D: (imageFile: File, name?: string) => Promise<Avatar | null>;
  createAvatarFromGLB: (glbFile: File, name?: string) => Promise<Avatar | null>;
  uploadGLBAvatar: (glbFile: File, name?: string) => Promise<Avatar | null>;
  selectAvatar: (avatarId: number) => void;
  previewAvatar: (avatarId: number) => void;
  deleteAvatar: (avatarId: number) => Promise<boolean>;
  startStreaming: () => void;
  stopStreaming: () => void;
}

const AvatarContext = createContext<AvatarContextType | undefined>(undefined);

export function AvatarProvider({ children }: { children: ReactNode }) {
  const [avatars, setAvatars] = useState<Avatar[]>([]);
  const [selectedAvatar, setSelectedAvatar] = useState<Avatar | null>(null);
  const [isLoading, setIsLoading] = useState(false); // No longer true by default
  const [isStreaming, setIsStreaming] = useState(false);
  const [avatarImage, setAvatarImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { startAutoRigging, completeAutoRigging } = useAutoRigging();

  // Function to create a 3D avatar from a 2D image
  const createAvatarFrom2D = async (imageFile: File, name: string = `Avatar ${Date.now()}`): Promise<Avatar | null> => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please login to create avatars.",
        variant: "destructive",
      });
      return null;
    }
    
    try {
      setIsLoading(true);
      setIsGenerating(true);
      
      // Get auth token first to ensure we have it
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      
      if (!token) {
        throw new Error("No authentication token found");
      }
      
      // Create FormData for multipart upload
      const formData = new FormData();
      formData.append("image", imageFile);
      formData.append("name", name);
      
      console.log("🚀 Making 2D to 3D request:", { name, fileSize: imageFile.size });
      
      // Use a specialized fetch for FormData uploads since apiRequest doesn't handle FormData properly
      const headers: Record<string, string> = {
        'Authorization': `Bearer ${token}`,
        'X-Requested-With': 'XMLHttpRequest'
      };
      
      console.log("🌐 Making authenticated FormData request");
      
      // First test backend connectivity with the exact same pattern that works
      try {
        const testResponse = await fetch("/api/avatars", {
          method: "GET",
          headers: { 'Authorization': `Bearer ${token}` }
        });
        console.log("✅ Backend connectivity test:", testResponse.ok ? "SUCCESS" : "FAILED");
        console.log("✅ GET request works with relative URL");
      } catch (testError) {
        console.error("❌ Backend connectivity test failed:", testError);
      }
      
      // Use the same fetch pattern that works for GET requests, but simplified for POST
      console.log("📤 Attempting simplified fetch approach...");
      
      const response = await fetch("/api/avatars/2d-to-3d", {
        method: "POST",
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData
      });
      
      console.log("📡 Response received:", { status: response.status, ok: response.ok });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error("❌ API Error Response:", errorText);
        let error;
        try {
          error = JSON.parse(errorText);
        } catch {
          error = { message: errorText || "Failed to create avatar" };
        }
        throw new Error(error.message || "Failed to create avatar");
      }
      
      const result = await response.json();
      console.log("✅ API Response parsed:", result);
      
      const newAvatar = result.avatar;
      
      if (!newAvatar) {
        console.error("❌ No avatar in response:", result);
        throw new Error("Invalid response format - missing avatar data");
      }
      
      console.log("🎯 Avatar created successfully:", { id: newAvatar.id, name: newAvatar.name });
      
      // Only add to avatars list if it was actually saved (not temporary)
      if (result.canSave && !newAvatar.isTemporary) {
        setAvatars(prevAvatars => [...prevAvatars, newAvatar]);
        console.log("📝 Avatar added to list");
      }
      
      // Always select the newly created avatar for preview
      setSelectedAvatar(newAvatar);
      console.log("🎯 Avatar selected for preview");
      
      // Show appropriate toast message based on save status
      if (result.canSave) {
        toast({
          title: "Avatar Created",
          description: "Your 3D avatar has been successfully created!",
        });
      } else {
        toast({
          title: "Avatar Preview Ready",
          description: result.message || "Preview your 2D to 3D conversion - upgrade to save permanently",
          variant: "default",
        });
      }
      
      return newAvatar;
    } catch (error: any) {
      console.error("Error creating avatar:", error);
      console.error("Error details:", {
        message: error.message,
        stack: error.stack,
        type: typeof error,
        keys: Object.keys(error || {}),
        name: error.name,
        cause: error.cause
      });
      
      let errorMessage = "There was an error creating your avatar. Please try again.";
      
      if (error.message) {
        errorMessage = error.message;
      } else if (error.toString && error.toString() !== '[object Object]') {
        errorMessage = error.toString();
      }
      
      toast({
        title: "Avatar Creation Failed",
        description: errorMessage,
        variant: "destructive",
      });
      return null;
    } finally {
      setIsLoading(false);
      setIsGenerating(false);
    }
  };
  
  // Function for compatibility with the Avatars component interface
  const createAvatarFromGLB = async (glbFile: File, name: string = `GLB Avatar ${Date.now()}`): Promise<Avatar | null> => {
    return uploadGLBAvatar(glbFile, name);
  };
  
  // Function to upload a GLB file as an avatar
  const uploadGLBAvatar = async (glbFile: File, name: string = `GLB Avatar ${Date.now()}`): Promise<Avatar | null> => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please login to upload avatars.",
        variant: "destructive",
      });
      return null;
    }
    
    try {
      setIsLoading(true);
      
      // GLB upload - NO automatic auto-rigging
      // Auto-rigging only happens when user clicks Auto-Rig button in preview modal
      
      const formData = new FormData();
      formData.append("avatar", glbFile);
      formData.append("name", name);
      
      const session = await supabase.auth.getSession();
      let token = session.data.session?.access_token;
      
      // If token is expired, try to refresh the session
      if (!token || session.data.session?.expires_at && session.data.session.expires_at < Date.now() / 1000) {
        const { data: refreshedSession } = await supabase.auth.refreshSession();
        token = refreshedSession.session?.access_token;
      }
      
      if (!token) {
        throw new Error("Authentication token not found");
      }
      
      const response = await fetch("/api/avatars/upload-glb", {
        method: "POST",
        body: formData,
        credentials: "include",
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to upload avatar");
      }
      
      const newAvatar = await response.json();
      console.log('🎯 GLB upload successful:', newAvatar);
      
      // Complete upload process - NO automatic auto-rigging
      completeAutoRigging();
      
      toast({
        title: "Avatar Uploaded",
        description: "GLB uploaded successfully! Click Auto-Rig in the preview to add motion tracking.",
      });
      
      return newAvatar;
    } catch (error: any) {
      console.error("Error uploading avatar:", error);
      completeAutoRigging(); // Complete progress overlay on error
      toast({
        title: "Avatar Upload Failed",
        description: error.message || "There was an error uploading your avatar. Please try again.",
        variant: "destructive",
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  };
  
  // Function to select an avatar
  const selectAvatar = (avatarId: number) => {
    const avatar = avatars.find(a => a.id === avatarId);
    if (avatar) {
      setSelectedAvatar(avatar);
    }
  };
  
  // Function to preview an avatar (opens modal)
  const previewAvatar = (avatarId: number) => {
    selectAvatar(avatarId);
    // When previewing, also update the avatar image for the streaming preview
    const avatar = avatars.find(a => a.id === avatarId);
    if (avatar) {
      setAvatarImage(avatar.previewUrl);
    }
    // The modal will be controlled by the parent component
  };
  
  // Start streaming function
  const startStreaming = () => {
    if (!selectedAvatar) {
      toast({
        title: "No Avatar Selected",
        description: "Please select an avatar before starting the stream",
        variant: "destructive",
      });
      return;
    }
    
    // Start the streaming session
    setIsStreaming(true);
    
    // Call API to start streaming session
    apiRequest("POST", "/api/stream/start", { avatarId: selectedAvatar.id })
      .then(response => {
        if (!response.ok) {
          throw new Error("Failed to start streaming session");
        }
        console.log("Streaming session started");
      })
      .catch(error => {
        console.error("Error starting stream:", error);
        toast({
          title: "Stream Error",
          description: "There was an error starting your stream. Please try again.",
          variant: "destructive",
        });
        setIsStreaming(false);
      });
  };
  
  // Stop streaming function
  const stopStreaming = () => {
    if (!isStreaming) {
      return;
    }
    
    // Stop the streaming session
    setIsStreaming(false);
    
    // Call API to stop streaming session
    apiRequest("POST", "/api/stream/stop", {})
      .then(response => {
        if (!response.ok) {
          throw new Error("Failed to stop streaming session");
        }
        console.log("Streaming session stopped");
      })
      .catch(error => {
        console.error("Error stopping stream:", error);
        toast({
          title: "Stream Error",
          description: "There was an error stopping your stream, but it has been ended locally.",
          variant: "destructive",
        });
      });
  };
  
  // Function to delete an avatar
  const deleteAvatar = async (avatarId: number): Promise<boolean> => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please login to manage your avatars.",
        variant: "destructive",
      });
      return false;
    }
    
    try {
      setIsLoading(true);
      
      const response = await apiRequest("DELETE", `/api/avatars/${avatarId}`);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to delete avatar");
      }
      
      // Remove the deleted avatar from the list
      setAvatars(prevAvatars => prevAvatars.filter(a => a.id !== avatarId));
      
      // If the deleted avatar was selected, select another one if available
      if (selectedAvatar && selectedAvatar.id === avatarId) {
        const remainingAvatars = avatars.filter(a => a.id !== avatarId);
        setSelectedAvatar(remainingAvatars.length > 0 ? remainingAvatars[0] : null);
      }
      
      toast({
        title: "Avatar Deleted",
        description: "Your avatar has been successfully deleted.",
      });
      
      return true;
    } catch (error: any) {
      console.error("Error deleting avatar:", error);
      toast({
        title: "Deletion Failed",
        description: error.message || "There was an error deleting your avatar. Please try again.",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <AvatarContext.Provider
      value={{
        avatars,
        selectedAvatar,
        isLoading,
        isStreaming,
        isGenerating,
        avatarImage,
        createAvatarFrom2D,
        createAvatarFromGLB,
        uploadGLBAvatar,
        selectAvatar,
        previewAvatar,
        deleteAvatar,
        startStreaming,
        stopStreaming,
      }}
    >
      {children}
    </AvatarContext.Provider>
  );
}

export function useAvatar() {
  const context = useContext(AvatarContext);
  if (context === undefined) {
    throw new Error("useAvatar must be used within an AvatarProvider");
  }
  return context;
}