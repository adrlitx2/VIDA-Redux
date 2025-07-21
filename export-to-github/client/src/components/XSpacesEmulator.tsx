import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GlassCard } from "@/components/ui/glass-card";

type XSpacesEmulatorProps = {
  className?: string;
};

export function XSpacesEmulator({ className }: XSpacesEmulatorProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  
  const [connected, setConnected] = useState(false);
  const [twitterHandle, setTwitterHandle] = useState(user?.twitterHandle || "@vidaaa_connected");
  const [isEditing, setIsEditing] = useState(false);

  const toggleConnection = () => {
    if (connected) {
      setConnected(false);
      toast({
        title: "Disconnected",
        description: "Your X Spaces session has been ended",
      });
    } else {
      setConnected(true);
      toast({
        title: "Connected",
        description: "Successfully connected to X Spaces",
      });
    }
  };

  const handleStartSpace = () => {
    if (!connected) {
      toast({
        title: "Connection Required",
        description: "Please connect to X Spaces first",
        variant: "destructive",
      });
      return;
    }
    
    toast({
      title: "Space Started",
      description: "Your X Space with avatar is now live",
    });
  };

  return (
    <GlassCard className={className}>
      <div className="p-6 border-b border-surface">
        <div className="flex justify-between items-center">
          <h3 className="text-xl font-bold">Twitter Spaces Emulator</h3>
          <div className="flex space-x-2">
            <button 
              className="p-2 rounded-lg bg-surface hover:bg-surface-light transition"
              onClick={() => window.location.reload()}
            >
              <i className="ri-refresh-line text-white"></i>
            </button>
            <button className="p-2 rounded-lg bg-surface hover:bg-surface-light transition">
              <i className="ri-fullscreen-line text-white"></i>
            </button>
          </div>
        </div>
      </div>
      <div className="p-6">
        {/* Mobile Twitter Spaces UI mockup */}
        <div className="max-w-sm mx-auto bg-[#15202b] rounded-2xl overflow-hidden border border-gray-700">
          {/* Header */}
          <div className="p-4 border-b border-gray-700 flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-full bg-primary">
                <img src="https://images.unsplash.com/photo-1640552435388-a54879e72b28?ixlib=rb-4.0.3&auto=format&fit=crop&w=48&h=48" alt="User avatar" className="w-full h-full rounded-full" />
              </div>
              <div>
                <h4 className="font-bold text-white">Creator Talk #42</h4>
                <p className="text-xs text-gray-400">Hosted by {twitterHandle}</p>
              </div>
            </div>
            <button className="p-2 rounded-full bg-transparent hover:bg-gray-700">
              <i className="ri-more-fill text-white"></i>
            </button>
          </div>
          
          {/* Main Space */}
          <div className="p-4">
            <div className="text-white text-sm mb-4">Current topic: "The future of digital avatars"</div>
            
            {/* Speakers Grid */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              {/* Host */}
              <div className="flex flex-col items-center">
                <div className="w-16 h-16 rounded-full bg-primary mb-2 relative ring-2 ring-primary">
                  <img src="https://images.unsplash.com/photo-1640552435388-a54879e72b28?ixlib=rb-4.0.3&auto=format&fit=crop&w=96&h=96" alt="Host avatar" className="w-full h-full rounded-full" />
                  <div className="absolute bottom-0 right-0 w-5 h-5 bg-accent rounded-full border-2 border-[#15202b]"></div>
                </div>
                <span className="text-xs text-white font-medium truncate max-w-full">{twitterHandle}</span>
                <span className="text-xs text-gray-400">Host</span>
              </div>
              
              {/* Speaker 1 */}
              <div className="flex flex-col items-center">
                <div className="w-16 h-16 rounded-full bg-gray-700 mb-2 relative">
                  <img src="https://images.unsplash.com/photo-1619946794135-5bc917a27793?ixlib=rb-4.0.3&auto=format&fit=crop&w=96&h=96" alt="Speaker avatar" className="w-full h-full rounded-full" />
                  <div className="absolute bottom-0 right-0 w-5 h-5 bg-accent rounded-full border-2 border-[#15202b]"></div>
                </div>
                <span className="text-xs text-white font-medium truncate max-w-full">@creator1</span>
                <span className="text-xs text-gray-400">Speaker</span>
              </div>
              
              {/* Speaker 2 */}
              <div className="flex flex-col items-center">
                <div className="w-16 h-16 rounded-full bg-gray-700 mb-2 relative opacity-50">
                  <img src="https://images.unsplash.com/photo-1438761681033-6461ffad8d80?ixlib=rb-4.0.3&auto=format&fit=crop&w=96&h=96" alt="Speaker avatar" className="w-full h-full rounded-full" />
                </div>
                <span className="text-xs text-white font-medium truncate max-w-full">@creator2</span>
                <span className="text-xs text-gray-400">Muted</span>
              </div>
            </div>
            
            {/* Listeners */}
            <div className="mb-4">
              <h5 className="text-sm text-gray-400 mb-2">Listening (24)</h5>
              <div className="flex flex-wrap gap-2">
                <div className="w-8 h-8 rounded-full bg-gray-700">
                  <img src="https://images.unsplash.com/photo-1609010697446-11f2155278f0?ixlib=rb-4.0.3&auto=format&fit=crop&w=48&h=48" alt="Listener avatar" className="w-full h-full rounded-full" />
                </div>
                <div className="w-8 h-8 rounded-full bg-gray-700">
                  <img src="https://images.unsplash.com/photo-1610271340738-726e199f0258?ixlib=rb-4.0.3&auto=format&fit=crop&w=48&h=48" alt="Listener avatar" className="w-full h-full rounded-full" />
                </div>
                <div className="w-8 h-8 rounded-full bg-gray-700">
                  <img src="https://images.unsplash.com/photo-1614289371518-722f2615943d?ixlib=rb-4.0.3&auto=format&fit=crop&w=48&h=48" alt="Listener avatar" className="w-full h-full rounded-full" />
                </div>
                <div className="w-8 h-8 rounded-full bg-gray-700">
                  <img src="https://images.unsplash.com/photo-1505033575518-a36ea2ef75ae?ixlib=rb-4.0.3&auto=format&fit=crop&w=48&h=48" alt="Listener avatar" className="w-full h-full rounded-full" />
                </div>
                <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-white text-xs">
                  +20
                </div>
              </div>
            </div>
          </div>
          
          {/* Bottom Controls */}
          <div className="px-4 py-3 bg-gray-900 flex justify-between items-center">
            <button className={`p-3 rounded-full ${connected ? 'bg-accent' : 'bg-gray-700'}`}>
              <i className="ri-mic-fill text-white"></i>
            </button>
            <div className="flex space-x-4">
              <button className="p-3 rounded-full bg-gray-700">
                <i className="ri-user-add-line text-white"></i>
              </button>
              <button className="p-3 rounded-full bg-gray-700">
                <i className="ri-chat-1-line text-white"></i>
              </button>
              <button className="p-3 rounded-full bg-gray-700">
                <i className="ri-share-line text-white"></i>
              </button>
            </div>
            <button className="px-4 py-2 rounded-full bg-red-500 text-white text-sm font-medium">
              Leave
            </button>
          </div>
        </div>

        <div className="mt-6">
          <div className="flex justify-between items-center mb-4">
            <h4 className="font-bold">Connection Status</h4>
            <span className={`px-3 py-1 rounded-lg text-white text-sm ${connected ? 'bg-secondary' : 'bg-muted'}`}>
              {connected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm text-gray-300 block mb-2">X.com Account</label>
              <div className="flex items-center">
                {isEditing ? (
                  <Input 
                    className="flex-1 rounded-l-xl"
                    value={twitterHandle}
                    onChange={(e) => setTwitterHandle(e.target.value)}
                  />
                ) : (
                  <div className="flex-1 bg-surface border border-surface-light rounded-l-xl p-3 text-white">
                    {twitterHandle}
                  </div>
                )}
                <button 
                  className="bg-surface-light border border-surface-light rounded-r-xl p-3 text-white"
                  onClick={() => {
                    if (isEditing) {
                      setIsEditing(false);
                    } else {
                      setIsEditing(true);
                    }
                  }}
                >
                  <i className={`ri-${isEditing ? 'check-line' : 'edit-line'}`}></i>
                </button>
              </div>
            </div>
            
            <div className="flex gap-3">
              <Button 
                onClick={toggleConnection} 
                variant="outline" 
                className="flex-1"
              >
                {connected ? 'Disconnect' : 'Connect to X.com'}
              </Button>
              
              <Button 
                onClick={handleStartSpace} 
                className="flex-1 shadow-neon-purple"
              >
                Start Space with Avatar
              </Button>
            </div>
          </div>
        </div>
      </div>
    </GlassCard>
  );
}

export default XSpacesEmulator;
