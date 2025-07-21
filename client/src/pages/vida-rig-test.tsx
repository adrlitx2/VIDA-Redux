import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { AlertCircle, CheckCircle, Loader2, Zap, Brain, Bone, Eye } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import AvatarAnimationController from '@/components/AvatarAnimationController';

interface AnalysisResult {
  vertices: number;
  meshCount: number;
  hasExistingBones: boolean;
  humanoidStructure: {
    hasHead: boolean;
    hasSpine: boolean;
    hasArms: boolean;
    hasLegs: boolean;
    confidence: number;
  };
  suggestedBones: any[];
  isRiggingRecommended: boolean;
}

interface RigResult {
  originalAnalysis: {
    vertices: number;
    hasExistingBones: boolean;
    humanoidConfidence: number;
  };
  rigResult: {
    hasFaceRig: boolean;
    hasBodyRig: boolean;
    hasHandRig: boolean;
    boneCount: number;
    morphTargets: string[];
    riggedModelUrl: string;
  };
}

export default function VidaRigTestPage() {
  const [modelUrl, setModelUrl] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isRigging, setIsRigging] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [rigResult, setRigResult] = useState<RigResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  // Sample Greek Soldier model URL for testing
  const sampleModelUrl = 'https://gateway.pinata.cloud/ipfs/QmYourGreekSoldierModelHash'; // Replace with actual IPFS hash

  const handleAnalyze = async () => {
    if (!modelUrl.trim()) {
      setError('Please enter a model URL');
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    setAnalysisResult(null);
    setRigResult(null);
    setProgress(0);

    try {
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 15, 90));
      }, 300);

      const response = await fetch('/api/test/vida-rig/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ modelUrl }),
      });

      clearInterval(progressInterval);
      setProgress(100);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Analysis failed');
      }

      const result = await response.json();
      setAnalysisResult(result.analysis);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed');
    } finally {
      setIsAnalyzing(false);
      setProgress(0);
    }
  };

  const handleAutoRig = async () => {
    if (!modelUrl.trim()) {
      setError('Please enter a model URL');
      return;
    }

    setIsRigging(true);
    setError(null);
    setProgress(0);

    try {
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 8, 90));
      }, 500);

      const response = await fetch('/api/test/vida-rig/auto-rig', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ modelUrl }),
      });

      clearInterval(progressInterval);
      setProgress(100);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Auto-rigging failed');
      }

      const result = await response.json();
      setRigResult(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Auto-rigging failed');
    } finally {
      setIsRigging(false);
      setProgress(0);
    }
  };

  const useSampleModel = () => {
    setModelUrl(sampleModelUrl);
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">VidaRig Auto-Rigging Test</h1>
        <p className="text-muted-foreground">
          Test automatic bone generation and rigging for 3D avatar models using AI-powered analysis
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input and Controls */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-blue-500" />
                Model Input
              </CardTitle>
              <CardDescription>
                Enter a GLB model URL to test VidaRig analysis and auto-rigging
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="modelUrl">Model URL (GLB format)</Label>
                <Input
                  id="modelUrl"
                  value={modelUrl}
                  onChange={(e) => setModelUrl(e.target.value)}
                  placeholder="https://gateway.pinata.cloud/ipfs/..."
                  className="w-full"
                />
              </div>

              <div className="flex flex-wrap gap-2">
                <Button onClick={useSampleModel} variant="outline" size="sm">
                  Use Sample Model
                </Button>
              </div>

              <Separator />

              <div className="flex gap-2">
                <Button 
                  onClick={handleAnalyze} 
                  disabled={!modelUrl.trim() || isAnalyzing || isRigging}
                  className="flex-1"
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Eye className="h-4 w-4 mr-2" />
                      Analyze Model
                    </>
                  )}
                </Button>

                <Button 
                  onClick={handleAutoRig} 
                  disabled={!modelUrl.trim() || isAnalyzing || isRigging}
                  variant="secondary"
                  className="flex-1"
                >
                  {isRigging ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Rigging...
                    </>
                  ) : (
                    <>
                      <Zap className="h-4 w-4 mr-2" />
                      Auto-Rig
                    </>
                  )}
                </Button>
              </div>

              {(isAnalyzing || isRigging) && (
                <div className="space-y-2">
                  <Progress value={progress} className="w-full" />
                  <p className="text-xs text-muted-foreground text-center">
                    {isAnalyzing ? 'Analyzing mesh structure with AI...' : 'Generating bones and rigging...'}
                  </p>
                </div>
              )}

              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* Analysis Results */}
          {analysisResult && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5 text-green-500" />
                  Analysis Results
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium">Vertices</p>
                    <p className="text-2xl font-bold">{analysisResult.vertices.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Meshes</p>
                    <p className="text-2xl font-bold">{analysisResult.meshCount}</p>
                  </div>
                </div>

                <Separator />

                <div>
                  <p className="text-sm font-medium mb-2">Humanoid Structure</p>
                  <div className="flex flex-wrap gap-1">
                    <Badge variant={analysisResult.humanoidStructure.hasHead ? "default" : "secondary"}>
                      Head: {analysisResult.humanoidStructure.hasHead ? "Yes" : "No"}
                    </Badge>
                    <Badge variant={analysisResult.humanoidStructure.hasSpine ? "default" : "secondary"}>
                      Spine: {analysisResult.humanoidStructure.hasSpine ? "Yes" : "No"}
                    </Badge>
                    <Badge variant={analysisResult.humanoidStructure.hasArms ? "default" : "secondary"}>
                      Arms: {analysisResult.humanoidStructure.hasArms ? "Yes" : "No"}
                    </Badge>
                    <Badge variant={analysisResult.humanoidStructure.hasLegs ? "default" : "secondary"}>
                      Legs: {analysisResult.humanoidStructure.hasLegs ? "Yes" : "No"}
                    </Badge>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <p className="text-sm font-medium">AI Confidence</p>
                    <p className="text-sm text-muted-foreground">
                      {(analysisResult.humanoidStructure.confidence * 100).toFixed(1)}%
                    </p>
                  </div>
                  <Progress value={analysisResult.humanoidStructure.confidence * 100} />
                </div>

                <div className="flex items-center gap-2">
                  <Badge variant={analysisResult.hasExistingBones ? "destructive" : "default"}>
                    {analysisResult.hasExistingBones ? "Has Existing Bones" : "No Existing Bones"}
                  </Badge>
                  <Badge variant={analysisResult.isRiggingRecommended ? "default" : "secondary"}>
                    {analysisResult.isRiggingRecommended ? "Rigging Recommended" : "Rigging Not Recommended"}
                  </Badge>
                </div>

                <p className="text-xs text-muted-foreground">
                  Suggested bones: {analysisResult.suggestedBones.length}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Rigging Results */}
          {rigResult && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bone className="h-5 w-5 text-orange-500" />
                  Rigging Results
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    Auto-rigging completed successfully!
                  </AlertDescription>
                </Alert>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium">Original Vertices</p>
                    <p className="text-lg font-bold">{rigResult.originalAnalysis.vertices.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Generated Bones</p>
                    <p className="text-lg font-bold">{rigResult.rigResult.boneCount}</p>
                  </div>
                </div>

                <Separator />

                <div>
                  <p className="text-sm font-medium mb-2">Rigging Capabilities</p>
                  <div className="flex flex-wrap gap-1">
                    <Badge variant={rigResult.rigResult.hasFaceRig ? "default" : "secondary"}>
                      Face Rig: {rigResult.rigResult.hasFaceRig ? "Yes" : "No"}
                    </Badge>
                    <Badge variant={rigResult.rigResult.hasBodyRig ? "default" : "secondary"}>
                      Body Rig: {rigResult.rigResult.hasBodyRig ? "Yes" : "No"}
                    </Badge>
                    <Badge variant={rigResult.rigResult.hasHandRig ? "default" : "secondary"}>
                      Hand Rig: {rigResult.rigResult.hasHandRig ? "Yes" : "No"}
                    </Badge>
                  </div>
                </div>

                <div>
                  <p className="text-sm font-medium mb-2">Blend Shapes Generated</p>
                  <p className="text-lg font-bold">{rigResult.rigResult.morphTargets.length}</p>
                  {rigResult.rigResult.morphTargets.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2 max-h-20 overflow-y-auto">
                      {rigResult.rigResult.morphTargets.slice(0, 8).map((target, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {target}
                        </Badge>
                      ))}
                      {rigResult.rigResult.morphTargets.length > 8 && (
                        <Badge variant="outline" className="text-xs">
                          +{rigResult.rigResult.morphTargets.length - 8} more
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* 3D Preview */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>3D Model Preview</CardTitle>
              <CardDescription>
                {rigResult ? 'Auto-rigged model with generated bones' : 'Original model preview'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {(modelUrl || rigResult) && (
                <div className="bg-gray-100 dark:bg-gray-800 rounded-lg aspect-square">
                  <AvatarAnimationController
                    modelUrl={rigResult ? rigResult.rigResult.riggedModelUrl : modelUrl}
                    motionData={{
                      faceRotation: { x: 0, y: 0, z: 0 },
                      headPosition: { x: 0, y: 0, z: 0 },
                      bodyPose: { x: 0, y: 0, z: 0 },
                      blendShapes: {}
                    }}
                    className="w-full h-full"
                  />
                </div>
              )}
              {!modelUrl && !rigResult && (
                <div className="bg-gray-100 dark:bg-gray-800 rounded-lg aspect-square flex items-center justify-center">
                  <p className="text-muted-foreground">Enter a model URL to preview</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>VidaRig Process</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-sm space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                  <span>1. Mesh Analysis - AI detects humanoid structure</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500"></div>
                  <span>2. Bone Generation - Creates VRM-compatible skeleton</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                  <span>3. Weight Mapping - Applies automatic skinning</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                  <span>4. Blend Shapes - Generates facial expressions</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-red-500"></div>
                  <span>5. Motion Tracking - Enables MediaPipe compatibility</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}