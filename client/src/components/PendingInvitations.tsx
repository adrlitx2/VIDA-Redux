import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { getAuthHeaders } from '@/lib/auth-helper';
import { Check, X, Clock, Users } from 'lucide-react';

interface Invitation {
  id: number;
  session_id: number;
  inviter_id: string;
  invitee_id: string;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  message: string;
  expires_at: string;
  created_at: string;
  responded_at?: string;
  session: {
    id: number;
    session_name: string;
    host_id: string;
    status: string;
    grid_layout: string;
  };
  inviter: {
    id: string;
    username: string;
    email: string;
  };
}

export default function PendingInvitations() {
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { user } = useAuth();

  const fetchInvitations = async () => {
    try {
      const response = await fetch('/api/buddy-system/invitations/pending', {
        headers: {
          ...(await getAuthHeaders())
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch invitations');
      }

      const data = await response.json();
      console.log('[PendingInvitations] Raw API response:', data); // DEBUG LOG
      setInvitations(data.invitations || []);
    } catch (error) {
      console.error('Error fetching invitations:', error);
      toast({
        title: 'Error',
        description: 'Failed to load invitations',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const respondToInvitation = async (invitationId: number, action: 'accept' | 'decline') => {
    try {
      const response = await fetch(`/api/buddy-system/invitations/${invitationId}/${action}`, {
        method: 'POST',
        headers: {
          ...(await getAuthHeaders())
        }
      });

      const data = await response.json();

      if (!response.ok) {
        // Handle specific error cases
        if (response.status === 410) {
          // Session has ended
          toast({
            title: 'Session Ended',
            description: data.details || 'The co-stream session has ended or is no longer available.',
            variant: 'destructive'
          });
        } else {
          throw new Error(data.error || `Failed to ${action} invitation`);
        }
        return;
      }

      if (action === 'accept' && data.success) {
        toast({
          title: 'Invitation Accepted!',
          description: `You've joined "${data.session.session_name}"`,
        });

        // Emit custom event to notify parent component to enable co-stream mode
        const event = new CustomEvent('coStreamJoined', {
          detail: {
            session: data.session,
            participant: data.participant
          }
        });
        window.dispatchEvent(event);
      } else {
        toast({
          title: 'Success',
          description: action === 'decline' ? 'Invitation declined successfully!' : `Invitation ${action}ed successfully!`,
        });
      }

      // Refresh invitations list
      fetchInvitations();
    } catch (error) {
      console.error(`Error ${action}ing invitation:`, error);
      toast({
        title: 'Error',
        description: `Failed to ${action} invitation`,
        variant: 'destructive'
      });
    }
  };

  useEffect(() => {
    if (user?.id) {
      fetchInvitations();
    }
  }, [user?.id]);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span className="ml-2">Loading invitations...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (invitations.length === 0) {
    return (
      <div className="text-center">
        <Users className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
        <h3 className="text-sm font-semibold mb-1">No Pending Invitations</h3>
        <p className="text-xs text-muted-foreground">
          No pending co-stream invitations
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Pending Invitations ({invitations.length})</h3>
        <Badge variant="secondary" className="text-xs">
          <Clock className="w-3 h-3 mr-1" />
          {invitations.length > 0 && new Date(invitations[0].expires_at).toLocaleDateString()}
        </Badge>
      </div>
      
      {invitations.slice(0, 2).map((invitation) => (
        <div key={invitation.id} className="p-3 bg-white/50 dark:bg-gray-800/50 rounded-lg border border-green-200 dark:border-green-800">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-green-700 dark:text-green-300">
                From: {invitation.inviter.username}
              </span>
            </div>
            
            <div>
              <p className="text-xs font-medium">{invitation.session.session_name}</p>
              <p className="text-xs text-muted-foreground">
                Layout: {invitation.session.grid_layout}
              </p>
            </div>

            {invitation.message && (
              <p className="text-xs text-muted-foreground italic">
                "{invitation.message}"
              </p>
            )}

            <div className="flex gap-2 pt-1">
              <Button
                onClick={() => respondToInvitation(invitation.id, 'accept')}
                size="sm"
                className="flex-1 bg-green-600 hover:bg-green-700 text-xs h-7"
              >
                <Check className="w-3 h-3 mr-1" />
                Accept
              </Button>
              <Button
                onClick={() => respondToInvitation(invitation.id, 'decline')}
                size="sm"
                variant="destructive"
                className="flex-1 text-xs h-7"
              >
                <X className="w-3 h-3 mr-1" />
                Decline
              </Button>
            </div>
          </div>
        </div>
      ))}
      
      {invitations.length > 2 && (
        <p className="text-xs text-muted-foreground text-center">
          +{invitations.length - 2} more invitations
        </p>
      )}
    </div>
  );
} 