import { useState, useEffect } from "react";
import { Navbar } from "@/components/Navbar";
import { MobileNavbar } from "@/components/MobileNavbar";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { ShoppingCart, Filter, ChevronDown, Search, Plus, Minus } from "lucide-react";
import { Link } from "wouter";

// Mock marketplace data - in production this would come from an API
const marketplaceItems = [
  {
    id: "hat-001",
    name: "Neon Cyberpunk Cap",
    category: "hats",
    price: 2.99,
    thumbnailUrl: "https://images.unsplash.com/photo-1533055640609-24b498dfd74c?w=300&h=300&fit=crop",
    description: "A stylish neon-trimmed cap for your avatar",
    featured: true
  },
  {
    id: "hat-002",
    name: "Wizard Hat",
    category: "hats",
    price: 3.99,
    thumbnailUrl: "https://images.unsplash.com/photo-1509087859087-a384654eca4d?w=300&h=300&fit=crop",
    description: "A magical wizard hat with animated stars"
  },
  {
    id: "glass-001",
    name: "Cyberpunk Shades",
    category: "glasses",
    price: 2.49,
    thumbnailUrl: "https://images.unsplash.com/photo-1625591340248-6d761e4e4ffc?w=300&h=300&fit=crop",
    description: "Futuristic LED shades that pulse with the beat",
    featured: true
  },
  {
    id: "glass-002",
    name: "AR Visor",
    category: "glasses",
    price: 4.99,
    thumbnailUrl: "https://images.unsplash.com/photo-1577803645773-f96470509666?w=300&h=300&fit=crop",
    description: "High-tech visor with customizable HUD elements"
  },
  {
    id: "accessory-001",
    name: "Holographic Wings",
    category: "accessories",
    price: 5.99,
    thumbnailUrl: "https://images.unsplash.com/photo-1605106702734-205df224ecce?w=300&h=300&fit=crop", 
    description: "Ethereal wings with customizable color patterns",
    featured: true
  },
  {
    id: "accessory-002",
    name: "Robotic Arm",
    category: "accessories",
    price: 7.99,
    thumbnailUrl: "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=300&h=300&fit=crop",
    description: "Mechanical arm with animated joints and gears"
  },
  {
    id: "bg-001",
    name: "Aurora Sky",
    category: "backgrounds",
    price: 3.99,
    thumbnailUrl: "https://images.unsplash.com/photo-1491466424936-e304919aada7?w=300&h=300&fit=crop",
    description: "Dynamic northern lights background effect",
    featured: true
  },
  {
    id: "bg-002",
    name: "Tokyo Alley",
    category: "backgrounds",
    price: 4.99,
    thumbnailUrl: "https://images.unsplash.com/photo-1516205651411-aef33a44f7c2?w=300&h=300&fit=crop",
    description: "Animated cyberpunk Tokyo street background"
  },
  {
    id: "animate-001",
    name: "Teleport Effect",
    category: "animations",
    price: 6.99,
    thumbnailUrl: "https://images.unsplash.com/photo-1520034475321-cbe63696469a?w=300&h=300&fit=crop",
    description: "Sci-fi teleportation animation with particle effects"
  },
  {
    id: "animate-002",
    name: "Power Surge",
    category: "animations",
    price: 5.99,
    thumbnailUrl: "https://images.unsplash.com/photo-1548504769-900b70ed122e?w=300&h=300&fit=crop",
    description: "Energy surge animation with customizable colors"
  }
];

type MarketplaceItem = typeof marketplaceItems[0];
type CartItem = MarketplaceItem & { quantity: number };

