import { Link, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { 
  Sidebar, 
  SidebarContent, 
  SidebarFooter, 
  SidebarGroup, 
  SidebarGroupContent, 
  SidebarGroupLabel,
  SidebarHeader, 
  SidebarMenu, 
  SidebarMenuButton, 
  SidebarMenuItem, 
  SidebarProvider, 
  SidebarTrigger 
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, Building2, Users, LogOut, Wrench, Briefcase, FolderOpen, Camera, Loader2, UserCog, ImageIcon, DollarSign, Receipt, ArrowLeft, FileBarChart, MessageSquare } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import logoImage from "@assets/Logo_1769488051360.png";
import { useEffect, useRef } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { AdminUser } from "@shared/schema";

interface AdminLayoutProps {
  children: React.ReactNode;
}

const adminNavItems = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/entities", label: "Entities", icon: Briefcase },
  { href: "/admin/properties", label: "Properties", icon: Building2 },
  { href: "/admin/tenants", label: "Tenants", icon: Users },
  { href: "/admin/documents", label: "Leases & Files", icon: FolderOpen },
  { href: "/admin/property-images", label: "Property Images", icon: ImageIcon },
  { href: "/admin/expenses", label: "Expenses", icon: DollarSign },
  { href: "/admin/rent-charges", label: "Income", icon: Receipt },
  { href: "/admin/reports", label: "Reports", icon: FileBarChart },
  { href: "/admin/messaging", label: "Messaging", icon: MessageSquare },
  { href: "/admin/maintenance", label: "Maintenance", icon: Wrench },
  { href: "/admin/staff", label: "Users", icon: UserCog },
];

interface AdminAuthResponse {
  user: AdminUser;
  mustChangePassword: boolean;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: authData, isLoading, error } = useQuery<AdminAuthResponse>({
    queryKey: ["/api/admin/auth/me"],
    retry: false,
  });

  const adminUser = authData?.user;
  const isAuthenticated = !!adminUser;

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/admin/auth/logout", {});
    },
    onSuccess: () => {
      localStorage.removeItem("adminToken");
      queryClient.clear();
      window.location.href = "/admin";
    },
    onError: () => {
      localStorage.removeItem("adminToken");
      queryClient.clear();
      window.location.href = "/admin";
    },
  });

  const uploadImageMutation = useMutation({
    mutationFn: async (imageData: string) => {
      const res = await apiRequest("POST", "/api/admin/auth/update-image", { image: imageData });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/auth/me"] });
      toast({ title: "Profile photo updated" });
    },
    onError: () => {
      toast({ title: "Failed to upload photo", variant: "destructive" });
    },
  });

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({ title: "Please select an image file", variant: "destructive" });
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast({ title: "Image must be less than 2MB", variant: "destructive" });
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const imageData = event.target?.result as string;
      uploadImageMutation.mutate(imageData);
    };
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    if (!isLoading && !isAuthenticated && error) {
      setLocation("/admin");
    }
  }, [isLoading, isAuthenticated, error, setLocation]);

  useEffect(() => {
    if (authData?.mustChangePassword && location !== "/admin/change-password") {
      setLocation("/admin/change-password");
    }
  }, [authData?.mustChangePassword, location, setLocation]);

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
    const first = adminUser?.firstName?.[0] || "A";
    const last = adminUser?.lastName?.[0] || "";
    return `${first}${last}`.toUpperCase();
  };

  const getDisplayName = () => {
    if (adminUser?.firstName && adminUser?.lastName) {
      return `${adminUser.firstName} ${adminUser.lastName}`;
    }
    return adminUser?.email || "Admin";
  };

  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "4rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <Sidebar>
          <SidebarHeader className="p-4 border-b border-sidebar-border">
            <div className="flex flex-col items-center gap-3 py-2">
              <div className="relative group">
                <div className="w-20 h-20 rounded-full bg-muted border-2 border-primary/20 flex items-center justify-center overflow-hidden">
                  {adminUser?.profileImage ? (
                    <img 
                      src={adminUser.profileImage} 
                      alt="Admin" 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-primary/10 flex items-center justify-center text-2xl font-semibold text-primary">
                      {getInitials()}
                    </div>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                  data-testid="input-admin-photo"
                />
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadImageMutation.isPending}
                  className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50"
                  data-testid="button-upload-admin-photo"
                  title="Upload photo"
                >
                  {uploadImageMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Camera className="h-4 w-4" />
                  )}
                </button>
              </div>
              <div className="text-center">
                <p className="font-semibold text-lg">{getDisplayName()}</p>
                <Badge variant="secondary" className="text-xs mt-1">Administrator</Badge>
              </div>
            </div>
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel className="text-sm">Management</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {adminNavItems.map((item) => (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton 
                        asChild
                        isActive={location === item.href || (item.href !== "/admin/dashboard" && location.startsWith(item.href))}
                        className="py-3"
                      >
                        <Link href={item.href} data-testid={`link-${item.label.toLowerCase().replace(/\s+/g, '-')}`}>
                          <item.icon className="h-5 w-5" />
                          <span className="text-base">{item.label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
          <SidebarFooter className="border-t border-sidebar-border">
            <div className="flex items-center gap-2 p-2">
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarImage src={adminUser?.profileImage || undefined} />
                <AvatarFallback>{getInitials()}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
                <p className="text-sm font-medium truncate" data-testid="text-admin-name">{getDisplayName()}</p>
                <p className="text-xs text-muted-foreground truncate" data-testid="text-admin-email">{adminUser?.email}</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => logoutMutation.mutate()}
                disabled={logoutMutation.isPending}
                className="shrink-0 group-data-[collapsible=icon]:hidden"
                data-testid="button-logout"
              >
                {logoutMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <LogOut className="h-4 w-4" />
                )}
              </Button>
            </div>
          </SidebarFooter>
        </Sidebar>
        <div className="flex flex-col flex-1 overflow-hidden">
          <header className="flex items-center justify-between gap-2 p-2 border-b">
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
            <img 
              src={logoImage} 
              alt="ATID Reality" 
              className="h-8 w-auto object-contain"
            />
            <ThemeToggle />
          </header>
          <main className="flex-1 overflow-auto p-6 bg-background">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
