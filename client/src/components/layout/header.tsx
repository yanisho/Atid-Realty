import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Menu, Phone, Mail, FileText, LogIn, User, LogOut, Download, Loader2, Settings } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import logoImage from "@assets/Logo_1769488051360.png";
import { useState } from "react";

interface AssociationApplication {
  name: string;
  filename: string;
  downloadUrl: string;
}

export function Header() {
  const { user, isAuthenticated, logout } = useAuth();
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showApplications, setShowApplications] = useState(false);

  const { data: applications, isLoading: applicationsLoading } = useQuery<AssociationApplication[]>({
    queryKey: ["/api/public/association-applications"],
    enabled: showApplications,
  });

  const closeMobile = () => setMobileOpen(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-3">
            <div className="relative h-16 w-auto">
              <img 
                src={logoImage} 
                alt="ATID Reality" 
                className="h-16 w-auto object-contain invert dark:invert-0"
              />
            </div>
          </Link>

          <div className="hidden lg:flex items-center gap-2 text-sm text-muted-foreground">
            <a href="tel:+15551234567" className="flex items-center gap-1.5 hover:text-foreground transition-colors" data-testid="link-phone">
              <Phone className="h-3.5 w-3.5" />
              <span>(954) 338-3885</span>
            </a>
            <span className="text-border">|</span>
            <a href="mailto:info@atidreality.com" className="flex items-center gap-1.5 hover:text-foreground transition-colors" data-testid="link-email">
              <Mail className="h-3.5 w-3.5" />
              <span>info@atidreality.com</span>
            </a>
          </div>

          <nav className="hidden md:flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setShowApplications(true)}
              data-testid="nav-association-applications"
            >
              <Download className="h-4 w-4 mr-1.5" />
              Association Applications
            </Button>
            
            {isAuthenticated ? (
              <div className="flex items-center gap-2 ml-2">
                <Link href="/portal">
                  <Button variant="outline" size="sm" data-testid="nav-portal">
                    <User className="h-4 w-4 mr-1.5" />
                    Portal
                  </Button>
                </Link>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => logout()}
                  data-testid="button-logout"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <a href="/api/login">
                <Button size="sm" data-testid="nav-login">
                  <LogIn className="h-4 w-4 mr-1.5" />
                  Tenant Login
                </Button>
              </a>
            )}
            <Link href="/admin">
              <Button variant="ghost" size="sm" data-testid="nav-admin">
                <Settings className="h-4 w-4 mr-1.5" />
                Admin
              </Button>
            </Link>
          </nav>

          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="ghost" size="icon" data-testid="button-mobile-menu">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-80">
              <div className="flex flex-col gap-4 mt-8">
                <div className="flex flex-col gap-1 pb-4 border-b">
                  <a href="tel:+15551234567" className="flex items-center gap-2 p-2 text-sm text-muted-foreground hover:text-foreground" onClick={closeMobile}>
                    <Phone className="h-4 w-4" />
                    (555) 123-4567
                  </a>
                  <a href="mailto:info@atidreality.com" className="flex items-center gap-2 p-2 text-sm text-muted-foreground hover:text-foreground" onClick={closeMobile}>
                    <Mail className="h-4 w-4" />
                    info@atidreality.com
                  </a>
                </div>
                
                <nav className="flex flex-col gap-1">
                  <Button 
                    variant="ghost" 
                    className="w-full justify-start"
                    onClick={() => { setShowApplications(true); closeMobile(); }}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Association Applications
                  </Button>
                </nav>

                <div className="pt-4 border-t">
                  {isAuthenticated ? (
                    <div className="flex flex-col gap-2">
                      <Link href="/portal" onClick={closeMobile}>
                        <Button variant="outline" className="w-full justify-start">
                          <User className="h-4 w-4 mr-2" />
                          My Portal
                        </Button>
                      </Link>
                      <Button 
                        variant="ghost" 
                        className="w-full justify-start text-muted-foreground"
                        onClick={() => { logout(); closeMobile(); }}
                      >
                        <LogOut className="h-4 w-4 mr-2" />
                        Logout
                      </Button>
                    </div>
                  ) : (
                    <a href="/api/login" onClick={closeMobile}>
                      <Button className="w-full">
                        <LogIn className="h-4 w-4 mr-2" />
                        Tenant Login
                      </Button>
                    </a>
                  )}
                  <Link href="/admin" onClick={closeMobile}>
                    <Button variant="outline" className="w-full">
                      <Settings className="h-4 w-4 mr-2" />
                      Admin Portal
                    </Button>
                  </Link>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      <Dialog open={showApplications} onOpenChange={setShowApplications}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Download className="h-5 w-5 text-primary" />
              Association Applications
            </DialogTitle>
            <DialogDescription>
              Download association application forms for our managed properties.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {applicationsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : applications && applications.length > 0 ? (
              applications.map((app) => (
                <a
                  key={app.filename}
                  href={app.downloadUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block"
                  data-testid={`link-download-${app.filename}`}
                >
                  <Card className="hover-elevate active-elevate-2 cursor-pointer transition-all duration-200">
                    <CardContent className="flex items-center gap-3 p-4">
                      <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center flex-shrink-0">
                        <FileText className="h-5 w-5 text-red-600 dark:text-red-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{app.name}</p>
                        <p className="text-xs text-muted-foreground">PDF Document</p>
                      </div>
                      <Download className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    </CardContent>
                  </Card>
                </a>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-10 w-10 mx-auto mb-2 opacity-50" />
                <p>No association applications available at this time.</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </header>
  );
}
