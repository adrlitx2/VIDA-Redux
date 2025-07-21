import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useSubscription } from "@/hooks/use-subscription";
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
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { Link } from "wouter";

// Mock payment method data (would be fetched from Stripe in production)
const mockPaymentMethods = [
  {
    id: "pm_1234567890",
    brand: "visa",
    last4: "4242",
    expMonth: 12,
    expYear: 2025,
    isDefault: true
  }
];

// Mock billing history (would be fetched from Stripe in production)
const mockBillingHistory = [
  {
    id: "in_1234567890",
    amount: 99,
    status: "paid",
    date: "2025-04-23",
    description: "Spartan Subscription - Monthly"
  },
  {
    id: "in_0987654321",
    amount: 15,
    status: "paid",
    date: "2025-04-10",
    description: "+10 Stream Hours Add-on"
  }
];

export default function Billing() {
  const { user } = useAuth();
  const { currentPlan, remainingStreamTime } = useSubscription();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState(mockPaymentMethods);
  const [billingHistory, setBillingHistory] = useState(mockBillingHistory);
  const [activeTab, setActiveTab] = useState("payment-methods");

  // This would be implemented with real Stripe integration in production
  const fetchBillingData = async () => {
    try {
      setIsLoading(true);
      // In production, you would fetch real data from your Stripe API endpoint
      // const response = await apiRequest("GET", "/api/billing/payment-methods");
      // const data = await response.json();
      // setPaymentMethods(data.paymentMethods);
      
      // const historyResponse = await apiRequest("GET", "/api/billing/history");
      // const historyData = await historyResponse.json();
      // setBillingHistory(historyData.invoices);
      
      // Using mock data for now
      setPaymentMethods(mockPaymentMethods);
      setBillingHistory(mockBillingHistory);
    } catch (error) {
      console.error("Error fetching billing data:", error);
      toast({
        title: "Error",
        description: "Failed to load billing information. Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const removePaymentMethod = async (paymentMethodId: string) => {
    try {
      setIsLoading(true);
      // In production, this would call your Stripe API endpoint
      // await apiRequest("DELETE", `/api/billing/payment-methods/${paymentMethodId}`);
      
      // Using mock update for now
      setPaymentMethods(paymentMethods.filter(pm => pm.id !== paymentMethodId));
      
      toast({
        title: "Payment method removed",
        description: "Your payment method has been successfully removed.",
      });
    } catch (error) {
      console.error("Error removing payment method:", error);
      toast({
        title: "Error",
        description: "Failed to remove payment method. Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const setDefaultPaymentMethod = async (paymentMethodId: string) => {
    try {
      setIsLoading(true);
      // In production, this would call your Stripe API endpoint
      // await apiRequest("POST", `/api/billing/payment-methods/${paymentMethodId}/default`);
      
      // Using mock update for now
      setPaymentMethods(paymentMethods.map(pm => ({
        ...pm,
        isDefault: pm.id === paymentMethodId
      })));
      
      toast({
        title: "Default payment method updated",
        description: "Your default payment method has been updated successfully.",
      });
    } catch (error) {
      console.error("Error setting default payment method:", error);
      toast({
        title: "Error",
        description: "Failed to update default payment method. Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const addPaymentMethod = () => {
    // In production, this would redirect to a Stripe-hosted page or open a Stripe Elements modal
    toast({
      title: "Coming Soon",
      description: "Adding new payment methods will be available soon.",
    });
  };

  useEffect(() => {
    if (user) {
      fetchBillingData();
    }
  }, [user]);

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center">
        <Card className="w-full max-w-md bg-black/60 border-surface">
          <CardHeader>
            <CardTitle>Authentication Required</CardTitle>
            <CardDescription>
              Please sign in to view your billing information.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Link href="/login">
              <Button className="w-full">Sign In</Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <MobileNavbar />

      <div className="flex-1 container py-8 px-4 md:px-6 mt-16">
        <div className="max-w-6xl mx-auto">
          <div className="mb-6">
            <h1 className="text-3xl font-bold">Billing & Payments</h1>
            <p className="text-muted-foreground mt-2">
              Manage your subscription, payment methods, and billing history
            </p>
          </div>

          {/* Subscription Summary Card */}
          <Card className="bg-black/60 border-surface mb-8">
            <CardHeader>
              <CardTitle>Subscription Summary</CardTitle>
              <CardDescription>
                Your current plan and billing information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col md:flex-row justify-between gap-4">
                <div>
                  <h3 className="text-lg font-medium">Current Plan</h3>
                  <div className="flex items-center mt-2">
                    <Badge className={`mr-2 ${currentPlan?.id === "free" ? "bg-gray-600" : 
                      currentPlan?.id === "reply_guy" ? "bg-blue-600" : 
                      currentPlan?.id === "spartan" ? "bg-purple-600" : 
                      currentPlan?.id === "zeus" ? "bg-yellow-600" : 
                      "bg-gradient-to-r from-purple-600 to-pink-600"}`}>
                      {currentPlan?.name || "Free"}
                    </Badge>
                    <span className="text-muted-foreground">
                      ${currentPlan?.price || 0}/month
                    </span>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-medium">Streaming Time</h3>
                  <div className="mt-2">
                    <span className="text-primary font-medium">
                      {remainingStreamTime} minutes
                    </span> remaining this week
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-medium">Renewal Date</h3>
                  <div className="mt-2">
                    <span className="text-muted-foreground">
                      {/* This would come from your subscription data in production */}
                      {new Date(Date.now() + 1000 * 60 * 60 * 24 * 15).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex flex-wrap gap-2">
              <Link href="/pricing">
                <Button variant="default" size="sm">
                  Change Plan
                </Button>
              </Link>
              <Button variant="outline" size="sm">
                Cancel Subscription
              </Button>
            </CardFooter>
          </Card>

          {/* Tabs for Payment Methods and Billing History */}
          <Tabs 
            value={activeTab} 
            onValueChange={setActiveTab} 
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-2 bg-surface">
              <TabsTrigger value="payment-methods">Payment Methods</TabsTrigger>
              <TabsTrigger value="billing-history">Billing History</TabsTrigger>
            </TabsList>

            {/* Payment Methods Tab */}
            <TabsContent value="payment-methods" className="mt-4">
              <Card className="bg-black/60 border-surface">
                <CardHeader>
                  <CardTitle>Payment Methods</CardTitle>
                  <CardDescription>
                    Manage your saved payment methods
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  ) : paymentMethods.length > 0 ? (
                    <div className="space-y-4">
                      {paymentMethods.map(method => (
                        <div 
                          key={method.id} 
                          className="flex items-center justify-between p-4 rounded-lg bg-surface/50"
                        >
                          <div className="flex items-center">
                            <div className="w-12 h-8 mr-4 rounded bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white font-bold">
                              {method.brand.toUpperCase()}
                            </div>
                            <div>
                              <p className="font-medium">
                                •••• •••• •••• {method.last4}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                Expires {method.expMonth}/{method.expYear}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {method.isDefault ? (
                              <Badge variant="outline" className="border-green-500 text-green-500">
                                Default
                              </Badge>
                            ) : (
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => setDefaultPaymentMethod(method.id)}
                              >
                                Set Default
                              </Button>
                            )}
                            <Button 
                              variant="destructive" 
                              size="sm"
                              onClick={() => removePaymentMethod(method.id)}
                            >
                              Remove
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-8 text-center">
                      <p className="text-muted-foreground">No payment methods found.</p>
                    </div>
                  )}
                </CardContent>
                <CardFooter>
                  <Button onClick={addPaymentMethod} className="w-full">
                    Add Payment Method
                  </Button>
                </CardFooter>
              </Card>
            </TabsContent>

            {/* Billing History Tab */}
            <TabsContent value="billing-history" className="mt-4">
              <Card className="bg-black/60 border-surface">
                <CardHeader>
                  <CardTitle>Billing History</CardTitle>
                  <CardDescription>
                    View your past invoices and payment history
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  ) : billingHistory.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow className="border-surface">
                          <TableHead>Date</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Receipt</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {billingHistory.map(invoice => (
                          <TableRow 
                            key={invoice.id}
                            className="border-surface"
                          >
                            <TableCell>
                              {new Date(invoice.date).toLocaleDateString()}
                            </TableCell>
                            <TableCell>{invoice.description}</TableCell>
                            <TableCell>${invoice.amount.toFixed(2)}</TableCell>
                            <TableCell>
                              <Badge className={
                                invoice.status === "paid" ? "bg-green-600" :
                                invoice.status === "pending" ? "bg-yellow-600" :
                                "bg-red-600"
                              }>
                                {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button variant="link" size="sm">
                                Download
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="py-8 text-center">
                      <p className="text-muted-foreground">No billing history found.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}