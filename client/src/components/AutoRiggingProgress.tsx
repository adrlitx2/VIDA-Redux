import React, { useState, useEffect } from 'react';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, Loader2, Brain, Cpu, Zap, Sparkles } from 'lucide-react';

interface ProgressStep {
  id: string;
  label: string;
  description: string;
  icon: React.ComponentType<any>;
  duration: number; // in milliseconds
  completed: boolean;
}

interface AutoRiggingProgressProps {
  isVisible: boolean;
  onComplete?: () => void;
  avatarName?: string;
  userPlan?: string;
}

export default function AutoRiggingProgress({ 
  isVisible, 
  onComplete, 
  avatarName = "your avatar",
  userPlan = "free"
}: AutoRiggingProgressProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);

  // Debug logging
  console.log("🎯 AutoRiggingProgress render:", { isVisible, avatarName, userPlan });

  const steps: ProgressStep[] = [
    {
      id: 'analyze',
      label: 'Analyzing Model Structure',
      description: 'Examining mesh geometry, vertices, and facial features using AI vision models',
      icon: Brain,
      duration: 3000,
      completed: false
    },
    {
      id: 'landmarks',
      label: 'Mapping Facial Landmarks',
      description: `Detecting ${userPlan === 'goat' ? '468' : userPlan === 'zeus' ? '350' : userPlan === 'spartan' ? '200' : userPlan === 'reply_guy' ? '100' : '0'} facial landmarks using SAM-ViT AI`,
      icon: Zap,
      duration: 4000,
      completed: false
    },
    {
      id: 'bones',
      label: 'Generating Bone Structure',
      description: `Creating ${getBoneCount(userPlan)} optimized bones for your ${userPlan} tier`,
      icon: Cpu,
      duration: 3500,
      completed: false
    },
    {
      id: 'morph',
      label: 'Building Morph Targets',
      description: `Generating ${getMorphTargetCount(userPlan)} progressive morph targets for facial animation`,
      icon: Sparkles,
      duration: 2500,
      completed: false
    },
    {
      id: 'optimize',
      label: 'Optimizing for Streaming',
      description: 'Applying real-time performance optimizations and finalizing rigged model',
      icon: Loader2,
      duration: 2000,
      completed: false
    }
  ];

  function getBoneCount(plan: string): string {
    const counts = {
      free: '0',
      reply_guy: 'up to 15',
      spartan: 'up to 25', 
      zeus: 'up to 45',
      goat: 'up to 65'
    };
    return counts[plan as keyof typeof counts] || '0';
  }

  function getMorphTargetCount(plan: string): string {
    const counts = {
      free: '0',
      reply_guy: 'up to 12',
      spartan: 'up to 20',
      zeus: 'up to 35', 
      goat: 'up to 50'
    };
    return counts[plan as keyof typeof counts] || '0';
  }

  useEffect(() => {
    if (!isVisible) {
      setCurrentStep(0);
      setProgress(0);
      setIsCompleted(false);
      return;
    }

    let totalDuration = 0;
    let currentDuration = 0;

    // Calculate total duration
    steps.forEach(step => {
      totalDuration += step.duration;
    });

    const startTime = Date.now();

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      
      // Find current step
      let stepIndex = 0;
      let stepStartTime = 0;
      
      for (let i = 0; i < steps.length; i++) {
        if (elapsed >= stepStartTime + steps[i].duration) {
          stepStartTime += steps[i].duration;
          stepIndex = i + 1;
        } else {
          break;
        }
      }

      if (stepIndex >= steps.length) {
        // All steps completed
        setCurrentStep(steps.length - 1);
        setProgress(100);
        setIsCompleted(true);
        
        // Show success message briefly before calling onComplete
        setTimeout(() => {
          onComplete?.();
        }, 1500);
        
        clearInterval(interval);
        return;
      }

      setCurrentStep(stepIndex);
      
      // Calculate progress within current step
      const stepElapsed = elapsed - stepStartTime;
      const stepProgress = Math.min(stepElapsed / steps[stepIndex].duration, 1) * 100;
      const totalStepProgress = (stepIndex / steps.length) * 100;
      const currentStepProgress = (stepProgress / steps.length);
      
      setProgress(Math.min(totalStepProgress + currentStepProgress, 100));

    }, 100);

    return () => clearInterval(interval);
  }, [isVisible, onComplete]);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center">
      <div className="bg-white dark:bg-gray-900 rounded-2xl p-8 max-w-lg w-full mx-4 shadow-2xl border border-gray-200 dark:border-gray-700">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
            {isCompleted ? (
              <CheckCircle className="w-8 h-8 text-white" />
            ) : (
              <Brain className="w-8 h-8 text-white animate-pulse" />
            )}
          </div>
          
          {isCompleted ? (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Auto-Rigging Complete!
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                {avatarName} has been successfully rigged and optimized for streaming
              </p>
            </div>
          ) : (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Auto-Rigging {avatarName}
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Using advanced AI models to optimize your avatar for real-time tracking
              </p>
            </div>
          )}
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Overall Progress
            </span>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {Math.round(progress)}%
            </span>
          </div>
          <Progress value={progress} className="h-3" />
        </div>

        {/* Steps */}
        <div className="space-y-4">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isActive = index === currentStep;
            const isCompleted = index < currentStep || (index === currentStep && progress === 100);
            const isPending = index > currentStep;

            return (
              <div
                key={step.id}
                className={`flex items-start space-x-3 p-3 rounded-lg transition-all duration-300 ${
                  isActive 
                    ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800' 
                    : isCompleted
                    ? 'bg-green-50 dark:bg-green-900/20'
                    : 'bg-gray-50 dark:bg-gray-800/50'
                }`}
              >
                <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                  isCompleted 
                    ? 'bg-green-500' 
                    : isActive 
                    ? 'bg-blue-500' 
                    : 'bg-gray-300 dark:bg-gray-600'
                }`}>
                  {isCompleted ? (
                    <CheckCircle className="w-5 h-5 text-white" />
                  ) : isActive ? (
                    <Icon className="w-5 h-5 text-white animate-spin" />
                  ) : (
                    <Icon className="w-5 h-5 text-white opacity-50" />
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${
                    isActive 
                      ? 'text-blue-900 dark:text-blue-100' 
                      : isCompleted
                      ? 'text-green-900 dark:text-green-100'
                      : 'text-gray-500 dark:text-gray-400'
                  }`}>
                    {step.label}
                  </p>
                  <p className={`text-xs mt-1 ${
                    isActive 
                      ? 'text-blue-700 dark:text-blue-300' 
                      : isCompleted
                      ? 'text-green-700 dark:text-green-300'
                      : 'text-gray-400 dark:text-gray-500'
                  }`}>
                    {step.description}
                  </p>
                </div>

                {isActive && !isCompleted && (
                  <div className="flex-shrink-0">
                    <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        {isCompleted && (
          <div className="mt-6 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
              <p className="text-sm font-medium text-green-800 dark:text-green-200">
                Your avatar is now ready for real-time streaming with optimized facial tracking!
              </p>
            </div>
          </div>
        )}

        {!isCompleted && (
          <div className="mt-6 text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Using production-grade AI models: YOLOv8n-Pose, DINOv2, SAM-ViT, Intel DPT
            </p>
          </div>
        )}
      </div>
    </div>
  );
}