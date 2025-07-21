import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { addOns } from "@/lib/constants";
import { GlassCard } from "@/components/ui/glass-card";

export function AddOns() {
  const { toast } = useToast();
  const [addedItems, setAddedItems] = useState<string[]>([]);

  const addToCart = (id: string) => {
    if (addedItems.includes(id)) {
      toast({
        title: "Already added",
        description: "This add-on is already in your cart"
      });
      return;
    }
    
    setAddedItems((prev) => [...prev, id]);
    toast({
      title: "Add-on added",
      description: "Add-on has been added to your plan"
    });
  };

  return (
    <div className="mt-16">
      <h3 className="text-2xl font-bold text-center mb-8">Power-Up with Add-ons</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
        {addOns.map((addon) => (
          <GlassCard key={addon.id} className="p-5">
            <div className="flex justify-between items-start">
              <div>
                <h4 className="font-bold">{addon.name}</h4>
                <p className="text-sm text-gray-300 mt-1">{addon.description}</p>
              </div>
              <span className="bg-surface px-3 py-1 rounded-lg text-sm font-medium">${addon.price}</span>
            </div>
            <Button
              onClick={() => addToCart(addon.id)}
              variant="outline"
              className="mt-4 w-full py-2 text-sm"
            >
              {addedItems.includes(addon.id) ? "Added" : "Add to Plan"}
            </Button>
          </GlassCard>
        ))}
      </div>
    </div>
  );
}

export default AddOns;
