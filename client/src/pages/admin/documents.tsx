import { useState, useRef, useCallback, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { isoToDisplay, displayToIso, formatDate, snapToFirstOfMonth, snapToLastOfMonth } from "@/lib/date-utils";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, differenceInDays, lastDayOfMonth, addMonths, startOfMonth, parseISO } from "date-fns";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { FileText, CheckCircle, AlertTriangle, XCircle, Search, Download, Image, File, FileSpreadsheet, FileIcon, FolderOpen, Plus, Pencil, Trash2, Loader2, Upload, ArrowUpDown, ArrowUp, ArrowDown, Send, PenTool, Home, MapPin, DollarSign, Calendar, Mail, Phone, Clock, User, X, Eye, RefreshCw } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Lease, Property, Tenant, File as FileType, LeaseDocument } from "@shared/schema";
import PdfEditor from "@/components/pdf-editor";
import DocEditor from "@/components/doc-editor";

function getFileDownloadUrl(fileId: string, opts?: { attachment?: boolean }): string {
  const token = localStorage.getItem("adminToken");
  const params = new URLSearchParams();
  if (token) params.set("token", token);
  if (opts?.attachment) params.set("attachment", "true");
  const qs = params.toString();
  return `/api/admin/files/${fileId}/download${qs ? `?${qs}` : ""}`;
}

interface LeaseWithDetails extends Lease {
  property?: Property;
  tenant?: Tenant;
}

type LeaseStatus = "active" | "expiring" | "expired" | "vacant" | "no_lease";

const leaseFormSchema = z.object({
  propertyId: z.string().min(1, "Property is required"),
  tenantId: z.string().min(1, "Tenant is required"),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
  rentAmount: z.string().min(1, "Rent amount is required"),
  securityDeposit: z.string().optional(),
  lastMonthRent: z.string().optional(),
  leaseType: z.string().default("annual"),
  status: z.string().default("active"),
});

type LeaseFormData = z.infer<typeof leaseFormSchema>;

