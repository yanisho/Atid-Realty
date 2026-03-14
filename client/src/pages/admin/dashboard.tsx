import { useQuery } from "@tanstack/react-query";
import { formatDate, formatMonthYear } from "@/lib/date-utils";
import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Building2, Users, Wrench, DollarSign, FileText, AlertTriangle, Clock, CheckCircle, ArrowRight, FolderOpen, ScrollText, Receipt, Home } from "lucide-react";
import type { RentCharge, Property } from "@shared/schema";

export default function AdminDashboard() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["/api/admin/dashboard"],
  });

  const { data: recentMaintenance, isLoading: maintenanceLoading } = useQuery({
    queryKey: ["/api/admin/maintenance/recent"],
  });

  const { data: recentApplications, isLoading: applicationsLoading } = useQuery({
    queryKey: ["/api/admin/applications/recent"],
  });

  const currentMonth = new Date().toISOString().slice(0, 7);
  const { data: rentCharges = [], isLoading: chargesLoading } = useQuery<RentCharge[]>({
    queryKey: [`/api/admin/rent-charges?chargeMonth=${currentMonth}`],
  });

  const { data: properties = [], isLoading: propertiesLoading } = useQuery<Property[]>({
    queryKey: ["/api/admin/properties"],
  });

  const totalDueAmount = rentCharges.reduce((sum: number, c: RentCharge) => sum + parseFloat(c.totalDue || "0"), 0);
  const totalDueCount = rentCharges.length;
  const collectedCharges = rentCharges.filter((c: RentCharge) => c.status === "paid" || c.status === "partial");
  const collectedCount = collectedCharges.length;
  const collectedAmount = collectedCharges.reduce((sum: number, c: RentCharge) => sum + parseFloat(c.amountPaid || "0"), 0);
  const pastDueCharges = rentCharges.filter((c: RentCharge) => {
    if (c.status === "paid") return false;
    const paid = parseFloat(c.amountPaid || "0");
    const due = parseFloat(c.totalDue || "0");
    if (c.status !== "paid" && paid >= due && due > 0) return false;
    const baseRent = parseFloat(c.baseRent || "0");
    return baseRent > 0 && paid < baseRent;
  });
  const pastDueCount = pastDueCharges.length;
  const pastDueAmount = pastDueCharges.reduce((sum: number, c: RentCharge) => {
    const baseRent = parseFloat(c.baseRent || "0");
    const paid = parseFloat(c.amountPaid || "0");
    return sum + Math.max(0, baseRent - paid);
  }, 0);

  const totalManaged = properties.length;
  const rentedCount = properties.filter((p: Property) => p.status === "rented").length;
  const vacantCount = properties.filter((p: Property) => p.status !== "rented").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground">Overview of your property management system</p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link href="/admin/properties">
          <Card className="hover-elevate cursor-pointer h-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
              <CardTitle className="text-sm font-medium">Properties</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <>
                  <div className="text-2xl font-bold" data-testid="stat-properties">
                    {stats?.totalProperties || 0}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {rentedCount} rented · {vacantCount} vacant
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/tenants">
          <Card className="hover-elevate cursor-pointer h-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
              <CardTitle className="text-sm font-medium">Tenants</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <>
                  <div className="text-2xl font-bold" data-testid="stat-tenants">
                    {stats?.totalTenants || 0}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {stats?.activeTenants || 0} active
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/maintenance">
          <Card className="hover-elevate cursor-pointer h-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
              <CardTitle className="text-sm font-medium">Open Requests</CardTitle>
              <Wrench className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <>
                  <div className="text-2xl font-bold" data-testid="stat-maintenance">
                    {stats?.openMaintenance || 0}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Open requests
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/documents">
          <Card className="hover-elevate cursor-pointer h-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
              <CardTitle className="text-sm font-medium">Rent Collected</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <>
                  <div className="text-2xl font-bold">
                    ${stats?.rentCollectedThisMonth?.toLocaleString() || "0"}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    This month
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        </Link>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <div>
              <CardTitle>Income</CardTitle>
              <CardDescription>Payment status for {formatMonthYear(new Date())}</CardDescription>
            </div>
            <Link href="/admin/rent-charges">
              <Button variant="ghost" size="sm">
                View All
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {chargesLoading ? (
              <div className="grid grid-cols-3 gap-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-24 w-full" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-3">
                <Link href="/admin/rent-charges">
                  <div className="flex flex-col items-center justify-center p-4 border rounded-md hover-elevate cursor-pointer" data-testid="box-total-due">
                    <DollarSign className="h-6 w-6 text-blue-600 dark:text-blue-400 mb-2" />
                    <span className="text-2xl font-bold">{totalDueCount}</span>
                    <span className="text-xs text-muted-foreground">Total Due</span>
                    <span className="text-sm font-semibold text-blue-600 dark:text-blue-400 mt-1">${totalDueAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                </Link>
                <Link href="/admin/rent-charges?status=paid">
                  <div className="flex flex-col items-center justify-center p-4 border rounded-md hover-elevate cursor-pointer" data-testid="box-collected">
                    <CheckCircle className="h-6 w-6 text-emerald-600 dark:text-emerald-400 mb-2" />
                    <span className="text-2xl font-bold">{collectedCount}</span>
                    <span className="text-xs text-muted-foreground">Total Collected</span>
                    <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 mt-1">${collectedAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                </Link>
                <Link href="/admin/rent-charges?status=late">
                  <div className="flex flex-col items-center justify-center p-4 border rounded-md hover-elevate cursor-pointer" data-testid="box-past-due">
                    <AlertTriangle className="h-6 w-6 text-destructive mb-2" />
                    <span className="text-2xl font-bold">{pastDueCount}</span>
                    <span className="text-xs text-muted-foreground">Past Due</span>
                    <span className="text-sm font-semibold text-destructive mt-1">${pastDueAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <div>
              <CardTitle>Manage Properties</CardTitle>
              <CardDescription>Property occupancy overview</CardDescription>
            </div>
            <Link href="/admin/properties">
              <Button variant="ghost" size="sm">
                View All
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {propertiesLoading ? (
              <div className="grid grid-cols-3 gap-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-24 w-full" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-3">
                <Link href="/admin/properties">
                  <div className="flex flex-col items-center justify-center p-4 border rounded-md hover-elevate cursor-pointer" data-testid="box-managed">
                    <Building2 className="h-6 w-6 text-primary mb-2" />
                    <span className="text-2xl font-bold">{totalManaged}</span>
                    <span className="text-xs text-muted-foreground">Managed</span>
                  </div>
                </Link>
                <Link href="/admin/properties?status=rented">
                  <div className="flex flex-col items-center justify-center p-4 border rounded-md hover-elevate cursor-pointer" data-testid="box-rented">
                    <Home className="h-6 w-6 text-emerald-600 dark:text-emerald-400 mb-2" />
                    <span className="text-2xl font-bold">{rentedCount}</span>
                    <span className="text-xs text-muted-foreground">Rented</span>
                  </div>
                </Link>
                <Link href="/admin/properties?status=vacant">
                  <div className="flex flex-col items-center justify-center p-4 border rounded-md hover-elevate cursor-pointer" data-testid="box-vacant">
                    <AlertTriangle className="h-6 w-6 text-amber-600 dark:text-amber-400 mb-2" />
                    <span className="text-2xl font-bold">{vacantCount}</span>
                    <span className="text-xs text-muted-foreground">Vacant</span>
                  </div>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link href="/admin/tenants">
          <Card className="hover-elevate cursor-pointer h-full">
            <CardContent className="p-6 flex flex-col items-center text-center">
              <Users className="h-10 w-10 text-primary mb-3" />
              <h3 className="font-medium">Manage Tenants</h3>
              <p className="text-sm text-muted-foreground">View tenant information</p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/admin/maintenance">
          <Card className="hover-elevate cursor-pointer h-full">
            <CardContent className="p-6 flex flex-col items-center text-center">
              <Wrench className="h-10 w-10 text-primary mb-3" />
              <h3 className="font-medium">Maintenance</h3>
              <p className="text-sm text-muted-foreground">Handle repair requests</p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/admin/leases">
          <Card className="hover-elevate cursor-pointer h-full" data-testid="card-leases-quick">
            <CardContent className="p-6 flex flex-col items-center text-center">
              <ScrollText className="h-10 w-10 text-primary mb-3" />
              <h3 className="font-medium">Leases</h3>
              <p className="text-sm text-muted-foreground">Manage lease agreements</p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/admin/files">
          <Card className="hover-elevate cursor-pointer h-full" data-testid="card-files-quick">
            <CardContent className="p-6 flex flex-col items-center text-center">
              <FolderOpen className="h-10 w-10 text-primary mb-3" />
              <h3 className="font-medium">Files</h3>
              <p className="text-sm text-muted-foreground">Documents & uploads</p>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
