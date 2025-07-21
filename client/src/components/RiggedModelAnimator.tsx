import { useEffect, useRef } from 'react';

interface RiggedModelAnimatorProps {
  modelUrl: string;
  className?: string;
  enableTracking?: boolean;
  faceTracking?: boolean;
  bodyTracking?: boolean;
  handTracking?: boolean;
  avatarType?: string;
  isRigged?: boolean;
  cameraStream?: MediaStream | null;
  videoElement?: HTMLVideoElement | null;
}

interface BoneMapping {
  [key: string]: string;
}

interface MorphMapping {
  [key: string]: string;
}

export default function RiggedModelAnimator({ 
  modelUrl, 
  className = '', 
  enableTracking = false, 
  faceTracking = false, 
  bodyTracking = false, 
  handTracking = false, 
  avatarType = 'fullbody', 
  isRigged = false, 
  cameraStream = null, 
  videoElement = null 
}: RiggedModelAnimatorProps) {
  const modelViewerRef = useRef<any>(null);
  const animationFrameRef = useRef<number>();

  // Bone mapping for rigged models
  const boneMapping: BoneMapping = {
    // Head and Neck
    'head': 'Head',
    'neck': 'Neck',
    'jaw': 'Jaw',
    
    // Spine
    'spine1': 'Spine1',
    'spine2': 'Spine2',
    'spine3': 'Spine3',
    
    // Arms and Shoulders
    'leftShoulder': 'LeftShoulder',
    'rightShoulder': 'RightShoulder',
    'leftUpperArm': 'LeftUpperArm',
    'rightUpperArm': 'RightUpperArm',
    'leftLowerArm': 'LeftLowerArm',
    'rightLowerArm': 'RightLowerArm',
    'leftHand': 'LeftHand',
    'rightHand': 'RightHand',
    
    // Fingers - Left Hand
    'leftThumb1': 'LeftThumb1',
    'leftThumb2': 'LeftThumb2',
    'leftThumb3': 'LeftThumb3',
    'leftIndex1': 'LeftIndex1',
    'leftIndex2': 'LeftIndex2',
    'leftIndex3': 'LeftIndex3',
    'leftMiddle1': 'LeftMiddle1',
    'leftMiddle2': 'LeftMiddle2',
    'leftMiddle3': 'LeftMiddle3',
    'leftRing1': 'LeftRing1',
    'leftRing2': 'LeftRing2',
    'leftRing3': 'LeftRing3',
    'leftPinky1': 'LeftPinky1',
    'leftPinky2': 'LeftPinky2',
    'leftPinky3': 'LeftPinky3',
    
    // Fingers - Right Hand
    'rightThumb1': 'RightThumb1',
    'rightThumb2': 'RightThumb2',
    'rightThumb3': 'RightThumb3',
    'rightIndex1': 'RightIndex1',
    'rightIndex2': 'RightIndex2',
    'rightIndex3': 'RightIndex3',
    'rightMiddle1': 'RightMiddle1',
    'rightMiddle2': 'RightMiddle2',
    'rightMiddle3': 'RightMiddle3',
    'rightRing1': 'RightRing1',
    'rightRing2': 'RightRing2',
    'rightRing3': 'RightRing3',
    'rightPinky1': 'RightPinky1',
    'rightPinky2': 'RightPinky2',
    'rightPinky3': 'RightPinky3',
    
    // Legs and Hips
    'leftHip': 'LeftHip',
    'rightHip': 'RightHip',
    'leftUpperLeg': 'LeftUpperLeg',
    'rightUpperLeg': 'RightUpperLeg',
    'leftLowerLeg': 'LeftLowerLeg',
    'rightLowerLeg': 'RightLowerLeg',
    'leftFoot': 'LeftFoot',
    'rightFoot': 'RightFoot'
  };

  // Morph target mapping for facial expressions
  const morphMapping: MorphMapping = {
    // Basic expressions
    'jawOpen': 'jawOpen',
    'mouthSmile': 'mouthSmile',
    'eyeBlinkLeft': 'eyeBlinkLeft',
    'eyeBlinkRight': 'eyeBlinkRight',
    
    // Advanced facial expressions
    'browRaiseInner': 'browInnerUp',
    'browRaiseOuter': 'browOuterUpLeft',
    'cheekPuff': 'cheekPuff',
    'mouthPucker': 'mouthPucker',
    'noseSneer': 'noseSneerLeft',
    'eyeSquint': 'eyeSquintLeft',
    
    // Additional expressions
    'mouthFrown': 'mouthFrownLeft',
    'mouthPress': 'mouthPressLeft',
    'eyeWide': 'eyeWideLeft',
    'mouthRollUpper': 'mouthRollUpper',
    'mouthRollLower': 'mouthRollLower',
    'jawLeft': 'jawLeft',
    'jawRight': 'jawRight',
    'mouthLeft': 'mouthLeft',
    'mouthRight': 'mouthRight',
    'cheekSquintLeft': 'cheekSquintLeft',
    'cheekSquintRight': 'cheekSquintRight'
  };

  const applyBoneTransforms = (trackingData: any) => {
    if (!modelElement || !isRigged) return;

    try {
      // Apply head rotation
      if (trackingData.face?.rotation) {
        const { x, y, z } = trackingData.face.rotation;
        setBoneRotation('head', x, y, z);
        setBoneRotation('neck', x * 0.3, y * 0.3, z * 0.3);
      }

      // Apply body pose
      if (trackingData.pose?.angles) {
        const angles = trackingData.pose.angles;
        
        // Shoulders
        setBoneRotation('leftShoulder', 0, 0, angles.leftShoulder || 0);
        setBoneRotation('rightShoulder', 0, 0, angles.rightShoulder || 0);
        
        // Arms
        setBoneRotation('leftUpperArm', angles.leftElbow * 0.3 || 0, 0, 0);
        setBoneRotation('rightUpperArm', angles.rightElbow * 0.3 || 0, 0, 0);
        setBoneRotation('leftLowerArm', angles.leftElbow * 0.7 || 0, 0, 0);
        setBoneRotation('rightLowerArm', angles.rightElbow * 0.7 || 0, 0, 0);
        
        // Spine
        setBoneRotation('spine1', angles.spine * 0.3 || 0, 0, 0);
        setBoneRotation('spine2', angles.spine * 0.4 || 0, 0, 0);
        setBoneRotation('spine3', angles.spine * 0.3 || 0, 0, 0);
        
        // Legs
        setBoneRotation('leftHip', 0, 0, angles.leftHip || 0);
        setBoneRotation('rightHip', 0, 0, angles.rightHip || 0);
        setBoneRotation('leftUpperLeg', angles.leftKnee * 0.4 || 0, 0, 0);
        setBoneRotation('rightUpperLeg', angles.rightKnee * 0.4 || 0, 0, 0);
        setBoneRotation('leftLowerLeg', angles.leftKnee * 0.6 || 0, 0, 0);
        setBoneRotation('rightLowerLeg', angles.rightKnee * 0.6 || 0, 0, 0);
      }

      // Apply hand tracking
      if (trackingData.hands) {
        applyHandTracking(trackingData.hands.left, 'left');
        applyHandTracking(trackingData.hands.right, 'right');
      }

    } catch (error) {
      console.warn('Error applying bone transforms:', error);
    }
  };

  const applyHandTracking = (handData: any, side: 'left' | 'right') => {
    if (!handData?.landmarks) return;

    // Simplified finger tracking - map to major finger bones
    const fingers = ['thumb', 'index', 'middle', 'ring', 'pinky'];
    
    fingers.forEach((finger, fingerIndex) => {
      for (let joint = 1; joint <= 3; joint++) {
        const boneName = `${side}${finger.charAt(0).toUpperCase() + finger.slice(1)}${joint}`;
        const landmarkIndex = fingerIndex * 4 + joint;
        
        if (handData.landmarks[landmarkIndex]) {
          const landmark = handData.landmarks[landmarkIndex];
          // Convert landmark position to rotation
          const rotX = (landmark.y - 0.5) * 60; // Finger curl
          const rotZ = (landmark.x - 0.5) * 30; // Finger spread
          setBoneRotation(boneName, rotX, 0, rotZ);
        }
      }
    });
  };

  const setBoneRotation = (boneName: string, rotX: number, rotY: number, rotZ: number) => {
    if (!modelViewerRef.current || !isRigged) return;

    try {
      // Convert to radians
      const x = (rotX * Math.PI) / 180;
      const y = (rotY * Math.PI) / 180;
      const z = (rotZ * Math.PI) / 180;

      // Access Three.js scene from model-viewer
      const scene = modelViewerRef.current.model?.scene;
      if (!scene) {
        console.warn('🦴 No Three.js scene found in model element');
        return;
      }

      // Find the bone in the Three.js scene
      const mappedBoneName = boneMapping[boneName] || boneName;
      const bone = findBoneInScene(scene, mappedBoneName);
      
      if (bone && bone.isObject3D) {
        console.log(`🦴 Setting bone ${boneName} rotation:`, { x: rotX, y: rotY, z: rotZ });
        // Apply rotation directly to the bone
        bone.rotation.set(x, y, z);
        
        // Mark as needing update
        if (bone.parent && bone.parent.skeleton) {
          bone.parent.skeleton.pose();
        }
      } else {
        console.warn(`🦴 Bone ${boneName} (mapped: ${mappedBoneName}) not found in scene`);
      }
    } catch (error) {
      console.warn(`Error setting bone rotation for ${boneName}:`, error);
    }
  };

  const findBoneInScene = (object: any, boneName: string): any => {
    if (!object) return null;
    
    // Check if this object is the bone we're looking for
    if (object.name === boneName || object.name.toLowerCase().includes(boneName.toLowerCase())) {
      return object;
    }
    
    // Search children recursively
    if (object.children) {
      for (const child of object.children) {
        const found = findBoneInScene(child, boneName);
        if (found) return found;
      }
    }
    
    // Check skeleton bones if this is a SkinnedMesh
    if (object.skeleton && object.skeleton.bones) {
      for (const bone of object.skeleton.bones) {
        if (bone.name === boneName || bone.name.toLowerCase().includes(boneName.toLowerCase())) {
          return bone;
        }
      }
    }
    
    return null;
  };

  const applyMorphTargets = (trackingData: any) => {
    if (!modelViewerRef.current || !isRigged || !trackingData.face?.blendShapes) return;

    try {
      const blendShapes = trackingData.face.blendShapes;
      
      Object.entries(blendShapes).forEach(([shapeName, value]) => {
        const mappedName = morphMapping[shapeName] || shapeName;
        setMorphTarget(mappedName, value as number);
      });

    } catch (error) {
      console.warn('Error applying morph targets:', error);
    }
  };

  const setMorphTarget = (morphName: string, value: number) => {
    if (!modelElement || !isRigged) return;

    try {
      // Clamp value between 0 and 1
      const clampedValue = Math.max(0, Math.min(1, value));
      
      // Access Three.js scene from model-viewer
      const scene = modelViewerRef.current.model?.scene;
      if (!scene) {
        console.warn('🎭 No scene available in model element');
        return;
      }

      // Find mesh with morph targets
      const mesh = findMeshWithMorphTargets(scene);
      if (!mesh) {
        console.warn('🎭 No mesh with morph targets found in scene');
        return;
      }

      if (!mesh.morphTargetDictionary || !mesh.morphTargetInfluences) {
        console.warn('🎭 Mesh has no morph target dictionary or influences:', {
          hasDictionary: !!mesh.morphTargetDictionary,
          hasInfluences: !!mesh.morphTargetInfluences,
          availableTargets: mesh.morphTargetDictionary ? Object.keys(mesh.morphTargetDictionary) : []
        });
        return;
      }

      // Find morph target index
      const morphIndex = mesh.morphTargetDictionary[morphName];
      if (morphIndex !== undefined && morphIndex < mesh.morphTargetInfluences.length) {
        console.log(`🎭 Setting morph target ${morphName} (index ${morphIndex}) to ${clampedValue}`);
        // Apply morph target influence
        mesh.morphTargetInfluences[morphIndex] = clampedValue;
        
        // Force update
        mesh.morphTargetInfluences.needsUpdate = true;
      } else {
        // List available morph targets for debugging
        const availableTargets = Object.keys(mesh.morphTargetDictionary);
        console.warn(`🎭 Morph target "${morphName}" not found. Available targets:`, availableTargets);
        
        // Try common variations
        const variations = [
          morphName.toLowerCase(),
          morphName.toUpperCase(),
          `morph_${morphName}`,
          `${morphName}Shape`,
          `blend_${morphName}`,
          `face_${morphName}`
        ];
        
        for (const variation of variations) {
          const varIndex = mesh.morphTargetDictionary[variation];
          if (varIndex !== undefined) {
            console.log(`🎭 Found variation "${variation}" for ${morphName}, applying value ${clampedValue}`);
            mesh.morphTargetInfluences[varIndex] = clampedValue;
            mesh.morphTargetInfluences.needsUpdate = true;
            return;
          }
        }
      }
    } catch (error) {
      console.warn(`Error setting morph target ${morphName}:`, error);
    }
  };

  const findMeshWithMorphTargets = (object: any): any => {
    if (!object) return null;
    
    // Check if this object has morph targets
    if (object.morphTargetDictionary && object.morphTargetInfluences) {
      return object;
    }
    
    // Search children recursively
    if (object.children) {
      for (const child of object.children) {
        const found = findMeshWithMorphTargets(child);
        if (found) return found;
      }
    }
    
    return null;
  };

  const animateModel = () => {
    // This will be handled by the MotionTracker component
    // No need for animation loop here since we're using model-viewer
    console.log('🎭 RiggedModelAnimator: Animation setup complete');
  };

  useEffect(() => {
    if (!modelViewerRef.current || !isRigged) return;

    // Initialize animation capabilities
    animateModel();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [modelViewerRef.current, isRigged]);

  // Effect to handle model loading and setup
  useEffect(() => {
    if (!modelViewerRef.current) return;
    
    const modelViewer = modelViewerRef.current;
    
    const handleModelLoad = () => {
      console.log('🎭 RiggedModelAnimator: Model loaded successfully');
      
      // Configure model-viewer for streaming - center avatar for upper torso view
      modelViewer.cameraOrbit = '0deg 90deg 1.8m';  // Front-facing view, closer for upper torso
      modelViewer.fieldOfView = '40deg';  // Adjusted field of view for better framing
      modelViewer.cameraTarget = '0m 0.5m 0m';  // Target upper torso area
      modelViewer.minCameraOrbit = 'auto auto 1m';
      modelViewer.maxCameraOrbit = 'auto auto 3m';
      modelViewer.cameraControls = false;
      modelViewer.touchAction = 'none';
      modelViewer.disablePan = true;
      modelViewer.disableZoom = true;
      modelViewer.autoRotate = false;
      
      // Set up for streaming layout
      modelViewer.style.width = '100%';
      modelViewer.style.height = '100%';
      
      // Debug positioning
      console.log('🎭 Avatar positioning:', {
        containerWidth: modelViewer.clientWidth,
        containerHeight: modelViewer.clientHeight,
        cameraOrbit: modelViewer.cameraOrbit,
        fieldOfView: modelViewer.fieldOfView
      });
      
      if (enableTracking && (faceTracking || bodyTracking || handTracking)) {
        console.log('🎭 RiggedModelAnimator: Tracking enabled');
        // Tracking setup will be handled by MotionTracker component
      }
    };
    
    modelViewer.addEventListener('load', handleModelLoad);
    
    return () => {
      modelViewer.removeEventListener('load', handleModelLoad);
    };
  }, [modelUrl, enableTracking, faceTracking, bodyTracking, handTracking]);

  return (
    <div className={`rigged-model-animator ${className}`} style={{ width: '100%', height: '100%' }}>
      <model-viewer
        ref={modelViewerRef}
        src={modelUrl}
        alt="3D Avatar"
        auto-rotate={false}
        camera-controls={false}
        touch-action="none"
        disable-pan={true}
        disable-zoom={true}
        style={{ 
          width: '100%', 
          height: '100%',
          backgroundColor: 'transparent'
        }}
        camera-orbit="0deg 90deg 1.8m"
        field-of-view="40deg"
        min-camera-orbit="auto auto 1m"
        max-camera-orbit="auto auto 3m"
        camera-target="0m 0.5m 0m"
        auto-rotate-delay="0"
      />
    </div>
  );
}