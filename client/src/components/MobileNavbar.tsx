import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";

export function MobileNavbar() {
  const [location] = useLocation();
  const { user, isAdmin, isSuperAdmin } = useAuth();
  
  const isActive = (path: string) => location === path;

  return (
    <>
      {/* Mobile Header */}
      <header className="md:hidden bg-background/90 backdrop-blur-md pt-4 pb-2 px-4 flex items-center justify-between">
        <Link href="/" className="text-2xl font-bold text-white font-display no-underline">
          VIDA<sup>3</sup>
        </Link>
        <div className="flex items-center space-x-2">
          {user ? (
            <>
              <div className="p-2 bg-red-500 text-white text-xs rounded">
                ADMIN TEST
              </div>
              <div className="p-2 rounded-xl bg-surface/80 inline-flex">
                <i className="ri-user-3-fill text-white text-xl"></i>
              </div>
            </>
          ) : (
            <Link href="/login" className="p-2 rounded-xl bg-surface/80 inline-flex no-underline">
              <i className="ri-user-3-line text-white text-xl"></i>
            </Link>
          )}
          <button className="p-2 rounded-xl bg-primary">
            <i className="ri-edit-line text-white text-xl"></i>
          </button>
        </div>
      </header>

      {/* Mobile Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-background/95 via-primary/5 to-background/70 backdrop-blur-xl border-t border-primary/20 p-1 z-50 md:hidden shadow-2xl shadow-primary/10">
        <div className="flex justify-around items-center">
          <Link href="/" className={`flex flex-col items-center p-2 no-underline ${isActive("/") ? "text-primary" : "text-white/70"}`}>
              <i className="ri-home-5-fill text-xl"></i>
              <span className="text-xs mt-1">Home</span>
          </Link>
          {user && (
            <Link href="/dashboard" className={`flex flex-col items-center p-2 no-underline ${isActive("/dashboard") ? "text-primary" : "text-white/70"}`}>
                <i className="ri-dashboard-fill text-xl"></i>
                <span className="text-xs mt-1">Dashboard</span>
            </Link>
          )}
          <Link href="/stream" className={`flex flex-col items-center p-2 no-underline ${isActive("/stream") ? "text-primary" : "text-white/70"}`}>
              <i className="ri-vidicon-fill text-xl"></i>
              <span className="text-xs mt-1">Stream</span>
          </Link>
          <Link href="/avatars" className={`flex flex-col items-center p-2 no-underline ${isActive("/avatars") ? "text-primary" : "text-white/70"}`}>
              <i className="ri-user-3-fill text-xl"></i>
              <span className="text-xs mt-1">Avatars</span>
          </Link>
          <Link href="/marketplace" className={`flex flex-col items-center p-2 no-underline ${isActive("/marketplace") ? "text-primary" : "text-white/70"}`}>
              <i className="ri-shopping-bag-3-fill text-xl"></i>
              <span className="text-xs mt-1">Shop</span>
          </Link>
        </div>
      </nav>
    </>
  );
}

export default MobileNavbar;
