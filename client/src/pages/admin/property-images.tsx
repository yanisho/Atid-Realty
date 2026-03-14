import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Checkbox } from "@/components/ui/checkbox";
import { Upload, Trash2, Loader2, Search, ImagePlus, X, Image as ImageIcon, CheckSquare, Plus, Pencil } from "lucide-react";
import type { PublicProperty } from "@shared/schema";

function PropertyImage({ src, alt, className, "data-testid": testId }: { src: string; alt: string; className?: string; "data-testid"?: string }) {
  return <img src={src} alt={alt} className={className} data-testid={testId} loading="lazy" />;
}

export default function AdminPropertyImages() {
  const { toast } = useToast();
  const [searchId, setSearchId] = useState("");
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  const [deletingImage, setDeletingImage] = useState<string | null>(null);
  const [selectedImages, setSelectedImages] = useState<Set<string>>(new Set());
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingProperty, setEditingProperty] = useState<PublicProperty | null>(null);
  const [deletingProperty, setDeletingProperty] = useState<PublicProperty | null>(null);
  const emptyForm = { propertyId: "", address: "", unitNumber: "", bedrooms: 0, bathrooms: "1.0", ownerName: "" };
  const [propertyForm, setPropertyForm] = useState(emptyForm);

  const { data: properties, isLoading } = useQuery<PublicProperty[]>({
    queryKey: ["/api/admin/public-properties"],
  });

  const addPropertyMutation = useMutation({
    mutationFn: async (data: typeof emptyForm) => {
      const res = await apiRequest("POST", "/api/admin/public-properties", data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/public-properties"] });
      toast({ title: "Property added" });
      setShowAddDialog(false);
      setPropertyForm(emptyForm);
    },
    onError: (err: Error) => toast({ title: "Failed to add", description: err.message, variant: "destructive" }),
  });

  const editPropertyMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof emptyForm }) => {
      const res = await apiRequest("PATCH", `/api/admin/public-properties/${id}`, data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/public-properties"] });
      toast({ title: "Property updated" });
      setEditingProperty(null);
    },
    onError: (err: Error) => toast({ title: "Failed to update", description: err.message, variant: "destructive" }),
  });

  const deletePropertyMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/admin/public-properties/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/public-properties"] });
      if (deletingProperty && selectedPropertyId === deletingProperty.id) setSelectedPropertyId(null);
      toast({ title: "Property deleted" });
      setDeletingProperty(null);
    },
    onError: (err: Error) => toast({ title: "Failed to delete", description: err.message, variant: "destructive" }),
  });

  const filteredProperties = properties?.filter(p => {
    if (!searchId.trim()) return true;
    return p.propertyId.toLowerCase().includes(searchId.toLowerCase()) ||
      p.address.toLowerCase().includes(searchId.toLowerCase());
  }) || [];

  const selectedProperty = properties?.find(p => p.id === selectedPropertyId);

  const handleUpload = async (files: FileList | File[]) => {
    if (!selectedPropertyId) return;
    setUploading(true);
    try {
      const formData = new FormData();
      for (const file of Array.from(files)) {
        formData.append("images", file);
      }
      const token = localStorage.getItem("adminToken");
      const res = await fetch(`/api/admin/public-properties/${selectedPropertyId}/images/upload`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Upload failed");
      }
      queryClient.invalidateQueries({ queryKey: ["/api/admin/public-properties"] });
      toast({ title: `${Array.from(files).length} image${Array.from(files).length !== 1 ? "s" : ""} uploaded successfully` });
    } catch (error: any) {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const removeMutation = useMutation({
    mutationFn: async (imagePath: string) => {
      return await apiRequest("DELETE", `/api/admin/public-properties/${selectedPropertyId}/images`, { imagePath });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/public-properties"] });
      toast({ title: "Image removed" });
      setDeletingImage(null);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      setDeletingImage(null);
    },
  });

  const toggleImageSelection = (img: string) => {
    setSelectedImages(prev => {
      const next = new Set(prev);
      if (next.has(img)) next.delete(img);
      else next.add(img);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (!selectedProperty?.images) return;
    if (selectedImages.size === selectedProperty.images.length) {
      setSelectedImages(new Set());
    } else {
      setSelectedImages(new Set(selectedProperty.images));
    }
  };

  const handleBulkDelete = async () => {
    if (!selectedPropertyId || selectedImages.size === 0) return;
    setBulkDeleting(true);
    try {
      for (const img of Array.from(selectedImages)) {
        await apiRequest("DELETE", `/api/admin/public-properties/${selectedPropertyId}/images`, { imagePath: img });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/admin/public-properties"] });
      toast({ title: `${selectedImages.size} image${selectedImages.size !== 1 ? "s" : ""} removed` });
      setSelectedImages(new Set());
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setBulkDeleting(false);
      setShowBulkDeleteDialog(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    handleUpload(files);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold" data-testid="text-page-title">Property Images</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Manage photos for the public property search. Select a property to upload or remove images.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-4">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by ID or address..."
                value={searchId}
                onChange={(e) => setSearchId(e.target.value)}
                className="pl-9"
                data-testid="input-search-property"
              />
            </div>
            <Button
              size="sm"
              onClick={() => { setPropertyForm(emptyForm); setShowAddDialog(true); }}
              data-testid="button-add-property"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          <div className="space-y-1 max-h-[600px] overflow-y-auto">
            {filteredProperties.length === 0 && (
              <p className="text-sm text-muted-foreground p-4 text-center">No properties found</p>
            )}
            {filteredProperties.map((prop) => (
              <button
                key={prop.id}
                onClick={() => { setSelectedPropertyId(prop.id); setSelectedImages(new Set()); }}
                className={`group w-full text-left p-3 rounded-md transition-colors ${
                  selectedPropertyId === prop.id
                    ? "bg-primary/10 border border-primary/30"
                    : "hover-elevate"
                }`}
                data-testid={`button-select-property-${prop.propertyId}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm truncate">{prop.propertyId}</p>
                    <p className="text-xs text-muted-foreground truncate">{prop.address}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {prop.images && prop.images.length > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        {prop.images.length}
                      </Badge>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation();
                        setPropertyForm({
                          propertyId: prop.propertyId,
                          address: prop.address,
                          unitNumber: prop.unitNumber || "",
                          bedrooms: prop.bedrooms || 0,
                          bathrooms: prop.bathrooms || "1.0",
                          ownerName: prop.ownerName || "",
                        });
                        setEditingProperty(prop);
                      }}
                      data-testid={`button-edit-property-${prop.propertyId}`}
                    >
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-destructive"
                      onClick={(e) => { e.stopPropagation(); setDeletingProperty(prop); }}
                      data-testid={`button-delete-property-${prop.propertyId}`}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="lg:col-span-2">
          {!selectedProperty ? (
            <Card>
              <CardContent className="p-12 text-center">
                <ImageIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Select a property from the list to manage its images</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-3">
                <div className="min-w-0">
                  <CardTitle className="text-lg" data-testid="text-selected-property">
                    {selectedProperty.propertyId}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground truncate">{selectedProperty.address}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleFileSelect}
                    className="hidden"
                    data-testid="input-file-upload"
                  />
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    data-testid="button-upload-images"
                  >
                    {uploading ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <ImagePlus className="h-4 w-4 mr-2" />
                    )}
                    Upload Photos
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {(!selectedProperty.images || selectedProperty.images.length === 0) ? (
                  <div className="border-2 border-dashed rounded-md p-12 text-center">
                    <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground text-sm">No images yet. Click "Upload Photos" to add images for this property.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <p className="text-sm text-muted-foreground">
                        {selectedProperty.images.length} photo{selectedProperty.images.length !== 1 ? "s" : ""}
                        {selectedImages.size > 0 && ` (${selectedImages.size} selected)`}
                      </p>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={toggleSelectAll}
                          data-testid="button-select-all"
                        >
                          <CheckSquare className="h-4 w-4 mr-2" />
                          {selectedImages.size === selectedProperty.images.length ? "Deselect All" : "Select All"}
                        </Button>
                        {selectedImages.size > 0 && (
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => setShowBulkDeleteDialog(true)}
                            data-testid="button-delete-selected"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete ({selectedImages.size})
                          </Button>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {selectedProperty.images.map((img, idx) => (
                        <div
                          key={img}
                          className={`relative group rounded-md overflow-visible cursor-pointer ${selectedImages.has(img) ? "ring-2 ring-primary" : ""}`}
                          onClick={() => toggleImageSelection(img)}
                          data-testid={`img-container-${idx}`}
                        >
                          <PropertyImage
                            src={img}
                            alt={`Property ${selectedProperty.propertyId} - ${idx + 1}`}
                            className="w-full h-32 object-cover rounded-md"
                            data-testid={`img-property-${idx}`}
                          />
                          <div className="absolute top-1 left-1">
                            <Checkbox
                              checked={selectedImages.has(img)}
                              onCheckedChange={() => toggleImageSelection(img)}
                              className="bg-background/80 border-muted-foreground"
                              data-testid={`checkbox-image-${idx}`}
                              onClick={(e) => e.stopPropagation()}
                            />
                          </div>
                          <Button
                            size="icon"
                            variant="destructive"
                            className="absolute top-1 right-1 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                            style={{ visibility: "visible" }}
                            onClick={(e) => { e.stopPropagation(); setDeletingImage(img); }}
                            data-testid={`button-remove-image-${idx}`}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <AlertDialog open={showBulkDeleteDialog} onOpenChange={(open) => !open && setShowBulkDeleteDialog(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedImages.size} Image{selectedImages.size !== 1 ? "s" : ""}</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove {selectedImages.size} selected image{selectedImages.size !== 1 ? "s" : ""}? This will permanently delete the files.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={bulkDeleting} data-testid="button-cancel-bulk-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={bulkDeleting}
              data-testid="button-confirm-bulk-delete"
            >
              {bulkDeleting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Trash2 className="h-4 w-4 mr-2" />}
              Delete All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deletingImage} onOpenChange={(open) => !open && setDeletingImage(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Image</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this image? This will delete the file and remove it from the property listing.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deletingImage && (
            <div className="my-2">
              <PropertyImage src={deletingImage} alt="Image to remove" className="w-full max-h-48 object-cover rounded-md" />
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-remove">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingImage && removeMutation.mutate(deletingImage)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-remove"
            >
              {removeMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Trash2 className="h-4 w-4 mr-2" />}
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Property</DialogTitle>
            <DialogDescription>Add a new property to the listing.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Property ID</Label>
              <Input value={propertyForm.propertyId} onChange={(e) => setPropertyForm({ ...propertyForm, propertyId: e.target.value })} placeholder="e.g. 123456" data-testid="input-add-property-id" />
            </div>
            <div className="space-y-1">
              <Label>Address</Label>
              <Input value={propertyForm.address} onChange={(e) => setPropertyForm({ ...propertyForm, address: e.target.value })} placeholder="Full address" data-testid="input-add-address" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Unit Number</Label>
                <Input value={propertyForm.unitNumber} onChange={(e) => setPropertyForm({ ...propertyForm, unitNumber: e.target.value })} placeholder="Unit #" data-testid="input-add-unit" />
              </div>
              <div className="space-y-1">
                <Label>Owner Name</Label>
                <Input value={propertyForm.ownerName} onChange={(e) => setPropertyForm({ ...propertyForm, ownerName: e.target.value })} placeholder="Owner" data-testid="input-add-owner" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Bedrooms</Label>
                <Input type="number" value={propertyForm.bedrooms} onChange={(e) => setPropertyForm({ ...propertyForm, bedrooms: parseInt(e.target.value) || 0 })} data-testid="input-add-bedrooms" />
              </div>
              <div className="space-y-1">
                <Label>Bathrooms</Label>
                <Input value={propertyForm.bathrooms} onChange={(e) => setPropertyForm({ ...propertyForm, bathrooms: e.target.value })} data-testid="input-add-bathrooms" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)} data-testid="button-cancel-add">Cancel</Button>
            <Button onClick={() => addPropertyMutation.mutate(propertyForm)} disabled={addPropertyMutation.isPending || !propertyForm.propertyId || !propertyForm.address} data-testid="button-confirm-add">
              {addPropertyMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
              Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingProperty} onOpenChange={(open) => !open && setEditingProperty(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Property</DialogTitle>
            <DialogDescription>Update property details.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Property ID</Label>
              <Input value={propertyForm.propertyId} onChange={(e) => setPropertyForm({ ...propertyForm, propertyId: e.target.value })} data-testid="input-edit-property-id" />
            </div>
            <div className="space-y-1">
              <Label>Address</Label>
              <Input value={propertyForm.address} onChange={(e) => setPropertyForm({ ...propertyForm, address: e.target.value })} data-testid="input-edit-address" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Unit Number</Label>
                <Input value={propertyForm.unitNumber} onChange={(e) => setPropertyForm({ ...propertyForm, unitNumber: e.target.value })} data-testid="input-edit-unit" />
              </div>
              <div className="space-y-1">
                <Label>Owner Name</Label>
                <Input value={propertyForm.ownerName} onChange={(e) => setPropertyForm({ ...propertyForm, ownerName: e.target.value })} data-testid="input-edit-owner" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Bedrooms</Label>
                <Input type="number" value={propertyForm.bedrooms} onChange={(e) => setPropertyForm({ ...propertyForm, bedrooms: parseInt(e.target.value) || 0 })} data-testid="input-edit-bedrooms" />
              </div>
              <div className="space-y-1">
                <Label>Bathrooms</Label>
                <Input value={propertyForm.bathrooms} onChange={(e) => setPropertyForm({ ...propertyForm, bathrooms: e.target.value })} data-testid="input-edit-bathrooms" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingProperty(null)} data-testid="button-cancel-edit">Cancel</Button>
            <Button onClick={() => editingProperty && editPropertyMutation.mutate({ id: editingProperty.id, data: propertyForm })} disabled={editPropertyMutation.isPending} data-testid="button-confirm-edit">
              {editPropertyMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Pencil className="h-4 w-4 mr-2" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingProperty} onOpenChange={(open) => !open && setDeletingProperty(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Property</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete property "{deletingProperty?.propertyId}" ({deletingProperty?.address})? This will remove the property and all its images permanently.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete-property">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingProperty && deletePropertyMutation.mutate(deletingProperty.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deletePropertyMutation.isPending}
              data-testid="button-confirm-delete-property"
            >
              {deletePropertyMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Trash2 className="h-4 w-4 mr-2" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
