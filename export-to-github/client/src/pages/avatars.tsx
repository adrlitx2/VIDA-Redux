import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Link, useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GlassCard } from "@/components/ui/glass-card";
import { BadgeGlow } from "@/components/ui/badge-glow";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import Navbar from "@/components/Navbar";
import MobileNavbar from "@/components/MobileNavbar";
import Footer from "@/components/Footer";
import { AvatarPreviewModal } from "@/components/AvatarPreviewModal";
import { ProcessingLightbox } from "@/components/ProcessingLightbox";
import { useAvatar } from "@/hooks/use-avatar";
import { useAuth } from "@/hooks/use-auth";
import { useSubscription } from "@/hooks/use-subscription";
import type { SubscriptionPlan } from "@shared/schema";
import { useAutoRigging } from "../App";
import { supabase } from "@/lib/supabase";
import { 
  Sparkles, 
  Upload, 
  Wand2, 
  User, 
  Play, 
  CheckCircle, 
  Plus,
  Image as ImageIcon,
  Download,
  Eye,
  Settings,
  Grid3X3,
  List,
  Search,
  Filter,
  MoreVertical,
  Trash2,
  Edit3,
  Check,
  File as FileIcon
} from "lucide-react";

export default function Avatars() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { avatars, selectedAvatar, isLoading, isGenerating, previewAvatar, createAvatarFrom2D, createAvatarFromGLB, uploadGLBAvatar } = useAvatar();
  const { currentPlan } = useSubscription();
  const { startAutoRigging, completeAutoRigging, showProgress } = useAutoRigging();
  const [, setLocation] = useLocation();
  
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [glbFile, setGlbFile] = useState<File | null>(null);
  const [thumbnailId, setThumbnailId] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);
  const [avatarName, setAvatarName] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState("");
  
  // Preview modal state
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewAvatarId, setPreviewAvatarId] = useState<number | null>(null);
  const [previewSessionId, setPreviewSessionId] = useState<string | null>(null);
  const [tempAvatarData, setTempAvatarData] = useState<any>(null);
  
  // Processing lightbox state
  const [processingLightboxOpen, setProcessingLightboxOpen] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [processingComplete, setProcessingComplete] = useState(false);
  
  // Upload lightbox state
  const [showUploadLightbox, setShowUploadLightbox] = useState(false);
  const [uploadType, setUploadType] = useState<'2d' | 'glb'>('2d');
  const [showUploadProgress, setShowUploadProgress] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ stage: '', progress: 0 });
  
  // Refs for file inputs
  const imageInputRef = useRef<HTMLInputElement>(null);
  const glbInputRef = useRef<HTMLInputElement>(null);

  // Cleanup object URLs and thumbnails when component unmounts or new image is selected
  useEffect(() => {
    return () => {
      if (imagePreview && imagePreview.startsWith('blob:')) {
        URL.revokeObjectURL(imagePreview);
      }
      // Cleanup thumbnail when component unmounts
      if (thumbnailId) {
        cleanupThumbnail(thumbnailId);
      }
    };
  }, [imagePreview]);

  // Cleanup thumbnail when modal closes
  useEffect(() => {
    if (!previewModalOpen && thumbnailId) {
      cleanupThumbnail(thumbnailId);
      setThumbnailId('');
    }
  }, [previewModalOpen]);

  // Filter avatars based on search
  const filteredAvatars = avatars.filter(avatar => 
    avatar.name.toLowerCase().includes(searchQuery.toLowerCase())
  );



  const handleGlbUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    console.log('🔍 File picker triggered - file selected:', file ? file.name : 'none');
    console.log('🔍 File type:', file ? file.type : 'none');
    console.log('🔍 File size:', file ? `${(file.size / (1024 * 1024)).toFixed(1)}MB` : 'none');
    
    if (!file) {
      console.log('❌ No file selected');
      return;
    }
    
    const isValidGLB = file.name.endsWith('.glb') || 
                      file.name.endsWith('.gltf') || 
                      file.type === 'model/gltf-binary' || 
                      file.type === 'model/gltf+json' ||
                      file.type === 'application/octet-stream' ||
                      file.type === '';
    
    console.log('🔍 File validation result:', isValidGLB);
    
    if (!isValidGLB) {
      console.log('❌ File type rejected:', file.type, 'Name:', file.name);
      toast({
        title: "Invalid file type",
        description: `File type: ${file.type || 'unknown'} - Please select a GLB or GLTF file`,
        variant: "destructive",
      });
      return;
    }
    
    if (file.size > 50 * 1024 * 1024) { // 50MB limit
      console.log('❌ File too large:', file.size);
      toast({
        title: "File too large",
        description: "Please select a GLB file smaller than 50MB",
        variant: "destructive",
      });
      return;
    }
    
    console.log('✅ GLB file accepted from file picker:', file.name, `${(file.size / (1024 * 1024)).toFixed(1)}MB`);
    setGlbFile(file);
    toast({
      title: "File selected",
      description: `${file.name} ready for upload`,
    });
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent, type: 'image' | 'glb') => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const files = e.dataTransfer.files;
    if (files && files[0]) {
      const file = files[0];
      
      if (type === 'image' && file.type.startsWith('image/')) {
        if (file.size <= 10 * 1024 * 1024) {
          setImageFile(file);
          
          // Use the same robust processImageFile function for drag and drop
          try {
            const imageDataUrl = await processImageFile(file);
            console.log('📖 Created image preview from drag-and-drop using processImageFile');
            setImagePreview(imageDataUrl);
          } catch (error) {
            console.error('❌ processImageFile failed (drag-and-drop):', error);
            
            // Show file info even if preview fails
            const fallbackSvg = `data:image/svg+xml;base64,${btoa(`
              <svg width="200" height="200" xmlns="http://www.w3.org/2000/svg">
                <rect width="200" height="200" fill="#f3f4f6"/>
                <text x="100" y="100" text-anchor="middle" font-family="Arial" font-size="14" fill="#6b7280">
                  ${file.name}
                </text>
                <text x="100" y="120" text-anchor="middle" font-family="Arial" font-size="12" fill="#9ca3af">
                  ${(file.size / (1024 * 1024)).toFixed(1)}MB
                </text>
              </svg>
            `)}`;
            setImagePreview(fallbackSvg);
          }
        } else {
          toast({
            title: "File too large",
            description: "Please select an image smaller than 10MB",
            variant: "destructive",
          });
        }
      } else if (type === 'glb' && (
        file.name.endsWith('.glb') || 
        file.name.endsWith('.gltf') || 
        file.type === 'model/gltf-binary' || 
        file.type === 'model/gltf+json' ||
        file.type === 'application/octet-stream'
      )) {
        if (file.size <= 50 * 1024 * 1024) {
          console.log('📁 GLB file accepted from drag-and-drop:', file.name, `${(file.size / (1024 * 1024)).toFixed(1)}MB`);
          setGlbFile(file);
        } else {
          toast({
            title: "File too large",
            description: "Please select a GLB file smaller than 50MB",
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: "Invalid file type",
          description: `Please select a valid ${type === 'image' ? 'image' : 'GLB'} file`,
          variant: "destructive",
        });
      }
    }
  };

  // Cleanup thumbnail on server
  const cleanupThumbnail = async (thumbId: string) => {
    if (!thumbId) return;
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      
      await fetch(`/api/avatars/cleanup-thumbnail/${thumbId}`, {
        method: 'DELETE',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      
      console.log('🗑️ Thumbnail cleaned up:', thumbId);
    } catch (error) {
      console.warn('⚠️ Failed to cleanup thumbnail:', error);
    }
  };

  const processImageFile = async (file: File): Promise<string> => {
    console.log('🔄 Processing image file for preview:', file.name, 'size:', file.size);
    
    // SIMPLE WORKING APPROACH: Just use FileReader directly
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (event) => {
        const result = event.target?.result;
        if (typeof result === 'string') {
          console.log('✅ FileReader success');
          resolve(result);
        } else {
          console.log('❌ FileReader result not string');
          resolve(createSVGFallback(file));
        }
      };
      
      reader.onerror = () => {
        console.log('❌ FileReader error');
        resolve(createSVGFallback(file));
      };
      
      reader.readAsDataURL(file);
    });
  };

  // Helper function to create SVG fallback
  const createSVGFallback = (file: File): string => {
    console.log('❌ Canvas conversion failed, using SVG fallback');
    
    const fileSizeMB = (file.size / (1024 * 1024)).toFixed(1);
    const cleanFileName = file.name.replace(/[^\w\-_.]/g, '_').substring(0, 22);
    const svgContent = `<svg width="400" height="300" xmlns="http://www.w3.org/2000/svg">
      <rect width="400" height="300" fill="#f8fafc" stroke="#e2e8f0" stroke-width="2"/>
      <circle cx="200" cy="120" r="40" fill="#94a3b8" opacity="0.5"/>
      <rect x="180" y="110" width="40" height="20" fill="#64748b" rx="2"/>
      <text x="200" y="180" text-anchor="middle" font-family="Arial" font-size="14" fill="#1f2937">
        ${cleanFileName}
      </text>
      <text x="200" y="200" text-anchor="middle" font-family="Arial" font-size="12" fill="#6b7280">
        ${fileSizeMB}MB - Image file
      </text>
      <text x="200" y="220" text-anchor="middle" font-family="Arial" font-size="10" fill="#9ca3af">
        Ready for upload
      </text>
    </svg>`;
    
    return `data:image/svg+xml;base64,${btoa(svgContent)}`;
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    console.log('🔍 handleImageUpload triggered, files:', files?.length);
    
    if (files && files[0]) {
      const file = files[0];
      console.log('📁 Image file details:', {
        name: file.name,
        type: file.type,
        size: `${(file.size / (1024 * 1024)).toFixed(1)}MB`
      });
      
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Invalid file type",
          description: "Please select a valid image file",
          variant: "destructive",
        });
        return;
      }
      
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please select an image smaller than 10MB",
          variant: "destructive",
        });
        return;
      }
      
      try {
        // Process the image immediately to avoid permission issues
        const imageDataUrl = await processImageFile(file);
        
        console.log('✅ Setting both imageFile and imagePreview');
        setImageFile(file);
        setImagePreview(imageDataUrl);
        
        // Clean up previous object URL if it exists
        if (imagePreview && imagePreview.startsWith('blob:')) {
          URL.revokeObjectURL(imagePreview);
        }
        
      } catch (error) {
        console.error('❌ Failed to process image:', error);
        toast({
          title: "Preview error",
          description: error instanceof Error ? error.message : "Failed to process image",
          variant: "destructive",
        });
      }
      
      // Clear the input to allow re-selecting the same file
      e.target.value = '';
    } else {
      console.log('❌ No files selected');
    }
  };

  const generateAvatar = async () => {
    if (!imageFile || !avatarName.trim()) {
      toast({
        title: "Missing Information",
        description: "Please provide both an image and avatar name",
        variant: "destructive",
      });
      return;
    }

    console.log('🚀 Starting avatar generation process');
    console.log('📁 File details:', {
      name: imageFile.name,
      size: imageFile.size,
      type: imageFile.type
    });
    console.log('📝 Avatar name:', avatarName);

    setIsUploading(true);
    
    // Start the progress lightbox after 3 seconds
    setTimeout(() => {
      setProcessingLightboxOpen(true);
      setProcessingProgress(0);
      setProcessingComplete(false);
    }, 3000);
    
    try {
      // Simulate progress updates while processing
      const progressInterval = setInterval(() => {
        setProcessingProgress(prev => {
          if (prev < 90) {
            return prev + Math.random() * 10; // Random progress increments
          }
          return prev;
        });
      }, 2000);

      console.log('🔄 Calling createAvatarFrom2D...');
      const newAvatar = await createAvatarFrom2D(imageFile, avatarName);
      console.log('✅ createAvatarFrom2D completed:', newAvatar);
      
      // Clear progress interval
      clearInterval(progressInterval);
      
      if (newAvatar) {
        // Complete the progress
        setProcessingProgress(100);
        setProcessingComplete(true);
        
        // Wait a moment before closing lightbox and showing preview
        setTimeout(() => {
          setProcessingLightboxOpen(false);
          setImageFile(null);
          setImagePreview(null);
          setAvatarName("");
          setPreviewAvatarId(newAvatar.id);
          setPreviewSessionId(null);
          setPreviewModalOpen(true);
          console.log('🎉 Avatar generation successful, opening preview modal');
        }, 2000);
      } else {
        clearInterval(progressInterval);
        setProcessingLightboxOpen(false);
        console.warn('⚠️ createAvatarFrom2D returned null/undefined');
        toast({
          title: "Generation Failed",
          description: "Avatar creation returned no result",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      setProcessingLightboxOpen(false);
      console.error('❌ Avatar generation failed with error:', error);
      console.error('❌ Error details:', {
        message: error?.message,
        stack: error?.stack,
        name: error?.name
      });
      toast({
        title: "Generation Failed",
        description: error?.message || "There was an error creating your avatar",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const uploadGlbAvatar = async () => {
    if (!glbFile) {
      toast({
        title: "No File Selected",
        description: "Please select a GLB file to upload",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    
    try {
      const avatarName = glbFile.name.replace(/\.[^/.]+$/, "");
      startAutoRigging(avatarName, user?.supabaseUser?.user_metadata?.plan || "goat");
      
      const newAvatar = await createAvatarFromGLB(glbFile, avatarName);
      
      if (newAvatar) {
        toast({
          title: "Avatar Uploaded",
          description: "Your GLB avatar has been successfully uploaded",
        });
        setGlbFile(null);
        setPreviewAvatarId(newAvatar.id);
        setPreviewSessionId(null);
        setTempAvatarData(newAvatar);
        setPreviewModalOpen(true);
        // Close upload dialog when preview opens
        setShowUploadLightbox(false);
      }
    } catch (error) {
      completeAutoRigging();
      toast({
        title: "Upload Failed",
        description: "There was an error uploading your GLB file",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };





  // Temporary avatar preview event listener
  useEffect(() => {
    const handleTempAvatarPreview = (event: CustomEvent) => {
      console.log('🎯 Received temp avatar preview event:', event.detail);
      const avatar = event.detail?.avatar;
      if (avatar) {
        console.log('🎯 Setting temp avatar data and opening modal:', avatar);
        // Cleanup thumbnail when modal opens
        if (thumbnailId) {
          cleanupThumbnail(thumbnailId);
          setThumbnailId('');
        }
        setTempAvatarData(avatar);
        setPreviewAvatarId(avatar.id);
        setPreviewModalOpen(true);
      }
    };

    console.log('🎯 Adding temp avatar preview event listener');
    window.addEventListener('openTempAvatarPreview', handleTempAvatarPreview as EventListener);

    return () => {
      console.log('🎯 Removing temp avatar preview event listener');
      window.removeEventListener('openTempAvatarPreview', handleTempAvatarPreview as EventListener);
    };
  }, []);

  const AvatarCard = ({ avatar, isGridView }: { avatar: any, isGridView: boolean }) => (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className={`group relative rounded-2xl overflow-hidden cursor-pointer transition-all duration-200 hover:scale-[1.02] ${
        isGridView ? 'aspect-square' : 'h-24 flex'
      } ${selectedAvatar?.id === avatar.id ? 'ring-2 ring-primary' : ''}`}
      onClick={() => {
        // Cleanup thumbnail when modal opens
        if (thumbnailId) {
          cleanupThumbnail(thumbnailId);
          setThumbnailId('');
        }
        previewAvatar(avatar.id);
        setPreviewAvatarId(avatar.id);
        setPreviewSessionId(null);
        setPreviewModalOpen(true);
      }}
    >
      <div className={`relative ${isGridView ? 'w-full h-full' : 'w-24 h-24 flex-shrink-0'}`}>
        <img 
          src={avatar.thumbnailUrl} 
          alt={avatar.name} 
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
        
        {/* Action buttons on hover */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200">
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" className="h-8 w-8 p-0 rounded-full">
              <Eye className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="secondary" className="h-8 w-8 p-0 rounded-full">
              <Play className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
      
      <div className={`${isGridView ? 'absolute bottom-0 left-0 right-0 p-3' : 'flex-1 p-4 flex flex-col justify-center'}`}>
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <h3 className={`font-medium truncate ${isGridView ? 'text-white text-sm' : 'text-foreground'}`}>
              {avatar.name}
            </h3>
            {!isGridView && (
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-muted-foreground">
                  {avatar.type === 'glb-upload' ? 'GLB Model' : '2D to 3D'}
                </span>
                {avatar.isRigged && (
                  <BadgeGlow variant="secondary" className="text-xs">Rigged</BadgeGlow>
                )}
              </div>
            )}
          </div>
          
          {avatar.isPremium && (
            <BadgeGlow variant="secondary" className="text-xs flex-shrink-0 ml-2">
              Premium
            </BadgeGlow>
          )}
        </div>
      </div>
    </motion.div>
  );

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <MobileNavbar />

      <div className="container mx-auto px-4 py-6 sm:py-12 max-w-7xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl sm:text-4xl font-bold mb-2">
                My <span className="text-primary">Avatars</span>
              </h1>
              <p className="text-sm sm:text-lg text-muted-foreground">
                Create and manage your 3D avatars
              </p>
            </div>
            
            <div className="flex gap-2">
              <Link href="/avatar-studio" className="flex-1 sm:flex-none">
                <Button size="lg" className="w-full sm:w-auto bg-gradient-to-r from-primary to-blue-600">
                  <Sparkles className="h-4 w-4 mr-2" />
                  Avatar Studio
                </Button>
              </Link>
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          {/* Main content */}
          <div className="xl:col-span-3">
            <Tabs defaultValue="library" className="w-full">
              <TabsList className="grid grid-cols-3 mb-6 h-12">
                <TabsTrigger value="library" className="text-xs sm:text-sm">
                  <User className="h-4 w-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">My Avatars</span>
                  <span className="sm:hidden">Library</span>
                </TabsTrigger>
                <TabsTrigger value="2d-to-3d" className="text-xs sm:text-sm">
                  <Wand2 className="h-4 w-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">2D to 3D</span>
                  <span className="sm:hidden">AI Generate</span>
                </TabsTrigger>
                <TabsTrigger value="glb" className="text-xs sm:text-sm">
                  <Upload className="h-4 w-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">Upload GLB</span>
                  <span className="sm:hidden">Upload</span>
                </TabsTrigger>
              </TabsList>

              {/* Avatar Library */}
              <TabsContent value="library" className="space-y-4">
                {/* Search and view controls */}
                <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center justify-between">
                  <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search avatars..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={() => setShowUploadLightbox(true)}
                      className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white"
                      size="sm"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Upload
                    </Button>
                    <div className="flex rounded-lg border border-border overflow-hidden">
                      <Button
                        variant={viewMode === 'grid' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setViewMode('grid')}
                        className="rounded-none"
                      >
                        <Grid3X3 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant={viewMode === 'list' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setViewMode('list')}
                        className="rounded-none"
                      >
                        <List className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Avatar grid/list */}
                {isGenerating ? (
                  <div className="text-center py-16">
                    <div className="w-20 h-20 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto mb-4">
                      <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                    <h3 className="text-xl font-medium mb-2">
                      Generating Your 3D Avatar...
                    </h3>
                    <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                      Your avatar is being processed using advanced AI. This usually takes 2-3 minutes.
                    </p>
                    <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4 max-w-md mx-auto">
                      <div className="flex items-start gap-3">
                        <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-white text-xs font-bold">i</span>
                        </div>
                        <div className="text-sm text-blue-700 dark:text-blue-300">
                          <p className="font-medium mb-1">Processing Steps:</p>
                          <ul className="space-y-1 text-xs">
                            <li>• Analyzing your image with AI</li>
                            <li>• Generating 3D mesh geometry</li>
                            <li>• Creating T-pose model</li>
                            <li>• Finalizing avatar data</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : filteredAvatars.length > 0 ? (
                  <div className={
                    viewMode === 'grid' 
                      ? 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4' 
                      : 'space-y-3'
                  }>
                    {filteredAvatars.map((avatar) => (
                      <AvatarCard 
                        key={avatar.id} 
                        avatar={avatar} 
                        isGridView={viewMode === 'grid'} 
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-16">
                    <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                      <User className="h-10 w-10 text-muted-foreground" />
                    </div>
                    <h3 className="text-xl font-medium mb-2">
                      {searchQuery ? 'No avatars found' : 'No avatars yet'}
                    </h3>
                    <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                      {searchQuery 
                        ? `No avatars match "${searchQuery}". Try a different search term.`
                        : 'Create your first avatar from a 2D image or upload a GLB file to get started.'
                      }
                    </p>
                    {!searchQuery && (
                      <div className="flex flex-col sm:flex-row gap-3 justify-center">
                        <Button variant="outline" onClick={() => setSearchQuery('')}>
                          <Wand2 className="h-4 w-4 mr-2" />
                          Generate from Image
                        </Button>
                        <Button variant="outline">
                          <Upload className="h-4 w-4 mr-2" />
                          Upload GLB
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </TabsContent>



              {/* 2D to 3D Generation */}
              <TabsContent value="2d-to-3d">
                <GlassCard className="p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 bg-gradient-to-br from-primary to-blue-600 rounded-xl flex items-center justify-center">
                      <Wand2 className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold">AI Avatar Generation</h3>
                      <p className="text-sm text-muted-foreground">Transform your photo into a 3D avatar using advanced AI</p>
                    </div>
                  </div>
                  
                  <div className="space-y-6">
                    {/* Debug state display - COMMENTED OUT FOR PRODUCTION UI
                        Session logging still active in console for troubleshooting
                    <div className="bg-gray-100 dark:bg-gray-900 p-3 rounded text-xs font-mono">
                      <div>Debug State:</div>
                      <div>imageFile: {imageFile ? `${imageFile.name} (${(imageFile.size / 1024 / 1024).toFixed(1)}MB)` : 'null'}</div>
                      <div>imagePreview: {imagePreview ? `${imagePreview.substring(0, 30)}...` : 'null'}</div>
                    </div>
                    */}
                    
                    {/* Helper text */}
                    <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-white text-xs font-bold">i</span>
                        </div>
                        <div className="text-sm">
                          <p className="font-medium text-blue-900 dark:text-blue-100 mb-1">Best Results Tips:</p>
                          <ul className="text-blue-700 dark:text-blue-300 space-y-1 text-xs">
                            <li>• Use a clear, front-facing portrait 2D illustration</li>
                            <li>• Ensure good lighting and minimal shadows</li>
                            <li>• Character should face forward with visible facial features</li>
                            <li>• JPG, PNG, or WebP formats supported (max 10MB)</li>
                          </ul>
                        </div>
                      </div>
                    </div>

                    {isUploading && (
                      <motion.div 
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-gradient-to-r from-primary/10 to-blue-600/10 rounded-lg p-4 border border-primary/20"
                      >
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                          <span className="text-sm font-medium text-primary">Generating your 3D avatar...</span>
                        </div>
                        <div className="space-y-2 text-xs text-muted-foreground">
                          <div>• Analyzing facial features</div>
                          <div>• Creating 3D mesh structure</div>
                          <div>• Applying textures and materials</div>
                          <div>• Optimizing for real-time rendering</div>
                        </div>
                      </motion.div>
                    )}

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div>
                          <Label className="text-base font-medium">Upload Portrait Photo</Label>
                          <p className="text-xs text-muted-foreground mt-1">Choose a clear front-facing photo</p>
                        </div>
                        <input
                          ref={imageInputRef}
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          onChange={handleImageUpload}
                          className="hidden"
                          id="image-file-input"
                        />

                        <label 
                          htmlFor="image-file-input"
                          className={`relative border-2 border-dashed rounded-xl p-8 transition-all duration-300 cursor-pointer group block ${
                            dragActive 
                              ? 'border-primary bg-primary/10 scale-[1.02]' 
                              : imageFile 
                                ? 'border-green-400 bg-green-50 dark:bg-green-950/20' 
                                : 'border-blue-300 dark:border-blue-700 hover:border-primary hover:bg-primary/5'
                          }`}
                          onDragEnter={handleDrag}
                          onDragLeave={handleDrag}
                          onDragOver={handleDrag}
                          onDrop={(e) => handleDrop(e, 'image')}
                        >
                          <div className="text-center">
                            {imageFile ? (
                              <motion.div 
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="space-y-3"
                              >
                                <div className="w-20 h-20 mx-auto rounded-lg overflow-hidden ring-2 ring-green-400">
                                  {imagePreview ? (
                                    <img 
                                      src={imagePreview} 
                                      alt="Preview" 
                                      className="w-full h-full object-cover"
                                      crossOrigin="anonymous"
                                      onError={(e) => {
                                        console.error("❌ Image preview failed to load:", imagePreview?.substring(0, 50));
                                        console.log("Image preview URL type:", imagePreview?.startsWith('data:') ? 'Data URL' : imagePreview?.startsWith('blob:') ? 'Blob URL' : 'Other');
                                        // Don't clear imagePreview immediately - let user see file info
                                        // setImagePreview(null);
                                      }}
                                      onLoad={() => {
                                        console.log("✅ Image preview loaded successfully");
                                      }}
                                    />
                                  ) : (
                                    <div className="w-full h-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                                      <div className="text-center">
                                        <ImageIcon className="h-8 w-8 text-gray-400 mx-auto mb-1" />
                                        <span className="text-xs text-gray-500">
                                          {imageFile ? "Image ready" : "Select an image"}
                                        </span>
                                      </div>
                                    </div>
                                  )}
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-green-700 dark:text-green-300">{imageFile.name}</p>
                                  <p className="text-xs text-green-600 dark:text-green-400">
                                    {(imageFile.size / (1024 * 1024)).toFixed(1)} MB • Ready to generate
                                  </p>
                                </div>
                                <CheckCircle className="h-6 w-6 mx-auto text-green-500" />
                              </motion.div>
                            ) : (
                              <div className="space-y-3">
                                <motion.div
                                  animate={{ 
                                    y: dragActive ? -5 : 0,
                                    scale: dragActive ? 1.1 : 1 
                                  }}
                                  transition={{ duration: 0.2 }}
                                >
                                  <ImageIcon className="h-12 w-12 mx-auto text-blue-400 group-hover:text-primary transition-colors" />
                                </motion.div>
                                <div>
                                  <p className="text-sm font-medium">Drop your image here</p>
                                  <p className="text-xs text-muted-foreground">or click to browse files</p>
                                  <p className="text-xs text-muted-foreground mt-1">JPG, PNG, WebP • Max 10MB</p>
                                </div>
                              </div>
                            )}
                          </div>
                        </label>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="avatarName" className="text-base font-medium">Avatar Name</Label>
                          <p className="text-xs text-muted-foreground mt-1">Give your avatar a unique name</p>
                        </div>
                        <Input
                          id="avatarName"
                          placeholder="Enter avatar name (e.g., My Hero, Space Commander)"
                          value={avatarName}
                          onChange={(e) => setAvatarName(e.target.value)}
                          className="h-12"
                          maxLength={50}
                        />
                        <p className="text-xs text-muted-foreground">
                          {avatarName.length}/50 characters
                        </p>
                        
                        <motion.div whileTap={{ scale: 0.98 }}>
                          <Button 
                            onClick={generateAvatar} 
                            disabled={!imageFile || !avatarName.trim() || isUploading}
                            className="w-full h-12 bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90 disabled:opacity-50"
                            size="lg"
                          >
                            {isUploading ? (
                              <>
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                                Generating...
                              </>
                            ) : (
                              <>
                                <Wand2 className="h-4 w-4 mr-2" />
                                Generate Avatar
                              </>
                            )}
                          </Button>
                        </motion.div>
                      </div>
                    </div>
                  </div>
                </GlassCard>
              </TabsContent>

              {/* GLB Upload */}
              <TabsContent value="glb">
                <GlassCard className="p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center">
                      <Upload className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold">Upload 3D Model</h3>
                      <p className="text-sm text-muted-foreground">Upload your GLB file for automatic rigging and real-time tracking</p>
                    </div>
                  </div>
                  
                  <div className="space-y-6">
                    {/* Helper text */}
                    <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-white text-xs font-bold">!</span>
                        </div>
                        <div className="text-sm">
                          <p className="font-medium text-green-900 dark:text-green-100 mb-1">Professional 3D Models:</p>
                          <ul className="text-green-700 dark:text-green-300 space-y-1 text-xs">
                            <li>• Upload humanoid GLB/GLTF models for best rigging results</li>
                            <li>• Automatic Enhanced 10-Model Pipeline processing included</li>
                            <li>• Face, body, and hand tracking capabilities added</li>
                            <li>• File size limit: 50MB • Supports GLB and GLTF formats</li>
                          </ul>
                        </div>
                      </div>
                    </div>

                    {isUploading && (
                      <motion.div 
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-gradient-to-r from-green-500/10 to-emerald-600/10 rounded-lg p-4 border border-green-500/20"
                      >
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin"></div>
                          <span className="text-sm font-medium text-green-600 dark:text-green-400">Processing GLB file...</span>
                        </div>
                        <div className="space-y-2 text-xs text-muted-foreground">
                          <div>• Analyzing 3D model structure</div>
                          <div>• Applying Enhanced 10-Model Pipeline</div>
                          <div>• Optimizing bone structure and rigging</div>
                          <div>• Preparing for real-time tracking</div>
                        </div>
                      </motion.div>
                    )}

                    <div className="space-y-4">
                      <div>
                        <Label className="text-base font-medium">Upload GLB File</Label>
                        <p className="text-xs text-muted-foreground mt-1">Choose your 3D model file for automatic rigging</p>
                      </div>
                      <input
                        ref={glbInputRef}
                        type="file"
                        accept=".glb,.gltf,model/gltf-binary,model/gltf+json,application/octet-stream,*/*"
                        onChange={handleGlbUpload}
                        className="hidden"
                      />
                      <motion.div 
                        className={`relative border-2 border-dashed rounded-xl p-12 transition-all duration-300 cursor-pointer group ${
                          dragActive 
                            ? 'border-green-500 bg-green-500/10 scale-[1.02]' 
                            : glbFile 
                              ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-950/20' 
                              : 'border-green-300 dark:border-green-700 hover:border-green-500 hover:bg-green-500/5'
                        }`}
                        onDragEnter={handleDrag}
                        onDragLeave={handleDrag}
                        onDragOver={handleDrag}
                        onDrop={(e) => handleDrop(e, 'glb')}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          console.log('GLB upload card clicked, triggering file input');
                          if (glbInputRef.current) {
                            glbInputRef.current.click();
                            console.log('GLB file input click triggered');
                          } else {
                            console.error('GLB input ref is null');
                          }
                        }}
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                      >
                        <div className="text-center">
                          {glbFile ? (
                            <motion.div 
                              initial={{ opacity: 0, scale: 0.8 }}
                              animate={{ opacity: 1, scale: 1 }}
                              className="space-y-4"
                            >
                              <div className="relative">
                                <CheckCircle className="h-20 w-20 mx-auto text-emerald-500" />
                                <div className="absolute -top-1 -right-1 w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center">
                                  <span className="text-white text-xs font-bold">✓</span>
                                </div>
                              </div>
                              <div>
                                <p className="text-lg font-medium text-emerald-700 dark:text-emerald-300">{glbFile.name}</p>
                                <p className="text-sm text-emerald-600 dark:text-emerald-400">
                                  {(glbFile.size / (1024 * 1024)).toFixed(1)} MB • Ready for processing
                                </p>
                                <p className="text-xs text-emerald-500 mt-1">Auto-rigging and tracking will be applied</p>
                              </div>
                            </motion.div>
                          ) : (
                            <div className="space-y-4">
                              <motion.div
                                animate={{ 
                                  y: dragActive ? -8 : 0,
                                  scale: dragActive ? 1.1 : 1 
                                }}
                                transition={{ duration: 0.2 }}
                              >
                                <Upload className="h-16 w-16 mx-auto text-green-400 group-hover:text-green-500 transition-colors" />
                              </motion.div>
                              <div>
                                <p className="text-lg font-medium">Drop your GLB file here</p>
                                <p className="text-sm text-muted-foreground">or click to browse files</p>
                                <p className="text-xs text-muted-foreground mt-2">
                                  GLB & GLTF • Max 50MB • Automatic rigging included
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      </motion.div>

                      <motion.div whileTap={{ scale: 0.98 }}>
                        <Button 
                          onClick={uploadGlbAvatar} 
                          disabled={!glbFile || isUploading}
                          className="w-full h-12 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-500/90 hover:to-emerald-600/90 disabled:opacity-50"
                          size="lg"
                        >
                          {isUploading ? (
                            <>
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                              Processing...
                            </>
                          ) : (
                            <>
                              <Upload className="h-4 w-4 mr-2" />
                              Upload & Auto-Rig
                            </>
                          )}
                        </Button>
                      </motion.div>
                    </div>
                  </div>
                </GlassCard>
              </TabsContent>
            </Tabs>
          </div>

          {/* Sidebar - Quick Stats */}
          <div className="xl:col-span-1">
            <div className="space-y-4">
              <GlassCard className="p-4">
                <h3 className="font-semibold mb-3">Quick Stats</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Total Avatars</span>
                    <span className="font-medium">{avatars.length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Current Plan</span>
                    <BadgeGlow variant="secondary" className="text-xs">
                      {currentPlan?.name || 'Free'}
                    </BadgeGlow>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Avatar Limit</span>
                    <span className="font-medium">
                      {avatars.length}/{(currentPlan as any)?.avatarMaxCount || 1}
                    </span>
                  </div>
                </div>
              </GlassCard>
            </div>
          </div>
        </div>
      </div>

      <Footer />

      {/* Upload Lightbox Dialog */}
      <Dialog open={showUploadLightbox} onOpenChange={setShowUploadLightbox}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Upload Avatar
            </DialogTitle>
            <DialogDescription>
              Choose how you'd like to create your avatar
            </DialogDescription>
          </DialogHeader>
          
          {/* Hidden file inputs for lightbox */}
          <input
            ref={imageInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleImageUpload}
            className="hidden"
            id="lightbox-image-input"
          />
          <input
            ref={glbInputRef}
            type="file"
            accept=".glb,.gltf,model/gltf-binary,model/gltf+json,application/octet-stream,*/*"
            onChange={handleGlbUpload}
            className="hidden"
            id="lightbox-glb-input"
          />
          
          <Tabs value={uploadType} onValueChange={(value) => setUploadType(value as '2d' | 'glb')} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="2d" className="flex items-center gap-2">
                <Wand2 className="h-4 w-4" />
                2D to 3D Conversion
              </TabsTrigger>
              <TabsTrigger value="glb" className="flex items-center gap-2">
                <Upload className="h-4 w-4" />
                Upload GLB Model
              </TabsTrigger>
            </TabsList>

            <TabsContent value="2d" className="space-y-6 mt-6">
              <div className="space-y-4">
                <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-white text-xs font-bold">i</span>
                    </div>
                    <div className="text-sm">
                      <p className="font-medium text-blue-900 dark:text-blue-100 mb-1">Best Results Tips:</p>
                      <ul className="text-blue-700 dark:text-blue-300 space-y-1 text-xs">
                        <li>• Use a clear, front-facing portrait 2D illustration</li>
                        <li>• Ensure good lighting and minimal shadows</li>
                        <li>• Character should face forward with visible facial features</li>
                        <li>• JPG, PNG, or WebP formats supported (max 10MB)</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div 
                  className={`border-2 border-dashed rounded-lg p-8 text-center transition-all cursor-pointer hover:bg-muted/50 ${
                    dragActive ? 'border-primary bg-primary/5 scale-105' : 'border-blue-300 dark:border-blue-700'
                  } ${imageFile ? 'border-green-500 bg-green-50 dark:bg-green-950/30' : ''}`}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={(e) => handleDrop(e, 'image')}
                  onClick={() => {
                    console.log('Image upload area clicked - triggering file input');
                    setTimeout(() => {
                      if (imageInputRef.current) {
                        console.log('Triggering image file input click');
                        imageInputRef.current.click();
                      } else {
                        console.error('Image input ref is null');
                      }
                    }, 0);
                  }}
                >
                  {imageFile ? (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="space-y-3"
                    >
                      <div className="w-16 h-16 mx-auto bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                        <Check className="h-8 w-8 text-green-600 dark:text-green-400" />
                      </div>
                      <div>
                        <p className="font-medium text-green-700 dark:text-green-300">{imageFile.name}</p>
                        <p className="text-sm text-green-600 dark:text-green-400">Ready to convert to 3D</p>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div
                      whileHover={{ scale: 1.02 }}
                      className="space-y-3"
                    >
                      <div className="w-16 h-16 mx-auto bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                        <motion.div
                          animate={{ rotate: [0, 10, -10, 0] }}
                          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                        >
                          <ImageIcon className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                        </motion.div>
                      </div>
                      <div>
                        <p className="font-medium">Drop your image here or click to browse</p>
                        <p className="text-sm text-muted-foreground">Supports JPG, PNG, WebP (max 10MB)</p>
                      </div>
                    </motion.div>
                  )}
                </div>

                {imageFile && (
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="avatar-name-2d" className="text-sm font-medium">Avatar Name</Label>
                      <Input
                        id="avatar-name-2d"
                        value={avatarName}
                        onChange={(e) => setAvatarName(e.target.value.slice(0, 50))}
                        placeholder="Enter a name for your avatar"
                        className="mt-1"
                      />
                      <p className="text-xs text-muted-foreground mt-1">{avatarName.length}/50 characters</p>
                    </div>
                    
                    <Button
                      onClick={() => {
                        setShowUploadLightbox(false);
                        generateAvatar();
                      }}
                      disabled={isUploading || !avatarName.trim()}
                      className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
                    >
                      {isUploading ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                          Converting to 3D...
                        </>
                      ) : (
                        <>
                          <Wand2 className="h-4 w-4 mr-2" />
                          Convert to 3D Avatar
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="glb" className="space-y-6 mt-6">
              <div className="space-y-4">
                <div className="bg-green-50 dark:bg-green-950/30 rounded-lg p-4 border border-green-200 dark:border-green-800">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-white text-xs font-bold">i</span>
                    </div>
                    <div className="text-sm">
                      <p className="font-medium text-green-900 dark:text-green-100 mb-1">GLB Upload Tips:</p>
                      <ul className="text-green-700 dark:text-green-300 space-y-1 text-xs">
                        <li>• Upload pre-made 3D models in GLB format</li>
                        <li>• Models will be auto-rigged for real-time animation</li>
                        <li>• Supports textured models with materials</li>
                        <li>• File size limits based on your subscription plan</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div 
                  className={`border-2 border-dashed rounded-lg p-8 text-center transition-all cursor-pointer hover:bg-muted/50 ${
                    dragActive ? 'border-primary bg-primary/5 scale-105' : 'border-green-300 dark:border-green-700'
                  } ${glbFile ? 'border-green-500 bg-green-50 dark:bg-green-950/30' : ''}`}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={(e) => handleDrop(e, 'glb')}
                  onClick={() => {
                    setTimeout(() => {
                      if (glbInputRef.current) {
                        glbInputRef.current.click();
                      }
                    }, 0);
                  }}
                >
                  {glbFile ? (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="space-y-3"
                    >
                      <div className="w-16 h-16 mx-auto bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                        <Check className="h-8 w-8 text-green-600 dark:text-green-400" />
                      </div>
                      <div>
                        <p className="font-medium text-green-700 dark:text-green-300">{glbFile.name}</p>
                        <p className="text-sm text-green-600 dark:text-green-400">
                          Ready to upload ({(glbFile.size / (1024 * 1024)).toFixed(1)} MB)
                        </p>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div
                      whileHover={{ scale: 1.02 }}
                      className="space-y-3"
                    >
                      <div className="w-16 h-16 mx-auto bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                        <motion.div
                          animate={{ y: [0, -5, 0] }}
                          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                        >
                          <FileIcon className="h-8 w-8 text-green-600 dark:text-green-400" />
                        </motion.div>
                      </div>
                      <div>
                        <p className="font-medium">Drop your GLB file here or click to browse</p>
                        <p className="text-sm text-muted-foreground">GLB format only</p>
                      </div>
                    </motion.div>
                  )}
                </div>

                {glbFile && (
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="avatar-name-glb" className="text-sm font-medium">Avatar Name</Label>
                      <Input
                        id="avatar-name-glb"
                        value={avatarName}
                        onChange={(e) => setAvatarName(e.target.value.slice(0, 50))}
                        placeholder="Enter a name for your avatar"
                        className="mt-1"
                      />
                      <p className="text-xs text-muted-foreground mt-1">{avatarName.length}/50 characters</p>
                    </div>
                    
                    <Button
                      onClick={async () => {
                        if (!glbFile || !avatarName.trim()) return;
                        
                        setIsUploading(true);
                        setShowUploadLightbox(false);
                        setShowUploadProgress(true);
                        
                        try {
                          console.log('🎯 Starting GLB upload process for:', glbFile.name);
                          setUploadProgress({ stage: 'Uploading GLB file...', progress: 25 });
                          await new Promise(resolve => setTimeout(resolve, 600));
                          
                          setUploadProgress({ stage: 'Analyzing 3D model structure...', progress: 50 });
                          
                          // Add timeout wrapper to prevent hanging
                          const uploadPromise = uploadGLBAvatar(glbFile, avatarName);
                          const timeoutPromise = new Promise((_, reject) => {
                            setTimeout(() => reject(new Error('Upload timeout after 20 seconds')), 20000);
                          });
                          
                          const result = await Promise.race([uploadPromise, timeoutPromise]);
                          console.log('🎯 GLB upload result:', result);
                          
                          setUploadProgress({ stage: 'Generating thumbnails...', progress: 80 });
                          await new Promise(resolve => setTimeout(resolve, 400));
                          
                          if (result) {
                            setUploadProgress({ stage: 'GLB avatar uploaded successfully!', progress: 100 });
                            await new Promise(resolve => setTimeout(resolve, 1000));
                            
                            setShowUploadProgress(false);
                            setGlbFile(null);
                            setAvatarName('');
                            
                            toast({
                              title: "GLB avatar uploaded successfully!",
                              description: "Your 3D model has been uploaded and is ready for use.",
                            });
                          }
                        } catch (error) {
                          console.error('🎯 GLB upload error:', error);
                          setShowUploadProgress(false);
                          toast({
                            title: "Upload failed",
                            description: error instanceof Error ? error.message : "Failed to upload GLB avatar. Please try again.",
                            variant: "destructive",
                          });
                        } finally {
                          setIsUploading(false);
                        }
                      }}
                      disabled={isUploading || !avatarName.trim()}
                      className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
                    >
                      {isUploading ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                          Uploading GLB...
                        </>
                      ) : (
                        <>
                          <Upload className="h-4 w-4 mr-2" />
                          Upload GLB Avatar
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Upload Progress - Full Screen */}
      {showUploadProgress && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
          <div className="bg-white dark:bg-gray-800 p-8 rounded-lg text-center">
            <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
            <h3 className="text-lg font-semibold mb-2">{uploadProgress.stage}</h3>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {previewModalOpen && previewAvatarId && (
        <AvatarPreviewModal
          avatarId={previewAvatarId}
          sessionId={previewSessionId}
          isOpen={previewModalOpen}
          tempAvatarData={tempAvatarData}
          onClose={() => {
            setPreviewModalOpen(false);
            setPreviewAvatarId(null);
            setPreviewSessionId(null);
            setTempAvatarData(null);
          }}
        />
      )}

      {/* Processing Lightbox */}
      <ProcessingLightbox
        isOpen={processingLightboxOpen}
        onClose={() => setProcessingLightboxOpen(false)}
        progress={processingProgress}
        isComplete={processingComplete}
      />
    </div>
  );
}