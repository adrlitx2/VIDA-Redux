import { useRef, useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { FaceMesh } from '@mediapipe/face_mesh';
import { Hands } from '@mediapipe/hands';
import { Pose } from '@mediapipe/pose';
import { Camera } from '@mediapipe/camera_utils';

interface TrackingData {
  face: {
    landmarks: number;
    expressions: Record<string, number>;
    headRotation: { x: number; y: number; z: number };
  };
  hands: {
    left: { detected: boolean; landmarks: number; gesture: string };
    right: { detected: boolean; landmarks: number; gesture: string };
  };
  body: {
    pose: { detected: boolean; landmarks: number; confidence: number };
    skeleton: { joints: number; tracking: boolean };
  };
  eyes: {
    left: { openness: number; gaze: { x: number; y: number } };
    right: { openness: number; gaze: { x: number; y: number } };
    blinking: boolean;
  };
  mouth: {
    openness: number;
    shape: string;
    speaking: boolean;
    lipSync: number;
  };
}

export default function RealMediaPipeTracking() {
  const [cameraActive, setCameraActive] = useState(false);
  const [trackingData, setTrackingData] = useState<TrackingData>({
    face: {
      landmarks: 0,
      expressions: { smile: 0, frown: 0, eyebrowRaise: 0, jawDrop: 0 },
      headRotation: { x: 0, y: 0, z: 0 }
    },
    hands: {
      left: { detected: false, landmarks: 0, gesture: 'none' },
      right: { detected: false, landmarks: 0, gesture: 'none' }
    },
    body: {
      pose: { detected: false, landmarks: 0, confidence: 0 },
      skeleton: { joints: 0, tracking: false }
    },
    eyes: {
      left: { openness: 0, gaze: { x: 0, y: 0 } },
      right: { openness: 0, gaze: { x: 0, y: 0 } },
      blinking: false
    },
    mouth: { openness: 0, shape: 'closed', speaking: false, lipSync: 0 }
  });
  const [logs, setLogs] = useState<string[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationRef = useRef<any>(null);
  
  // MediaPipe model references
  const faceMeshRef = useRef<FaceMesh | null>(null);
  const handsRef = useRef<Hands | null>(null);
  const poseRef = useRef<Pose | null>(null);
  const cameraRef = useRef<Camera | null>(null);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [`${timestamp}: ${message}`, ...prev].slice(0, 10));
    console.log(`[Real Tracking] ${message}`);
  };

  const calculateFacialExpressions = (landmarks: any[]) => {
    // Real facial expression analysis using MediaPipe landmark positions
    const mouth_left = landmarks[61];
    const mouth_right = landmarks[291];
    const mouth_top = landmarks[13];
    const mouth_bottom = landmarks[14];
    
    const eye_left_top = landmarks[159];
    const eye_left_bottom = landmarks[145];
    const eye_right_top = landmarks[386];
    const eye_right_bottom = landmarks[374];
    
    // Calculate mouth width vs height for smile detection
    const mouth_width = Math.abs(mouth_right.x - mouth_left.x);
    const mouth_height = Math.abs(mouth_bottom.y - mouth_top.y);
    const smile = Math.min(1, mouth_width / (mouth_height + 0.01) / 3);
    
    // Calculate eye openness for expressions
    const left_eye_height = Math.abs(eye_left_top.y - eye_left_bottom.y);
    const right_eye_height = Math.abs(eye_right_top.y - eye_right_bottom.y);
    const avg_eye_height = (left_eye_height + right_eye_height) / 2;
    
    return {
      smile: Math.max(0, Math.min(1, smile)),
      frown: Math.max(0, Math.min(1, 1 - smile)),
      eyebrowRaise: Math.max(0, Math.min(1, avg_eye_height * 15)),
      jawDrop: Math.max(0, Math.min(1, mouth_height * 10))
    };
  };

  const calculateHeadRotation = (landmarks: any[]) => {
    // Use nose tip, chin, and forehead points for rotation calculation
    const nose_tip = landmarks[1];
    const chin = landmarks[18];
    const forehead = landmarks[10];
    const left_face = landmarks[234];
    const right_face = landmarks[454];
    
    // Calculate yaw (left-right rotation)
    const face_width_left = Math.abs(nose_tip.x - left_face.x);
    const face_width_right = Math.abs(right_face.x - nose_tip.x);
    const yaw = (face_width_right - face_width_left) * 100;
    
    // Calculate pitch (up-down rotation)
    const face_height = Math.abs(forehead.y - chin.y);
    const nose_position = (nose_tip.y - forehead.y) / face_height;
    const pitch = (nose_position - 0.5) * 60;
    
    // Calculate roll using eye positions
    const left_eye = landmarks[33];
    const right_eye = landmarks[263];
    const eye_angle = Math.atan2(right_eye.y - left_eye.y, right_eye.x - left_eye.x);
    const roll = eye_angle * (180 / Math.PI);
    
    return { x: pitch, y: yaw, z: roll };
  };

  const calculateEyeTracking = (landmarks: any[]) => {
    // Left eye landmarks
    const left_eye_center = landmarks[468] || landmarks[33];
    const left_eye_top = landmarks[159];
    const left_eye_bottom = landmarks[145];
    
    // Right eye landmarks
    const right_eye_center = landmarks[473] || landmarks[263];
    const right_eye_top = landmarks[386];
    const right_eye_bottom = landmarks[374];
    
    // Calculate eye openness
    const left_openness = Math.abs(left_eye_top.y - left_eye_bottom.y) * 25;
    const right_openness = Math.abs(right_eye_top.y - right_eye_bottom.y) * 25;
    
    // Calculate gaze direction
    const left_gaze_x = (left_eye_center ? left_eye_center.x : 0.5) - 0.5;
    const left_gaze_y = (left_eye_center ? left_eye_center.y : 0.5) - 0.5;
    const right_gaze_x = (right_eye_center ? right_eye_center.x : 0.5) - 0.5;
    const right_gaze_y = (right_eye_center ? right_eye_center.y : 0.5) - 0.5;
    
    // Detect blinking
    const blink_threshold = 0.02;
    const blinking = left_openness < blink_threshold && right_openness < blink_threshold;
    
    return {
      left: { openness: Math.min(1, left_openness), gaze: { x: left_gaze_x, y: left_gaze_y } },
      right: { openness: Math.min(1, right_openness), gaze: { x: right_gaze_x, y: right_gaze_y } },
      blinking
    };
  };

  const calculateMouthMovement = (landmarks: any[]) => {
    // Mouth landmarks for opening calculation
    const mouth_top = landmarks[13];
    const mouth_bottom = landmarks[14];
    const mouth_left = landmarks[61];
    const mouth_right = landmarks[291];
    
    // Calculate mouth opening
    const mouth_height = Math.abs(mouth_bottom.y - mouth_top.y);
    const mouth_width = Math.abs(mouth_right.x - mouth_left.x);
    const openness = Math.min(1, mouth_height * 15);
    
    // Determine mouth shape
    let shape = 'closed';
    if (openness > 0.6) shape = 'open';
    else if (openness > 0.3) shape = 'partial';
    
    // Speaking detection based on mouth movement variation
    const speaking = openness > 0.2;
    const lipSync = speaking ? openness : 0;
    
    return { openness, shape, speaking, lipSync };
  };

  const calculateHandGesture = (handLandmarks: any[]) => {
    if (!handLandmarks || handLandmarks.length < 21) return 'none';
    
    // Analyze finger positions for gesture recognition
    const thumb_tip = handLandmarks[4];
    const index_tip = handLandmarks[8];
    const middle_tip = handLandmarks[12];
    const wrist = handLandmarks[0];
    
    // Calculate distances from wrist to fingertips
    const thumb_dist = Math.sqrt(Math.pow(thumb_tip.x - wrist.x, 2) + Math.pow(thumb_tip.y - wrist.y, 2));
    const index_dist = Math.sqrt(Math.pow(index_tip.x - wrist.x, 2) + Math.pow(index_tip.y - wrist.y, 2));
    const middle_dist = Math.sqrt(Math.pow(middle_tip.x - wrist.x, 2) + Math.pow(middle_tip.y - wrist.y, 2));
    
    // Simple gesture classification
    if (index_dist > 0.15 && middle_dist < 0.12) return 'point';
    if (index_dist > 0.15 && middle_dist > 0.15) return 'wave';
    if (index_dist < 0.1 && middle_dist < 0.1) return 'fist';
    if (index_dist > 0.12 && middle_dist > 0.12 && thumb_dist > 0.12) return 'open';
    
    return 'none';
  };

  const calculatePoseConfidence = (poseLandmarks: any[]) => {
    if (!poseLandmarks || poseLandmarks.length === 0) return 0;
    
    // Calculate average visibility/confidence from pose landmarks
    let totalConfidence = 0;
    let validPoints = 0;
    
    poseLandmarks.forEach((landmark: any) => {
      if (landmark.visibility !== undefined && landmark.visibility > 0) {
        totalConfidence += landmark.visibility;
        validPoints++;
      }
    });
    
    return validPoints > 0 ? totalConfidence / validPoints : 0;
  };

  const processFaceResults = (results: any) => {
    if (!results.multiFaceLandmarks || results.multiFaceLandmarks.length === 0) {
      // Reset face data when no face detected
      setTrackingData(prev => ({
        ...prev,
        face: {
          landmarks: 0,
          expressions: { smile: 0, frown: 0, eyebrowRaise: 0, jawDrop: 0 },
          headRotation: { x: 0, y: 0, z: 0 }
        },
        eyes: {
          left: { openness: 0, gaze: { x: 0, y: 0 } },
          right: { openness: 0, gaze: { x: 0, y: 0 } },
          blinking: false
        },
        mouth: { openness: 0, shape: 'closed', speaking: false, lipSync: 0 }
      }));
      return;
    }
    
    const landmarks = results.multiFaceLandmarks[0];
    const expressions = calculateFacialExpressions(landmarks);
    const headRotation = calculateHeadRotation(landmarks);
    const eyeData = calculateEyeTracking(landmarks);
    const mouthData = calculateMouthMovement(landmarks);
    
    setTrackingData(prev => ({
      ...prev,
      face: {
        landmarks: landmarks.length,
        expressions,
        headRotation
      },
      eyes: eyeData,
      mouth: mouthData
    }));
    
    addLog(`Face: ${landmarks.length} landmarks detected`);
  };

  const processHandResults = (results: any) => {
    const leftHand = results.multiHandLandmarks && results.multiHandedness ? 
      results.multiHandLandmarks.find((_: any, index: number) => 
        results.multiHandedness[index].label === 'Left') : null;
    const rightHand = results.multiHandLandmarks && results.multiHandedness ? 
      results.multiHandLandmarks.find((_: any, index: number) => 
        results.multiHandedness[index].label === 'Right') : null;
    
    setTrackingData(prev => ({
      ...prev,
      hands: {
        left: {
          detected: !!leftHand,
          landmarks: leftHand ? leftHand.length : 0,
          gesture: leftHand ? calculateHandGesture(leftHand) : 'none'
        },
        right: {
          detected: !!rightHand,
          landmarks: rightHand ? rightHand.length : 0,
          gesture: rightHand ? calculateHandGesture(rightHand) : 'none'
        }
      }
    }));
    
    if (leftHand || rightHand) {
      addLog(`Hands: L=${!!leftHand}, R=${!!rightHand}`);
    }
  };

  const processPoseResults = (results: any) => {
    if (!results.poseLandmarks) return;
    
    const landmarks = results.poseLandmarks;
    const confidence = calculatePoseConfidence(landmarks);
    
    setTrackingData(prev => ({
      ...prev,
      body: {
        pose: {
          detected: landmarks.length > 0,
          landmarks: landmarks.length,
          confidence
        },
        skeleton: {
          joints: 17, // Standard pose joint count
          tracking: confidence > 0.5
        }
      }
    }));
    
    addLog(`Body: ${landmarks.length} landmarks, ${(confidence * 100).toFixed(0)}% confidence`);
  };

  const initializeMediaPipe = async () => {
    addLog('Initializing MediaPipe models...');
    
    try {
      // Initialize Face Mesh
      const faceMesh = new FaceMesh({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`
      });
      
      faceMesh.setOptions({
        maxNumFaces: 1,
        refineLandmarks: true,
        minDetectionConfidence: 0.3,
        minTrackingConfidence: 0.3
      });
      
      faceMesh.onResults((results: any) => {
        console.log('FaceMesh callback triggered:', results);
        addLog('FaceMesh results received');
        processFaceResults(results);
      });
      faceMeshRef.current = faceMesh;
      
      // Initialize Hands
      const hands = new Hands({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
      });
      
      hands.setOptions({
        maxNumHands: 2,
        modelComplexity: 1,
        minDetectionConfidence: 0.3,
        minTrackingConfidence: 0.3
      });
      
      hands.onResults((results: any) => {
        console.log('Hands callback triggered:', results);
        addLog('Hands results received');
        processHandResults(results);
      });
      handsRef.current = hands;
      
      // Initialize Pose
      const pose = new Pose({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`
      });
      
      pose.setOptions({
        modelComplexity: 1,
        smoothLandmarks: true,
        enableSegmentation: false,
        smoothSegmentation: false,
        minDetectionConfidence: 0.3,
        minTrackingConfidence: 0.3
      });
      
      pose.onResults((results: any) => {
        console.log('Pose callback triggered:', results);
        addLog('Pose results received');
        processPoseResults(results);
      });
      poseRef.current = pose;
      
      addLog('MediaPipe models initialized successfully');
      setIsInitialized(true);
      return true;
    } catch (error: any) {
      addLog(`MediaPipe initialization error: ${error.message}`);
      return false;
    }
  };

  const processFrame = async () => {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0 || !isInitialized) {
      console.log('Frame processing skipped:', { video: !!video, width: video?.videoWidth, initialized: isInitialized });
      return;
    }

    // Ensure video is playing and has valid dimensions
    if (video.readyState < 2) {
      console.log('Video not ready:', video.readyState);
      return;
    }

    try {
      // Process with face mesh first
      if (faceMeshRef.current) {
        console.log('Sending frame to FaceMesh...');
        await faceMeshRef.current.send({ image: video });
      }
      
      // Process hands
      if (handsRef.current) {
        console.log('Sending frame to Hands...');
        await handsRef.current.send({ image: video });
      }
      
      // Process pose
      if (poseRef.current) {
        console.log('Sending frame to Pose...');
        await poseRef.current.send({ image: video });
      }
    } catch (error: any) {
      console.error('MediaPipe processing error:', error);
      addLog(`Processing error: ${error.message}`);
    }
  };

  const startCamera = async () => {
    try {
      addLog('Requesting camera access...');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        }
      });
      
      addLog('Camera access granted');
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        addLog('Video playback started');
        
        // Wait for video to be fully ready
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Initialize MediaPipe models
        const initialized = await initializeMediaPipe();
        if (initialized) {
          addLog('Starting real-time MediaPipe tracking...');
          
          // Set camera active after initialization
          setCameraActive(true);
          
          // Start processing loop with proper interval after state is set
          setTimeout(() => {
            animationRef.current = setInterval(() => {
              processFrame();
            }, 300); // Process every 300ms (3.3 FPS) for stable detection
          }, 500);
        } else {
          addLog('Failed to initialize MediaPipe models');
        }
      }
    } catch (err: any) {
      addLog(`Camera error: ${err.message}`);
      console.error('Camera error:', err.message);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (animationRef.current) {
      clearInterval(animationRef.current);
      animationRef.current = null;
    }
    setCameraActive(false);
    setIsInitialized(false);
    addLog('Camera and tracking stopped');
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
      <div className="container mx-auto max-w-7xl">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">
            Real MediaPipe Computer Vision Tracking
          </h1>
          <p className="text-slate-300">
            Authentic face, hand, body, eye, and mouth tracking using MediaPipe models
          </p>
        </div>

        {/* Camera Controls */}
        <div className="flex justify-center gap-4 mb-8">
          <Button
            onClick={startCamera}
            disabled={cameraActive}
            className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
          >
            Start Real Tracking
          </Button>
          <Button
            onClick={stopCamera}
            disabled={!cameraActive}
            variant="destructive"
          >
            Stop Tracking
          </Button>
        </div>

        {/* Video Feed */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-1">
            <Card className="glass-card shadow-glow-sm">
              <CardHeader>
                <CardTitle className="text-white">Camera Feed</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="relative">
                  <video
                    ref={videoRef}
                    className="w-full h-auto rounded-lg bg-black"
                    muted
                    playsInline
                  />
                  <canvas
                    ref={canvasRef}
                    className="hidden"
                  />
                  {cameraActive && (
                    <div className="absolute top-2 right-2">
                      <Badge variant="destructive">LIVE</Badge>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Face Tracking */}
          <div className="lg:col-span-2">
            <Card className="glass-card shadow-glow-sm mb-6">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  Face Tracking
                  <Badge variant={trackingData.face.landmarks > 0 ? "default" : "secondary"}>
                    {trackingData.face.landmarks} landmarks
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="text-sm text-slate-300">Smile</label>
                    <Progress value={trackingData.face.expressions.smile * 100} className="mt-1" />
                    <span className="text-xs text-slate-400">{(trackingData.face.expressions.smile * 100).toFixed(0)}%</span>
                  </div>
                  <div>
                    <label className="text-sm text-slate-300">Frown</label>
                    <Progress value={trackingData.face.expressions.frown * 100} className="mt-1" />
                    <span className="text-xs text-slate-400">{(trackingData.face.expressions.frown * 100).toFixed(0)}%</span>
                  </div>
                  <div>
                    <label className="text-sm text-slate-300">Eyebrow Raise</label>
                    <Progress value={trackingData.face.expressions.eyebrowRaise * 100} className="mt-1" />
                    <span className="text-xs text-slate-400">{(trackingData.face.expressions.eyebrowRaise * 100).toFixed(0)}%</span>
                  </div>
                  <div>
                    <label className="text-sm text-slate-300">Jaw Drop</label>
                    <Progress value={trackingData.face.expressions.jawDrop * 100} className="mt-1" />
                    <span className="text-xs text-slate-400">{(trackingData.face.expressions.jawDrop * 100).toFixed(0)}%</span>
                  </div>
                </div>
                <div className="text-sm text-slate-300">
                  Head Rotation: X: {trackingData.face.headRotation.x.toFixed(1)}°, 
                  Y: {trackingData.face.headRotation.y.toFixed(1)}°, 
                  Z: {trackingData.face.headRotation.z.toFixed(1)}°
                </div>
              </CardContent>
            </Card>

            {/* Hand Tracking */}
            <Card className="glass-card shadow-glow-sm mb-6">
              <CardHeader>
                <CardTitle className="text-white">Hand Tracking</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-white font-medium mb-2">Left Hand</h4>
                    <Badge variant={trackingData.hands.left.detected ? "default" : "secondary"}>
                      {trackingData.hands.left.detected ? 'Detected' : 'Not Detected'}
                    </Badge>
                    <p className="text-sm text-slate-300 mt-1">
                      Landmarks: {trackingData.hands.left.landmarks}
                    </p>
                    <p className="text-sm text-slate-300">
                      Gesture: {trackingData.hands.left.gesture}
                    </p>
                  </div>
                  <div>
                    <h4 className="text-white font-medium mb-2">Right Hand</h4>
                    <Badge variant={trackingData.hands.right.detected ? "default" : "secondary"}>
                      {trackingData.hands.right.detected ? 'Detected' : 'Not Detected'}
                    </Badge>
                    <p className="text-sm text-slate-300 mt-1">
                      Landmarks: {trackingData.hands.right.landmarks}
                    </p>
                    <p className="text-sm text-slate-300">
                      Gesture: {trackingData.hands.right.gesture}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Body and Eyes/Mouth */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="glass-card shadow-glow-sm">
                <CardHeader>
                  <CardTitle className="text-white">Body Pose</CardTitle>
                </CardHeader>
                <CardContent>
                  <Badge variant={trackingData.body.pose.detected ? "default" : "secondary"}>
                    {trackingData.body.pose.detected ? 'Detected' : 'Not Detected'}
                  </Badge>
                  <p className="text-sm text-slate-300 mt-2">
                    Landmarks: {trackingData.body.pose.landmarks}
                  </p>
                  <p className="text-sm text-slate-300">
                    Confidence: {(trackingData.body.pose.confidence * 100).toFixed(0)}%
                  </p>
                  <Progress value={trackingData.body.pose.confidence * 100} className="mt-2" />
                </CardContent>
              </Card>

              <Card className="glass-card shadow-glow-sm">
                <CardHeader>
                  <CardTitle className="text-white">Eyes & Mouth</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div>
                      <span className="text-sm text-slate-300">Left Eye: </span>
                      <Progress value={trackingData.eyes.left.openness * 100} className="mt-1" />
                    </div>
                    <div>
                      <span className="text-sm text-slate-300">Right Eye: </span>
                      <Progress value={trackingData.eyes.right.openness * 100} className="mt-1" />
                    </div>
                    <div>
                      <span className="text-sm text-slate-300">Mouth Opening: </span>
                      <Progress value={trackingData.mouth.openness * 100} className="mt-1" />
                    </div>
                    <Badge variant={trackingData.eyes.blinking ? "destructive" : "secondary"}>
                      {trackingData.eyes.blinking ? 'Blinking' : 'Eyes Open'}
                    </Badge>
                    <Badge variant={trackingData.mouth.speaking ? "default" : "secondary"}>
                      {trackingData.mouth.speaking ? 'Speaking' : 'Silent'}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* System Log */}
        <Card className="glass-card shadow-glow-sm">
          <CardHeader>
            <CardTitle className="text-white">System Log</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-h-32 overflow-y-auto space-y-1">
              {logs.map((log, index) => (
                <div key={index} className="text-sm text-slate-300 font-mono">
                  {log}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}