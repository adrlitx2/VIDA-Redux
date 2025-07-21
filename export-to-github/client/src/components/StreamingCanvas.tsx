import React, { useRef, useEffect, useCallback, useState } from 'react';

interface StreamingCanvasProps {
  width: number;
  height: number;
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
  sharedBackgroundImages?: { [key: string]: HTMLImageElement };
  backgroundsLoaded?: boolean;
  onFrameCapture?: (canvas: HTMLCanvasElement) => void;
}

export const StreamingCanvas: React.FC<StreamingCanvasProps> = ({
  width,
  height,
  backgroundType,
  selectedVirtualBg,
  solidColor,
  cameraEnabled,
  cameraStream,
  avatarEnabled,
  selectedAvatar,
  avatarOpacity,
  sceneLighting,
  sharedBackgroundImages,
  backgroundsLoaded,
  onFrameCapture
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const animationFrameRef = useRef<number>();
  const frameIntervalRef = useRef<NodeJS.Timeout>();
  
  // Use shared background images from parent component
  const backgroundImages = sharedBackgroundImages || {};
  const imagesLoaded = backgroundsLoaded || false;

  // Setup camera video element
  useEffect(() => {
    if (cameraStream && videoRef.current) {
      videoRef.current.srcObject = cameraStream;
    }
  }, [cameraStream]);

  // Complete rendering pipeline
  const renderFrame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 1. BACKGROUND LAYER
    let backgroundRendered = false;

    if (backgroundType === 'virtual' && selectedVirtualBg) {
      // Use shared background images from parent component
      const img = backgroundImages[selectedVirtualBg];
      console.log(`🔍 RTMP Frame: selectedVirtualBg=${selectedVirtualBg}, img exists=${!!img}, complete=${img?.complete}, naturalHeight=${img?.naturalHeight}, backgroundsLoaded=${backgroundsLoaded}`);
      
      if (img && img.complete && img.naturalHeight > 0 && img.width > 0 && backgroundsLoaded) {
        // Calculate proper scaling to fill canvas while maintaining aspect ratio
        const scaleX = canvas.width / img.naturalWidth;
        const scaleY = canvas.height / img.naturalHeight;
        const scale = Math.max(scaleX, scaleY);
        
        const scaledWidth = img.naturalWidth * scale;
        const scaledHeight = img.naturalHeight * scale;
        const offsetX = (canvas.width - scaledWidth) / 2;
        const offsetY = (canvas.height - scaledHeight) / 2;
        
        // Draw scaled and centered background
        ctx.drawImage(img, offsetX, offsetY, scaledWidth, scaledHeight);
        backgroundRendered = true;
        console.log(`✅ RTMP Frame: Successfully rendered background ${selectedVirtualBg} (${scaledWidth}x${scaledHeight})`);
      } else {
        // Don't render anything if background isn't ready - this prevents flickering
        console.log(`⚠️ RTMP Frame: Background ${selectedVirtualBg} not ready, skipping frame`);
        return; // Skip this frame entirely to prevent flickering
      }
    } else if (backgroundType === 'color' && solidColor) {
      // Render solid color background
      ctx.fillStyle = solidColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      backgroundRendered = true;
    } else if (backgroundType === 'blur' && cameraEnabled && videoRef.current) {
      // Render blurred camera background
      const video = videoRef.current;
      if (video.readyState >= 2) {
        ctx.filter = 'blur(10px)';
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        ctx.filter = 'none';
        backgroundRendered = true;
        console.log(`🎨 Rendered blurred camera background`);
      }
    }
      
    // Gradient backgrounds fallback
    if (!backgroundRendered && backgroundType === 'virtual') {
      let gradient;
      switch (selectedVirtualBg) {
        case 'forest-nature':
          gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
          gradient.addColorStop(0, '#0f5132');
          gradient.addColorStop(0.5, '#198754');
          gradient.addColorStop(1, '#20c997');
          break;
        case 'city-skyline':
          gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
          gradient.addColorStop(0, '#1a1a2e');
          gradient.addColorStop(0.5, '#16213e');
          gradient.addColorStop(1, '#e94560');
          break;
        case 'space-nebula':
          gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
          gradient.addColorStop(0, '#2c1810');
          gradient.addColorStop(0.5, '#8b5a3c');
          gradient.addColorStop(1, '#f4a261');
          break;
        default:
          gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
          gradient.addColorStop(0, '#1a1a1a');
          gradient.addColorStop(1, '#4a4a4a');
      }
      
      if (gradient) {
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        backgroundRendered = true;
      }
    }

    // No overlay indicators needed for RTMP stream

    // Default background - only when no specific background is selected
    if (!backgroundRendered) {
      // Create a stable, professional gradient background
      const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      gradient.addColorStop(0, '#1e3a8a'); // Deep blue
      gradient.addColorStop(0.5, '#3b82f6'); // Blue
      gradient.addColorStop(1, '#1d4ed8'); // Bright blue
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Add subtle pattern overlay
      ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
      for (let i = 0; i < canvas.width; i += 40) {
        for (let j = 0; j < canvas.height; j += 40) {
          if ((i + j) % 80 === 0) {
            ctx.fillRect(i, j, 20, 20);
          }
        }
      }
      
      // Add VIDA³ branding
      ctx.fillStyle = 'white';
      ctx.font = 'bold 72px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
      ctx.shadowBlur = 10;
      ctx.fillText('VIDA³', canvas.width / 2, canvas.height / 2 - 40);
      
      ctx.font = '36px Arial';
      ctx.fillText('Professional Streaming Studio', canvas.width / 2, canvas.height / 2 + 20);
      
      ctx.font = '24px Arial';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.fillText('Streaming at optimal quality • 9 Mbps Video • 128k Audio', canvas.width / 2, canvas.height / 2 + 70);
      
      // Reset shadow
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
    }

    // 2. CAMERA LAYER - Only render when camera is enabled and stream is active
    if (cameraEnabled && cameraStream && videoRef.current) {
      const video = videoRef.current;
      if (video.readyState >= 2 && video.videoWidth > 0) {
        // Calculate aspect ratio preserving dimensions for overlay (not full screen)
        const overlaySize = Math.min(canvas.width * 0.25, canvas.height * 0.3);
        const videoAspect = video.videoWidth / video.videoHeight;
        
        let cameraWidth, cameraHeight;
        if (videoAspect > 1) {
          cameraWidth = overlaySize;
          cameraHeight = overlaySize / videoAspect;
        } else {
          cameraHeight = overlaySize;
          cameraWidth = overlaySize * videoAspect;
        }

        // Position camera overlay in bottom-right corner
        const cameraX = canvas.width - cameraWidth - 20;
        const cameraY = canvas.height - cameraHeight - 20;

        // Draw camera feed as overlay with border
        ctx.save();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3;
        ctx.strokeRect(cameraX - 2, cameraY - 2, cameraWidth + 4, cameraHeight + 4);
        ctx.drawImage(video, cameraX, cameraY, cameraWidth, cameraHeight);
        ctx.restore();
        
        // Log camera rendering occasionally for debugging
        if (Math.random() < 0.01) {
          console.log(`📹 Camera overlay rendered: ${cameraWidth.toFixed(0)}x${cameraHeight.toFixed(0)} at (${cameraX.toFixed(0)},${cameraY.toFixed(0)})`);
        }
      }
    } else if (cameraEnabled) {
      // Camera is enabled but not ready - show placeholder
      if (Math.random() < 0.01) {
        console.log(`⏳ Camera enabled but not ready: stream=${!!cameraStream}, video=${!!videoRef.current}, readyState=${videoRef.current?.readyState}`);
      }
    }

    // 3. AVATAR LAYER
    if (avatarEnabled && selectedAvatar) {
      ctx.save();
      ctx.globalAlpha = (avatarOpacity[0] || 100) / 100;
      
      // Avatar rendering would go here
      // For now, just a placeholder circle
      ctx.fillStyle = '#ff6b6b';
      ctx.beginPath();
      ctx.arc(canvas.width / 2, canvas.height / 2, 50, 0, 2 * Math.PI);
      ctx.fill();
      
      ctx.restore();
    }

    // 4. SCENE LIGHTING EFFECTS (Clean Implementation)
    if (sceneLighting) {
      const centerX = canvas.width * 0.5;
      const centerY = canvas.height * 0.45;
      const keyIntensity = sceneLighting.lightIntensity / 100;
      
      ctx.save();
      
      // Only apply vignette if light intensity is significantly reduced
      if (keyIntensity < 0.85) {
        const vignetteRadius = Math.max(canvas.width, canvas.height) * 0.9;
        const transparentRadius = vignetteRadius * 0.3; // Large transparent center
        
        const vignetteGradient = ctx.createRadialGradient(
          centerX, centerY, transparentRadius,
          centerX, centerY, vignetteRadius
        );
        
        const vignetteStrength = (100 - sceneLighting.lightIntensity) / 100;
        
        // Pure black vignette with transparent center
        vignetteGradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
        vignetteGradient.addColorStop(0.4, 'rgba(0, 0, 0, 0)');
        vignetteGradient.addColorStop(0.7, `rgba(0, 0, 0, ${vignetteStrength * 0.15})`);
        vignetteGradient.addColorStop(0.9, `rgba(0, 0, 0, ${vignetteStrength * 0.4})`);
        vignetteGradient.addColorStop(1, `rgba(0, 0, 0, ${vignetteStrength * 0.6})`);
        
        ctx.globalCompositeOperation = 'multiply';
        ctx.fillStyle = vignetteGradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
      
      ctx.restore();
    }

    // Trigger frame capture callback for RTMP streaming
    if (onFrameCapture) {
      onFrameCapture(canvas);
    }
  }, [
    backgroundType,
    selectedVirtualBg,
    solidColor,
    cameraEnabled,
    cameraStream,
    avatarEnabled,
    selectedAvatar,
    avatarOpacity,
    sceneLighting,
    backgroundImages,
    imagesLoaded,
    onFrameCapture
  ]);

  // Animation loop with 30 FPS rate limiting for X.com compatibility
  useEffect(() => {
    let lastFrameTime = 0;
    const targetFPS = 30;
    const frameInterval = 1000 / targetFPS; // 33.33ms per frame

    const animate = (currentTime: number) => {
      if (currentTime - lastFrameTime >= frameInterval) {
        renderFrame();
        lastFrameTime = currentTime;
      }
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [renderFrame]);

  // Setup frame interval for RTMP capture - only when backgrounds are loaded
  useEffect(() => {
    if (onFrameCapture && canvasRef.current && imagesLoaded) {
      console.log('🎬 Starting RTMP frame capture with loaded backgrounds');
      
      // Wait a moment for canvas to render before starting capture
      const startCapture = () => {
        frameIntervalRef.current = setInterval(() => {
          if (canvasRef.current) {
            // Force a render before capture to ensure fresh content
            renderFrame();
            
            // Verify canvas has content before sending
            const ctx = canvasRef.current.getContext('2d');
            const imageData = ctx?.getImageData(0, 0, canvasRef.current.width, canvasRef.current.height);
            const hasContent = imageData && Array.from(imageData.data).some(pixel => pixel !== 0);
            
            if (hasContent) {
              onFrameCapture(canvasRef.current);
            } else {
              console.warn('⚠️ Canvas has no content, skipping frame');
            }
          }
        }, 1000 / 30);
      };

      // Delay capture start to ensure canvas has rendered
      const timeoutId = setTimeout(startCapture, 1000);

      return () => {
        clearTimeout(timeoutId);
        if (frameIntervalRef.current) {
          clearInterval(frameIntervalRef.current);
        }
      };
    }
  }, [onFrameCapture, imagesLoaded, renderFrame]);

  return (
    <div className="relative w-full h-full">
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="w-full h-full object-contain bg-black"
        style={{ maxWidth: '100%', maxHeight: '100%' }}
      />
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        className="hidden"
      />
    </div>
  );
};