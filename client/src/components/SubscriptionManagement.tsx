import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { DollarSign, Users, TrendingUp, Package, Settings, Download, Users2, CreditCard, Edit, Save, X, Plus, Clock } from "lucide-react";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest, invalidateSubscriptionCache } from "@/lib/queryClient";
import ComingSoonModal from "@/components/ComingSoonModal";

// Mock user counts and revenue data (this would come from analytics)
const planAnalytics = {
  "free": { userCount: 1248, monthlyRevenue: 0 },
  "reply-guy": { userCount: 325, monthlyRevenue: 3246.75 },
  "spartan": { userCount: 198, monthlyRevenue: 5937.02 },
  "zeus": { userCount: 45, monthlyRevenue: 4499.55 },
  "goat": { userCount: 16, monthlyRevenue: 4799.84 }
};

const subscriptionAnalytics = {
  summary: {
    totalPlans: 5,
    totalUsers: 1832,
    totalMonthlyRevenue: 18483.16,
    averageRevenuePerUser: 10.09
  }
};

export default function SubscriptionManagement() {
  const [isLoading, setIsLoading] = useState(false);
  const [editingPlan, setEditingPlan] = useState<any>(null);
  const [editedPlan, setEditedPlan] = useState<any>({});
  const [comingSoonModal, setComingSoonModal] = useState({
    isOpen: false,
    planName: "",
    missingFeatures: [] as string[]
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch subscription plans from API
  const { data: subscriptionPlans, isLoading: plansLoading } = useQuery({
    queryKey: ["/api/subscription/plans"],
    retry: false,
    queryFn: async () => {
      const response = await fetch("/api/subscription/plans");
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    },
  });

  const handleManagePlan = (planId: string, planName: string) => {
    const plan = subscriptionPlans?.find((p: any) => p.id === planId);
    
    // Check if plan is coming soon
    if (plan?.is_coming_soon) {
      setComingSoonModal({
        isOpen: true,
        planName: plan.name,
        missingFeatures: []
      });
      return;
    }
    
    setEditingPlan(plan);
    setEditedPlan({ ...plan });
  };

  // Real API mutation for updating subscription plans
  const updatePlanMutation = useMutation({
    mutationFn: async (planData: any) => {
      const transformedData = {
        id: planData.id,
        name: planData.name,
        description: planData.description,
        price: Number(planData.price),
        streamMinutesPerWeek: Number(planData.stream_minutes_per_week),
        avatarMaxCount: Number(planData.avatar_max_count),
        maxConcurrentStreams: Number(planData.max_concurrent_streams),
        maxResolution: planData.max_resolution,
        marketplaceAccess: planData.marketplace_access,
        customAvatars: planData.custom_avatars,
        prioritySupport: planData.priority_support,
        xSpacesHosting: planData.x_spaces_hosting,
        riggingStudioAccess: planData.rigging_studio_access,
        maxMorphPoints: Number(planData.max_morph_points),
        maxFileSizeMB: Number(planData.max_file_size_mb || planData.maxFileSizeMB),
        autoRiggingEnabled: planData.auto_rigging_enabled,
        buddyInviteAccess: planData.buddy_invite_access,
        isPopular: planData.is_popular,
        isFree: planData.is_free,
        isActive: planData.is_active,
        isComingSoon: planData.is_coming_soon,
        sortOrder: Number(planData.sort_order),
        maxBones: Number(planData.max_bones),
        maxMorphTargets: Number(planData.max_morph_targets),
        trackingPrecision: Number(planData.tracking_precision),
        animationSmoothness: Number(planData.animation_smoothness),
        animationResponsiveness: Number(planData.animation_responsiveness),
        faceTracking: planData.face_tracking,
        bodyTracking: planData.body_tracking,
        handTracking: planData.hand_tracking,
        fingerTracking: planData.finger_tracking,
        eyeTracking: planData.eye_tracking,
        expressionTracking: planData.expression_tracking
      };
      return await apiRequest("PUT", `/api/admin/subscription-plans/${planData.id}`, transformedData);
    },
    onSuccess: () => {
      invalidateSubscriptionCache();
      setEditingPlan(null);
      setEditedPlan({});
      toast({
        title: "Plan Updated",
        description: `${editedPlan.name} plan has been successfully updated.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update subscription plan",
        variant: "destructive",
      });
    },
  });

  const handleSavePlan = () => {
    updatePlanMutation.mutate(editedPlan);
  };

  const handleClosePlanModal = () => {
    setEditingPlan(null);
    setEditedPlan({});
  };

  const handleCreateNewPlan = () => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      toast({
        title: "Create New Plan",
        description: "Plan creation interface would open here.",
      });
    }, 1000);
  };

  const handleBulkUserMigration = () => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      toast({
        title: "Bulk User Migration",
        description: "User migration tool would open here.",
      });
    }, 1000);
  };

  const handleExportAnalytics = () => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      toast({
        title: "Export Analytics",
        description: "Analytics data export initiated.",
      });
    }, 1000);
  };

  const handleUpdatePricing = () => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      toast({
        title: "Update Pricing",
        description: "Pricing management interface would open here.",
      });
    }, 1000);
  };

  if (plansLoading) {
    return (
      <div className="space-y-6 animate-pulse bg-background min-h-screen">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="bg-background/95 backdrop-blur-md border border-border/50">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="h-4 bg-muted/30 rounded w-20"></div>
                <div className="h-4 w-4 bg-muted/30 rounded"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-muted/30 rounded w-16"></div>
              </CardContent>
            </Card>
          ))}
        </div>
        <Card className="bg-background/95 backdrop-blur-md border border-border/50">
          <CardHeader>
            <div className="h-6 bg-muted/30 rounded w-40"></div>
            <div className="h-4 bg-muted/30 rounded w-60"></div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-20 bg-muted/30 rounded"></div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Analytics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="glass-card shadow-glow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Plans</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{subscriptionAnalytics.summary.totalPlans}</div>
          </CardContent>
        </Card>
          
        <Card className="glass-card shadow-glow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{subscriptionAnalytics.summary.totalUsers}</div>
          </CardContent>
        </Card>
        
        <Card className="glass-card shadow-glow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">${subscriptionAnalytics.summary.totalMonthlyRevenue.toFixed(2)}</div>
          </CardContent>
        </Card>
        
        <Card className="glass-card shadow-glow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Revenue Per User</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">${subscriptionAnalytics.summary.averageRevenuePerUser.toFixed(2)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Subscription Plans */}
      <Card className="glass-card shadow-glow-sm">
        <CardHeader>
          <CardTitle>Subscription Plans</CardTitle>
          <CardDescription>Manage your platform's subscription plans and pricing</CardDescription>
        </CardHeader>
        <CardContent>
          {plansLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
            </div>
          ) : (
          <div className="space-y-4">
            {subscriptionPlans?.map((plan: any) => {
              const analytics = planAnalytics[plan.id as keyof typeof planAnalytics] || { userCount: 0, monthlyRevenue: 0 };
              return (
              <div key={plan.id} className="p-4 rounded-lg bg-background/30 border border-surface/40 backdrop-blur-sm hover:bg-background/40 transition-colors">
                {/* Mobile Layout */}
                <div className="block sm:hidden space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{plan.name}</h3>
                        {plan.is_coming_soon && (
                          <Badge variant="secondary" className="bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-800">
                            <Clock className="w-3 h-3 mr-1" />
                            COMING SOON!
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">${plan.price}/month</p>
                    </div>
                    <Badge className="bg-gradient-to-r from-green-500 to-emerald-600 text-white border-0">
                      {analytics.userCount} users
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Stream Time</p>
                      <p className="font-medium">{plan.stream_minutes_per_week === -1 ? 'Unlimited' : `${plan.stream_minutes_per_week}min/week`}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Avatars</p>
                      <p className="font-medium">{plan.avatar_max_count === -1 ? 'Unlimited' : plan.avatar_max_count}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Resolution</p>
                      <p className="font-medium">{plan.max_resolution}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Revenue</p>
                      <p className="font-medium text-primary">${analytics.monthlyRevenue.toFixed(2)}</p>
                    </div>
                  </div>
                  
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full bg-background/60 hover:bg-background/80 border-surface/50 hover:border-primary/30 hover:text-primary transition-colors"
                    onClick={() => handleManagePlan(plan.id, plan.name)}
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Manage Plan
                  </Button>
                </div>

                {/* Desktop Layout */}
                <div className="hidden sm:flex items-center justify-between">
                  <div className="flex items-center space-x-6">
                    <div>
                      <h3 className="font-semibold">{plan.name}</h3>
                      <p className="text-sm text-muted-foreground">${plan.price}/month</p>
                    </div>
                    <Badge className="bg-gradient-to-r from-green-500 to-emerald-600 text-white border-0">
                      {plan.userCount} users
                    </Badge>
                    <div className="text-sm">
                      <p className="text-muted-foreground">Stream Time</p>
                      <p className="font-medium">{plan.streamMinutesPerWeek === -1 ? 'Unlimited' : `${plan.streamMinutesPerWeek}min/week`}</p>
                    </div>
                    <div className="text-sm">
                      <p className="text-muted-foreground">Avatars</p>
                      <p className="font-medium">{plan.avatarLimit === -1 ? 'Unlimited' : plan.avatarLimit}</p>
                    </div>
                    <div className="text-sm">
                      <p className="text-muted-foreground">Export</p>
                      <p className="font-medium">{plan.exportCapabilities}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <p className="font-medium text-primary">${plan.monthlyRevenue.toFixed(2)}</p>
                      <p className="text-sm text-muted-foreground">Monthly Revenue</p>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="bg-background/60 hover:bg-background/80 border-surface/50 hover:border-primary/30 hover:text-primary transition-colors"
                      onClick={() => handleManagePlan(plan.id, plan.name)}
                    >
                      <Settings className="h-4 w-4 mr-2" />
                      Manage
                    </Button>
                  </div>
                </div>
              </div>
            );
            })}
          </div>
          )}
        </CardContent>
      </Card>

      {/* Plan Management Actions */}
      <Card className="glass-card shadow-glow-sm">
        <CardHeader>
          <CardTitle>Plan Management</CardTitle>
          <CardDescription>Administrative actions for subscription plans</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Button 
              variant="outline" 
              className="flex items-center justify-center space-x-2 h-16 bg-background/60 hover:bg-background/80 border-surface/50 hover:border-primary/30 hover:text-primary transition-colors"
              disabled={isLoading}
              onClick={handleCreateNewPlan}
            >
              <Package className="h-4 w-4" />
              <span>Create New Plan</span>
            </Button>
            <Button 
              variant="outline" 
              className="flex items-center justify-center space-x-2 h-16 bg-background/60 hover:bg-background/80 border-surface/50 hover:border-primary/30 hover:text-primary transition-colors"
              disabled={isLoading}
              onClick={handleBulkUserMigration}
            >
              <Users2 className="h-4 w-4" />
              <span>Bulk User Migration</span>
            </Button>
            <Button 
              variant="outline" 
              className="flex items-center justify-center space-x-2 h-16 bg-background/60 hover:bg-background/80 border-surface/50 hover:border-primary/30 hover:text-primary transition-colors"
              disabled={isLoading}
              onClick={handleExportAnalytics}
            >
              <Download className="h-4 w-4" />
              <span>Export Analytics</span>
            </Button>
            <Button 
              variant="outline" 
              className="flex items-center justify-center space-x-2 h-16 bg-background/60 hover:bg-background/80 border-surface/50 hover:border-primary/30 hover:text-primary transition-colors"
              disabled={isLoading}
              onClick={handleUpdatePricing}
            >
              <CreditCard className="h-4 w-4" />
              <span>Update Pricing</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Plan Management Modal */}
      <Dialog open={!!editingPlan} onOpenChange={handleClosePlanModal}>
        <DialogContent className="backdrop-blur-lg bg-surface/40 border border-surface-light/30 max-w-lg max-h-[90vh] overflow-hidden flex flex-col rounded-2xl shadow-glow-md">
          <DialogHeader className="flex-shrink-0 border-b border-surface p-6">
            <DialogTitle className="flex items-center space-x-2 text-lg text-white">
              <Edit className="h-5 w-5 text-primary" />
              <span>Manage {editingPlan?.name} Plan</span>
            </DialogTitle>
            <DialogDescription className="text-sm text-gray-300">
              Edit plan pricing, limits, and capabilities.
            </DialogDescription>
          </DialogHeader>

          {editingPlan && (
            <div className="flex-1 overflow-y-auto space-y-4 p-6">
              {/* Basic Settings */}
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="planName" className="text-sm font-medium text-white">Plan Name</Label>
                  <Input
                    id="planName"
                    value={editedPlan.name || ''}
                    onChange={(e) => setEditedPlan({...editedPlan, name: e.target.value})}
                    className="bg-surface border-surface-light rounded-xl h-10 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="planPrice" className="text-sm font-medium text-white">Monthly Price ($)</Label>
                  <Input
                    id="planPrice"
                    type="number"
                    step="0.01"
                    value={editedPlan.price || 0}
                    onChange={(e) => setEditedPlan({...editedPlan, price: parseFloat(e.target.value) || 0})}
                    className="bg-surface border-surface-light rounded-xl h-10 text-white"
                  />
                </div>
              </div>

              {/* Limits */}
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="streamTime" className="text-sm font-medium text-white">Stream Minutes/Week</Label>
                  <Input
                    id="streamTime"
                    type="number"
                    value={editedPlan.streamMinutesPerWeek === -1 ? '' : editedPlan.streamMinutesPerWeek || 0}
                    onChange={(e) => setEditedPlan({...editedPlan, streamMinutesPerWeek: e.target.value === '' ? -1 : parseInt(e.target.value) || 0})}
                    placeholder="Empty = unlimited"
                    className="bg-surface border-surface-light rounded-xl h-10 text-white placeholder:text-gray-400"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="avatarLimit" className="text-sm font-medium text-white">Avatar Limit</Label>
                  <Input
                    id="avatarLimit"
                    type="number"
                    value={editedPlan.avatarLimit === -1 ? '' : editedPlan.avatarLimit || 0}
                    onChange={(e) => setEditedPlan({...editedPlan, avatarLimit: e.target.value === '' ? -1 : parseInt(e.target.value) || 0})}
                    placeholder="Empty = unlimited"
                    className="bg-surface border-surface-light rounded-xl h-10 text-white placeholder:text-gray-400"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maxFileSizeMB" className="text-sm font-medium text-white">Max File Size (MB)</Label>
                  <Input
                    id="maxFileSizeMB"
                    type="number"
                    value={editedPlan.max_file_size_mb || ''}
                    onChange={(e) => setEditedPlan({...editedPlan, max_file_size_mb: parseInt(e.target.value) || 0})}
                    placeholder="e.g., 85"
                    className="bg-surface border-surface-light rounded-xl h-10 text-white placeholder:text-gray-400"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="exportCapabilities" className="text-sm font-medium text-white">Export Level</Label>
                  <Input
                    id="exportCapabilities"
                    value={editedPlan.exportCapabilities || ''}
                    onChange={(e) => setEditedPlan({...editedPlan, exportCapabilities: e.target.value})}
                    placeholder="e.g., Basic, Advanced, Professional"
                    className="bg-surface border-surface-light rounded-xl h-10 text-white placeholder:text-gray-400"
                  />
                </div>
              </div>

              {/* Features - Editable */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium text-white">Features</Label>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const newFeatures = [...(editedPlan.features || []), ''];
                      setEditedPlan({...editedPlan, features: newFeatures});
                    }}
                    className="h-7 px-3 text-xs bg-surface border-surface-light text-primary hover:bg-surface-light rounded-lg"
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Add
                  </Button>
                </div>
                <div className="space-y-2">
                  {editedPlan.features?.map((feature: string, index: number) => (
                    <div key={index} className="flex items-center space-x-2">
                      <Input
                        value={feature}
                        onChange={(e) => {
                          const newFeatures = [...(editedPlan.features || [])];
                          newFeatures[index] = e.target.value;
                          setEditedPlan({...editedPlan, features: newFeatures});
                        }}
                        placeholder="Enter feature description"
                        className="bg-surface border-surface-light rounded-lg h-9 text-sm text-white placeholder:text-gray-400"
                      />
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          const newFeatures = editedPlan.features?.filter((_: any, i: number) => i !== index);
                          setEditedPlan({...editedPlan, features: newFeatures});
                        }}
                        className="h-9 w-9 p-0 bg-surface border-surface-light text-red-400 hover:bg-red-500/20 rounded-lg"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Analytics */}
              <div className="p-4 rounded-xl bg-surface border border-surface-light">
                <h4 className="font-medium mb-3 text-sm text-white">Current Analytics</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-400 text-xs">Users</p>
                    <p className="font-medium text-white">{editingPlan.userCount}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-xs">Revenue</p>
                    <p className="font-medium text-primary">${editingPlan.monthlyRevenue.toFixed(2)}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="flex-shrink-0 border-t border-surface p-6">
            <div className="flex space-x-3 w-full">
              <Button 
                variant="outline" 
                onClick={handleClosePlanModal} 
                className="flex-1 bg-surface border-surface-light text-white hover:bg-surface-light rounded-xl"
              >
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button 
                onClick={handleSavePlan} 
                disabled={updatePlanMutation.isPending} 
                className="flex-1 bg-primary hover:bg-primary/80 text-white rounded-xl shadow-neon-purple"
              >
                <Save className="h-4 w-4 mr-2" />
                {updatePlanMutation.isPending ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Coming Soon Modal */}
      <ComingSoonModal
        isOpen={comingSoonModal.isOpen}
        onClose={() => setComingSoonModal(prev => ({ ...prev, isOpen: false }))}
        planName={comingSoonModal.planName}
        missingFeatures={comingSoonModal.missingFeatures}
      />
    </div>
  );
}