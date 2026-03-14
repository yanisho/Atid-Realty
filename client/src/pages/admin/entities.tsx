import { useState } from "react";
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Briefcase, Plus, Loader2, Search, Building2, CreditCard, Pencil, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Link, useLocation } from "wouter";
import type { Entity } from "@shared/schema";

const entitySchema = z.object({
  name: z.string().min(2, "Name is required"),
  type: z.string().min(1, "Type is required"),
  taxId: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip: z.string().optional(),
  contactName: z.string().optional(),
  contactEmail: z.string().optional(),
  contactPhone: z.string().optional(),
  zelleInfo: z.string().optional(),
});

type EntityFormData = z.infer<typeof entitySchema>;

export default function AdminEntities() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingEntity, setEditingEntity] = useState<Entity | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const { data: entities, isLoading } = useQuery<Entity[]>({
    queryKey: ["/api/admin/entities"],
  });

  const form = useForm<EntityFormData>({
    resolver: zodResolver(entitySchema),
    defaultValues: {
      name: "",
      type: "llc",
      taxId: "",
      address: "",
      city: "",
      state: "",
      zip: "",
      contactName: "",
      contactEmail: "",
      contactPhone: "",
      zelleInfo: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: EntityFormData) => {
      return await apiRequest("POST", "/api/admin/entities", data);
    },
    onSuccess: () => {
      setShowAddDialog(false);
      form.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/admin/entities"] });
      toast({
        title: "Entity Created",
        description: "The entity has been created successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create entity.",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: EntityFormData }) => {
      return await apiRequest("PATCH", `/api/admin/entities/${id}`, data);
    },
    onSuccess: () => {
      setEditingEntity(null);
      form.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/admin/entities"] });
      toast({
        title: "Entity Updated",
        description: "The entity has been updated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update entity.",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/admin/entities/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/entities"] });
      toast({
        title: "Entity Deleted",
        description: "The entity has been deleted successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete entity.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: EntityFormData) => {
    if (editingEntity) {
      updateMutation.mutate({ id: editingEntity.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (entity: Entity) => {
    setEditingEntity(entity);
    form.reset({
      name: entity.name,
      type: entity.type || "llc",
      taxId: entity.taxId || "",
      address: entity.address || "",
      city: entity.city || "",
      state: entity.state || "",
      zip: entity.zip || "",
      contactName: entity.contactName || "",
      contactEmail: entity.contactEmail || "",
      contactPhone: entity.contactPhone || "",
      zelleInfo: entity.zelleInfo || "",
    });
  };

  const handleCloseDialog = () => {
    setShowAddDialog(false);
    setEditingEntity(null);
    form.reset();
  };

  const filteredEntities = entities?.filter((entity) =>
    entity.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (entity.contactName?.toLowerCase() || "").includes(searchQuery.toLowerCase())
  ).sort((a, b) => a.name.localeCompare(b.name));

  const getTypeLabel = (type: string | null) => {
    const types: Record<string, string> = {
      llc: "LLC",
      corporation: "Corporation",
      individual: "Individual",
      partnership: "Partnership",
      trust: "Trust",
    };
    return types[type || "llc"] || type;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Entities</h1>
          <p className="text-muted-foreground">Manage property owners and their payment accounts</p>
        </div>
        <Dialog open={showAddDialog || !!editingEntity} onOpenChange={(open) => !open && handleCloseDialog()}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-entity" onClick={() => setShowAddDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Entity
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingEntity ? "Edit Entity" : "Add New Entity"}</DialogTitle>
              <DialogDescription>
                {editingEntity ? "Update entity details below" : "Enter the entity details below"}
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Entity Name *</FormLabel>
                        <FormControl>
                          <Input placeholder="ABC Properties LLC" {...field} data-testid="input-entity-name" />
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
                        <FormLabel>Type *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-entity-type">
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="llc">LLC</SelectItem>
                            <SelectItem value="corporation">Corporation</SelectItem>
                            <SelectItem value="individual">Individual</SelectItem>
                            <SelectItem value="partnership">Partnership</SelectItem>
                            <SelectItem value="trust">Trust</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="taxId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tax ID (EIN)</FormLabel>
                      <FormControl>
                        <Input placeholder="XX-XXXXXXX" {...field} data-testid="input-tax-id" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Address</FormLabel>
                      <FormControl>
                        <Input placeholder="123 Main Street" {...field} />
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
                        <FormLabel>City</FormLabel>
                        <FormControl>
                          <Input placeholder="City" {...field} />
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
                        <FormLabel>State</FormLabel>
                        <FormControl>
                          <Input placeholder="CA" {...field} />
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
                        <FormLabel>ZIP</FormLabel>
                        <FormControl>
                          <Input placeholder="12345" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="border-t pt-4">
                  <h4 className="text-sm font-medium mb-3">Contact Information</h4>
                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="contactName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Contact Name</FormLabel>
                          <FormControl>
                            <Input placeholder="John Doe" {...field} data-testid="input-contact-name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="contactEmail"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input placeholder="contact@example.com" {...field} data-testid="input-contact-email" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="contactPhone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone Number</FormLabel>
                          <FormControl>
                            <Input placeholder="(555) 123-4567" {...field} data-testid="input-contact-phone" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="zelleInfo"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Zelle Information</FormLabel>
                          <FormControl>
                            <Input placeholder="Zelle email or phone number" {...field} data-testid="input-zelle-info" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  data-testid="button-save-entity"
                >
                  {(createMutation.isPending || updateMutation.isPending) ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : editingEntity ? (
                    "Update Entity"
                  ) : (
                    "Add Entity"
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
            placeholder="Search entities..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            data-testid="input-search-entities"
          />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Entities</CardTitle>
          <CardDescription>
            {entities?.length || 0} entities total
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : filteredEntities && filteredEntities.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Entity</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Payment Status</TableHead>
                    <TableHead className="w-[120px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEntities.map((entity) => (
                    <TableRow key={entity.id} className="border-b-0 cursor-pointer hover:bg-muted/50" data-testid={`entity-row-${entity.id}`} onClick={() => navigate(`/admin/entities/${entity.id}`)}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                            <Briefcase className="h-5 w-5 text-muted-foreground" />
                          </div>
                          <div>
                            <span className="font-medium" data-testid={`link-entity-${entity.id}`}>
                              {entity.name}
                            </span>
                            {entity.taxId && (
                              <p className="text-xs text-muted-foreground">
                                EIN: {entity.taxId}
                              </p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{getTypeLabel(entity.type)}</Badge>
                      </TableCell>
                      <TableCell>
                        {(entity.contactName || entity.contactEmail || entity.contactPhone) ? (
                          <div>
                            {entity.contactName && <p className="text-sm">{entity.contactName}</p>}
                            {entity.contactEmail && (
                              <p className="text-xs text-muted-foreground">{entity.contactEmail}</p>
                            )}
                            {entity.contactPhone && (
                              <p className="text-xs text-muted-foreground">{entity.contactPhone}</p>
                            )}
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">No contact</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {entity.paymentEnabled ? (
                          <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
                            <CreditCard className="h-3 w-3 mr-1" />
                            Connected
                          </Badge>
                        ) : (
                          <Badge variant="secondary">
                            Not Connected
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={(e) => { e.stopPropagation(); handleEdit(entity); }}
                            data-testid={`button-edit-entity-${entity.id}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm("Are you sure you want to delete this entity?")) {
                                deleteMutation.mutate(entity.id);
                              }
                            }}
                            data-testid={`button-delete-entity-${entity.id}`}
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
              <Briefcase className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No entities found</p>
              <p className="text-sm">Add your first entity to organize property ownership.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
