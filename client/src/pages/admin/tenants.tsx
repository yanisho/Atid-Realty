import { useState, useEffect } from "react";
import { Link } from "wouter";
import { isoToDisplay, displayToIso, formatDate, snapToFirstOfMonth, snapToLastOfMonth } from "@/lib/date-utils";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users, Search, Mail, Phone, Plus, Loader2, Pencil, Trash2, Calendar, Home, DollarSign, X, MapPin, Send, ArrowUpDown, ArrowUp, ArrowDown, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Tenant, Property, Lease } from "@shared/schema";

const tenantSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional(),
  propertyId: z.string().optional().nullable(),
  rentAmount: z.string().optional().nullable(),
  securityDeposit: z.string().optional().nullable(),
  lastMonthPayment: z.string().optional().nullable(),
  status: z.string().default("inactive"),
  moveInDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
});

type TenantFormData = z.infer<typeof tenantSchema>;

export default function AdminTenants() {
  const { toast } = useToast();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [deletingTenant, setDeletingTenant] = useState<Tenant | null>(null);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<"tenant" | "property" | "startDate" | "endDate" | "status" | "rent" | "lastMonth" | "deposit" | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const toggleSort = (field: "tenant" | "property" | "startDate" | "endDate" | "status" | "rent" | "lastMonth" | "deposit") => {
    if (sortField === field) {
      if (sortDir === "asc") setSortDir("desc");
      else { setSortField(null); setSortDir("asc"); }
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const { data: tenants, isLoading } = useQuery<Tenant[]>({
    queryKey: ["/api/admin/tenants"],
  });

  const { data: properties } = useQuery<Property[]>({
    queryKey: ["/api/admin/properties"],
  });

  interface LeaseWithDetails extends Lease {
    property?: Property;
    tenant?: Tenant;
  }

  const { data: leases } = useQuery<LeaseWithDetails[]>({
    queryKey: ["/api/admin/leases"],
  });

  const { data: leaseDocuments } = useQuery<any[]>({
    queryKey: ["/api/admin/lease-documents"],
  });

  const form = useForm<TenantFormData>({
    resolver: zodResolver(tenantSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      propertyId: null,
      rentAmount: null,
      securityDeposit: null,
      lastMonthPayment: null,
      status: "inactive",
      moveInDate: "",
      endDate: "",
    },
  });

  useEffect(() => {
    if (editingTenant) {
      form.reset({
        firstName: editingTenant.firstName,
        lastName: editingTenant.lastName,
        email: editingTenant.email,
        phone: editingTenant.phone || "",
        propertyId: editingTenant.propertyId || null,
        rentAmount: editingTenant.rentAmount || null,
        securityDeposit: editingTenant.securityDeposit || null,
        lastMonthPayment: editingTenant.lastMonthPayment || null,
        status: editingTenant.status || "inactive",
        moveInDate: editingTenant.moveInDate ? editingTenant.moveInDate.split("T")[0] : "",
        endDate: editingTenant.moveOutDate ? editingTenant.moveOutDate.split("T")[0] : "",
      });
    }
  }, [editingTenant, form]);

  const getPropertyName = (propertyId: string | null | undefined) => {
    if (!propertyId) return null;
    return properties?.find(p => p.id === propertyId)?.name || "Unknown";
  };

  const getPropertyAddress = (propertyId: string | null | undefined) => {
    if (!propertyId) return null;
    const p = properties?.find(p => p.id === propertyId);
    return p?.address || null;
  };

  const getTenantLease = (tenantId: string) => {
    if (!leases) return null;
    return leases.find(l => l.tenantId === tenantId && l.status === "active") 
      || leases.find(l => l.tenantId === tenantId) 
      || null;
  };

  const createMutation = useMutation({
    mutationFn: async (data: TenantFormData) => {
      const { endDate, ...rest } = data;
      const payload = {
        ...rest,
        moveInDate: data.moveInDate || null,
        moveOutDate: endDate || null,
      };
      const res = await apiRequest("POST", "/api/admin/tenants", payload);
      return res.json();
    },
    onSuccess: (tenant) => {
      setShowAddDialog(false);
      form.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/admin/tenants"] });
      toast({
        title: "Tenant Added",
        description: "The tenant has been created. Sending portal invite...",
      });
      if (tenant?.id && tenant?.email) {
        sendInviteMutation.mutate(tenant.id);
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create tenant.",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: TenantFormData }) => {
      const { endDate, ...rest } = data;
      const payload = {
        ...rest,
        moveInDate: data.moveInDate || null,
        moveOutDate: endDate || null,
      };
      return await apiRequest("PATCH", `/api/admin/tenants/${id}`, payload);
    },
    onSuccess: () => {
      setEditingTenant(null);
      form.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/admin/tenants"] });
      toast({
        title: "Tenant Updated",
        description: "The tenant has been updated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update tenant.",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/admin/tenants/${id}`);
    },
    onSuccess: () => {
      setDeletingTenant(null);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/tenants"] });
      toast({
        title: "Tenant Deleted",
        description: "The tenant has been deleted successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete tenant.",
        variant: "destructive",
      });
    },
  });

  const sendInviteMutation = useMutation({
    mutationFn: async (tenantId: string) => {
      const res = await apiRequest("POST", `/api/admin/tenants/${tenantId}/invite`);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/tenants"] });
      toast({
        title: "Invite Sent",
        description: data.message || "Portal invite has been sent to the tenant.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to Send Invite",
        description: error.message || "Could not send the portal invite.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: TenantFormData) => {
    if (editingTenant) {
      updateMutation.mutate({ id: editingTenant.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (tenant: Tenant) => {
    setEditingTenant(tenant);
  };

  const handleDelete = (tenant: Tenant) => {
    setEditingTenant(null);
    setShowAddDialog(false);
    setDeletingTenant(tenant);
  };

  const handleCloseDialog = () => {
    setShowAddDialog(false);
    setEditingTenant(null);
    form.reset({
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      propertyId: null,
      rentAmount: null,
      securityDeposit: null,
      lastMonthPayment: null,
      status: "inactive",
      moveInDate: "",
      endDate: "",
    });
  };

  const filteredTenants = tenants?.filter((tenant) =>
    tenant.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    tenant.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    tenant.email.toLowerCase().includes(searchQuery.toLowerCase())
  ).sort((a, b) => {
    if (sortField === "tenant") {
      const aName = `${a.firstName} ${a.lastName}`.toLowerCase();
      const bName = `${b.firstName} ${b.lastName}`.toLowerCase();
      const cmp = aName.localeCompare(bName);
      return sortDir === "asc" ? cmp : -cmp;
    }
    if (sortField === "property") {
      const aAddr = (a.propertyId ? (properties?.find(p => p.id === a.propertyId)?.address || "") : "");
      const bAddr = (b.propertyId ? (properties?.find(p => p.id === b.propertyId)?.address || "") : "");
      const cmp = aAddr.localeCompare(bAddr);
      return sortDir === "asc" ? cmp : -cmp;
    }
    if (sortField === "startDate") {
      const aDate = a.moveInDate ? new Date(a.moveInDate).getTime() : 0;
      const bDate = b.moveInDate ? new Date(b.moveInDate).getTime() : 0;
      const cmp = aDate - bDate;
      return sortDir === "asc" ? cmp : -cmp;
    }
    if (sortField === "endDate") {
      const aDate = a.moveOutDate ? new Date(a.moveOutDate).getTime() : 0;
      const bDate = b.moveOutDate ? new Date(b.moveOutDate).getTime() : 0;
      const cmp = aDate - bDate;
      return sortDir === "asc" ? cmp : -cmp;
    }
    if (sortField === "rent") {
      const aVal = parseFloat(a.rentAmount || "0") || 0;
      const bVal = parseFloat(b.rentAmount || "0") || 0;
      const cmp = aVal - bVal;
      return sortDir === "asc" ? cmp : -cmp;
    }
    if (sortField === "lastMonth") {
      const aVal = parseFloat(a.lastMonthPayment || "0") || 0;
      const bVal = parseFloat(b.lastMonthPayment || "0") || 0;
      const cmp = aVal - bVal;
      return sortDir === "asc" ? cmp : -cmp;
    }
    if (sortField === "deposit") {
      const aVal = parseFloat(a.securityDeposit || "0") || 0;
      const bVal = parseFloat(b.securityDeposit || "0") || 0;
      const cmp = aVal - bVal;
      return sortDir === "asc" ? cmp : -cmp;
    }
    if (sortField === "status") {
      const order: Record<string, number> = { active: 0, inactive: 1 };
      const aVal = order[a.status] ?? 2;
      const bVal = order[b.status] ?? 2;
      const cmp = aVal - bVal;
      if (cmp !== 0) return sortDir === "asc" ? cmp : -cmp;
    }
    return a.lastName.localeCompare(b.lastName) || a.firstName.localeCompare(b.firstName);
  });

  const isDialogOpen = showAddDialog || editingTenant !== null;
  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Tenants</h1>
          <p className="text-muted-foreground">Manage your tenant directory</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => !open && handleCloseDialog()}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-tenant" onClick={() => setShowAddDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Tenant
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingTenant ? "Edit Tenant" : "Add New Tenant"}</DialogTitle>
              <DialogDescription>
                {editingTenant ? "Update the tenant details below" : "Enter the tenant details below"}
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>First Name *</FormLabel>
                        <FormControl>
                          <Input placeholder="John" {...field} data-testid="input-first-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Last Name *</FormLabel>
                        <FormControl>
                          <Input placeholder="Doe" {...field} data-testid="input-last-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email *</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="john@example.com" {...field} data-testid="input-email" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone</FormLabel>
                      <FormControl>
                        <Input placeholder="(555) 123-4567" {...field} data-testid="input-phone" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="propertyId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Property</FormLabel>
                        <Select 
                          onValueChange={(value) => field.onChange(value === "none" ? null : value)} 
                          value={field.value || "none"}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-property">
                              <SelectValue placeholder="Select property" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="none">No Property</SelectItem>
                            {properties?.map((property) => (
                              <SelectItem key={property.id} value={property.id}>
                                {property.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Status</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-status">
                              <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="active">Verified</SelectItem>
                            <SelectItem value="inactive">Not Verified</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="rentAmount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Monthly Rent</FormLabel>
                        <FormControl>
                          <Input type="text" inputMode="decimal" placeholder="0.00" {...field} value={field.value || ""} onChange={(e) => { const v = e.target.value; if (v === "" || /^\d*\.?\d{0,2}$/.test(v)) field.onChange(v); }} data-testid="input-rent-amount" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="securityDeposit"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Security Deposit</FormLabel>
                        <FormControl>
                          <Input type="text" inputMode="decimal" placeholder="0.00" {...field} value={field.value || ""} onChange={(e) => { const v = e.target.value; if (v === "" || /^\d*\.?\d{0,2}$/.test(v)) field.onChange(v); }} data-testid="input-security-deposit" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="lastMonthPayment"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Last Month</FormLabel>
                        <FormControl>
                          <Input type="text" inputMode="decimal" placeholder="0.00" {...field} value={field.value || ""} onChange={(e) => { const v = e.target.value; if (v === "" || /^\d*\.?\d{0,2}$/.test(v)) field.onChange(v); }} data-testid="input-last-month-payment" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="moveInDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Start Date</FormLabel>
                        <FormControl>
                          <Input type="text" placeholder="MM.DD.YYYY" {...field} value={isoToDisplay(field.value || "")} onChange={(e) => field.onChange(snapToFirstOfMonth(displayToIso(e.target.value)))} data-testid="input-start-date" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="endDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>End Date</FormLabel>
                        <FormControl>
                          <Input type="text" placeholder="MM.DD.YYYY" {...field} value={isoToDisplay(field.value || "")} onChange={(e) => field.onChange(snapToLastOfMonth(displayToIso(e.target.value)))} data-testid="input-end-date" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={isPending}
                  data-testid="button-save-tenant"
                >
                  {isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : editingTenant ? (
                    "Update Tenant"
                  ) : (
                    "Add Tenant"
                  )}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tenants..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            data-testid="input-search"
          />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Tenants</CardTitle>
          <CardDescription>
            {tenants?.length || 0} tenants total
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : filteredTenants && filteredTenants.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>
                      <button
                        className="flex items-center gap-1 hover-elevate rounded px-1 -ml-1"
                        onClick={(e) => { e.stopPropagation(); toggleSort("tenant"); }}
                        data-testid="button-sort-tenant"
                      >
                        Tenant
                        {sortField === "tenant" ? (sortDir === "asc" ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />) : <ArrowUpDown className="h-3.5 w-3.5 opacity-50" />}
                      </button>
                    </TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>
                      <button
                        className="flex items-center gap-1 hover-elevate rounded px-1 -ml-1"
                        onClick={(e) => { e.stopPropagation(); toggleSort("property"); }}
                        data-testid="button-sort-address"
                      >
                        Address
                        {sortField === "property" ? (sortDir === "asc" ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />) : <ArrowUpDown className="h-3.5 w-3.5 opacity-50" />}
                      </button>
                    </TableHead>
                    <TableHead>
                      <button
                        className="flex items-center gap-1 hover-elevate rounded px-1 -ml-1"
                        onClick={(e) => { e.stopPropagation(); toggleSort("startDate"); }}
                        data-testid="button-sort-start-date"
                      >
                        Start Date
                        {sortField === "startDate" ? (sortDir === "asc" ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />) : <ArrowUpDown className="h-3.5 w-3.5 opacity-50" />}
                      </button>
                    </TableHead>
                    <TableHead>
                      <button
                        className="flex items-center gap-1 hover-elevate rounded px-1 -ml-1"
                        onClick={(e) => { e.stopPropagation(); toggleSort("endDate"); }}
                        data-testid="button-sort-end-date"
                      >
                        End Date
                        {sortField === "endDate" ? (sortDir === "asc" ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />) : <ArrowUpDown className="h-3.5 w-3.5 opacity-50" />}
                      </button>
                    </TableHead>
                    <TableHead className="text-right">
                      <button
                        className="flex items-center gap-1 hover-elevate rounded px-1 ml-auto"
                        onClick={(e) => { e.stopPropagation(); toggleSort("rent"); }}
                        data-testid="button-sort-rent"
                      >
                        Rent
                        {sortField === "rent" ? (sortDir === "asc" ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />) : <ArrowUpDown className="h-3.5 w-3.5 opacity-50" />}
                      </button>
                    </TableHead>
                    <TableHead className="text-right">
                      <button
                        className="flex items-center gap-1 hover-elevate rounded px-1 ml-auto"
                        onClick={(e) => { e.stopPropagation(); toggleSort("lastMonth"); }}
                        data-testid="button-sort-last-month"
                      >
                        Last Month
                        {sortField === "lastMonth" ? (sortDir === "asc" ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />) : <ArrowUpDown className="h-3.5 w-3.5 opacity-50" />}
                      </button>
                    </TableHead>
                    <TableHead className="text-right">
                      <button
                        className="flex items-center gap-1 hover-elevate rounded px-1 ml-auto"
                        onClick={(e) => { e.stopPropagation(); toggleSort("deposit"); }}
                        data-testid="button-sort-deposit"
                      >
                        Deposit
                        {sortField === "deposit" ? (sortDir === "asc" ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />) : <ArrowUpDown className="h-3.5 w-3.5 opacity-50" />}
                      </button>
                    </TableHead>
                    <TableHead>
                      <button
                        className="flex items-center gap-1 hover-elevate rounded px-1 -ml-1"
                        onClick={(e) => { e.stopPropagation(); toggleSort("status"); }}
                        data-testid="button-sort-status"
                      >
                        Status
                        {sortField === "status" ? (sortDir === "asc" ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />) : <ArrowUpDown className="h-3.5 w-3.5 opacity-50" />}
                      </button>
                    </TableHead>
                    <TableHead className="w-[120px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTenants.map((tenant) => (
                    <TableRow 
                      key={tenant.id} 
                      className="cursor-pointer"
                      onClick={() => setSelectedTenant(tenant)}
                      data-testid={`row-tenant-${tenant.id}`}
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">
                            {tenant.firstName[0]}{tenant.lastName[0]}
                          </div>
                          <div>
                            <p className="font-medium">{tenant.firstName} {tenant.lastName}</p>
                            <p className="text-xs text-muted-foreground">
                              {tenant.moveInDate ? `Since ${formatDate(tenant.moveInDate)}` : ""}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <p className="text-sm flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {tenant.email}
                          </p>
                          {tenant.phone && (
                            <p className="text-sm flex items-center gap-1 text-muted-foreground">
                              <Phone className="h-3 w-3" />
                              {tenant.phone}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {tenant.propertyId ? (
                          <div>
                            <p className="text-sm">{getPropertyAddress(tenant.propertyId) || "—"}</p>
                            <p className="text-xs text-muted-foreground">{getPropertyName(tenant.propertyId)}</p>
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">Unassigned</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {(() => {
                          const lease = getTenantLease(tenant.id);
                          return lease ? (
                            <span className="text-sm">{formatDate(lease.startDate)}</span>
                          ) : (
                            <span className="text-sm text-muted-foreground">—</span>
                          );
                        })()}
                      </TableCell>
                      <TableCell>
                        {(() => {
                          const lease = getTenantLease(tenant.id);
                          if (lease && lease.endDate) {
                            return <span className="text-sm">{formatDate(lease.endDate)}</span>;
                          }
                          if (lease && !lease.endDate) {
                            return <span className="text-sm text-muted-foreground">M2M</span>;
                          }
                          return <span className="text-sm text-muted-foreground">—</span>;
                        })()}
                      </TableCell>
                      <TableCell className="text-right">
                        {tenant.rentAmount ? (
                          <span className="text-sm font-medium">${parseFloat(tenant.rentAmount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        ) : (
                          <span className="text-sm text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {tenant.lastMonthPayment != null ? (
                          <span className="text-sm font-medium">${parseFloat(tenant.lastMonthPayment).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        ) : (
                          <span className="text-sm text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {tenant.securityDeposit != null ? (
                          <span className="text-sm font-medium">${parseFloat(tenant.securityDeposit).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        ) : (
                          <span className="text-sm text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={tenant.status === "active" ? "default" : "secondary"}>
                          {tenant.status === "active" ? "Verified" : "Not Verified"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {(() => {
                            const lease = getTenantLease(tenant.id);
                            let leaseHref: string;
                            if (lease) {
                              const leaseDoc = leaseDocuments?.find((d: any) => d.leaseId === lease.id);
                              leaseHref = leaseDoc ? `/admin/lease-document/${leaseDoc.id}` : `/admin/lease-document/new?leaseId=${lease.id}`;
                            } else {
                              leaseHref = `/admin/lease-document/new?tenantId=${tenant.id}${tenant.propertyId ? `&propertyId=${tenant.propertyId}` : ""}`;
                            }
                            return (
                              <Link href={leaseHref} onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  title={lease ? "View Lease" : "Create Lease"}
                                  data-testid={`button-view-lease-${tenant.id}`}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </Link>
                            );
                          })()}
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={(e) => { e.stopPropagation(); handleEdit(tenant); }}
                            data-testid={`button-edit-tenant-${tenant.id}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={(e) => { e.stopPropagation(); handleDelete(tenant); }}
                            data-testid={`button-delete-tenant-${tenant.id}`}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No tenants found</p>
              <p className="text-sm">Add your first tenant to get started.</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={selectedTenant !== null} onOpenChange={(open) => !open && setSelectedTenant(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Tenant Details</DialogTitle>
            <DialogDescription>Full information for this tenant</DialogDescription>
          </DialogHeader>
          {selectedTenant && (() => {
            const tenantLeases = leases?.filter(l => l.tenantId === selectedTenant.id) || [];
            const property = properties?.find(p => p.id === selectedTenant.propertyId);
            return (
              <div className="space-y-5">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xl">
                    {selectedTenant.firstName[0]}{selectedTenant.lastName[0]}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold" data-testid="text-tenant-detail-name">
                      {selectedTenant.firstName} {selectedTenant.lastName}
                    </h3>
                    <Badge variant={selectedTenant.status === "active" ? "default" : "secondary"} data-testid="text-tenant-detail-status">
                      {selectedTenant.status === "active" ? "Verified" : "Not Verified"}
                    </Badge>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-muted-foreground">Contact Information</h4>
                  <div className="grid gap-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span data-testid="text-tenant-detail-email">{selectedTenant.email}</span>
                    </div>
                    {selectedTenant.phone && (
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span data-testid="text-tenant-detail-phone">{selectedTenant.phone}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-muted-foreground">Property & Lease</h4>
                  <div className="grid gap-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Home className="h-4 w-4 text-muted-foreground" />
                      <span data-testid="text-tenant-detail-property">
                        {property ? property.name : "Unassigned"}
                      </span>
                    </div>
                    {property && (
                      <div className="flex items-center gap-2 text-sm">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span data-testid="text-tenant-detail-address">
                          {property.address}, {property.city}, {property.state} {property.zip}
                        </span>
                      </div>
                    )}
                    {selectedTenant.rentAmount && (
                      <div className="flex items-center gap-2 text-sm">
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                        <span data-testid="text-tenant-detail-rent">
                          Rent: ${parseFloat(selectedTenant.rentAmount).toLocaleString("en-US", { minimumFractionDigits: 2 })}/mo
                        </span>
                      </div>
                    )}
                    {selectedTenant.lastMonthPayment != null && (
                      <div className="flex items-center gap-2 text-sm">
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                        <span data-testid="text-tenant-detail-last-month">
                          Last Month: ${parseFloat(selectedTenant.lastMonthPayment).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    )}
                    {selectedTenant.securityDeposit != null && (
                      <div className="flex items-center gap-2 text-sm">
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                        <span data-testid="text-tenant-detail-deposit">
                          Security Deposit: ${parseFloat(selectedTenant.securityDeposit).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-muted-foreground">Dates</h4>
                  <div className="grid gap-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>Move-in: {selectedTenant.moveInDate ? formatDate(selectedTenant.moveInDate) : "N/A"}</span>
                    </div>
                    {selectedTenant.moveOutDate && (
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span>Move-out: {formatDate(selectedTenant.moveOutDate)}</span>
                      </div>
                    )}
                  </div>
                </div>

                {tenantLeases.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium text-muted-foreground">Leases ({tenantLeases.length})</h4>
                    <div className="space-y-2">
                      {tenantLeases.map((lease) => {
                        const leaseDoc = leaseDocuments?.find((d: any) => d.leaseId === lease.id);
                        return (
                          <div key={lease.id} className="flex items-center justify-between p-3 border rounded-md text-sm gap-2">
                            <div>
                              <p className="font-medium">
                                {lease.leaseType === "m2m" ? "Month-to-Month" : "Annual"}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {formatDate(lease.startDate)} - {formatDate(lease.endDate)}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="text-right">
                                <p className="font-medium">${parseFloat(lease.rentAmount || "0").toLocaleString("en-US", { minimumFractionDigits: 2 })}/mo</p>
                                <Badge variant="outline" className="text-xs">{lease.status}</Badge>
                              </div>
                              <Link href={leaseDoc ? `/admin/lease-document/${leaseDoc.id}` : `/admin/lease-document/new?leaseId=${lease.id}`}>
                                <Button variant="outline" size="sm" data-testid={`button-view-lease-detail-${lease.id}`}>
                                  <Eye className="h-3 w-3 mr-1" />
                                  View
                                </Button>
                              </Link>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-2 flex-wrap">
                  {!selectedTenant.userId && (
                    <Button
                      onClick={() => sendInviteMutation.mutate(selectedTenant.id)}
                      disabled={sendInviteMutation.isPending}
                      data-testid="button-send-invite-detail"
                    >
                      {sendInviteMutation.isPending ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4 mr-2" />
                      )}
                      Send Portal Invite
                    </Button>
                  )}
                  {selectedTenant.userId && (
                    <Badge variant="default">Portal Access Active</Badge>
                  )}
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSelectedTenant(null);
                      handleEdit(selectedTenant);
                    }}
                    data-testid="button-edit-from-detail"
                  >
                    <Pencil className="h-4 w-4 mr-2" />
                    Edit Tenant
                  </Button>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      <AlertDialog open={deletingTenant !== null} onOpenChange={(open) => !open && setDeletingTenant(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Tenant</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingTenant?.firstName} {deletingTenant?.lastName}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingTenant && deleteMutation.mutate(deletingTenant.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
