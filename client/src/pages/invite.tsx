import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Building2, CheckCircle, XCircle, Loader2, AlertCircle } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";

interface InviteData {
  valid: boolean;
  tenantName: string;
  tenantEmail: string;
  propertyAddress: string | null;
}

export default function InvitePage() {
  const { token } = useParams<{ token: string }>();
  const [, navigate] = useLocation();
  const { user, isLoading: authLoading } = useAuth();

  const { data: inviteData, isLoading, error } = useQuery<InviteData>({
    queryKey: ["/api/invite", token],
    enabled: !!token,
  });

  const acceptMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", `/api/invite/${token}/accept`);
    },
    onSuccess: () => {
      setTimeout(() => {
        navigate("/portal");
      }, 2000);
    },
  });

  if (isLoading || authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <Skeleton className="h-12 w-12 rounded-full mx-auto mb-4" />
            <Skeleton className="h-6 w-48 mx-auto mb-2" />
            <Skeleton className="h-4 w-64 mx-auto" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !inviteData?.valid) {
    const rawMessage = (error as any)?.message || "";
    let errorTitle = "Invalid Invitation";
    let errorMessage = "This invitation link is invalid or has expired. Please contact your property manager to send a new invite.";
    
    if (rawMessage.includes("Invitation expired")) {
      errorTitle = "Invitation Expired";
      errorMessage = "This invitation link has expired. Please contact your property manager to send a new invite.";
    } else if (rawMessage.includes("Invitation already used")) {
      errorTitle = "Invitation Already Used";
      errorMessage = "This invitation has already been accepted. If you need help accessing your account, please contact your property manager.";
    } else if (rawMessage.includes("404")) {
      errorTitle = "Invitation Not Found";
      errorMessage = "This invitation link is no longer valid. Please contact your property manager to send a new invite.";
    }
    
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
              <XCircle className="h-8 w-8 text-destructive" />
            </div>
            <CardTitle data-testid="text-invite-error-title">{errorTitle}</CardTitle>
            <CardDescription data-testid="text-invite-error-message">{errorMessage}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              className="w-full" 
              variant="outline"
              onClick={() => navigate("/")}
              data-testid="button-go-home"
            >
              Go to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (acceptMutation.isSuccess) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <CardTitle>Account Connected</CardTitle>
            <CardDescription>
              Your tenant account has been successfully set up. Redirecting to your portal...
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Building2 className="h-8 w-8 text-primary" />
          </div>
          <CardTitle>Welcome to ATID Property Management</CardTitle>
          <CardDescription>
            You've been invited to join as a tenant
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-muted p-4 rounded-lg space-y-2">
            <p className="text-sm text-muted-foreground">Tenant</p>
            <p className="font-medium" data-testid="text-tenant-name">{inviteData.tenantName}</p>
            
            <p className="text-sm text-muted-foreground mt-3">Email</p>
            <p className="font-medium" data-testid="text-tenant-email">{inviteData.tenantEmail}</p>
            
            {inviteData.propertyAddress && (
              <>
                <p className="text-sm text-muted-foreground mt-3">Property</p>
                <p className="font-medium" data-testid="text-property-address">{inviteData.propertyAddress}</p>
              </>
            )}
          </div>

          {!user ? (
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-amber-800 dark:text-amber-200">Sign in required</p>
                  <p className="text-amber-700 dark:text-amber-300">
                    Please sign in with Replit to activate your tenant account.
                  </p>
                </div>
              </div>
              <Button 
                className="w-full" 
                asChild
                data-testid="button-sign-in"
              >
                <a href="/api/login">Sign In with Replit</a>
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {acceptMutation.error && (
                <div className="flex items-start gap-3 p-3 bg-destructive/10 rounded-lg">
                  <XCircle className="h-5 w-5 text-destructive mt-0.5" />
                  <p className="text-sm text-destructive">
                    {(acceptMutation.error as any)?.message || "Failed to activate account. Please try again."}
                  </p>
                </div>
              )}
              <Button 
                className="w-full" 
                onClick={() => acceptMutation.mutate()}
                disabled={acceptMutation.isPending}
                data-testid="button-accept-invite"
              >
                {acceptMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Activating...
                  </>
                ) : (
                  "Activate My Tenant Account"
                )}
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                Signed in as {user.email || user.firstName || "User"}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
