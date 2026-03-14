import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Sidebar, 
  SidebarContent, 
  SidebarFooter, 
  SidebarGroup, 
  SidebarGroupContent, 
  SidebarHeader, 
  SidebarMenu, 
  SidebarMenuButton, 
  SidebarMenuItem, 
  SidebarProvider, 
  SidebarTrigger 
} from "@/components/ui/sidebar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Home, CreditCard, Wrench, FileText, LogOut, Settings, ChevronUp, Building2, ArrowLeft } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import logoImage from "@assets/Logo_1769488051360.png";
import { useEffect } from "react";

interface PortalLayoutProps {
  children: React.ReactNode;
}

const portalNavItems = [
  { href: "/portal", label: "Dashboard", icon: Home },
  { href: "/portal/payments", label: "Payments", icon: CreditCard },
  { href: "/portal/maintenance", label: "Maintenance", icon: Wrench },
  { href: "/portal/lease", label: "Your Lease", icon: FileText },
  { href: "/portal/settings", label: "Account Settings", icon: Settings },
];

export function PortalLayout({ children }: PortalLayoutProps) {
  const { user, isLoading, isAuthenticated, logout } = useAuth();
  const [location] = useLocation();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      window.location.href = "/api/login";
    }
  }, [isLoading, isAuthenticated]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const getInitials = () => {
    if (user?.firstName && user?.lastName) {
      return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
    }
    return user?.email?.[0]?.toUpperCase() || "U";
  };

  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3.5rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <Sidebar>
          <SidebarHeader className="p-4 border-b border-sidebar-border">
            <Link href="/" className="flex items-center gap-2">
              <img src={logoImage} alt="ATID Reality" className="h-8 w-auto" />
            </Link>
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu>
                  {portalNavItems.map((item) => (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton 
                        asChild
                        isActive={location === item.href}
                      >
                        <Link href={item.href}>
                          <item.icon className="h-4 w-4" />
                          <span>{item.label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
          <SidebarFooter className="p-2 border-t border-sidebar-border">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="w-full justify-start gap-2 px-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user?.profileImageUrl || undefined} />
                    <AvatarFallback className="text-xs bg-sidebar-primary text-sidebar-primary-foreground">
                      {getInitials()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-medium truncate">
                      {user?.firstName || "Tenant"}
                    </p>
                    <p className="text-xs text-sidebar-foreground/60 truncate">
                      {user?.email}
                    </p>
                  </div>
                  <ChevronUp className="h-4 w-4 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem asChild>
                  <Link href="/" className="flex items-center cursor-pointer">
                    <Building2 className="h-4 w-4 mr-2" />
                    Back to Website
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={() => logout()}
                  className="text-destructive cursor-pointer"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarFooter>
        </Sidebar>
        
        <div className="flex flex-col flex-1 overflow-hidden">
          <header className="flex items-center justify-between px-4 h-14 border-b bg-background/95 backdrop-blur">
            <div className="flex items-center gap-1">
              <SidebarTrigger data-testid="button-sidebar-toggle" />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => window.history.back()}
                data-testid="button-back"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
            </div>
          </header>
          <main className="flex-1 overflow-auto p-6">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
