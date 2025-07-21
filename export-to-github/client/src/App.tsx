import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ThemeProvider";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import Login from "@/pages/login";
import Register from "@/pages/register";
import Dashboard from "@/pages/dashboard";
import DemoDashboard from "@/pages/demo-dashboard";
import { LoadingScreen } from "@/components/LoadingScreen";
import Avatars from "@/pages/avatars";

import AvatarStudio from "@/pages/avatar-studio";
import Stream from "@/pages/stream";
import Pricing from "@/pages/pricing";
import Checkout from "@/pages/checkout";
import Account from "@/pages/account";
import Billing from "@/pages/billing";
import Marketplace from "@/pages/marketplace";
import SubscriptionSuccess from "@/pages/subscription/success";
import StreamManagement from "@/pages/stream-management";
import AdminDashboard from "@/pages/admin/dashboard-fixed-new";
import RealAdminDashboard from "@/pages/admin/real-dashboard";
import QuickAdminTools from "@/pages/admin/quick-admin-tools";
import AdminUsersFixed from "@/pages/admin/users-fixed";
import AuthCallback from "@/pages/auth/callback";
import RegisterSimple from "@/pages/register-simple";
import VidaRigTest from "@/pages/vida-rig-test";
import AuthTest from "@/pages/auth-test";
import AvatarCompletionTest from "@/pages/avatar-completion-test";
import EmailLogin from "@/pages/email-login";
import SimpleLogin from "@/pages/simple-login";
import LoginAdmin from "@/pages/login-admin-fixed";
import MouthTrackingTest from "@/pages/mouth-tracking-test";
import CameraDebug from "@/pages/camera-debug";
import SimpleCameraTest from "@/pages/simple-camera-test";
import CameraDebugFixed from "@/pages/camera-debug-fixed";
import MouthTrackingEnhanced from "@/pages/mouth-tracking-enhanced";
import MouthTrackingVisualDebug from "@/pages/mouth-tracking-visual-debug";
import MouthTrackingWorking from "@/pages/mouth-tracking-working";
import ComprehensiveTracking from "@/pages/comprehensive-tracking";
import RealMediaPipeTracking from "@/pages/real-mediapipe-tracking";
import WorkingMediaPipeTracking from "@/pages/working-mediapipe-tracking";
import AuthenticMediaPipeTracking from "@/pages/authentic-mediapipe-tracking";
import WorkingRealMediaPipe from "@/pages/working-real-mediapipe";
import FixedMediaPipeTracking from "@/pages/fixed-mediapipe-tracking";
import { AuthProvider, useAuth } from "./hooks/use-auth";
import { SubscriptionProvider } from "./hooks/use-subscription";
import { AvatarProvider } from "./hooks/use-avatar";
import AutoRiggingProgress from "@/components/AutoRiggingProgress";
import { useState, createContext, useContext } from "react";

// Global auto-rigging progress context
const AutoRiggingContext = createContext<{
  showProgress: boolean;
  avatarName: string;
  userPlan: string;
  startAutoRigging: (name: string, plan: string) => void;
  completeAutoRigging: () => void;
}>({
  showProgress: false,
  avatarName: "",
  userPlan: "free",
  startAutoRigging: () => {},
  completeAutoRigging: () => {}
});

export const useAutoRigging = () => useContext(AutoRiggingContext);

