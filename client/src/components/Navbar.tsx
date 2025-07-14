import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { LayoutDashboard, LogOut } from "lucide-react";

export function Navbar() {
  const [location] = useLocation();
  const { user, logout, isAdmin, isSuperAdmin } = useAuth();

  const isActive = (path: string) => location === path;

  return (
    <header className="fixed top-0 left-0 right-0 bg-gradient-to-b from-background/99 via-primary/2 to-background/98 backdrop-blur-xl z-50 border-b border-primary/15 shadow-md shadow-primary/5">
      <div className="container mx-auto px-6 py-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            <Link href="/">
              <span className="text-2xl font-bold text-white font-display cursor-pointer">
                VIDA<sup>3</sup>
              </span>
            </Link>
          </div>

          <div className="hidden md:flex items-center space-x-8">
            <Link href="/">
              <span className={`font-medium hover:text-primary transition cursor-pointer ${isActive("/") ? "text-white" : "text-white/70"}`}>
                Home
              </span>
            </Link>
            {user && (
              <Link href="/dashboard">
                <span className={`font-medium hover:text-primary transition cursor-pointer ${isActive("/dashboard") ? "text-white" : "text-white/70"}`}>
                  Dashboard
                </span>
              </Link>
            )}
            <Link href="/stream">
              <span className={`font-medium hover:text-primary transition cursor-pointer ${isActive("/stream") ? "text-white" : "text-white/70"}`}>
                Stream
              </span>
            </Link>
            <Link href="/avatars">
              <span className={`font-medium hover:text-primary transition cursor-pointer ${isActive("/avatars") ? "text-white" : "text-white/70"}`}>
                Avatars
              </span>
            </Link>
            <Link href="/pricing">
              <span className={`font-medium hover:text-primary transition cursor-pointer ${isActive("/pricing") ? "text-white" : "text-white/70"}`}>
                Pricing
              </span>
            </Link>
            <span role="button" className="text-white/70 font-medium hover:text-primary transition cursor-pointer">
              Support
            </span>
          </div>

          <div className="flex items-center space-x-4">
            {user ? (
              <>
                {(isAdmin || isSuperAdmin) && (
                  <Link href="/admin/dashboard">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-white hover:text-white hover:bg-primary/30 bg-primary/20 border border-primary/40 shadow-sm"
                    >
                      <LayoutDashboard className="h-4 w-4 md:mr-2" />
                      <span className="hidden md:inline">Admin</span>
                    </Button>
                  </Link>
                )}
                
                <div className="relative group">
                  <Button variant="ghost" size="sm" className="rounded-full overflow-hidden p-0 h-10 w-10 border border-blue-500/30">
                    {user.avatarUrl ? (
                      <img src={user.avatarUrl} alt={user.username} className="h-full w-full object-cover" />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center bg-primary/20 text-primary">
                        {user.username?.substring(0, 1).toUpperCase() || "U"}
                      </div>
                    )}
                  </Button>
                  
                  <div className="absolute right-0 mt-2 w-48 rounded-lg shadow-lg bg-background border border-blue-500/30 overflow-hidden transform scale-0 group-hover:scale-100 transition-transform origin-top-right">
                    <div className="p-3 border-b border-blue-500/20">
                      <p className="text-sm font-medium text-white">{user.username}</p>
                      <p className="text-xs text-white/70">{user.email}</p>
                    </div>
                    
                    <div className="p-2">
                      <Link href="/avatars">
                        <span className="block px-4 py-2 text-sm rounded-md hover:bg-blue-500/20 text-white/90 hover:text-white cursor-pointer">
                          My Avatars
                        </span>
                      </Link>
                      <Link href="/avatar-studio">
                        <span className="block px-4 py-2 text-sm rounded-md hover:bg-blue-500/20 text-white/90 hover:text-white cursor-pointer">
                          Avatar Studio
                        </span>
                      </Link>
                      <Link href="/account">
                        <span className="block px-4 py-2 text-sm rounded-md hover:bg-blue-500/20 text-white/90 hover:text-white cursor-pointer">
                          Account Settings
                        </span>
                      </Link>
                      <span 
                        role="button" 
                        onClick={() => logout()}
                        className="block px-4 py-2 text-sm rounded-md hover:bg-red-500/20 text-red-400 hover:text-red-300 cursor-pointer"
                      >
                        Sign Out
                      </span>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <>
                <Link href="/login">
                  <Button variant="outline" size="sm" className="mr-2">Login</Button>
                </Link>
                <Link href="/register">
                  <Button className="shadow-neon-purple hidden md:flex">Sign Up</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

export default Navbar;
