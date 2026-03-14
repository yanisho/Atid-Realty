import { useQuery } from "@tanstack/react-query";
import { formatDate } from "@/lib/date-utils";
import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { CreditCard, Wrench, FileText, Building2, Calendar, DollarSign, AlertCircle, CheckCircle, Clock } from "lucide-react";

export default function PortalDashboard() {
  const { user } = useAuth();

  const { data: tenantInfo, isLoading: tenantLoading } = useQuery({
    queryKey: ["/api/portal/tenant"],
  });

  const { data: recentPayments, isLoading: paymentsLoading } = useQuery({
    queryKey: ["/api/portal/payments/recent"],
  });

  const { data: maintenanceRequests, isLoading: maintenanceLoading } = useQuery({
    queryKey: ["/api/portal/maintenance/recent"],
  });

  const getInitials = () => {
    if (user?.firstName && user?.lastName) {
      return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
    }
    return user?.email?.[0]?.toUpperCase() || "U";
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src={user?.profileImageUrl || undefined} />
            <AvatarFallback className="text-lg bg-primary text-primary-foreground">
              {getInitials()}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-welcome">
              Welcome back, {user?.firstName || "Tenant"}!
            </h1>
            <p className="text-muted-foreground">{user?.email}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href="/portal/payments">
            <Button data-testid="button-pay-rent">
              <CreditCard className="h-4 w-4 mr-2" />
              Pay Rent
            </Button>
          </Link>
          <Link href="/portal/maintenance">
            <Button variant="outline" data-testid="button-maintenance">
              <Wrench className="h-4 w-4 mr-2" />
              Maintenance
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
            <CardTitle className="text-sm font-medium">Current Balance</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {tenantLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <>
                <div className="text-2xl font-bold" data-testid="text-balance">
                  ${tenantInfo?.balance?.toFixed(2) || "0.00"}
                </div>
                <p className="text-xs text-muted-foreground">
                  Due by the 1st of each month
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
            <CardTitle className="text-sm font-medium">Next Due Date</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {tenantLoading ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {tenantInfo?.nextDueDate || "N/A"}
                </div>
                <p className="text-xs text-muted-foreground">
                  Monthly rent: ${tenantInfo?.rentAmount || "0.00"}
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
            <CardTitle className="text-sm font-medium">Open Requests</CardTitle>
            <Wrench className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {maintenanceLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {maintenanceRequests?.openCount || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  Active maintenance tickets
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {tenantInfo?.property && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Your Property
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <p className="font-medium text-lg">{tenantInfo.property.name}</p>
                <p className="text-muted-foreground">
                  {tenantInfo.property.address}, {tenantInfo.property.city}, {tenantInfo.property.state}
                </p>
                {tenantInfo.unit && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Unit: {tenantInfo.unit.unitLabel}
                  </p>
                )}
              </div>
              <Badge variant="outline" className="w-fit">
                ID: {tenantInfo.property.propertyCode}
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Recent Payments</CardTitle>
              <Link href="/portal/payments">
                <Button variant="ghost" size="sm">View All</Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {paymentsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : recentPayments?.length > 0 ? (
              <div className="space-y-3">
                {recentPayments.slice(0, 3).map((payment: any) => (
                  <div 
                    key={payment.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        payment.status === "completed" 
                          ? "bg-emerald-100 dark:bg-emerald-900/30" 
                          : "bg-amber-100 dark:bg-amber-900/30"
                      }`}>
                        {payment.status === "completed" ? (
                          <CheckCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                        ) : (
                          <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium">${parseFloat(payment.amount).toFixed(2)}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(payment.createdAt)}
                        </p>
                      </div>
                    </div>
                    <Badge variant={payment.status === "completed" ? "default" : "secondary"}>
                      {payment.status}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <CreditCard className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No recent payments</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Maintenance Requests</CardTitle>
              <Link href="/portal/maintenance">
                <Button variant="ghost" size="sm">View All</Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {maintenanceLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : maintenanceRequests?.requests?.length > 0 ? (
              <div className="space-y-3">
                {maintenanceRequests.requests.slice(0, 3).map((request: any) => (
                  <div 
                    key={request.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        request.status === "completed" 
                          ? "bg-emerald-100 dark:bg-emerald-900/30"
                          : request.status === "in_progress"
                          ? "bg-blue-100 dark:bg-blue-900/30"
                          : "bg-amber-100 dark:bg-amber-900/30"
                      }`}>
                        <Wrench className={`h-5 w-5 ${
                          request.status === "completed" 
                            ? "text-emerald-600 dark:text-emerald-400"
                            : request.status === "in_progress"
                            ? "text-blue-600 dark:text-blue-400"
                            : "text-amber-600 dark:text-amber-400"
                        }`} />
                      </div>
                      <div>
                        <p className="font-medium line-clamp-1">{request.category || "Maintenance"}</p>
                        <p className="text-xs text-muted-foreground">
                          #{request.ticketNumber}
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline">{request.status}</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Wrench className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No maintenance requests</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
