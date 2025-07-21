// Grok-Optimized Motion Tracker - 2025-07-17T01:44:41.479Z

To create an enhanced version of the MediaPipe tracking system that meets the specified requirements, we'll need to modify and extend the existing MotionTracker class. Here's a step-by-step approach to implementing these enhancements in TypeScript:

1. We'll start by preserving the existing functionality and structure.
2. We'll add avatar orientation tracking using the face landmarks.
3. We'll enhance face tracking for forward-facing detection and head rotation.
4. We'll implement dynamic positioning calculations for IRL streamer-like behavior.
5. We'll optimize performance for real-time streaming.
6. We'll ensure seamless integration with the existing streaming canvas.
7. We'll add a proper callback system for avatar updates.

Here's the complete TypeScript code for the enhanced MotionTracker:

```typescript
import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";
import { Vector3 } from "three";

interface MotionTrackerOptions {
  canvasElement: HTMLCanvasElement;
  videoElement: HTMLVideoElement;
  onAvatarUpdate: (avatarData: AvatarData) => void;
}

interface AvatarData {
  blendShapes: Record<string, number>;
  orientation: {
    yaw: number;
    pitch: number;
    roll: number;
  };
  position: {
    x: number;
    y: number;
    z: number;
  };
  isForwardFacing: boolean;
}

class MotionTracker {
  private faceLandmarker: FaceLandmarker | null = null;
  private canvasCtx: CanvasRenderingContext2D;
  private videoElement: HTMLVideoElement;
  private lastUpdateTime: number = 0;
  private onAvatarUpdate: (avatarData: AvatarData) => void;

  constructor(options: MotionTrackerOptions) {
    this.canvasCtx = options.canvasElement.getContext("2d")!;
    this.videoElement = options.videoElement;
    this.onAvatarUpdate = options.onAvatarUpdate;

    this.initializeFaceLandmarker();
  }

  private async initializeFaceLandmarker() {
    const vision = await FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm"
    );
    this.faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: `https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task`,
        delegate: "GPU"
      },
      outputFaceBlendshapes: true,
      runningMode: "VIDEO",
      numFaces: 1
    });

    this.startTracking();
  }

  private startTracking() {
    requestAnimationFrame(this.track.bind(this));
  }

  private track(timestamp: number) {
    if (this.faceLandmarker && this.videoElement.readyState === this.videoElement.HAVE_ENOUGH_DATA) {
      const startTime = performance.now();

      this.canvasCtx.drawImage(
        this.videoElement,
        0,
        0,
        this.canvasCtx.canvas.width,
        this.canvasCtx.canvas.height
      );
      const faceLandmarkerResult = this.faceLandmarker.detectForVideo(
        this.videoElement,
        timestamp
      );

      if (faceLandmarkerResult.faceLandmarks && faceLandmarkerResult.faceLandmarks.length > 0) {
        const landmarks = faceLandmarkerResult.faceLandmarks[0];
        const blendShapes = this.processBlendShapes(faceLandmarkerResult.faceBlendshapes[0]);
        const orientation = this.calculateOrientation(landmarks);
        const position = this.calculateDynamicPosition(landmarks);
        const isForwardFacing = this.isForwardFacing(landmarks);

        const avatarData: AvatarData = {
          blendShapes,
          orientation,
          position,
          isForwardFacing
        };

        this.onAvatarUpdate(avatarData);
      }

      const endTime = performance.now();
      const frameTime = endTime - startTime;
      const targetFrameTime = 1000 / 30; // Target 30 FPS

      if (frameTime < targetFrameTime) {
        setTimeout(() => requestAnimationFrame(this.track.bind(this)), targetFrameTime - frameTime);
      } else {
        requestAnimationFrame(this.track.bind(this));
      }
    } else {
      requestAnimationFrame(this.track.bind(this));
    }
  }

  private processBlendShapes(blendShapes: any): Record<string, number> {
    const result: Record<string, number> = {};
    for (const category of blendShapes.categories) {
      for (const entry of category.classifications) {
        result[entry.displayName] = entry.score;
      }
    }
    return result;
  }

  private calculateOrientation(landmarks: any): { yaw: number; pitch: number; roll: number } {
    const nose = new Vector3(landmarks[1][0], landmarks[1][1], landmarks[1][2]);
    const leftEye = new Vector3(landmarks[33][0], landmarks[33][1], landmarks[33][2]);
    const rightEye = new Vector3(landmarks[263][0], landmarks[263][1], landmarks[263][2]);

    const eyeVector = rightEye.clone().sub(leftEye);
    const eyeToNose = nose.clone().sub(leftEye.add(rightEye).multiplyScalar(0.5));

    const yaw = Math.atan2(eyeVector.z, eyeVector.x);
    const pitch = Math.atan2(eyeToNose.y, Math.sqrt(eyeToNose.x * eyeToNose.x + eyeToNose.z * eyeToNose.z));
    const roll = Math.atan2(-eyeVector.y, Math.sqrt(eyeVector.x * eyeVector.x + eyeVector.z * eyeVector.z));

    return {
      yaw: yaw * (180 / Math.PI),
      pitch: pitch * (180 / Math.PI),
      roll: roll * (180 / Math.PI)
    };
  }

  private calculateDynamicPosition(landmarks: any): { x: number; y: number; z: number } {
    const nose = new Vector3(landmarks[1][0], landmarks[1][1], landmarks[1][2]);
    const faceCenter = new Vector3(0, 0, 0);

    for (const landmark of landmarks) {
      faceCenter.add(new Vector3(landmark[0], landmark[1], landmark[2]));
    }

    faceCenter.divideScalar(landmarks.length);

    const position = nose.clone().sub(faceCenter);
    position.multiplyScalar(0.1); // Scale down for IRL-like behavior

    return {
      x: position.x,
      y: position.y,
      z: position.z
    };
  }

  private isForwardFacing(landmarks: any): boolean {
    const leftEye = new Vector3(landmarks[33][0], landmarks[33][1], landmarks[33][2]);
    const rightEye = new Vector3(landmarks[263][0], landmarks[263][1], landmarks[263][2]);
    const nose = new Vector3(landmarks[1][0], landmarks[1][1], landmarks[1][2]);

    const eyeVector = rightEye.clone().sub(leftEye);
    const noseVector = nose.clone().sub(leftEye.add(rightEye).multiplyScalar(0.5));

    const dotProduct = eyeVector.dot(noseVector);
    const eyeVectorLength = eyeVector.length();
    const noseVectorLength = noseVector.length();

    const angle = Math.acos(dotProduct / (eyeVectorLength * noseVectorLength));

    return angle < Math.PI / 4; // 45 degrees threshold
  }
}

export default MotionTracker;
```

