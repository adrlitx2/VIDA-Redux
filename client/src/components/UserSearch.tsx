import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Search, UserPlus, Users, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getAuthHeaders } from '@/lib/auth-helper';

interface User {
  id: string;
  username: string;
  email: string;
  role: string;
  plan: string;
  created_at: string;
}

interface UserSearchProps {
  onUserSelect?: (user: User) => void;
  onBuddyRequest?: (userId: string) => void;
  showBuddyActions?: boolean;
}

export default function UserSearch({ onUserSelect, onBuddyRequest, showBuddyActions = true }: UserSearchProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const { toast } = useToast();

  // Search users
  const searchUsers = async (query: string) => {
    if (!query.trim()) {
      setUsers([]);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/buddy-system/users/search?query=${encodeURIComponent(query)}`, {
        headers: {
          ...(await getAuthHeaders())
        }
      });

      if (!response.ok) {
        throw new Error('Failed to search users');
      }

      const data = await response.json();
      setUsers(data.users || []);
    } catch (error) {
      console.error('Search error:', error);
      toast({
        title: 'Search Failed',
        description: 'Failed to search users. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  // Send buddy request
  const sendBuddyRequest = async (userId: string) => {
    try {
      const response = await fetch('/api/buddies/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(await getAuthHeaders())
        },
        body: JSON.stringify({ recipientId: userId })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to send buddy request');
      }

      toast({
        title: 'Buddy Request Sent',
        description: 'Your buddy request has been sent successfully!'
      });

      // Call parent callback if provided
      if (onBuddyRequest) {
        onBuddyRequest(userId);
      }
    } catch (error: any) {
      console.error('Buddy request error:', error);
      toast({
        title: 'Request Failed',
        description: error.message || 'Failed to send buddy request',
        variant: 'destructive'
      });
    }
  };

  // Handle search input
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery.trim()) {
        searchUsers(searchQuery);
      } else {
        setUsers([]);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  // Get user initials for avatar
  const getUserInitials = (username: string) => {
    return username
      .split(' ')
      .map(name => name[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Get plan color
  const getPlanColor = (plan: string) => {
    switch (plan) {
      case 'goat':
        return 'bg-purple-500';
      case 'zeus':
        return 'bg-blue-500';
      case 'spartan':
        return 'bg-green-500';
      case 'reply-guy':
        return 'bg-yellow-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Find Users
          </CardTitle>
          <CardDescription>
            Search for users to add as buddies or invite to co-streams
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search by username or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                onClick={() => setSearchQuery('')}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Loading State */}
          {loading && (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          )}

          {/* Search Results */}
          {!loading && users.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-gray-700">
                Found {users.length} user{users.length !== 1 ? 's' : ''}
              </h3>
              {users.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={`/api/avatar/${user.id}`} />
                      <AvatarFallback className="text-sm">
                        {getUserInitials(user.username)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{user.username}</span>
                        <Badge variant="outline" className={getPlanColor(user.plan)}>
                          {user.plan}
                        </Badge>
                        {user.role === 'admin' && (
                          <Badge variant="secondary">Admin</Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-500">{user.email}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {showBuddyActions && (
                      <Button
                        size="sm"
                        onClick={() => sendBuddyRequest(user.id)}
                        className="flex items-center gap-1"
                      >
                        <UserPlus className="h-4 w-4" />
                        Add Buddy
                      </Button>
                    )}
                    {onUserSelect && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedUser(user);
                          onUserSelect(user);
                        }}
                      >
                        Select
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* No Results */}
          {!loading && searchQuery && users.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <Users className="h-12 w-12 mx-auto mb-2 text-gray-300" />
              <p>No users found matching "{searchQuery}"</p>
              <p className="text-sm">Try searching with a different term</p>
            </div>
          )}

          {/* Selected User */}
          {selectedUser && (
            <div className="mt-4 p-3 bg-primary/5 border border-primary/20 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Selected:</span>
                  <span className="text-sm">{selectedUser.username}</span>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setSelectedUser(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Search Tips */}
          {!searchQuery && !loading && (
            <div className="text-center py-4 text-gray-500">
              <p className="text-sm">Start typing to search for users</p>
              <p className="text-xs mt-1">You can search by username or email address</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 
 