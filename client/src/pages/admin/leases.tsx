import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { isoToDisplay, displayToIso, formatDate, snapToFirstOfMonth, snapToLastOfMonth } from "@/lib/date-utils";
import { differenceInDays } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { FileText, CheckCircle, AlertTriangle, XCircle, Search, ArrowUpDown, ArrowUp, ArrowDown, Send, Loader2, RefreshCw } from "lucide-react";
import { Link, useSearch } from "wouter";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Lease, Property, Tenant } from "@shared/schema";

interface LeaseWithDetails extends Lease {
  property?: Property;
  tenant?: Tenant;
}

type LeaseStatus = "active" | "expiring" | "expired";

function formatLocalDate(dateStr: string): string {
  const parts = dateStr.split("T")[0].split("-");
  return `${parts[1].padStart(2, "0")}.${parts[2].padStart(2, "0")}.${parts[0]}`;
}

function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split("T")[0].split("-").map(Number);
  return new Date(y, m - 1, d);
}

function getLeaseStatus(lease: Lease): LeaseStatus {
  const now = new Date();
  const endDate = parseLocalDate(lease.endDate);
  const startDate = parseLocalDate(lease.startDate);
  const daysUntilExpiry = differenceInDays(endDate, now);

  if (now > endDate) return "expired";
  if (now < startDate) return "active";
  if (daysUntilExpiry <= 30) return "expiring";
  return "active";
}

