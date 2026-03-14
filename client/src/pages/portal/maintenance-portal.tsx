import { useState, useRef } from "react";
import { formatDate } from "@/lib/date-utils";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Wrench, Plus, Loader2, Clock, CheckCircle, AlertCircle, MessageSquare, Camera, X, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

const maintenanceSchema = z.object({
  category: z.string().min(1, "Please select a category"),
  description: z.string().min(1, "Please provide a description"),
  entryPermission: z.boolean().default(false),
  hasPets: z.boolean().default(false),
});

type MaintenanceFormData = z.infer<typeof maintenanceSchema>;

const categories = [
  { value: "plumbing", label: "Plumbing" },
  { value: "electrical", label: "Electrical" },
  { value: "hvac", label: "HVAC" },
  { value: "appliances", label: "Appliances" },
  { value: "structural", label: "Structural" },
  { value: "pest", label: "Pest Control" },
  { value: "exterior", label: "Exterior" },
  { value: "other", label: "Other" },
];

interface PhotoFile {
  file: File;
  preview: string;
}

export default function PortalMaintenance() {
  const { toast } = useToast();
  const [showNewRequest, setShowNewRequest] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [portalReplyText, setPortalReplyText] = useState("");
  const [photos, setPhotos] = useState<PhotoFile[]>([]);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: requests, isLoading } = useQuery<any[]>({
    queryKey: ["/api/portal/maintenance"],
  });

  const form = useForm<MaintenanceFormData>({
    resolver: zodResolver(maintenanceSchema),
    defaultValues: {
      category: "",
      description: "",
      entryPermission: false,
      hasPets: false,
    },
  });

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter(f => f.type.startsWith("image/"));
    if (validFiles.length + photos.length > 10) {
      toast({ title: "Limit Reached", description: "You can attach up to 10 photos.", variant: "destructive" });
      return;
    }
    const newPhotos = validFiles.map(file => ({
      file,
      preview: URL.createObjectURL(file),
    }));
    setPhotos(prev => [...prev, ...newPhotos]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removePhoto = (index: number) => {
    setPhotos(prev => {
      const updated = [...prev];
      URL.revokeObjectURL(updated[index].preview);
      updated.splice(index, 1);
      return updated;
    });
  };

  const resizeAndConvertToBase64 = (file: File, maxWidth = 1200, quality = 0.7): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          let width = img.width;
          let height = img.height;
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (!ctx) { reject(new Error("Canvas not supported")); return; }
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL("image/jpeg", quality);
          resolve(dataUrl);
        };
        img.onerror = () => reject(new Error("Failed to load image"));
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsDataURL(file);
    });
  };

  const convertPhotosToBase64 = async (): Promise<string[]> => {
    if (photos.length === 0) return [];
    const base64Photos: string[] = [];
    for (const photo of photos) {
      const base64 = await resizeAndConvertToBase64(photo.file);
      base64Photos.push(base64);
    }
    return base64Photos;
  };

  const mutation = useMutation({
    mutationFn: async (data: MaintenanceFormData) => {
      let photoData: string[] = [];
      if (photos.length > 0) {
        setUploadingPhotos(true);
        try {
          photoData = await convertPhotosToBase64();
        } catch (uploadErr) {
          console.error("Photo conversion failed:", uploadErr);
          toast({ title: "Photo upload failed", description: "Could not process photos. Please try again.", variant: "destructive" });
        } finally {
          setUploadingPhotos(false);
        }
      }
      const response = await apiRequest("POST", "/api/portal/maintenance", {
        ...data,
        photos: photoData.length > 0 ? photoData : undefined,
      });
      return await response.json();
    },
    onSuccess: (data: any) => {
      setShowNewRequest(false);
      form.reset();
      photos.forEach(p => URL.revokeObjectURL(p.preview));
      setPhotos([]);
      queryClient.invalidateQueries({ queryKey: ["/api/portal/maintenance"] });
      toast({
        title: "Request Submitted",
        description: `Ticket #${data.ticketNumber} has been created.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to submit request.",
        variant: "destructive",
      });
    },
  });

  const portalReplyMutation = useMutation({
    mutationFn: async ({ requestId, message }: { requestId: string; message: string }) => {
      return await apiRequest("POST", `/api/portal/maintenance/${requestId}/messages`, { message });
    },
    onSuccess: () => {
      setPortalReplyText("");
      queryClient.invalidateQueries({ queryKey: ["/api/portal/maintenance"] });
      toast({ title: "Message Sent" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message || "Failed to send message.", variant: "destructive" });
    },
  });

  const onSubmit = (data: MaintenanceFormData) => {
    mutation.mutate(data);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />;
      case "in_progress":
        return <Loader2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />;
      case "submitted":
        return <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" />;
      default:
        return <AlertCircle className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-emerald-100 dark:bg-emerald-900/30";
      case "in_progress":
        return "bg-blue-100 dark:bg-blue-900/30";
      case "submitted":
        return "bg-amber-100 dark:bg-amber-900/30";
      default:
        return "bg-muted";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Maintenance Requests</h1>
          <p className="text-muted-foreground">Submit and track maintenance requests</p>
        </div>
        <Dialog open={showNewRequest} onOpenChange={(open) => {
          setShowNewRequest(open);
          if (!open) {
            photos.forEach(p => URL.revokeObjectURL(p.preview));
            setPhotos([]);
          }
        }}>
          <DialogTrigger asChild>
            <Button data-testid="button-new-request">
              <Plus className="h-4 w-4 mr-2" />
              New Request
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>New Maintenance Request</DialogTitle>
              <DialogDescription>
                Describe the issue and we'll get it resolved
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Issue Category *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-category">
                            <SelectValue placeholder="Select a category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {categories.map((cat) => (
                            <SelectItem key={cat.value} value={cat.value}>
                              {cat.label}
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
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description *</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Please describe the issue in detail..."
                          className="min-h-[100px] resize-y"
                          {...field}
                          data-testid="textarea-description"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="space-y-3">
                  <FormLabel>Attach Photos (optional)</FormLabel>
                  <FormDescription>Upload up to 10 photos of the issue.</FormDescription>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handlePhotoSelect}
                    data-testid="input-photos"
                  />
                  {photos.length > 0 && (
                    <div className="flex flex-wrap gap-3">
                      {photos.map((photo, index) => (
                        <div key={index} className="relative group w-20 h-20 rounded-md overflow-visible">
                          <img
                            src={photo.preview}
                            alt={`Photo ${index + 1}`}
                            className="w-full h-full object-cover rounded-md"
                            data-testid={`img-photo-preview-${index}`}
                          />
                          <button
                            type="button"
                            onClick={() => removePhoto(index)}
                            className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-0.5"
                            data-testid={`button-remove-photo-${index}`}
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  {photos.length < 10 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      data-testid="button-add-photos"
                    >
                      <Camera className="mr-2 h-4 w-4" />
                      {photos.length === 0 ? "Add Photos" : "Add More"}
                    </Button>
                  )}
                </div>

                <div className="space-y-3">
                  <FormField
                    control={form.control}
                    name="entryPermission"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Permission to Enter</FormLabel>
                          <FormDescription>
                            Allow staff entry if I'm not present
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="hasPets"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Pets on Premises</FormLabel>
                        </div>
                      </FormItem>
                    )}
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={mutation.isPending}
                  data-testid="button-submit-request"
                >
                  {mutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {uploadingPhotos ? "Uploading Photos..." : "Submitting..."}
                    </>
                  ) : (
                    "Submit Request"
                  )}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
            <CardTitle className="text-sm font-medium">Open Requests</CardTitle>
            <Clock className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {requests?.filter((r: any) => r.status === "submitted").length || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <Loader2 className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {requests?.filter((r: any) => r.status === "in_progress").length || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {requests?.filter((r: any) => r.status === "completed").length || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your Requests</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : (requests?.length ?? 0) > 0 ? (
            <div className="space-y-3">
              {requests?.map((request: any) => (
                <div
                  key={request.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover-elevate cursor-pointer"
                  onClick={() => setSelectedRequest(request)}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${getStatusColor(request.status)}`}>
                      {getStatusIcon(request.status)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium capitalize">{request.category || "Maintenance"}</p>
                        <Badge variant="outline" className="text-xs">
                          #{request.ticketNumber}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-1">
                        {request.description}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Submitted: {formatDate(request.createdAt)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge
                      variant={request.status === "completed" ? "default" : "secondary"}
                      className="capitalize"
                    >
                      {request.status?.replace("_", " ")}
                    </Badge>
                    {request.priority === "emergency" && (
                      <Badge variant="destructive" className="ml-2">
                        Emergency
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Wrench className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No maintenance requests</p>
              <p className="text-sm">Submit a request when something needs fixing.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {selectedRequest && (
        <Dialog open={!!selectedRequest} onOpenChange={() => { setSelectedRequest(null); setPortalReplyText(""); }}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <span className="capitalize">{selectedRequest.category || "Maintenance"}</span>
                <Badge variant="outline">#{selectedRequest.ticketNumber}</Badge>
              </DialogTitle>
              <DialogDescription>
                Submitted on {formatDate(selectedRequest.createdAt)}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Status:</span>
                <Badge variant={selectedRequest.status === "completed" ? "default" : "secondary"} className="capitalize">
                  {selectedRequest.status?.replace("_", " ")}
                </Badge>
              </div>
              <div>
                <h4 className="font-medium mb-2">Description</h4>
                <p className="text-muted-foreground">{selectedRequest.description}</p>
              </div>
              {selectedRequest.photos && selectedRequest.photos.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Photos</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedRequest.photos.map((photo: string, idx: number) => (
                      <a key={idx} href={photo} target="_blank" rel="noopener noreferrer">
                        <img
                          src={photo}
                          alt={`Issue photo ${idx + 1}`}
                          className="w-20 h-20 object-cover rounded-md border"
                        />
                      </a>
                    ))}
                  </div>
                </div>
              )}
              <div className="pt-2 border-t">
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Messages
                </h4>
                {selectedRequest.messages?.length > 0 ? (
                  <div className="space-y-2 mb-3 max-h-48 overflow-y-auto">
                    {selectedRequest.messages.map((msg: any) => (
                      <div key={msg.id} className={`p-3 rounded-lg text-sm ${msg.senderType === "tenant" ? "bg-primary/10 ml-6" : "bg-muted mr-6"}`} data-testid={`message-${msg.id}`}>
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant={msg.senderType === "admin" ? "default" : "secondary"} className="text-xs">
                            {msg.senderType === "admin" ? "Management" : "You"}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {new Date(msg.createdAt).toLocaleString()}
                          </span>
                        </div>
                        <p>{msg.message}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground mb-3">No messages yet.</p>
                )}
                <div className="flex gap-2">
                  <Textarea
                    placeholder="Type a message..."
                    value={portalReplyText}
                    onChange={(e) => setPortalReplyText(e.target.value)}
                    rows={2}
                    className="flex-1"
                    data-testid="input-portal-reply"
                  />
                  <Button
                    size="sm"
                    className="self-end"
                    disabled={!portalReplyText.trim() || portalReplyMutation.isPending}
                    onClick={() => portalReplyMutation.mutate({ requestId: selectedRequest.id, message: portalReplyText })}
                    data-testid="button-portal-send-reply"
                  >
                    {portalReplyMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