This enhanced MotionTracker class addresses all the specified requirements:

1. **Preserves existing functionality**: The core structure and blend shape calculations are maintained.

2. **Adds avatar orientation capabilities**: The `calculateOrientation` method uses face landmarks to determine yaw, pitch, and roll of the avatar.

3. **Enhances face tracking**: 
   - Forward-facing detection is implemented in the `isForwardFacing` method.
   - Head rotation is captured in the orientation calculations.

4. **Adds dynamic positioning calculations**: The `calculateDynamicPosition` method provides IRL streamer-like behavior by calculating a dynamic position based on face landmarks.

5. **Optimizes performance**: 
   - The tracking loop is optimized to target 30 FPS, adjusting frame rate dynamically.
   - GPU acceleration is used for face landmark detection.

6. **Integrates seamlessly with the existing streaming canvas**: The class still uses the provided canvas and video elements for rendering.

7. **Adds proper callback system for avatar updates**: The `onAvatarUpdate` callback is called with the complete `AvatarData` object, including blend shapes, orientation, position, and forward-facing status.

To use this enhanced MotionTracker, you would initialize it similarly to the original version, but now you'll receive more comprehensive avatar data:

```typescript
const motionTracker = new MotionTracker({
  canvasElement: yourCanvasElement,
  videoElement: yourVideoElement,
  onAvatarUpdate: (avatarData) => {
    // Use avatarData.blendShapes, avatarData.orientation, avatarData.position, and avatarData.isForwardFacing
    // to update your avatar in real-time
  }
});
```

This implementation serves as a drop-in replacement that extends the current capabilities of the MotionTracker, providing more detailed and dynamic avatar tracking suitable for IRL streaming scenarios.