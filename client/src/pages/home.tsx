import { Link, useLocation } from "wouter";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { PublicLayout } from "@/components/layout/public-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { FileText, Search, Building2, Shield, Clock, ArrowRight, CheckCircle, LogIn, Download, Loader2, DollarSign } from "lucide-react";
import logoImage from "@assets/Logo_1769488051360.png";

interface AssociationApplication {
  name: string;
  filename: string;
  downloadUrl: string;
}

export default function Home() {
  const [propertyId, setPropertyId] = useState("");
  const [searchError, setSearchError] = useState("");
  const [, setLocation] = useLocation();
  const [showApplications, setShowApplications] = useState(false);

  const { data: applications, isLoading: applicationsLoading } = useQuery<AssociationApplication[]>({
    queryKey: ["/api/public/association-applications"],
    enabled: showApplications,
  });

  const handlePropertySearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!propertyId.trim()) {
      setSearchError("Please enter a Property ID");
      return;
    }
    setSearchError("");
    setLocation(`/property/${propertyId.trim()}`);
  };

  const ctaCards = [
    {
      href: "/api/login",
      icon: LogIn,
      title: "Access Tenant Portal",
      description: "Access your tenant portal to pay rent and request maintenance.",
      color: "text-primary",
      bgColor: "bg-primary/10",
      isExternal: true,
      onClick: undefined as (() => void) | undefined,
    },
    {
      href: "/pay",
      icon: DollarSign,
      title: "Quick Pay",
      description: "Pay your rent or deposit online quickly and securely.",
      color: "text-emerald-600 dark:text-emerald-400",
      bgColor: "bg-emerald-500/10",
      isExternal: false,
      onClick: undefined as (() => void) | undefined,
    },
    {
      href: "#",
      icon: Download,
      title: "Association Applications",
      description: "Download association application forms for our managed properties.",
      color: "text-accent",
      bgColor: "bg-accent/10",
      isExternal: false,
      onClick: () => setShowApplications(true),
    },
  ];

  const features = [
    {
      icon: Shield,
      title: "Secure Payments",
      description: "Bank-level encryption protects all your transactions and personal information.",
    },
    {
      icon: Clock,
      title: "24/7 Access",
      description: "Submit requests, pay rent, and access your account anytime, anywhere.",
    },
    {
      icon: Building2,
      title: "Professional Management",
      description: "Experienced team dedicated to maintaining quality living environments.",
    },
  ];

  return (
    <PublicLayout>
      <section className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-background to-accent/5">
        <div className="absolute inset-0 bg-grid-pattern opacity-5" />
        <div className="container mx-auto px-4 py-16 md:py-24">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <div className="space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 rounded-full text-sm font-medium text-primary">
                  <CheckCircle className="h-4 w-4" />
                  Trusted Property Management
                </div>
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight">
                  Property Management
                  <span className="block text-primary">Made Simple</span>
                </h1>
                <p className="text-lg text-muted-foreground max-w-lg">
                  Welcome to ATID Reality. Access your tenant portal, pay rent online, submit maintenance requests, and apply for properties — all in one place.
                </p>
              </div>

              <form onSubmit={handlePropertySearch} className="flex flex-col sm:flex-row gap-3 max-w-md">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Enter Property ID"
                    value={propertyId}
                    onChange={(e) => { setPropertyId(e.target.value); setSearchError(""); }}
                    className="pl-10"
                    data-testid="input-property-search"
                  />
                </div>
                <Button type="submit" data-testid="button-property-search">
                  Search
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </form>
              {searchError && (
                <p className="text-sm text-destructive -mt-4">{searchError}</p>
              )}

              <div className="flex items-center gap-4 pt-4">
                <div className="flex -space-x-2">
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className="w-10 h-10 rounded-full bg-muted border-2 border-background flex items-center justify-center text-xs font-medium"
                    >
                      {String.fromCharCode(64 + i)}
                    </div>
                  ))}
                </div>
                <div className="text-sm">
                  <p className="font-semibold">250+ Happy Tenants</p>
                  <p className="text-muted-foreground">Across 90+ Properties</p>
                </div>
              </div>
            </div>

            <div className="relative lg:h-[500px] hidden lg:flex items-center justify-center">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-accent/20 rounded-3xl" />
              <div className="relative bg-sidebar p-8 rounded-2xl shadow-2xl">
                <img 
                  src={logoImage} 
                  alt="ATID Reality" 
                  className="w-64 h-auto"
                />
                <div className="mt-6 grid grid-cols-2 gap-4">
                  <div className="bg-sidebar-accent/50 p-4 rounded-lg">
                    <p className="text-3xl font-bold text-sidebar-foreground">90+</p>
                    <p className="text-sm text-sidebar-foreground/70">Properties</p>
                  </div>
                  <div className="bg-sidebar-accent/50 p-4 rounded-lg">
                    <p className="text-3xl font-bold text-sidebar-foreground">250+</p>
                    <p className="text-sm text-sidebar-foreground/70">Tenants</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      <section className="py-16 md:py-24 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">What Would You Like To Do?</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Quick access to the most common tenant services
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {ctaCards.map((card) => {
              if (card.onClick) {
                return (
                  <div key={card.title} onClick={card.onClick} className="cursor-pointer">
                    <Card className="h-full hover-elevate active-elevate-2 transition-all duration-200 group" data-testid={`card-${card.title.toLowerCase().replace(/\s+/g, '-')}`}>
                      <CardHeader>
                        <div className={`w-14 h-14 rounded-xl ${card.bgColor} flex items-center justify-center mb-2 group-hover:scale-105 transition-transform`}>
                          <card.icon className={`h-7 w-7 ${card.color}`} />
                        </div>
                        <CardTitle className="flex items-center gap-2">
                          {card.title}
                          <ArrowRight className="h-4 w-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                        </CardTitle>
                        <CardDescription>{card.description}</CardDescription>
                      </CardHeader>
                    </Card>
                  </div>
                );
              }
              if (card.isExternal) {
                return (
                  <a key={card.href} href={card.href}>
                    <Card className="h-full hover-elevate active-elevate-2 cursor-pointer transition-all duration-200 group">
                      <CardHeader>
                        <div className={`w-14 h-14 rounded-xl ${card.bgColor} flex items-center justify-center mb-2 group-hover:scale-105 transition-transform`}>
                          <card.icon className={`h-7 w-7 ${card.color}`} />
                        </div>
                        <CardTitle className="flex items-center gap-2">
                          {card.title}
                          <ArrowRight className="h-4 w-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                        </CardTitle>
                        <CardDescription>{card.description}</CardDescription>
                      </CardHeader>
                    </Card>
                  </a>
                );
              }
              return (
                <Link key={card.href} href={card.href}>
                  <Card className="h-full hover-elevate active-elevate-2 cursor-pointer transition-all duration-200 group">
                    <CardHeader>
                      <div className={`w-14 h-14 rounded-xl ${card.bgColor} flex items-center justify-center mb-2 group-hover:scale-105 transition-transform`}>
                        <card.icon className={`h-7 w-7 ${card.color}`} />
                      </div>
                      <CardTitle className="flex items-center gap-2">
                        {card.title}
                        <ArrowRight className="h-4 w-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                      </CardTitle>
                      <CardDescription>{card.description}</CardDescription>
                    </CardHeader>
                  </Card>
                </Link>
              );
            })}
          </div>
        </div>
      </section>
      <section className="py-16 md:py-24 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Why Choose ATID Reality?</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              We're committed to providing exceptional property management services
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {features.map((feature, index) => (
              <div key={index} className="text-center space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
                  <feature.icon className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="py-16 md:py-24 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to Get Started?</h2>
          <p className="text-primary-foreground/80 max-w-2xl mx-auto mb-8">
            Whether you're a current tenant or looking for your next home, we're here to help.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center flex-wrap">
            <Link href="/pay">
              <Button size="lg" variant="secondary" data-testid="cta-quick-pay">
                <DollarSign className="mr-2 h-5 w-5" />
                Quick Pay
              </Button>
            </Link>
            <Button size="lg" variant="secondary" onClick={() => setShowApplications(true)} data-testid="cta-association-apps">
              <Download className="mr-2 h-5 w-5" />
              Association Applications
            </Button>
            <a href="/api/login">
              <Button size="lg" variant="outline" className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10" data-testid="cta-portal">
                Access Tenant Portal
              </Button>
            </a>
            <Link href="/admin">
              <Button size="lg" variant="outline" className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10" data-testid="cta-admin">
                Admin Portal
              </Button>
            </Link>
          </div>
        </div>
      </section>

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
                        <p className="font-medium text-sm truncate" data-testid={`text-app-name-${app.filename}`}>{app.name}</p>
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
    </PublicLayout>
  );
}
