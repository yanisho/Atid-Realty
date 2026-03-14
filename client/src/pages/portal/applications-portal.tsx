import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText, Download, Eye, Calendar, DollarSign, Building2, Home, Clock } from "lucide-react";
import { formatDate as fmtDateUtil } from "@/lib/date-utils";

export default function PortalApplications() {
  const { data, isLoading } = useQuery<any>({
    queryKey: ["/api/portal/lease"],
  });

  const lease = data?.lease;
  const leaseFile = data?.leaseFile;
  const leaseDocument = data?.leaseDocument;

  const handleDownload = () => {
    if (leaseFile?.id) {
      window.open(`/api/portal/lease/file/${leaseFile.id}/download`, "_blank");
    }
  };

  const handleView = () => {
    if (leaseFile?.id) {
      window.open(`/api/portal/lease/file/${leaseFile.id}/download`, "_blank");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge data-testid="badge-lease-status" className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">Active</Badge>;
      case "expired":
        return <Badge data-testid="badge-lease-status" variant="secondary">Expired</Badge>;
      case "terminated":
        return <Badge data-testid="badge-lease-status" variant="destructive">Terminated</Badge>;
      default:
        return <Badge data-testid="badge-lease-status" variant="outline">{status}</Badge>;
    }
  };

  const getLeaseTypeBadge = (type: string) => {
    switch (type) {
      case "annual":
        return <Badge variant="outline">Annual</Badge>;
      case "month_to_month":
      case "m2m":
        return <Badge variant="outline">Month-to-Month</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  const formatDate = (dateStr: string | null | undefined) => {
    return fmtDateUtil(dateStr);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold" data-testid="text-page-title">Your Lease</h1>
        <p className="text-muted-foreground">View your lease details and documents</p>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      ) : !lease ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              <FileText className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium" data-testid="text-no-lease">No active lease found</p>
              <p className="text-sm">Contact your property manager if you believe this is an error.</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <CardTitle data-testid="text-lease-title">Lease Details</CardTitle>
                  <CardDescription>Your current lease agreement information</CardDescription>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {getStatusBadge(lease.status || "active")}
                  {lease.leaseType && getLeaseTypeBadge(lease.leaseType)}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  {lease.property && (
                    <div className="flex items-start gap-3">
                      <Building2 className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-sm text-muted-foreground">Property</p>
                        <p className="font-medium" data-testid="text-lease-property">{lease.property.name}</p>
                        {lease.property.address && (
                          <p className="text-sm text-muted-foreground">{lease.property.address}</p>
                        )}
                      </div>
                    </div>
                  )}
                  {lease.unit && (
                    <div className="flex items-start gap-3">
                      <Home className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-sm text-muted-foreground">Unit</p>
                        <p className="font-medium" data-testid="text-lease-unit">{lease.unit.unitNumber}</p>
                      </div>
                    </div>
                  )}
                  <div className="flex items-start gap-3">
                    <DollarSign className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Monthly Rent</p>
                      <p className="font-medium text-lg" data-testid="text-lease-rent">
                        ${parseFloat(lease.rentAmount || "0").toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Lease Start</p>
                      <p className="font-medium" data-testid="text-lease-start">{formatDate(lease.startDate)}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Lease End</p>
                      <p className="font-medium" data-testid="text-lease-end">{formatDate(lease.endDate)}</p>
                    </div>
                  </div>
                  {lease.depositAmount && (
                    <div className="flex items-start gap-3">
                      <DollarSign className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-sm text-muted-foreground">Security Deposit</p>
                        <p className="font-medium" data-testid="text-lease-deposit">
                          ${parseFloat(lease.depositAmount).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <CardTitle data-testid="text-document-title">Lease Document</CardTitle>
                  <CardDescription>Download a copy of your lease agreement</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {leaseFile ? (
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border rounded-md gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium" data-testid="text-file-name">{leaseFile.filename}</p>
                      <p className="text-sm text-muted-foreground">
                        {leaseFile.size ? `${(leaseFile.size / 1024).toFixed(1)} KB` : "Lease Agreement"}
                        {leaseFile.createdAt && ` · Uploaded ${formatDate(leaseFile.createdAt)}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" onClick={handleView} data-testid="button-view-lease">
                      <Eye className="h-4 w-4 mr-2" />
                      View Your Lease
                    </Button>
                    <Button onClick={handleDownload} data-testid="button-download-lease">
                      <Download className="h-4 w-4 mr-2" />
                      Download Your Lease
                    </Button>
                  </div>
                </div>
              ) : leaseDocument ? (
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border rounded-md gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium" data-testid="text-document-name">Lease Agreement</p>
                      <p className="text-sm text-muted-foreground">
                        Digital lease document
                        {leaseDocument.leaseDate && ` · Dated ${leaseDocument.leaseDate}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {leaseDocument.tenantSignature && (
                      <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">Signed</Badge>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p className="font-medium" data-testid="text-no-document">No lease document available</p>
                  <p className="text-sm">Your property manager has not yet uploaded a lease document.</p>
                </div>
              )}
            </CardContent>
          </Card>

          {(leaseDocument?.paymentInfo || lease.lateFeeRate) && (
            <Card>
              <CardHeader>
                <CardTitle>Important Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {lease.lateFeeRate && (
                  <div className="flex items-start gap-3">
                    <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Late Fee Policy</p>
                      <p className="font-medium">
                        {(parseFloat(lease.lateFeeRate) * 100).toFixed(0)}% late fee after {lease.lateFeeGraceDays || 5} day grace period
                      </p>
                    </div>
                  </div>
                )}
                {leaseDocument?.paymentInfo && (
                  <div className="flex items-start gap-3">
                    <DollarSign className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Payment Instructions</p>
                      <p className="font-medium whitespace-pre-wrap">{leaseDocument.paymentInfo}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
