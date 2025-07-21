import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Upload, RotateCcw, CheckCircle, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';

interface IPFSStatus {
  connected: boolean;
  message: string;
  step?: string;
  error?: string;
}

interface UploadResult {
  message?: string;
  success?: boolean;
  ipfsHash?: string;
  imageUrl?: string;
  fileName?: string;
  uploads?: Array<{ fileName: string; hash: string; url: string }>;
  updatedBackgrounds?: number;
}

export function IPFSManager() {
  const [ipfsStatus, setIpfsStatus] = useState<IPFSStatus | null>(null);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isReverting, setIsReverting] = useState(false);
  const [lastUpload, setLastUpload] = useState<UploadResult | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const { toast } = useToast();

  const testIPFSConnection = async () => {
    setIsTestingConnection(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch('/api/admin/ipfs/test', {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`
        }
      });
      const result = await response.json();
      setIpfsStatus(result);
      
      toast({
        title: result.connected ? "IPFS Connected" : "IPFS Not Available",
        description: result.message,
        variant: result.connected ? "default" : "destructive"
      });
    } catch (error) {
      setIpfsStatus({ connected: false, message: "Failed to test connection" });
      toast({
        title: "Connection Test Failed",
        description: "Unable to test IPFS connection",
        variant: "destructive"
      });
    } finally {
      setIsTestingConnection(false);
    }
  };

  const uploadToIPFS = async (file: File) => {
    setIsUploading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        throw new Error('No authentication session found');
      }
      
      // Convert file to base64
      setIpfsStatus({ connected: true, message: 'Converting file to base64...', step: 'Converting' });
      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(',')[1]); // Remove data:image/jpeg;base64, prefix
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      
      setIpfsStatus({ connected: true, message: 'Preparing upload data...', step: 'Preparing' });
      const uploadData = {
        fileName: file.name,
        fileData: base64Data,
        mimeType: file.type,
        category: 'bedroom'
      };
      
      setIpfsStatus({ connected: true, message: 'Uploading to IPFS...', step: 'Uploading' });
      const response = await fetch('/api/admin/ipfs/upload-json', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(uploadData)
      }).catch(fetchError => {
        setIpfsStatus({ connected: false, message: `Network error: ${fetchError.message}`, error: fetchError.message });
        throw new Error(`Network error: ${fetchError.message}`);
      });
      
      console.log('Response status:', response.status);
      console.log('Response ok:', response.ok);
      
      if (!response.ok) {
        const errorText = await response.text();
        setIpfsStatus({ connected: false, message: `Upload failed: ${response.status}`, error: errorText });
        throw new Error(`Upload failed: ${errorText}`);
      }
      
      setIpfsStatus({ connected: true, message: 'Processing server response...', step: 'Processing' });
      const result = await response.json();
      
      setLastUpload(result);
      setIpfsStatus({ 
        connected: true, 
        message: `✅ Successfully uploaded to IPFS! Hash: ${result.ipfsHash?.substring(0, 10)}...`,
        step: 'Complete'
      });
      
      // Invalidate background cache to refresh the list
      const { queryClient } = await import('@/lib/queryClient');
      queryClient.invalidateQueries({ queryKey: ['/api/backgrounds'] });
      queryClient.invalidateQueries({ queryKey: ['/api/backgrounds/categories'] });
      
      toast({
        title: "IPFS Upload Successful", 
        description: `Uploaded ${result.fileName || file.name} to IPFS with hash ${result.ipfsHash?.substring(0, 10)}...`,
        variant: "default"
      });
      
      return result;
    } catch (error) {
      toast({
        title: "Upload Failed",
        description: error instanceof Error ? error.message : "Failed to upload to IPFS",
        variant: "destructive"
      });
      throw error;
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    setSelectedFile(file || null);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    await uploadToIPFS(selectedFile);
  };

  const revertToLocal = async () => {
    setIsReverting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch('/api/admin/ipfs/revert-to-local', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`
        }
      });
      const result = await response.json();
      
      if (response.ok) {
        toast({
          title: "Reverted to Local Storage",
          description: result.message,
          variant: "default"
        });
        setLastUpload(null);
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      toast({
        title: "Revert Failed",
        description: error instanceof Error ? error.message : "Failed to revert to local storage",
        variant: "destructive"
      });
    } finally {
      setIsReverting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            IPFS Storage Management
          </CardTitle>
          <CardDescription>
            Manage background image storage using IPFS for better performance and distribution.
            Separate from avatar storage system.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Button 
              onClick={testIPFSConnection} 
              disabled={isTestingConnection}
              variant="outline"
            >
              {isTestingConnection && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Test IPFS Connection
            </Button>
            
            {ipfsStatus && (
              <div className="flex items-center gap-2">
                {ipfsStatus.connected ? (
                  <Badge variant="default" className="bg-green-100 text-green-800">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Connected
                  </Badge>
                ) : (
                  <Badge variant="destructive">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    Not Available
                  </Badge>
                )}
                <span className="text-sm text-muted-foreground">{ipfsStatus.message}</span>
              </div>
            )}
          </div>

          <div className="border-t pt-4">
            <h4 className="font-medium mb-3">Upload Bedroom Background</h4>
            <div className="space-y-3">
              <div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
                {selectedFile && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Selected: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                  </p>
                )}
              </div>
              <div className="flex gap-3">
                <Button 
                  onClick={handleUpload} 
                  disabled={isUploading || !selectedFile || !ipfsStatus?.connected}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {isUploading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Upload to IPFS
                </Button>
              
                <Button 
                  onClick={revertToLocal} 
                  disabled={isReverting}
                  variant="outline"
                >
                  {isReverting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Revert to Local Storage
                </Button>
              </div>
            </div>
          </div>

          {lastUpload && (
            <div className="border-t pt-4">
              <h4 className="font-medium mb-2">Last Upload Results</h4>
              <div className="bg-muted p-3 rounded-md">
                <p className="text-sm mb-2">{lastUpload.message}</p>
                {lastUpload.ipfsHash && (
                  <div className="space-y-1">
                    <div className="text-xs text-muted-foreground">
                      File: {lastUpload.fileName}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      IPFS Hash: {lastUpload.ipfsHash.substring(0, 12)}...
                    </div>
                    <div className="text-xs text-muted-foreground">
                      URL: <a href={lastUpload.imageUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">View Image</a>
                    </div>
                  </div>
                )}
                {lastUpload.uploads && (
                  <div className="space-y-1">
                    {lastUpload.uploads.map((upload, index) => (
                      <div key={index} className="text-xs text-muted-foreground">
                        {upload.fileName} → {upload.hash.substring(0, 12)}...
                      </div>
                    ))}
                  </div>
                )}
                {lastUpload.updatedBackgrounds && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Updated {lastUpload.updatedBackgrounds} background records
                  </p>
                )}
              </div>
            </div>
          )}

          <div className="bg-blue-50 p-3 rounded-md">
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> This IPFS configuration is specifically for background images only. 
              Avatar storage will use a separate IPFS setup with different credentials.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}