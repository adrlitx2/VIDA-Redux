import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest, invalidateSubscriptionCache } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, Users, TrendingUp } from "lucide-react";

interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  price: number;
  streamMinutesPerWeek: number;
  avatarMaxCount: number;
  maxConcurrentStreams: number;
  maxResolution: string;
  marketplaceAccess: boolean;
  customAvatars: boolean;
  prioritySupport: boolean;
  xSpacesHosting: boolean;
  riggingStudioAccess: boolean;
  maxMorphPoints: number;
  buddyInviteAccess: boolean;
  isPopular: boolean;
  isFree: boolean;
  isActive: boolean;
  isComingSoon: boolean;
  sortOrder: number;
  autoRiggingEnabled: boolean;
  // Rigging configuration fields
  maxBones: number;
  maxMorphTargets: number;
  maxFileSizeMB: number;
  trackingPrecision: number;
  animationSmoothness: number;
  animationResponsiveness: number;
  faceTracking: boolean;
  bodyTracking: boolean;
  handTracking: boolean;
  fingerTracking: boolean;
  eyeTracking: boolean;
  expressionTracking: boolean;
  userCount: number;
  monthlyRevenue: number;
  createdAt: string;
  updatedAt: string;
}

interface PlanFormData {
  id: string;
  name: string;
  description: string;
  price: number;
  streamMinutesPerWeek: number;
  avatarMaxCount: number;
  maxConcurrentStreams: number;
  maxResolution: string;
  marketplaceAccess: boolean;
  customAvatars: boolean;
  prioritySupport: boolean;
  xSpacesHosting: boolean;
  riggingStudioAccess: boolean;
  maxMorphPoints: number;
  buddyInviteAccess: boolean;
  isPopular: boolean;
  isFree: boolean;
  isActive: boolean;
  isComingSoon: boolean;
  sortOrder: number;
  autoRiggingEnabled: boolean;
  // Rigging tier configuration
  maxBones: number;
  maxMorphTargets: number;
  maxFileSizeMB: number;
  trackingPrecision: number;
  animationSmoothness: number;
  animationResponsiveness: number;
  faceTracking: boolean;
  bodyTracking: boolean;
  handTracking: boolean;
  fingerTracking: boolean;
  eyeTracking: boolean;
  expressionTracking: boolean;
}

const defaultFormData: PlanFormData = {
  id: "",
  name: "",
  description: "",
  price: 0,
  streamMinutesPerWeek: 120,
  avatarMaxCount: 3,
  maxConcurrentStreams: 1,
  maxResolution: "1080p",
  marketplaceAccess: false,
  customAvatars: true,
  prioritySupport: false,
  xSpacesHosting: false,
  riggingStudioAccess: false,
  maxMorphPoints: 10,
  buddyInviteAccess: false,
  isPopular: false,
  isFree: false,
  isActive: true,
  isComingSoon: false,
  sortOrder: 1,
  autoRiggingEnabled: true,
  // Rigging configuration defaults
  maxBones: 20,
  maxMorphTargets: 10,
  maxFileSizeMB: 25,
  trackingPrecision: 85,
  animationSmoothness: 75,
  animationResponsiveness: 80,
  faceTracking: true,
  bodyTracking: true,
  handTracking: false,
  fingerTracking: false,
  eyeTracking: false,
  expressionTracking: false,
};

