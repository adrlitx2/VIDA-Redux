import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, Download, Wand2, Eye, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface CompletionResult {
  id: string;
  name: string;
  originalImageUrl: string;
  completedImageUrl: string;
  thumbnailUrl: string;
  analysis: any;
  prompt: string;
  processingTime: number;
  userPlan: string;
  style: string;
  createdAt: string;
}

export default function AvatarCompletionTest() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [completionResult, setCompletionResult] = useState<CompletionResult | null>(null);
  const [error, setError] = useState<string>('');
  
  // Form state
  const [characterName, setCharacterName] = useState('');
  const [selectedStyle, setSelectedStyle] = useState('cartoon');
  const [selectedQuality, setSelectedQuality] = useState('standard');
  const [selectedSize, setSelectedSize] = useState('1024x1024');
  const [customPrompt, setCustomPrompt] = useState('');

  const { toast } = useToast();

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file');
      return;
    }

    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      setError('File size must be less than 10MB');
      return;
    }

    setSelectedFile(file);
    setError('');
    
    // Create preview URL
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewUrl(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const simulateProgress = () => {
    setProgress(0);
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 90) {
          clearInterval(interval);
          return 90;
        }
        return prev + Math.random() * 15;
      });
    }, 500);
    return interval;
  };

  const handleCompleteCharacter = async () => {
    if (!selectedFile) {
      setError('Please select an image file');
      return;
    }

    setIsProcessing(true);
    setError('');
    setCompletionResult(null);
    
    const progressInterval = simulateProgress();

    try {
      const formData = new FormData();
      formData.append('image', selectedFile);
      formData.append('name', characterName || 'Test Character');
      formData.append('style', selectedStyle);
      formData.append('quality', selectedQuality);
      formData.append('size', selectedSize);
      if (customPrompt) {
        formData.append('customPrompt', customPrompt);
      }

      const response = await fetch('/api/avatars/complete-character-test', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Character completion failed');
      }

      const result = await response.json();
      
      clearInterval(progressInterval);
      setProgress(100);
      
      setTimeout(() => {
        setCompletionResult(result.character);
        setIsProcessing(false);
        toast({
          title: "Character Completed",
          description: "Your character has been successfully completed!",
        });
      }, 500);

    } catch (error: any) {
      clearInterval(progressInterval);
      setIsProcessing(false);
      setProgress(0);
      setError(error.message || 'An error occurred during character completion');
      toast({
        title: "Completion Failed",
        description: error.message || 'Failed to complete character',
        variant: "destructive",
      });
    }
  };

  const handleDownload = async (imageUrl: string, filename: string) => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "Download Started",
        description: "Your completed character is downloading",
      });
    } catch (error) {
      toast({
        title: "Download Failed",
        description: "Failed to download the completed character",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setSelectedFile(null);
    setPreviewUrl('');
    setCompletionResult(null);
    setError('');
    setProgress(0);
    setCharacterName('');
    setCustomPrompt('');
    const fileInput = document.getElementById('file-input') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold flex items-center justify-center gap-2">
          <Sparkles className="h-8 w-8 text-green-500" />
          Free Avatar Completion Test
        </h1>
        <p className="text-muted-foreground">
          Upload a partial character image and let free AI complete the full character
        </p>
        <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-4 mx-auto max-w-2xl">
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span className="font-semibold text-green-800 dark:text-green-200">100% Free Service</span>
          </div>
          <p className="text-green-700 dark:text-green-300 text-sm">
            Uses free Hugging Face APIs for character analysis and completion. Supports up to 500 images per month at no cost.
            Provides Stable Diffusion AI generation when available, otherwise intelligent demo completions.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upload and Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Upload & Configure
            </CardTitle>
            <CardDescription>
              Select your partial character image and completion settings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* File Upload */}
            <div className="space-y-2">
              <Label htmlFor="file-input">Character Image</Label>
              <Input
                id="file-input"
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                disabled={isProcessing}
              />
            </div>

            {/* Image Preview */}
            {previewUrl && (
              <div className="space-y-2">
                <Label>Preview</Label>
                <div className="border rounded-lg p-4">
                  <img
                    src={previewUrl}
                    alt="Character preview"
                    className="max-w-full h-48 object-contain mx-auto rounded"
                  />
                </div>
              </div>
            )}

            {/* Character Name */}
            <div className="space-y-2">
              <Label htmlFor="character-name">Character Name (Optional)</Label>
              <Input
                id="character-name"
                value={characterName}
                onChange={(e) => setCharacterName(e.target.value)}
                placeholder="Enter character name"
                disabled={isProcessing}
              />
            </div>

            {/* Style Selection */}
            <div className="space-y-2">
              <Label>Completion Style</Label>
              <Select value={selectedStyle} onValueChange={setSelectedStyle} disabled={isProcessing}>
                <SelectTrigger>
                  <SelectValue placeholder="Select style" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cartoon">Cartoon</SelectItem>
                  <SelectItem value="realistic">Realistic</SelectItem>
                  <SelectItem value="anime">Anime</SelectItem>
                  <SelectItem value="fantasy">Fantasy</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Quality Selection */}
            <div className="space-y-2">
              <Label>Quality</Label>
              <Select value={selectedQuality} onValueChange={setSelectedQuality} disabled={isProcessing}>
                <SelectTrigger>
                  <SelectValue placeholder="Select quality" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="standard">Standard</SelectItem>
                  <SelectItem value="hd">HD (Premium)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Size Selection */}
            <div className="space-y-2">
              <Label>Output Size</Label>
              <Select value={selectedSize} onValueChange={setSelectedSize} disabled={isProcessing}>
                <SelectTrigger>
                  <SelectValue placeholder="Select size" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1024x1024">1024x1024 (Square)</SelectItem>
                  <SelectItem value="1792x1024">1792x1024 (Landscape)</SelectItem>
                  <SelectItem value="1024x1792">1024x1792 (Portrait)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Custom Prompt */}
            <div className="space-y-2">
              <Label htmlFor="custom-prompt">Custom Prompt (Optional)</Label>
              <Textarea
                id="custom-prompt"
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                placeholder="Add specific instructions for character completion..."
                disabled={isProcessing}
                rows={3}
              />
            </div>

            {/* Error Display */}
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2">
              <Button
                onClick={handleCompleteCharacter}
                disabled={!selectedFile || isProcessing}
                className="flex-1"
              >
                {isProcessing ? (
                  <>
                    <Wand2 className="h-4 w-4 mr-2 animate-spin" />
                    Completing...
                  </>
                ) : (
                  <>
                    <Wand2 className="h-4 w-4 mr-2" />
                    Complete Character
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={resetForm}
                disabled={isProcessing}
              >
                Reset
              </Button>
            </div>

            {/* Progress Bar */}
            {isProcessing && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Processing...</span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <Progress value={progress} className="w-full" />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Results */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Completion Results
            </CardTitle>
            <CardDescription>
              View and download your completed character
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!completionResult && !isProcessing && (
              <div className="text-center py-12 text-muted-foreground">
                <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Upload an image and click "Complete Character" to see results</p>
              </div>
            )}

            {isProcessing && (
              <div className="text-center py-12">
                <Wand2 className="h-12 w-12 mx-auto mb-4 animate-spin text-primary" />
                <p className="text-muted-foreground">AI is completing your character...</p>
              </div>
            )}

            {completionResult && (
              <div className="space-y-4">
                {/* Completed Image */}
                <div className="space-y-2">
                  <Label>Completed Character</Label>
                  <div className="border rounded-lg p-4">
                    <img
                      src={completionResult.completedImageUrl || completionResult.localImageUrl}
                      alt="Completed character"
                      className="max-w-full h-64 object-contain mx-auto rounded"
                    />
                  </div>
                </div>

                {/* Character Info */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Name:</span>
                    <p className="text-muted-foreground">{completionResult.name}</p>
                  </div>
                  <div>
                    <span className="font-medium">Style:</span>
                    <p className="text-muted-foreground capitalize">{completionResult.style}</p>
                  </div>
                  <div>
                    <span className="font-medium">Processing Time:</span>
                    <p className="text-muted-foreground">{completionResult.processingTime}ms</p>
                  </div>
                  <div>
                    <span className="font-medium">Plan:</span>
                    <p className="text-muted-foreground capitalize">{completionResult.userPlan}</p>
                  </div>
                </div>

                {/* AI Prompt */}
                {completionResult.prompt && (
                  <div className="space-y-2">
                    <Label>AI Completion Prompt</Label>
                    <div className="bg-muted p-3 rounded text-sm">
                      {completionResult.prompt}
                    </div>
                  </div>
                )}

                {/* Download Button */}
                <Button
                  onClick={() => handleDownload(
                    completionResult.completedImageUrl || completionResult.localImageUrl,
                    `${completionResult.name.replace(/\s+/g, '_')}_completed.jpg`
                  )}
                  className="w-full"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download Completed Character
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}