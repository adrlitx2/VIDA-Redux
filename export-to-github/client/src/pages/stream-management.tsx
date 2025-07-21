import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Edit, Plus, Upload, Eye, EyeOff, Settings, Monitor } from "lucide-react";
import type { StreamBackground, BackgroundCategory } from "@shared/schema";

// Form schemas
const backgroundSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  category: z.string().min(1, "Category is required"),
  imageUrl: z.string().url("Must be a valid URL"),
  thumbnailUrl: z.string().url().optional(),
  isActive: z.boolean().default(true),
  sortOrder: z.number().min(0).default(0),
  requiredPlan: z.enum(["free", "pro", "premium"]).default("free"),
});

const categorySchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  isActive: z.boolean().default(true),
  sortOrder: z.number().min(0).default(0),
});

type BackgroundForm = z.infer<typeof backgroundSchema>;
type CategoryForm = z.infer<typeof categorySchema>;

export default function StreamManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isBackgroundDialogOpen, setIsBackgroundDialogOpen] = useState(false);
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [editingBackground, setEditingBackground] = useState<StreamBackground | null>(null);
  const [editingCategory, setEditingCategory] = useState<BackgroundCategory | null>(null);

  // Fetch backgrounds and categories
  const { data: backgrounds = [], isLoading: backgroundsLoading } = useQuery({
    queryKey: ["/api/backgrounds"],
  });

  const { data: categories = [], isLoading: categoriesLoading } = useQuery({
    queryKey: ["/api/backgrounds/categories"],
  });

  // Background form
  const backgroundForm = useForm<BackgroundForm>({
    resolver: zodResolver(backgroundSchema),
    defaultValues: {
      name: "",
      description: "",
      category: "",
      imageUrl: "",
      thumbnailUrl: "",
      isActive: true,
      sortOrder: 0,
      requiredPlan: "free",
    },
  });

  // Category form
  const categoryForm = useForm<CategoryForm>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: "",
      description: "",
      isActive: true,
      sortOrder: 0,
    },
  });

  // Create/update background mutation
  const backgroundMutation = useMutation({
    mutationFn: async (data: BackgroundForm & { id?: number }) => {
      if (data.id) {
        return apiRequest(`/api/admin/backgrounds/${data.id}`, {
          method: "PUT",
          body: JSON.stringify(data),
        });
      } else {
        return apiRequest("/api/admin/backgrounds", {
          method: "POST",
          body: JSON.stringify(data),
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/backgrounds"] });
      setIsBackgroundDialogOpen(false);
      setEditingBackground(null);
      backgroundForm.reset();
      toast({
        title: "Success",
        description: editingBackground ? "Background updated successfully" : "Background created successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to ${editingBackground ? "update" : "create"} background: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Delete background mutation
  const deleteBackgroundMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest(`/api/admin/backgrounds/${id}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/backgrounds"] });
      toast({
        title: "Success",
        description: "Background deleted successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to delete background: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Create/update category mutation
  const categoryMutation = useMutation({
    mutationFn: async (data: CategoryForm & { id?: number }) => {
      if (data.id) {
        return apiRequest(`/api/admin/background-categories/${data.id}`, {
          method: "PUT",
          body: JSON.stringify(data),
        });
      } else {
        return apiRequest("/api/admin/background-categories", {
          method: "POST",
          body: JSON.stringify(data),
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/background-categories"] });
      setIsCategoryDialogOpen(false);
      setEditingCategory(null);
      categoryForm.reset();
      toast({
        title: "Success",
        description: editingCategory ? "Category updated successfully" : "Category created successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to ${editingCategory ? "update" : "create"} category: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Handle edit background
  const handleEditBackground = (background: StreamBackground) => {
    setEditingBackground(background);
    backgroundForm.reset({
      name: background.name,
      description: background.description || "",
      category: background.category,
      imageUrl: background.imageUrl,
      thumbnailUrl: background.thumbnailUrl || "",
      isActive: background.isActive,
      sortOrder: background.sortOrder,
      requiredPlan: background.requiredPlan as "free" | "pro" | "premium",
    });
    setIsBackgroundDialogOpen(true);
  };

  // Handle edit category
  const handleEditCategory = (category: BackgroundCategory) => {
    setEditingCategory(category);
    categoryForm.reset({
      name: category.name,
      description: category.description || "",
      isActive: category.isActive,
      sortOrder: category.sortOrder,
    });
    setIsCategoryDialogOpen(true);
  };

  // Submit handlers
  const onBackgroundSubmit = (data: BackgroundForm) => {
    backgroundMutation.mutate({
      ...data,
      id: editingBackground?.id,
    });
  };

  const onCategorySubmit = (data: CategoryForm) => {
    categoryMutation.mutate({
      ...data,
      id: editingCategory?.id,
    });
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Stream Management</h1>
          <p className="text-gray-600 dark:text-gray-400">Manage streaming backgrounds and categories</p>
        </div>
        <Monitor className="h-8 w-8 text-blue-600" />
      </div>

      <Tabs defaultValue="backgrounds" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="backgrounds">Background Management</TabsTrigger>
          <TabsTrigger value="categories">Category Management</TabsTrigger>
        </TabsList>

        <TabsContent value="backgrounds" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Stream Backgrounds</CardTitle>
                  <CardDescription>
                    Manage virtual backgrounds for streaming. All backgrounds are preloaded for optimal performance.
                  </CardDescription>
                </div>
                <Dialog open={isBackgroundDialogOpen} onOpenChange={setIsBackgroundDialogOpen}>
                  <DialogTrigger asChild>
                    <Button onClick={() => {
                      setEditingBackground(null);
                      backgroundForm.reset();
                    }}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Background
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>
                        {editingBackground ? "Edit Background" : "Add New Background"}
                      </DialogTitle>
                      <DialogDescription>
                        Configure background settings. Images will be preloaded for streaming.
                      </DialogDescription>
                    </DialogHeader>
                    <Form {...backgroundForm}>
                      <form onSubmit={backgroundForm.handleSubmit(onBackgroundSubmit)} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={backgroundForm.control}
                            name="name"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Name</FormLabel>
                                <FormControl>
                                  <Input placeholder="Background name" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={backgroundForm.control}
                            name="category"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Category</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select category" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {categories.map((cat: BackgroundCategory) => (
                                      <SelectItem key={cat.id} value={cat.name.toLowerCase()}>
                                        {cat.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        <FormField
                          control={backgroundForm.control}
                          name="description"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Description</FormLabel>
                              <FormControl>
                                <Textarea placeholder="Background description" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={backgroundForm.control}
                            name="imageUrl"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Image URL</FormLabel>
                                <FormControl>
                                  <Input placeholder="https://..." {...field} />
                                </FormControl>
                                <FormDescription>
                                  Full resolution background image
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={backgroundForm.control}
                            name="thumbnailUrl"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Thumbnail URL (Optional)</FormLabel>
                                <FormControl>
                                  <Input placeholder="https://..." {...field} />
                                </FormControl>
                                <FormDescription>
                                  Preview thumbnail for admin interface
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                          <FormField
                            control={backgroundForm.control}
                            name="requiredPlan"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Required Plan</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="free">Free</SelectItem>
                                    <SelectItem value="pro">Pro</SelectItem>
                                    <SelectItem value="premium">Premium</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={backgroundForm.control}
                            name="sortOrder"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Sort Order</FormLabel>
                                <FormControl>
                                  <Input 
                                    type="number" 
                                    {...field} 
                                    onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={backgroundForm.control}
                            name="isActive"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                                <div className="space-y-0.5">
                                  <FormLabel>Active</FormLabel>
                                  <FormDescription>
                                    Show in stream interface
                                  </FormDescription>
                                </div>
                                <FormControl>
                                  <Switch
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                        </div>
                        <div className="flex justify-end space-x-2">
                          <Button 
                            type="button" 
                            variant="outline" 
                            onClick={() => setIsBackgroundDialogOpen(false)}
                          >
                            Cancel
                          </Button>
                          <Button type="submit" disabled={backgroundMutation.isPending}>
                            {backgroundMutation.isPending ? "Saving..." : (editingBackground ? "Update" : "Create")}
                          </Button>
                        </div>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {backgroundsLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="animate-pulse">
                      <div className="bg-gray-200 dark:bg-gray-700 h-32 rounded-lg mb-2"></div>
                      <div className="bg-gray-200 dark:bg-gray-700 h-4 rounded mb-1"></div>
                      <div className="bg-gray-200 dark:bg-gray-700 h-3 rounded w-2/3"></div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {backgrounds.map((background: StreamBackground) => (
                    <Card key={background.id} className="overflow-hidden">
                      <div className="relative h-32 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700">
                        {background.imageUrl ? (
                          <img 
                            src={background.imageUrl}
                            alt={background.name}
                            className="w-full h-full object-cover absolute inset-0"
                            crossOrigin="anonymous"
                            loading="lazy"
                          />
                        ) : (
                          <div className="flex items-center justify-center h-full text-gray-400">
                            <Upload className="h-8 w-8" />
                          </div>
                        )}
                        <div className="absolute top-2 right-2 flex space-x-1">
                          {background.isActive ? (
                            <Badge variant="default" className="text-xs">
                              <Eye className="h-3 w-3 mr-1" />
                              Active
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-xs">
                              <EyeOff className="h-3 w-3 mr-1" />
                              Hidden
                            </Badge>
                          )}
                          <Badge variant="outline" className="text-xs">
                            {background.requiredPlan}
                          </Badge>
                        </div>
                      </div>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h3 className="font-semibold text-sm">{background.name}</h3>
                            <p className="text-xs text-gray-600 dark:text-gray-400 capitalize">
                              {background.category}
                            </p>
                          </div>
                          <div className="flex space-x-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditBackground(background)}
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteBackgroundMutation.mutate(background.id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                        {background.description && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                            {background.description}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="categories" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Background Categories</CardTitle>
                  <CardDescription>
                    Organize backgrounds into categories for better management
                  </CardDescription>
                </div>
                <Dialog open={isCategoryDialogOpen} onOpenChange={setIsCategoryDialogOpen}>
                  <DialogTrigger asChild>
                    <Button onClick={() => {
                      setEditingCategory(null);
                      categoryForm.reset();
                    }}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Category
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>
                        {editingCategory ? "Edit Category" : "Add New Category"}
                      </DialogTitle>
                      <DialogDescription>
                        Create categories to organize your backgrounds
                      </DialogDescription>
                    </DialogHeader>
                    <Form {...categoryForm}>
                      <form onSubmit={categoryForm.handleSubmit(onCategorySubmit)} className="space-y-4">
                        <FormField
                          control={categoryForm.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Name</FormLabel>
                              <FormControl>
                                <Input placeholder="Category name" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={categoryForm.control}
                          name="description"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Description</FormLabel>
                              <FormControl>
                                <Textarea placeholder="Category description" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={categoryForm.control}
                            name="sortOrder"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Sort Order</FormLabel>
                                <FormControl>
                                  <Input 
                                    type="number" 
                                    {...field} 
                                    onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={categoryForm.control}
                            name="isActive"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                                <div className="space-y-0.5">
                                  <FormLabel>Active</FormLabel>
                                  <FormDescription>
                                    Show in interface
                                  </FormDescription>
                                </div>
                                <FormControl>
                                  <Switch
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                        </div>
                        <div className="flex justify-end space-x-2">
                          <Button 
                            type="button" 
                            variant="outline" 
                            onClick={() => setIsCategoryDialogOpen(false)}
                          >
                            Cancel
                          </Button>
                          <Button type="submit" disabled={categoryMutation.isPending}>
                            {categoryMutation.isPending ? "Saving..." : (editingCategory ? "Update" : "Create")}
                          </Button>
                        </div>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {categoriesLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="animate-pulse">
                      <div className="bg-gray-200 dark:bg-gray-700 h-16 rounded-lg"></div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {categories.map((category: BackgroundCategory) => (
                    <Card key={category.id} className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center space-x-2">
                            <h3 className="font-semibold">{category.name}</h3>
                            {category.isActive ? (
                              <Badge variant="default">Active</Badge>
                            ) : (
                              <Badge variant="secondary">Hidden</Badge>
                            )}
                          </div>
                          {category.description && (
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                              {category.description}
                            </p>
                          )}
                        </div>
                        <div className="flex space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditCategory(category)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}