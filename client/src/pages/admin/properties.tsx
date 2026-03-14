import { useState, useEffect } from "react";
import { formatDate } from "@/lib/date-utils";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Building2, Plus, Loader2, Search, MapPin, Briefcase, Pencil, Trash2, Eye, Upload, Download, FileSpreadsheet, AlertCircle, CheckCircle, Mail, Phone, CreditCard, DollarSign, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { Link, useSearch } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Property, Entity, PublicProperty, Lease } from "@shared/schema";

const propertySchema = z.object({
  propertyCode: z.string().min(3, "Property code is required"),
  name: z.string().min(2, "Name is required"),
  nickname: z.string().optional(),
  address: z.string().min(5, "Address is required"),
  city: z.string().min(2, "City is required"),
  state: z.string().min(2, "State is required"),
  zip: z.string().min(5, "ZIP code is required"),
  type: z.string().optional(),
  bedrooms: z.coerce.number().min(0).optional(),
  bathrooms: z.string().optional(),
  sqft: z.coerce.number().min(0).optional().nullable(),
  description: z.string().optional(),
  entityId: z.string().optional().nullable(),
  status: z.string().optional(),
});

type PropertyFormData = z.infer<typeof propertySchema>;

interface BulkUploadResult {
  success?: boolean;
  created?: number;
  failed?: number;
  properties?: Property[];
  insertErrors?: { row: number; error: string }[];
  error?: string;
  errors?: { row: number; errors: string[] }[];
  missingColumns?: string[];
  requiredColumns?: string[];
  optionalColumns?: string[];
  message?: string;
}

