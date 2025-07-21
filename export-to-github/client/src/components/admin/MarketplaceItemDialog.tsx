import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Package, ShoppingBag } from "lucide-react";

export type MarketplaceItem = {
  id: string;
  name: string;
  category: string;
  price: number;
  sales: number;
  revenue: number;
  featured: boolean;
  status: string;
  createdAt: string;
};

interface MarketplaceItemDialogProps {
  item: MarketplaceItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdateSuccess?: () => void;
  isSuperAdmin: boolean;
}

export function MarketplaceItemDialog({
  item,
  open,
  onOpenChange,
  onUpdateSuccess,
  isSuperAdmin,
}: MarketplaceItemDialogProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [name, setName] = useState(item.name);
  const [price, setPrice] = useState(item.price.toString());
  const [category, setCategory] = useState(item.category);
  const [status, setStatus] = useState(item.status);
  const [featured, setFeatured] = useState(item.featured ? "yes" : "no");

  const handleUpdateItem = async () => {
    if (
      name === item.name && 
      parseFloat(price) === item.price && 
      category === item.category && 
      status === item.status && 
      (featured === "yes") === item.featured
    ) {
      onOpenChange(false);
      return;
    }

    setIsLoading(true);
    try {
      const response = await apiRequest("PATCH", `/api/admin/marketplace/${item.id}`, {
        name,
        price: parseFloat(price),
        category,
        status,
        featured: featured === "yes",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to update marketplace item");
      }

      toast({
        title: "Item updated",
        description: "Marketplace item has been updated successfully",
      });

      if (onUpdateSuccess) {
        onUpdateSuccess();
      }
      
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Update failed",
        description: error.message || "There was a problem updating the item",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-background/95 backdrop-blur-md border border-border/50">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5 text-primary" />
            Edit Marketplace Item
          </DialogTitle>
          <DialogDescription>
            Update item details and availability
          </DialogDescription>
        </DialogHeader>

        <div className="mb-4 p-3 sm:p-4 bg-muted/30 rounded-lg flex flex-col items-center">
          <div className="h-16 w-16 rounded-full bg-muted-foreground/20 flex items-center justify-center mb-2">
            <Package className="h-8 w-8 text-primary" />
          </div>
          <h3 className="font-semibold text-lg">{item.name}</h3>
          <p className="text-muted-foreground text-sm">${item.price} • {item.category}</p>
          <div className="flex gap-2 mt-2">
            <Badge variant={item.featured ? "default" : "secondary"}>
              {item.featured ? "Featured" : "Standard"}
            </Badge>
            <Badge variant={item.status === "active" ? "default" : "destructive"}>
              {item.status === "active" ? "Active" : "Inactive"}
            </Badge>
          </div>
        </div>

        <div className="max-h-[70vh] sm:max-h-[50vh] overflow-y-auto scrollbar-thin -mr-4 sm:-mr-6 pr-4 sm:pr-6">
          <div className="space-y-3 sm:space-y-4 px-1">
            {/* Item Details */}
            <div className="bg-muted/30 rounded-lg p-3 sm:p-4 space-y-3">
              <h4 className="font-semibold text-sm text-primary">Item Details</h4>
              <div className="space-y-3">
                <div>
                  <Label htmlFor="name" className="text-xs sm:text-sm font-medium">
                    Item Name
                  </Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="mt-1 h-10"
                    placeholder="Enter item name"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="price" className="text-xs sm:text-sm font-medium">
                      Price ($)
                    </Label>
                    <Input
                      id="price"
                      type="number"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      step="0.01"
                      min="0"
                      className="mt-1 h-10"
                      placeholder="0.00"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="category" className="text-xs sm:text-sm font-medium">
                      Category
                    </Label>
                    <Select value={category} onValueChange={setCategory}>
                      <SelectTrigger id="category" className="mt-1 h-10">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="hats">Hats</SelectItem>
                        <SelectItem value="glasses">Glasses</SelectItem>
                        <SelectItem value="accessories">Accessories</SelectItem>
                        <SelectItem value="backgrounds">Backgrounds</SelectItem>
                        <SelectItem value="animations">Animations</SelectItem>
                        <SelectItem value="effects">Effects</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>

            {/* Item Settings */}
            <div className="bg-muted/30 rounded-lg p-3 sm:p-4 space-y-3">
              <h4 className="font-semibold text-sm text-primary">Item Settings</h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="status" className="text-xs sm:text-sm font-medium">
                    Status
                  </Label>
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger id="status" className="mt-1 h-10">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="featured" className="text-xs sm:text-sm font-medium">
                    Featured
                  </Label>
                  <Select value={featured} onValueChange={setFeatured}>
                    <SelectTrigger id="featured" className="mt-1 h-10">
                      <SelectValue placeholder="Featured?" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="yes">Yes</SelectItem>
                      <SelectItem value="no">No</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleSave}
                className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
              >
                Save Item
              </Button>
            </div>
          </div>
        </div>

        <div className="flex gap-2 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button 
            onClick={handleUpdateItem}
            disabled={isLoading || (
              name === item.name && 
              parseFloat(price) === item.price && 
              category === item.category && 
              status === item.status && 
              (featured === "yes") === item.featured
            )}
            className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
          >
            {isLoading ? "Updating..." : "Save Changes"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}