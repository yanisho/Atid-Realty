import { useState, useEffect, useRef, useCallback } from "react";
import { formatDate as fmtDate } from "@/lib/date-utils";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Save, Loader2, Check, Copy, Send, Trash2, Download } from "lucide-react";
import type { LeaseDocument, Lease, Tenant, Property, Entity } from "@shared/schema";
import html2pdf from "html2pdf.js";

interface PropertyWithEntity extends Property {
  entity?: Entity;
}

interface LeaseWithDetails extends Lease {
  property?: PropertyWithEntity;
  tenant?: Tenant;
}

function TypedSignature({ onSave, existingSignature, label, disabled, defaultName }: {
  onSave: (signature: string) => void;
  existingSignature?: string | null;
  label: string;
  disabled?: boolean;
  defaultName?: string;
}) {
  const [typedName, setTypedName] = useState(defaultName || "");
  const [applied, setApplied] = useState(false);

  useEffect(() => {
    if (defaultName && !typedName && !applied) {
      setTypedName(defaultName);
    }
  }, [defaultName]);

  if (existingSignature && existingSignature !== "signed") {
    const isDataUrl = existingSignature.startsWith("data:");
    return (
      <div className="space-y-2">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <div className="border rounded-md p-3 bg-muted/30">
          {isDataUrl ? (
            <img src={existingSignature} alt="Signature" className="max-h-20" data-testid={`img-signature-${label.toLowerCase().replace(/\s/g, '-')}`} />
          ) : (
            <p
              className="text-2xl text-foreground"
              style={{ fontFamily: "'Dancing Script', cursive" }}
              data-testid={`text-signature-${label.toLowerCase().replace(/\s/g, '-')}`}
            >
              {existingSignature}
            </p>
          )}
          <p className="text-xs text-muted-foreground mt-1">Signed</p>
        </div>
      </div>
    );
  }

  if (existingSignature === "signed") {
    return (
      <div className="space-y-2">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <Badge variant="outline">
          <Check className="h-3 w-3 mr-1" /> Signed
        </Badge>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <div className="space-y-3 border rounded-md p-3">
        <Input
          value={typedName}
          onChange={(e) => { setTypedName(e.target.value); setApplied(false); }}
          placeholder="Type full name to sign"
          disabled={disabled}
          className="text-sm"
          data-testid={`input-typed-signature-${label.toLowerCase().replace(/\s/g, '-')}`}
        />
        {typedName.trim() && (
          <div className="border rounded-md p-4 bg-white dark:bg-gray-950 min-h-[60px] flex items-center">
            <p
              className="text-3xl text-gray-900 dark:text-gray-100"
              style={{ fontFamily: "'Dancing Script', cursive" }}
            >
              {typedName}
            </p>
          </div>
        )}
        <Button
          size="sm"
          onClick={() => { onSave(typedName.trim()); setApplied(true); }}
          disabled={!typedName.trim() || disabled}
          data-testid={`button-apply-signature-${label.toLowerCase().replace(/\s/g, '-')}`}
        >
          <Check className="h-3 w-3 mr-1" /> Apply Signature
        </Button>
      </div>
    </div>
  );
}

function InlineField({ value, onChange, placeholder, width, testId }: {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  width?: string;
  testId?: string;
}) {
  return (
    <Input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="inline-flex h-7 border-b border-t-0 border-l-0 border-r-0 rounded-none bg-blue-50/50 dark:bg-blue-950/30 px-1 font-semibold text-sm focus-visible:ring-0 focus-visible:border-primary"
      style={{ width: width || "auto", minWidth: "80px", maxWidth: "100%" }}
      data-testid={testId}
    />
  );
}

export default function LeaseDocumentEditor() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/admin/lease-document/:id");
  const isNew = params?.id === "new";
  const docId = isNew ? null : params?.id;

  const formatEntityName = (entity: { name: string; type?: string | null }) => {
    const typeLabels: Record<string, string> = {
      llc: "LLC",
      corporation: "Corp.",
      partnership: "Partnership",
      trust: "Trust",
    };
    const suffix = entity.type && entity.type !== "individual" ? typeLabels[entity.type] || "" : "";
    if (suffix && !entity.name.toUpperCase().includes(suffix.toUpperCase())) {
      return `${entity.name} ${suffix}`;
    }
    return entity.name;
  };

  const populateEntityFields = (entity: { name: string; type?: string | null; contactPhone?: string | null; contactEmail?: string | null }) => {
    setLandlordName(formatEntityName(entity));
  };

  const [leaseDate, setLeaseDate] = useState("");
  const [landlordName, setLandlordName] = useState("");
  const [tenantNames, setTenantNames] = useState("");
  const [premisesAddress, setPremisesAddress] = useState("");
  const [leaseTerm, setLeaseTerm] = useState("1 year");
  const [commencingDate, setCommencingDate] = useState("");
  const [endingDate, setEndingDate] = useState("");
  const [monthlyRent, setMonthlyRent] = useState("");
  const [firstMonthRent, setFirstMonthRent] = useState("");
  const [lastMonthRent, setLastMonthRent] = useState("");
  const [securityDeposit, setSecurityDeposit] = useState("");
  const [lateFeePercent, setLateFeePercent] = useState("5");
  const [noPets, setNoPets] = useState(true);
  const [noSmoking, setNoSmoking] = useState(true);
  const [insuranceMinimum, setInsuranceMinimum] = useState("$300,000.00");
  const [repairCopay, setRepairCopay] = useState("$250");
  const [acFilterCheckbox, setAcFilterCheckbox] = useState(true);
  const [landlordPhone, setLandlordPhone] = useState("954-338-3885");
  const [landlordEmail, setLandlordEmail] = useState("info@atidrealty.com");
  const [tenantPhone, setTenantPhone] = useState("");
  const [tenantEmail, setTenantEmail] = useState("");
  const [landlordSignature, setLandlordSignature] = useState<string | null>(null);
  const [tenantSignature, setTenantSignature] = useState<string | null>(null);
  const [status, setStatus] = useState("draft");
  const [leaseId, setLeaseId] = useState<string | null>(null);
  const [showSignDialog, setShowSignDialog] = useState(false);
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [signingToken, setSigningToken] = useState<string | null>(null);
  const [autoPopulated, setAutoPopulated] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [hasPdf, setHasPdf] = useState(false);
  const leaseContentRef = useRef<HTMLDivElement>(null);

  const generateAndSavePdf = useCallback(async () => {
    if (!leaseContentRef.current || !docId) return;
    setGeneratingPdf(true);
    try {
      const element = leaseContentRef.current;
      const swappedInputs: { original: HTMLElement; span: HTMLSpanElement; parent: Node }[] = [];
      element.querySelectorAll("input").forEach((input) => {
        const span = document.createElement("span");
        span.textContent = input.value || "";
        span.style.display = "inline-block";
        span.style.fontWeight = "600";
        span.style.fontSize = "0.875rem";
        span.style.padding = "0 4px";
        span.style.lineHeight = "1.75rem";
        span.style.verticalAlign = "baseline";
        if (input.style.width) span.style.width = input.style.width;
        if (input.style.minWidth) span.style.minWidth = input.style.minWidth;
        span.setAttribute("data-pdf-swap", "true");
        const parent = input.parentNode!;
        parent.replaceChild(span, input);
        swappedInputs.push({ original: input, span, parent });
      });
      element.querySelectorAll('[data-pdf-select-root]').forEach((selectRoot) => {
        if (!selectRoot.parentNode) return;
        const span = document.createElement("span");
        span.textContent = tenantNames || "";
        span.style.display = "inline";
        span.style.fontWeight = "600";
        span.style.fontSize = "0.875rem";
        span.style.padding = "0 4px";
        span.style.lineHeight = "1.75rem";
        span.setAttribute("data-pdf-swap", "true");
        const parent = selectRoot.parentNode;
        parent.replaceChild(span, selectRoot as Node);
        swappedInputs.push({ original: selectRoot as HTMLElement, span, parent });
      });
      const restoreAll = () => {
        swappedInputs.forEach(({ original, span, parent }) => {
          if (span.parentNode === parent) {
            parent.replaceChild(original, span);
          }
        });
      };
      let pdfBlob: Blob;
      try {
        const opt = {
          margin: [10, 10, 10, 10],
          filename: `Lease_${tenantNames || "Document"}.pdf`,
          image: { type: "jpeg", quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true, letterRendering: true },
          jsPDF: { unit: "mm", format: "letter", orientation: "portrait" as const },
        };
        pdfBlob = await html2pdf().set(opt).from(element).outputPdf("blob");
      } finally {
        restoreAll();
      }
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const dataUrl = reader.result as string;
          const commaIdx = dataUrl.indexOf(",");
          if (commaIdx === -1) {
            reject(new Error("Invalid data URL"));
            return;
          }
          resolve(dataUrl.substring(commaIdx + 1));
        };
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(pdfBlob);
      });
      if (!base64 || base64.length < 100) {
        throw new Error("Generated PDF data is too small or empty");
      }
      const token = localStorage.getItem("adminToken");
      const resp = await fetch(`/api/admin/lease-documents/${docId}/pdf`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ pdfData: base64 }),
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.error || "Server returned " + resp.status);
      }
      setHasPdf(true);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/lease-documents", docId] });
      toast({ title: "PDF Saved", description: "Lease PDF has been saved to the database." });
    } catch (err) {
      console.error("PDF generation error:", err);
      toast({ title: "Error", description: String(err instanceof Error ? err.message : "Failed to generate PDF"), variant: "destructive" });
    } finally {
      setGeneratingPdf(false);
    }
  }, [docId, tenantNames, toast]);

  const downloadPdf = useCallback(async () => {
    if (!leaseContentRef.current || !docId) return;
    setGeneratingPdf(true);
    try {
      const element = leaseContentRef.current;
      const swappedItems: { original: HTMLElement; span: HTMLSpanElement; parent: Node }[] = [];
      element.querySelectorAll("input").forEach((input) => {
        const span = document.createElement("span");
        span.textContent = input.value || "";
        span.style.display = "inline-block";
        span.style.fontWeight = "600";
        span.style.fontSize = "0.875rem";
        span.style.padding = "0 4px";
        span.style.lineHeight = "1.75rem";
        span.style.verticalAlign = "baseline";
        if (input.style.width) span.style.width = input.style.width;
        if (input.style.minWidth) span.style.minWidth = input.style.minWidth;
        span.setAttribute("data-pdf-swap", "true");
        const parent = input.parentNode!;
        parent.replaceChild(span, input);
        swappedItems.push({ original: input, span, parent });
      });
      element.querySelectorAll('[data-pdf-select-root]').forEach((selectRoot) => {
        if (!selectRoot.parentNode) return;
        const span = document.createElement("span");
        span.textContent = tenantNames || "";
        span.style.display = "inline";
        span.style.fontWeight = "600";
        span.style.fontSize = "0.875rem";
        span.style.padding = "0 4px";
        span.style.lineHeight = "1.75rem";
        span.setAttribute("data-pdf-swap", "true");
        const parent = selectRoot.parentNode;
        parent.replaceChild(span, selectRoot as Node);
        swappedItems.push({ original: selectRoot as HTMLElement, span, parent });
      });
      const restoreAll = () => {
        swappedItems.forEach(({ original, span, parent }) => {
          if (span.parentNode === parent) {
            parent.replaceChild(original, span);
          }
        });
      };
      let pdfBlob: Blob;
      try {
        const opt = {
          margin: [10, 10, 10, 10],
          filename: `Lease_${tenantNames || "Document"}.pdf`,
          image: { type: "jpeg", quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true, letterRendering: true },
          jsPDF: { unit: "mm", format: "letter", orientation: "portrait" as const },
        };
        pdfBlob = await html2pdf().set(opt).from(element).outputPdf("blob");
      } finally {
        restoreAll();
      }
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const dataUrl = reader.result as string;
          const commaIdx = dataUrl.indexOf(",");
          if (commaIdx === -1) { reject(new Error("Invalid data URL")); return; }
          resolve(dataUrl.substring(commaIdx + 1));
        };
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(pdfBlob);
      });
      if (base64 && base64.length > 100) {
        const token = localStorage.getItem("adminToken");
        fetch(`/api/admin/lease-documents/${docId}/pdf`, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          body: JSON.stringify({ pdfData: base64 }),
        }).then(() => {
          setHasPdf(true);
          queryClient.invalidateQueries({ queryKey: ["/api/admin/lease-documents", docId] });
        }).catch(() => {});
      }
      const blobUrl = URL.createObjectURL(pdfBlob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = `Lease_${(tenantNames || "Document").replace(/[^a-zA-Z0-9 ]/g, "")}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);
      toast({ title: "PDF Downloaded", description: "Lease PDF has been downloaded and saved." });
    } catch (err) {
      console.error("PDF download error:", err);
      toast({ title: "Error", description: String(err instanceof Error ? err.message : "Failed to generate PDF"), variant: "destructive" });
    } finally {
      setGeneratingPdf(false);
    }
  }, [docId, tenantNames, toast]);

  const formatEndOfMonth = (dateStr: string) => {
    const d = new Date(dateStr);
    const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    return fmtDate(lastDay);
  };

  const formatDate = (d: Date) => fmtDate(d);

  const getDefaultLeaseDates = (leaseType?: string) => {
    const today = new Date();
    const isFirstOfMonth = today.getDate() === 1;
    const startDate = isFirstOfMonth
      ? new Date(today.getFullYear(), today.getMonth(), 1)
      : new Date(today.getFullYear(), today.getMonth() + 1, 1);
    const isAnnual = !leaseType || leaseType === "annual";
    const endDate = isAnnual
      ? new Date(startDate.getFullYear() + 1, startDate.getMonth(), 0)
      : new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0);
    return {
      commencing: formatDate(startDate),
      ending: formatDate(endDate),
    };
  };

  const urlLeaseId = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("leaseId") : null;

  const { data: existingDoc, isLoading: docLoading } = useQuery<LeaseDocument>({
    queryKey: ["/api/admin/lease-documents", docId],
    enabled: !!docId,
  });

  const { data: leases } = useQuery<LeaseWithDetails[]>({
    queryKey: ["/api/admin/leases"],
  });

  useEffect(() => {
    if (existingDoc) {
      setLeaseDate(existingDoc.leaseDate || "");
      setTenantNames(existingDoc.tenantNames || "");
      setPremisesAddress(existingDoc.premisesAddress || "");
      setLeaseTerm(existingDoc.leaseTerm || "1 year");
      setCommencingDate(existingDoc.commencingDate || "");
      setEndingDate(existingDoc.endingDate || "");
      setMonthlyRent(existingDoc.monthlyRent || "");
      setFirstMonthRent(existingDoc.firstMonthRent || "");
      setLastMonthRent(existingDoc.lastMonthRent || "");
      setSecurityDeposit(existingDoc.securityDeposit || "");
      setLateFeePercent(existingDoc.lateFeePercent || "5");
      setNoPets(existingDoc.noPets ?? true);
      setNoSmoking(existingDoc.noSmoking ?? true);
      setInsuranceMinimum(existingDoc.insuranceMinimum || "$300,000.00");
      setRepairCopay(existingDoc.repairCopay || "$250");
      setAcFilterCheckbox(existingDoc.acFilterCheckbox ?? true);
      setLandlordPhone(existingDoc.landlordPhone || "");
      setLandlordEmail(existingDoc.landlordEmail || "");
      setTenantPhone(existingDoc.tenantPhone || "");
      setTenantEmail(existingDoc.tenantEmail || "");
      setLandlordSignature(existingDoc.landlordSignature || null);
      setTenantSignature(existingDoc.tenantSignature || null);
      setStatus(existingDoc.status || "draft");
      setLeaseId(existingDoc.leaseId || null);
      setSigningToken(existingDoc.tenantSigningToken || null);

      if (existingDoc.landlordName) {
        setLandlordName(existingDoc.landlordName);
      } else if (existingDoc.leaseId && leases) {
        const linkedLease = leases.find(l => l.id === existingDoc.leaseId);
        if (linkedLease?.property?.entity) {
          populateEntityFields(linkedLease.property.entity);
        }
      }
    }
  }, [existingDoc, leases]);

  useEffect(() => {
    if (existingDoc?.pdfData) {
      setHasPdf(true);
    }
  }, [existingDoc]);

  useEffect(() => {
    if (existingDoc?.status === "fully_signed" && !existingDoc?.pdfData && docId && leaseContentRef.current && !generatingPdf && !hasPdf) {
      const timer = setTimeout(() => {
        generateAndSavePdf();
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [existingDoc, docId, generatingPdf, generateAndSavePdf, hasPdf]);

  useEffect(() => {
    if (isNew && urlLeaseId && leases && !autoPopulated) {
      const lease = leases.find(l => String(l.id) === urlLeaseId);
      if (lease) {
        setLeaseId(lease.id);
        if (lease.tenant) {
          setTenantNames(`${lease.tenant.firstName} ${lease.tenant.lastName}`);
          if (lease.tenant.phone) setTenantPhone(lease.tenant.phone);
          if (lease.tenant.email) setTenantEmail(lease.tenant.email);
        }
        if (lease.property) {
          const addr = [lease.property.address, lease.property.city, `${lease.property.state} ${lease.property.zip}`].filter(Boolean).join(", ");
          setPremisesAddress(addr);
          if (lease.property.entity) {
            populateEntityFields(lease.property.entity);
          }
        }
        const termType = lease.leaseType === "annual" ? "1 year" : "Month-to-Month";
        setLeaseTerm(termType);
        const defaults = getDefaultLeaseDates(lease.leaseType || "annual");
        setCommencingDate(defaults.commencing);
        setEndingDate(defaults.ending);
        if (lease.rentAmount) {
          const rent = `$${parseFloat(lease.rentAmount).toLocaleString("en-US", { minimumFractionDigits: 2 })}`;
          setMonthlyRent(rent);
          setFirstMonthRent(rent);
        }
        if (lease.depositAmount) {
          const dep = `$${parseFloat(lease.depositAmount).toLocaleString("en-US", { minimumFractionDigits: 2 })}`;
          setSecurityDeposit(dep);
          setLastMonthRent(dep);
        }
        setLeaseDate(formatDate(new Date()));
        setAutoPopulated(true);
      }
    }
  }, [isNew, urlLeaseId, leases, autoPopulated]);

  const populateFromLease = (lease: LeaseWithDetails) => {
    setLeaseId(lease.id);
    if (lease.tenant) {
      setTenantNames(`${lease.tenant.firstName} ${lease.tenant.lastName}`);
      if (lease.tenant.phone) setTenantPhone(lease.tenant.phone);
      if (lease.tenant.email) setTenantEmail(lease.tenant.email);
    }
    if (lease.property) {
      const addr = [lease.property.address, lease.unitId ? `Apt ${lease.unitId}` : "", lease.property.city, `${lease.property.state} ${lease.property.zip}`].filter(Boolean).join(", ");
      setPremisesAddress(addr);
      if (lease.property.entity) {
        populateEntityFields(lease.property.entity);
      }
    }
    const termType = lease.leaseType === "annual" ? "1 year" : "Month-to-Month";
    setLeaseTerm(termType);
    const defaults = getDefaultLeaseDates(lease.leaseType || "annual");
    setCommencingDate(defaults.commencing);
    setEndingDate(defaults.ending);
    if (lease.rentAmount) {
      const rent = `$${parseFloat(lease.rentAmount).toLocaleString("en-US", { minimumFractionDigits: 2 })}`;
      setMonthlyRent(rent);
      setFirstMonthRent(rent);
    }
    if (lease.depositAmount) {
      const dep = `$${parseFloat(lease.depositAmount).toLocaleString("en-US", { minimumFractionDigits: 2 })}`;
      setSecurityDeposit(dep);
      setLastMonthRent(dep);
    }
    setLeaseDate(formatDate(new Date()));
    toast({ title: "Populated from lease", description: "Fields filled from selected lease data." });
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const data = {
        leaseId,
        leaseDate,
        landlordName,
        tenantNames,
        premisesAddress,
        leaseTerm,
        commencingDate,
        endingDate,
        monthlyRent,
        firstMonthRent,
        lastMonthRent,
        securityDeposit,
        lateFeePercent,
        noPets,
        noSmoking,
        insuranceMinimum,
        repairCopay,
        acFilterCheckbox,
        landlordPhone,
        landlordEmail,
        tenantPhone,
        tenantEmail,
        status,
      };
      if (docId) {
        return await apiRequest("PATCH", `/api/admin/lease-documents/${docId}`, data);
      } else {
        return await apiRequest("POST", "/api/admin/lease-documents", data);
      }
    },
    onSuccess: async (response) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/lease-documents"] });
      const result = await response.json();
      if (isNew && result.id) {
        setLocation(`/admin/lease-document/${result.id}`);
      }
      if (result.tenantSigningToken) {
        setSigningToken(result.tenantSigningToken);
      }
      toast({ title: isNew ? "Lease document created" : "Lease document saved" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const signMutation = useMutation({
    mutationFn: async (signature: string) => {
      return await apiRequest("POST", `/api/admin/lease-documents/${docId}/sign`, {
        signature,
        signedBy: "Landlord",
      });
    },
    onSuccess: async (response) => {
      const result = await response.json();
      setLandlordSignature(result.landlordSignature);
      setStatus(result.status);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/lease-documents", docId] });
      setShowSignDialog(false);
      toast({ title: "Lease signed by landlord" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("DELETE", `/api/admin/lease-documents/${docId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/lease-documents"] });
      setLocation("/admin/documents");
      toast({ title: "Lease document deleted" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const getSigningLink = () => {
    if (!signingToken) return "";
    return `${window.location.origin}/sign-lease/${signingToken}`;
  };

  const copySigningLink = () => {
    navigator.clipboard.writeText(getSigningLink());
    toast({ title: "Link copied to clipboard" });
  };

  if (docLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-[600px] w-full" />
      </div>
    );
  }

  const statusBadge = () => {
    const variants: Record<string, string> = {
      draft: "secondary",
      sent: "outline",
      partially_signed: "default",
      fully_signed: "default",
    };
    const labels: Record<string, string> = {
      draft: "Draft",
      sent: "Sent",
      partially_signed: "Partially Signed",
      fully_signed: "Fully Signed",
    };
    return (
      <Badge variant={variants[status] as any || "secondary"} data-testid="badge-lease-status">
        {status === "fully_signed" && <Check className="h-3 w-3 mr-1" />}
        {labels[status] || status}
      </Badge>
    );
  };

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setLocation("/admin/documents")} data-testid="button-back">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl font-bold" data-testid="text-page-title">
              {isNew ? "Create Lease Document" : "Edit Lease Document"}
            </h1>
            <div className="flex items-center gap-2 mt-1">
              {statusBadge()}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {!isNew && signingToken && (
            <Button variant="outline" size="sm" onClick={() => setShowLinkDialog(true)} data-testid="button-signing-link">
              <Send className="h-4 w-4 mr-1" />
              Signing Link
            </Button>
          )}
          {!isNew && docId && (
            <Button
              variant="outline"
              size="sm"
              onClick={downloadPdf}
              disabled={generatingPdf}
              data-testid="button-download-pdf"
            >
              {generatingPdf ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Download className="h-4 w-4 mr-1" />}
              {generatingPdf ? "Generating..." : "Download PDF"}
            </Button>
          )}
          {!isNew && (
            <Button variant="outline" size="sm" onClick={() => deleteMutation.mutate()} disabled={deleteMutation.isPending} data-testid="button-delete-doc">
              <Trash2 className="h-4 w-4 mr-1" />
              Delete
            </Button>
          )}
          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} data-testid="button-save-document">
            {saveMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            {isNew ? "Create" : "Save"}
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-6 md:p-10">
          <div ref={leaseContentRef} className="prose prose-sm dark:prose-invert max-w-none lease-document" data-testid="lease-document-content">
            <h2 className="text-center text-lg font-bold mb-6">RESIDENTIAL LEASE</h2>

            <p className="leading-relaxed">
              This Lease Agreement (this &ldquo;Lease&rdquo;) is dated{" "}
              <InlineField value={leaseDate} onChange={setLeaseDate} placeholder="e.g. December 8th, 2025" width="200px" testId="input-lease-date" />
              {" "}by and between{" "}
              <InlineField value={landlordName} onChange={setLandlordName} placeholder="Landlord Name" width="180px" testId="input-landlord-name" />
              {" "}(&ldquo;Landlord&rdquo;), and{" "}
              {leases && leases.length > 0 ? (
                <span data-pdf-select-root="tenant-name" style={{ display: "inline" }}>
                  <Select
                    value={leaseId || ""}
                    onValueChange={(val) => {
                      const selectedLease = leases.find(l => l.id === val);
                      if (selectedLease) {
                        populateFromLease(selectedLease);
                      }
                    }}
                  >
                    <SelectTrigger
                      className="inline-flex h-7 border-b border-t-0 border-l-0 border-r-0 rounded-none bg-blue-50/50 dark:bg-blue-950/30 px-1 font-semibold text-sm focus:ring-0"
                      style={{ width: "240px", minWidth: "120px", maxWidth: "100%" }}
                      data-testid="select-tenant-name"
                    >
                      <SelectValue placeholder="Select Tenant Name(s)" />
                    </SelectTrigger>
                    <SelectContent>
                      {leases.map((lease) => (
                        <SelectItem key={lease.id} value={lease.id} data-testid={`option-tenant-${lease.id}`}>
                          {lease.tenant ? `${lease.tenant.firstName} ${lease.tenant.lastName}` : "Unknown"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </span>
              ) : (
                <InlineField value={tenantNames} onChange={setTenantNames} placeholder="Tenant Name(s)" width="200px" testId="input-tenant-names" />
              )}
              {" "}(&ldquo;Tenant/s&rdquo;). The parties agree as follows:
            </p>

            <p className="leading-relaxed mt-4">
              <strong>Premises Lease Term & Address:</strong> Landlord leases to Tenant the property known as the (&ldquo;Premises&rdquo;) located at:{" "}
              <InlineField value={premisesAddress} onChange={setPremisesAddress} placeholder="Full property address" width="480px" testId="input-premises-address" />
              {" "}for the term of{" "}
              <InlineField value={leaseTerm} onChange={setLeaseTerm} placeholder="e.g. 1 year" width="100px" testId="input-lease-term" />
            </p>

            <p className="leading-relaxed">
              commencing on:{" "}
              <InlineField value={commencingDate} onChange={setCommencingDate} placeholder="Start date" width="180px" testId="input-commencing-date" />
              {" "}and ending on{" "}
              <InlineField value={endingDate} onChange={setEndingDate} placeholder="End date" width="180px" testId="input-ending-date" />.
            </p>

            <p className="leading-relaxed mt-4">
              <strong>1. Option to Renew:</strong> Tenant must notify Landlord in writing at least sixty (60) days prior to this lease termination date of Tenant&apos;s desire or non-desire to renew this lease or vacate the Premises. Tenant understands that without timely notice of Tenant&apos;s desire to vacate the Premises or to renew the lease that Landlord may be prejudiced in his ability to re-let the Premises and charge Tenant as liquidated damages two month&apos;s rent. Tenant understand/s and agree/s to allow landlord to schedule and show the premises starting 60 days prior to the lease expiration date, and will ensure the unit is in presentable condition during that time.
            </p>

            <p className="leading-relaxed mt-4">
              <strong>2. Rent:</strong> Tenant agrees to pay the rent in the monthly amount of{" "}
              <InlineField value={monthlyRent} onChange={setMonthlyRent} placeholder="$0.00" width="120px" testId="input-monthly-rent" />
              , and any Additional Rent, without notice or deduction, by the 1st day of each and every month. Tenant shall have five (5) grace days to pay the rent, hence, rent shall be paid no later than the 5th of each and every month of this lease.
            </p>

            <p className="leading-relaxed mt-2">
              Rent is to be paid via Zelle Transfer online or via direct deposit, or through the Portal. Any personal checks issued by Tenant must clear. If a personal check does not clear, then Tenant shall immediately provide Landlord with cash, a cashier&apos;s check, official check, ACH transfer or via Zelle transfer to replace the check that did not clear. Additionally, Landlord can demand that all future rental payments be made in cash, a cashier&apos;s check or official check.
            </p>

            <p className="leading-relaxed mt-4">
              <strong>3. Late Fee:</strong> In addition to rent, Tenant shall pay a late charge in the amount of{" "}
              <InlineField value={lateFeePercent} onChange={setLateFeePercent} placeholder="5" width="50px" testId="input-late-fee" />
              % of the monthly rent for each rent payment received by Landlord more than five (5) days after the day it is due. All late fees and bank charges shall be deemed &ldquo;Additional Rent&rdquo; and shall be due upon Landlord&apos;s demand.
            </p>

            <p className="leading-relaxed mt-4">
              <strong>4. Money Due Prior To Tenant&apos;s Occupancy:</strong> (Check all that are applicable)
            </p>
            <ul className="list-none space-y-1 ml-4">
              <li>Tenant shall pay the sum of{" "}
                <InlineField value={firstMonthRent} onChange={setFirstMonthRent} placeholder="$0.00" width="120px" testId="input-first-month-rent" />
                {" "}for the First Month&apos;s Rent.
              </li>
              <li>Tenant shall have the sum of{" "}
                <InlineField value={lastMonthRent} onChange={setLastMonthRent} placeholder="$0.00" width="120px" testId="input-last-month-rent" />
                {" "}as partial payment towards the Last Month&apos;s rent.
              </li>
              <li>Tenant shall pay the sum of{" "}
                <InlineField value={securityDeposit} onChange={setSecurityDeposit} placeholder="$0.00" width="120px" testId="input-security-deposit" />
                {" "}for the Security Deposit.
              </li>
            </ul>
            <p className="leading-relaxed mt-2">
              Prior to occupying the Premises, these sums shall be paid by cash, cashier&apos;s check, or money order upon execution of this lease.
            </p>

            <p className="leading-relaxed mt-4">
              <strong>5. Security Deposit:</strong> As specified in the preceding paragraph, Tenant shall deliver to Landlord the sum of{" "}
              <InlineField value={securityDeposit} onChange={setSecurityDeposit} placeholder="$0.00" width="120px" testId="input-security-deposit-2" />
              {" "}as a security deposit for the full and faithful performance by Tenant of the terms hereof, to be returned to Tenant, without interest, after Tenant has vacated the Premises and upon the full performance of the provisions of the Lease. Tenant shall not use the Security Deposit as rent.
            </p>

            <p className="leading-relaxed mt-4">
              <strong>6. Occupancy / Assignment & Sublet:</strong> The Premises shall be occupied only by Tenant and Tenant&apos;s immediate family for residential purposes only. The Premises may not be used for illegal, immoral, or improper purposes. Tenant shall not assign the Lease, or sublet the Premises or any part thereof, or permit the Premises or any part thereof to be used or occupied by anyone other than Tenant or members of Tenant&apos;s immediate family, without the prior written consent of Landlord.
            </p>

            <p className="leading-relaxed mt-4">
              <strong>7. Repairs:</strong> (a) Tenant shall take good care of the Premises and Landlord&apos;s appliances and furnishings therein, and shall maintain them in good order and condition, ordinary wear and tear excepted. Landlord may repair, at the expense of Tenant, all damage or injury to the Premises resulting from the misuse or negligence of Tenant, a member of Tenant&apos;s family, or other person on the premises with Tenant&apos;s consent. The cost of such repairs shall be paid by Tenant to Landlord as additional rent within five (5) days of rendition of Landlord&apos;s bill concerning such costs. All repairs have Tenant&apos;s Co-Pay as stated in section 19 and 20, page 5 and 6 of this lease.
            </p>

            <p className="leading-relaxed mt-4">
              <strong>8. Obligations of Tenant:</strong>
            </p>
            <p className="leading-relaxed">
              (a) Tenant shall be responsible to the extent not covered by Landlord&apos;s insurance for all conditions created or caused by the negligent or wrongful act or omission of Tenant, a member of his family, or other person on the Premises with Tenant&apos;s consent. Landlord strongly recommends that Tenant obtain a personal property insurance policy to protect Tenant&apos;s personal possessions.
            </p>
            <p className="leading-relaxed mt-2">
              (b) Tenant, at all times during the tenancy, SHALL: Comply with all present and future laws, regulations of Federal, State, County and Municipal authorities which may affect the use and occupation of the property. Tenant shall comply with all condominium or Homeowner&apos;s Association Rules and Regulations as same may be applicable. Tenant may not attach anything to the Premises. Tenant shall immediately notify Landlord in writing of any necessary repairs.
            </p>
            <p className="leading-relaxed mt-2">
              (c) Tenant, at all times during the tenancy, SHALL NOT: Destroy, deface, damage or remove any part of the Premises. Commit waste on the Premises. Park or store vehicles in unauthorized areas. Make changes or alterations without Landlord&apos;s prior written consent.
            </p>

            <div className="mt-4 flex items-center gap-4">
              <div className="flex items-center gap-2">
                <strong>9. No Pets:</strong>
                <Checkbox
                  checked={noPets}
                  onCheckedChange={(val) => setNoPets(!!val)}
                  data-testid="checkbox-no-pets"
                />
                <span className="text-sm text-muted-foreground">(Applicable)</span>
              </div>
            </div>
            <p className="leading-relaxed mt-1">
              No dogs or animals of any kind shall be kept in or about or on the Premises. Any violation by Tenant of this provision shall be deemed a breach of a material provision of the Lease and Landlord may elect to terminate this Lease based upon such violation.
            </p>

            <div className="mt-4 flex items-center gap-4">
              <div className="flex items-center gap-2">
                <strong>10. No Smoking:</strong>
                <Checkbox
                  checked={noSmoking}
                  onCheckedChange={(val) => setNoSmoking(!!val)}
                  data-testid="checkbox-no-smoking"
                />
                <span className="text-sm text-muted-foreground">(Applicable)</span>
              </div>
            </div>
            <p className="leading-relaxed mt-1">
              Tenant shall not smoke nor permit any of Tenant&apos;s guests, invitees, service personal, or licensees to smoke anywhere in or about or on the Premises.
            </p>

            <p className="leading-relaxed mt-4 text-xs uppercase font-semibold border-t pt-4">
              Disclosure: YOUR LEASE REQUIRES PAYMENT OF CERTAIN DEPOSITS. THE LANDLORD MAY TRANSFER ADVANCE RENTS TO THE LANDLORD&apos;S ACCOUNT AS THEY ARE DUE AND WITHOUT NOTICE. WHEN YOU MOVE OUT, YOU MUST GIVE THE LANDLORD YOUR NEW ADDRESS SO THAT THE LANDLORD CAN SEND YOU NOTICES REGARDING YOUR DEPOSIT. THE LANDLORD MUST MAIL YOU NOTICE, WITHIN 30 DAYS AFTER YOU MOVE OUT, OF THE LANDLORD&apos;S INTENT TO IMPOSE A CLAIM AGAINST THE DEPOSIT. IF YOU DO NOT REPLY TO THE LANDLORD STATING YOUR OBJECTION TO THE CLAIM WITHIN 15 DAYS AFTER RECEIPT OF THE LANDLORD&apos;S NOTICE, THE LANDLORD WILL COLLECT THE CLAIM AND MUST MAIL YOU THE REMAINING DEPOSIT, IF ANY.
            </p>

            <p className="leading-relaxed mt-4">
              <strong>11. Default:</strong> If Tenant fails to keep any of Tenant&apos;s agreements mentioned in the Lease, Landlord may serve upon Tenant the appropriate notice as referred to in the Florida Statutes. If Tenant defaults in the payment of rent, Landlord may at Landlord&apos;s option either terminate the Lease or retake possession of the Premises. Upon default, Landlord may accelerate the balance of the rental payments due.
            </p>

            <p className="leading-relaxed mt-4">
              <strong>12. End Of Term / Abandoned Property:</strong> At the end of the term, Tenant shall vacate and surrender the Premises to Landlord, cleaned, and in as good condition as they were at the beginning of the term, ordinary wear and tear excepted, and Tenant shall remove all of Tenant&apos;s property.
            </p>

            <p className="leading-relaxed mt-4">
              <strong>13. Waiver of Trial by Jury:</strong> Landlord and Tenant hereby waive trial by jury in any action, proceeding or counterclaim brought by either party against the other pertaining to any matters whatsoever arising out of or in any way connected with the Lease.
            </p>

            <p className="leading-relaxed mt-4">
              <strong>14. Landlord&apos;s Right of Inspection:</strong> Landlord&apos;s right to enter the Premises shall be governed by the provisions of Section 83.53, Florida Statutes.
            </p>

            <p className="leading-relaxed mt-4">
              <strong>15. Possession of Property:</strong> Tenant has inspected the Premises and is familiar and satisfied with its present condition. The taking of possession of the Premises by Tenant shall be conclusive evidence that the Premises were in good and satisfactory condition. Upon keys hand over, Tenant/s understand that the premises is rented As Is condition.
            </p>

            <p className="leading-relaxed mt-4">
              <strong>16. Tenant&apos;s Personal Property:</strong> Tenant agrees that upon surrender or abandonment, Landlord shall not be liable or responsible for storage or disposition of Tenant&apos;s personal property. Tenant agrees that Landlord has the right to dispose of any of Tenant&apos;s personal property remaining on, in, or about the premises after surrender or abandonment, in any method that Landlord desires.
            </p>

            <p className="leading-relaxed mt-4">
              <strong>17. Insurance/Indemnity/Release:</strong> Tenant is advised to ensure tenant&apos;s personal property and obtain liability insurance, which policy shall name Landlord as an additional insured. Landlord does not provide any insurance for personal property or liability. All personal property stored or placed by the Tenant in the Premises is at Tenant&apos;s sole risk. Tenant agrees to indemnify and hold Landlord harmless for any claims against Landlord, including payment of reasonable attorney&apos;s fees for Landlord to hire an attorney of Landlord&apos;s choice for any claims or suits arising by virtue of Tenant&apos;s obligations under this Lease. Tenant understands that no home or community is 100% safe or crime free. Tenant understands that accidents, injuries and even death can happen at any time. Tenant agrees to assume the risks incidental to living in this property on Tenant&apos;s own behalf, on behalf of Tenant&apos;s child/children, and on behalf Tenant family, heirs, next of kin, legal representatives, executors, administrators, and assigns and Tenant release and forever discharge the Landlord of and from all liabilities, claims, actions, suits, damages, costs or expenses of any nature, arising out of or in any way connected with this lease agreement and further agree to indemnify and hold the Landlord harmless against any and all such liabilities, claims, actions, damages, costs or expenses, including, but not limited to, attorney&apos;s fees and disbursements. Tenant understands that this release and indemnity agreement includes any claims based on the negligence (passive, active, gross or otherwise), actions or inaction of the Landlord and covers bodily injury, death, and property damage, whether suffered by Tenant or Tenant&apos;s child.
            </p>

            <p className="leading-relaxed mt-4">
              <strong>17.1</strong> Tenant agrees and represents to landlord that tenant will obtain liability and personal property coverage for the rented property for the minimal amount of{" "}
              <InlineField value={insuranceMinimum} onChange={setInsuranceMinimum} placeholder="$300,000.00" width="140px" testId="input-insurance-minimum" />
              . The liability coverage will insure personal property and personal injury of tenant and any guests of tenant. Tenant agrees landlord is not liable and holds landlord harmless for any personal injury which takes place on the subject property resulting from tenant&apos;s negligence, intoxication, willful misconduct, or failure to follow safety protocols.
            </p>

            <p className="leading-relaxed mt-4">
              <strong>18. Miscellaneous:</strong>
            </p>
            <p className="leading-relaxed mt-2">
              <strong>18.1 Amendment.</strong> No modification or amendment of this Residential Lease shall be of any force or effect unless in writing executed by both Landlord and Tenant.
            </p>
            <p className="leading-relaxed mt-2">
              <strong>18.2 Entire Agreement.</strong> This Residential Lease sets forth the entire agreement between Landlord and Tenant relating to the Property and all subject matter herein, and supersedes all prior and contemporaneous negotiations, understandings and agreements, written or oral, between the parties, and there are no agreements, understandings, warranties, representations among the parties except as otherwise indicated herein.
            </p>
            <p className="leading-relaxed mt-2">
              <strong>18.3 Governing Law.</strong> This Residential Lease shall be interpreted in accordance with the internal laws of the State of Florida, both substantive and remedial, regardless of the domicile of any party, and will be deemed for such purposes to have been made, executed and performed in the State of Florida.
            </p>
            <p className="leading-relaxed mt-2">
              <strong>18.4 Section and Paragraph Headings.</strong> The section and paragraph headings herein contained are for the purposes of identification only and shall not be considered in construing this Residential Lease.
            </p>
            <p className="leading-relaxed mt-2">
              <strong>18.5 Severability.</strong> Should any clause or provision of this Residential Lease be determined to be illegal, invalid or unenforceable under any present or future law by final judgment of a court of competent jurisdiction, the remainder of this Contract will not be affected thereby. It is the intention of the parties that if any such provision is held to be illegal, invalid, or unenforceable, there will be added in lieu thereof a legal, valid and enforceable provision that is as similar in terms to such provision as is possible.
            </p>
            <p className="leading-relaxed mt-2">
              <strong>18.6 Delivery of Notices.</strong> Notices shall be delivered to the addresses listed above. Delivery by mail is not considered complete under actual receipt by Landlord. Notices to Tenant shall be deemed served upon Tenant when placed in the mail to Tenant&apos;s last known post offices address or hand delivered. If Tenant is more than one person, then notice to one shall be sufficient as to notice to all.
            </p>

            <div className="mt-4 flex items-center gap-4">
              <div className="flex items-center gap-2">
                <strong>18.7</strong>
                <Checkbox
                  checked={acFilterCheckbox}
                  onCheckedChange={(val) => setAcFilterCheckbox(!!val)}
                  data-testid="checkbox-ac-filter"
                />
                <span className="text-sm">(Applicable)</span>
              </div>
            </div>
            <p className="leading-relaxed mt-1">
              Tenant is responsible for replacing the A/C filter every month. Tenant will be responsible for A/C repairs caused by not replacing the air filter on a monthly basis.
            </p>

            <p className="leading-relaxed mt-4">
              <strong>19.</strong> Tenant agrees and represents to landlord that tenant will be responsible for the first{" "}
              <InlineField value={repairCopay} onChange={setRepairCopay} placeholder="$250" width="100px" testId="input-repair-copay" />
              {" "}of the cost of any and all repairs needed in the house, even if it is the Owner&apos;s responsibility, during the terms of the lease.
            </p>

            <p className="leading-relaxed mt-4">
              <strong>20.</strong> The following items have been provided to Tenant in good working order and condition and are the Tenant&apos;s responsibility to repair should it be necessary:
            </p>
            <ul className="list-none space-y-2 ml-4 mt-2">
              <li><strong>A.</strong> Smoke Detectors &ndash; if it beeps, then Tenant shall be responsible to replace the battery.</li>
              <li><strong>B.</strong> Light Bulbs &ndash; Tenant is responsible to replace any light bulbs.</li>
              <li><strong>C.</strong> Clogged Toilets &ndash; Clogged Toilet is the responsibility of the tenant.</li>
              <li><strong>D.</strong> Garbage Disposal &ndash; Any damage to the garbage disposal due to disposal of bottle caps, coins, silverware &amp; or any other type of metals or hard materials will be the tenant&apos;s responsibility.</li>
              <li><strong>E.</strong> Extermination is the responsibility of the tenant including any insects, Ants, Rodent, Rats and Mice.</li>
              <li><strong>F.</strong> Landscaping maintenance all around the premises (i.e Flowers, Plants, bushes, grass, trees trimming) is the responsibility of the tenant/s. The Association is responsible for exterior landscaping.</li>
              <li><strong>G.</strong> Shutter installation and removal is the sole responsibility of the tenant.</li>
              <li><strong>H.</strong> Front/Main/screen Doors and Windows, Locks and glass, are the responsibility of the tenant.</li>
              <li><strong>I.</strong> Window Blinds are responsibility of the tenant. (In the end of a lease, tenant shall be responsible to have the blinds in good working order).</li>
              <li><strong>J.</strong> Tenant must change air filter every month and dispose a cup (1 cup) of Vinegar in AC Drain every month. Tenant is responsible to maintain at all times a clean AC coil, and AC closet.</li>
              <li><strong>K.</strong> Heating of the premises is the sole responsibility of the tenant.</li>
              <li><strong>L.</strong> All utilities: Water, Sewer, Power and Electric, Internet and Trash are the sole responsibility of the tenant.</li>
            </ul>

            <p className="leading-relaxed mt-6">
              <strong>20.1 Landlord&apos;s responsibility to repair should it be necessary:</strong>
            </p>
            <ul className="list-none space-y-2 ml-4 mt-2">
              <li><strong>A.</strong> Appliances. (Fridge, Stove, Dish Washer, Washer/Dryer, Microwave (if permanent, not including stationary one).</li>
              <li><strong>B.</strong> Leaks (Except Roof Leaks which are repaired by the association).</li>
              <li><strong>C.</strong> Air Conditioner Mechanical and Electric, NOT including AC filters, AC Thermostat, AC coil, AC drain line or HVAC Heating.</li>
              <li><strong>D.</strong> Water Heater.</li>
            </ul>
            <p className="leading-relaxed mt-2">
              Should Tenant need any repair that is the responsibility of the Landlord, Tenant shall send an email to landlord at: <strong>repairs@atidrealty.com</strong> Monday-Friday 9am-5pm eastern time only, or through your portal.
            </p>

            <p className="leading-relaxed mt-4">
              <strong>20.2</strong> Tenant agrees and represents to landlord that tenant will not flush ANYTHING into the toilet except toilet paper or bodily waste.
            </p>

            <p className="leading-relaxed mt-4">
              <strong>20.4</strong> Tenant agrees to not discarding food scraping into kitchen drain &amp; or garbage disposal.
            </p>

            <p className="leading-relaxed mt-4">
              <strong>21.</strong> Tenant and Landlord: In order to prevent molding and/or any other damage caused to the apartment by Florida humidity the tenant has been instructed to set the Air Conditioning to AUTO at 77 degrees Fahrenheit or cooler at all-time even when the apartment is vacant. The tenant has agreed to this term.
            </p>

            <p className="leading-relaxed mt-4">
              <strong>21.A</strong> In the event of mold or any other health hazard and/or risk to tenant, tenant will have to vacate the premises immediately at tenant&apos;s expense, and allow to break the lease with no penalty to Tenant.
            </p>

            <p className="leading-relaxed mt-6 font-semibold text-center">
              IN WITNESS WHEREOF, the parties have executed the Lease as of the day and year first above written.
            </p>

            <div className="mt-10 border-t pt-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <h4 className="font-semibold text-sm">TENANT(S):</h4>
                  <TypedSignature
                    label="Tenant Signature"
                    existingSignature={tenantSignature}
                    onSave={(sig) => setTenantSignature(sig)}
                    disabled={true}
                    defaultName={tenantNames}
                  />
                  {tenantSignature && existingDoc?.tenantSignedAt && (
                    <p className="text-xs text-muted-foreground">
                      Signed by {existingDoc?.tenantSignedBy || "Tenant"} on{" "}
                      {formatDate(existingDoc.tenantSignedAt)}
                    </p>
                  )}
                  {!tenantSignature && docId && (
                    <p className="text-xs text-muted-foreground">
                      Tenant will sign using the signing link sent to them.
                    </p>
                  )}
                  <div className="space-y-3 mt-4 border-t pt-4">
                    <div>
                      <label className="text-xs text-muted-foreground block mb-1">Print Name</label>
                      <InlineField value={tenantNames} onChange={setTenantNames} placeholder="Tenant Name(s)" width="100%" testId="input-tenant-print-name" />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground block mb-1">Tenant&apos;s Cell Phone Number</label>
                      <InlineField value={tenantPhone} onChange={setTenantPhone} placeholder="(555) 555-5555" width="100%" testId="input-tenant-phone" />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground block mb-1">Tenant&apos;s E-Mail</label>
                      <InlineField value={tenantEmail} onChange={setTenantEmail} placeholder="tenant@email.com" width="100%" testId="input-tenant-email" />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-semibold text-sm">LANDLORD:</h4>
                  <TypedSignature
                    label="Landlord Signature"
                    existingSignature={landlordSignature}
                    onSave={(sig) => {
                      if (docId) {
                        signMutation.mutate(sig);
                      } else {
                        setLandlordSignature(sig);
                      }
                    }}
                    disabled={!!landlordSignature}
                    defaultName="Yanni Sabag"
                  />
                  {landlordSignature && existingDoc?.landlordSignedAt && (
                    <p className="text-xs text-muted-foreground">
                      Signed by {existingDoc?.landlordSignedBy || "Landlord"} on{" "}
                      {formatDate(existingDoc.landlordSignedAt)}
                    </p>
                  )}
                  <div className="space-y-3 mt-4 border-t pt-4">
                    <div>
                      <label className="text-xs text-muted-foreground block mb-1">Print Name</label>
                      <div className="text-sm font-medium py-1" data-testid="text-landlord-print-name">Yanni Sabag</div>
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground block mb-1">Landlord&apos;s Phone Number</label>
                      <div className="text-sm py-1" data-testid="text-landlord-phone">954-338-3885</div>
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground block mb-1">Landlord&apos;s E-Mail</label>
                      <div className="text-sm py-1" data-testid="text-landlord-email">info@atidrealty.com</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showLinkDialog} onOpenChange={setShowLinkDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Tenant Signing Link</DialogTitle>
            <DialogDescription>
              Share this link with the tenant so they can review and sign the lease.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Input value={getSigningLink()} readOnly className="text-xs" data-testid="input-signing-link" />
              <Button size="icon" variant="outline" onClick={copySigningLink} data-testid="button-copy-link">
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLinkDialog(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}