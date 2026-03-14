import { useState, useRef } from "react";
import { Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { PublicLayout } from "@/components/layout/public-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle, Loader2, Wrench, Camera, X, ImageIcon, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

const maintenanceSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email"),
  phone: z.string().min(10, "Please enter a valid phone number"),
  propertyAddress: z.string().min(5, "Please enter your property address"),
  unitLabel: z.string().optional(),
  category: z.string().min(1, "Please select a category"),
  description: z.string().min(1, "Please provide a description of the issue"),
  entryPermission: z.boolean().default(false),
  hasPets: z.boolean().default(false),
});

type MaintenanceFormData = z.infer<typeof maintenanceSchema>;

const categories = [
  { value: "plumbing", label: "Plumbing (leaks, clogs, water issues)" },
  { value: "electrical", label: "Electrical (outlets, lights, breakers)" },
  { value: "hvac", label: "HVAC (heating, cooling, ventilation)" },
  { value: "appliances", label: "Appliances (stove, fridge, dishwasher)" },
  { value: "structural", label: "Structural (doors, windows, floors)" },
  { value: "other", label: "Other" },
];

interface PhotoFile {
  file: File;
  preview: string;
}

export default function Maintenance() {
  const { toast } = useToast();
  const [ticketNumber, setTicketNumber] = useState<string | null>(null);
  const [photos, setPhotos] = useState<PhotoFile[]>([]);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<MaintenanceFormData>({
    resolver: zodResolver(maintenanceSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      propertyAddress: "",
      unitLabel: "",
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
        } catch (err) {
          console.error("Photo conversion failed:", err);
          toast({ title: "Photo upload failed", description: "Could not process photos. Please try again.", variant: "destructive" });
        } finally {
          setUploadingPhotos(false);
        }
      }
      const response = await apiRequest("POST", "/api/maintenance", {
        ...data,
        photos: photoData.length > 0 ? photoData : undefined,
      });
      return await response.json();
    },
    onSuccess: (data: any) => {
      setTicketNumber(data.ticketNumber);
      photos.forEach(p => URL.revokeObjectURL(p.preview));
      setPhotos([]);
      toast({
        title: "Request Submitted",
        description: `Your maintenance request has been received. Ticket #${data.ticketNumber}`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to submit request. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: MaintenanceFormData) => {
    mutation.mutate(data);
  };

  if (ticketNumber) {
    return (
      <PublicLayout>
        <div className="container mx-auto px-4 py-16 max-w-2xl">
          <Card className="text-center">
            <CardHeader className="pb-4">
              <div className="w-20 h-20 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="h-10 w-10 text-emerald-600 dark:text-emerald-400" />
              </div>
              <CardTitle className="text-2xl">Request Submitted Successfully!</CardTitle>
              <CardDescription>
                Your maintenance request has been received
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-muted rounded-lg p-6">
                <p className="text-sm text-muted-foreground mb-2">Your Ticket Number</p>
                <p className="text-3xl font-bold font-mono text-primary" data-testid="text-ticket-number">
                  {ticketNumber}
                </p>
              </div>
              <div className="text-sm text-muted-foreground space-y-2">
                <p>A confirmation email has been sent to your email address.</p>
                <p>Our maintenance team will review your request and contact you within 24-48 hours.</p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
                <Button onClick={() => { setTicketNumber(null); form.reset(); }} variant="outline">
                  Submit Another Request
                </Button>
                <Button onClick={() => window.location.href = "/"}>
                  Return Home
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout>
      <div className="container mx-auto px-4 py-8 md:py-12 max-w-3xl">
        <div className="mb-4">
          <Button variant="ghost" size="sm" onClick={() => window.history.back()} data-testid="button-back">
            <ArrowLeft className="h-4 w-4 mr-1.5" />
            Back
          </Button>
        </div>
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-amber-100 dark:bg-amber-900/30 mb-4">
            <Wrench className="h-8 w-8 text-amber-600 dark:text-amber-400" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-2">Maintenance Request</h1>
          <p className="text-muted-foreground">
            Submit your maintenance request and we'll get it resolved as quickly as possible.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Request Details</CardTitle>
            <CardDescription>
              Please provide as much detail as possible to help us resolve your issue quickly.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name *</FormLabel>
                        <FormControl>
                          <Input placeholder="John Doe" {...field} data-testid="input-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
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
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone Number *</FormLabel>
                        <FormControl>
                          <Input type="tel" placeholder="(555) 123-4567" {...field} data-testid="input-phone" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="unitLabel"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Unit/Apt Number</FormLabel>
                        <FormControl>
                          <Input placeholder="Apt 2B" {...field} data-testid="input-unit" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="propertyAddress"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Property Address *</FormLabel>
                      <FormControl>
                        <Input placeholder="123 Main Street, City, State 12345" {...field} data-testid="input-address" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

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
                      <FormLabel>Description of Issue *</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Please describe the issue in detail. Include when it started, what you've observed, and any relevant information that might help our maintenance team."
                          className="min-h-[120px] resize-y"
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
                  <FormDescription>Upload up to 10 photos of the issue to help our team.</FormDescription>
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
                        <div key={index} className="relative group w-24 h-24 rounded-md overflow-visible">
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
                      onClick={() => fileInputRef.current?.click()}
                      data-testid="button-add-photos"
                    >
                      <Camera className="mr-2 h-4 w-4" />
                      {photos.length === 0 ? "Add Photos" : "Add More Photos"}
                    </Button>
                  )}
                </div>

                <div className="space-y-4 pt-2">
                  <FormField
                    control={form.control}
                    name="entryPermission"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="checkbox-entry"
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Permission to Enter</FormLabel>
                          <FormDescription>
                            I give permission for maintenance staff to enter my unit if I'm not present.
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
                            data-testid="checkbox-pets"
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Pets on Premises</FormLabel>
                          <FormDescription>
                            Check this if you have pets that maintenance staff should be aware of.
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex justify-end pt-4">
                  <Button 
                    type="submit" 
                    size="lg" 
                    disabled={mutation.isPending}
                    data-testid="button-submit"
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
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </PublicLayout>
  );
}