function Router() {
  const { user, isLoading } = useAuth();
  const [showProgress, setShowProgress] = useState(false);
  const [avatarName, setAvatarName] = useState("");
  const [userPlan, setUserPlan] = useState("free");

  const startAutoRigging = (name: string, plan: string) => {
    console.log("🎯 AutoRigging Context: startAutoRigging called", { name, plan });
    setAvatarName(name);
    setUserPlan(plan);
    setShowProgress(true);
    console.log("🎯 AutoRigging Context: showProgress set to true");
  };

  const completeAutoRigging = () => {
    console.log("🎯 AutoRigging Context: completeAutoRigging called");
    setShowProgress(false);
    setAvatarName("");
    setUserPlan("free");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  console.log("🎯 App render - AutoRigging state:", { showProgress, avatarName, userPlan });

  return (
    <AutoRiggingContext.Provider value={{
      showProgress,
      avatarName,
      userPlan,
      startAutoRigging,
      completeAutoRigging
    }}>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/dashboard">
          {isLoading ? <LoadingScreen /> : user ? <Dashboard /> : <Login />}
        </Route>
      <Route path="/loading" component={() => <LoadingScreen />} />
      <Route path="/demo-dashboard" component={DemoDashboard} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/register-simple" component={RegisterSimple} />
      <Route path="/auth/callback" component={AuthCallback} />
      <Route path="/auth-test" component={AuthTest} />
      <Route path="/email-login" component={EmailLogin} />
      <Route path="/simple-login" component={SimpleLogin} />
      <Route path="/admin/login">
        <LoginAdmin />
      </Route>
      <Route path="/avatars">
        {user ? <Avatars /> : <Login />}
      </Route>

      <Route path="/avatar-studio">
        {user ? <AvatarStudio /> : <Login />}
      </Route>
      <Route path="/stream">
        {user ? <Stream /> : <Login />}
      </Route>
      <Route path="/stream-management">
        {user ? <StreamManagement /> : <Login />}
      </Route>
      <Route path="/pricing" component={Pricing} />
      <Route path="/checkout">
        {user ? <Checkout /> : <Login />}
      </Route>
      <Route path="/subscription/success">
        {user ? <SubscriptionSuccess /> : <Login />}
      </Route>
      <Route path="/account">
        {user ? <Account /> : <Login />}
      </Route>
      <Route path="/billing">
        {user ? <Billing /> : <Login />}
      </Route>
      <Route path="/marketplace">
        {user ? <Marketplace /> : <Login />}
      </Route>
      <Route path="/admin">
        {user ? <RealAdminDashboard /> : <Login />}
      </Route>
      <Route path="/admin/dashboard">
        <AdminDashboard />
      </Route>
      <Route path="/admin/users">
        {user ? <AdminUsersFixed /> : <Login />}
      </Route>
      <Route path="/admin/quick-tools">
        {user ? <QuickAdminTools /> : <Login />}
      </Route>
      <Route path="/vida-rig-test">
        {user ? <VidaRigTest /> : <Login />}
      </Route>
      <Route path="/avatar-completion-test">
        <AvatarCompletionTest />
      </Route>
      <Route path="/mouth-tracking-test" component={MouthTrackingTest} />
      <Route path="/mouth-tracking-enhanced" component={MouthTrackingEnhanced} />
      <Route path="/mouth-tracking-visual-debug" component={MouthTrackingVisualDebug} />
      <Route path="/mouth-tracking-working" component={MouthTrackingWorking} />
      <Route path="/comprehensive-tracking" component={ComprehensiveTracking} />
      <Route path="/real-tracking" component={RealMediaPipeTracking} />
      <Route path="/working-tracking" component={WorkingMediaPipeTracking} />
      <Route path="/authentic-tracking" component={AuthenticMediaPipeTracking} />
      <Route path="/mediapipe-working" component={WorkingRealMediaPipe} />
      <Route path="/mediapipe-fixed" component={FixedMediaPipeTracking} />
      <Route path="/camera-debug" component={CameraDebug} />
      <Route path="/simple-camera-test" component={SimpleCameraTest} />
      <Route path="/camera-debug-fixed" component={CameraDebugFixed} />
      <Route component={NotFound} />
    </Switch>
    
    {/* Global Auto-Rigging Progress Overlay */}
    <AutoRiggingProgress
      isVisible={showProgress}
      onComplete={completeAutoRigging}
      avatarName={avatarName}
      userPlan={userPlan}
    />
    </AutoRiggingContext.Provider>
  );
}

function App() {
  return (
    <ThemeProvider defaultTheme="dark">
      <QueryClientProvider client={queryClient}>
        <Toaster />
        <TooltipProvider>
          <AuthProvider>
            <AppContent />
          </AuthProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

// Separate component to avoid circular dependency issues
function AppContent() {
  const auth = useAuth();
  
  return (
    <SubscriptionProvider>
      <AvatarProvider>
        <Router />
      </AvatarProvider>
    </SubscriptionProvider>
  );
}

export default App;
