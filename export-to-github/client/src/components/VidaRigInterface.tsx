import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  Settings, 
  Zap, 
  CheckCircle, 
  AlertCircle,
  Loader2,
  Bone,
  Brain
} from "lucide-react";

interface VidaRigInterfaceProps {
  avatarId: number;
  onRigComplete: (result: any) => void;
  disabled?: boolean;
}

export default function VidaRigInterface({ avatarId, onRigComplete, disabled = false }: VidaRigInterfaceProps) {
  const [rigStatus, setRigStatus] = useState<'idle' | 'analyzing' | 'rigging' | 'complete' | 'error'>('idle');
  const [progress, setProgress] = useState(0);
  const [rigResult, setRigResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const startAutoRigging = async () => {
    try {
      console.log('🤖 Starting auto-rigging for avatar:', avatarId);
      setRigStatus('analyzing');
      setProgress(0);
      setError(null);

      // Simulate analysis progress
      setProgress(30);
      
      // Start rigging phase
      setRigStatus('rigging');
      setProgress(60);
      
      console.log('🚀 Making auto-rigging API request...');
      
      const rigResponse = await apiRequest("POST", `/api/avatars/auto-rig/${avatarId}`, {
        userPlan: "goat"
      });

      console.log('📥 Auto-rigging response received:', rigResponse);

      if (!rigResponse || !rigResponse.success) {
        const errorMsg = rigResponse?.message || rigResponse?.error || 'Auto-rigging failed';
        console.error('❌ Auto-rigging failed:', errorMsg);
        throw new Error(errorMsg);
      }

      setProgress(100);
      setRigStatus('complete');
      setRigResult(rigResponse);
      
      console.log('✅ Auto-rigging completed successfully');
      
      toast({
        title: "Auto-Rigging Complete",
        description: `Successfully rigged with ${rigResponse.boneCount} bones and ${rigResponse.morphTargets} morph targets`
      });

      onRigComplete(rigResponse);

    } catch (error) {
      console.error('❌ Auto-rigging error:', error);
      setRigStatus('error');
      const errorMessage = error instanceof Error ? error.message : 'Auto-rigging failed';
      setError(errorMessage);
      
      toast({
        title: "Auto-Rigging Failed",
        description: errorMessage,
        variant: "destructive"
      });
    }
  };

  const getStatusIcon = () => {
    switch (rigStatus) {
      case 'analyzing':
      case 'rigging':
        return <Loader2 className="h-4 w-4 animate-spin" />;
      case 'complete':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Brain className="h-4 w-4" />;
    }
  };

  const getStatusText = () => {
    switch (rigStatus) {
      case 'analyzing':
        return 'Analyzing mesh structure...';
      case 'rigging':
        return 'Generating skeleton and bones...';
      case 'complete':
        return 'Auto-rigging complete!';
      case 'error':
        return 'Auto-rigging failed';
      default:
        return 'Ready for auto-rigging';
    }
  };

  return (
    <Card className="bg-gradient-to-br from-purple-500/10 to-blue-500/10 border-purple-500/20">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Bone className="h-5 w-5 text-purple-400" />
          VidaRig Auto-Rigging
        </CardTitle>
        <p className="text-sm text-gray-400">
          AI-powered automatic rigging for full motion tracking
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Status Section */}
          <div className="flex items-center gap-3">
            {getStatusIcon()}
            <div className="flex-1">
              <p className="text-sm font-medium">{getStatusText()}</p>
              {rigStatus === 'complete' && rigResult && (
                <p className="text-xs text-gray-400">
                  Generated {rigResult.boneCount} bones • {rigResult.meshVertices} vertices processed
                </p>
              )}
              {error && (
                <p className="text-xs text-red-400">{error}</p>
              )}
            </div>
            {rigStatus === 'complete' && (
              <Badge variant="default" className="bg-green-600">
                <CheckCircle className="h-3 w-3 mr-1" />
                Rigged
              </Badge>
            )}
          </div>

          {/* Progress Bar */}
          {(rigStatus === 'analyzing' || rigStatus === 'rigging') && (
            <div className="space-y-2">
              <Progress value={progress} className="h-2" />
              <div className="flex justify-between text-xs text-gray-400">
                <span>
                  {rigStatus === 'analyzing' ? 'Mesh Analysis' : 'Bone Generation'}
                </span>
                <span>{progress}%</span>
              </div>
            </div>
          )}

          {/* Action Button */}
          <Button
            onClick={startAutoRigging}
            disabled={disabled || rigStatus === 'analyzing' || rigStatus === 'rigging'}
            className="w-full bg-gradient-to-r from-purple-500 to-blue-600 hover:from-purple-500/90 hover:to-blue-600/90"
            size="lg"
          >
            {rigStatus === 'analyzing' || rigStatus === 'rigging' ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {rigStatus === 'analyzing' ? 'Analyzing...' : 'Rigging...'}
              </>
            ) : disabled ? (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Already Rigged
              </>
            ) : (
              <>
                <Zap className="h-4 w-4 mr-2" />
                Start Auto-Rigging
              </>
            )}
          </Button>

          {/* Info Section */}
          <div className="text-xs text-gray-400 bg-gray-800/50 rounded-lg p-3">
            <h4 className="font-medium text-gray-300 mb-1">Auto-Rigging Process:</h4>
            <ul className="space-y-1">
              <li>• AI analyzes mesh topology and geometry</li>
              <li>• Generates optimal bone structure for tracking</li>
              <li>• Creates skin weights for natural deformation</li>
              <li>• Enables full-body motion capture compatibility</li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}