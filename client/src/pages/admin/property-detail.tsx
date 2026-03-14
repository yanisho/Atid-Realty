import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { isoToDisplay, displayToIso, formatDate, snapToFirstOfMonth, snapToLastOfMonth } from "@/lib/date-utils";
import { useParams, Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, differenceInMonths, differenceInDays } from "date-fns";
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
import { ArrowLeft, Building2, Plus, Loader2, Calendar, DollarSign, User, Pencil, Trash2, Clock, Mail, Image as ImageIcon, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Property, Lease, Tenant } from "@shared/schema";

interface PropertyWithDetails extends Property {
  leases: Lease[];
  units: any[];
}

const leaseFormSchema = z.object({
  tenantId: z.string().min(1, "Tenant is required"),
  propertyId: z.string(),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
  rentAmount: z.string().min(1, "Rent amount is required"),
  depositAmount: z.string().optional(),
  lastMonthRent: z.string().optional(),
  status: z.string().default("active"),
});

type LeaseFormData = z.infer<typeof leaseFormSchema>;

const tenantFormSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Valid email is required"),
  phone: z.string().optional(),
  rentAmount: z.string().optional(),
  propertyId: z.string(),
  status: z.string().default("inactive"),
});

type TenantFormData = z.infer<typeof tenantFormSchema>;