function parseUTCDate(dateStr: string | Date): Date {
  const d = typeof dateStr === "string" ? new Date(dateStr) : dateStr;
  return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

function getLeaseStatus(lease: Lease): LeaseStatus {
  if (lease.status === "vacant") return "vacant";
  if (lease.status === "no_lease") return "no_lease";

  const now = new Date();
  const endDate = parseUTCDate(lease.endDate);
  const startDate = parseUTCDate(lease.startDate);
  const daysUntilExpiry = differenceInDays(endDate, now);

  if (lease.status === "expired" || now > endDate) return "expired";
  if (now < startDate) return "active";
  if (daysUntilExpiry <= 30) return "expiring";
  return "active";
}

function SendLeaseDocStatus({ leaseId }: { leaseId: string }) {
  const { data, isLoading } = useQuery<{ hasDocument: boolean; documentId?: string; status?: string; landlordSigned?: boolean; tenantSigned?: boolean }>({
    queryKey: [`/api/admin/leases/${leaseId}/document`],
  });

  if (isLoading) return <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-3 w-3 animate-spin" /> Checking document status...</div>;

  if (!data?.hasDocument) {
    return (
      <div className="rounded-md border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 p-3 text-sm space-y-2">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          <span className="font-medium">No lease document created yet</span>
        </div>
        <p className="text-muted-foreground">Create a lease document first so the tenant receives a signing link. Without it, only lease details will be emailed.</p>
        <Link href={`/admin/lease-document/new?leaseId=${leaseId}`}>
          <Button variant="outline" size="sm" data-testid="button-create-doc-from-send">
            <PenTool className="h-3.5 w-3.5 mr-1.5" />
            Create Lease Document
          </Button>
        </Link>
      </div>
    );
  }

  const statusLabel = data.status === "fully_signed" ? "Fully Signed" : data.status === "partially_signed" ? "Partially Signed" : data.status === "sent" ? "Sent" : "Draft";
  const StatusIcon = data.status === "fully_signed" ? CheckCircle : data.status === "partially_signed" ? Clock : FileText;
  const statusColor = data.status === "fully_signed" ? "text-green-500" : data.status === "partially_signed" ? "text-blue-500" : "text-muted-foreground";

  return (
    <div className="rounded-md border p-3 text-sm space-y-1">
      <div className="flex items-center gap-2">
        <StatusIcon className={`h-4 w-4 ${statusColor}`} />
        <span className="font-medium">Lease Document: {statusLabel}</span>
      </div>
      {data.landlordSigned && <p className="text-muted-foreground flex items-center gap-1"><CheckCircle className="h-3 w-3 text-green-500" /> Landlord signed</p>}
      {data.tenantSigned && <p className="text-muted-foreground flex items-center gap-1"><CheckCircle className="h-3 w-3 text-green-500" /> Tenant signed</p>}
      {!data.tenantSigned && <p className="text-muted-foreground">Email will include a signing link for the tenant.</p>}
      {data.tenantSigned && <p className="text-muted-foreground">Tenant has already signed. Email will include lease details only.</p>}
    </div>
  );
}

export default function AdminDocuments() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [leaseSearchQuery, setLeaseSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<LeaseStatus | null>(null);
  const [activeTab, setActiveTab] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get("tab");
    if (tab === "files" || tab === "signed") return tab;
    return "leases";
  });
  const [endDateSort, setEndDateSort] = useState<"asc" | "desc" | null>(null);
  const [termSort, setTermSort] = useState<"asc" | "desc" | null>(null);
  const [statusSort, setStatusSort] = useState<"asc" | "desc" | null>(null);
  const [tenantSort, setTenantSort] = useState<"asc" | "desc" | null>(null);
  const [leaseDocSort, setLeaseDocSort] = useState<"asc" | "desc" | null>(null);
  const [propertySort, setPropertySort] = useState<"asc" | "desc" | null>(null);
  const [rentSort, setRentSort] = useState<"asc" | "desc" | null>(null);
  const [lastMonthSort, setLastMonthSort] = useState<"asc" | "desc" | null>(null);
  const [depositSort, setDepositSort] = useState<"asc" | "desc" | null>(null);
  const [signedPropertySort, setSignedPropertySort] = useState<"asc" | "desc" | null>(null);
  const [signedTenantSort, setSignedTenantSort] = useState<"asc" | "desc" | null>(null);
  const [signedStatusSort, setSignedStatusSort] = useState<"asc" | "desc" | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedLease, setSelectedLease] = useState<LeaseWithDetails | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showSendDialog, setShowSendDialog] = useState(false);
  const [sendLeaseTarget, setSendLeaseTarget] = useState<LeaseWithDetails | null>(null);
  const [sendEmail, setSendEmail] = useState("");
  const [showRenewDialog, setShowRenewDialog] = useState(false);
  const [renewTarget, setRenewTarget] = useState<LeaseWithDetails | null>(null);
  const [renewStartDate, setRenewStartDate] = useState("");
  const [renewEndDate, setRenewEndDate] = useState("");
  const [renewRent, setRenewRent] = useState("");
  const [renewLeaseType, setRenewLeaseType] = useState<string>("annual");
  const [viewingLease, setViewingLease] = useState<LeaseWithDetails | null>(null);
  const [renamingFile, setRenamingFile] = useState<FileType | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [showDocPickerDialog, setShowDocPickerDialog] = useState(false);
  const [docPickerSearch, setDocPickerSearch] = useState("");
  const [docViewerFile, setDocViewerFile] = useState<{ id: string; filename: string } | null>(null);
  const [docViewerHtml, setDocViewerHtml] = useState("");
  const [docViewerLoading, setDocViewerLoading] = useState(false);
  const [pdfEditorFile, setPdfEditorFile] = useState<{ url: string; filename: string; leaseId?: string } | null>(null);
  const [leaseAttachment, setLeaseAttachment] = useState<globalThis.File | null>(null);
  const [isUploadingDetailLease, setIsUploadingDetailLease] = useState(false);
  const [reuploadingFileId, setReuploadingFileId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const leaseFileInputRef = useRef<HTMLInputElement>(null);
  const detailLeaseFileInputRef = useRef<HTMLInputElement>(null);
  const reuploadFileInputRef = useRef<HTMLInputElement>(null);
  const [, navigate] = useLocation();
  
  const { data: leases, isLoading: leasesLoading } = useQuery<LeaseWithDetails[]>({
    queryKey: ["/api/admin/leases"],
  });

  const { data: files, isLoading: filesLoading } = useQuery<FileType[]>({
    queryKey: ["/api/admin/files"],
  });

  const { data: properties } = useQuery<Property[]>({
    queryKey: ["/api/admin/properties"],
  });

  const { data: tenants } = useQuery<Tenant[]>({
    queryKey: ["/api/admin/tenants"],
  });

  const { data: leaseDocuments } = useQuery<LeaseDocument[]>({
    queryKey: ["/api/admin/lease-documents"],
  });

  const defaultStartDate = format(startOfMonth(new Date()), "yyyy-MM-dd");
  const defaultEndDate = format(lastDayOfMonth(addMonths(new Date(), 11)), "yyyy-MM-dd");

  const createForm = useForm<LeaseFormData>({
    resolver: zodResolver(leaseFormSchema),
    defaultValues: {
      propertyId: "",
      tenantId: "",
      startDate: defaultStartDate,
      endDate: defaultEndDate,
      rentAmount: "",
      securityDeposit: "",
      lastMonthRent: "",
      leaseType: "annual",
      status: "active",
    },
  });

  const editForm = useForm<LeaseFormData>({
    resolver: zodResolver(leaseFormSchema),
    defaultValues: {
      propertyId: "",
      tenantId: "",
      startDate: "",
      endDate: "",
      rentAmount: "",
      securityDeposit: "",
      lastMonthRent: "",
      leaseType: "annual",
      status: "active",
    },
  });

  const uploadLeaseFile = async (leaseId: string, file: globalThis.File) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("ownerType", "lease");
    formData.append("ownerId", leaseId);
    const token = localStorage.getItem("adminToken");
    const headers: Record<string, string> = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;
    const res = await fetch("/api/admin/files/upload", {
      method: "POST",
      body: formData,
      credentials: "include",
      headers,
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "File upload failed");
    }
    return res.json();
  };

  const handleReupload = async (fileId: string, file: globalThis.File) => {
    try {
      const formData = new FormData();
      formData.append("file", file);
      const token = localStorage.getItem("adminToken");
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const res = await fetch(`/api/admin/files/${fileId}/reupload`, {
        method: "POST",
        body: formData,
        credentials: "include",
        headers,
      });
      if (!res.ok) throw new Error("Re-upload failed");
      queryClient.invalidateQueries({ queryKey: ["/api/admin/files"] });
      toast({ title: "File re-uploaded", description: "The file has been restored successfully." });
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to re-upload file", variant: "destructive" });
    }
    setReuploadingFileId(null);
  };

  const openDocViewer = async (fileId: string, filename: string) => {
    setDocViewerFile({ id: fileId, filename });
    setDocViewerHtml("");
    setDocViewerLoading(true);
    try {
      const token = localStorage.getItem("adminToken");
      const res = await fetch(`/api/admin/files/${fileId}/html${token ? `?token=${encodeURIComponent(token)}` : ""}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error("Failed to load document");
      const data = await res.json();
      setDocViewerHtml(data.html);
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Could not load document", variant: "destructive" });
      setDocViewerFile(null);
    } finally {
      setDocViewerLoading(false);
    }
  };



  const handleDetailLeaseUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !viewingLease) return;

    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];

    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: "Please upload a PDF or Word document.",
        variant: "destructive",
      });
      return;
    }

    setIsUploadingDetailLease(true);
    try {
      const uploadedFile = await uploadLeaseFile(viewingLease.id, file);
      await apiRequest("PATCH", `/api/admin/leases/${viewingLease.id}`, {
        leaseFileId: uploadedFile.id,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/leases"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/files"] });
      setViewingLease({ ...viewingLease, leaseFileId: uploadedFile.id });
      toast({ title: "Lease file uploaded successfully" });
    } catch (error) {
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Failed to upload lease file",
        variant: "destructive",
      });
    } finally {
      setIsUploadingDetailLease(false);
      if (detailLeaseFileInputRef.current) {
        detailLeaseFileInputRef.current.value = "";
      }
    }
  };

  const createMutation = useMutation({
    mutationFn: async (data: LeaseFormData) => {
      const res = await apiRequest("POST", "/api/admin/leases", {
        propertyId: data.propertyId,
        tenantId: data.tenantId,
        rentAmount: data.rentAmount,
        depositAmount: data.securityDeposit || "0",
        lastMonthRent: data.lastMonthRent || null,
        leaseType: data.leaseType,
        status: data.status,
        startDate: data.startDate,
        endDate: data.endDate,
      });
      const result = await res.json();
      if (leaseAttachment && result?.id) {
        await uploadLeaseFile(result.id, leaseAttachment);
      }
      return result;
    },
    onSuccess: () => {
      setShowCreateDialog(false);
      createForm.reset();
      setLeaseAttachment(null);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/leases"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/files"] });
      toast({ title: "Lease created successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const editMutation = useMutation({
    mutationFn: async (data: LeaseFormData & { id: string }) => {
      const { id, ...updateData } = data;
      const result = await apiRequest("PATCH", `/api/admin/leases/${id}`, {
        propertyId: updateData.propertyId,
        tenantId: updateData.tenantId,
        rentAmount: updateData.rentAmount,
        depositAmount: updateData.securityDeposit || "0",
        lastMonthRent: updateData.lastMonthRent || null,
        leaseType: updateData.leaseType,
        status: updateData.status,
        startDate: updateData.startDate,
        endDate: updateData.endDate,
      });
      if (leaseAttachment) {
        await uploadLeaseFile(id, leaseAttachment);
      }
      return result;
    },
    onSuccess: () => {
      setShowEditDialog(false);
      setSelectedLease(null);
      editForm.reset();
      setLeaseAttachment(null);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/leases"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/files"] });
      toast({ title: "Lease updated successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteLeaseMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/admin/leases/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/leases"] });
      toast({ title: "Lease deleted successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const renameFileMutation = useMutation({
    mutationFn: async ({ id, filename }: { id: string; filename: string }) => {
      return await apiRequest("PATCH", `/api/admin/files/${id}`, { filename });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/files"] });
      toast({ title: "File renamed successfully" });
      setRenamingFile(null);
      setRenameValue("");
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteFileMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/admin/files/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/files"] });
      toast({ title: "File deleted successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const sendLeaseMutation = useMutation({
    mutationFn: async ({ leaseId, email }: { leaseId: string; email: string }) => {
      const res = await apiRequest("POST", `/api/admin/leases/${leaseId}/send`, { email });
      return res.json();
    },
    onSuccess: (data) => {
      setShowSendDialog(false);
      setSendLeaseTarget(null);
      setSendEmail("");
      toast({
        title: "Lease sent successfully",
        description: data.hasSigningLink
          ? "Lease with signing link has been emailed to the tenant."
          : "Lease details emailed. Create a lease document to include a signing link next time.",
      });
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
    const oldEnd = new Date(lease.endDate);
    const newStart = new Date(oldEnd);
    newStart.setDate(newStart.getDate() + 1);
    const newEnd = new Date(newStart);
    if (lease.leaseType === "m2m") {
      newEnd.setMonth(newEnd.getMonth() + 1);
    } else {
      newEnd.setFullYear(newEnd.getFullYear() + 1);
    }
    setRenewStartDate(format(newStart, "yyyy-MM-dd"));
    setRenewEndDate(format(newEnd, "yyyy-MM-dd"));
    setRenewRent(String(lease.rentAmount || "0"));
    setRenewLeaseType(lease.leaseType || "annual");
    setShowRenewDialog(true);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ];

    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: "Please upload a PDF, Word, or Excel file.",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("ownerType", "general");
    formData.append("ownerId", "admin");

    try {
      const response = await fetch("/api/admin/files/upload", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Upload failed");
      }

      queryClient.invalidateQueries({ queryKey: ["/api/admin/files"] });
      toast({ title: "File uploaded successfully" });
    } catch (error) {
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Failed to upload file",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const openEditDialog = (lease: LeaseWithDetails) => {
    setSelectedLease(lease);
    editForm.reset({
      propertyId: lease.propertyId || "",
      tenantId: lease.tenantId || "",
      startDate: lease.startDate ? format(parseUTCDate(lease.startDate), "yyyy-MM-dd") : "",
      endDate: lease.endDate ? format(parseUTCDate(lease.endDate), "yyyy-MM-dd") : "",
      rentAmount: lease.rentAmount || "",
      securityDeposit: lease.depositAmount || "",
      lastMonthRent: lease.lastMonthRent || "",
      leaseType: lease.leaseType || "annual",
      status: lease.status || "active",
    });
    setShowEditDialog(true);
  };

  const stripMoneyCommas = (d: LeaseFormData) => ({
    ...d,
    rentAmount: d.rentAmount?.replace(/,/g, ''),
    securityDeposit: d.securityDeposit?.replace(/,/g, ''),
    lastMonthRent: d.lastMonthRent?.replace(/,/g, ''),
  });

  const onCreateSubmit = (data: LeaseFormData) => {
    createMutation.mutate(stripMoneyCommas(data));
  };

  const onEditSubmit = (data: LeaseFormData) => {
    if (selectedLease) {
      editMutation.mutate({ ...stripMoneyCommas(data), id: selectedLease.id });
    }
  };

  const generalFiles = files?.filter((file) => file.ownerType !== "lease");

  const filteredFiles = generalFiles?.filter((file) =>
    file.filename.toLowerCase().includes(searchQuery.toLowerCase()) ||
    file.ownerType.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getFileIcon = (mimeType: string | null) => {
    if (!mimeType) return <FileIcon className="h-5 w-5" />;
    if (mimeType.startsWith("image/")) return <Image className="h-5 w-5 text-purple-600" />;
    if (mimeType.includes("pdf")) return <FileText className="h-5 w-5 text-red-600" />;
    if (mimeType.includes("spreadsheet") || mimeType.includes("excel")) return <FileSpreadsheet className="h-5 w-5 text-green-600" />;
    return <File className="h-5 w-5 text-blue-600" />;
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "N/A";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const allLeases = leases || [];
  const activeLeases = allLeases.filter(l => getLeaseStatus(l) === "active").length;
  const expiringLeases = allLeases.filter(l => getLeaseStatus(l) === "expiring").length;
  const nonExpiredLeases = allLeases.filter(l => getLeaseStatus(l) !== "expired");
  const signedLeaseDocuments = (leaseDocuments || []).filter(d => {
    if (d.status !== "fully_signed" && d.status !== "partially_signed" && d.status !== "sent" && d.status !== "draft") return false;
    const lease = nonExpiredLeases.find(l => l.id === d.leaseId);
    return !!lease;
  });
  const leasesWithDigitalDoc = new Set(signedLeaseDocuments.map(d => d.leaseId));
  const leasesWithUploadedFile = nonExpiredLeases.filter(l => {
    if (leasesWithDigitalDoc.has(l.id)) return false;
    const file = l.leaseFileId
      ? files?.find(f => f.id === l.leaseFileId)
      : files?.find(f => f.ownerType === "lease" && f.ownerId === l.id);
    return !!file;
  });
  const leasesWithUploadedIds = new Set(leasesWithUploadedFile.map(l => l.id));
  const leasesWithNoDoc = nonExpiredLeases.filter(l => {
    if (leasesWithDigitalDoc.has(l.id)) return false;
    if (leasesWithUploadedIds.has(l.id)) return false;
    return true;
  });
  const totalSignedCount = nonExpiredLeases.length;

  type SignedRow = { type: "digital"; doc: (typeof signedLeaseDocuments)[0]; propertyName: string; tenantName: string; statusOrder: number }
    | { type: "uploaded"; lease: LeaseWithDetails; propertyName: string; tenantName: string; statusOrder: number }
    | { type: "no_doc"; lease: LeaseWithDetails; propertyName: string; tenantName: string; statusOrder: number };

  const statusOrderMap: Record<string, number> = { fully_signed: 1, partially_signed: 2, sent: 3, draft: 4, uploaded: 5, no_doc: 6 };

  const allSignedRows: SignedRow[] = [
    ...signedLeaseDocuments.map(doc => {
      const lease = allLeases.find(l => l.id === doc.leaseId);
      return {
        type: "digital" as const,
        doc,
        propertyName: (lease?.property?.name || doc.premisesAddress || "").toLowerCase(),
        tenantName: (doc.tenantNames || "").toLowerCase(),
        statusOrder: statusOrderMap[doc.status || "draft"] || 4,
      };
    }),
    ...leasesWithUploadedFile.map(lease => ({
      type: "uploaded" as const,
      lease,
      propertyName: (lease.property?.name || "").toLowerCase(),
      tenantName: lease.tenant ? `${lease.tenant.firstName} ${lease.tenant.lastName}`.toLowerCase() : "",
      statusOrder: statusOrderMap["uploaded"],
    })),
    ...leasesWithNoDoc.map(lease => ({
      type: "no_doc" as const,
      lease,
      propertyName: (lease.property?.name || "").toLowerCase(),
      tenantName: lease.tenant ? `${lease.tenant.firstName} ${lease.tenant.lastName}`.toLowerCase() : "",
      statusOrder: statusOrderMap["no_doc"],
    })),
  ];

  const filteredSignedRows = allSignedRows.filter(row => {
    if (!leaseSearchQuery.trim()) return true;
    const q = leaseSearchQuery.trim().toLowerCase();
    return row.propertyName.includes(q) || row.tenantName.includes(q);
  });

  const sortedSignedRows = [...filteredSignedRows].sort((a, b) => {
    if (signedPropertySort) {
      const cmp = a.propertyName.localeCompare(b.propertyName);
      return signedPropertySort === "asc" ? cmp : -cmp;
    }
    if (signedTenantSort) {
      const cmp = a.tenantName.localeCompare(b.tenantName);
      return signedTenantSort === "asc" ? cmp : -cmp;
    }
    if (signedStatusSort) {
      const cmp = a.statusOrder - b.statusOrder;
      return signedStatusSort === "asc" ? cmp : -cmp;
    }
    return 0;
  });

  const filteredLeases = allLeases.filter((lease) => {
    const status = getLeaseStatus(lease);
    if (statusFilter && status !== statusFilter) return false;
    if (!leaseSearchQuery.trim()) return true;
    const query = leaseSearchQuery.toLowerCase();
    const propertyName = lease.property?.name?.toLowerCase() || "";
    const propertyAddress = lease.property?.address?.toLowerCase() || "";
    const propertyCity = lease.property?.city?.toLowerCase() || "";
    const tenantName = lease.tenant ? `${lease.tenant.firstName} ${lease.tenant.lastName}`.toLowerCase() : "";
    const unitId = lease.unitId?.toLowerCase() || "";
    const leaseType = lease.leaseType === "m2m" ? "month-to-month m2m" : "annual";
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
  if (propertySort) {
    sortedLeases = [...sortedLeases].sort((a, b) => {
      const nameA = (a.property?.name || "").toLowerCase();
      const nameB = (b.property?.name || "").toLowerCase();
      return propertySort === "asc" ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
    });
  }
  if (endDateSort) {
    sortedLeases = [...sortedLeases].sort((a, b) => {
      const dateA = new Date(a.endDate).getTime();
      const dateB = new Date(b.endDate).getTime();
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
  if (statusSort) {
    const statusOrder: Record<LeaseStatus, number> = { active: 0, expiring: 1, expired: 2 };
    sortedLeases = [...sortedLeases].sort((a, b) => {
      const statusA = statusOrder[getLeaseStatus(a)];
      const statusB = statusOrder[getLeaseStatus(b)];
      return statusSort === "asc" ? statusA - statusB : statusB - statusA;
    });
  }
  if (tenantSort) {
    sortedLeases = [...sortedLeases].sort((a, b) => {
      const nameA = a.tenant ? `${a.tenant.lastName} ${a.tenant.firstName}`.toLowerCase() : "";
      const nameB = b.tenant ? `${b.tenant.lastName} ${b.tenant.firstName}`.toLowerCase() : "";
      return tenantSort === "asc" ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
    });
  }
  if (rentSort) {
    sortedLeases = [...sortedLeases].sort((a, b) => {
      const valA = parseFloat(a.rentAmount || "0") || 0;
      const valB = parseFloat(b.rentAmount || "0") || 0;
      return rentSort === "asc" ? valA - valB : valB - valA;
    });
  }
  if (lastMonthSort) {
    sortedLeases = [...sortedLeases].sort((a, b) => {
      const valA = parseFloat(a.lastMonthRent || "0") || 0;
      const valB = parseFloat(b.lastMonthRent || "0") || 0;
      return lastMonthSort === "asc" ? valA - valB : valB - valA;
    });
  }
  if (depositSort) {
    sortedLeases = [...sortedLeases].sort((a, b) => {
      const valA = parseFloat(a.depositAmount || "0") || 0;
      const valB = parseFloat(b.depositAmount || "0") || 0;
      return depositSort === "asc" ? valA - valB : valB - valA;
    });
  }
  if (leaseDocSort) {
    const docOrder = (lease: LeaseWithDetails) => {
      const doc = leaseDocuments?.find(d => d.leaseId === lease.id);
      if (!doc) return 0;
      if (doc.status === "fully_signed") return 3;
      if (doc.status === "partially_signed") return 2;
      return 1;
    };
    sortedLeases = [...sortedLeases].sort((a, b) => {
      const orderA = docOrder(a);
      const orderB = docOrder(b);
      return leaseDocSort === "asc" ? orderA - orderB : orderB - orderA;
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

  const toggleStatusSort = () => {
    setStatusSort((prev) => {
      if (prev === null) return "asc";
      if (prev === "asc") return "desc";
      return null;
    });
  };

  const toggleTenantSort = () => {
    setTenantSort((prev) => {
      if (prev === null) return "asc";
      if (prev === "asc") return "desc";
      return null;
    });
  };

  const toggleLeaseDocSort = () => {
    setLeaseDocSort((prev) => {
      if (prev === null) return "asc";
      if (prev === "asc") return "desc";
      return null;
    });
  };

  const togglePropertySort = () => {
    setPropertySort((prev) => {
      if (prev === null) return "asc";
      if (prev === "asc") return "desc";
      return null;
    });
  };

  const toggleRentSort = () => {
    setRentSort((prev) => {
      if (prev === null) return "asc";
      if (prev === "asc") return "desc";
      return null;
    });
  };

  const toggleLastMonthSort = () => {
    setLastMonthSort((prev) => {
      if (prev === null) return "asc";
      if (prev === "asc") return "desc";
      return null;
    });
  };

  const toggleDepositSort = () => {
    setDepositSort((prev) => {
      if (prev === null) return "asc";
      if (prev === "asc") return "desc";
      return null;
    });
  };

  const LeaseFormFields = ({ form, isPending }: { form: typeof createForm; isPending: boolean }) => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="propertyId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Property</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger data-testid="select-property">
                    <SelectValue placeholder="Select property" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
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
          name="tenantId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tenant</FormLabel>
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
      </div>
      <div className="grid grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="startDate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Start Date</FormLabel>
              <FormControl>
                <Input type="text" placeholder="MM.DD.YYYY" data-testid="input-start-date" value={isoToDisplay(field.value) || field.value} onChange={(e) => field.onChange(e.target.value)} onBlur={(e) => { const iso = displayToIso(e.target.value); if (iso) field.onChange(snapToFirstOfMonth(iso)); }} />
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
                <Input type="text" placeholder="MM.DD.YYYY" data-testid="input-end-date" value={isoToDisplay(field.value) || field.value} onChange={(e) => field.onChange(e.target.value)} onBlur={(e) => { const iso = displayToIso(e.target.value); if (iso) field.onChange(snapToLastOfMonth(iso)); }} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="rentAmount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Monthly Rent ($)</FormLabel>
              <FormControl>
                <Input type="text" inputMode="decimal" placeholder="1,500" {...field} onFocus={(e) => e.target.select()} data-testid="input-rent" />
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
              <FormLabel>Security Deposit ($)</FormLabel>
              <FormControl>
                <Input type="text" inputMode="decimal" placeholder="1,500" {...field} onFocus={(e) => e.target.select()} data-testid="input-deposit" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="lastMonthRent"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Last Month Rent ($)</FormLabel>
              <FormControl>
                <Input type="text" inputMode="decimal" placeholder="1,500" {...field} onFocus={(e) => e.target.select()} data-testid="input-last-month-rent" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="leaseType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Term Type</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger data-testid="select-lease-type">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="annual">Annual</SelectItem>
                  <SelectItem value="m2m">Month-to-Month</SelectItem>
                </SelectContent>
              </Select>
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
            <Select onValueChange={field.onChange} value={field.value}>
              <FormControl>
                <SelectTrigger data-testid="select-status">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
                <SelectItem value="vacant">Vacant</SelectItem>
                <SelectItem value="no_lease">No Lease</SelectItem>
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />
      <div>
        <FormLabel>Attach Lease Document (Optional)</FormLabel>
        <div className="mt-2">
          <input
            ref={leaseFileInputRef}
            type="file"
            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
            onChange={(e) => {
              const file = e.target.files?.[0] || null;
              setLeaseAttachment(file);
            }}
            className="hidden"
            data-testid="input-lease-file"
          />
          {leaseAttachment ? (
            <div className="flex items-center gap-2 p-3 rounded-md bg-muted">
              <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-sm truncate flex-1">{leaseAttachment.name}</span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => {
                  setLeaseAttachment(null);
                  if (leaseFileInputRef.current) leaseFileInputRef.current.value = "";
                }}
                data-testid="button-remove-lease-file"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => leaseFileInputRef.current?.click()}
              data-testid="button-attach-lease-file"
            >
              <Upload className="h-4 w-4 mr-2" />
              Upload Lease File
            </Button>
          )}
        </div>
      </div>
      <DialogFooter>
        <Button type="submit" disabled={isPending} data-testid="button-submit-lease">
          {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Save Lease
        </Button>
      </DialogFooter>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Documents</h1>
          <p className="text-muted-foreground">Manage leases and uploaded files</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" onClick={() => { setShowDocPickerDialog(true); setDocPickerSearch(""); }} data-testid="button-create-lease-document">
            <PenTool className="h-4 w-4 mr-2" />
            Create Lease Document
          </Button>
          <Dialog open={showCreateDialog} onOpenChange={(open) => { setShowCreateDialog(open); if (open) setLeaseAttachment(null); }}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-lease">
                <Plus className="h-4 w-4 mr-2" />
                Add Lease
              </Button>
            </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Add New Lease</DialogTitle>
              <DialogDescription>Create a new lease agreement</DialogDescription>
            </DialogHeader>
            <Form {...createForm}>
              <form onSubmit={createForm.handleSubmit(onCreateSubmit)}>
                <LeaseFormFields form={createForm} isPending={createMutation.isPending} />
              </form>
            </Form>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="hover-elevate cursor-pointer h-full" data-testid="card-total-leases" onClick={() => { setStatusFilter(null); setActiveTab("leases"); }}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
            <CardTitle className="text-sm font-medium">Total Leases</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-total-leases">{allLeases.length}</div>
            <p className="text-xs text-muted-foreground">{activeLeases} active</p>
          </CardContent>
        </Card>

        <Card className="hover-elevate cursor-pointer h-full" data-testid="card-expiring-soon" onClick={() => { setStatusFilter("expiring"); setActiveTab("leases"); }}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
            <CardTitle className="text-sm font-medium">Expiring Soon</CardTitle>
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600" data-testid="stat-expiring-leases">{expiringLeases}</div>
            <p className="text-xs text-muted-foreground">Within 30 days</p>
          </CardContent>
        </Card>

        <Card className="hover-elevate cursor-pointer h-full" data-testid="card-total-files" onClick={() => setActiveTab("files")}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
            <CardTitle className="text-sm font-medium">Total Files</CardTitle>
            <FolderOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-total-files">{generalFiles?.length || 0}</div>
            <p className="text-xs text-muted-foreground">General documents</p>
          </CardContent>
        </Card>

        <Card className="hover-elevate cursor-pointer h-full" data-testid="card-signed-leases" onClick={() => setActiveTab("signed")}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
            <CardTitle className="text-sm font-medium">Signed Leases</CardTitle>
            <CheckCircle className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600" data-testid="stat-signed-leases">{totalSignedCount}</div>
            <p className="text-xs text-muted-foreground">Fully executed</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="leases" data-testid="tab-leases">
            <FileText className="h-4 w-4 mr-2" />
            Leases ({allLeases.length})
          </TabsTrigger>
          <TabsTrigger value="files" data-testid="tab-files">
            <FolderOpen className="h-4 w-4 mr-2" />
            Files ({generalFiles?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="signed" data-testid="tab-signed-leases">
            <CheckCircle className="h-4 w-4 mr-2" />
            Signed Leases ({totalSignedCount})
          </TabsTrigger>
        </TabsList>

        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search leases..."
            value={leaseSearchQuery}
            onChange={(e) => setLeaseSearchQuery(e.target.value)}
            className="pl-9"
            data-testid="input-search-leases"
          />
        </div>

        <TabsContent value="leases">
          <Card>
            <CardHeader>
              <CardTitle>All Leases</CardTitle>
              <div className="flex items-center gap-2 flex-wrap">
                <CardDescription>Manage all lease agreements across properties</CardDescription>
                {statusFilter && (
                  <Badge 
                    variant="outline" 
                    className="cursor-pointer gap-1"
                    onClick={() => setStatusFilter(null)}
                    data-testid="badge-clear-filter"
                  >
                    Showing: {statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)}
                    <XCircle className="h-3 w-3" />
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {leasesLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : allLeases.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No leases found</p>
                  <Button className="mt-4" onClick={() => setShowCreateDialog(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add First Lease
                  </Button>
                </div>
              ) : filteredLeases.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No leases match your {statusFilter ? "filter" : "search"}</p>
                  <Button variant="outline" className="mt-4" onClick={() => { setLeaseSearchQuery(""); setStatusFilter(null); }} data-testid="button-clear-lease-search">
                    Clear {statusFilter ? "Filter" : "Search"}
                  </Button>
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>
                          <Button variant="ghost" size="sm" className="gap-1 -ml-3 text-xs h-8 px-2 whitespace-nowrap" onClick={togglePropertySort} data-testid="button-sort-property">
                            Property
                            {propertySort === "asc" ? <ArrowUp className="h-3 w-3" /> : propertySort === "desc" ? <ArrowDown className="h-3 w-3" /> : <ArrowUpDown className="h-3 w-3 opacity-50" />}
                          </Button>
                        </TableHead>
                        <TableHead>
                          <Button variant="ghost" size="sm" className="gap-1 -ml-3 text-xs h-8 px-2 whitespace-nowrap" onClick={toggleTenantSort} data-testid="button-sort-tenant">
                            Tenant
                            {tenantSort === "asc" ? <ArrowUp className="h-3 w-3" /> : tenantSort === "desc" ? <ArrowDown className="h-3 w-3" /> : <ArrowUpDown className="h-3 w-3 opacity-50" />}
                          </Button>
                        </TableHead>
                        <TableHead>
                          <Button variant="ghost" size="sm" className="gap-1 -ml-3 text-xs h-8 px-2 whitespace-nowrap" onClick={toggleTermSort} data-testid="button-sort-term">
                            Term
                            {termSort === "asc" ? <ArrowUp className="h-3 w-3" /> : termSort === "desc" ? <ArrowDown className="h-3 w-3" /> : <ArrowUpDown className="h-3 w-3 opacity-50" />}
                          </Button>
                        </TableHead>
                        <TableHead className="text-xs whitespace-nowrap">Start Date</TableHead>
                        <TableHead>
                          <Button variant="ghost" size="sm" className="gap-1 -ml-3 text-xs h-8 px-2 whitespace-nowrap" onClick={toggleEndDateSort} data-testid="button-sort-end-date">
                            End Date
                            {endDateSort === "asc" ? <ArrowUp className="h-3 w-3" /> : endDateSort === "desc" ? <ArrowDown className="h-3 w-3" /> : <ArrowUpDown className="h-3 w-3 opacity-50" />}
                          </Button>
                        </TableHead>
                        <TableHead className="text-right">
                          <Button variant="ghost" size="sm" className="gap-1 text-xs h-8 px-2 whitespace-nowrap ml-auto" onClick={toggleRentSort} data-testid="button-sort-rent">
                            Rent
                            {rentSort === "asc" ? <ArrowUp className="h-3 w-3" /> : rentSort === "desc" ? <ArrowDown className="h-3 w-3" /> : <ArrowUpDown className="h-3 w-3 opacity-50" />}
                          </Button>
                        </TableHead>
                        <TableHead className="text-right">
                          <Button variant="ghost" size="sm" className="gap-1 text-xs h-8 px-2 whitespace-nowrap ml-auto" onClick={toggleLastMonthSort} data-testid="button-sort-last-month">
                            Last Month
                            {lastMonthSort === "asc" ? <ArrowUp className="h-3 w-3" /> : lastMonthSort === "desc" ? <ArrowDown className="h-3 w-3" /> : <ArrowUpDown className="h-3 w-3 opacity-50" />}
                          </Button>
                        </TableHead>
                        <TableHead className="text-right">
                          <Button variant="ghost" size="sm" className="gap-1 text-xs h-8 px-2 whitespace-nowrap ml-auto" onClick={toggleDepositSort} data-testid="button-sort-deposit">
                            Deposit
                            {depositSort === "asc" ? <ArrowUp className="h-3 w-3" /> : depositSort === "desc" ? <ArrowDown className="h-3 w-3" /> : <ArrowUpDown className="h-3 w-3 opacity-50" />}
                          </Button>
                        </TableHead>
                        <TableHead className="w-[100px]">
                          <Button variant="ghost" size="sm" className="gap-1 -ml-3 text-xs h-8 px-2 whitespace-nowrap" onClick={toggleStatusSort} data-testid="button-sort-status">
                            Status
                            {statusSort === "asc" ? <ArrowUp className="h-3 w-3" /> : statusSort === "desc" ? <ArrowDown className="h-3 w-3" /> : <ArrowUpDown className="h-3 w-3 opacity-50" />}
                          </Button>
                        </TableHead>
                        <TableHead className="w-[180px] text-xs whitespace-nowrap">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedLeases.map((lease) => {
                        const status = getLeaseStatus(lease);
                        
                        return (
                          <TableRow 
                            key={lease.id} 
                            data-testid={`lease-row-${lease.id}`}
                            className="cursor-pointer"
                            onClick={() => setViewingLease(lease)}
                          >
                            <TableCell>
                              <div>
                                <p className="font-medium text-sm">{lease.property?.name || "Unknown"}</p>
                                <p className="text-sm text-muted-foreground">
                                  {lease.property?.address}, {lease.property?.city}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell>
                              {lease.tenant ? `${lease.tenant.firstName} ${lease.tenant.lastName}` : "Unknown"}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {lease.leaseType === "m2m" ? "M2M" : "Annual"}
                              </Badge>
                            </TableCell>
                            <TableCell>{formatDate(lease.startDate)}</TableCell>
                            <TableCell>{formatDate(lease.endDate)}</TableCell>
                            <TableCell className="text-right font-medium text-sm">
                              ${parseFloat(lease.rentAmount || "0").toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </TableCell>
                            <TableCell className="text-right font-medium text-sm">
                              {lease.lastMonthRent != null ? (
                                `$${parseFloat(lease.lastMonthRent || "0").toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right font-medium text-sm">
                              {lease.depositAmount != null ? (
                                `$${parseFloat(lease.depositAmount || "0").toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </TableCell>
                            <TableCell onClick={(e) => e.stopPropagation()}>
                              {status === "active" && (
                                <Badge 
                                  variant="default" 
                                  className="cursor-pointer"
                                  onClick={() => setStatusFilter(statusFilter === "active" ? null : "active")}
                                  data-testid={`badge-status-${lease.id}`}
                                >
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Active
                                </Badge>
                              )}
                              {status === "expiring" && (
                                <Badge 
                                  variant="destructive" 
                                  className="cursor-pointer"
                                  onClick={() => setStatusFilter(statusFilter === "expiring" ? null : "expiring")}
                                  data-testid={`badge-status-${lease.id}`}
                                >
                                  <AlertTriangle className="h-3 w-3 mr-1" />
                                  Expiring
                                </Badge>
                              )}
                              {status === "expired" && (
                                <Badge 
                                  variant="secondary" 
                                  className="cursor-pointer"
                                  onClick={() => setStatusFilter(statusFilter === "expired" ? null : "expired")}
                                  data-testid={`badge-status-${lease.id}`}
                                >
                                  <XCircle className="h-3 w-3 mr-1" />
                                  Expired
                                </Badge>
                              )}
                              {status === "vacant" && (
                                <Badge 
                                  variant="outline" 
                                  className="cursor-pointer border-orange-300 text-orange-700 dark:border-orange-700 dark:text-orange-400"
                                  onClick={() => setStatusFilter(statusFilter === "vacant" ? null : "vacant")}
                                  data-testid={`badge-status-${lease.id}`}
                                >
                                  <AlertTriangle className="h-3 w-3 mr-1" />
                                  Vacant
                                </Badge>
                              )}
                              {status === "no_lease" && (
                                <Badge 
                                  variant="outline" 
                                  className="cursor-pointer border-gray-300 text-gray-600 dark:border-gray-600 dark:text-gray-400"
                                  onClick={() => setStatusFilter(statusFilter === "no_lease" ? null : "no_lease")}
                                  data-testid={`badge-status-${lease.id}`}
                                >
                                  <XCircle className="h-3 w-3 mr-1" />
                                  No Lease
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell onClick={(e) => e.stopPropagation()}>
                              <div className="flex gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => openRenewDialog(lease)}
                                  title="Renew Lease"
                                  data-testid={`button-renew-lease-${lease.id}`}
                                >
                                  <RefreshCw className="h-4 w-4" />
                                </Button>
                                {(() => {
                                  const doc = leaseDocuments?.find(d => d.leaseId === lease.id);
                                  return doc ? (
                                    <Link href={`/admin/lease-document/${doc.id}`}>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        title="Edit Lease Document"
                                        data-testid={`button-edit-doc-${lease.id}`}
                                      >
                                        <PenTool className="h-4 w-4" />
                                      </Button>
                                    </Link>
                                  ) : (
                                    <Link href={`/admin/lease-document/new?leaseId=${lease.id}`}>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        title="Create Lease Document"
                                        data-testid={`button-create-doc-${lease.id}`}
                                      >
                                        <PenTool className="h-4 w-4" />
                                      </Button>
                                    </Link>
                                  );
                                })()}
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => openSendDialog(lease)}
                                  data-testid={`button-send-lease-${lease.id}`}
                                >
                                  <Send className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={(e) => { e.stopPropagation(); openEditDialog(lease); }}
                                  data-testid={`button-edit-lease-${lease.id}`}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="text-destructive hover:text-destructive"
                                      data-testid={`button-delete-lease-${lease.id}`}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </AlertDialogTrigger>
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
                                        onClick={() => deleteLeaseMutation.mutate(lease.id)}
                                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                      >
                                        Delete
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                                {(() => {
                                  const leaseFile = lease.leaseFileId
                                    ? files?.find(f => f.id === lease.leaseFileId)
                                    : files?.find(f => f.ownerType === "lease" && f.ownerId === lease.id);
                                  const leaseDoc = leaseDocuments?.find(d => d.leaseId === lease.id);
                                  const fileHasData = !!(leaseFile && (leaseFile as any).hasFileData);
                                  const hasSignedPdf = !!(leaseDoc?.pdfData || (leaseDoc as any)?.hasPdfData);
                                  const hasLeaseDoc = !!leaseDoc;
                                  if (!leaseFile && !hasSignedPdf && !hasLeaseDoc) return null;
                                  return (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      data-testid={`button-view-lease-file-${lease.id}`}
                                      onClick={() => {
                                        if (hasSignedPdf && leaseDoc) {
                                          const token = localStorage.getItem("adminToken");
                                          const url = `/api/admin/lease-documents/${leaseDoc.id}/pdf${token ? `?token=${token}` : ""}`;
                                          const label = `Lease_${(leaseDoc.tenantNames || lease.tenant?.firstName || "Document").replace(/[^a-zA-Z0-9 ]/g, "")}.pdf`;
                                          setPdfEditorFile({ url, filename: label, leaseId: lease.id });
                                        } else if (hasLeaseDoc && leaseDoc) {
                                          navigate(`/admin/lease-document/${leaseDoc.id}`);
                                        } else if (fileHasData && leaseFile) {
                                          const isPdf = leaseFile.mimeType?.includes("pdf") || leaseFile.filename.endsWith(".pdf");
                                          const isWord = leaseFile.mimeType?.includes("word") || leaseFile.mimeType?.includes("document") ||
                                            leaseFile.filename.endsWith(".docx") || leaseFile.filename.endsWith(".doc");
                                          if (isPdf) {
                                            setPdfEditorFile({ url: getFileDownloadUrl(leaseFile.id), filename: leaseFile.filename, leaseId: lease.id });
                                          } else if (isWord) {
                                            openDocViewer(leaseFile.id, leaseFile.filename);
                                          } else {
                                            window.open(getFileDownloadUrl(leaseFile.id), "_blank");
                                          }
                                        } else if (leaseFile) {
                                          const isPdf = leaseFile.mimeType?.includes("pdf") || leaseFile.filename.endsWith(".pdf");
                                          const isWord = leaseFile.mimeType?.includes("word") || leaseFile.mimeType?.includes("document") ||
                                            leaseFile.filename.endsWith(".docx") || leaseFile.filename.endsWith(".doc");
                                          if (isPdf) {
                                            setPdfEditorFile({ url: getFileDownloadUrl(leaseFile.id), filename: leaseFile.filename, leaseId: lease.id });
                                          } else if (isWord) {
                                            openDocViewer(leaseFile.id, leaseFile.filename);
                                          } else {
                                            window.open(getFileDownloadUrl(leaseFile.id), "_blank");
                                          }
                                        }
                                      }}
                                    >
                                      <Eye className="h-4 w-4 mr-1" />
                                      View
                                    </Button>
                                  );
                                })()}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="files">
          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <CardTitle>All Files</CardTitle>
                  <CardDescription>{generalFiles?.length || 0} files uploaded</CardDescription>
                </div>
                <div className="flex flex-col md:flex-row gap-2">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    accept=".pdf,.doc,.docx,.xls,.xlsx"
                    className="hidden"
                    data-testid="input-file-upload"
                  />
                  <input
                    type="file"
                    ref={reuploadFileInputRef}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f && reuploadingFileId) handleReupload(reuploadingFileId, f);
                      e.target.value = "";
                    }}
                    className="hidden"
                    data-testid="input-reupload-file"
                  />
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    data-testid="button-upload-file"
                  >
                    {isUploading ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4 mr-2" />
                    )}
                    Upload File
                  </Button>
                  <div className="relative w-full md:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search files..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                      data-testid="input-search-files"
                    />
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {filesLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : filteredFiles && filteredFiles.length > 0 ? (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>File</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Owner</TableHead>
                        <TableHead>Size</TableHead>
                        <TableHead>Uploaded</TableHead>
                        <TableHead className="w-[160px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredFiles.map((file) => (
                        <TableRow key={file.id}>
                          <TableCell>
                            <button
                              className="flex items-center gap-3 group text-left"
                              onClick={() => {
                                const isPdf = file.mimeType?.includes("pdf") || file.filename.endsWith(".pdf");
                                const isWord = file.mimeType?.includes("word") || file.mimeType?.includes("document") ||
                                  file.filename.endsWith(".docx") || file.filename.endsWith(".doc");
                                if (isPdf) {
                                  setPdfEditorFile({ url: getFileDownloadUrl(file.id), filename: file.filename });
                                } else if (isWord) {
                                  openDocViewer(file.id, file.filename);
                                } else {
                                  window.open(getFileDownloadUrl(file.id), "_blank");
                                }
                              }}
                              data-testid={`link-file-${file.id}`}
                            >
                              <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                                {getFileIcon(file.mimeType)}
                              </div>
                              <div>
                                <p className="font-medium truncate max-w-[200px] text-primary cursor-pointer">{file.filename}</p>
                                <p className="text-xs text-muted-foreground">{file.mimeType || "Unknown"}</p>
                              </div>
                            </button>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="capitalize">
                              {file.ownerType}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {file.ownerId?.slice(0, 8) || "N/A"}
                          </TableCell>
                          <TableCell className="text-sm">{formatFileSize(file.size)}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {file.createdAt ? formatDate(file.createdAt) : "N/A"}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              {!(file as any).hasFileData && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-amber-600 hover:text-amber-700"
                                  title="Re-upload file (original missing)"
                                  onClick={() => {
                                    setReuploadingFileId(file.id);
                                    setTimeout(() => reuploadFileInputRef.current?.click(), 100);
                                  }}
                                  data-testid={`button-reupload-${file.id}`}
                                >
                                  <RefreshCw className="h-4 w-4" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="icon"
                                title="Open & Edit"
                                onClick={() => {
                                  const isPdf = file.mimeType?.includes("pdf") || file.filename.endsWith(".pdf");
                                  const isWord = file.mimeType?.includes("word") || file.mimeType?.includes("document") ||
                                    file.filename.endsWith(".docx") || file.filename.endsWith(".doc");
                                  if (isPdf) {
                                    setPdfEditorFile({ url: getFileDownloadUrl(file.id), filename: file.filename });
                                  } else if (isWord) {
                                    openDocViewer(file.id, file.filename);
                                  } else {
                                    window.open(getFileDownloadUrl(file.id), "_blank");
                                  }
                                }}
                                data-testid={`button-open-file-${file.id}`}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                title="Rename"
                                onClick={() => {
                                  setRenamingFile(file);
                                  setRenameValue(file.filename);
                                }}
                                data-testid={`button-edit-file-${file.id}`}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  const link = document.createElement("a");
                                  link.href = getFileDownloadUrl(file.id, { attachment: true });
                                  link.download = file.filename;
                                  document.body.appendChild(link);
                                  link.click();
                                  document.body.removeChild(link);
                                }}
                                data-testid={`button-download-${file.id}`}
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="text-destructive hover:text-destructive"
                                    data-testid={`button-delete-file-${file.id}`}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete File</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to delete &ldquo;{file.filename}&rdquo;? This action cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => deleteFileMutation.mutate(file.id)}
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    >
                                      Delete
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <FolderOpen className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium">No files uploaded</p>
                  <p className="text-sm">Files will appear here when uploaded.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="signed">
          <Card>
            <CardHeader>
              <CardTitle>Signed Lease Agreements</CardTitle>
              <CardDescription>All signed lease documents — digitally signed and uploaded</CardDescription>
            </CardHeader>
            <CardContent>
              {sortedSignedRows.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <CheckCircle className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium">{leaseSearchQuery.trim() ? "No matching leases found" : "No signed leases yet"}</p>
                  <p className="text-sm">{leaseSearchQuery.trim() ? "Try a different search term." : "Leases will appear here once signed or uploaded."}</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead
                        className="cursor-pointer select-none hover:text-foreground"
                        onClick={() => {
                          setSignedTenantSort(null);
                          setSignedStatusSort(null);
                          setSignedPropertySort(prev => prev === "asc" ? "desc" : prev === "desc" ? null : "asc");
                        }}
                      >
                        <div className="flex items-center gap-1">
                          Property
                          {signedPropertySort === "asc" ? <ArrowUp className="h-3 w-3" /> : signedPropertySort === "desc" ? <ArrowDown className="h-3 w-3" /> : <ArrowUpDown className="h-3 w-3 opacity-40" />}
                        </div>
                      </TableHead>
                      <TableHead
                        className="cursor-pointer select-none hover:text-foreground"
                        onClick={() => {
                          setSignedPropertySort(null);
                          setSignedStatusSort(null);
                          setSignedTenantSort(prev => prev === "asc" ? "desc" : prev === "desc" ? null : "asc");
                        }}
                      >
                        <div className="flex items-center gap-1">
                          Tenant
                          {signedTenantSort === "asc" ? <ArrowUp className="h-3 w-3" /> : signedTenantSort === "desc" ? <ArrowDown className="h-3 w-3" /> : <ArrowUpDown className="h-3 w-3 opacity-40" />}
                        </div>
                      </TableHead>
                      <TableHead>Lease Term</TableHead>
                      <TableHead>Monthly Rent</TableHead>
                      <TableHead
                        className="cursor-pointer select-none hover:text-foreground"
                        onClick={() => {
                          setSignedPropertySort(null);
                          setSignedTenantSort(null);
                          setSignedStatusSort(prev => prev === "asc" ? "desc" : prev === "desc" ? null : "asc");
                        }}
                      >
                        <div className="flex items-center gap-1">
                          Status
                          {signedStatusSort === "asc" ? <ArrowUp className="h-3 w-3" /> : signedStatusSort === "desc" ? <ArrowDown className="h-3 w-3" /> : <ArrowUpDown className="h-3 w-3 opacity-40" />}
                        </div>
                      </TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedSignedRows.map((row) => {
                      if (row.type === "digital") {
                        const doc = row.doc;
                        const lease = allLeases.find(l => l.id === doc.leaseId);
                        return (
                          <TableRow key={`digital-${doc.id}`} data-testid={`row-signed-lease-${doc.id}`}>
                            <TableCell data-testid={`text-signed-property-${doc.id}`}>{lease?.property?.name || doc.premisesAddress || "—"}</TableCell>
                            <TableCell className="font-medium" data-testid={`text-signed-tenant-${doc.id}`}>{doc.tenantNames || "—"}</TableCell>
                            <TableCell data-testid={`text-signed-term-${doc.id}`}>
                              {doc.commencingDate && doc.endingDate ? `${doc.commencingDate} – ${doc.endingDate}` : doc.leaseTerm || "—"}
                            </TableCell>
                            <TableCell data-testid={`text-signed-rent-${doc.id}`}>{doc.monthlyRent || "—"}</TableCell>
                            <TableCell>
                              {doc.status === "fully_signed" ? (
                                <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                                  <CheckCircle className="h-3 w-3" /> Fully Signed
                                </span>
                              ) : doc.status === "partially_signed" ? (
                                <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                                  <Clock className="h-3 w-3" /> Partially Signed
                                </span>
                              ) : doc.status === "sent" ? (
                                <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
                                  <Send className="h-3 w-3" /> Sent
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400">
                                  <FileText className="h-3 w-3" /> Draft
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Link href={`/admin/lease-document/${doc.id}`}>
                                  <Button variant="outline" size="sm" data-testid={`button-view-signed-${doc.id}`}>
                                    <Eye className="h-4 w-4 mr-1" />
                                    View
                                  </Button>
                                </Link>
                                {(doc.pdfData || (doc as any).hasPdfData) && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    data-testid={`button-download-signed-${doc.id}`}
                                    onClick={async () => {
                                      const token = localStorage.getItem("adminToken");
                                      const url = `/api/admin/lease-documents/${doc.id}/pdf${token ? `?token=${token}` : ""}`;
                                      const resp = await fetch(url, {
                                        headers: token ? { Authorization: `Bearer ${token}` } : {},
                                      });
                                      if (!resp.ok) {
                                        toast({ title: "Error", description: "Failed to download PDF", variant: "destructive" });
                                        return;
                                      }
                                      const arrayBuffer = await resp.arrayBuffer();
                                      const pdfBlob = new Blob([arrayBuffer], { type: "application/pdf" });
                                      const blobUrl = URL.createObjectURL(pdfBlob);
                                      const a = document.createElement("a");
                                      a.href = blobUrl;
                                      a.download = `Lease_${(doc.tenantNames || "Document").replace(/[^a-zA-Z0-9 ]/g, "")}.pdf`;
                                      document.body.appendChild(a);
                                      a.click();
                                      document.body.removeChild(a);
                                      setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);
                                    }}
                                  >
                                    <Download className="h-4 w-4 mr-1" />
                                    PDF
                                  </Button>
                                )}
                                <Button
                                  variant="outline"
                                  size="sm"
                                  data-testid={`button-upload-digital-${doc.id}`}
                                  onClick={() => {
                                    const input = document.createElement("input");
                                    input.type = "file";
                                    input.accept = ".pdf,.doc,.docx";
                                    input.onchange = async (e) => {
                                      const file = (e.target as HTMLInputElement).files?.[0];
                                      if (!file || !doc.leaseId) return;
                                      try {
                                        await uploadLeaseFile(doc.leaseId, file);
                                        queryClient.invalidateQueries({ queryKey: ["/api/admin/files"] });
                                        queryClient.invalidateQueries({ queryKey: ["/api/admin/leases"] });
                                        toast({ title: "Uploaded", description: "Lease document uploaded successfully." });
                                      } catch (err: any) {
                                        toast({ title: "Error", description: err.message || "Upload failed", variant: "destructive" });
                                      }
                                    };
                                    input.click();
                                  }}
                                >
                                  <Upload className="h-4 w-4 mr-1" />
                                  Upload
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      } else {
                        const lease = row.lease;
                        const leaseFile = lease.leaseFileId
                          ? files?.find(f => f.id === lease.leaseFileId)
                          : files?.find(f => f.ownerType === "lease" && f.ownerId === lease.id);
                        const tenantName = lease.tenant ? `${lease.tenant.firstName} ${lease.tenant.lastName}` : "—";
                        const startDate = lease.startDate ? formatDate(new Date(lease.startDate)) : "";
                        const endDate = lease.endDate ? formatDate(new Date(lease.endDate)) : "";
                        const rowKey = row.type === "uploaded" ? `uploaded-${lease.id}` : `nodoc-${lease.id}`;
                        return (
                          <TableRow key={rowKey} data-testid={`row-signed-${row.type}-${lease.id}`}>
                            <TableCell>{lease.property?.name || "—"}</TableCell>
                            <TableCell className="font-medium">{tenantName}</TableCell>
                            <TableCell>
                              {startDate && endDate ? `${startDate} – ${endDate}` : "—"}
                            </TableCell>
                            <TableCell>
                              {lease.rentAmount ? `$${Number(lease.rentAmount).toLocaleString("en-US", { minimumFractionDigits: 2 })}` : "—"}
                            </TableCell>
                            <TableCell>
                              {row.type === "uploaded" ? (
                                <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                                  <Upload className="h-3 w-3" /> Uploaded
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
                                  <AlertTriangle className="h-3 w-3" /> No Document
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                {leaseFile && (
                                  <>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      data-testid={`button-view-lease-${lease.id}`}
                                      onClick={() => {
                                        const isPdf = leaseFile.mimeType?.includes("pdf") || leaseFile.filename.endsWith(".pdf");
                                        const isWord = leaseFile.mimeType?.includes("word") || leaseFile.mimeType?.includes("document") ||
                                          leaseFile.filename.endsWith(".docx") || leaseFile.filename.endsWith(".doc");
                                        if (isPdf) {
                                          setPdfEditorFile({ url: getFileDownloadUrl(leaseFile.id), filename: leaseFile.filename, leaseId: lease.id });
                                        } else if (isWord) {
                                          openDocViewer(leaseFile.id, leaseFile.filename);
                                        } else {
                                          window.open(getFileDownloadUrl(leaseFile.id), "_blank");
                                        }
                                      }}
                                    >
                                      <Eye className="h-4 w-4 mr-1" />
                                      View
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      data-testid={`button-download-lease-${lease.id}`}
                                      onClick={() => {
                                        window.open(getFileDownloadUrl(leaseFile.id, { attachment: true }), "_blank");
                                      }}
                                    >
                                      <Download className="h-4 w-4 mr-1" />
                                      PDF
                                    </Button>
                                  </>
                                )}
                                <Button
                                  variant="outline"
                                  size="sm"
                                  data-testid={`button-upload-lease-${lease.id}`}
                                  onClick={() => {
                                    const input = document.createElement("input");
                                    input.type = "file";
                                    input.accept = ".pdf,.doc,.docx";
                                    input.onchange = async (e) => {
                                      const file = (e.target as HTMLInputElement).files?.[0];
                                      if (!file) return;
                                      try {
                                        await uploadLeaseFile(lease.id, file);
                                        queryClient.invalidateQueries({ queryKey: ["/api/admin/files"] });
                                        queryClient.invalidateQueries({ queryKey: ["/api/admin/leases"] });
                                        toast({ title: "Uploaded", description: "Lease document uploaded successfully." });
                                      } catch (err: any) {
                                        toast({ title: "Error", description: err.message || "Upload failed", variant: "destructive" });
                                      }
                                    };
                                    input.click();
                                  }}
                                >
                                  <Upload className="h-4 w-4 mr-1" />
                                  Upload
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      }
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={showEditDialog} onOpenChange={(open) => { setShowEditDialog(open); if (open) setLeaseAttachment(null); }}>
        <DialogContent className="max-w-lg" onOpenAutoFocus={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>Edit Lease</DialogTitle>
            <DialogDescription>Update lease agreement details</DialogDescription>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEditSubmit)}>
              <LeaseFormFields form={editForm} isPending={editMutation.isPending} />
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={showSendDialog} onOpenChange={(open) => { setShowSendDialog(open); if (!open) { setSendLeaseTarget(null); setSendEmail(""); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Send Lease for Signing</DialogTitle>
            <DialogDescription>
              Send lease to tenant for {sendLeaseTarget?.property?.name || "this property"} with a digital signing link.
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
                <p><span className="text-muted-foreground">Term:</span> {formatDate(sendLeaseTarget.startDate)} - {formatDate(sendLeaseTarget.endDate)}</p>
                <p><span className="text-muted-foreground">Rent:</span> ${sendLeaseTarget.rentAmount?.toLocaleString() || "0"}/mo</p>
              </div>
            )}
            {sendLeaseTarget && (
              <SendLeaseDocStatus leaseId={sendLeaseTarget.id} />
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
                <p>Current lease: {formatDate(renewTarget.startDate)} - {formatDate(renewTarget.endDate)}</p>
                <p>Current rent: ${Number(renewTarget.rentAmount).toLocaleString()}/mo</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">New Start Date</label>
                  <Input
                    type="text"
                    placeholder="MM.DD.YYYY"
                    value={isoToDisplay(renewStartDate)}
                    onChange={(e) => setRenewStartDate(snapToFirstOfMonth(displayToIso(e.target.value)))}
                    data-testid="input-renew-start-date"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">New End Date</label>
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
                <label className="text-sm font-medium">Monthly Rent ($)</label>
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
                <label className="text-sm font-medium">Term Type</label>
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
              Renew Lease
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={viewingLease !== null} onOpenChange={(open) => !open && setViewingLease(null)}>
        <DialogContent className="sm:max-w-4xl max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Lease Details</DialogTitle>
            <DialogDescription>Full lease information</DialogDescription>
          </DialogHeader>
          {viewingLease && (() => {
            const linkedDoc = leaseDocuments?.find(d => d.leaseId === viewingLease.id);
            const status = getLeaseStatus(viewingLease);
            const startDate = parseUTCDate(viewingLease.startDate);
            const endDate = parseUTCDate(viewingLease.endDate);
            const daysRemaining = differenceInDays(endDate, new Date());
            return (
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-md bg-primary/10 flex items-center justify-center">
                      <FileText className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold" data-testid="text-lease-detail-type">
                        {viewingLease.leaseType === "m2m" ? "Month-to-Month" : "Annual"} Lease
                      </h3>
                      <p className="text-sm text-muted-foreground">Lease #{viewingLease.id}</p>
                    </div>
                  </div>
                  {status === "active" && (
                    <Badge variant="default" data-testid="text-lease-detail-status">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Active
                    </Badge>
                  )}
                  {status === "expiring" && (
                    <Badge variant="destructive" data-testid="text-lease-detail-status">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      Expiring
                    </Badge>
                  )}
                  {status === "expired" && (
                    <Badge variant="secondary" data-testid="text-lease-detail-status">
                      <XCircle className="h-3 w-3 mr-1" />
                      Expired
                    </Badge>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium text-muted-foreground">Property</h4>
                    <div className="grid gap-2">
                      <div className="flex items-center gap-2 text-sm">
                        <Home className="h-4 w-4 text-muted-foreground" />
                        <span data-testid="text-lease-detail-property">{viewingLease.property?.name || "Unknown"}</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="text-sm font-medium text-muted-foreground">Tenant</h4>
                    <div className="grid gap-2">
                      <div className="flex items-center gap-2 text-sm">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span data-testid="text-lease-detail-tenant">
                          {viewingLease.tenant ? `${viewingLease.tenant.firstName} ${viewingLease.tenant.lastName}` : "Unknown"}
                        </span>
                      </div>
                      {viewingLease.tenant?.email && (
                        <div className="flex items-center gap-2 text-sm">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <span>{viewingLease.tenant.email}</span>
                        </div>
                      )}
                      {viewingLease.tenant?.phone && (
                        <div className="flex items-center gap-2 text-sm">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          <span>{viewingLease.tenant.phone}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-muted-foreground">Lease Terms</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>Start: {formatDate(startDate)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>End: {formatDate(endDate)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span>
                        {daysRemaining > 0
                          ? `${daysRemaining} days remaining`
                          : `Expired ${Math.abs(daysRemaining)} days ago`}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      <span data-testid="text-lease-detail-rent">
                        Rent: ${parseFloat(String(viewingLease.rentAmount || "0")).toLocaleString("en-US", { minimumFractionDigits: 2 })}/mo
                      </span>
                    </div>
                    {viewingLease.depositAmount && (
                      <div className="flex items-center gap-2 text-sm">
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                        <span>Security Deposit: ${parseFloat(String(viewingLease.depositAmount)).toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
                      </div>
                    )}
                    {viewingLease.lastMonthRent && (
                      <div className="flex items-center gap-2 text-sm">
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                        <span>Last Month Rent: ${parseFloat(String(viewingLease.lastMonthRent)).toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
                      </div>
                    )}
                  </div>
                </div>

                {(() => {
                  const associatedFile = viewingLease.leaseFileId
                    ? files?.find(f => f.id === viewingLease.leaseFileId)
                    : files?.find(f => f.ownerType === "lease" && f.ownerId === viewingLease.id);
                  const fileId = associatedFile?.id;
                  const hasLeaseFile = !!fileId;
                  const signedDoc = leaseDocuments?.find(d => d.leaseId === viewingLease.id);
                  const isFullySigned = signedDoc?.status === "fully_signed";
                  const hasSignedPdf = !!(signedDoc?.pdfData || (signedDoc as any)?.hasPdfData);
                  return (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-medium text-muted-foreground">Lease Document</h4>
                        {signedDoc && (
                          signedDoc.status === "fully_signed" ? (
                            <Badge variant="default" className="bg-green-600"><CheckCircle className="h-3 w-3 mr-1" />Fully Signed</Badge>
                          ) : signedDoc.status === "partially_signed" ? (
                            <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Awaiting Signature</Badge>
                          ) : (
                            <Badge variant="outline"><FileText className="h-3 w-3 mr-1" />Draft</Badge>
                          )
                        )}
                      </div>
                      <div className="flex justify-start gap-2 flex-wrap">
                        <input
                          type="file"
                          ref={detailLeaseFileInputRef}
                          onChange={handleDetailLeaseUpload}
                          accept=".pdf,.doc,.docx"
                          className="hidden"
                          data-testid="input-detail-lease-upload"
                        />
                        {!signedDoc && (
                          <Link href={`/admin/lease-document/new?leaseId=${viewingLease.id}`}>
                            <Button variant="outline" data-testid="button-create-doc-detail">
                              <PenTool className="h-4 w-4 mr-2" />
                              Create
                            </Button>
                          </Link>
                        )}
                        {signedDoc && (
                          <Link href={`/admin/lease-document/${signedDoc.id}`}>
                            <Button
                              variant="outline"
                              data-testid="button-view-signed-lease"
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              View Signed Lease
                            </Button>
                          </Link>
                        )}
                        {signedDoc?.pdfData ? (
                          <Button
                            variant="outline"
                            data-testid="button-download-lease-file"
                            onClick={async () => {
                              const token = localStorage.getItem("adminToken");
                              const url = `/api/admin/lease-documents/${signedDoc.id}/pdf${token ? `?token=${token}` : ""}`;
                              const resp = await fetch(url, {
                                headers: token ? { Authorization: `Bearer ${token}` } : {},
                              });
                              if (!resp.ok) {
                                toast({ title: "Error", description: "Failed to download PDF", variant: "destructive" });
                                return;
                              }
                              const arrayBuffer = await resp.arrayBuffer();
                              const pdfBlob = new Blob([arrayBuffer], { type: "application/pdf" });
                              const blobUrl = URL.createObjectURL(pdfBlob);
                              const a = document.createElement("a");
                              a.href = blobUrl;
                              a.download = `Lease_${(signedDoc.tenantNames || viewingLease.tenant?.firstName || "Document").replace(/[^a-zA-Z0-9 ]/g, "")}.pdf`;
                              document.body.appendChild(a);
                              a.click();
                              document.body.removeChild(a);
                              setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);
                            }}
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Download Lease
                          </Button>
                        ) : hasLeaseFile ? (
                          <a
                            href={getFileDownloadUrl(fileId!, { attachment: true })}
                            download
                          >
                            <Button variant="outline" data-testid="button-download-lease-file">
                              <Download className="h-4 w-4 mr-2" />
                              Download Lease
                            </Button>
                          </a>
                        ) : null}
                        <Button
                          variant="outline"
                          onClick={() => detailLeaseFileInputRef.current?.click()}
                          disabled={isUploadingDetailLease}
                          data-testid="button-upload-lease-file"
                        >
                          {isUploadingDetailLease ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <Upload className="h-4 w-4 mr-2" />
                          )}
                          Upload Lease
                        </Button>
                      </div>
                      {hasLeaseFile && associatedFile && (
                        <div className="flex items-center gap-2 p-3 rounded-md bg-muted/50">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm truncate flex-1">{
                            viewingLease.tenant
                              ? `Lease - ${viewingLease.tenant.firstName} ${viewingLease.tenant.lastName}`
                              : associatedFile.filename.replace(/,?\s*\d+\s+\w.*\.\w+$/, "").replace(/\.\w+$/, "") || associatedFile.filename
                          }</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            data-testid="button-view-uploaded-lease"
                            onClick={() => {
                              const isPdf = associatedFile.mimeType?.includes("pdf") || associatedFile.filename.endsWith(".pdf");
                              const isWord = associatedFile.mimeType?.includes("word") || associatedFile.mimeType?.includes("document") ||
                                associatedFile.filename.endsWith(".docx") || associatedFile.filename.endsWith(".doc");
                              if (isPdf) {
                                setPdfEditorFile({ url: getFileDownloadUrl(associatedFile.id), filename: associatedFile.filename });
                              } else if (isWord) {
                                openDocViewer(associatedFile.id, associatedFile.filename);
                              } else {
                                window.open(getFileDownloadUrl(associatedFile.id), "_blank");
                              }
                            }}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      <Dialog open={!!renamingFile} onOpenChange={(open) => { if (!open) { setRenamingFile(null); setRenameValue(""); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Rename File</DialogTitle>
            <DialogDescription>Enter a new name for this file</DialogDescription>
          </DialogHeader>
          <Input
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            placeholder="File name"
            data-testid="input-rename-file"
            onKeyDown={(e) => {
              if (e.key === "Enter" && renamingFile && renameValue.trim()) {
                renameFileMutation.mutate({ id: renamingFile.id, filename: renameValue.trim() });
              }
            }}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => { setRenamingFile(null); setRenameValue(""); }} data-testid="button-cancel-rename">
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (renamingFile && renameValue.trim()) {
                  renameFileMutation.mutate({ id: renamingFile.id, filename: renameValue.trim() });
                }
              }}
              disabled={renameFileMutation.isPending || !renameValue.trim()}
              data-testid="button-save-rename"
            >
              {renameFileMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showDocPickerDialog} onOpenChange={setShowDocPickerDialog}>
        <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Lease Documents</DialogTitle>
            <DialogDescription>
              Create a new lease document or view an uploaded document.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search documents..."
                value={docPickerSearch}
                onChange={(e) => setDocPickerSearch(e.target.value)}
                className="pl-9"
                data-testid="input-doc-picker-search"
              />
            </div>
            <div className="flex-1 overflow-y-auto space-y-1 min-h-0">
              <button
                className="w-full text-left p-3 rounded-md hover-elevate flex items-center gap-3"
                onClick={() => {
                  setShowDocPickerDialog(false);
                  navigate("/admin/lease-document/new");
                }}
                data-testid="button-blank-document"
              >
                <div className="flex items-center justify-center h-10 w-10 rounded-md bg-primary/10 shrink-0">
                  <PenTool className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-sm">Blank Document</p>
                  <p className="text-xs text-muted-foreground">Start with an empty lease document</p>
                </div>
              </button>
              {files && files.filter(f => f.ownerType === "general").length > 0 && (
                <div className="border-t my-2 pt-2">
                  <p className="text-xs text-muted-foreground px-3 pb-2">Uploaded Documents (click to download/view)</p>
                  {files
                    .filter(f => {
                      if (f.ownerType !== "general") return false;
                      if (!docPickerSearch.trim()) return true;
                      return f.filename.toLowerCase().includes(docPickerSearch.toLowerCase());
                    })
                    .map((file) => (
                      <button
                        key={file.id}
                        className="w-full text-left p-3 rounded-md hover-elevate flex items-center gap-3"
                        onClick={() => {
                          setShowDocPickerDialog(false);
                          const isWord = file.mimeType?.includes("word") || file.mimeType?.includes("document") ||
                            file.filename.endsWith(".docx") || file.filename.endsWith(".doc");
                          const isPdf = file.mimeType?.includes("pdf") || file.filename.endsWith(".pdf");
                          if (isWord) {
                            openDocViewer(file.id, file.filename);
                          } else if (isPdf) {
                            setPdfEditorFile({ url: getFileDownloadUrl(file.id), filename: file.filename });
                          } else {
                            window.open(getFileDownloadUrl(file.id), "_blank");
                          }
                        }}
                        data-testid={`button-doc-template-${file.id}`}
                      >
                        <div className="flex items-center justify-center h-10 w-10 rounded-md bg-muted shrink-0">
                          {file.mimeType?.includes("pdf") ? (
                            <FileText className="h-5 w-5 text-red-500" />
                          ) : file.mimeType?.includes("word") || file.mimeType?.includes("document") ? (
                            <FileText className="h-5 w-5 text-blue-500" />
                          ) : file.mimeType?.includes("spreadsheet") || file.mimeType?.includes("excel") ? (
                            <FileSpreadsheet className="h-5 w-5 text-green-500" />
                          ) : (
                            <FileIcon className="h-5 w-5 text-muted-foreground" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-sm truncate">{file.filename}</p>
                          <p className="text-xs text-muted-foreground">
                            {file.size ? `${(file.size / 1024).toFixed(1)} KB` : "Unknown size"}
                            {file.createdAt ? ` · ${formatDate(file.createdAt)}` : ""}
                            {(file.mimeType?.includes("word") || file.mimeType?.includes("document") || file.filename.endsWith(".docx") || file.filename.endsWith(".doc") || file.mimeType?.includes("pdf") || file.filename.endsWith(".pdf")) && (
                              <span className="ml-1 text-primary"> · Click to edit</span>
                            )}
                          </p>
                        </div>
                      </button>
                    ))}
                  {files.filter(f => f.ownerType === "general" && (!docPickerSearch.trim() || f.filename.toLowerCase().includes(docPickerSearch.toLowerCase()))).length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">No matching documents found</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <DocEditor
        open={!!docViewerFile}
        onOpenChange={(open) => { if (!open) setDocViewerFile(null); }}
        html={docViewerHtml}
        filename={docViewerFile?.filename || "Document"}
        loading={docViewerLoading}
        fileId={docViewerFile?.id}
      />

      <PdfEditor
        open={!!pdfEditorFile}
        onOpenChange={(open) => { if (!open) setPdfEditorFile(null); }}
        fileUrl={pdfEditorFile?.url || ""}
        filename={pdfEditorFile?.filename || ""}
        onDelete={pdfEditorFile?.leaseId ? () => {
          const leaseId = pdfEditorFile.leaseId!;
          if (window.confirm("Are you sure you want to delete this lease? This action cannot be undone.")) {
            deleteLeaseMutation.mutate(leaseId);
            setPdfEditorFile(null);
          }
        } : undefined}
      />
    </div>
  );
}