export default function AdminProperties() {
  const { toast } = useToast();
  const searchString = useSearch();
  const urlParams = new URLSearchParams(searchString);
  const initialFilter = urlParams.get("status") as "all" | "rented" | "vacant" | null;
  const [statusFilter, setStatusFilter] = useState<"all" | "rented" | "vacant">(initialFilter || "all");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);
  const [deletingProperty, setDeletingProperty] = useState<Property | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showBulkUploadDialog, setShowBulkUploadDialog] = useState(false);
  const [uploadResult, setUploadResult] = useState<BulkUploadResult | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [viewingEntity, setViewingEntity] = useState<Entity | null>(null);
  const [sortField, setSortField] = useState<"property" | "amount" | "endDate" | "status" | "entity" | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const toggleSort = (field: "property" | "amount" | "endDate" | "status" | "entity") => {
    if (sortField === field) {
      if (sortDir === "asc") setSortDir("desc");
      else { setSortField(null); setSortDir("asc"); }
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const { data: properties, isLoading } = useQuery<Property[]>({
    queryKey: ["/api/admin/properties"],
  });

  const { data: entities, isLoading: entitiesLoading } = useQuery<Entity[]>({
    queryKey: ["/api/admin/entities"],
  });

  const { data: publicProperties } = useQuery<PublicProperty[]>({
    queryKey: ["/api/admin/public-properties"],
  });

  const { data: allLeases } = useQuery<Lease[]>({
    queryKey: ["/api/admin/leases"],
  });

  const getActiveLease = (propertyId: string): Lease | null => {
    if (!allLeases) return null;
    return allLeases.find(
      (l) => l.propertyId === propertyId && l.status === "active"
    ) || null;
  };

  const hasFutureLease = (propertyId: string): boolean => {
    if (!allLeases) return false;
    const now = new Date();
    return allLeases.some((l) => {
      if (l.propertyId !== propertyId) return false;
      if (l.status === "active") return false;
      const start = l.startDate ? new Date(l.startDate) : null;
      return start && start > now;
    });
  };

  const getPropertyRent = (propertyId: string): string | null => {
    const lease = getActiveLease(propertyId);
    if (!lease) return null;
    return Number(lease.rentAmount).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  };

  const formatLeaseDate = (date: string | Date | null | undefined): string => {
    if (!date) return "-";
    return formatDate(date);
  };

  const getPropertyImage = (propertyCode: string): string | null => {
    if (!publicProperties) return null;
    const codeBase = propertyCode.split("-")[0].toUpperCase();
    const pub = publicProperties.find(pp => {
      const ppId = pp.propertyId.toUpperCase();
      return ppId === propertyCode.toUpperCase() || 
             ppId === codeBase ||
             codeBase.startsWith(ppId);
    });
    return pub?.images?.[0] || null;
  };

  const form = useForm<PropertyFormData>({
    resolver: zodResolver(propertySchema),
    defaultValues: {
      propertyCode: "",
      name: "",
      nickname: "",
      address: "",
      city: "",
      state: "",
      zip: "",
      type: "house",
      bedrooms: 1,
      bathrooms: "1",
      sqft: null,
      description: "",
      entityId: null,
    },
  });

  const normalizeBathrooms = (val: string | null | undefined): string => {
    if (!val) return "1";
    const num = parseFloat(val);
    if (isNaN(num)) return "1";
    if (num % 1 === 0) return String(num);
    return String(num);
  };

  useEffect(() => {
    if (editingProperty) {
      form.reset({
        propertyCode: editingProperty.propertyCode,
        name: editingProperty.name,
        nickname: editingProperty.nickname || "",
        address: editingProperty.address,
        city: editingProperty.city,
        state: editingProperty.state,
        zip: editingProperty.zip,
        type: editingProperty.type || "house",
        bedrooms: editingProperty.bedrooms || 1,
        bathrooms: normalizeBathrooms(editingProperty.bathrooms),
        sqft: editingProperty.sqft || null,
        description: editingProperty.description || "",
        entityId: editingProperty.entityId || null,
        status: editingProperty.status || "vacant",
      });
    }
  }, [editingProperty, form]);

  const getEntityName = (entityId: string | null | undefined) => {
    if (!entityId) return null;
    if (entitiesLoading) return "Loading...";
    return entities?.find(e => e.id === entityId)?.name || "Unknown";
  };

  const createMutation = useMutation({
    mutationFn: async (data: PropertyFormData) => {
      return await apiRequest("POST", "/api/admin/properties", data);
    },
    onSuccess: () => {
      setShowAddDialog(false);
      form.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/admin/properties"] });
      toast({
        title: "Property Added",
        description: "The property has been created successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create property.",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: PropertyFormData }) => {
      return await apiRequest("PATCH", `/api/admin/properties/${id}`, data);
    },
    onSuccess: () => {
      setEditingProperty(null);
      form.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/admin/properties"] });
      toast({
        title: "Property Updated",
        description: "The property has been updated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update property.",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/admin/properties/${id}`);
    },
    onSuccess: () => {
      setDeletingProperty(null);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/properties"] });
      toast({
        title: "Property Deleted",
        description: "The property has been deleted successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete property.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: PropertyFormData) => {
    if (editingProperty) {
      updateMutation.mutate({ id: editingProperty.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (property: Property) => {
    setEditingProperty(property);
  };

  const handleDelete = (property: Property) => {
    setEditingProperty(null);
    setShowAddDialog(false);
    setDeletingProperty(property);
  };

  const handleCloseDialog = () => {
    setShowAddDialog(false);
    setEditingProperty(null);
    form.reset({
      propertyCode: "",
      name: "",
      address: "",
      city: "",
      state: "",
      zip: "",
      type: "house",
      description: "",
      entityId: null,
    });
  };

  const handleBulkUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/admin/properties/bulk-upload", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      const result = await response.json();
      setUploadResult(result);

      if (result.success) {
        queryClient.invalidateQueries({ queryKey: ["/api/admin/properties"] });
        toast({
          title: "Bulk Upload Successful",
          description: `Created ${result.created} properties.`,
        });
      }
    } catch (error) {
      setUploadResult({
        error: "Failed to upload file. Please try again.",
      });
    } finally {
      setIsUploading(false);
      event.target.value = "";
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const response = await fetch("/api/admin/properties/template", {
        credentials: "include",
      });
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "properties_template.xlsx";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to download template.",
        variant: "destructive",
      });
    }
  };

  const filteredProperties = properties?.filter((prop) => {
    const matchesSearch = prop.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      prop.propertyCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      prop.address.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;
    if (statusFilter === "rented") return prop.status === "rented";
    if (statusFilter === "vacant") return prop.status !== "rented";
    return true;
  }).sort((a, b) => {
    if (sortField === "property") {
      const cmp = a.name.toLowerCase().localeCompare(b.name.toLowerCase());
      return sortDir === "asc" ? cmp : -cmp;
    }
    if (sortField === "amount") {
      const aLease = getActiveLease(a.id);
      const bLease = getActiveLease(b.id);
      const aVal = aLease ? Number(aLease.rentAmount) : -1;
      const bVal = bLease ? Number(bLease.rentAmount) : -1;
      return sortDir === "asc" ? aVal - bVal : bVal - aVal;
    }
    if (sortField === "endDate") {
      const aLease = getActiveLease(a.id);
      const bLease = getActiveLease(b.id);
      const aVal = aLease ? new Date(aLease.endDate).getTime() : -1;
      const bVal = bLease ? new Date(bLease.endDate).getTime() : -1;
      return sortDir === "asc" ? aVal - bVal : bVal - aVal;
    }
    if (sortField === "status") {
      const order: Record<string, number> = { rented: 0, vacant: 1 };
      const aVal = order[a.status] ?? 3;
      const bVal = order[b.status] ?? 3;
      return sortDir === "asc" ? aVal - bVal : bVal - aVal;
    }
    if (sortField === "entity") {
      const aName = (getEntityName(a.entityId) || "").toLowerCase();
      const bName = (getEntityName(b.entityId) || "").toLowerCase();
      const cmp = aName.localeCompare(bName);
      return sortDir === "asc" ? cmp : -cmp;
    }
    return a.name.localeCompare(b.name);
  });

  const isDialogOpen = showAddDialog || editingProperty !== null;
  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Properties</h1>
          <p className="text-muted-foreground">Manage your property portfolio</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Dialog open={showBulkUploadDialog} onOpenChange={setShowBulkUploadDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" data-testid="button-bulk-upload" onClick={() => setUploadResult(null)}>
                <Upload className="h-4 w-4 mr-2" />
                Bulk Upload
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Bulk Upload Properties</DialogTitle>
                <DialogDescription>
                  Upload an Excel file to add multiple properties at once
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-start gap-3">
                      <FileSpreadsheet className="h-8 w-8 text-muted-foreground flex-shrink-0" />
                      <div className="space-y-2">
                        <p className="text-sm font-medium">Download Template First</p>
                        <p className="text-sm text-muted-foreground">
                          Download the Excel template to see required columns and proper format
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleDownloadTemplate}
                          data-testid="button-download-template"
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Download Template
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-4">
                    <div className="space-y-3">
                      <p className="text-sm font-medium">Required Columns:</p>
                      <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                        <li><span className="font-medium text-foreground">propertyCode</span> - Unique ID (e.g., PROP001)</li>
                        <li><span className="font-medium text-foreground">name</span> - Property name</li>
                        <li><span className="font-medium text-foreground">address</span> - Street address</li>
                        <li><span className="font-medium text-foreground">city</span> - City name</li>
                        <li><span className="font-medium text-foreground">state</span> - State (e.g., IL)</li>
                        <li><span className="font-medium text-foreground">zip</span> - ZIP code</li>
                      </ul>
                      <p className="text-sm font-medium mt-3">Optional Columns:</p>
                      <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                        <li><span className="font-medium text-foreground">entityId</span> - Owner entity name or ID</li>
                        <li><span className="font-medium text-foreground">type</span> - house, condo, townhouse, commercial</li>
                        <li><span className="font-medium text-foreground">bedrooms, bathrooms, sqft</span> - Property details</li>
                      </ul>
                    </div>
                  </CardContent>
                </Card>

                <div className="space-y-2">
                  <label
                    htmlFor="excel-upload"
                    className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-muted/50"
                  >
                    {isUploading ? (
                      <div className="flex flex-col items-center">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mb-2" />
                        <span className="text-sm text-muted-foreground">Uploading...</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center">
                        <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                        <span className="text-sm text-muted-foreground">Click to upload Excel file</span>
                        <span className="text-xs text-muted-foreground">.xlsx or .xls</span>
                      </div>
                    )}
                    <input
                      id="excel-upload"
                      type="file"
                      accept=".xlsx,.xls"
                      className="hidden"
                      onChange={handleBulkUpload}
                      disabled={isUploading}
                      data-testid="input-file-upload"
                    />
                  </label>
                </div>

                {uploadResult && (
                  <div className="space-y-2">
                    {uploadResult.success ? (
                      <>
                        <div className="flex items-start gap-2 p-3 bg-green-100 dark:bg-green-900/30 rounded-lg border border-green-200 dark:border-green-800">
                          <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="font-medium text-green-800 dark:text-green-200">Upload Successful</p>
                            {uploadResult.results ? (
                              <div className="text-sm text-green-700 dark:text-green-300 space-y-1">
                                <p>Entities: {uploadResult.results.entities.created} created, {uploadResult.results.entities.existing} existing</p>
                                <p>Properties: {uploadResult.results.properties.created} created</p>
                                <p>Tenants: {uploadResult.results.tenants.created} created</p>
                                <p>Leases: {uploadResult.results.leases.created} created</p>
                              </div>
                            ) : (
                              <p className="text-sm text-green-700 dark:text-green-300">
                                Created {uploadResult.created} properties
                                {uploadResult.failed && uploadResult.failed > 0 && ` (${uploadResult.failed} failed to insert)`}
                              </p>
                            )}
                          </div>
                        </div>
                        {uploadResult.errors && uploadResult.errors.length > 0 && (
                          <div className="flex items-start gap-2 p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg border border-yellow-200 dark:border-yellow-800">
                            <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                            <div className="flex-1">
                              <p className="font-medium text-yellow-800 dark:text-yellow-200">
                                Some rows had validation errors
                              </p>
                              <div className="mt-2 max-h-32 overflow-y-auto">
                                {uploadResult.errors.slice(0, 5).map((err: any, idx: number) => (
                                  <p key={idx} className="text-sm text-yellow-700 dark:text-yellow-300">
                                    Row {err.row}: {err.errors.join(", ")}
                                  </p>
                                ))}
                                {uploadResult.errors.length > 5 && (
                                  <p className="text-sm text-yellow-700 dark:text-yellow-300">
                                    ...and {uploadResult.errors.length - 5} more errors
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                        {uploadResult.insertErrors && uploadResult.insertErrors.length > 0 && (
                          <div className="flex items-start gap-2 p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg border border-yellow-200 dark:border-yellow-800">
                            <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                            <div className="flex-1">
                              <p className="font-medium text-yellow-800 dark:text-yellow-200">
                                Some rows failed to insert
                              </p>
                              <div className="mt-2 max-h-32 overflow-y-auto">
                                {uploadResult.insertErrors.slice(0, 5).map((err: any, idx: number) => (
                                  <p key={idx} className="text-sm text-yellow-700 dark:text-yellow-300">
                                    Row {err.row}: {err.error}
                                  </p>
                                ))}
                                {uploadResult.insertErrors.length > 5 && (
                                  <p className="text-sm text-yellow-700 dark:text-yellow-300">
                                    ...and {uploadResult.insertErrors.length - 5} more errors
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="flex items-start gap-2 p-3 bg-red-100 dark:bg-red-900/30 rounded-lg border border-red-200 dark:border-red-800">
                        <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <p className="font-medium text-red-800 dark:text-red-200">
                            {uploadResult.error || "Upload Failed"}
                          </p>
                          {uploadResult.missingColumns && (
                            <p className="text-sm text-red-700 dark:text-red-300">
                              Missing columns: {uploadResult.missingColumns.join(", ")}
                            </p>
                          )}
                          {uploadResult.errors && uploadResult.errors.length > 0 && (
                            <div className="mt-2 max-h-32 overflow-y-auto">
                              {uploadResult.errors.slice(0, 5).map((err, idx) => (
                                <p key={idx} className="text-sm text-red-700 dark:text-red-300">
                                  Row {err.row}: {err.errors.join(", ")}
                                </p>
                              ))}
                              {uploadResult.errors.length > 5 && (
                                <p className="text-sm text-red-700 dark:text-red-300">
                                  ...and {uploadResult.errors.length - 5} more errors
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
          <Dialog open={isDialogOpen} onOpenChange={(open) => !open && handleCloseDialog()}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-property" onClick={() => setShowAddDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Property
              </Button>
            </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingProperty ? "Edit Property" : "Add New Property"}</DialogTitle>
              <DialogDescription>
                {editingProperty ? "Update the property details below" : "Enter the property details below"}
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="entityId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Owner Entity</FormLabel>
                      <Select 
                        onValueChange={(value) => field.onChange(value === "none" ? null : value)} 
                        value={field.value || "none"}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-entity">
                            <SelectValue placeholder="Select owner entity" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">No Entity (Unassigned)</SelectItem>
                          {entities?.map((entity) => (
                            <SelectItem key={entity.id} value={entity.id}>
                              {entity.name} ({entity.type})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className={editingProperty ? "grid grid-cols-3 gap-4" : "grid grid-cols-2 gap-4"}>
                  <FormField
                    control={form.control}
                    name="propertyCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Property ID *</FormLabel>
                        <FormControl>
                          <Input placeholder="PROP-001" {...field} data-testid="input-property-id" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Property Type</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-type">
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="house">House</SelectItem>
                            <SelectItem value="condo">Condo</SelectItem>
                            <SelectItem value="townhouse">Townhouse</SelectItem>
                            <SelectItem value="commercial">Commercial</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {editingProperty && (
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
                              <SelectItem value="rented">Rented</SelectItem>
                              <SelectItem value="vacant">Vacant</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Property Name *</FormLabel>
                        <FormControl>
                          <Input placeholder="Sunset Apartments" {...field} data-testid="input-property-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="nickname"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nickname</FormLabel>
                        <FormControl>
                          <Input placeholder="The Sunset" {...field} data-testid="input-nickname" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="bedrooms"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Bedrooms</FormLabel>
                        <FormControl>
                          <Input type="number" min="0" placeholder="3" {...field} data-testid="input-bedrooms" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="bathrooms"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Bathrooms</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-bathrooms">
                              <SelectValue placeholder="Select" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="1">1</SelectItem>
                            <SelectItem value="1.5">1.5</SelectItem>
                            <SelectItem value="2">2</SelectItem>
                            <SelectItem value="2.5">2.5</SelectItem>
                            <SelectItem value="3">3</SelectItem>
                            <SelectItem value="3.5">3.5</SelectItem>
                            <SelectItem value="4">4</SelectItem>
                            <SelectItem value="4.5">4.5</SelectItem>
                            <SelectItem value="5">5+</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="sqft"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Sq Ft</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            min="0" 
                            placeholder="1500" 
                            {...field} 
                            value={field.value ?? ""} 
                            data-testid="input-sqft" 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Address *</FormLabel>
                      <FormControl>
                        <Input placeholder="123 Main Street" {...field} data-testid="input-address" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>City *</FormLabel>
                        <FormControl>
                          <Input placeholder="City" {...field} data-testid="input-city" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="state"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>State *</FormLabel>
                        <FormControl>
                          <Input placeholder="CA" {...field} data-testid="input-state" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="zip"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>ZIP *</FormLabel>
                        <FormControl>
                          <Input placeholder="12345" {...field} data-testid="input-zip" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Property description..." {...field} data-testid="input-description" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="w-full"
                  disabled={isPending}
                  data-testid="button-save-property"
                >
                  {isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : editingProperty ? (
                    "Update Property"
                  ) : (
                    "Add Property"
                  )}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      <div className="flex items-center gap-4 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search properties..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            data-testid="input-search"
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant={statusFilter === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter("all")}
            data-testid="filter-all"
          >
            All ({properties?.length || 0})
          </Button>
          <Button
            variant={statusFilter === "rented" ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter("rented")}
            data-testid="filter-rented"
          >
            Rented ({properties?.filter(p => p.status === "rented").length || 0})
          </Button>
          <Button
            variant={statusFilter === "vacant" ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter("vacant")}
            data-testid="filter-vacant"
          >
            Vacant ({properties?.filter(p => p.status !== "rented").length || 0})
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{statusFilter === "all" ? "All Properties" : statusFilter === "rented" ? "Rented Properties" : "Vacant Properties"}</CardTitle>
          <CardDescription>
            {filteredProperties?.length || 0} properties {statusFilter !== "all" ? `(${statusFilter})` : "total"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : filteredProperties && filteredProperties.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>
                      <button
                        className="flex items-center gap-1 hover-elevate rounded px-1 -ml-1"
                        onClick={() => toggleSort("property")}
                        data-testid="button-sort-property"
                      >
                        Property
                        {sortField === "property" ? (sortDir === "asc" ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />) : <ArrowUpDown className="h-3.5 w-3.5 opacity-50" />}
                      </button>
                    </TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>
                      <button
                        className="flex items-center gap-1 hover-elevate rounded px-1 -ml-1"
                        onClick={() => toggleSort("entity")}
                        data-testid="button-sort-entity"
                      >
                        Owner Entity
                        {sortField === "entity" ? (sortDir === "asc" ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />) : <ArrowUpDown className="h-3.5 w-3.5 opacity-50" />}
                      </button>
                    </TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>
                      <button
                        className="flex items-center gap-1 hover-elevate rounded px-1 -ml-1"
                        onClick={() => toggleSort("amount")}
                        data-testid="button-sort-amount"
                      >
                        Amount
                        {sortField === "amount" ? (sortDir === "asc" ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />) : <ArrowUpDown className="h-3.5 w-3.5 opacity-50" />}
                      </button>
                    </TableHead>
                    <TableHead>
                      <button
                        className="flex items-center gap-1 hover-elevate rounded px-1 -ml-1"
                        onClick={() => toggleSort("status")}
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
                  {filteredProperties.map((property) => (
                    <TableRow key={property.id} data-testid={`property-row-${property.id}`}>
                      <TableCell className="font-medium" data-testid={`text-property-name-${property.id}`}>
                        <Link href={`/admin/properties/${property.id}`} data-testid={`link-property-${property.id}`}>
                          {property.name}
                        </Link>
                        <p className="text-sm text-muted-foreground font-normal">
                          {property.address}, {property.city}, {property.state}
                        </p>
                      </TableCell>
                      <TableCell>
                        <code className="text-sm">{property.propertyCode}</code>
                      </TableCell>
                      <TableCell>
                        {property.entityId ? (
                          <div 
                            className="flex items-center gap-1.5 cursor-pointer hover:underline"
                            onClick={(e) => {
                              e.stopPropagation();
                              const entity = entities?.find(ent => ent.id === property.entityId);
                              if (entity) setViewingEntity(entity);
                            }}
                            data-testid={`link-owner-${property.id}`}
                          >
                            <Briefcase className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="text-sm">{getEntityName(property.entityId)}</span>
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">Unassigned</span>
                        )}
                      </TableCell>
                      <TableCell className="capitalize">{property.type || "Residential"}</TableCell>
                      <TableCell>
                        {getPropertyRent(property.id) ? (
                          <span className="text-sm font-medium" data-testid={`text-rent-${property.id}`}>${getPropertyRent(property.id)}</span>
                        ) : (
                          <span className="text-sm text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={property.status === "rented" ? "default" : "secondary"}>
                          {property.status === "rented" ? "Rented" : "Vacant"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Link href={`/admin/properties/${property.id}`}>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              data-testid={`button-view-property-${property.id}`}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </Link>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => handleEdit(property)}
                            data-testid={`button-edit-property-${property.id}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => handleDelete(property)}
                            data-testid={`button-delete-property-${property.id}`}
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
              <Building2 className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No properties found</p>
              <p className="text-sm">Add your first property to get started.</p>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={deletingProperty !== null} onOpenChange={(open) => !open && setDeletingProperty(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Property</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingProperty?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingProperty && deleteMutation.mutate(deletingProperty.id)}
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

      <Dialog open={viewingEntity !== null} onOpenChange={(open) => !open && setViewingEntity(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Owner / Landlord Details</DialogTitle>
            <DialogDescription>Entity information and contact details</DialogDescription>
          </DialogHeader>
          {viewingEntity && (() => {
            const entityProperties = properties?.filter(p => p.entityId === viewingEntity.id) || [];
            return (
              <div className="space-y-5">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-md bg-primary/10 flex items-center justify-center">
                    <Briefcase className="h-7 w-7 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold" data-testid="text-entity-detail-name">
                      {viewingEntity.name}
                    </h3>
                    <Badge variant="outline" className="capitalize" data-testid="text-entity-detail-type">
                      {viewingEntity.type || "LLC"}
                    </Badge>
                  </div>
                </div>

                {(viewingEntity.contactName || viewingEntity.contactEmail || viewingEntity.contactPhone) && (
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium text-muted-foreground">Contact Information</h4>
                    <div className="grid gap-2">
                      {viewingEntity.contactName && (
                        <div className="flex items-center gap-2 text-sm">
                          <Briefcase className="h-4 w-4 text-muted-foreground" />
                          <span data-testid="text-entity-detail-contact">{viewingEntity.contactName}</span>
                        </div>
                      )}
                      {viewingEntity.contactEmail && (
                        <div className="flex items-center gap-2 text-sm">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <span data-testid="text-entity-detail-email">{viewingEntity.contactEmail}</span>
                        </div>
                      )}
                      {viewingEntity.contactPhone && (
                        <div className="flex items-center gap-2 text-sm">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          <span data-testid="text-entity-detail-phone">{viewingEntity.contactPhone}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {(viewingEntity.address || viewingEntity.city) && (
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium text-muted-foreground">Address</h4>
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span data-testid="text-entity-detail-address">
                        {[viewingEntity.address, viewingEntity.city, viewingEntity.state, viewingEntity.zip].filter(Boolean).join(", ")}
                      </span>
                    </div>
                  </div>
                )}

                {viewingEntity.taxId && (
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium text-muted-foreground">Tax ID</h4>
                    <div className="flex items-center gap-2 text-sm">
                      <CreditCard className="h-4 w-4 text-muted-foreground" />
                      <span>{viewingEntity.taxId}</span>
                    </div>
                  </div>
                )}

                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-muted-foreground">Payment Status</h4>
                  <div className="grid gap-2">
                    <div className="flex items-center gap-2 text-sm">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      <span>Stripe: </span>
                      <Badge variant={viewingEntity.stripeAccountStatus === "active" ? "default" : "secondary"}>
                        {viewingEntity.stripeAccountStatus || "Not Connected"}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <CreditCard className="h-4 w-4 text-muted-foreground" />
                      <span>Payments: </span>
                      <Badge variant={viewingEntity.paymentEnabled ? "default" : "secondary"}>
                        {viewingEntity.paymentEnabled ? "Enabled" : "Disabled"}
                      </Badge>
                    </div>
                  </div>
                </div>

                {entityProperties.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium text-muted-foreground">Properties ({entityProperties.length})</h4>
                    <div className="space-y-2">
                      {entityProperties.map((prop) => (
                        <div key={prop.id} className="flex items-center justify-between p-3 border rounded-md text-sm">
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="font-medium">{prop.name}</p>
                              <p className="text-xs text-muted-foreground">{prop.address}, {prop.city}</p>
                            </div>
                          </div>
                          <Badge variant={prop.status === "rented" ? "default" : "secondary"}>
                            {prop.status === "rented" ? "Rented" : "Vacant"}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