export default function AdminPropertyDetail() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const [showAddLeaseDialog, setShowAddLeaseDialog] = useState(false);
  const [editingLease, setEditingLease] = useState<Lease | null>(null);
  const [deletingLease, setDeletingLease] = useState<Lease | null>(null);
  const [invitingTenantId, setInvitingTenantId] = useState<string | null>(null);
  const [showAssignTenantDialog, setShowAssignTenantDialog] = useState(false);
  const [showCreateTenantDialog, setShowCreateTenantDialog] = useState(false);
  const [selectedTenantToAssign, setSelectedTenantToAssign] = useState<string>("");

  const { data: property, isLoading } = useQuery<PropertyWithDetails>({
    queryKey: ["/api/admin/properties", id],
  });

  const { data: tenants } = useQuery<Tenant[]>({
    queryKey: ["/api/admin/tenants"],
  });

  const { data: propertyImages } = useQuery<{ images: string[] }>({
    queryKey: ["/api/admin/property-images-by-code", property?.propertyCode],
    enabled: !!property?.propertyCode,
  });

  const { data: leaseDocuments } = useQuery<any[]>({
    queryKey: ["/api/admin/lease-documents"],
  });

  const form = useForm<LeaseFormData>({
    resolver: zodResolver(leaseFormSchema),
    defaultValues: {
      tenantId: "",
      propertyId: id || "",
      startDate: "",
      endDate: "",
      rentAmount: "",
      depositAmount: "",
      lastMonthRent: "",
      status: "active",
    },
  });

  const tenantForm = useForm<TenantFormData>({
    resolver: zodResolver(tenantFormSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      rentAmount: "",
      propertyId: id || "",
      status: "inactive",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: LeaseFormData) => {
      return await apiRequest("POST", "/api/admin/leases", {
        ...data,
        startDate: data.startDate,
        endDate: data.endDate,
      });
    },
    onSuccess: () => {
      setShowAddLeaseDialog(false);
      form.reset({ propertyId: id, tenantId: "", startDate: "", endDate: "", rentAmount: "", depositAmount: "", lastMonthRent: "", status: "active" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/properties", id] });
      toast({
        title: "Lease Added",
        description: "The lease has been created successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create lease.",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: LeaseFormData & { id: string }) => {
      const { id: leaseId, ...leaseData } = data;
      return await apiRequest("PATCH", `/api/admin/leases/${leaseId}`, {
        ...leaseData,
        startDate: leaseData.startDate,
        endDate: leaseData.endDate,
      });
    },
    onSuccess: () => {
      setEditingLease(null);
      form.reset({ propertyId: id, tenantId: "", startDate: "", endDate: "", rentAmount: "", depositAmount: "", lastMonthRent: "", status: "active" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/properties", id] });
      toast({
        title: "Lease Updated",
        description: "The lease has been updated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update lease.",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (leaseId: string) => {
      return await apiRequest("DELETE", `/api/admin/leases/${leaseId}`);
    },
    onSuccess: () => {
      setDeletingLease(null);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/properties", id] });
      toast({
        title: "Lease Deleted",
        description: "The lease has been deleted successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete lease.",
        variant: "destructive",
      });
    },
  });

  const inviteMutation = useMutation({
    mutationFn: async (tenantId: string) => {
      return await apiRequest("POST", `/api/admin/tenants/${tenantId}/invite`);
    },
    onSuccess: (data: any) => {
      setInvitingTenantId(null);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/tenants"] });
      toast({
        title: "Invitation Sent",
        description: data.message || "The tenant has been sent an invitation email.",
      });
    },
    onError: (error: Error) => {
      setInvitingTenantId(null);
      toast({
        title: "Error",
        description: error.message || "Failed to send invitation.",
        variant: "destructive",
      });
    },
  });

  const createTenantMutation = useMutation({
    mutationFn: async (data: TenantFormData) => {
      return await apiRequest("POST", "/api/admin/tenants", data);
    },
    onSuccess: () => {
      setShowCreateTenantDialog(false);
      tenantForm.reset({ firstName: "", lastName: "", email: "", phone: "", rentAmount: "", propertyId: id, status: "inactive" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/tenants"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/properties", id] });
      toast({
        title: "Tenant Created",
        description: "The tenant has been created and assigned to this property.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create tenant.",
        variant: "destructive",
      });
    },
  });

  const assignTenantMutation = useMutation({
    mutationFn: async (tenantId: string) => {
      return await apiRequest("PATCH", `/api/admin/tenants/${tenantId}`, { propertyId: id });
    },
    onSuccess: () => {
      setShowAssignTenantDialog(false);
      setSelectedTenantToAssign("");
      queryClient.invalidateQueries({ queryKey: ["/api/admin/tenants"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/properties", id] });
      toast({
        title: "Tenant Assigned",
        description: "The tenant has been assigned to this property.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to assign tenant.",
        variant: "destructive",
      });
    },
  });

  const handleSendInvite = (tenantId: string) => {
    setInvitingTenantId(tenantId);
    inviteMutation.mutate(tenantId);
  };

  const getTenantHasAccount = (tenantId: string): boolean => {
    const tenant = tenants?.find(t => t.id === tenantId);
    return !!tenant?.userId;
  };

  const getUnassignedTenants = () => {
    return tenants?.filter(t => !t.propertyId) || [];
  };

  const getPropertyTenants = () => {
    return tenants?.filter(t => t.propertyId === id) || [];
  };

  const handleEdit = (lease: Lease) => {
    form.reset({
      tenantId: lease.tenantId,
      propertyId: lease.propertyId,
      startDate: lease.startDate.split("T")[0],
      endDate: lease.endDate.split("T")[0],
      rentAmount: lease.rentAmount,
      depositAmount: lease.depositAmount || "",
      lastMonthRent: lease.lastMonthRent ?? "",
      status: lease.status || "active",
    });
    setEditingLease(lease);
  };

  const handleDelete = (lease: Lease) => {
    setEditingLease(null);
    setShowAddLeaseDialog(false);
    setDeletingLease(lease);
  };

  const handleCloseDialog = () => {
    setShowAddLeaseDialog(false);
    setEditingLease(null);
    form.reset({ propertyId: id, tenantId: "", startDate: "", endDate: "", rentAmount: "", depositAmount: "", lastMonthRent: "", status: "active" });
  };

  const stripCommas = (val: string | undefined) => val ? val.replace(/,/g, '') : val;

  const onSubmit = (data: LeaseFormData) => {
    const cleaned = {
      ...data,
      rentAmount: stripCommas(data.rentAmount) || "",
      depositAmount: stripCommas(data.depositAmount),
      lastMonthRent: stripCommas(data.lastMonthRent),
    };
    if (editingLease) {
      updateMutation.mutate({ ...cleaned, id: editingLease.id });
    } else {
      createMutation.mutate(cleaned);
    }
  };

  const getTenantName = (tenantId: string) => {
    const tenant = tenants?.find(t => t.id === tenantId);
    return tenant ? `${tenant.firstName} ${tenant.lastName}` : "Unknown";
  };

  const getLeaseDuration = (startDate: Date | string, endDate: Date | string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const months = differenceInMonths(end, start);
    const days = differenceInDays(end, start) % 30;
    
    if (months > 0) {
      return `${months} month${months !== 1 ? 's' : ''}${days > 0 ? ` ${days} days` : ''}`;
    }
    return `${differenceInDays(end, start)} days`;
  };

  const getLeaseStatus = (lease: Lease) => {
    const now = new Date();
    const endDate = new Date(lease.endDate);
    const startDate = new Date(lease.startDate);
    
    if (now > endDate) return { label: "Expired", variant: "secondary" as const };
    if (now < startDate) return { label: "Upcoming", variant: "outline" as const };
    return { label: "Active", variant: "default" as const };
  };

  const isDialogOpen = showAddLeaseDialog || editingLease !== null;
  const isPending = createMutation.isPending || updateMutation.isPending;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!property) {
    return (
      <div className="text-center py-12">
        <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold">Property not found</h2>
        <Link href="/admin/properties">
          <Button variant="ghost">Back to Properties</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/properties">
          <Button variant="ghost" size="icon" data-testid="button-back">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">{property.name}</h1>
          <p className="text-muted-foreground">{property.address}, {property.city}, {property.state} {property.zip}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
            <CardTitle className="text-sm font-medium">Property ID</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{property.propertyCode}</div>
            <p className="text-xs text-muted-foreground capitalize">{property.type}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
            <CardTitle className="text-sm font-medium">Bedrooms / Baths</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{property.bedrooms || 0} / {property.bathrooms || 0}</div>
            <p className="text-xs text-muted-foreground">{property.sqft ? `${property.sqft} sq ft` : "N/A"}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
            <CardTitle className="text-sm font-medium">Active Leases</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{property.leases?.filter(l => getLeaseStatus(l).label === "Active").length || 0}</div>
            <p className="text-xs text-muted-foreground">{property.leases?.length || 0} total</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
            <CardTitle className="text-sm font-medium">Status</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <Badge variant={property.status === "rented" ? "default" : "secondary"} className="capitalize">
              {property.status === "rented" ? "Rented" : "Vacant"}
            </Badge>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div>
            <CardTitle>Tenants</CardTitle>
            <CardDescription>Manage tenants assigned to this property</CardDescription>
          </div>
          <div className="flex gap-2">
            <Dialog open={showAssignTenantDialog} onOpenChange={setShowAssignTenantDialog}>
              <DialogTrigger asChild>
                <Button variant="outline" data-testid="button-assign-tenant">
                  <User className="h-4 w-4 mr-2" />
                  Assign Tenant
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Assign Existing Tenant</DialogTitle>
                  <DialogDescription>Select an unassigned tenant to assign to this property</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <Select value={selectedTenantToAssign} onValueChange={setSelectedTenantToAssign}>
                    <SelectTrigger data-testid="select-tenant-to-assign">
                      <SelectValue placeholder="Select a tenant" />
                    </SelectTrigger>
                    <SelectContent>
                      {getUnassignedTenants().length === 0 ? (
                        <div className="p-2 text-sm text-muted-foreground">No unassigned tenants available</div>
                      ) : (
                        getUnassignedTenants().map((tenant) => (
                          <SelectItem key={tenant.id} value={tenant.id}>
                            {tenant.firstName} {tenant.lastName} ({tenant.email})
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setShowAssignTenantDialog(false)}>Cancel</Button>
                    <Button 
                      onClick={() => selectedTenantToAssign && assignTenantMutation.mutate(selectedTenantToAssign)}
                      disabled={!selectedTenantToAssign || assignTenantMutation.isPending}
                      data-testid="button-confirm-assign-tenant"
                    >
                      {assignTenantMutation.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Assigning...
                        </>
                      ) : (
                        "Assign"
                      )}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={showCreateTenantDialog} onOpenChange={setShowCreateTenantDialog}>
              <DialogTrigger asChild>
                <Button data-testid="button-create-tenant">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Tenant
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Create New Tenant</DialogTitle>
                  <DialogDescription>Add a new tenant assigned to this property</DialogDescription>
                </DialogHeader>
                <Form {...tenantForm}>
                  <form onSubmit={tenantForm.handleSubmit((data) => createTenantMutation.mutate({ ...data, rentAmount: data.rentAmount?.replace(/,/g, '') }))} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={tenantForm.control}
                        name="firstName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>First Name *</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="John" data-testid="input-tenant-first-name" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={tenantForm.control}
                        name="lastName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Last Name *</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Doe" data-testid="input-tenant-last-name" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <FormField
                      control={tenantForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email *</FormLabel>
                          <FormControl>
                            <Input {...field} type="email" placeholder="john.doe@email.com" data-testid="input-tenant-email" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={tenantForm.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="(555) 123-4567" data-testid="input-tenant-phone" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={tenantForm.control}
                      name="rentAmount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Monthly Rent</FormLabel>
                          <FormControl>
                            <Input {...field} type="text" inputMode="decimal" placeholder="1,500.00" onFocus={(e) => e.target.select()} data-testid="input-tenant-rent" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="outline" onClick={() => setShowCreateTenantDialog(false)}>Cancel</Button>
                      <Button type="submit" disabled={createTenantMutation.isPending} data-testid="button-confirm-create-tenant">
                        {createTenantMutation.isPending ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Creating...
                          </>
                        ) : (
                          "Create Tenant"
                        )}
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {getPropertyTenants().length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No tenants assigned to this property</p>
              <p className="text-sm">Assign or create a tenant to get started</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Rent/Mo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {getPropertyTenants().map((tenant) => (
                  <TableRow key={tenant.id} data-testid={`tenant-row-${tenant.id}`}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        {tenant.firstName} {tenant.lastName}
                      </div>
                    </TableCell>
                    <TableCell>{tenant.email}</TableCell>
                    <TableCell>{tenant.phone || "-"}</TableCell>
                    <TableCell>
                      {tenant.rentAmount ? `$${parseFloat(tenant.rentAmount).toLocaleString()}` : "-"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={tenant.status === "active" ? "default" : "secondary"}>
                        {tenant.status === "active" ? "Verified" : "Not Verified"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {tenant.userId ? (
                          <Badge variant="outline" className="text-xs">Has Account</Badge>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleSendInvite(tenant.id)}
                            disabled={invitingTenantId === tenant.id}
                            data-testid={`button-invite-tenant-${tenant.id}`}
                          >
                            {invitingTenantId === tenant.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <Mail className="h-4 w-4 mr-1" />
                                Invite
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div>
            <CardTitle>Leases</CardTitle>
            <CardDescription>Manage lease agreements for this property</CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => !open && handleCloseDialog()}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-lease" onClick={() => setShowAddLeaseDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Lease
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>{editingLease ? "Edit Lease" : "Add New Lease"}</DialogTitle>
                <DialogDescription>
                  {editingLease ? "Update the lease details below" : "Enter the lease details below"}
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="tenantId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tenant *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-tenant">
                              <SelectValue placeholder="Select tenant" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {tenants?.map((tenant) => (
                              <SelectItem key={tenant.id} value={tenant.id}>
                                {tenant.firstName} {tenant.lastName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="startDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Start Date *</FormLabel>
                          <FormControl>
                            <Input type="text" placeholder="MM.DD.YYYY" {...field} value={isoToDisplay(field.value)} onChange={(e) => field.onChange(snapToFirstOfMonth(displayToIso(e.target.value)))} data-testid="input-start-date" />
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
                          <FormLabel>End Date *</FormLabel>
                          <FormControl>
                            <Input type="text" placeholder="MM.DD.YYYY" {...field} value={isoToDisplay(field.value)} onChange={(e) => field.onChange(snapToLastOfMonth(displayToIso(e.target.value)))} data-testid="input-end-date" />
                          </FormControl>
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
                          <FormLabel>Monthly Rent *</FormLabel>
                          <FormControl>
                            <Input type="text" inputMode="decimal" placeholder="1,500.00" {...field} onFocus={(e) => e.target.select()} data-testid="input-rent-amount" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="depositAmount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Security Deposit</FormLabel>
                          <FormControl>
                            <Input type="text" inputMode="decimal" placeholder="1,500.00" {...field} onFocus={(e) => e.target.select()} data-testid="input-deposit-amount" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="lastMonthRent"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Last Month Rent</FormLabel>
                          <FormControl>
                            <Input type="text" inputMode="decimal" placeholder="1,500.00" {...field} onFocus={(e) => e.target.select()} data-testid="input-last-month-rent" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Status</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || "active"}>
                          <FormControl>
                            <SelectTrigger data-testid="select-status">
                              <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="expired">Expired</SelectItem>
                            <SelectItem value="terminated">Terminated</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={isPending}
                    data-testid="button-save-lease"
                  >
                    {isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : editingLease ? (
                      "Update Lease"
                    ) : (
                      "Add Lease"
                    )}
                  </Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {property.leases?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No leases found for this property</p>
              <p className="text-sm">Add a lease to get started</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tenant</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Rent</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {property.leases?.map((lease) => {
                  const status = getLeaseStatus(lease);
                  return (
                    <TableRow key={lease.id} data-testid={`lease-row-${lease.id}`}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          {getTenantName(lease.tenantId)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          {getLeaseDuration(lease.startDate, lease.endDate)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <DollarSign className="h-4 w-4 text-muted-foreground" />
                          {parseFloat(lease.rentAmount).toLocaleString()}/mo
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={status.variant}>{status.label}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {(() => {
                            const leaseDoc = leaseDocuments?.find((d: any) => d.leaseId === lease.id);
                            const leaseHref = leaseDoc ? `/admin/lease-document/${leaseDoc.id}` : `/admin/lease-document/new?leaseId=${lease.id}`;
                            return (
                              <Link href={leaseHref}>
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  title="View Lease"
                                  data-testid={`button-view-lease-doc-${lease.id}`}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </Link>
                            );
                          })()}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(lease)}
                            title="Edit"
                            data-testid={`button-edit-lease-${lease.id}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(lease)}
                            title="Delete"
                            data-testid={`button-delete-lease-${lease.id}`}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
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

      {propertyImages && propertyImages.images && propertyImages.images.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <div>
              <CardTitle>Property Photos</CardTitle>
              <CardDescription>{propertyImages.images.length} photo{propertyImages.images.length !== 1 ? "s" : ""}</CardDescription>
            </div>
            <Link href="/admin/property-images">
              <Button variant="outline" size="sm" data-testid="button-manage-images">
                <ImageIcon className="h-4 w-4 mr-2" />
                Manage Photos
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {propertyImages.images.slice(0, 8).map((img, idx) => (
                <div key={img} className="aspect-video bg-muted rounded-md overflow-hidden">
                  <img
                    src={img}
                    alt={`Property photo ${idx + 1}`}
                    className="w-full h-full object-cover"
                    data-testid={`img-property-photo-${idx}`}
                  />
                </div>
              ))}
              {propertyImages.images.length > 8 && (
                <Link href="/admin/property-images">
                  <div className="aspect-video bg-muted rounded-md flex items-center justify-center cursor-pointer hover-elevate">
                    <span className="text-sm text-muted-foreground font-medium">+{propertyImages.images.length - 8} more</span>
                  </div>
                </Link>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <AlertDialog open={deletingLease !== null} onOpenChange={(open) => !open && setDeletingLease(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Lease</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this lease? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingLease && deleteMutation.mutate(deletingLease.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete-lease"
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
