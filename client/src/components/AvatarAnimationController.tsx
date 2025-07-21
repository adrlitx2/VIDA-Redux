import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { avatarRiggingService, type RiggingConfiguration } from '@/services/avatar-rigging-service';

interface AvatarAnimationControllerProps {
  avatarUrl: string;
  userPlan?: string;
  onAnimationUpdate?: (data: any) => void;
  autoFrame?: boolean;
  zoomLevel?: number;
  onAutoFrameComplete?: () => void;
}

export function AvatarAnimationController({ 
  avatarUrl, 
  userPlan = 'free', 
  onAnimationUpdate,
  autoFrame = false,
  zoomLevel = 1.0,
  onAutoFrameComplete
}: AvatarAnimationControllerProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const modelRef = useRef<THREE.Group | null>(null);
  const animationMixerRef = useRef<THREE.AnimationMixer | null>(null);
  const virtualBonesRef = useRef<{ [key: string]: THREE.Object3D }>({});
  const [riggingConfig, setRiggingConfig] = useState<RiggingConfiguration | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [baseZoom, setBaseZoom] = useState(1.0);

  // Initialize rigging service with user's plan
  useEffect(() => {
    const initializeRigging = async () => {
      try {
        await avatarRiggingService.initialize(userPlan);
        const config = avatarRiggingService.getCurrentConfig();
        setRiggingConfig(config);
        setIsInitialized(true);
      } catch (error) {
        console.error('Failed to initialize rigging service:', error);
      }
    };

    initializeRigging();

    // Subscribe to configuration changes
    const handleConfigChange = (config: RiggingConfiguration) => {
      setRiggingConfig(config);
      applyRiggingConfiguration(config);
    };

    avatarRiggingService.onConfigurationChange(handleConfigChange);

    return () => {
      avatarRiggingService.removeConfigurationListener(handleConfigChange);
    };
  }, [userPlan]);

  // Apply zoom level changes
  useEffect(() => {
    if (cameraRef.current && baseZoom > 0) {
      const camera = cameraRef.current;
      const newDistance = baseZoom / zoomLevel;
      
      // Maintain the current look-at target while adjusting distance
      const direction = new THREE.Vector3();
      camera.getWorldDirection(direction);
      direction.normalize();
      
      // Move camera backward/forward along the view direction
      const lookAtTarget = new THREE.Vector3(0, camera.position.y, 0);
      const newPosition = lookAtTarget.clone().sub(direction.multiplyScalar(newDistance));
      
      camera.position.copy(newPosition);
      camera.lookAt(lookAtTarget);
    }
  }, [zoomLevel, baseZoom]);

  // Apply rigging configuration to the avatar system
  const applyRiggingConfiguration = (config: RiggingConfiguration) => {
    if (!modelRef.current || !config) return;

    // Update virtual bone structure based on subscription limits
    updateVirtualBoneStructure(config);
    
    // Apply animation quality settings
    if (animationMixerRef.current) {
      const timeScale = config.animationResponsiveness;
      animationMixerRef.current.timeScale = timeScale;
    }
  };

  // Update virtual bone structure based on subscription configuration
  const updateVirtualBoneStructure = (config: RiggingConfiguration) => {
    if (!modelRef.current) return;

    // Clear existing virtual bones
    Object.values(virtualBonesRef.current).forEach(bone => {
      modelRef.current?.remove(bone);
    });
    virtualBonesRef.current = {};

    // Create virtual bones based on subscription limits
    const maxBones = config.maxBones;
    const bones = createSubscriptionBasedBones(modelRef.current, maxBones, config);
    virtualBonesRef.current = bones;
  };

  // Create virtual bone structure based on subscription tier
  const createSubscriptionBasedBones = (
    model: THREE.Group, 
    maxBones: number, 
    config: RiggingConfiguration
  ): { [key: string]: THREE.Object3D } => {
    const virtualBones: { [key: string]: THREE.Object3D } = {};
    
    if (maxBones === 0) return virtualBones; // Free plan gets no bones

    // Calculate model bounds for bone positioning
    const box = new THREE.Box3().setFromObject(model);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());

    let boneCount = 0;

    // Priority order for bone creation based on subscription value
    const bonePriority = [
      { name: 'head', position: [0, 0.35, 0] },
      { name: 'neck', position: [0, 0.25, 0] },
      { name: 'spine', position: [0, 0, 0] },
      { name: 'leftShoulder', position: [-0.3, 0.15, 0] },
      { name: 'rightShoulder', position: [0.3, 0.15, 0] },
      { name: 'leftUpperArm', position: [-0.4, 0.05, 0] },
      { name: 'rightUpperArm', position: [0.4, 0.05, 0] },
      { name: 'leftLowerArm', position: [-0.5, -0.1, 0] },
      { name: 'rightLowerArm', position: [0.5, -0.1, 0] },
      { name: 'leftHand', position: [-0.6, -0.2, 0] },
      { name: 'rightHand', position: [0.6, -0.2, 0] },
      { name: 'hips', position: [0, -0.15, 0] },
      { name: 'leftUpperLeg', position: [-0.15, -0.3, 0] },
      { name: 'rightUpperLeg', position: [0.15, -0.3, 0] },
      { name: 'leftLowerLeg', position: [-0.15, -0.45, 0] },
      { name: 'rightLowerLeg', position: [0.15, -0.45, 0] },
    ];

    // Create bones up to the subscription limit
    for (const boneInfo of bonePriority) {
      if (boneCount >= maxBones) break;

      const bone = new THREE.Object3D();
      bone.position.set(
        center.x + boneInfo.position[0] * size.x,
        center.y + boneInfo.position[1] * size.y,
        center.z + boneInfo.position[2] * size.z
      );
      bone.name = `Virtual${boneInfo.name.charAt(0).toUpperCase() + boneInfo.name.slice(1)}`;
      model.add(bone);
      virtualBones[boneInfo.name] = bone;
      boneCount++;
    }

    return virtualBones;
  };

  // Analyze model geometry to find anatomical landmarks
  const findAnatomicalLandmarks = (model: THREE.Group) => {
    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    
    // Use bounding box with anatomically-informed proportions
    // Based on standard human proportions (8 head lengths total)
    const modelTop = box.max.y;
    const modelBottom = box.min.y;
    const totalHeight = modelTop - modelBottom;
    
    // Standard anatomical proportions from art/medical references
    const headTop = modelTop; // Top of model
    const neckBase = modelTop - (totalHeight * 0.1); // ~1/8 down from top
    const shoulderLevel = modelTop - (totalHeight * 0.15); // ~1/6 down from top  
    const chestLevel = modelTop - (totalHeight * 0.25); // ~1/4 down from top
    const waistLevel = modelTop - (totalHeight * 0.4); // ~2/5 down from top (natural waist)
    const hipLevel = modelTop - (totalHeight * 0.5); // ~1/2 down from top
    const crotchLevel = modelTop - (totalHeight * 0.6); // ~3/5 down from top
    
    // Define torso as chest to waist for framing purposes
    const torsoTop = headTop;
    const torsoBottom = waistLevel;
    const torsoHeight = torsoTop - torsoBottom;
    
    return {
      headTop,
      neckBase,
      shoulderLevel,
      chestLevel,
      waistLevel,
      hipLevel,
      crotchLevel,
      modelBottom,
      torsoBottom,
      torsoTop,
      torsoHeight,
      totalHeight
    };
  };

  // Auto-frame avatar to show torso up, covering 7/8ths of preview height
  const autoFrameAvatar = (model: THREE.Group, camera: THREE.PerspectiveCamera) => {
    // Get model bounding box
    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    
    // Simple approach: Show upper 60% of model (torso up)
    const modelTop = box.max.y;
    const modelBottom = box.min.y;
    const totalHeight = size.y;
    
    // Define torso region as upper 60% of the model
    const torsoHeight = totalHeight * 0.6;
    const torsoTop = modelTop;
    const torsoBottom = modelTop - torsoHeight;
    
    // Calculate camera distance to fit torso to 7/8ths of view
    const fov = camera.fov * (Math.PI / 180);
    const distance = torsoHeight / (2 * Math.tan(fov / 2) * (7/8));
    
    // Position model so torso bottom is at bottom of view
    const modelOffsetY = -torsoBottom;
    model.position.set(0, modelOffsetY, 0);
    
    // Camera looks at center of torso region after offset
    const torsoMidY = torsoBottom + (torsoHeight / 2) + modelOffsetY;
    camera.position.set(0, torsoMidY, distance);
    camera.lookAt(0, torsoMidY, 0);
    
    setBaseZoom(distance);
    
    console.log('Auto-framed avatar (simple approach):', {
      modelBounds: { top: modelTop, bottom: modelBottom, height: totalHeight },
      torsoRegion: { top: torsoTop, bottom: torsoBottom, height: torsoHeight },
      positioning: { modelOffsetY, torsoMidY, distance },
      finalTorsoPos: { 
        top: torsoTop + modelOffsetY, 
        bottom: torsoBottom + modelOffsetY 
      }
    });
  };

  // Initialize Three.js scene
  useEffect(() => {
    if (!mountRef.current || !isInitialized || !riggingConfig) return;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a1a);
    sceneRef.current = scene;

    // Camera setup
    const camera = new THREE.PerspectiveCamera(
      75,
      mountRef.current.clientWidth / mountRef.current.clientHeight,
      0.1,
      1000
    );
    camera.position.set(0, 0, 5);
    cameraRef.current = camera;

    // Renderer setup with performance optimizations
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    
    // Apply performance settings from subscription
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, riggingConfig.processingPriority));
    
    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 10, 5);
    directionalLight.castShadow = true;
    scene.add(directionalLight);

    // Load avatar model
    console.log('🔄 Loading avatar from URL:', avatarUrl);
    const loader = new GLTFLoader();
    
    // Clear existing model first
    if (modelRef.current) {
      scene.remove(modelRef.current);
      modelRef.current = null;
      console.log('🗑️ Cleared previous model');
    }

    loader.load(
      avatarUrl,
      (gltf) => {
        console.log('✅ Avatar loaded successfully from:', avatarUrl);
        const model = gltf.scene;
        model.scale.setScalar(1);
        model.position.set(0, -1, 0);
        scene.add(model);
        modelRef.current = model;
        console.log('🎭 Model added to scene');

        // Apply rigging configuration
        applyRiggingConfiguration(riggingConfig);

        // Auto-frame the avatar to show torso up (7/8ths of preview height)
        if (autoFrame) {
          autoFrameAvatar(model, camera);
          if (onAutoFrameComplete) {
            onAutoFrameComplete();
          }
        }

        // Setup animations if available
        if (gltf.animations && gltf.animations.length > 0) {
          const mixer = new THREE.AnimationMixer(model);
          gltf.animations.forEach((clip) => {
            mixer.clipAction(clip).play();
          });
          animationMixerRef.current = mixer;
          console.log('🎬 Animations setup complete');
        }
      },
      (progress) => {
        const percent = Math.round((progress.loaded / progress.total) * 100);
        console.log(`📦 Loading progress: ${percent}% (${progress.loaded}/${progress.total} bytes)`);
      },
      (error) => {
        console.error('❌ Error loading avatar from:', avatarUrl);
        console.error('Error details:', error);
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
        console.error('Error type:', typeof error);
        console.error('Error constructor:', error.constructor.name);
        
        // Try to fetch the URL directly to see if it's a network issue
        fetch(avatarUrl)
          .then(response => {
            console.error('Direct fetch response status:', response.status);
            console.error('Direct fetch response headers:', Object.fromEntries(response.headers));
            return response.blob();
          })
          .then(blob => {
            console.error('Direct fetch blob size:', blob.size);
            console.error('Direct fetch blob type:', blob.type);
          })
          .catch(fetchError => {
            console.error('Direct fetch also failed:', fetchError);
          });
      }
    );

    // Apply frame rate limiting from subscription
    const targetFrameRate = riggingConfig.maxFrameRate;
    const frameInterval = 1000 / targetFrameRate;
    let lastFrameTime = 0;

    // Render loop
    const render = () => {
      if (animationMixerRef.current) {
        const deltaTime = 0.016 * riggingConfig.animationResponsiveness;
        animationMixerRef.current.update(deltaTime);
      }
      renderer.render(scene, camera);
    };

    const animate = (currentTime: number) => {
      if (currentTime - lastFrameTime >= frameInterval) {
        render();
        lastFrameTime = currentTime;
      }
      requestAnimationFrame(animate);
    };

    animate(0);

    // Handle resize
    const handleResize = () => {
      if (!mountRef.current) return;
      
      camera.aspect = mountRef.current.clientWidth / mountRef.current.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [avatarUrl, isInitialized, riggingConfig]);

  // Update rigging when user plan changes
  useEffect(() => {
    if (isInitialized) {
      avatarRiggingService.updateUserPlan(userPlan);
    }
  }, [userPlan, isInitialized]);

  return (
    <div className="relative w-full h-full">
      <div ref={mountRef} className="w-full h-full" />
      

    </div>
  );
}

export default AvatarAnimationController;