export default function AdminLeases() {
  const { toast } = useToast();
  const searchString = useSearch();
  const urlParams = new URLSearchParams(searchString);
  const initialFilter = urlParams.get("filter") as LeaseStatus | "all" | null;
  const [statusFilter, setStatusFilter] = useState<LeaseStatus | "all">(initialFilter || "all");
  const [searchQuery, setSearchQuery] = useState("");
  const [endDateFilter, setEndDateFilter] = useState("");
  const [endDateSort, setEndDateSort] = useState<"asc" | "desc" | null>(null);
  const [termSort, setTermSort] = useState<"asc" | "desc" | null>(null);
  const [showSendDialog, setShowSendDialog] = useState(false);
  const [sendLeaseTarget, setSendLeaseTarget] = useState<LeaseWithDetails | null>(null);
  const [sendEmail, setSendEmail] = useState("");
  const [showRenewDialog, setShowRenewDialog] = useState(false);
  const [renewTarget, setRenewTarget] = useState<LeaseWithDetails | null>(null);
  const [renewStartDate, setRenewStartDate] = useState("");
  const [renewEndDate, setRenewEndDate] = useState("");
  const [renewRent, setRenewRent] = useState("");
  const [renewLeaseType, setRenewLeaseType] = useState<string>("annual");

  const { data: leases, isLoading } = useQuery<LeaseWithDetails[]>({
    queryKey: ["/api/admin/leases"],
  });

  const sendLeaseMutation = useMutation({
    mutationFn: async ({ leaseId, email }: { leaseId: string; email: string }) => {
      return await apiRequest("POST", `/api/admin/leases/${leaseId}/send`, { email });
    },
    onSuccess: () => {
      setShowSendDialog(false);
      setSendLeaseTarget(null);
      setSendEmail("");
      toast({ title: "Lease sent successfully", description: "Lease details have been emailed." });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to send lease", description: error.message, variant: "destructive" });
    },
  });

  const openSendDialog = (lease: LeaseWithDetails) => {
    setSendLeaseTarget(lease);
    setSendEmail(lease.tenant?.email || "");
    setShowSendDialog(true);
  };

  const renewLeaseMutation = useMutation({
    mutationFn: async (data: { tenantId: string; propertyId: string; unitId?: string | null; startDate: string; endDate: string; rentAmount: string; leaseType: string; depositAmount?: string | null; lateFeeRate?: string | null; lateFeeGraceDays?: number | null }) => {
      return await apiRequest("POST", "/api/admin/leases", data);
    },
    onSuccess: () => {
      setShowRenewDialog(false);
      setRenewTarget(null);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/leases"] });
      toast({ title: "Lease renewed", description: "A new lease has been created successfully." });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to renew lease", description: error.message, variant: "destructive" });
    },
  });

  const openRenewDialog = (lease: LeaseWithDetails) => {
    setRenewTarget(lease);
    const oldEnd = parseLocalDate(lease.endDate);
    const newStart = new Date(oldEnd);
    newStart.setDate(newStart.getDate() + 1);
    const newEnd = new Date(newStart);
    if (lease.leaseType === "m2m") {
      newEnd.setMonth(newEnd.getMonth() + 1);
    } else {
      newEnd.setFullYear(newEnd.getFullYear() + 1);
    }
    const pad = (n: number) => n.toString().padStart(2, "0");
    setRenewStartDate(`${newStart.getFullYear()}-${pad(newStart.getMonth() + 1)}-${pad(newStart.getDate())}`);
    setRenewEndDate(`${newEnd.getFullYear()}-${pad(newEnd.getMonth() + 1)}-${pad(newEnd.getDate())}`);
    setRenewRent(String(lease.rentAmount || "0"));
    setRenewLeaseType(lease.leaseType || "annual");
    setShowRenewDialog(true);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const allLeases = leases || [];

  const filteredLeases = allLeases.filter((lease) => {
    if (statusFilter !== "all") {
      const status = getLeaseStatus(lease);
      if (status !== statusFilter) return false;
    }
    if (endDateFilter) {
      const filterParts = endDateFilter.split("-");
      const leaseParts = lease.endDate.split("T")[0].split("-");
      if (filterParts[0] !== leaseParts[0] || filterParts[1] !== leaseParts[1] || filterParts[2] !== leaseParts[2]) {
        return false;
      }
    }
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    const propertyName = lease.property?.name?.toLowerCase() || "";
    const propertyAddress = lease.property?.address?.toLowerCase() || "";
    const propertyCity = lease.property?.city?.toLowerCase() || "";
    const tenantName = lease.tenant ? `${lease.tenant.firstName} ${lease.tenant.lastName}`.toLowerCase() : "";
    const unitId = lease.unitId?.toLowerCase() || "";
    const leaseType = lease.leaseType === "m2m" ? "month-to-month m2m" : "annual";
    const status = getLeaseStatus(lease);
    return (
      propertyName.includes(query) ||
      propertyAddress.includes(query) ||
      propertyCity.includes(query) ||
      tenantName.includes(query) ||
      unitId.includes(query) ||
      leaseType.includes(query) ||
      status.includes(query)
    );
  });

  let sortedLeases = filteredLeases;
  if (endDateSort) {
    sortedLeases = [...sortedLeases].sort((a, b) => {
      const dateA = parseLocalDate(a.endDate).getTime();
      const dateB = parseLocalDate(b.endDate).getTime();
      return endDateSort === "asc" ? dateA - dateB : dateB - dateA;
    });
  }
  if (termSort) {
    sortedLeases = [...sortedLeases].sort((a, b) => {
      const typeA = a.leaseType || "annual";
      const typeB = b.leaseType || "annual";
      return termSort === "asc" ? typeA.localeCompare(typeB) : typeB.localeCompare(typeA);
    });
  }

  const toggleEndDateSort = () => {
    setEndDateSort((prev) => {
      if (prev === null) return "asc";
      if (prev === "asc") return "desc";
      return null;
    });
  };

  const toggleTermSort = () => {
    setTermSort((prev) => {
      if (prev === null) return "asc";
      if (prev === "asc") return "desc";
      return null;
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold" data-testid="text-page-title">Leases</h1>
        <p className="text-muted-foreground">Manage all lease agreements across properties</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <CardTitle>
              {statusFilter === "expiring" ? "Expiring Soon" : statusFilter === "expired" ? "Expired Leases" : statusFilter === "active" ? "Active Leases" : "All Leases"}
            </CardTitle>
            <div className="flex flex-col md:flex-row gap-2">
              <div className="flex gap-1">
                {(["all", "active", "expiring", "expired"] as const).map((filter) => (
                  <Button
                    key={filter}
                    variant={statusFilter === filter ? "default" : "outline"}
                    size="sm"
                    onClick={() => setStatusFilter(filter)}
                    data-testid={`button-filter-${filter}`}
                  >
                    {filter === "all" ? "All" : filter === "expiring" ? "Expiring Soon" : filter === "expired" ? "Expired" : "Active"}
                  </Button>
                ))}
              </div>
              <div className="relative w-full md:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search leases..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                  data-testid="input-search-leases"
                />
              </div>
              <div className="relative w-full md:w-48">
                <Input
                  type="text"
                  placeholder="MM.DD.YYYY"
                  value={isoToDisplay(endDateFilter)}
                  onChange={(e) => setEndDateFilter(displayToIso(e.target.value))}
                  className="w-full"
                  data-testid="input-filter-end-date"
                />
                {endDateFilter && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6"
                    onClick={() => setEndDateFilter("")}
                    data-testid="button-clear-end-date"
                  >
                    <XCircle className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {allLeases.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No leases found</p>
            </div>
          ) : filteredLeases.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No leases match your search</p>
              <Button variant="outline" className="mt-4" onClick={() => { setSearchQuery(""); setEndDateFilter(""); }} data-testid="button-clear-search">
                Clear Search
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px] text-center">Active</TableHead>
                  <TableHead className="w-[100px] text-center">Expiring Soon</TableHead>
                  <TableHead className="w-[100px] text-center">Expired</TableHead>
                  <TableHead>Property Name</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>Tenant Name</TableHead>
                  <TableHead>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-1 -ml-3"
                      onClick={toggleTermSort}
                      data-testid="button-sort-term"
                    >
                      Term
                      {termSort === "asc" ? (
                        <ArrowUp className="h-3.5 w-3.5" />
                      ) : termSort === "desc" ? (
                        <ArrowDown className="h-3.5 w-3.5" />
                      ) : (
                        <ArrowUpDown className="h-3.5 w-3.5 opacity-50" />
                      )}
                    </Button>
                  </TableHead>
                  <TableHead>Start Date</TableHead>
                  <TableHead>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-1 -ml-3"
                      onClick={toggleEndDateSort}
                      data-testid="button-sort-end-date"
                    >
                      End Date
                      {endDateSort === "asc" ? (
                        <ArrowUp className="h-3.5 w-3.5" />
                      ) : endDateSort === "desc" ? (
                        <ArrowDown className="h-3.5 w-3.5" />
                      ) : (
                        <ArrowUpDown className="h-3.5 w-3.5 opacity-50" />
                      )}
                    </Button>
                  </TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedLeases.map((lease) => {
                  const status = getLeaseStatus(lease);
                  const propertyAddress = lease.property 
                    ? `${lease.property.address}, ${lease.property.city}, ${lease.property.state}` 
                    : "";
                  
                  return (
                    <TableRow key={lease.id} data-testid={`lease-row-${lease.id}`}>
                      <TableCell className="text-center">
                        {status === "active" && (
                          <CheckCircle className="h-5 w-5 text-green-500 mx-auto" data-testid={`status-active-${lease.id}`} />
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {status === "expiring" && (
                          <AlertTriangle className="h-5 w-5 text-red-400 mx-auto" data-testid={`status-expiring-${lease.id}`} />
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {status === "expired" && (
                          <XCircle className="h-5 w-5 text-gray-400 mx-auto" data-testid={`status-expired-${lease.id}`} />
                        )}
                      </TableCell>
                      <TableCell className="font-medium" data-testid={`text-property-name-${lease.id}`}>
                        {lease.property?.name || "Unknown Property"}
                      </TableCell>
                      <TableCell className="text-muted-foreground" data-testid={`text-address-${lease.id}`}>
                        {propertyAddress}
                      </TableCell>
                      <TableCell data-testid={`text-tenant-name-${lease.id}`}>
                        {lease.tenant ? `${lease.tenant.firstName} ${lease.tenant.lastName}` : "Unknown Tenant"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {lease.leaseType === "m2m" ? "M2M" : "Annual"}
                        </Badge>
                      </TableCell>
                      <TableCell data-testid={`text-start-date-${lease.id}`}>
                        {formatLocalDate(lease.startDate)}
                      </TableCell>
                      <TableCell data-testid={`text-end-date-${lease.id}`}>
                        {formatLocalDate(lease.endDate)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openRenewDialog(lease)}
                            data-testid={`button-renew-lease-${lease.id}`}
                          >
                            <RefreshCw className="h-3.5 w-3.5 mr-1" />
                            Renew
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openSendDialog(lease)}
                            data-testid={`button-send-lease-${lease.id}`}
                          >
                            <Send className="h-4 w-4" />
                          </Button>
                          <Link href={`/admin/properties/${lease.propertyId}`}>
                            <Button variant="outline" size="sm" data-testid={`button-view-property-${lease.id}`}>
                              View
                            </Button>
                          </Link>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={showSendDialog} onOpenChange={(open) => { setShowSendDialog(open); if (!open) { setSendLeaseTarget(null); setSendEmail(""); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Send Lease</DialogTitle>
            <DialogDescription>
              Email lease details for {sendLeaseTarget?.property?.name || "this property"} to a recipient.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Recipient Email</label>
              <Input
                type="email"
                placeholder="Enter email address"
                value={sendEmail}
                onChange={(e) => setSendEmail(e.target.value)}
                data-testid="input-send-lease-email"
              />
            </div>
            {sendLeaseTarget && (
              <div className="rounded-md border p-3 text-sm space-y-1">
                <p><span className="text-muted-foreground">Property:</span> {sendLeaseTarget.property?.name || "Unknown"}</p>
                <p><span className="text-muted-foreground">Tenant:</span> {sendLeaseTarget.tenant ? `${sendLeaseTarget.tenant.firstName} ${sendLeaseTarget.tenant.lastName}` : "Unknown"}</p>
                <p><span className="text-muted-foreground">Term:</span> {formatLocalDate(sendLeaseTarget.startDate)} - {formatLocalDate(sendLeaseTarget.endDate)}</p>
                <p><span className="text-muted-foreground">Rent:</span> ${sendLeaseTarget.rentAmount?.toLocaleString() || "0"}/mo</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSendDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (sendLeaseTarget && sendEmail) {
                  sendLeaseMutation.mutate({ leaseId: sendLeaseTarget.id, email: sendEmail });
                }
              }}
              disabled={!sendEmail || sendLeaseMutation.isPending}
              data-testid="button-confirm-send-lease"
            >
              {sendLeaseMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Send Lease
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showRenewDialog} onOpenChange={(open) => { setShowRenewDialog(open); if (!open) setRenewTarget(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Renew Lease</DialogTitle>
            <DialogDescription>
              Create a new lease for {renewTarget?.tenant ? `${renewTarget.tenant.firstName} ${renewTarget.tenant.lastName}` : "this tenant"} at {renewTarget?.property?.name || "this property"}.
            </DialogDescription>
          </DialogHeader>
          {renewTarget && (
            <div className="space-y-4">
              <div className="rounded-md border p-3 text-sm space-y-1 text-muted-foreground">
                <p>Current lease: {formatLocalDate(renewTarget.startDate)} - {formatLocalDate(renewTarget.endDate)}</p>
                <p>Current rent: ${Number(renewTarget.rentAmount).toLocaleString()}/mo</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>New Start Date</Label>
                  <Input
                    type="text"
                    placeholder="MM.DD.YYYY"
                    value={isoToDisplay(renewStartDate)}
                    onChange={(e) => setRenewStartDate(snapToFirstOfMonth(displayToIso(e.target.value)))}
                    data-testid="input-renew-start-date"
                  />
                </div>
                <div className="space-y-2">
                  <Label>New End Date</Label>
                  <Input
                    type="text"
                    placeholder="MM.DD.YYYY"
                    value={isoToDisplay(renewEndDate)}
                    onChange={(e) => setRenewEndDate(snapToLastOfMonth(displayToIso(e.target.value)))}
                    data-testid="input-renew-end-date"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Monthly Rent ($)</Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  placeholder="1,500.00"
                  value={renewRent}
                  onChange={(e) => setRenewRent(e.target.value)}
                  onFocus={(e) => e.target.select()}
                  data-testid="input-renew-rent"
                />
              </div>
              <div className="space-y-2">
                <Label>Term Type</Label>
                <Select value={renewLeaseType} onValueChange={setRenewLeaseType}>
                  <SelectTrigger data-testid="select-renew-lease-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="annual">Annual</SelectItem>
                    <SelectItem value="m2m">Month-to-Month</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRenewDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (renewTarget && renewStartDate && renewEndDate && renewRent) {
                  renewLeaseMutation.mutate({
                    tenantId: renewTarget.tenantId,
                    propertyId: renewTarget.propertyId,
                    unitId: renewTarget.unitId,
                    startDate: renewStartDate,
                    endDate: renewEndDate,
                    rentAmount: renewRent.replace(/,/g, ''),
                    leaseType: renewLeaseType,
                    depositAmount: renewTarget.depositAmount ? String(renewTarget.depositAmount) : null,
                    lateFeeRate: renewTarget.lateFeeRate ? String(renewTarget.lateFeeRate) : null,
                    lateFeeGraceDays: renewTarget.lateFeeGraceDays,
                  });
                }
              }}
              disabled={!renewStartDate || !renewEndDate || !renewRent || renewLeaseMutation.isPending}
              data-testid="button-confirm-renew"
            >
              {renewLeaseMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <RefreshCw className="h-4 w-4 mr-2" />
              Renew Lease
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
