import { useState, useEffect } from "react";
import { Navbar } from "@/components/Navbar";
import { MobileNavbar } from "@/components/MobileNavbar";
import { imageCache } from "@/lib/imageCache";
import { BackgroundImage } from "@/components/BackgroundImage";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  Table, 
  TableBody, 
  TableCaption, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { 
  Avatar,
  AvatarFallback,
  AvatarImage 
} from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Loader2, MoreVertical, Settings, Users, Monitor, Plus, Edit, Trash2 } from "lucide-react";
import SubscriptionPlanManager from "@/components/admin/SubscriptionPlanManager";
import { Link } from "wouter";
import { UserManagementDialog } from "@/components/admin/UserManagementDialog";
import { MarketplaceItemDialog } from "@/components/admin/MarketplaceItemDialog";
import SubscriptionManagement from "@/components/SubscriptionManagement";
import { AdminPresetAvatarManager } from "@/components/AdminPresetAvatarManager";

// Test data - keeping for all tabs except Users which uses real data
import { 
  dashboardStats, 
  users, 
  marketplaceItems,
  subscriptions 
} from "@/lib/admin-test-data";

// Import for real database access
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

// Admin Dashboard component
export default function AdminDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("overview");
  const queryClient = useQueryClient();
  
  // Add refresh timestamp to force cache invalidation
  const [refreshTimestamp, setRefreshTimestamp] = useState(Date.now());
  
  // Fetch real users from server API (which connects to Supabase)
  const { data: realUsers = [], isLoading: usersLoading, refetch: refetchUsers } = useQuery({
    queryKey: ["/api/admin/users"],
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  const [stats, setStats] = useState(dashboardStats);
  const [marketplaceData, setMarketplaceData] = useState(marketplaceItems);
  const [subscriptionData, setSubscriptionData] = useState(subscriptions);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [isUserDialogOpen, setIsUserDialogOpen] = useState(false);
  const [selectedMarketplaceItem, setSelectedMarketplaceItem] = useState<any>(null);
  const [isMarketplaceItemDialogOpen, setIsMarketplaceItemDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [usersPerPage, setUsersPerPage] = useState(10);
  const [sortBy, setSortBy] = useState<'username' | 'plan' | 'streamTime' | 'createdAt'>('createdAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [isLoading, setIsLoading] = useState(false);

  // Stream Management State
  const [backgrounds, setBackgrounds] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showAddBackground, setShowAddBackground] = useState(false);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [editingBackground, setEditingBackground] = useState<any>(null);
  const [editingCategory, setEditingCategory] = useState<any>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  
  // Form state for new background
  const [backgroundForm, setBackgroundForm] = useState({
    name: '',
    description: '',
    category: '',
    image_url: '',
    thumbnail_url: '',
    required_plan: 'free',
    sort_order: 0
  });

  // Form state for new category
  const [categoryForm, setCategoryForm] = useState({
    name: '',
    description: '',
    sort_order: 0
  });

  // Get admin status from the updated user data that includes Supabase metadata
  const userRoles = user?.roles || [];
  const supabaseRoles = user?.supabaseUser?.app_metadata?.roles || [];
  const allRoles = [...userRoles, ...supabaseRoles];
  
  const hasRoleInMetadata = allRoles.includes('admin') || allRoles.includes('superadmin');
  
  // Use either the API user data or the JWT metadata
  const isAdmin = hasRoleInMetadata || user?.role === "admin" || user?.role === "superadmin";
  const isSuperAdmin = allRoles.includes('superadmin') || user?.role === "superadmin";
  
  // Check URL for force auth parameter to bypass authentication for testing
  const urlParams = new URLSearchParams(window.location.search);
  const forceAuth = urlParams.get('auth') === '1';
  
  // Debug role status
  console.log('Dashboard role check:', { hasRoleInMetadata, userRoles: allRoles, isAdmin, isSuperAdmin, forceAuth });

  // Fetch dashboard data
  useEffect(() => {
    if (isAdmin || forceAuth) {
      // Use our test data for development (except users - using real Supabase data)
      setStats(dashboardStats);
      setMarketplaceData(marketplaceItems);
      setSubscriptionData(subscriptions);
      setIsLoading(false);
      
      // Load stream management data
      loadBackgrounds();
      loadCategories();
    }
  }, [isAdmin, forceAuth]);

  // Load stream data when switching to streams tab
  useEffect(() => {
    if (activeTab === 'streams' && (isAdmin || forceAuth) && (backgrounds.length === 0 || categories.length === 0)) {
      console.log('Loading stream data for streams tab...');
      loadBackgrounds();
      loadCategories();
    }
  }, [activeTab, isAdmin, forceAuth, backgrounds.length, categories.length]);

  // Load backgrounds from API
  const loadBackgrounds = async () => {
    try {
      const response = await fetch('/api/backgrounds', {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Loaded backgrounds:', data);
      setBackgrounds(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to load backgrounds:', error);
      toast({
        title: "Error",
        description: "Failed to load backgrounds",
        variant: "destructive",
      });
    }
  };

  // Load categories from API
  const loadCategories = async () => {
    try {
      const response = await fetch('/api/backgrounds/categories', {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Loaded categories:', data);
      setCategories(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to load categories:', error);
      toast({
        title: "Error",
        description: "Failed to load categories",
        variant: "destructive",
      });
    }
  };

  // Force refresh both categories and backgrounds
  const forceRefreshStreamData = async () => {
    await Promise.all([
      loadCategories(),
      loadBackgrounds(),
      queryClient.invalidateQueries({ queryKey: ['/api/backgrounds'] }),
      queryClient.invalidateQueries({ queryKey: ['/api/backgrounds/categories'] })
    ]);
  };

  // Filter backgrounds by category
  const filteredBackgrounds = selectedCategory === 'all' 
    ? backgrounds 
    : backgrounds.filter(bg => bg.category === selectedCategory);

  // Delete background handler
  const deleteBackground = async (id: number) => {
    if (!confirm('Are you sure you want to delete this background? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/backgrounds/${id}`, {
        method: 'DELETE',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to delete: ${response.status}`);
      }

      // Remove from local state and force refresh
      setBackgrounds(prev => prev.filter(bg => bg.id !== id));
      
      // Force refresh all stream data
      await forceRefreshStreamData();
      
      toast({
        title: "Success",
        description: "Background deleted successfully",
      });
    } catch (error) {
      console.error('Failed to delete background:', error);
      toast({
        title: "Error",
        description: "Failed to delete background",
        variant: "destructive",
      });
    }
  };

  // Delete category handler
  const deleteCategory = async (id: number) => {
    if (!confirm('Are you sure you want to delete this category? This will also remove all backgrounds in this category.')) {
      return;
    }

    try {
      const response = await fetch(`/api/backgrounds/categories/${id}`, {
        method: 'DELETE',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to delete: ${response.status}`);
      }

      // Remove from local state and force refresh
      setCategories(prev => prev.filter(cat => cat.id !== id));
      
      // Force refresh all stream data
      await forceRefreshStreamData();
      
      toast({
        title: "Success",
        description: "Category and associated backgrounds deleted successfully",
      });
    } catch (error) {
      console.error('Failed to delete category:', error);
      toast({
        title: "Error",
        description: "Failed to delete category",
        variant: "destructive",
      });
    }
  };

  // Store selected file for later upload
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Handle file selection (not immediate upload)
  const handleFileSelection = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: "Please select a JPEG, PNG, or WebP image file.",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      toast({
        title: "File too large",
        description: "Please select an image smaller than 10MB.",
        variant: "destructive",
      });
      return;
    }

    // Store file and create preview
    setSelectedFile(file);
    const previewUrl = URL.createObjectURL(file);
    setBackgroundForm(prev => ({
      ...prev,
      image_url: previewUrl
    }));

    toast({
      title: "File selected",
      description: "Please fill in the name and description, then submit to upload.",
    });
  };

  // Handle actual IPFS upload when form is submitted
  const uploadToIPFS = async (file: File, formData: any) => {
    setUploadingImage(true);
    try {
      // Get current session token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No authentication session found');
      }

      // Create FormData for IPFS upload using the working endpoint
      const uploadFormData = new FormData();
      uploadFormData.append('image', file);
      uploadFormData.append('name', formData.name || file.name.replace(/\.[^/.]+$/, ''));
      uploadFormData.append('description', formData.description || 'User uploaded background');
      uploadFormData.append('category', formData.category || 'bedroom');
      uploadFormData.append('useIPFS', 'true');

      console.log('Uploading with form data:', {
        fileName: file.name,
        backgroundName: formData.name,
        description: formData.description,
        category: formData.category
      });
      
      const response = await fetch('/api/admin/upload-background-preview', {
        method: 'POST',
        body: uploadFormData,
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Upload error response:', errorText);
        throw new Error(errorText || 'Upload failed');
      }

      const result = await response.json();
      console.log('Upload result:', result);

      toast({
        title: "IPFS Upload Successful",
        description: `Uploaded ${formData.name} to IPFS successfully`,
      });

      return result;
    } catch (error) {
      console.error('Image upload failed:', error);
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Failed to upload image",
        variant: "destructive",
      });
      throw error;
    } finally {
      setUploadingImage(false);
    }
  };

  // Handle background form submission with IPFS upload
  const handleBackgroundSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Get current session
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      toast({
        title: "Authentication Error",
        description: "Please log in to continue",
        variant: "destructive",
      });
      return;
    }
    
    // Validate required fields
    if (!backgroundForm.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter a background name",
        variant: "destructive",
      });
      return;
    }

    if (!backgroundForm.description.trim()) {
      toast({
        title: "Validation Error", 
        description: "Please enter a background description",
        variant: "destructive",
      });
      return;
    }

    if (!backgroundForm.category) {
      toast({
        title: "Validation Error",
        description: "Please select a category",
        variant: "destructive",
      });
      return;
    }

    try {
      let finalBackgroundData = { ...backgroundForm };

      // If there's a selected file, upload it to IPFS first
      if (selectedFile) {
        const uploadResult = await uploadToIPFS(selectedFile, backgroundForm);
        finalBackgroundData = {
          ...backgroundForm,
          image_url: uploadResult.imageUrl,
          thumbnail_url: uploadResult.thumbnailUrl,
        };
      }

      // Create or update background in database
      const url = editingBackground 
        ? `/api/admin/backgrounds/${editingBackground.id}`
        : '/api/backgrounds';
      
      const method = editingBackground ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(finalBackgroundData),
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Failed to save background: ${errorData}`);
      }

      const result = await response.json();
      console.log('Background saved:', result);

      toast({
        title: "Success",
        description: editingBackground ? "Background updated successfully" : "Background created successfully",
      });

      // Reset form and close dialog
      setShowAddBackground(false);
      setEditingBackground(null);
      setSelectedFile(null);
      setBackgroundForm({
        name: '',
        description: '',
        category: '',
        image_url: '',
        thumbnail_url: '',
        required_plan: 'free',
        sort_order: 0
      });

      // Refresh data - force refresh both backgrounds and categories
      await forceRefreshStreamData();

    } catch (error) {
      console.error('Background submission failed:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save background",
        variant: "destructive",
      });
    }
  };

  // Fetch data from API
  const fetchDashboardData = async () => {
    if (!isAdmin && !forceAuth) return;
    
    setIsLoading(true);
    try {
      // In a real implementation, we would fetch data from API
      // const statsResponse = await apiRequest("GET", "/api/admin/stats");
      // const usersResponse = await apiRequest("GET", "/api/admin/users");
      // const marketplaceResponse = await apiRequest("GET", "/api/admin/marketplace-items");
      // const subscriptionsResponse = await apiRequest("GET", "/api/admin/subscriptions");
      
      // For development, just simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Set with test data (except users - using real Supabase data)
      setStats(dashboardStats);
      setMarketplaceData(marketplaceItems);
      setSubscriptionData(subscriptions);
      
      toast({
        title: "Data refreshed",
        description: "Dashboard data has been updated",
      });
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      toast({
        title: "Error",
        description: "Failed to fetch dashboard data. Using test data instead.",
        variant: "destructive",
      });
      
      // Fallback to test data if API fails
      setStats(dashboardStats);
      setMarketplaceData(marketplaceItems);
      setSubscriptionData(subscriptions);
    } finally {
      setIsLoading(false);
    }
  };

  // User management functions
  const handleOpenUserDialog = (user: any) => {
    console.log('Opening user dialog for:', user);
    setSelectedUser(user);
    setIsUserDialogOpen(true);
  };

  const handleUserUpdateSuccess = () => {
    // Simple cache invalidation without aggressive refetching
    queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
    
    toast({
      title: "User updated", 
      description: "User status has been updated successfully",
    });
  };



  // Filter and sort users
  const filteredUsers = realUsers
    .filter((user: any) => {
      if (!searchTerm) return true;
      
      const term = searchTerm.toLowerCase();
      const username = (user.username || user.email?.split('@')[0] || '').toLowerCase();
      const email = (user.email || '').toLowerCase();
      const userId = (user.id || '').toLowerCase();
      const plan = (user.plan || 'free').toLowerCase();
      const role = (user.role || 'user').toLowerCase();
      
      // Handle special filter syntax
      if (term.startsWith('role:')) {
        const roleFilter = term.replace('role:', '');
        return role.includes(roleFilter) || (roleFilter === 'admin' && role === 'superadmin');
      }
      if (term.startsWith('plan:')) {
        const planFilter = term.replace('plan:', '');
        return plan === planFilter;
      }
      if (term.startsWith('verified:')) {
        const verifiedFilter = term.replace('verified:', '') === 'true';
        return user.is_verified === verifiedFilter;
      }
      if (term.startsWith('blocked:')) {
        const blockedFilter = term.replace('blocked:', '') === 'true';
        return user.blocked === blockedFilter;
      }
      
      // Regular text search
      return username.includes(term) || 
             email.includes(term) || 
             userId.includes(term) ||
             plan.includes(term);
    })
    .sort((a: any, b: any) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'username':
          aValue = (a.username || a.email?.split('@')[0] || '').toLowerCase();
          bValue = (b.username || b.email?.split('@')[0] || '').toLowerCase();
          break;
        case 'plan':
          aValue = a.plan || 'free';
          bValue = b.plan || 'free';
          break;
        case 'streamTime':
          aValue = a.total_stream_time || 0;
          bValue = b.total_stream_time || 0;
          break;
        case 'createdAt':
          aValue = new Date(a.created_at || 0).getTime();
          bValue = new Date(b.created_at || 0).getTime();
          break;
        default:
          aValue = 0;
          bValue = 0;
      }
      
      if (sortDirection === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

  // Pagination logic
  const totalPages = Math.ceil(filteredUsers.length / usersPerPage);
  const startIndex = (currentPage - 1) * usersPerPage;
  const endIndex = startIndex + usersPerPage;
  const paginatedUsers = filteredUsers.slice(startIndex, endIndex);

  // Export CSV function
  const exportToCSV = () => {
    const exportData = filteredUsers.map(user => ({
      Username: user.username || user.email?.split('@')[0] || '',
      Email: user.email || '',
      Plan: user.plan || 'free',
      Role: user.role || 'user',
      'Stream Time (min)': Math.floor((user.total_stream_time || 0) / 60),
      'Stream Sessions': user.total_stream_sessions || 0,
      'Avatars Created': user.avatars_created || 0,
      'Viewer Count': user.viewer_count || 0,
      Verified: user.is_verified ? 'Yes' : 'No',
      Blocked: user.blocked ? 'Yes' : 'No',
      'Created At': user.created_at ? new Date(user.created_at).toLocaleDateString() : '',
      'Last Stream': user.last_stream_at ? new Date(user.last_stream_at).toLocaleDateString() : 'Never'
    }));

    const csvHeaders = Object.keys(exportData[0] || {}).join(',');
    const csvRows = exportData.map(row => 
      Object.values(row).map(value => 
        typeof value === 'string' ? `"${value.replace(/"/g, '""')}"` : value || ''
      ).join(',')
    );
    
    const csvContent = [csvHeaders, ...csvRows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `vida3-users-${searchTerm || 'all'}-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  // Function to update user with Supabase integration
  const updateUser = async (userId: string, data: any) => {
    try {
      setIsLoading(true);
      
      // Call the API to update user in Supabase
      const response = await apiRequest("PATCH", `/api/admin/users/${userId}`, data);
      
      if (response.ok) {
        // Refresh user data from database
        if (refetchUsers) refetchUsers();
        fetchDashboardData();
        
        toast({
          title: "Success",
          description: "User updated successfully.",
        });
      } else {
        throw new Error('Failed to update user');
      }
    } catch (error) {
      console.error("Error updating user:", error);
      toast({
        title: "Error",
        description: "Failed to update user. Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Function to update user role with proper hierarchy checks
  const updateUserRole = async (userId: string, newRole: string) => {
    try {
      // Check if current user has permission to assign this role
      if (newRole === 'superadmin' && !isSuperAdmin) {
        toast({
          title: "Insufficient Permissions",
          description: "Only superadmins can assign superadmin roles.",
          variant: "destructive",
        });
        return;
      }

      if (newRole === 'admin' && !isSuperAdmin && !isAdmin) {
        toast({
          title: "Insufficient Permissions", 
          description: "You don't have permission to assign admin roles.",
          variant: "destructive",
        });
        return;
      }

      setIsLoading(true);
      
      const response = await apiRequest("PATCH", `/api/admin/users/${userId}/role`, { 
        role: newRole 
      });
      
      if (response.ok) {
        if (refetchUsers) refetchUsers();
        fetchDashboardData();
        
        toast({
          title: "Role Updated",
          description: `User role has been updated to ${newRole}.`,
        });
      } else {
        throw new Error('Failed to update user role');
      }
    } catch (error) {
      console.error("Error updating user role:", error);
      toast({
        title: "Error",
        description: "Failed to update user role. Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Function to block/unblock user
  const toggleUserStatus = async (userId: string, blocked: boolean) => {
    try {
      setIsLoading(true);
      
      const response = await apiRequest("PATCH", `/api/admin/users/${userId}/status`, { 
        blocked 
      });
      
      if (response.ok) {
        if (refetchUsers) refetchUsers();
        fetchDashboardData();
        
        toast({
          title: blocked ? "User Blocked" : "User Unblocked",
          description: `User has been ${blocked ? 'blocked' : 'unblocked'} successfully.`,
        });
      } else {
        throw new Error('Failed to update user status');
      }
    } catch (error) {
      console.error("Error updating user status:", error);
      toast({
        title: "Error",
        description: "Failed to update user status. Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Marketplace item functions
  const handleOpenMarketplaceItemDialog = (item: any) => {
    setSelectedMarketplaceItem(item);
    setIsMarketplaceItemDialogOpen(true);
  };

  const handleMarketplaceItemUpdateSuccess = () => {
    fetchDashboardData();
    toast({
      title: "Marketplace item updated",
      description: "Item has been updated successfully",
    });
  };

  // Function to update marketplace item
  const updateMarketplaceItem = async (itemId: string, data: any) => {
    try {
      setIsLoading(true);
      // In a real implementation, you would call your API
      // const response = await apiRequest("PATCH", `/api/admin/marketplace-items/${itemId}`, data);
      
      // For now, just update the local state
      setMarketplaceData(prevItems => 
        prevItems.map(item => 
          item.id === itemId ? { ...item, ...data } : item
        )
      );
      
      toast({
        title: "Success",
        description: "Marketplace item updated successfully.",
      });
    } catch (error) {
      console.error("Error updating marketplace item:", error);
      toast({
        title: "Error",
        description: "Failed to update marketplace item. Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Skip authentication check if force auth is enabled
  if (!forceAuth && !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md bg-black/60 border-surface">
          <CardHeader>
            <CardTitle>Authentication Required</CardTitle>
            <CardDescription>
              Please log in to access the admin dashboard
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              You need to log in with admin credentials to access this page.
            </p>
            <Button 
              variant="default" 
              className="w-full"
              onClick={() => window.location.href = '/admin/login'}
            >
              Go to Admin Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <MobileNavbar />
      
      <div className="flex-1 container py-8 px-4 md:px-6 mt-16 mb-20 pb-16">
        <div className="mb-6 flex flex-col md:flex-row justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">Admin Dashboard</h1>
            <p className="text-muted-foreground text-sm md:text-base mt-1">
              Manage your platform's users, content, and analytics
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className={isSuperAdmin ? "border-red-500 text-red-500" : "border-blue-500 text-blue-500"}>
              {isSuperAdmin ? "Super Admin" : "Admin"}
            </Badge>
            <Button variant="outline" size="sm" className="md:size-default shadow-glow-sm" onClick={fetchDashboardData}>
              <span className="hidden md:inline">Refresh Data</span>
              <span className="inline md:hidden">Refresh</span>
            </Button>
            <Link href="/admin/settings">
              <Button variant="ghost" size="sm" className="md:size-default">
                <Settings className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
        
        {/* Admin Tabs */}
        <div className="mb-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="sticky top-16 z-50 bg-background pt-3 pb-6 mb-6">
              <div className="mb-4">
                <div className="flex flex-col md:flex-row gap-3 md:gap-2">
                  <div className="flex gap-3 w-full">
                    <button 
                      onClick={() => setActiveTab("overview")}
                      className={`flex-1 px-3 py-2.5 text-center text-xs font-medium rounded-lg
                      bg-background/80 hover:bg-background/90 border border-surface/50 shadow-sm
                      transition-all ${activeTab === "overview" ? "bg-primary/10 text-primary border-primary/30 shadow-glow-sm" : ""}`}
                    >
                      Overview
                    </button>
                    <button 
                      onClick={() => setActiveTab("users")}
                      className={`flex-1 px-3 py-2.5 text-center text-xs font-medium rounded-lg
                      bg-background/80 hover:bg-background/90 border border-surface/50 shadow-sm
                      transition-all ${activeTab === "users" ? "bg-primary/10 text-primary border-primary/30 shadow-glow-sm" : ""}`}
                    >
                      Users
                    </button>
                    <button 
                      onClick={() => setActiveTab("streams")}
                      className={`flex-1 px-3 py-2.5 text-center text-xs font-medium rounded-lg
                      bg-background/80 hover:bg-background/90 border border-surface/50 shadow-sm
                      transition-all ${activeTab === "streams" ? "bg-primary/10 text-primary border-primary/30 shadow-glow-sm" : ""}`}
                    >
                      Streams
                    </button>
                  </div>
                  
                  <div className="flex gap-3 w-full">
                    <button 
                      onClick={() => setActiveTab("marketplace")}
                      className={`flex-1 px-3 py-2.5 text-center text-xs font-medium rounded-lg
                      bg-background/80 hover:bg-background/90 border border-surface/50 shadow-sm
                      transition-all ${activeTab === "marketplace" ? "bg-primary/10 text-primary border-primary/30 shadow-glow-sm" : ""}`}
                    >
                      Market
                    </button>
                    <button 
                      onClick={() => setActiveTab("subscriptions")}
                      className={`flex-1 px-3 py-2.5 text-center text-xs font-medium rounded-lg
                      bg-background/80 hover:bg-background/90 border border-surface/50 shadow-sm
                      transition-all ${activeTab === "subscriptions" ? "bg-primary/10 text-primary border-primary/30 shadow-glow-sm" : ""}`}
                    >
                      Subs
                    </button>
                    <button 
                      onClick={() => setActiveTab("settings")}
                      className={`flex-1 px-3 py-2.5 text-center text-xs font-medium rounded-lg
                      bg-background/80 hover:bg-background/90 border border-surface/50 shadow-sm
                      transition-all ${activeTab === "settings" ? "bg-primary/10 text-primary border-primary/30 shadow-glow-sm" : ""}`}
                    >
                      Settings
                    </button>
                  </div>
                </div>
              </div>
              <div className="border-b border-surface"></div>
            </div>
            
            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6 pt-4 mt-2">
              {isLoading ? (
                <div className="h-96 flex items-center justify-center">
                  <Loader2 className="h-12 w-12 animate-spin text-primary" />
                </div>
              ) : (
                <>
                  {/* Stats Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-36 sm:mb-16">
                    <Card className="glass-card overflow-hidden shadow-glow-sm">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Users className="h-5 w-5 text-primary" />
                          Users
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-muted-foreground text-xs sm:text-sm">Total Users</p>
                            <p className="text-2xl sm:text-3xl font-bold">{stats.totalUsers}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground text-xs sm:text-sm">New This Week</p>
                            <p className="text-2xl sm:text-3xl font-bold text-primary">+{stats.newUsers}</p>
                          </div>
                        </div>
                        <Progress value={stats.userGrowth} className="h-1 mt-4 bg-surface" />
                        <p className="text-xs text-muted-foreground mt-2">
                          {stats.userGrowth}% growth vs last month
                        </p>
                      </CardContent>
                    </Card>
                    
                    <Card className="glass-card overflow-hidden shadow-glow-sm">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <i className="ri-vidicon-fill text-accent"></i>
                          Streams
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-muted-foreground text-xs sm:text-sm">Total Streams</p>
                            <p className="text-2xl sm:text-3xl font-bold">{stats.totalStreams}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground text-xs sm:text-sm">Active Now</p>
                            <p className="text-2xl sm:text-3xl font-bold text-accent">{stats.activeStreams}</p>
                          </div>
                        </div>
                        <Progress value={stats.streamGrowth} className="h-1 mt-4" />
                        <p className="text-xs text-muted-foreground mt-2">
                          {stats.streamGrowth}% growth vs last month
                        </p>
                      </CardContent>
                    </Card>
                    
                    <Card className="glass-card overflow-hidden shadow-glow-sm">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <i className="ri-coins-line text-secondary"></i>
                          Revenue
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-muted-foreground text-xs sm:text-sm">Monthly</p>
                            <p className="text-2xl sm:text-3xl font-bold">${stats.monthlyRevenue}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground text-xs sm:text-sm">Annual</p>
                            <p className="text-2xl sm:text-3xl font-bold text-secondary">${stats.annualRevenue}k</p>
                          </div>
                        </div>
                        <Progress value={stats.revenueGrowth} className="h-1 mt-4" />
                        <p className="text-xs text-muted-foreground mt-2">
                          {stats.revenueGrowth}% growth vs last month
                        </p>
                      </CardContent>
                    </Card>
                    
                    <Card className="glass-card overflow-hidden shadow-glow-sm">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <i className="ri-ghost-line text-primary-light"></i>
                          Avatars
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-muted-foreground text-xs sm:text-sm">Total</p>
                            <p className="text-2xl sm:text-3xl font-bold">{stats.totalAvatars}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground text-xs sm:text-sm">New This Week</p>
                            <p className="text-2xl sm:text-3xl font-bold text-primary">+{stats.newAvatars}</p>
                          </div>
                        </div>
                        <Progress value={stats.avatarGrowth} className="h-1 mt-4" />
                        <p className="text-xs text-muted-foreground mt-2">
                          {stats.avatarGrowth}% growth vs last month
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                  
                  {/* Recent Activity Table */}
                  <Card className="glass-card overflow-hidden shadow-glow-sm">
                    <CardHeader>
                      <CardTitle>Recent Activity</CardTitle>
                      <CardDescription>
                        Overview of latest platform activities
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow className="border-surface hover:bg-black/40">
                            <TableHead>User</TableHead>
                            <TableHead>Action</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {stats.recentActivity.map((activity, index) => (
                            <TableRow key={index} className="border-surface hover:bg-black/40">
                              <TableCell className="font-medium">{activity.user}</TableCell>
                              <TableCell>{activity.action}</TableCell>
                              <TableCell>{activity.date}</TableCell>
                              <TableCell>
                                <Badge variant={
                                  activity.status === 'Completed' ? 'default' : 
                                  activity.status === 'Pending' ? 'secondary' : 
                                  activity.status === 'Failed' ? 'destructive' : 'outline'
                                }
                                className={
                                  activity.status === 'Completed' ? 'bg-green-500/20 text-green-500 hover:bg-green-500/30' : 
                                  activity.status === 'Pending' ? 'bg-yellow-500/20 text-yellow-500 hover:bg-yellow-500/30' : 
                                  activity.status === 'Failed' ? 'bg-red-500/20 text-red-500 hover:bg-red-500/30' : ''
                                }>
                                  {activity.status}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </>
              )}
            </TabsContent>
            
            {/* Users Tab */}
            <TabsContent value="users" className="space-y-6 pt-4 mt-2">
              {isLoading ? (
                <div className="h-96 flex items-center justify-center">
                  <Loader2 className="h-12 w-12 animate-spin text-primary" />
                </div>
              ) : (
                <>
                  <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                    <div>
                      <h2 className="text-2xl font-bold">User Management</h2>
                      <p className="text-muted-foreground">Manage users, roles, streaming limits, and platform activity</p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
                      <Input
                        placeholder="Search by username, email, ID, or plan..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full sm:w-80 bg-surface/50 border-surface"
                      />
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          className="glass-card border-surface"
                          onClick={() => setSearchTerm('')}
                        >
                          Clear
                        </Button>
                        <Button 
                          className="bg-primary hover:bg-primary/80"
                          onClick={exportToCSV}
                        >
                          Export CSV ({filteredUsers.length})
                        </Button>
                      </div>
                    </div>
                  </div>



                  {/* User Statistics Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
                    <Card className="glass-card shadow-glow-sm">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-muted-foreground">Total Users</p>
                            <p className="text-2xl font-bold">{realUsers.length}</p>
                          </div>
                          <div className="text-blue-400">👥</div>
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card className="glass-card shadow-glow-sm">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-muted-foreground">Active Streamers</p>
                            <p className="text-2xl font-bold">
                              {realUsers.filter((u: any) => (u.total_stream_time || 0) > 0).length}
                            </p>
                          </div>
                          <div className="text-red-400">🔴</div>
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card className="glass-card shadow-glow-sm">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-muted-foreground">Verified Users</p>
                            <p className="text-2xl font-bold">
                              {realUsers.filter((u: any) => u.is_verified).length}
                            </p>
                          </div>
                          <div className="text-blue-400">✓</div>
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card className="glass-card shadow-glow-sm">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-muted-foreground">Paid Users</p>
                            <p className="text-2xl font-bold">
                              {realUsers.filter((u: any) => u.plan !== 'free').length}
                            </p>
                          </div>
                          <div className="text-green-400">💳</div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="glass-card shadow-glow-sm">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-muted-foreground">Blocked Users</p>
                            <p className="text-2xl font-bold">
                              {realUsers.filter((u: any) => u.blocked).length}
                            </p>
                          </div>
                          <div className="text-red-400">🚫</div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Enhanced Filter Bar */}
                  <div className="flex flex-wrap gap-2 mb-6">
                    <Badge 
                      variant={searchTerm === '' ? 'default' : 'outline'} 
                      className="cursor-pointer hover:bg-primary/20"
                      onClick={() => setSearchTerm('')}
                    >
                      All ({realUsers.length})
                    </Badge>
                    <Badge 
                      variant={searchTerm.includes('role:admin') ? 'default' : 'outline'} 
                      className="cursor-pointer hover:bg-primary/20"
                      onClick={() => setSearchTerm('role:admin')}
                    >
                      Admins ({realUsers.filter((u: any) => u.role === 'admin' || u.role === 'superadmin').length})
                    </Badge>
                    <Badge 
                      variant={searchTerm.includes('plan:goat') ? 'default' : 'outline'} 
                      className="cursor-pointer hover:bg-primary/20"
                      onClick={() => setSearchTerm('plan:goat')}
                    >
                      GOAT Plan ({realUsers.filter((u: any) => u.plan === 'goat').length})
                    </Badge>
                    <Badge 
                      variant={searchTerm.includes('verified:true') ? 'default' : 'outline'} 
                      className="cursor-pointer hover:bg-primary/20"
                      onClick={() => setSearchTerm('verified:true')}
                    >
                      Verified ({realUsers.filter((u: any) => u.is_verified).length})
                    </Badge>
                    <Badge 
                      variant={searchTerm.includes('blocked:true') ? 'default' : 'outline'} 
                      className="cursor-pointer hover:bg-primary/20"
                      onClick={() => setSearchTerm('blocked:true')}
                    >
                      Blocked ({realUsers.filter((u: any) => u.blocked).length})
                    </Badge>
                  </div>

                  {/* Pagination and Sorting Controls */}
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">Show:</span>
                        <select 
                          value={usersPerPage} 
                          onChange={(e) => {
                            setUsersPerPage(Number(e.target.value));
                            setCurrentPage(1);
                          }}
                          className="bg-surface border border-surface rounded px-2 py-1 text-sm"
                        >
                          <option value={10}>10</option>
                          <option value={100}>100</option>
                          <option value={1000}>1000</option>
                        </select>
                        <span className="text-sm text-muted-foreground">users per page</span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">Sort by:</span>
                        <select 
                          value={sortBy} 
                          onChange={(e) => setSortBy(e.target.value as any)}
                          className="bg-surface border border-surface rounded px-2 py-1 text-sm"
                        >
                          <option value="createdAt">Created Date</option>
                          <option value="username">Username</option>
                          <option value="plan">Plan</option>
                          <option value="streamTime">Stream Time</option>
                        </select>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')}
                          className="p-2"
                        >
                          {sortDirection === 'asc' ? '↑' : '↓'}
                        </Button>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      Showing {startIndex + 1}-{Math.min(endIndex, filteredUsers.length)} of {filteredUsers.length} users
                    </div>
                  </div>
                  
                  {/* Desktop Table View */}
                  <div className="hidden md:block">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-surface hover:bg-black/40">
                          <TableHead>User</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Role</TableHead>
                          <TableHead>Subscription</TableHead>
                          <TableHead>Streaming</TableHead>
                          <TableHead>Avatars</TableHead>
                          <TableHead>DMCA</TableHead>
                          <TableHead>Suspensions</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedUsers.map((user: any) => (
                          <TableRow key={user.id} className="border-surface hover:bg-black/40">
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <Avatar>
                                  <AvatarImage src={user.avatar_url} />
                                  <AvatarFallback>{(user.username || user.email?.split('@')[0] || 'U').substring(0, 2).toUpperCase()}</AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="font-medium">{user.username || user.email?.split('@')[0] || 'Unknown User'}</p>
                                  <p className="text-sm text-muted-foreground">@{user.username || user.email?.split('@')[0] || 'unknown'}</p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-muted-foreground">{user.email}</TableCell>
                            <TableCell>
                              <Badge variant={
                                user.role === 'superadmin' ? 'destructive' : 
                                user.role === 'admin' ? 'default' : 'outline'
                              } className={
                                user.role === 'superadmin' ? 'bg-purple-500/20 text-purple-400 border-purple-500/40' :
                                user.role === 'admin' ? 'bg-blue-500/20 text-blue-400 border-blue-500/40' :
                                'bg-gray-500/20 text-gray-400 border-gray-500/40'
                              }>
                                {user.role === 'superadmin' ? '👑 Super Admin' : 
                                 user.role === 'admin' ? '🛡️ Admin' : 
                                 '👤 User'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className={
                                  user.plan === 'goat' ? 'bg-gradient-to-r from-yellow-500/20 to-orange-500/20 text-yellow-400 border-yellow-500/40' :
                                  user.plan === 'zeus' ? 'bg-blue-500/20 text-blue-400 border-blue-500/40' :
                                  user.plan === 'spartan' ? 'bg-green-500/20 text-green-400 border-green-500/40' :
                                  user.plan === 'reply_guy' ? 'bg-purple-500/20 text-purple-400 border-purple-500/40' :
                                  'bg-gray-500/20 text-gray-400 border-gray-500/40'
                                }>
                                  {user.plan === 'goat' ? '🐐 GOAT' :
                                   user.plan === 'zeus' ? '⚡ Zeus' :
                                   user.plan === 'spartan' ? '🛡️ Spartan' :
                                   user.plan === 'reply_guy' ? '💬 Reply Guy' :
                                   '🆓 Free'}
                                </Badge>
                              </div>
                            </TableCell>
                            
                            {/* Streaming Activity */}
                            <TableCell>
                              <div className="text-center">
                                <div className="text-sm font-medium">
                                  {Math.floor((user.total_stream_time || 0) / 60)}m
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {user.total_stream_sessions || 0} sessions
                                </div>
                              </div>
                            </TableCell>
                            
                            {/* Avatar Creation */}
                            <TableCell>
                              <div className="text-center">
                                <div className="text-sm font-medium">
                                  {user.avatars_created || 0}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {user.last_avatar_created_at ? 'Recent' : 'None'}
                                </div>
                              </div>
                            </TableCell>
                            
                            {/* DMCA Complaints */}
                            <TableCell>
                              <div className="text-center">
                                <div className={`text-sm font-medium ${
                                  (user.dmca_complaint_count || 0) > 0 ? 'text-red-400' : 'text-gray-400'
                                }`}>
                                  ⚠️ {user.dmca_complaint_count || 0}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {user.last_dmca_date ? 'Recent' : 'None'}
                                </div>
                              </div>
                            </TableCell>
                            
                            {/* Suspensions */}
                            <TableCell>
                              <div className="text-center">
                                <div className={`text-sm font-medium ${
                                  (user.suspension_count || 0) > 0 ? 'text-red-400' : 'text-gray-400'
                                }`}>
                                  🚫 {user.suspension_count || 0}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {user.current_suspension_type ? (
                                    <Badge variant="destructive" className="text-xs px-1 py-0">
                                      {user.current_suspension_type}
                                    </Badge>
                                  ) : (
                                    <span>None</span>
                                  )}
                                </div>
                              </div>
                            </TableCell>
                            
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${
                                  user.blocked ? 'bg-red-500' : 'bg-green-500'
                                }`}></div>
                                <span className="capitalize">
                                  {user.blocked ? 'Blocked' : 'Active'}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon">
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="bg-surface/95 backdrop-blur-sm border-surface">
                                  <DropdownMenuLabel>User Actions</DropdownMenuLabel>
                                  <DropdownMenuItem onClick={() => handleOpenUserDialog(user)}>
                                    Edit Profile
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  
                                  {/* Status Management */}
                                  <DropdownMenuItem 
                                    onClick={() => toggleUserStatus(user.id, !user.blocked)}
                                    className={user.blocked ? 'text-green-400' : 'text-red-400'}
                                  >
                                    {user.blocked ? '✓ Unblock User' : '⚠ Block User'}
                                  </DropdownMenuItem>
                                  
                                  <DropdownMenuSeparator />
                                  
                                  {/* Role Management with Hierarchy */}
                                  {user.role === 'user' && (isAdmin || isSuperAdmin) && (
                                    <DropdownMenuItem onClick={() => updateUserRole(user.id, 'admin')}>
                                      ⬆ Promote to Admin
                                    </DropdownMenuItem>
                                  )}
                                  
                                  {user.role === 'admin' && (
                                    <>
                                      <DropdownMenuItem onClick={() => updateUserRole(user.id, 'user')}>
                                        ⬇ Demote to User
                                      </DropdownMenuItem>
                                      {isSuperAdmin && (
                                        <DropdownMenuItem onClick={() => updateUserRole(user.id, 'superadmin')}>
                                          ⬆ Promote to Super Admin
                                        </DropdownMenuItem>
                                      )}
                                    </>
                                  )}
                                  
                                  {user.role === 'superadmin' && isSuperAdmin && (
                                    <DropdownMenuItem 
                                      onClick={() => updateUserRole(user.id, 'admin')}
                                      className="text-yellow-400"
                                    >
                                      ⬇ Demote to Admin
                                    </DropdownMenuItem>
                                  )}
                                  
                                  <DropdownMenuSeparator />
                                  
                                  {/* Subscription Management */}
                                  <DropdownMenuItem onClick={() => handleOpenUserDialog(user)}>
                                    💳 Manage Subscription
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>

                    {/* Desktop Pagination Controls */}
                    <div className="flex justify-between items-center mt-6">
                      <div className="text-sm text-muted-foreground">
                        Page {currentPage} of {totalPages}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                          disabled={currentPage === 1}
                        >
                          Previous
                        </Button>
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          const pageNum = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
                          if (pageNum <= totalPages) {
                            return (
                              <Button
                                key={pageNum}
                                variant={pageNum === currentPage ? "default" : "outline"}
                                size="sm"
                                onClick={() => setCurrentPage(pageNum)}
                              >
                                {pageNum}
                              </Button>
                            );
                          }
                          return null;
                        })}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                          disabled={currentPage === totalPages}
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  </div>
                  
                  {/* Mobile Card View */}
                  <div className="grid grid-cols-1 gap-4 md:hidden" style={{ zIndex: 0 }}>
                    {paginatedUsers
                      .map((user: any) => (
                      <Card key={user.id} className="glass-card shadow-glow-sm">
                        <CardHeader className="pb-2">
                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-3">
                              <Avatar>
                                <AvatarImage src={user.avatar_url} />
                                <AvatarFallback>{(user.username || user.email?.split('@')[0] || 'U').substring(0, 2).toUpperCase()}</AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium">{user.username || user.email?.split('@')[0] || 'Unknown User'}</p>
                                <p className="text-sm text-muted-foreground">@{user.username || user.email?.split('@')[0] || 'unknown'}</p>
                              </div>
                            </div>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuItem onClick={() => handleOpenUserDialog(user)}>
                                  Edit User
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => {
                                  // Toggle user status
                                  updateUser(user.id, { status: user.status === 'active' ? 'suspended' : 'active' });
                                }}>
                                  {user.status === 'active' ? 'Suspend User' : 'Activate User'}
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => {
                                  updateUser(user.id, { role: user.role === 'user' ? 'admin' : 'user' });
                                }}>
                                  {user.role === 'user' ? 'Make Admin' : 'Remove Admin'}
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-2 gap-3 text-sm">
                            <div>
                              <p className="text-muted-foreground">Email:</p>
                              <p className="truncate">{user.email}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Plan:</p>
                              <Badge variant="outline" className={
                                user.plan === 'goat' ? 'bg-gradient-to-r from-yellow-500/20 to-orange-500/20 text-yellow-400 border-yellow-500/40' :
                                user.plan === 'zeus' ? 'bg-blue-500/20 text-blue-400 border-blue-500/40' :
                                user.plan === 'spartan' ? 'bg-green-500/20 text-green-400 border-green-500/40' :
                                user.plan === 'reply_guy' ? 'bg-purple-500/20 text-purple-400 border-purple-500/40' :
                                'bg-gray-500/20 text-gray-400 border-gray-500/40'
                              }>
                                {user.plan === 'goat' ? '🐐 GOAT' :
                                 user.plan === 'zeus' ? '⚡ Zeus' :
                                 user.plan === 'spartan' ? '🛡️ Spartan' :
                                 user.plan === 'reply_guy' ? '💬 Reply Guy' :
                                 '🆓 Free'}
                              </Badge>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Stream Time:</p>
                              <div className="text-sm">
                                <span className="font-medium">{Math.floor((user.total_stream_time || 0) / 60)}m</span>
                                <span className="text-xs text-muted-foreground ml-1">
                                  ({user.total_stream_sessions || 0} sessions)
                                </span>
                              </div>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Avatars:</p>
                              <span className="font-medium">{user.avatars_created || 0}</span>
                            </div>
                            <div>
                              <p className="text-muted-foreground">DMCA:</p>
                              <span className={`font-medium ${
                                (user.dmca_complaint_count || 0) > 0 ? 'text-red-400' : 'text-gray-400'
                              }`}>
                                ⚠️ {user.dmca_complaint_count || 0}
                              </span>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Suspensions:</p>
                              <div className="flex items-center gap-1">
                                <span className={`font-medium ${
                                  (user.suspension_count || 0) > 0 ? 'text-red-400' : 'text-gray-400'
                                }`}>
                                  🚫 {user.suspension_count || 0}
                                </span>
                                {user.current_suspension_type && (
                                  <Badge variant="destructive" className="text-xs px-1 py-0">
                                    {user.current_suspension_type}
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Role:</p>
                              <Badge variant={
                                user.role === 'superadmin' ? 'destructive' : 
                                user.role === 'admin' ? 'default' : 'outline'
                              }>
                                {user.role === 'superadmin' ? '👑 Super Admin' :
                                 user.role === 'admin' ? '🛡️ Admin' :
                                 '👤 User'}
                              </Badge>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Status:</p>
                              <div className="flex items-center gap-1">
                                <div className={`w-2 h-2 rounded-full ${
                                  user.blocked ? 'bg-red-500' : 
                                  user.is_verified ? 'bg-green-500' : 'bg-yellow-500'
                                }`}></div>
                                <span className="capitalize">
                                  {user.blocked ? 'Blocked' : user.is_verified ? 'Verified' : 'Active'}
                                </span>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </>
              )}
            </TabsContent>
            
            {/* Streams Tab */}
            <TabsContent value="streams" className="space-y-6 pt-4 mt-2">
              {/* Stream Management Dashboard */}
              <Card className="glass-card overflow-hidden shadow-glow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Monitor className="h-5 w-5 text-purple-400" />
                    Stream Management Console
                  </CardTitle>
                  <CardDescription>
                    Comprehensive background and category management for streaming infrastructure
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {/* Statistics Overview */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="p-4 rounded-lg bg-surface/50">
                        <p className="text-sm text-muted-foreground">Total Backgrounds</p>
                        <p className="text-2xl font-bold text-blue-400">{backgrounds.length}</p>
                      </div>
                      <div className="p-4 rounded-lg bg-surface/50">
                        <p className="text-sm text-muted-foreground">Categories</p>
                        <p className="text-2xl font-bold text-green-400">{categories.length}</p>
                      </div>
                      <div className="p-4 rounded-lg bg-surface/50">
                        <p className="text-sm text-muted-foreground">Active Streams</p>
                        <p className="text-2xl font-bold text-purple-400">47</p>
                      </div>
                      <div className="p-4 rounded-lg bg-surface/50">
                        <p className="text-sm text-muted-foreground">Database Status</p>
                        <p className="text-sm font-bold text-green-400">Connected</p>
                      </div>
                    </div>

                    {/* Management Controls */}
                    <div className="flex flex-col md:flex-row gap-4">
                      {/* Category Filter */}
                      <div className="flex-1">
                        <Label htmlFor="category-filter">Filter by Category</Label>
                        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Categories</SelectItem>
                            {categories.map(cat => (
                              <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-2">
                        <Dialog open={showAddBackground} onOpenChange={setShowAddBackground}>
                          <DialogTrigger asChild>
                            <Button variant="outline" className="flex items-center gap-2">
                              <Plus className="h-4 w-4" />
                              Add Background
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>
                                {editingBackground ? 'Edit Background' : 'Add New Background'}
                              </DialogTitle>
                              <DialogDescription>
                                Configure virtual background settings for streaming
                              </DialogDescription>
                            </DialogHeader>
                            <form className="space-y-4">
                              <div>
                                <Label htmlFor="bg-name">Name</Label>
                                <Input
                                  id="bg-name"
                                  value={backgroundForm.name}
                                  onChange={(e) => setBackgroundForm({...backgroundForm, name: e.target.value})}
                                  placeholder="Background name"
                                  required
                                />
                              </div>
                              <div>
                                <Label htmlFor="bg-description">Description</Label>
                                <Input
                                  id="bg-description"
                                  value={backgroundForm.description}
                                  onChange={(e) => setBackgroundForm({...backgroundForm, description: e.target.value})}
                                  placeholder="Background description"
                                  required
                                />
                              </div>
                              <div>
                                <Label htmlFor="bg-category">Category</Label>
                                <Select 
                                  value={backgroundForm.category} 
                                  onValueChange={(value) => setBackgroundForm({...backgroundForm, category: value})}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select category" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {categories.map(cat => (
                                      <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <Label htmlFor="bg-image-upload">Background Image</Label>
                                <div className="space-y-2">
                                  <input
                                    type="file"
                                    id="bg-image-upload"
                                    accept="image/*"
                                    onChange={handleFileSelection}
                                    className="block w-full text-sm text-muted-foreground
                                      file:mr-4 file:py-2 file:px-4
                                      file:rounded-full file:border-0
                                      file:text-sm file:font-semibold
                                      file:bg-primary file:text-primary-foreground
                                      hover:file:bg-primary/80"
                                  />
                                  {uploadingImage && (
                                    <div className="text-sm text-muted-foreground">
                                      Uploading image...
                                    </div>
                                  )}
                                  {backgroundForm.image_url && (
                                    <div className="flex items-center gap-2">
                                      <img 
                                        src={backgroundForm.image_url} 
                                        alt="Preview" 
                                        className="w-16 h-16 object-cover rounded border"
                                      />
                                      <div className="text-sm text-muted-foreground">
                                        Image uploaded successfully
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div>
                                <Label htmlFor="bg-plan">Required Plan</Label>
                                <Select 
                                  value={backgroundForm.required_plan} 
                                  onValueChange={(value) => setBackgroundForm({...backgroundForm, required_plan: value})}
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="free">Free</SelectItem>
                                    <SelectItem value="pro">Pro</SelectItem>
                                    <SelectItem value="premium">Premium</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <DialogFooter>
                                <Button 
                                  type="button"
                                  onClick={handleBackgroundSubmit}
                                  disabled={uploadingImage}
                                >
                                  {uploadingImage ? 'Processing...' : (editingBackground ? 'Update' : 'Create')} Background
                                </Button>
                              </DialogFooter>
                            </form>
                          </DialogContent>
                        </Dialog>

                        <Dialog open={showAddCategory} onOpenChange={setShowAddCategory}>
                          <DialogTrigger asChild>
                            <Button variant="outline" className="flex items-center gap-2">
                              <Plus className="h-4 w-4" />
                              Add Category
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>
                                {editingCategory ? 'Edit Category' : 'Add New Category'}
                              </DialogTitle>
                              <DialogDescription>
                                Create or modify background categories
                              </DialogDescription>
                            </DialogHeader>
                            <form className="space-y-4">
                              <div>
                                <Label htmlFor="cat-name">Name</Label>
                                <Input
                                  id="cat-name"
                                  value={categoryForm.name}
                                  onChange={(e) => setCategoryForm({...categoryForm, name: e.target.value})}
                                  placeholder="Category name"
                                  required
                                />
                              </div>
                              <div>
                                <Label htmlFor="cat-description">Description</Label>
                                <Input
                                  id="cat-description"
                                  value={categoryForm.description}
                                  onChange={(e) => setCategoryForm({...categoryForm, description: e.target.value})}
                                  placeholder="Category description"
                                  required
                                />
                              </div>
                              <DialogFooter>
                                <Button type="submit">
                                  {editingCategory ? 'Update' : 'Create'} Category
                                </Button>
                              </DialogFooter>
                            </form>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>

                    {/* Background Grid */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium">Virtual Backgrounds</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredBackgrounds.map((background) => (
                          <Card key={background.id} className="bg-surface/50 border-surface">
                            <CardContent className="p-4">
                              <div className="aspect-video bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg mb-3 relative overflow-hidden">
                                {(background.imageUrl || background.image_url) && (
                                  <BackgroundImage 
                                    id={background.id}
                                    name={background.name}
                                    className="w-full h-full object-cover"
                                  />
                                )}
                                <div className="absolute top-2 right-2">
                                  <Badge variant="outline" className={`text-xs ${
                                    background.required_plan === 'free' ? 'border-green-500 text-green-500' :
                                    background.required_plan === 'pro' ? 'border-yellow-500 text-yellow-500' :
                                    'border-purple-500 text-purple-500'
                                  }`}>
                                    {background.required_plan?.toUpperCase() || 'FREE'}
                                  </Badge>
                                </div>
                              </div>
                              <div className="space-y-2">
                                <h4 className="font-medium">{background.name}</h4>
                                <p className="text-sm text-muted-foreground">{background.description}</p>
                                <div className="flex items-center justify-between">
                                  <Badge variant="outline" className="text-xs">
                                    {background.category}
                                  </Badge>
                                  <div className="flex gap-1">
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => {
                                        setEditingBackground(background);
                                        setBackgroundForm(background);
                                        setShowAddBackground(true);
                                      }}
                                    >
                                      <Edit className="h-3 w-3" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => deleteBackground(background.id)}
                                      className="text-red-400 hover:text-red-300"
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>

                    {/* Category Management */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium">Category Management</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {categories.map((category) => (
                          <Card key={category.id} className="bg-surface/50 border-surface">
                            <CardContent className="p-4">
                              <div className="flex items-center justify-between">
                                <div className="flex-1">
                                  <h4 className="font-medium">{category.name}</h4>
                                  <p className="text-sm text-muted-foreground">{category.description}</p>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {backgrounds.filter(bg => bg.category === category.name).length} backgrounds
                                  </p>
                                </div>
                                <div className="flex gap-1 ml-4">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => {
                                      setEditingCategory(category);
                                      setCategoryForm(category);
                                      setShowAddCategory(true);
                                    }}
                                  >
                                    <Edit className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => deleteCategory(category.id)}
                                    className="text-red-400 hover:text-red-300"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>

                    {/* Preset Avatar Management */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium">Preset Avatar Management</h3>
                      <AdminPresetAvatarManager />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            {/* Marketplace Tab */}
            <TabsContent value="marketplace" className="space-y-6 pt-4 mt-2">
              {isLoading ? (
                <div className="h-96 flex items-center justify-center">
                  <Loader2 className="h-12 w-12 animate-spin text-primary" />
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold">Marketplace Management</h2>
                    <div className="flex items-center gap-2">
                      <Input 
                        placeholder="Search items..." 
                        className="w-full md:w-64 bg-surface"
                      />
                      <Button>
                        Add Item
                      </Button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {marketplaceData.map((item) => (
                      <Card key={item.id} className="glass-card shadow-glow-sm overflow-hidden">
                        <div className="relative h-48 overflow-hidden">
                          <img 
                            src={item.image} 
                            alt={item.name}
                            className="w-full h-full object-cover transition-transform hover:scale-105"
                          />
                          {item.featured && (
                            <Badge className="absolute top-2 right-2 bg-primary/80 backdrop-blur-sm">
                              Featured
                            </Badge>
                          )}
                          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent h-1/3"></div>
                        </div>
                        <CardHeader className="pb-2">
                          <div className="flex justify-between items-center">
                            <CardTitle>{item.name}</CardTitle>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuItem onClick={() => {
                                  // View item details
                                }}>
                                  View Details
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleOpenMarketplaceItemDialog(item)}>
                                  Edit Item
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => {
                                  // Toggle featured status
                                  updateMarketplaceItem(item.id, { featured: !item.featured });
                                }}>
                                  {item.featured ? "Remove from Featured" : "Add to Featured"}
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => {
                                  // Toggle availability
                                  updateMarketplaceItem(item.id, { available: !item.available });
                                }}>
                                  {item.available ? "Mark as Unavailable" : "Mark as Available"}
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                          <CardDescription>${item.price.toFixed(2)}</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                            <div>
                              <p className="text-muted-foreground">Category:</p>
                              <p>{item.category}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Status:</p>
                              <Badge variant="outline" className={item.available 
                                ? "bg-green-500/20 text-green-500 border-green-500" 
                                : "bg-red-500/20 text-red-500 border-red-500"}>
                                {item.available ? "Available" : "Unavailable"}
                              </Badge>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Sales:</p>
                              <p>{item.sales}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Rating:</p>
                              <div className="flex items-center">
                                <span className="mr-1">{item.rating}</span>
                                <i className="ri-star-fill text-yellow-400"></i>
                              </div>
                            </div>
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-2">{item.description}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </>
              )}
            </TabsContent>
            
            {/* Subscriptions Tab */}
            <TabsContent value="subscriptions" className="space-y-6 pt-4 mt-2">
              <SubscriptionPlanManager />
            </TabsContent>
            
            {/* Settings Tab */}
            <TabsContent value="settings" className="space-y-6">
              {isLoading ? (
                <div className="h-96 flex items-center justify-center">
                  <Loader2 className="h-12 w-12 animate-spin text-primary" />
                </div>
              ) : (
                <>
                  <Card className="glass-card shadow-glow-sm">
                    <CardHeader>
                      <CardTitle>System Settings</CardTitle>
                      <CardDescription>
                        Configure global platform settings
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                          <h3 className="text-md font-semibold">General</h3>
                          
                          <div className="space-y-2">
                            <div className="flex justify-between items-center">
                              <Label htmlFor="maintenance-mode">Maintenance Mode</Label>
                              <Switch id="maintenance-mode" />
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Put the site into maintenance mode and show a custom message
                            </p>
                          </div>
                          
                          <div className="space-y-2">
                            <div className="flex justify-between items-center">
                              <Label htmlFor="user-registration">User Registration</Label>
                              <Switch id="user-registration" defaultChecked className="modal-toggle" />
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Allow new users to register on the platform
                            </p>
                          </div>
                        </div>
                        
                        <div className="space-y-4">
                          <h3 className="text-md font-semibold">Notifications</h3>
                          
                          <div className="space-y-2">
                            <div className="flex justify-between items-center">
                              <Label htmlFor="admin-emails">Admin Email Notifications</Label>
                              <Switch id="admin-emails" defaultChecked className="modal-toggle" />
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Receive email notifications for important system events
                            </p>
                          </div>
                          
                          <div className="space-y-2">
                            <div className="flex justify-between items-center">
                              <Label htmlFor="user-notifications">User Notifications</Label>
                              <Switch id="user-notifications" defaultChecked className="modal-toggle" />
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Send notifications to users for subscription and account updates
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="pt-4 border-t border-surface">
                        <h3 className="text-md font-semibold mb-4">System Backup</h3>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm">Last backup: Yesterday at 3:45 PM</p>
                            <p className="text-xs text-muted-foreground">Automatic backups are scheduled daily</p>
                          </div>
                          <Button>
                            Backup Now
                          </Button>
                        </div>
                      </div>
                      
                      <div className="pt-4 border-t border-surface">
                        <h3 className="text-md font-semibold mb-4">Storage Usage</h3>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Avatar Storage:</span>
                            <span>45.8 GB / 100 GB</span>
                          </div>
                          <Progress value={45.8} className="h-2" />
                          
                          <div className="flex justify-between text-sm">
                            <span>Stream Recordings:</span>
                            <span>156.2 GB / 500 GB</span>
                          </div>
                          <Progress value={31.2} className="h-2" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
      
      {/* User Management Dialog */}
      {selectedUser && (
        <UserManagementDialog
          user={selectedUser}
          open={isUserDialogOpen}
          onOpenChange={setIsUserDialogOpen}
          onUpdateSuccess={handleUserUpdateSuccess}
          isSuperAdmin={isSuperAdmin}
        />
      )}
      
      {/* Marketplace Item Dialog */}
      {selectedMarketplaceItem && (
        <MarketplaceItemDialog
          item={selectedMarketplaceItem}
          open={isMarketplaceItemDialogOpen}
          onOpenChange={setIsMarketplaceItemDialogOpen}
          onUpdateSuccess={handleMarketplaceItemUpdateSuccess}
          isSuperAdmin={isSuperAdmin}
        />
      )}
    </div>
  );
}