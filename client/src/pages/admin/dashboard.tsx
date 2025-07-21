import { useState, useEffect } from "react";
import { Navbar } from "@/components/Navbar";
import { MobileNavbar } from "@/components/MobileNavbar";
import SubscriptionManagement from "../../components/SubscriptionManagement";
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
import { apiRequest } from "@/lib/queryClient";
import { BackgroundImage } from "@/components/BackgroundImage";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Link } from "wouter";
import {
  Users,
  Activity,
  ShoppingBag,
  DollarSign,
  Settings,
  MoreVertical,
  TrendingUp,
  ChevronDown,
  User,
  Shield,
  Package,
  Loader2,
  Plus,
  Edit,
  Trash2,
  Image,
  Monitor,
  Clock,
  BarChart
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { AdminPresetAvatarManager } from "@/components/AdminPresetAvatarManager";

// Mock data for dashboard stats
const dashboardStats = {
  totalUsers: 1832,
  activeUsers: 945,
  newUsers: 124,
  totalRevenue: 28975.50,
  monthlyRevenue: 4632.21,
  activeStreams: 47,
  totalStreams: 12659,
  totalStreamHours: 7843,
  avgSessionLength: 26.3,
  conversionRate: 9.2,
  churnRate: 2.4,
  mostPopularPlan: "Spartan",
  mostPopularAddOn: "Holographic Wings"
};

// Mock data for users
const users = [
  { 
    id: "1", 
    username: "johndoe", 
    email: "john@example.com", 
    role: "user", 
    plan: "spartan", 
    createdAt: "2025-02-12T10:23:45Z",
    lastActive: "2025-05-22T16:45:12Z",
    streamTime: 342,
    avatars: 4,
    status: "active"
  },
  { 
    id: "2", 
    username: "janedoe", 
    email: "jane@example.com", 
    role: "admin", 
    plan: "zeus", 
    createdAt: "2025-01-18T08:17:32Z",
    lastActive: "2025-05-23T09:12:55Z",
    streamTime: 567,
    avatars: 7,
    status: "active"
  },
  { 
    id: "3", 
    username: "bobsmith", 
    email: "bob@example.com", 
    role: "user", 
    plan: "reply_guy", 
    createdAt: "2025-03-05T14:22:18Z",
    lastActive: "2025-05-20T11:30:22Z",
    streamTime: 98,
    avatars: 2,
    status: "active"
  },
  { 
    id: "4", 
    username: "sarahjones", 
    email: "sarah@example.com", 
    role: "user", 
    plan: "goat", 
    createdAt: "2025-04-11T09:45:36Z",
    lastActive: "2025-05-23T08:15:47Z",
    streamTime: 892,
    avatars: 12,
    status: "active"
  },
  { 
    id: "5", 
    username: "alexwilson", 
    email: "alex@example.com", 
    role: "superadmin", 
    plan: "goat", 
    createdAt: "2024-12-03T16:28:51Z",
    lastActive: "2025-05-23T14:22:03Z",
    streamTime: 1243,
    avatars: 18,
    status: "active"
  }
];

// Mock data for marketplace items
const marketplaceItems = [
  {
    id: "hat-001",
    name: "Neon Cyberpunk Cap",
    category: "hats",
    price: 2.99,
    sales: 342,
    revenue: 1022.58,
    featured: true,
    status: "active",
    createdAt: "2025-01-15T10:15:30Z"
  },
  {
    id: "glass-001",
    name: "Cyberpunk Shades",
    category: "glasses",
    price: 2.49,
    sales: 517,
    revenue: 1287.33,
    featured: true,
    status: "active",
    createdAt: "2025-01-20T14:30:22Z"
  },
  {
    id: "accessory-001",
    name: "Holographic Wings",
    category: "accessories",
    price: 5.99,
    sales: 623,
    revenue: 3731.77,
    featured: true,
    status: "active",
    createdAt: "2025-02-02T09:45:12Z"
  },
  {
    id: "bg-001",
    name: "Aurora Sky",
    category: "backgrounds",
    price: 3.99,
    sales: 489,
    revenue: 1951.11,
    featured: true,
    status: "active",
    createdAt: "2025-01-28T11:20:05Z"
  },
  {
    id: "animate-001",
    name: "Teleport Effect",
    category: "animations",
    price: 6.99,
    sales: 276,
    revenue: 1929.24,
    featured: false,
    status: "active",
    createdAt: "2025-02-10T16:33:44Z"
  }
];

// Mock data for subscriptions
const subscriptions = [
  {
    id: "free",
    name: "Free",
    price: 0,
    features: ["10 pre-rigged avatars", "15 min/week streaming", "Basic avatar controls"],
    users: 1248,
    revenue: 0,
    status: "active",
    conversionRate: 12.4
  },
  {
    id: "reply_guy",
    name: "Reply Guy",
    price: 20,
    features: ["1 custom avatar", "1 hour/week streaming", "Twitter Spaces emulator", "Basic avatar controls"],
    users: 325,
    revenue: 6500,
    status: "active",
    conversionRate: 9.2
  },
  {
    id: "spartan",
    name: "Spartan",
    price: 99,
    features: ["5 custom avatars", "20 hours/week streaming", "HD export", "Advanced rigging tools", "Priority support"],
    users: 198,
    revenue: 19602,
    status: "active",
    conversionRate: 4.3
  },
  {
    id: "zeus",
    name: "Zeus",
    price: 149,
    features: ["Unlimited avatars", "50 hours/week streaming", "1080p export", "AI lipsync preview", "Priority support"],
    users: 45,
    revenue: 6705,
    status: "active",
    conversionRate: 1.8
  },
  {
    id: "goat",
    name: "GOAT",
    price: 200,
    features: ["Everything in Zeus", "4K export", "Concurrent streams", "Animation studio access", "White-glove support"],
    users: 16,
    revenue: 3200,
    status: "active",
    conversionRate: 0.5
  }
];

// Admin Dashboard component
function AdminDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("overview");
  const [stats, setStats] = useState(dashboardStats);
  const [userData, setUserData] = useState(users);
  const [marketplaceData, setMarketplaceData] = useState(marketplaceItems);
  const [subscriptionData, setSubscriptionData] = useState(subscriptions);
  const [isLoading, setIsLoading] = useState(false);
  
  // Stream Management State
  const [backgrounds, setBackgrounds] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showAddBackground, setShowAddBackground] = useState(false);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [editingBackground, setEditingBackground] = useState<any>(null);
  const [editingCategory, setEditingCategory] = useState<any>(null);
  
  // Stream data state
  const [streams, setStreams] = useState<any[]>([]);
  const [streamAnalytics, setStreamAnalytics] = useState<any>(null);
  const [isLoadingStreams, setIsLoadingStreams] = useState(false);
  
  // Form state for new background
  const [backgroundForm, setBackgroundForm] = useState({
    name: '',
    description: '',
    category: '',
    imageUrl: '',
    thumbnailUrl: '',
    requiredPlan: 'free',
    sortOrder: 0,
    isActive: true,
    isPremium: false
  });
  
  // Form state for new category
  const [categoryForm, setCategoryForm] = useState({
    name: '',
    description: '',
    sort_order: 0
  });

  // Get admin status directly from the user session metadata
  const userMetadata = user?.user?.app_metadata || {};
  const userRoles = userMetadata.roles || [];
  const hasRoleInMetadata = userRoles.includes('admin') || userRoles.includes('superadmin');
  
  // Use either the API user data or the JWT metadata
  const isAdmin = hasRoleInMetadata || user?.role === "admin" || user?.role === "superadmin";
  const isSuperAdmin = userRoles.includes('superadmin') || user?.role === "superadmin";
  
  // Debug role status
  console.log('Dashboard role check:', { hasRoleInMetadata, userRoles, isAdmin, isSuperAdmin, user });

  // Fetch dashboard data
  useEffect(() => {
    if (isAdmin) {
      fetchDashboardData();
      loadBackgrounds();
      loadCategories();
    }
  }, [isAdmin]);

  // Load stream data when switching to streams tab
  useEffect(() => {
    if (activeTab === 'streams' && isAdmin) {
      console.log('Loading stream data for streams tab...');
      loadStreams();
      loadStreamAnalytics();
      loadBackgrounds();
      loadCategories();
    }
  }, [activeTab, isAdmin]);

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

  // Load streams data from API
  const loadStreams = async () => {
    try {
      setIsLoadingStreams(true);
      const response = await fetch('/api/admin/streams', {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Loaded streams:', data);
      setStreams(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to load streams:', error);
      toast({
        title: "Error",
        description: "Failed to load stream data",
        variant: "destructive",
      });
    } finally {
      setIsLoadingStreams(false);
    }
  };

  // Load stream analytics from API
  const loadStreamAnalytics = async () => {
    try {
      const response = await fetch('/api/admin/stream-analytics', {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Loaded stream analytics:', data);
      setStreamAnalytics(data);
    } catch (error) {
      console.error('Failed to load stream analytics:', error);
      toast({
        title: "Error",
        description: "Failed to load stream analytics",
        variant: "destructive",
      });
    }
  };

  // Stream control functions
  const terminateStream = async (streamId: number, reason: string) => {
    try {
      const response = await fetch(`/api/admin/streams/${streamId}/terminate`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reason }),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to terminate stream: ${response.status}`);
      }
      
      const data = await response.json();
      toast({
        title: "Stream Terminated",
        description: `Stream ${streamId} has been terminated successfully`,
      });
      
      // Reload streams data
      loadStreams();
    } catch (error) {
      console.error('Failed to terminate stream:', error);
      toast({
        title: "Error",
        description: "Failed to terminate stream",
        variant: "destructive",
      });
    }
  };

  const warnStream = async (streamId: number, message: string) => {
    try {
      const response = await fetch(`/api/admin/streams/${streamId}/warn`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message }),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to send warning: ${response.status}`);
      }
      
      const data = await response.json();
      toast({
        title: "Warning Sent",
        description: `Warning sent to stream ${streamId}`,
      });
    } catch (error) {
      console.error('Failed to send warning:', error);
      toast({
        title: "Error",
        description: "Failed to send warning",
        variant: "destructive",
      });
    }
  };

  // Filter backgrounds by category
  const filteredBackgrounds = selectedCategory === 'all' 
    ? backgrounds 
    : backgrounds.filter(bg => bg.category === selectedCategory);

  // Debug log for image URLs and proxy endpoints
  useEffect(() => {
    if (backgrounds.length > 0) {
      console.log('Admin Dashboard - Background URLs:', backgrounds.map(bg => ({
        id: bg.id,
        name: bg.name,
        imageUrl: bg.imageUrl,
        proxyUrl: `/api/backgrounds/image/${bg.id}`,
        hasImageUrl: !!bg.imageUrl
      })));
      
      // Test proxy endpoint
      backgrounds.forEach(async (bg) => {
        try {
          console.log(`Testing proxy endpoint for ${bg.name}:`, `/api/backgrounds/image/${bg.id}`);
          const response = await fetch(`/api/backgrounds/image/${bg.id}`);
          console.log(`Proxy response for ${bg.name}:`, response.status, response.ok);
          if (response.ok) {
            const data = await response.json();
            console.log(`Proxy data for ${bg.name}:`, data?.dataUrl ? 'Has dataUrl' : 'No dataUrl');
          }
        } catch (error) {
          console.error(`Proxy error for ${bg.name}:`, error);
        }
      });
    }
  }, [backgrounds]);

  // Handle background form submission
  const handleBackgroundSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingBackground 
        ? `/api/admin/backgrounds/${editingBackground.id}`
        : '/api/admin/backgrounds';
      
      const method = editingBackground ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user?.session?.access_token}`,
        },
        body: JSON.stringify(backgroundForm),
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: editingBackground ? "Background updated" : "Background created",
        });
        setShowAddBackground(false);
        setEditingBackground(null);
        setBackgroundForm({
          name: '',
          description: '',
          category: '',
          imageUrl: '',
          thumbnailUrl: '',
          requiredPlan: 'free',
          sortOrder: 0,
          isActive: true,
          isPremium: false
        });
        loadBackgrounds();
      } else {
        throw new Error('Failed to save background');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save background",
        variant: "destructive",
      });
    }
  };

  // Handle category form submission
  const handleCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingCategory 
        ? `/api/admin/background-categories/${editingCategory.id}`
        : '/api/admin/background-categories';
      
      const method = editingCategory ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user?.session?.access_token}`,
        },
        body: JSON.stringify(categoryForm),
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: editingCategory ? "Category updated" : "Category created",
        });
        setShowAddCategory(false);
        setEditingCategory(null);
        setCategoryForm({
          name: '',
          description: '',
          sort_order: 0
        });
        loadCategories();
      } else {
        throw new Error('Failed to save category');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save category",
        variant: "destructive",
      });
    }
  };

  // Edit background
  const editBackground = (background: any) => {
    setEditingBackground(background);
    setBackgroundForm({
      name: background.name,
      description: background.description,
      category: background.category,
      imageUrl: background.imageUrl,
      thumbnailUrl: background.thumbnailUrl || '',
      requiredPlan: background.requiredPlan,
      sortOrder: background.sortOrder,
      isActive: background.isActive,
      isPremium: background.isPremium || false
    });
    setShowAddBackground(true);
  };

  // Update background
  const updateBackground = async (id: number, updates: any) => {
    try {
      const response = await fetch(`/api/admin/backgrounds/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user?.session?.access_token}`,
        },
        body: JSON.stringify(updates),
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Background updated",
        });
        loadBackgrounds();
      } else {
        throw new Error('Failed to update background');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update background",
        variant: "destructive",
      });
    }
  };

  // Delete background
  const deleteBackground = async (id: number) => {
    try {
      const response = await fetch(`/api/admin/backgrounds/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${user?.session?.access_token}`,
        },
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Background deleted",
        });
        loadBackgrounds();
      } else {
        throw new Error('Failed to delete background');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete background",
        variant: "destructive",
      });
    }
  };

  // Delete category
  const deleteCategory = async (id: number) => {
    try {
      const response = await fetch(`/api/admin/background-categories/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${user?.session?.access_token}`,
        },
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Category deleted",
        });
        loadCategories();
      } else {
        throw new Error('Failed to delete category');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete category",
        variant: "destructive",
      });
    }
  };

  // Function to fetch dashboard data
  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      // In a real implementation, you would fetch this data from your API
      // For now, we're using mock data
      // Example API calls:
      // const statsResponse = await apiRequest("GET", "/api/admin/stats");
      // const stats = await statsResponse.json();
      // setStats(stats);
      
      // const usersResponse = await apiRequest("GET", "/api/admin/users");
      // const users = await usersResponse.json();
      // setUserData(users);
      
      // etc.
      
      // Using mock data for now
      setStats(dashboardStats);
      setUserData(users);
      setMarketplaceData(marketplaceItems);
      setSubscriptionData(subscriptions);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      toast({
        title: "Error",
        description: "Failed to load dashboard data. Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Function to update marketplace item
  const updateMarketplaceItem = async (itemId: string, data: any) => {
    try {
      setIsLoading(true);
      // In a real implementation, you would call your API
      // const response = await apiRequest("PATCH", `/api/admin/marketplace/${itemId}`, data);
      
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

  // Function to update subscription plan
  const updateSubscriptionPlan = async (planId: string, data: any) => {
    try {
      setIsLoading(true);
      // In a real implementation, you would call your API
      // const response = await apiRequest("PATCH", `/api/admin/subscriptions/${planId}`, data);
      
      // For now, just update the local state
      setSubscriptionData(prevPlans => 
        prevPlans.map(plan => 
          plan.id === planId ? { ...plan, ...data } : plan
        )
      );
      
      toast({
        title: "Success",
        description: "Subscription plan updated successfully.",
      });
    } catch (error) {
      console.error("Error updating subscription plan:", error);
      toast({
        title: "Error",
        description: "Failed to update subscription plan. Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Function to update user
  const updateUser = async (userId: string, data: any) => {
    try {
      setIsLoading(true);
      // In a real implementation, you would call your API
      // const response = await apiRequest("PATCH", `/api/admin/users/${userId}`, data);
      
      // For now, just update the local state
      setUserData(prevUsers => 
        prevUsers.map(user => 
          user.id === userId ? { ...user, ...data } : user
        )
      );
      
      toast({
        title: "Success",
        description: "User updated successfully.",
      });
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

  // Debug the user's role and authentication status
  console.log('Admin dashboard permissions:', { 
    isAuthenticated: !!user,
    hasAdminRole: isAdmin, 
    hasSuperAdminRole: isSuperAdmin,
    userMetadata,
    userRoles
  });

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <MobileNavbar />
      
      <div className="flex-1 container py-8 px-4 md:px-6 mt-16 mb-20">
        <div className="mb-6 flex flex-col md:flex-row justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Admin Dashboard</h1>
            <p className="text-muted-foreground mt-1">
              Manage your platform's users, content, and analytics
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={isSuperAdmin ? "border-red-500 text-red-500" : "border-blue-500 text-blue-500"}>
              {isSuperAdmin ? "Super Admin" : "Admin"}
            </Badge>
            <Button variant="outline" onClick={fetchDashboardData}>
              Refresh Data
            </Button>
            <Link href="/admin/settings">
              <Button variant="ghost">
                <Settings className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
        
        {/* Admin Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-6 bg-surface overflow-x-auto">
            <TabsTrigger value="overview" className="text-xs">Overview</TabsTrigger>
            <TabsTrigger value="users" className="text-xs">Users</TabsTrigger>
            <TabsTrigger value="streams" className="text-xs">Streams</TabsTrigger>
            <TabsTrigger value="marketplace" className="text-xs">Market</TabsTrigger>
            <TabsTrigger value="subscriptions" className="text-xs">Subs</TabsTrigger>
            <TabsTrigger value="settings" className="text-xs">Settings</TabsTrigger>
          </TabsList>
          
          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {isLoading ? (
              <div className="h-96 flex items-center justify-center">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
              </div>
            ) : (
              <>
                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <Card className="bg-black/60 border-surface">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Users className="h-5 w-5 text-blue-400" />
                        Users
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-muted-foreground text-sm">Total Users</p>
                          <p className="text-2xl font-bold">{stats.totalUsers.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-sm">Active Users</p>
                          <p className="text-2xl font-bold">{stats.activeUsers.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-sm">New (30d)</p>
                          <p className="text-2xl font-bold">{stats.newUsers.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-sm">Churn Rate</p>
                          <p className="text-2xl font-bold">{stats.churnRate}%</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card className="bg-black/60 border-surface">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <DollarSign className="h-5 w-5 text-green-400" />
                        Revenue
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-muted-foreground text-sm">Total Revenue</p>
                          <p className="text-2xl font-bold">${stats.totalRevenue.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-sm">Monthly</p>
                          <p className="text-2xl font-bold">${stats.monthlyRevenue.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-sm">Conversion</p>
                          <p className="text-2xl font-bold">{stats.conversionRate}%</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-sm">Top Plan</p>
                          <p className="text-2xl font-bold">{stats.mostPopularPlan}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card className="bg-black/60 border-surface">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Activity className="h-5 w-5 text-purple-400" />
                        Streaming
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-muted-foreground text-sm">Active Streams</p>
                          <p className="text-2xl font-bold">{stats.activeStreams}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-sm">Total Streams</p>
                          <p className="text-2xl font-bold">{stats.totalStreams.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-sm">Total Hours</p>
                          <p className="text-2xl font-bold">{stats.totalStreamHours.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-sm">Avg Session</p>
                          <p className="text-2xl font-bold">{stats.avgSessionLength} min</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card className="bg-black/60 border-surface">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <ShoppingBag className="h-5 w-5 text-yellow-400" />
                        Marketplace
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 gap-4">
                        <div>
                          <p className="text-muted-foreground text-sm">Popular Add-on</p>
                          <p className="text-xl font-bold">{stats.mostPopularAddOn}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-sm">Items</p>
                          <p className="text-xl font-bold">{marketplaceItems.length}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-sm">Featured Items</p>
                          <p className="text-xl font-bold">{marketplaceItems.filter(item => item.featured).length}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
                
                {/* Recent Users */}
                <Card className="bg-black/60 border-surface">
                  <CardHeader>
                    <CardTitle>Recent Users</CardTitle>
                    <CardDescription>Latest user registrations and activity</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow className="border-surface">
                          <TableHead>Username</TableHead>
                          <TableHead>Plan</TableHead>
                          <TableHead>Joined</TableHead>
                          <TableHead>Last Active</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {userData.slice(0, 5).map((user) => (
                          <TableRow key={user.id} className="border-surface">
                            <TableCell>
                              <div className="font-medium">{user.username}</div>
                              <div className="text-sm text-muted-foreground">{user.email}</div>
                            </TableCell>
                            <TableCell>
                              <Badge className={
                                user.plan === "free" ? "bg-gray-600" : 
                                user.plan === "reply_guy" ? "bg-blue-600" : 
                                user.plan === "spartan" ? "bg-purple-600" : 
                                user.plan === "zeus" ? "bg-yellow-600" : 
                                "bg-gradient-to-r from-purple-600 to-pink-600"
                              }>
                                {user.plan === "reply_guy" ? "Reply Guy" : 
                                  user.plan.charAt(0).toUpperCase() + user.plan.slice(1)}
                              </Badge>
                            </TableCell>
                            <TableCell>{new Date(user.createdAt).toLocaleDateString()}</TableCell>
                            <TableCell>{new Date(user.lastActive).toLocaleDateString()}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className={
                                user.status === "active" ? "border-green-500 text-green-500" : 
                                "border-red-500 text-red-500"
                              }>
                                {user.status.charAt(0).toUpperCase() + user.status.slice(1)}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <Link href={`/admin/users/${user.id}`}>
                                <Button variant="ghost" size="sm">View</Button>
                              </Link>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    <div className="mt-4 flex justify-end">
                      <Link href="/admin/users">
                        <Button variant="outline">View All Users</Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>
          
          {/* Users Tab */}
          <TabsContent value="users" className="space-y-6">
            {isLoading ? (
              <div className="h-96 flex items-center justify-center">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
              </div>
            ) : (
              <Card className="bg-black/60 border-surface">
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>All Users</CardTitle>
                    <CardDescription>Manage user accounts and permissions</CardDescription>
                  </div>
                  <Link href="/admin/users/new">
                    <Button variant="default">Add User</Button>
                  </Link>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow className="border-surface">
                        <TableHead>User</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Plan</TableHead>
                        <TableHead>Stream Time</TableHead>
                        <TableHead>Avatars</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {userData.map((user) => (
                        <TableRow key={user.id} className="border-surface">
                          <TableCell>
                            <div className="font-medium">{user.username}</div>
                            <div className="text-sm text-muted-foreground">{user.email}</div>
                          </TableCell>
                          <TableCell>
                            <Badge className={
                              user.role === "user" ? "bg-gray-600" : 
                              user.role === "admin" ? "bg-blue-600" : 
                              "bg-red-600"
                            }>
                              {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge className={
                              user.plan === "free" ? "bg-gray-600" : 
                              user.plan === "reply_guy" ? "bg-blue-600" : 
                              user.plan === "spartan" ? "bg-purple-600" : 
                              user.plan === "zeus" ? "bg-yellow-600" : 
                              "bg-gradient-to-r from-purple-600 to-pink-600"
                            }>
                              {user.plan === "reply_guy" ? "Reply Guy" : 
                                user.plan.charAt(0).toUpperCase() + user.plan.slice(1)}
                            </Badge>
                          </TableCell>
                          <TableCell>{user.streamTime} min</TableCell>
                          <TableCell>{user.avatars}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={
                              user.status === "active" ? "border-green-500 text-green-500" : 
                              "border-red-500 text-red-500"
                            }>
                              {user.status.charAt(0).toUpperCase() + user.status.slice(1)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="bg-surface border-surface">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuItem onClick={() => {}}>
                                  <User className="mr-2 h-4 w-4" />
                                  View Profile
                                </DropdownMenuItem>
                                {isSuperAdmin && (
                                  <DropdownMenuItem onClick={() => updateUser(user.id, { role: user.role === "admin" ? "user" : "admin" })}>
                                    <Shield className="mr-2 h-4 w-4" />
                                    {user.role === "admin" ? "Remove Admin" : "Make Admin"}
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem onClick={() => updateUser(user.id, { status: user.status === "active" ? "blocked" : "active" })}>
                                  <Shield className="mr-2 h-4 w-4" />
                                  {user.status === "active" ? "Block User" : "Unblock User"}
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => {}}>
                                  <Package className="mr-2 h-4 w-4" />
                                  Manage Subscription
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </TabsContent>
          
          {/* Marketplace Tab */}
          <TabsContent value="marketplace" className="space-y-6">
            {isLoading ? (
              <div className="h-96 flex items-center justify-center">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
              </div>
            ) : (
              <Card className="bg-black/60 border-surface">
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Marketplace Items</CardTitle>
                    <CardDescription>Manage items available in the marketplace</CardDescription>
                  </div>
                  <Link href="/admin/marketplace/new">
                    <Button variant="default">Add Item</Button>
                  </Link>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow className="border-surface">
                        <TableHead>Item</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead>Sales</TableHead>
                        <TableHead>Revenue</TableHead>
                        <TableHead>Featured</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {marketplaceData.map((item) => (
                        <TableRow key={item.id} className="border-surface">
                          <TableCell>
                            <div className="font-medium">{item.name}</div>
                            <div className="text-sm text-muted-foreground">{item.id}</div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {item.category.charAt(0).toUpperCase() + item.category.slice(1)}
                            </Badge>
                          </TableCell>
                          <TableCell>${item.price.toFixed(2)}</TableCell>
                          <TableCell>{item.sales}</TableCell>
                          <TableCell>${item.revenue.toFixed(2)}</TableCell>
                          <TableCell>
                            {item.featured ? (
                              <Badge className="bg-primary">Featured</Badge>
                            ) : (
                              <Badge variant="outline">Standard</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="bg-surface border-surface">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuItem onClick={() => {}}>
                                  Edit Item
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => updateMarketplaceItem(item.id, { featured: !item.featured })}>
                                  {item.featured ? "Remove Featured" : "Make Featured"}
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => updateMarketplaceItem(item.id, { status: item.status === "active" ? "inactive" : "active" })}>
                                  {item.status === "active" ? "Deactivate" : "Activate"}
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="text-red-500" onClick={() => {}}>
                                  Delete Item
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </TabsContent>
          
          {/* Streams Tab */}
          <TabsContent value="streams" className="space-y-6">
            {/* Stream Management Dashboard */}
            <Card className="bg-black/60 border-surface">
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
                      <p className="text-2xl font-bold text-purple-400">{streams.length}</p>
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
                          <form onSubmit={handleBackgroundSubmit} className="space-y-4">
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
                              />
                            </div>
                            <div>
                              <Label htmlFor="bg-category">Category</Label>
                              <Select value={backgroundForm.category} onValueChange={(value) => setBackgroundForm({...backgroundForm, category: value})}>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {categories.map(cat => (
                                    <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label htmlFor="bg-url">Image URL</Label>
                              <Input
                                id="bg-url"
                                type="url"
                                value={backgroundForm.imageUrl}
                                onChange={(e) => setBackgroundForm({...backgroundForm, imageUrl: e.target.value})}
                                placeholder="https://example.com/background.jpg"
                                required
                              />
                            </div>
                            <div className="flex items-center space-x-2">
                              <input
                                id="bg-active"
                                type="checkbox"
                                checked={backgroundForm.isActive}
                                onChange={(e) => setBackgroundForm({...backgroundForm, isActive: e.target.checked})}
                                className="rounded"
                              />
                              <Label htmlFor="bg-active">Active</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <input
                                id="bg-premium"
                                type="checkbox"
                                checked={backgroundForm.isPremium}
                                onChange={(e) => setBackgroundForm({...backgroundForm, isPremium: e.target.checked})}
                                className="rounded"
                              />
                              <Label htmlFor="bg-premium">Premium Only</Label>
                            </div>
                            <div className="flex justify-end gap-2">
                              <Button type="button" variant="outline" onClick={() => setShowAddBackground(false)}>
                                Cancel
                              </Button>
                              <Button type="submit">
                                {editingBackground ? 'Update' : 'Create'} Background
                              </Button>
                            </div>
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
                            <DialogTitle>Add New Category</DialogTitle>
                            <DialogDescription>
                              Create a new background category
                            </DialogDescription>
                          </DialogHeader>
                          <form onSubmit={handleCategorySubmit} className="space-y-4">
                            <div>
                              <Label htmlFor="cat-name">Category Name</Label>
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
                              />
                            </div>
                            <div className="flex justify-end gap-2">
                              <Button type="button" variant="outline" onClick={() => setShowAddCategory(false)}>
                                Cancel
                              </Button>
                              <Button type="submit">Create Category</Button>
                            </div>
                          </form>
                        </DialogContent>
                      </Dialog>

                      <Button 
                        variant="outline" 
                        onClick={() => window.location.reload()}
                        className="flex items-center gap-2"
                      >
                        <Monitor className="h-4 w-4" />
                        Refresh
                      </Button>
                    </div>
                  </div>

                  {/* Background Grid */}
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-semibold mb-4">Stream Backgrounds</h3>
                      {backgrounds.length === 0 ? (
                        <div className="text-center py-8">
                          <Image className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                          <p className="text-muted-foreground">No backgrounds found</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {filteredBackgrounds.map((bg) => (
                            <Card key={bg.id} className="bg-surface/50 border-surface">
                              <CardContent className="p-4">
                                <div className="aspect-video rounded-lg overflow-hidden mb-3 bg-gray-100 dark:bg-gray-800 relative">
                                  {bg.imageUrl ? (
                                    <>
                                      <BackgroundImage 
                                        id={bg.id}
                                        name={bg.name}
                                        className="w-full h-full object-cover opacity-100 absolute inset-0"
                                      />
                                      <div className="fallback-div w-full h-full flex items-center justify-center bg-gradient-to-br from-red-500 to-orange-600 text-white absolute inset-0" style={{ display: 'none' }}>
                                        <div className="text-center p-4">
                                          <div className="font-bold text-lg">{bg.name}</div>
                                          <div className="text-sm opacity-75">Image Load Failed</div>
                                          <div className="text-xs mt-1">IPFS: {bg.imageUrl?.substring(0, 50)}...</div>
                                        </div>
                                      </div>
                                    </>
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-500 to-gray-700 text-white">
                                      <div className="text-center p-4">
                                        <div className="font-bold text-lg">{bg.name}</div>
                                        <div className="text-sm opacity-75">No Image URL Available</div>
                                      </div>
                                    </div>
                                  )}
                                </div>
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <h4 className="font-medium">{bg.name}</h4>
                                    <Badge variant={bg.isActive ? "default" : "secondary"}>
                                      {bg.isActive ? "Active" : "Inactive"}
                                    </Badge>
                                  </div>
                                  <p className="text-sm text-muted-foreground">{bg.description}</p>
                                  <div className="flex items-center justify-between">
                                    <Badge variant="outline">{bg.category}</Badge>
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="sm">
                                          <MoreVertical className="h-4 w-4" />
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end" className="bg-surface border-surface">
                                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                        <DropdownMenuItem onClick={() => editBackground(bg)}>
                                          <Edit className="h-4 w-4 mr-2" />
                                          Edit
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => updateBackground(bg.id, { isActive: !bg.isActive })}>
                                          {bg.isActive ? 'Deactivate' : 'Activate'}
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem 
                                          className="text-red-500" 
                                          onClick={() => deleteBackground(bg.id)}
                                        >
                                          <Trash2 className="h-4 w-4 mr-2" />
                                          Delete
                                        </DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Subscriptions Tab */}
          <TabsContent value="subscriptions" className="space-y-6">
            <SubscriptionManagement />
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-6">
            {isSuperAdmin ? (
              <Card className="bg-black/60 border-surface">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5 text-blue-400" />
                    System Settings
                  </CardTitle>
                  <CardDescription>
                    Configure platform-wide settings and preferences
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div className="text-center py-8">
                      <Settings className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">System settings panel coming soon</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="bg-black/60 border-surface">
                <CardContent className="p-6">
                  <div className="text-center">
                    <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Access Restricted</h3>
                    <p className="text-muted-foreground">
                      You need super admin permissions to access system settings.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default AdminDashboard;

