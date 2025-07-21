import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Play, Users } from "lucide-react";
import { Link } from "wouter";

// Define the interface for a stream
interface Stream {
  id: string;
  username: string;
  title: string;
  avatarId: string;
  avatarUrl: string;
  userAvatarUrl?: string;
  viewerCount: number;
  startedAt: string;
  duration: number; // in minutes
  isLive: boolean;
}

// Sample featured stream data
const featuredStreamSample: Stream = {
  id: "stream-001",
  username: "cybergamer42",
  title: "Late Night Gaming Session with VIDA³",
  avatarId: "av-001",
  avatarUrl: "https://images.unsplash.com/photo-1640552435388-a54879e72b28?w=400&h=400&fit=crop",
  userAvatarUrl: "https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=100&h=100&fit=crop",
  viewerCount: 327,
  startedAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(), // 45 minutes ago
  duration: 45,
  isLive: true
};

export function FeaturedStream() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [stream, setStream] = useState<Stream | null>(null);

  useEffect(() => {
    fetchFeaturedStream();
  }, []);

  const fetchFeaturedStream = async () => {
    setIsLoading(true);
    try {
      // In a real implementation, this would be an API call
      // const response = await apiRequest("GET", "/api/streams/featured");
      // if (response.ok) {
      //   const data = await response.json();
      //   setStream(data);
      // }
      
      // Using sample data for now
      // Simulate a small delay to show loading state
      setTimeout(() => {
        setStream(featuredStreamSample);
        setIsLoading(false);
      }, 800);
    } catch (error) {
      console.error("Error fetching featured stream:", error);
      toast({
        title: "Error",
        description: "Could not load featured stream. Please try again later.",
        variant: "destructive",
      });
      setIsLoading(false);
    }
  };

  // Calculate duration
  const getStreamDuration = (startTimeString: string) => {
    const startTime = new Date(startTimeString);
    const now = new Date();
    const diffMs = now.getTime() - startTime.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 60) {
      return `${diffMins}m`;
    } else {
      const hours = Math.floor(diffMins / 60);
      const mins = diffMins % 60;
      return `${hours}h ${mins}m`;
    }
  };

  if (isLoading) {
    return (
      <Card className="w-full bg-black/60 border-surface overflow-hidden">
        <CardContent className="p-0">
          <div className="aspect-video bg-surface-dark flex items-center justify-center">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!stream) {
    return (
      <Card className="w-full bg-black/60 border-surface overflow-hidden">
        <CardContent className="p-0">
          <div className="aspect-video bg-surface-dark flex flex-col items-center justify-center p-6 text-center">
            <h3 className="text-2xl font-bold text-muted-foreground mb-4">No Featured Streams</h3>
            <p className="text-muted-foreground mb-6">
              There are no featured streams available right now. Check back later or start your own stream!
            </p>
            {user ? (
              <Link href="/stream">
                <Button>
                  Start Streaming
                </Button>
              </Link>
            ) : (
              <Link href="/login">
                <Button>
                  Sign In to Stream
                </Button>
              </Link>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full bg-black/60 border-surface overflow-hidden shadow-lg hover:shadow-primary/20 transition-shadow duration-300">
      <CardContent className="p-0 relative">
        <div className="aspect-video bg-surface-dark relative overflow-hidden">
          <img 
            src={stream.avatarUrl} 
            alt={`${stream.username}'s stream`} 
            className="w-full h-full object-cover"
          />
          
          {/* Overlay gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
          
          {/* Stream info overlay */}
          <div className="absolute bottom-0 left-0 right-0 p-4 md:p-6">
            <div className="flex items-center gap-3 mb-2">
              {stream.userAvatarUrl && (
                <img 
                  src={stream.userAvatarUrl} 
                  alt={stream.username} 
                  className="h-10 w-10 rounded-full border-2 border-primary"
                />
              )}
              <div>
                <h3 className="text-xl font-bold text-white line-clamp-1">{stream.title}</h3>
                <p className="text-sm text-white/80">@{stream.username}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4 mt-2">
              <Badge className="bg-red-600 py-1 px-3 flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-white animate-pulse"></span>
                LIVE
              </Badge>
              <div className="flex items-center gap-1.5 text-white/80">
                <Users className="h-4 w-4" />
                <span>{stream.viewerCount.toLocaleString()} viewers</span>
              </div>
              <div className="text-white/80 text-sm">
                {getStreamDuration(stream.startedAt)}
              </div>
            </div>
          </div>
          
          {/* Play button overlay */}
          <div className="absolute inset-0 flex items-center justify-center">
            <Link href={`/stream/${stream.id}`}>
              <Button variant="outline" size="lg" className="rounded-full w-16 h-16 bg-primary/30 border-primary/50 backdrop-blur-sm hover:bg-primary/50 transition-all group">
                <Play className="h-8 w-8 text-white group-hover:scale-110 transition-transform" />
              </Button>
            </Link>
          </div>
        </div>
      </CardContent>
      <CardFooter className="py-3 px-4 flex justify-between">
        <Link href="/streams">
          <Button variant="link" className="px-0">
            View All Streams
          </Button>
        </Link>
        {user ? (
          <Link href="/stream">
            <Button variant="outline" size="sm" className="ml-auto">
              Start Your Stream
            </Button>
          </Link>
        ) : (
          <Link href="/login">
            <Button variant="outline" size="sm" className="ml-auto">
              Sign In to Stream
            </Button>
          </Link>
        )}
      </CardFooter>
    </Card>
  );
}