export default function SubscriptionPlanManager() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
  const [formData, setFormData] = useState<PlanFormData>(defaultFormData);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: plans = [], isLoading } = useQuery({
    queryKey: ["/api/admin/subscription-plans"],
    select: (data: SubscriptionPlan[]) => 
      data.map((plan: SubscriptionPlan) => ({
        ...plan,
        userCount: plan.userCount || 0,
        monthlyRevenue: plan.monthlyRevenue || 0
      })).sort((a: SubscriptionPlan, b: SubscriptionPlan) => a.sortOrder - b.sortOrder),
  });

  const createPlanMutation = useMutation({
    mutationFn: async (planData: PlanFormData) => {
      return await apiRequest("POST", "/api/admin/subscription-plans", planData);
    },
    onSuccess: () => {
      invalidateSubscriptionCache();
      setDialogOpen(false);
      setFormData(defaultFormData);
      toast({
        title: "Success",
        description: "Subscription plan created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create subscription plan",
        variant: "destructive",
      });
    },
  });

  const updatePlanMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: PlanFormData }) => {
      return await apiRequest("PUT", `/api/admin/subscription-plans/${id}`, data);
    },
    onSuccess: () => {
      invalidateSubscriptionCache();
      setDialogOpen(false);
      setEditingPlan(null);
      setFormData(defaultFormData);
      toast({
        title: "Success",
        description: "Subscription plan updated successfully",
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

  const deletePlanMutation = useMutation({
    mutationFn: async (planId: string) => {
      return await apiRequest("DELETE", `/api/admin/subscription-plans/${planId}`);
    },
    onSuccess: () => {
      invalidateSubscriptionCache();
      toast({
        title: "Success",
        description: "Subscription plan deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete subscription plan",
        variant: "destructive",
      });
    },
  });

  const openEditDialog = async (plan: SubscriptionPlan) => {
    setEditingPlan(plan);
    const formValues: PlanFormData = {
      id: plan.id,
      name: plan.name,
      description: plan.description,
      price: plan.price,
      streamMinutesPerWeek: plan.streamMinutesPerWeek,
      avatarMaxCount: plan.avatarMaxCount,
      maxConcurrentStreams: plan.maxConcurrentStreams,
      maxResolution: plan.maxResolution,
      marketplaceAccess: plan.marketplaceAccess,
      customAvatars: plan.customAvatars,
      prioritySupport: plan.prioritySupport,
      xSpacesHosting: plan.xSpacesHosting,
      riggingStudioAccess: plan.riggingStudioAccess,
      maxMorphPoints: plan.maxMorphPoints,
      buddyInviteAccess: plan.buddyInviteAccess,
      isPopular: plan.isPopular,
      isFree: plan.isFree,
      isActive: plan.isActive,
      isComingSoon: plan.isComingSoon,
      sortOrder: plan.sortOrder,
      autoRiggingEnabled: plan.autoRiggingEnabled,
      // Rigging configuration
      maxBones: plan.maxBones,
      maxMorphTargets: plan.maxMorphTargets,
      maxFileSizeMB: plan.maxFileSizeMB,
      trackingPrecision: plan.trackingPrecision,
      animationSmoothness: plan.animationSmoothness,
      animationResponsiveness: plan.animationResponsiveness,
      faceTracking: plan.faceTracking,
      bodyTracking: plan.bodyTracking,
      handTracking: plan.handTracking,
      fingerTracking: plan.fingerTracking,
      eyeTracking: plan.eyeTracking,
      expressionTracking: plan.expressionTracking,
    };
    setFormData(formValues);
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (editingPlan) {
      updatePlanMutation.mutate({ id: editingPlan.id, data: formData });
    } else {
      createPlanMutation.mutate(formData);
    }
  };

  const handleDelete = (planId: string) => {
    if (confirm("Are you sure you want to delete this subscription plan?")) {
      deletePlanMutation.mutate(planId);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Subscription Plans</h2>
        <Button
          onClick={() => {
            setEditingPlan(null);
            setFormData(defaultFormData);
            setDialogOpen(true);
          }}
          className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Plan
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {plans.map((plan) => (
            <Card key={plan.id} className="relative glass-card shadow-glow-sm">
              {plan.isPopular && (
                <div className="absolute -top-2 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white">
                    Most Popular
                  </Badge>
                </div>
              )}
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between">
                  <span className="text-lg">{plan.name}</span>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditDialog(plan)}
                      className="h-8 w-8 p-0"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(plan.id)}
                      className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardTitle>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold">
                    ${plan.price}{plan.isFree ? "" : "/mo"}
                  </span>
                  {plan.isFree && <Badge variant="secondary">Free</Badge>}
                  {plan.isComingSoon && <Badge variant="outline">Coming Soon</Badge>}
                  {!plan.isActive && <Badge variant="destructive">Inactive</Badge>}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">{plan.description}</p>
                
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    <span>{plan.userCount} users</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" />
                    <span>${plan.monthlyRevenue}/mo</span>
                  </div>
                </div>

                <div className="space-y-1 text-xs">
                  <div>• {plan.avatarMaxCount} avatars max</div>
                  <div>• {plan.streamMinutesPerWeek} minutes/week</div>
                  <div>• {plan.maxResolution} max resolution</div>
                  <div>• {plan.maxBones} bones, {plan.maxMorphTargets} morph targets</div>
                  <div>• {plan.maxFileSizeMB}MB file size limit</div>
                </div>

                <div className="flex flex-wrap gap-1">
                  {plan.customAvatars && <Badge className="text-xs bg-gradient-to-r from-green-500 to-emerald-600 text-white border-0">Custom Avatars</Badge>}
                  {plan.prioritySupport && <Badge className="text-xs bg-gradient-to-r from-green-500 to-emerald-600 text-white border-0">Priority Support</Badge>}
                  {plan.xSpacesHosting && <Badge className="text-xs bg-gradient-to-r from-green-500 to-emerald-600 text-white border-0">X Spaces</Badge>}
                  {plan.riggingStudioAccess && <Badge className="text-xs bg-gradient-to-r from-green-500 to-emerald-600 text-white border-0">Rigging Studio</Badge>}
                  {plan.autoRiggingEnabled && <Badge className="text-xs bg-gradient-to-r from-green-500 to-emerald-600 text-white border-0">Auto-Rigging</Badge>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>
              {editingPlan ? "Edit Subscription Plan" : "Create New Subscription Plan"}
            </DialogTitle>
          </DialogHeader>
          
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto pr-1" style={{ maxHeight: 'calc(90vh - 140px)' }}>
              <div className="space-y-3 sm:space-y-4 px-1">
                <div className="space-y-2 sm:space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label htmlFor="id" className="text-sm font-medium">Plan ID</Label>
                      <Input
                        id="id"
                        value={formData.id}
                        onChange={(e) => setFormData({...formData, id: e.target.value})}
                        disabled={!!editingPlan}
                        placeholder="e.g., pro-plan"
                        className="mt-1 h-10 modal-input"
                      />
                    </div>
                    <div>
                      <Label htmlFor="name" className="text-sm font-medium">Plan Name</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                        placeholder="e.g., Pro Plan"
                        className="mt-1 h-10 modal-input"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="description" className="text-sm font-medium">Description</Label>
                    <Input
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({...formData, description: e.target.value})}
                      placeholder="Describe the plan features and benefits"
                      className="mt-1 h-10 modal-input"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label htmlFor="price" className="text-sm font-medium">Price (USD)</Label>
                      <Input
                        id="price"
                        type="number"
                        value={formData.price}
                        onChange={(e) => setFormData({...formData, price: parseFloat(e.target.value) || 0})}
                        placeholder="29.99"
                        className="mt-1 h-10 modal-input"
                      />
                    </div>
                    <div>
                      <Label htmlFor="sortOrder" className="text-sm font-medium">Sort Order</Label>
                      <Input
                        id="sortOrder"
                        type="number"
                        value={formData.sortOrder}
                        onChange={(e) => setFormData({...formData, sortOrder: parseInt(e.target.value) || 1})}
                        placeholder="1"
                        className="mt-1 h-10 modal-input"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <Label htmlFor="avatarMaxCount" className="text-sm font-medium">Max Avatars</Label>
                      <Input
                        id="avatarMaxCount"
                        type="number"
                        value={formData.avatarMaxCount}
                        onChange={(e) => setFormData({...formData, avatarMaxCount: parseInt(e.target.value) || 0})}
                        placeholder="3"
                        className="mt-1 h-10 modal-input"
                      />
                    </div>
                    <div>
                      <Label htmlFor="streamMinutesPerWeek" className="text-sm font-medium">Minutes/Week</Label>
                      <Input
                        id="streamMinutesPerWeek"
                        type="number"
                        value={formData.streamMinutesPerWeek}
                        onChange={(e) => setFormData({...formData, streamMinutesPerWeek: parseInt(e.target.value) || 0})}
                        placeholder="120"
                        className="mt-1 h-10 modal-input"
                      />
                    </div>
                    <div>
                      <Label htmlFor="maxConcurrentStreams" className="text-sm font-medium">Concurrent Streams</Label>
                      <Input
                        id="maxConcurrentStreams"
                        type="number"
                        value={formData.maxConcurrentStreams}
                        onChange={(e) => setFormData({...formData, maxConcurrentStreams: parseInt(e.target.value) || 0})}
                        placeholder="1"
                        className="mt-1 h-10 modal-input"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label htmlFor="maxResolution" className="text-sm font-medium">Max Resolution</Label>
                      <Input
                        id="maxResolution"
                        value={formData.maxResolution}
                        onChange={(e) => setFormData({...formData, maxResolution: e.target.value})}
                        placeholder="1080p"
                        className="mt-1 h-10 modal-input"
                      />
                    </div>
                    <div>
                      <Label htmlFor="maxMorphPoints" className="text-sm font-medium">Max Morph Points</Label>
                      <Input
                        id="maxMorphPoints"
                        type="number"
                        value={formData.maxMorphPoints}
                        onChange={(e) => setFormData({...formData, maxMorphPoints: parseInt(e.target.value) || 0})}
                        placeholder="10"
                        className="mt-1 h-10 modal-input"
                      />
                    </div>
                  </div>

                  <h3 className="text-lg font-semibold pt-2 border-t">Rigging Configuration</h3>
                  
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <Label htmlFor="maxBones" className="text-sm font-medium">Max Bones</Label>
                      <Input
                        id="maxBones"
                        type="number"
                        value={formData.maxBones}
                        onChange={(e) => setFormData({...formData, maxBones: parseInt(e.target.value) || 0})}
                        placeholder="20"
                        className="mt-1 h-10 modal-input"
                      />
                    </div>
                    <div>
                      <Label htmlFor="maxMorphTargets" className="text-sm font-medium">Max Morph Targets</Label>
                      <Input
                        id="maxMorphTargets"
                        type="number"
                        value={formData.maxMorphTargets}
                        onChange={(e) => setFormData({...formData, maxMorphTargets: parseInt(e.target.value) || 0})}
                        placeholder="10"
                        className="mt-1 h-10 modal-input"
                      />
                    </div>
                    <div>
                      <Label htmlFor="maxFileSizeMB" className="text-sm font-medium">Max File Size (MB)</Label>
                      <Input
                        id="maxFileSizeMB"
                        type="number"
                        value={formData.maxFileSizeMB}
                        onChange={(e) => setFormData({...formData, maxFileSizeMB: parseInt(e.target.value) || 0})}
                        placeholder="25"
                        className="mt-1 h-10 modal-input"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <Label htmlFor="trackingPrecision" className="text-sm font-medium">Tracking Precision (%)</Label>
                      <Input
                        id="trackingPrecision"
                        type="number"
                        value={formData.trackingPrecision}
                        onChange={(e) => setFormData({...formData, trackingPrecision: parseInt(e.target.value) || 0})}
                        placeholder="85"
                        className="mt-1 h-10 modal-input"
                      />
                    </div>
                    <div>
                      <Label htmlFor="animationSmoothness" className="text-sm font-medium">Animation Smoothness (%)</Label>
                      <Input
                        id="animationSmoothness"
                        type="number"
                        value={formData.animationSmoothness}
                        onChange={(e) => setFormData({...formData, animationSmoothness: parseInt(e.target.value) || 0})}
                        placeholder="75"
                        className="mt-1 h-10 modal-input"
                      />
                    </div>
                    <div>
                      <Label htmlFor="animationResponsiveness" className="text-sm font-medium">Animation Responsiveness (%)</Label>
                      <Input
                        id="animationResponsiveness"
                        type="number"
                        value={formData.animationResponsiveness}
                        onChange={(e) => setFormData({...formData, animationResponsiveness: parseInt(e.target.value) || 0})}
                        placeholder="80"
                        className="mt-1 h-10 modal-input"
                      />
                    </div>
                  </div>

                  <h4 className="text-base font-medium pt-2">Feature Toggles</h4>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="marketplaceAccess"
                        checked={formData.marketplaceAccess}
                        onCheckedChange={(checked) => setFormData({...formData, marketplaceAccess: checked})}
                        className="modal-toggle"
                      />
                      <Label htmlFor="marketplaceAccess" className="text-sm">Marketplace Access</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="customAvatars"
                        checked={formData.customAvatars}
                        onCheckedChange={(checked) => setFormData({...formData, customAvatars: checked})}
                        className="modal-toggle"
                      />
                      <Label htmlFor="customAvatars" className="text-sm">Custom Avatars</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="prioritySupport"
                        checked={formData.prioritySupport}
                        onCheckedChange={(checked) => setFormData({...formData, prioritySupport: checked})}
                        className="modal-toggle"
                      />
                      <Label htmlFor="prioritySupport" className="text-sm">Priority Support</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="xSpacesHosting"
                        checked={formData.xSpacesHosting}
                        onCheckedChange={(checked) => setFormData({...formData, xSpacesHosting: checked})}
                        className="modal-toggle"
                      />
                      <Label htmlFor="xSpacesHosting" className="text-sm">X Spaces Hosting</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="riggingStudioAccess"
                        checked={formData.riggingStudioAccess}
                        onCheckedChange={(checked) => setFormData({...formData, riggingStudioAccess: checked})}
                        className="modal-toggle"
                      />
                      <Label htmlFor="riggingStudioAccess" className="text-sm">Rigging Studio Access</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="buddyInviteAccess"
                        checked={formData.buddyInviteAccess}
                        onCheckedChange={(checked) => setFormData({...formData, buddyInviteAccess: checked})}
                        className="modal-toggle"
                      />
                      <Label htmlFor="buddyInviteAccess" className="text-sm">Buddy Invite Access</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="isPopular"
                        checked={formData.isPopular}
                        onCheckedChange={(checked) => setFormData({...formData, isPopular: checked})}
                        className="modal-toggle"
                      />
                      <Label htmlFor="isPopular" className="text-sm">Popular Plan</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="isFree"
                        checked={formData.isFree}
                        onCheckedChange={(checked) => setFormData({...formData, isFree: checked})}
                        className="modal-toggle"
                      />
                      <Label htmlFor="isFree" className="text-sm">Free Plan</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="isActive"
                        checked={formData.isActive}
                        onCheckedChange={(checked) => setFormData({...formData, isActive: checked})}
                        className="modal-toggle"
                      />
                      <Label htmlFor="isActive" className="text-sm">Active</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="isComingSoon"
                        checked={formData.isComingSoon}
                        onCheckedChange={(checked) => setFormData({...formData, isComingSoon: checked})}
                        className="modal-toggle"
                      />
                      <Label htmlFor="isComingSoon" className="text-sm">Coming Soon</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="autoRiggingEnabled"
                        checked={formData.autoRiggingEnabled}
                        onCheckedChange={(checked) => setFormData({...formData, autoRiggingEnabled: checked})}
                        className="modal-toggle"
                      />
                      <Label htmlFor="autoRiggingEnabled" className="text-sm">Auto-Rigging Enabled</Label>
                    </div>
                  </div>

                  <h4 className="text-base font-medium pt-2">Tracking Features</h4>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="faceTracking"
                        checked={formData.faceTracking}
                        onCheckedChange={(checked) => setFormData({...formData, faceTracking: checked})}
                        className="modal-toggle"
                      />
                      <Label htmlFor="faceTracking" className="text-sm">Face Tracking</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="bodyTracking"
                        checked={formData.bodyTracking}
                        onCheckedChange={(checked) => setFormData({...formData, bodyTracking: checked})}
                        className="modal-toggle"
                      />
                      <Label htmlFor="bodyTracking" className="text-sm">Body Tracking</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="handTracking"
                        checked={formData.handTracking}
                        onCheckedChange={(checked) => setFormData({...formData, handTracking: checked})}
                        className="modal-toggle"
                      />
                      <Label htmlFor="handTracking" className="text-sm">Hand Tracking</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="fingerTracking"
                        checked={formData.fingerTracking}
                        onCheckedChange={(checked) => setFormData({...formData, fingerTracking: checked})}
                        className="modal-toggle"
                      />
                      <Label htmlFor="fingerTracking" className="text-sm">Finger Tracking</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="eyeTracking"
                        checked={formData.eyeTracking}
                        onCheckedChange={(checked) => setFormData({...formData, eyeTracking: checked})}
                        className="modal-toggle"
                      />
                      <Label htmlFor="eyeTracking" className="text-sm">Eye Tracking</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="expressionTracking"
                        checked={formData.expressionTracking}
                        onCheckedChange={(checked) => setFormData({...formData, expressionTracking: checked})}
                        className="modal-toggle"
                      />
                      <Label htmlFor="expressionTracking" className="text-sm">Expression Tracking</Label>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleSave} 
                  disabled={createPlanMutation.isPending || updatePlanMutation.isPending}
                  className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                >
                  {(createPlanMutation.isPending || updatePlanMutation.isPending) ? "Saving..." : editingPlan ? "Update Plan" : "Create Plan"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}