export default function Marketplace() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [items, setItems] = useState(marketplaceItems);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showCart, setShowCart] = useState(false);

  // Get total cart items
  const cartItemsCount = cart.reduce((total, item) => total + item.quantity, 0);
  
  // Calculate cart total
  const cartTotal = cart.reduce((total, item) => total + (item.price * item.quantity), 0);

  // Filter items based on active tab and search query
  const filteredItems = items.filter(item => {
    const matchesTab = activeTab === "all" || 
      activeTab === "featured" ? item.featured : 
      item.category === activeTab;
      
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase());
      
    return matchesTab && matchesSearch;
  });

  // Add item to cart
  const addToCart = (item: MarketplaceItem) => {
    setCart(prevCart => {
      const existingItem = prevCart.find(cartItem => cartItem.id === item.id);
      
      if (existingItem) {
        return prevCart.map(cartItem => 
          cartItem.id === item.id 
            ? { ...cartItem, quantity: cartItem.quantity + 1 } 
            : cartItem
        );
      } else {
        return [...prevCart, { ...item, quantity: 1 }];
      }
    });
    
    toast({
      title: "Item added to cart",
      description: `${item.name} has been added to your cart.`,
    });
  };

  // Remove item from cart
  const removeFromCart = (itemId: string) => {
    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.id === itemId);
      
      if (existingItem && existingItem.quantity > 1) {
        return prevCart.map(item => 
          item.id === itemId 
            ? { ...item, quantity: item.quantity - 1 } 
            : item
        );
      } else {
        return prevCart.filter(item => item.id !== itemId);
      }
    });
  };

  // Clear cart
  const clearCart = () => {
    setCart([]);
    toast({
      title: "Cart cleared",
      description: "All items have been removed from your cart.",
    });
  };

  // Checkout function
  const checkout = () => {
    if (cart.length === 0) {
      toast({
        title: "Cart is empty",
        description: "Add some items to your cart before checking out.",
        variant: "destructive",
      });
      return;
    }
    
    // Here you would integrate with Stripe or another payment processor
    // For now, we'll just show a success message
    toast({
      title: "Checkout successful!",
      description: `You've purchased ${cartItemsCount} items for $${cartTotal.toFixed(2)}.`,
    });
    
    setCart([]);
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <MobileNavbar />
        
        <div className="flex-1 flex items-center justify-center">
          <Card className="w-full max-w-md bg-black/60 border-surface">
            <CardHeader>
              <CardTitle>Access Required</CardTitle>
              <CardDescription>
                Sign in to browse and purchase items from the marketplace.
              </CardDescription>
            </CardHeader>
            <CardFooter>
              <Link href="/login">
                <Button className="w-full">Sign In</Button>
              </Link>
            </CardFooter>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <MobileNavbar />
      
      <div className="flex-1 container py-8 px-4 md:px-6 mt-16 mb-20">
        <div className="max-w-7xl mx-auto">
          {/* Header with search and cart */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
            <div>
              <h1 className="text-3xl font-bold">Avatar Marketplace</h1>
              <p className="text-muted-foreground mt-1">
                Customize your avatar with unique accessories and effects
              </p>
            </div>
            
            <div className="flex items-center gap-2 w-full md:w-auto">
              <div className="relative flex-1 md:max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Search marketplace..." 
                  className="pl-9 pr-4 py-2 bg-surface/50 border-surface" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="h-10 gap-1">
                    <Filter className="h-4 w-4" />
                    <span className="hidden sm:inline">Filter</span>
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-surface border-surface">
                  <DropdownMenuLabel>Sort By</DropdownMenuLabel>
                  <DropdownMenuItem>Price: Low to High</DropdownMenuItem>
                  <DropdownMenuItem>Price: High to Low</DropdownMenuItem>
                  <DropdownMenuItem>Newest First</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel>Categories</DropdownMenuLabel>
                  <DropdownMenuItem onClick={() => setActiveTab("hats")}>Hats</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setActiveTab("glasses")}>Glasses</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setActiveTab("accessories")}>Accessories</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setActiveTab("backgrounds")}>Backgrounds</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setActiveTab("animations")}>Animations</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              
              <Button 
                variant="default" 
                className="relative h-10"
                onClick={() => setShowCart(!showCart)}
              >
                <ShoppingCart className="h-5 w-5" />
                {cartItemsCount > 0 && (
                  <span className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center text-xs bg-primary rounded-full border-2 border-background">
                    {cartItemsCount}
                  </span>
                )}
              </Button>
            </div>
          </div>
          
          {/* Category Tabs */}
          <Tabs 
            value={activeTab} 
            onValueChange={setActiveTab} 
            className="w-full mb-8"
          >
            <TabsList className="grid grid-cols-3 md:grid-cols-7 bg-surface">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="featured">Featured</TabsTrigger>
              <TabsTrigger value="hats">Hats</TabsTrigger>
              <TabsTrigger value="glasses">Glasses</TabsTrigger>
              <TabsTrigger value="accessories">Accessories</TabsTrigger>
              <TabsTrigger value="backgrounds">Backgrounds</TabsTrigger>
              <TabsTrigger value="animations">Animations</TabsTrigger>
            </TabsList>
          </Tabs>
          
          {/* Shopping Cart Slide-over */}
          {showCart && (
            <div className="fixed inset-0 z-50 flex justify-end">
              <div 
                className="absolute inset-0 bg-black/50" 
                onClick={() => setShowCart(false)}
              />
              <div className="relative w-full max-w-md bg-surface-dark border-l border-surface z-10 overflow-auto flex flex-col">
                <div className="p-6 flex justify-between items-center border-b border-surface">
                  <h2 className="text-xl font-bold">Your Cart</h2>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setShowCart(false)}
                  >
                    Close
                  </Button>
                </div>
                
                <div className="flex-1 overflow-auto">
                  {cart.length === 0 ? (
                    <div className="p-8 text-center">
                      <p className="text-muted-foreground">Your cart is empty.</p>
                      <Button 
                        variant="outline" 
                        className="mt-4"
                        onClick={() => setShowCart(false)}
                      >
                        Continue Shopping
                      </Button>
                    </div>
                  ) : (
                    <div className="p-4 space-y-4">
                      {cart.map(item => (
                        <div 
                          key={item.id} 
                          className="flex items-center gap-4 p-3 rounded-lg bg-background/20"
                        >
                          <img 
                            src={item.thumbnailUrl} 
                            alt={item.name} 
                            className="h-16 w-16 object-cover rounded-md"
                          />
                          <div className="flex-1">
                            <h3 className="font-medium">{item.name}</h3>
                            <p className="text-sm text-muted-foreground">
                              ${item.price.toFixed(2)} x {item.quantity}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8"
                              onClick={() => removeFromCart(item.id)}
                            >
                              <Minus className="h-4 w-4" />
                            </Button>
                            <span>{item.quantity}</span>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8"
                              onClick={() => addToCart(item)}
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                
                {cart.length > 0 && (
                  <div className="p-6 border-t border-surface">
                    <div className="flex justify-between mb-4">
                      <span className="font-medium">Total:</span>
                      <span className="font-bold">${cartTotal.toFixed(2)}</span>
                    </div>
                    <div className="space-y-2">
                      <Button 
                        className="w-full" 
                        onClick={checkout}
                      >
                        Checkout
                      </Button>
                      <Button 
                        variant="outline" 
                        className="w-full"
                        onClick={clearCart}
                      >
                        Clear Cart
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Item Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {filteredItems.length > 0 ? filteredItems.map(item => (
              <Card 
                key={item.id} 
                className="overflow-hidden transition-all duration-200 hover:shadow-md hover:shadow-primary/30 bg-black/60 border-surface"
              >
                <div className="aspect-square relative overflow-hidden">
                  <img 
                    src={item.thumbnailUrl} 
                    alt={item.name} 
                    className="w-full h-full object-cover transition-transform duration-300 hover:scale-110"
                  />
                  {item.featured && (
                    <Badge className="absolute top-2 right-2 bg-primary">
                      Featured
                    </Badge>
                  )}
                </div>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">{item.name}</CardTitle>
                  <CardDescription>
                    {item.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pb-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-surface/50">
                      {item.category.charAt(0).toUpperCase() + item.category.slice(1)}
                    </Badge>
                    <span className="ml-auto font-bold">${item.price.toFixed(2)}</span>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button 
                    className="w-full"
                    onClick={() => addToCart(item)}
                  >
                    Add to Cart
                  </Button>
                </CardFooter>
              </Card>
            )) : (
              <div className="col-span-4 py-16 text-center">
                <p className="text-muted-foreground text-lg">No items found. Try adjusting your search or filters.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}