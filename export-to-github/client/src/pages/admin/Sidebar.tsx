import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";

interface SidebarItemProps {
  href: string;
  icon: string;
  title: string;
  activePath?: string;
}

const SidebarItem = ({ href, icon, title, activePath }: SidebarItemProps) => {
  const [location] = useLocation();
  const isActive = activePath ? location.startsWith(activePath) : location === href;

  return (
    <Link href={href}>
      <a
        className={cn(
          "flex items-center gap-3 rounded-lg px-3 py-2 transition-all hover:bg-surface",
          isActive ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground"
        )}
      >
        <i className={`${icon} text-lg`}></i>
        <span>{title}</span>
      </a>
    </Link>
  );
};

export function Sidebar() {
  return (
    <div className="bg-sidebar border border-sidebar-border rounded-xl overflow-hidden h-[calc(100vh-10rem)]">
      <div className="p-4 border-b border-sidebar-border">
        <h2 className="text-lg font-semibold text-sidebar-foreground">Admin Panel</h2>
      </div>
      <div className="p-4 space-y-6">
        <div className="space-y-1">
          <SidebarItem href="/admin/dashboard" icon="ri-dashboard-line" title="Dashboard" activePath="/admin/dashboard" />
          <SidebarItem href="/admin/users" icon="ri-user-3-line" title="Users" activePath="/admin/users" />
          <SidebarItem href="/admin/avatars" icon="ri-ghost-line" title="Avatars" activePath="/admin/avatars" />
          <SidebarItem href="/admin/subscriptions" icon="ri-vip-crown-line" title="Subscriptions" activePath="/admin/subscriptions" />
        </div>
        
        <div>
          <h3 className="mb-2 px-3 text-xs font-medium text-sidebar-foreground/60 uppercase">System</h3>
          <div className="space-y-1">
            <SidebarItem href="/admin/settings" icon="ri-settings-3-line" title="Settings" activePath="/admin/settings" />
            <SidebarItem href="/admin/logs" icon="ri-file-list-3-line" title="Logs" activePath="/admin/logs" />
            <SidebarItem href="/admin/analytics" icon="ri-bar-chart-box-line" title="Analytics" activePath="/admin/analytics" />
          </div>
        </div>

        <div>
          <h3 className="mb-2 px-3 text-xs font-medium text-sidebar-foreground/60 uppercase">Resources</h3>
          <div className="space-y-1">
            <SidebarItem href="/admin/gpu" icon="ri-cpu-line" title="GPU Resources" activePath="/admin/gpu" />
            <SidebarItem href="/admin/streams" icon="ri-live-line" title="Active Streams" activePath="/admin/streams" />
          </div>
        </div>
      </div>
    </div>
  );
}
