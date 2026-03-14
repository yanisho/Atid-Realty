import { useState } from "react";
import { formatDate } from "@/lib/date-utils";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { DollarSign, Clock, AlertTriangle, CheckCircle, RefreshCw, Plus, CreditCard, XCircle, FileText, Pencil, Trash2, Building2, MapPin, ArrowUpDown, ArrowUp, ArrowDown, BookOpen } from "lucide-react";
import type { RentCharge, Property, Tenant, Entity, InvoiceItem, Lease } from "@shared/schema";

export default function AdminRentCharges() {
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("status") || "__all__";
  });
  const [propertyFilter, setPropertyFilter] = useState("all");
  const sc = (v: string) => v.replace(/,/g, '');
  const initMonth = () => new Date().toISOString().slice(0, 7);
  const toDisplay = (yyyymm: string) => { const [y, m] = yyyymm.split("-"); return `${m}-${y}`; };
  const [monthFilter, setMonthFilter] = useState(initMonth);
  const [monthFilterDisplay, setMonthFilterDisplay] = useState(() => toDisplay(initMonth()));
  const [searchQuery, setSearchQuery] = useState("");
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false);
  const [generateMonth, setGenerateMonth] = useState(initMonth);
  const [generateMonthDisplay, setGenerateMonthDisplay] = useState(() => toDisplay(initMonth()));

  const [invoiceCharge, setInvoiceCharge] = useState<RentCharge | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(() => {
    const now = new Date();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    const yyyy = now.getFullYear();
    return `${mm}.${dd}.${yyyy}`;
  });
  const [showPaymentInput, setShowPaymentInput] = useState(false);
  const [addingItem, setAddingItem] = useState(false);
  const [newItemDesc, setNewItemDesc] = useState("");
  const [newItemAmount, setNewItemAmount] = useState("");
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editItemDesc, setEditItemDesc] = useState("");
  const [editItemAmount, setEditItemAmount] = useState("");
  const [deletingChargeId, setDeletingChargeId] = useState<string | null>(null);
  const [editingRent, setEditingRent] = useState(false);
  const [editRentAmount, setEditRentAmount] = useState("");
  const [sortColumn, setSortColumn] = useState<"status" | "paid" | "property" | "latefee" | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [ledgerTenantId, setLedgerTenantId] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createMode, setCreateMode] = useState<"lease" | "manual">("lease");
  const [createLeaseId, setCreateLeaseId] = useState("");
  const [createMonth, setCreateMonth] = useState(initMonth);
  const [createMonthDisplay, setCreateMonthDisplay] = useState(() => toDisplay(initMonth()));
  const [createAmount, setCreateAmount] = useState("");
  const [manualPropertyName, setManualPropertyName] = useState("");
  const [manualTenantName, setManualTenantName] = useState("");
  const [manualStatus, setManualStatus] = useState("paid");

  const { data: charges = [], isLoading } = useQuery<RentCharge[]>({
    queryKey: ["/api/admin/rent-charges", propertyFilter, monthFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (propertyFilter !== "all") params.set("propertyId", propertyFilter);
      if (monthFilter) params.set("chargeMonth", monthFilter);
      const token = localStorage.getItem("adminToken");
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const res = await fetch(`/api/admin/rent-charges?${params}`, { credentials: "include", headers });
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  const { data: properties = [] } = useQuery<Property[]>({
    queryKey: ["/api/admin/properties"],
  });

  const { data: tenants = [] } = useQuery<Tenant[]>({
    queryKey: ["/api/admin/tenants"],
  });

  const { data: entitiesList = [] } = useQuery<Entity[]>({
    queryKey: ["/api/admin/entities"],
  });

  const { data: allLeases = [] } = useQuery<(Lease & { tenant?: Tenant; property?: Property })[]>({
    queryKey: ["/api/admin/leases"],
  });

  const { data: ledgerCharges = [], isLoading: ledgerLoading } = useQuery<RentCharge[]>({
    queryKey: ["/api/admin/rent-charges", "ledger", ledgerTenantId],
    queryFn: async () => {
      if (!ledgerTenantId) return [];
      const token = localStorage.getItem("adminToken");
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const res = await fetch(`/api/admin/rent-charges?tenantId=${ledgerTenantId}`, { credentials: "include", headers });
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    enabled: !!ledgerTenantId,
  });

  const { data: invoiceItems = [], refetch: refetchInvoiceItems } = useQuery<InvoiceItem[]>({
    queryKey: ["/api/admin/rent-charges", invoiceCharge?.id, "invoice-items"],
    queryFn: async () => {
      if (!invoiceCharge) return [];
      const res = await fetch(`/api/admin/rent-charges/${invoiceCharge.id}/invoice-items`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    enabled: !!invoiceCharge,
  });

  const generateMutation = useMutation({
    mutationFn: async (month: string) => {
      const res = await apiRequest("POST", "/api/admin/rent-charges/generate", { month });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/rent-charges"] });
      toast({ title: `Generated ${data.generated} rent charges`, description: `${data.skipped} skipped (already exist)` });
      setGenerateDialogOpen(false);
    },
    onError: () => toast({ title: "Failed to generate charges", variant: "destructive" }),
  });

  const createInvoiceMutation = useMutation({
    mutationFn: async ({ leaseId, chargeMonth, baseRent }: { leaseId: string; chargeMonth: string; baseRent: string }) => {
      const res = await apiRequest("POST", "/api/admin/rent-charges/create", { leaseId, chargeMonth, baseRent });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/rent-charges"] });
      toast({ title: "Invoice created successfully" });
      setCreateDialogOpen(false);
      setCreateLeaseId("");
      setCreateAmount("");
    },
    onError: (err: Error) => toast({ title: err.message || "Failed to create invoice", variant: "destructive" }),
  });

  const createManualMutation = useMutation({
    mutationFn: async (data: { propertyName: string; tenantName: string; chargeMonth: string; baseRent: string; status: string }) => {
      const res = await apiRequest("POST", "/api/admin/rent-charges/manual", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/rent-charges"] });
      toast({ title: "Manual invoice created successfully" });
      setCreateDialogOpen(false);
      setManualPropertyName("");
      setManualTenantName("");
      setCreateAmount("");
      setManualStatus("paid");
    },
    onError: (err: Error) => toast({ title: err.message || "Failed to create manual invoice", variant: "destructive" }),
  });

  const applyLateFeesMutation = useMutation({
    mutationFn: async (month: string) => {
      const res = await apiRequest("POST", "/api/admin/rent-charges/apply-late-fees", { month });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/rent-charges"] });
      toast({ title: `Applied late fees to ${data.applied} charges`, description: `${data.skipped} skipped` });
    },
    onError: () => toast({ title: "Failed to apply late fees", variant: "destructive" }),
  });

  const syncLeaseAmountsMutation = useMutation({
    mutationFn: async (month: string) => {
      const res = await apiRequest("POST", "/api/admin/rent-charges/sync-lease-amounts", { month });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/rent-charges"] });
      if (data.updated > 0) {
        toast({ title: `Updated ${data.updated} charges`, description: "Rent amounts synced to match lease values" });
      } else {
        toast({ title: "All charges already match lease amounts" });
      }
    },
    onError: () => toast({ title: "Failed to sync rent amounts", variant: "destructive" }),
  });

  const recordPaymentMutation = useMutation({
    mutationFn: async ({ chargeId, amount, date }: { chargeId: string; amount: string; date?: string }) => {
      const body: any = { amount: parseFloat(amount) };
      if (date) {
        const match = date.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
        if (match) {
          body.paidAt = `${match[3]}-${match[1]}-${match[2]}T00:00:00.000Z`;
        }
      }
      const res = await apiRequest("POST", `/api/admin/rent-charges/${chargeId}/record-payment`, body);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/rent-charges"] });
      toast({ title: "Payment recorded" });
      setShowPaymentInput(false);
      setPaymentAmount("");
      if (data) setInvoiceCharge(data);
    },
    onError: () => toast({ title: "Failed to record payment", variant: "destructive" }),
  });

  const waiveLateFee = useMutation({
    mutationFn: async (chargeId: string) => {
      const res = await apiRequest("POST", `/api/admin/rent-charges/${chargeId}/waive-late-fee`);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/rent-charges"] });
      toast({ title: "Late fee waived successfully" });
      if (data) setInvoiceCharge(data);
    },
    onError: () => toast({ title: "Failed to waive late fee", variant: "destructive" }),
  });

  const applyLateFeeToCharge = useMutation({
    mutationFn: async (chargeId: string) => {
      const res = await apiRequest("POST", `/api/admin/rent-charges/${chargeId}/apply-late-fee`);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/rent-charges"] });
      toast({ title: "5% late fee applied" });
      if (data) setInvoiceCharge(data);
    },
    onError: (err: Error) => toast({ title: err.message || "Failed to apply late fee", variant: "destructive" }),
  });

  const addInvoiceItem = useMutation({
    mutationFn: async ({ chargeId, description, amount }: { chargeId: string; description: string; amount: string }) => {
      const res = await apiRequest("POST", `/api/admin/rent-charges/${chargeId}/invoice-items`, { description, amount: parseFloat(amount) });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/rent-charges"] });
      refetchInvoiceItems();
      setAddingItem(false);
      setNewItemDesc("");
      setNewItemAmount("");
      toast({ title: "Line item added" });
      refreshInvoiceCharge();
    },
    onError: () => toast({ title: "Failed to add line item", variant: "destructive" }),
  });

  const updateInvoiceItem = useMutation({
    mutationFn: async ({ id, description, amount }: { id: string; description: string; amount: string }) => {
      const res = await apiRequest("PATCH", `/api/admin/invoice-items/${id}`, { description, amount: parseFloat(amount) });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/rent-charges"] });
      refetchInvoiceItems();
      setEditingItemId(null);
      toast({ title: "Line item updated" });
      refreshInvoiceCharge();
    },
    onError: () => toast({ title: "Failed to update line item", variant: "destructive" }),
  });

  const deleteInvoiceItem = useMutation({
    mutationFn: async ({ id, rentChargeId }: { id: string; rentChargeId: string }) => {
      const res = await apiRequest("DELETE", `/api/admin/invoice-items/${id}`, { rentChargeId });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/rent-charges"] });
      refetchInvoiceItems();
      toast({ title: "Line item removed" });
      refreshInvoiceCharge();
    },
    onError: () => toast({ title: "Failed to remove line item", variant: "destructive" }),
  });

  const editRentMutation = useMutation({
    mutationFn: async ({ chargeId, baseRent }: { chargeId: string; baseRent: string }) => {
      const res = await apiRequest("PATCH", `/api/admin/rent-charges/${chargeId}`, { baseRent });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/rent-charges"] });
      toast({ title: "Monthly rent updated" });
      setEditingRent(false);
      if (data) setInvoiceCharge(data);
    },
    onError: () => toast({ title: "Failed to update rent", variant: "destructive" }),
  });

  const deleteChargeMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/admin/rent-charges/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/rent-charges"] });
      toast({ title: "Rent charge deleted" });
      setInvoiceCharge(null);
      setDeletingChargeId(null);
    },
    onError: () => toast({ title: "Failed to delete charge", variant: "destructive" }),
  });

  const refreshInvoiceCharge = async () => {
    if (!invoiceCharge) return;
    try {
      const res = await fetch(`/api/admin/rent-charges?chargeMonth=${invoiceCharge.chargeMonth}`, { credentials: "include" });
      if (res.ok) {
        const all = await res.json();
        const updated = all.find((c: RentCharge) => c.id === invoiceCharge.id);
        if (updated) setInvoiceCharge(updated);
      }
    } catch {}
  };

  const getProperty = (propertyId: string) => properties.find((p: Property) => p.id === propertyId);
  const getPropertyName = (propertyId: string) => {
    const p = getProperty(propertyId);
    return p?.name || p?.propertyCode || "—";
  };
  const getTenantName = (tenantId: string) => {
    const t = tenants.find((t: Tenant) => t.id === tenantId);
    return t ? `${t.firstName} ${t.lastName}` : "—";
  };
  const getTenant = (tenantId: string) => tenants.find((t: Tenant) => t.id === tenantId);
  const getEntity = (propertyId: string) => {
    const property = getProperty(propertyId);
    if (!property?.entityId) return null;
    return entitiesList.find((e: Entity) => e.id === property.entityId) || null;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "paid": return <Badge className="bg-green-600 text-white no-default-hover-elevate"><CheckCircle className="w-3 h-3 mr-1" />Paid</Badge>;
      case "late": return <Badge variant="destructive"><AlertTriangle className="w-3 h-3 mr-1" />Late</Badge>;
      case "partial": return <Badge className="bg-yellow-600 text-white no-default-hover-elevate"><Clock className="w-3 h-3 mr-1" />Partial</Badge>;
      default: return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Open</Badge>;
    }
  };

  const toggleSort = (column: "status" | "paid" | "property" | "latefee") => {
    if (sortColumn === column) {
      setSortDirection(prev => prev === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection(column === "latefee" ? "desc" : "asc");
    }
  };

  const getSortIcon = (column: "status" | "paid" | "property" | "latefee") => {
    if (sortColumn !== column) return <ArrowUpDown className="w-3 h-3 ml-1" />;
    return sortDirection === "asc" ? <ArrowUp className="w-3 h-3 ml-1" /> : <ArrowDown className="w-3 h-3 ml-1" />;
  };

  const statusOrder: Record<string, number> = { open: 0, partial: 1, paid: 2 };

  const isProcessing = (c: RentCharge) => {
    const paid = parseFloat(c.amountPaid || "0");
    const totalDue = parseFloat(c.totalDue || "0");
    return c.status !== "paid" && paid >= totalDue && totalDue > 0;
  };

  const isPastDue = (c: RentCharge) => {
    if (c.status === "paid") return false;
    if (isProcessing(c)) return false;
    const baseRent = parseFloat(c.baseRent || "0");
    const paid = parseFloat(c.amountPaid || "0");
    return baseRent > 0 && paid < baseRent;
  };

  const filteredCharges = charges.filter((c: RentCharge) => {
    if (statusFilter === "collected" && c.status !== "paid" && c.status !== "partial") return false;
    if (statusFilter === "processing" && !isProcessing(c)) return false;
    if (statusFilter === "past_due" && !isPastDue(c)) return false;
    if (statusFilter === "late_fees") {
      if (!c.lateFeeApplied || c.status === "paid") return false;
      const lateFee = parseFloat(c.lateFeeAmount || "0");
      if (lateFee <= 0) return false;
    }
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (c.manualPropertyName || getPropertyName(c.propertyId)).toLowerCase().includes(q) ||
      (c.manualTenantName || getTenantName(c.tenantId)).toLowerCase().includes(q) ||
      c.chargeMonth?.includes(q)
    );
  }).sort((a: RentCharge, b: RentCharge) => {
    if (!sortColumn) return 0;
    let cmp = 0;
    if (sortColumn === "property") {
      const nameA = (a.manualPropertyName || getPropertyName(a.propertyId)).toLowerCase();
      const nameB = (b.manualPropertyName || getPropertyName(b.propertyId)).toLowerCase();
      cmp = nameA.localeCompare(nameB);
    } else if (sortColumn === "status") {
      cmp = (statusOrder[a.status || "open"] ?? 0) - (statusOrder[b.status || "open"] ?? 0);
    } else if (sortColumn === "latefee") {
      cmp = parseFloat(a.lateFeeAmount || "0") - parseFloat(b.lateFeeAmount || "0");
    } else if (sortColumn === "paid") {
      cmp = parseFloat(a.amountPaid || "0") - parseFloat(b.amountPaid || "0");
    }
    return sortDirection === "desc" ? -cmp : cmp;
  });

  const allCharges = charges;
  const totalDue = allCharges.reduce((sum: number, c: RentCharge) => sum + parseFloat(c.totalDue || "0"), 0);
  const totalCollected = allCharges
    .filter((c: RentCharge) => c.status === "paid" || c.status === "partial")
    .reduce((sum: number, c: RentCharge) => sum + parseFloat(c.amountPaid || "0"), 0);
  const processingCharges = allCharges.filter((c: RentCharge) => isProcessing(c));
  const totalProcessing = processingCharges.reduce((sum: number, c: RentCharge) => {
    const due = parseFloat(c.totalDue || "0");
    const paid = parseFloat(c.amountPaid || "0");
    return sum + Math.max(0, due - paid);
  }, 0);
  const lateFeeCharges = allCharges.filter((c: RentCharge) => c.lateFeeApplied && c.status !== "paid" && parseFloat(c.lateFeeAmount || "0") > 0);
  const totalLateFees = lateFeeCharges.reduce((sum: number, c: RentCharge) => sum + parseFloat(c.lateFeeAmount || "0"), 0);
  const pastDueCharges = allCharges.filter((c: RentCharge) => isPastDue(c));
  const pastDueAmount = pastDueCharges.reduce((sum: number, c: RentCharge) => {
    const baseRent = parseFloat(c.baseRent || "0");
    const paid = parseFloat(c.amountPaid || "0");
    return sum + Math.max(0, baseRent - paid);
  }, 0);

  const fmtCurrency = (val: number) => val.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const formatMonth = (m: string) => {
    const [year, month] = m.split("-");
    return `${month}-${year}`;
  };

  const parseMonthInput = (val: string): string | null => {
    const match = val.match(/^(\d{1,2})-(\d{4})$/);
    if (match) {
      const m = parseInt(match[1]);
      if (m >= 1 && m <= 12) return `${match[2]}-${match[1].padStart(2, "0")}`;
    }
    return null;
  };

  const onMonthChange = (raw: string, setDisplay: (v: string) => void, setInternal: (v: string) => void) => {
    const cleaned = raw.replace(/[^0-9-]/g, "");
    setDisplay(cleaned);
    const parsed = parseMonthInput(cleaned);
    if (parsed) setInternal(parsed);
  };

  const openInvoice = (charge: RentCharge) => {
    setInvoiceCharge(charge);
    setShowPaymentInput(false);
    setPaymentAmount("");
    setAddingItem(false);
    setEditingItemId(null);
    const remaining = parseFloat(charge.totalDue || "0") - parseFloat(charge.amountPaid || "0");
    setPaymentAmount(remaining > 0 ? remaining.toFixed(2) : "0.00");
  };

  const closeInvoice = () => {
    setInvoiceCharge(null);
    setShowPaymentInput(false);
    setPaymentAmount("");
    setAddingItem(false);
    setEditingItemId(null);
    setDeletingChargeId(null);
    setEditingRent(false);
    setEditRentAmount("");
  };

  const invoiceEntity = invoiceCharge ? getEntity(invoiceCharge.propertyId) : null;
  const invoiceProperty = invoiceCharge ? getProperty(invoiceCharge.propertyId) : null;
  const invoiceTenant = invoiceCharge ? getTenant(invoiceCharge.tenantId) : null;
  const invoiceItemsTotal = invoiceItems.reduce((sum, item) => sum + parseFloat(item.amount), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-rent-charges-title">Rent Charges & Late Fees</h1>
          <p className="text-muted-foreground text-sm">Track monthly rent charges and automatic 5% late fees</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            onClick={() => applyLateFeesMutation.mutate(monthFilter)}
            disabled={applyLateFeesMutation.isPending}
            data-testid="button-apply-late-fees"
          >
            <AlertTriangle className="w-4 h-4 mr-2" />
            Apply Late Fees
          </Button>
          <Button onClick={() => setGenerateDialogOpen(true)} data-testid="button-generate-charges">
            <Plus className="w-4 h-4 mr-2" />
            Generate Charges
          </Button>
          <Button
            variant="outline"
            onClick={() => syncLeaseAmountsMutation.mutate(monthFilter)}
            disabled={syncLeaseAmountsMutation.isPending}
            data-testid="button-sync-lease-amounts"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${syncLeaseAmountsMutation.isPending ? "animate-spin" : ""}`} />
            Sync to Lease
          </Button>
          <Button variant="outline" onClick={() => setCreateDialogOpen(true)} data-testid="button-create-invoice">
            <FileText className="w-4 h-4 mr-2" />
            Create Invoice
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card
          className={`cursor-pointer transition-all hover:shadow-md ${statusFilter === "__all__" ? "ring-2 ring-primary" : ""}`}
          onClick={() => setStatusFilter("__all__")}
          data-testid="card-total-due"
        >
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Due</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold" data-testid="text-total-due">${fmtCurrency(totalDue)}</div>
            <p className="text-xs text-muted-foreground">{formatMonth(monthFilter)} · {allCharges.length} invoices</p>
          </CardContent>
        </Card>
        <Card
          className={`cursor-pointer transition-all hover:shadow-md ${statusFilter === "collected" ? "ring-2 ring-green-600" : ""}`}
          onClick={() => setStatusFilter("collected")}
          data-testid="card-total-collected"
        >
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Collected</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-green-600" data-testid="text-total-collected">${fmtCurrency(totalCollected)}</div>
            <p className="text-xs text-muted-foreground">{allCharges.filter((c: RentCharge) => c.status === "paid" || c.status === "partial").length} Total</p>
          </CardContent>
        </Card>
        <Card
          className={`cursor-pointer transition-all hover:shadow-md ${statusFilter === "late_fees" ? "ring-2 ring-destructive" : ""}`}
          onClick={() => setStatusFilter("late_fees")}
          data-testid="card-late-fees"
        >
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Late Fees</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-destructive" data-testid="text-total-late-fees">${fmtCurrency(totalLateFees)}</div>
            <p className="text-xs text-muted-foreground">{lateFeeCharges.length} outstanding</p>
          </CardContent>
        </Card>
        <Card
          className={`cursor-pointer transition-all hover:shadow-md ${statusFilter === "past_due" ? "ring-2 ring-yellow-600" : ""}`}
          onClick={() => setStatusFilter("past_due")}
          data-testid="card-past-due"
        >
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Past Due</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold" data-testid="text-outstanding-count">{pastDueCharges.length}</div>
            <p className="text-xs text-muted-foreground">${fmtCurrency(pastDueAmount)} remaining</p>
          </CardContent>
        </Card>
      </div>
      <div className="flex items-center gap-3 flex-wrap">
        <Input
          placeholder="Search tenants, properties..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-xs"
          data-testid="input-search-charges"
        />
        <Input
          type="text"
          placeholder="MM-YYYY"
          value={monthFilterDisplay}
          onChange={(e) => onMonthChange(e.target.value, setMonthFilterDisplay, setMonthFilter)}
          className="max-w-[180px]"
          data-testid="input-month-filter"
        />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px]" data-testid="select-status-filter">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All Status</SelectItem>
            <SelectItem value="paid">Collected</SelectItem>
            <SelectItem value="late_fees">Late Fees</SelectItem>
            <SelectItem value="past_due">Past Due</SelectItem>
            <SelectItem value="late">Late</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="partial">Partial</SelectItem>
          </SelectContent>
        </Select>
        <Select value={propertyFilter} onValueChange={setPropertyFilter}>
          <SelectTrigger className="w-[180px]" data-testid="select-property-filter">
            <SelectValue placeholder="Property" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Properties</SelectItem>
            {properties.map((p: Property) => (
              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Month</TableHead>
                <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("property")} data-testid="sort-property">
                  <span className="inline-flex items-center">Property{getSortIcon("property")}</span>
                </TableHead>
                <TableHead>Tenant</TableHead>
                <TableHead className="text-right">Base Rent</TableHead>
                <TableHead className="text-right cursor-pointer select-none" onClick={() => toggleSort("latefee")} data-testid="sort-latefee">
                  <span className="inline-flex items-center">Late Fee{getSortIcon("latefee")}</span>
                </TableHead>
                <TableHead className="text-right">Total Due</TableHead>
                <TableHead className="text-right cursor-pointer select-none" onClick={() => toggleSort("paid")} data-testid="sort-paid">
                  <span className="inline-flex items-center">Paid{getSortIcon("paid")}</span>
                </TableHead>
                <TableHead className="text-right">Balance Due</TableHead>
                <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("status")} data-testid="sort-status">
                  <span className="inline-flex items-center">Status{getSortIcon("status")}</span>
                </TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-8">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" />
                    Loading...
                  </TableCell>
                </TableRow>
              ) : filteredCharges.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                    No rent charges found for this period. Click "Generate Charges" to create them.
                  </TableCell>
                </TableRow>
              ) : (
                filteredCharges.map((charge: RentCharge) => (
                  <TableRow key={charge.id} data-testid={`row-charge-${charge.id}`}>
                    <TableCell className="whitespace-nowrap font-medium">{formatMonth(charge.chargeMonth)}</TableCell>
                    <TableCell>{charge.manualPropertyName || getPropertyName(charge.propertyId)}</TableCell>
                    <TableCell>{charge.manualTenantName || getTenantName(charge.tenantId)}</TableCell>
                    <TableCell className="text-right">${fmtCurrency(parseFloat(charge.baseRent))}</TableCell>
                    <TableCell className="text-right">
                      {charge.lateFeeApplied ? (
                        <span className="text-destructive font-medium">${fmtCurrency(parseFloat(charge.lateFeeAmount || "0"))}</span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-medium">${fmtCurrency(parseFloat(charge.totalDue))}</TableCell>
                    <TableCell className="text-right">${fmtCurrency(parseFloat(charge.amountPaid || "0"))}</TableCell>
                    <TableCell className="text-right">
                      {(() => {
                        const balance = parseFloat(charge.totalDue || "0") - parseFloat(charge.amountPaid || "0");
                        return balance > 0 ? (
                          <span className="text-destructive font-medium">${fmtCurrency(balance)}</span>
                        ) : (
                          <span className="text-green-600">$0.00</span>
                        );
                      })()}
                    </TableCell>
                    <TableCell>{getStatusBadge(charge.status || "open")}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openInvoice(charge)}
                          data-testid={`button-open-invoice-${charge.id}`}
                        >
                          <FileText className="w-3 h-3 mr-1" />
                          Invoice
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setLedgerTenantId(charge.tenantId)}
                          data-testid={`button-open-ledger-${charge.id}`}
                        >
                          <BookOpen className="w-3 h-3 mr-1" />
                          Ledger
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <Dialog open={generateDialogOpen} onOpenChange={setGenerateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generate Monthly Rent Charges</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              This will create rent charge records for all active leases for the selected month. 
              Charges that already exist will be skipped.
            </p>
            <div className="space-y-2">
              <Label>Month</Label>
              <Input
                type="text"
                placeholder="MM-YYYY"
                value={generateMonthDisplay}
                onChange={(e) => onMonthChange(e.target.value, setGenerateMonthDisplay, setGenerateMonth)}
                data-testid="input-generate-month"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGenerateDialogOpen(false)} data-testid="button-cancel-generate">Cancel</Button>
            <Button
              onClick={() => generateMutation.mutate(generateMonth)}
              disabled={generateMutation.isPending}
              data-testid="button-confirm-generate"
            >
              {generateMutation.isPending ? "Generating..." : "Generate Charges"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={createDialogOpen} onOpenChange={(open) => {
        setCreateDialogOpen(open);
        if (!open) {
          setCreateMode("lease");
          setCreateLeaseId("");
          setCreateAmount("");
          setManualPropertyName("");
          setManualTenantName("");
          setManualStatus("paid");
          setCreateMonthDisplay(toDisplay(initMonth()));
          setCreateMonth(initMonth);
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Invoice</DialogTitle>
          </DialogHeader>
          <div className="flex gap-2 border-b pb-2">
            <Button
              variant={createMode === "lease" ? "default" : "outline"}
              size="sm"
              onClick={() => setCreateMode("lease")}
              data-testid="button-mode-lease"
            >
              From Lease
            </Button>
            <Button
              variant={createMode === "manual" ? "default" : "outline"}
              size="sm"
              onClick={() => setCreateMode("manual")}
              data-testid="button-mode-manual"
            >
              Manual Entry
            </Button>
          </div>
          {createMode === "lease" ? (
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Lease</Label>
                <Select value={createLeaseId} onValueChange={(val) => {
                  setCreateLeaseId(val);
                  const lease = allLeases.find((l: any) => l.id === val);
                  if (lease?.monthlyRent) setCreateAmount(String(lease.monthlyRent));
                }}>
                  <SelectTrigger data-testid="select-create-lease">
                    <SelectValue placeholder="Select a lease" />
                  </SelectTrigger>
                  <SelectContent>
                    {allLeases
                      .filter((l: any) => l.status === "active")
                      .map((l: any) => {
                        const t = tenants.find((t) => t.id === l.tenantId);
                        const p = properties.find((p) => p.id === l.propertyId);
                        return (
                          <SelectItem key={l.id} value={l.id}>
                            {t ? `${t.firstName} ${t.lastName}` : "Unknown"} — {p?.name || p?.address || "Unknown property"}
                          </SelectItem>
                        );
                      })}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Month</Label>
                <Input
                  type="text"
                  placeholder="MM-YYYY"
                  value={createMonthDisplay}
                  onChange={(e) => onMonthChange(e.target.value, setCreateMonthDisplay, setCreateMonth)}
                  data-testid="input-create-month"
                />
              </div>
              <div className="space-y-2">
                <Label>Amount ($)</Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={createAmount}
                  onChange={(e) => setCreateAmount(e.target.value)}
                  onFocus={(e) => e.target.select()}
                  data-testid="input-create-amount"
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateDialogOpen(false)} data-testid="button-cancel-create">Cancel</Button>
                <Button
                  onClick={() => createInvoiceMutation.mutate({ leaseId: createLeaseId, chargeMonth: createMonth, baseRent: sc(createAmount) })}
                  disabled={createInvoiceMutation.isPending || !createLeaseId || !createAmount}
                  data-testid="button-confirm-create"
                >
                  {createInvoiceMutation.isPending ? "Creating..." : "Create Invoice"}
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Property Name / Address</Label>
                <Input
                  value={manualPropertyName}
                  onChange={(e) => setManualPropertyName(e.target.value)}
                  placeholder="e.g. 4169 SW 67th Ave Apt 205"
                  data-testid="input-manual-property"
                />
              </div>
              <div className="space-y-2">
                <Label>Tenant Name</Label>
                <Input
                  value={manualTenantName}
                  onChange={(e) => setManualTenantName(e.target.value)}
                  placeholder="e.g. John Smith"
                  data-testid="input-manual-tenant"
                />
              </div>
              <div className="space-y-2">
                <Label>Month</Label>
                <Input
                  type="text"
                  placeholder="MM-YYYY"
                  value={createMonthDisplay}
                  onChange={(e) => onMonthChange(e.target.value, setCreateMonthDisplay, setCreateMonth)}
                  data-testid="input-manual-month"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Amount ($)</Label>
                  <Input
                    type="text"
                    inputMode="decimal"
                    placeholder="0.00"
                    value={createAmount}
                    onChange={(e) => setCreateAmount(e.target.value)}
                    onFocus={(e) => e.target.select()}
                    data-testid="input-manual-amount"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={manualStatus} onValueChange={setManualStatus}>
                    <SelectTrigger data-testid="select-manual-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="paid">Paid</SelectItem>
                      <SelectItem value="open">Open</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateDialogOpen(false)} data-testid="button-cancel-manual">Cancel</Button>
                <Button
                  onClick={() => createManualMutation.mutate({ propertyName: manualPropertyName, tenantName: manualTenantName, chargeMonth: createMonth, baseRent: sc(createAmount) || "0", status: manualStatus })}
                  disabled={createManualMutation.isPending || !manualPropertyName || !manualTenantName}
                  data-testid="button-confirm-manual"
                >
                  {createManualMutation.isPending ? "Creating..." : "Create Invoice"}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
      <Dialog open={invoiceCharge !== null} onOpenChange={(open) => !open && closeInvoice()}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          {invoiceCharge && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Invoice - {formatMonth(invoiceCharge.chargeMonth)}
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-5">
                <div className="flex flex-col md:flex-row md:justify-between gap-4">
                  <div className="space-y-1">
                    {invoiceEntity ? (
                      <>
                        <div className="flex items-center gap-2 text-sm font-semibold">
                          <Building2 className="w-4 h-4 text-muted-foreground" />
                          From: {invoiceEntity.name}
                        </div>
                        {invoiceEntity.address && (
                          <p className="text-xs text-muted-foreground ml-6">
                            {invoiceEntity.address}{invoiceEntity.city ? `, ${invoiceEntity.city}` : ""}{invoiceEntity.state ? `, ${invoiceEntity.state}` : ""} {invoiceEntity.zip || ""}
                          </p>
                        )}
                        {invoiceEntity.contactEmail && (
                          <p className="text-xs text-muted-foreground ml-6">{invoiceEntity.contactEmail}</p>
                        )}
                      </>
                    ) : (
                      <p className="text-sm text-muted-foreground">No entity assigned</p>
                    )}
                  </div>
                  <div className="space-y-1 md:text-right">
                    {invoiceTenant && (
                      <>
                        <p className="text-sm font-semibold">Bill To: {invoiceTenant.firstName} {invoiceTenant.lastName}</p>
                        <p className="text-xs text-muted-foreground">{invoiceTenant.email}</p>
                        {invoiceTenant.phone && <p className="text-xs text-muted-foreground">{invoiceTenant.phone}</p>}
                      </>
                    )}
                  </div>
                </div>

                {invoiceProperty && (
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium">{invoiceProperty.name}</span>
                    <span className="text-muted-foreground">
                      {invoiceProperty.address}, {invoiceProperty.city}, {invoiceProperty.state} {invoiceProperty.zip}
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    {getStatusBadge(invoiceCharge.status || "open")}
                    <span className="text-sm text-muted-foreground">
                      Due: {invoiceCharge.dueDate ? formatDate(invoiceCharge.dueDate) : "—"}
                    </span>
                  </div>
                </div>

                <Separator />

                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Description</TableHead>
                        <TableHead className="text-right w-[120px]">Amount</TableHead>
                        <TableHead className="w-[80px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell className="font-medium">Monthly Rent</TableCell>
                        <TableCell className="text-right">${fmtCurrency(parseFloat(invoiceCharge.baseRent))}</TableCell>
                        <TableCell></TableCell>
                      </TableRow>

                      {invoiceCharge.lateFeeApplied && (
                        <TableRow>
                          <TableCell className="text-destructive font-medium">Late Fee (5%)</TableCell>
                          <TableCell className="text-right text-destructive">${fmtCurrency(parseFloat(invoiceCharge.lateFeeAmount || "0"))}</TableCell>
                          <TableCell>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => waiveLateFee.mutate(invoiceCharge.id)}
                              disabled={waiveLateFee.isPending}
                              data-testid="button-waive-fee-invoice"
                            >
                              <XCircle className="w-4 h-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      )}

                      {invoiceItems.map((item) => (
                        <TableRow key={item.id}>
                          {editingItemId === item.id ? (
                            <>
                              <TableCell>
                                <Input
                                  value={editItemDesc}
                                  onChange={(e) => setEditItemDesc(e.target.value)}
                                  data-testid="input-edit-item-desc"
                                />
                              </TableCell>
                              <TableCell>
                                <Input
                                  type="text"
                                  inputMode="decimal"
                                  value={editItemAmount}
                                  onChange={(e) => setEditItemAmount(e.target.value)}
                                  onFocus={(e) => e.target.select()}
                                  className="text-right"
                                  data-testid="input-edit-item-amount"
                                />
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1">
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={() => {
                                      updateInvoiceItem.mutate({ id: item.id, description: editItemDesc, amount: sc(editItemAmount) });
                                    }}
                                    disabled={updateInvoiceItem.isPending}
                                    data-testid="button-save-edit-item"
                                  >
                                    <CheckCircle className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={() => setEditingItemId(null)}
                                    data-testid="button-cancel-edit-item"
                                  >
                                    <XCircle className="w-4 h-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </>
                          ) : (
                            <>
                              <TableCell>{item.description}</TableCell>
                              <TableCell className="text-right">${fmtCurrency(parseFloat(item.amount))}</TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1">
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={() => {
                                      setEditingItemId(item.id);
                                      setEditItemDesc(item.description);
                                      setEditItemAmount(item.amount);
                                    }}
                                    data-testid={`button-edit-item-${item.id}`}
                                  >
                                    <Pencil className="w-3 h-3" />
                                  </Button>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={() => deleteInvoiceItem.mutate({ id: item.id, rentChargeId: invoiceCharge.id })}
                                    disabled={deleteInvoiceItem.isPending}
                                    data-testid={`button-delete-item-${item.id}`}
                                  >
                                    <Trash2 className="w-3 h-3 text-destructive" />
                                  </Button>
                                </div>
                              </TableCell>
                            </>
                          )}
                        </TableRow>
                      ))}

                      {addingItem && (
                        <TableRow>
                          <TableCell>
                            <Input
                              placeholder="Description"
                              value={newItemDesc}
                              onChange={(e) => setNewItemDesc(e.target.value)}
                              data-testid="input-new-item-desc"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="text"
                              inputMode="decimal"
                              placeholder="0.00"
                              value={newItemAmount}
                              onChange={(e) => setNewItemAmount(e.target.value)}
                              onFocus={(e) => e.target.select()}
                              className="text-right"
                              data-testid="input-new-item-amount"
                            />
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => {
                                  if (newItemDesc && newItemAmount) {
                                    addInvoiceItem.mutate({ chargeId: invoiceCharge.id, description: newItemDesc, amount: sc(newItemAmount) });
                                  }
                                }}
                                disabled={addInvoiceItem.isPending || !newItemDesc || !newItemAmount}
                                data-testid="button-save-new-item"
                              >
                                <CheckCircle className="w-4 h-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => { setAddingItem(false); setNewItemDesc(""); setNewItemAmount(""); }}
                                data-testid="button-cancel-new-item"
                              >
                                <XCircle className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>

                <div className="flex justify-end">
                  <div className="w-64 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Subtotal (Rent)</span>
                      <span>${fmtCurrency(parseFloat(invoiceCharge.baseRent))}</span>
                    </div>
                    {invoiceCharge.lateFeeApplied && (
                      <div className="flex justify-between text-sm text-destructive">
                        <span>Late Fee</span>
                        <span>${fmtCurrency(parseFloat(invoiceCharge.lateFeeAmount || "0"))}</span>
                      </div>
                    )}
                    {invoiceItemsTotal > 0 && (
                      <div className="flex justify-between text-sm">
                        <span>Additional Items</span>
                        <span>${fmtCurrency(invoiceItemsTotal)}</span>
                      </div>
                    )}
                    <Separator />
                    <div className="flex justify-between font-bold">
                      <span>Total Due</span>
                      <span>${fmtCurrency(parseFloat(invoiceCharge.totalDue))}</span>
                    </div>
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>Amount Paid</span>
                      <span>${fmtCurrency(parseFloat(invoiceCharge.amountPaid || "0"))}</span>
                    </div>
                    <div className="flex justify-between font-semibold">
                      <span>Balance Due</span>
                      <span>${fmtCurrency(parseFloat(invoiceCharge.totalDue) - parseFloat(invoiceCharge.amountPaid || "0"))}</span>
                    </div>
                  </div>
                </div>

                {showPaymentInput && (
                  <div className="flex items-end gap-3 flex-wrap">
                    <div className="flex-1 min-w-[120px] space-y-1">
                      <Label>Payment Amount</Label>
                      <Input
                        type="text"
                        inputMode="decimal"
                        value={paymentAmount}
                        onChange={(e) => setPaymentAmount(e.target.value)}
                        onFocus={(e) => e.target.select()}
                        data-testid="input-payment-amount"
                      />
                    </div>
                    <div className="w-[130px] space-y-1">
                      <Label>Payment Date</Label>
                      <Input
                        type="text"
                        placeholder="MM.DD.YYYY"
                        value={paymentDate}
                        onChange={(e) => setPaymentDate(e.target.value)}
                        data-testid="input-payment-date"
                      />
                    </div>
                    <Button
                      onClick={() => {
                        if (invoiceCharge && paymentAmount) {
                          recordPaymentMutation.mutate({ chargeId: invoiceCharge.id, amount: sc(paymentAmount), date: paymentDate });
                        }
                      }}
                      disabled={recordPaymentMutation.isPending || !paymentAmount}
                      data-testid="button-confirm-payment"
                    >
                      {recordPaymentMutation.isPending ? "Recording..." : "Record Payment"}
                    </Button>
                    <Button variant="outline" onClick={() => setShowPaymentInput(false)} data-testid="button-cancel-payment">
                      Cancel
                    </Button>
                  </div>
                )}

                {editingRent && (
                  <div className="flex items-end gap-3">
                    <div className="flex-1 space-y-1">
                      <Label>New Monthly Rent</Label>
                      <Input
                        type="text"
                        inputMode="decimal"
                        value={editRentAmount}
                        onChange={(e) => setEditRentAmount(e.target.value)}
                        onFocus={(e) => e.target.select()}
                        data-testid="input-edit-rent"
                      />
                    </div>
                    <Button
                      onClick={() => {
                        if (invoiceCharge && editRentAmount) {
                          editRentMutation.mutate({ chargeId: invoiceCharge.id, baseRent: parseFloat(sc(editRentAmount)).toFixed(2) });
                        }
                      }}
                      disabled={editRentMutation.isPending || !editRentAmount}
                      data-testid="button-confirm-edit-rent"
                    >
                      {editRentMutation.isPending ? "Saving..." : "Update Rent"}
                    </Button>
                    <Button variant="outline" onClick={() => setEditingRent(false)} data-testid="button-cancel-edit-rent">
                      Cancel
                    </Button>
                  </div>
                )}

                <Separator />

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => {
                      setEditingRent(true);
                      setEditRentAmount(parseFloat(invoiceCharge.baseRent).toFixed(2));
                    }}
                    data-testid="button-edit-rent"
                  >
                    <Pencil className="w-3 h-3 mr-1" />
                    Edit Invoice
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => setShowPaymentInput(true)}
                    data-testid="button-record-payment"
                  >
                    <CreditCard className="w-3 h-3 mr-1" />
                    Record Payment
                  </Button>
                  {!invoiceCharge.lateFeeApplied && invoiceCharge.status !== "paid" && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => applyLateFeeToCharge.mutate(invoiceCharge.id)}
                      disabled={applyLateFeeToCharge.isPending}
                      data-testid="button-apply-late-fee-invoice"
                    >
                      <AlertTriangle className="w-3 h-3 mr-1" />
                      Late Fee
                    </Button>
                  )}
                  {invoiceCharge.lateFeeApplied && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => waiveLateFee.mutate(invoiceCharge.id)}
                      disabled={waiveLateFee.isPending}
                      data-testid="button-waive-fee-bottom"
                    >
                      <XCircle className="w-3 h-3 mr-1" />
                      Waive Fee
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => { setAddingItem(true); setNewItemDesc(""); setNewItemAmount(""); }}
                    data-testid="button-add-line-item"
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    Line Item
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 text-destructive"
                    onClick={() => setDeletingChargeId(invoiceCharge.id)}
                    data-testid="button-delete-charge"
                  >
                    <Trash2 className="w-3 h-3 mr-1" />
                    Delete
                  </Button>
                </div>

                {deletingChargeId && (
                  <div className="border border-destructive rounded-md p-3 space-y-2">
                    <p className="text-sm text-destructive font-medium">Are you sure you want to delete this invoice? This cannot be undone.</p>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => deleteChargeMutation.mutate(deletingChargeId)}
                        disabled={deleteChargeMutation.isPending}
                        data-testid="button-confirm-delete-charge"
                      >
                        {deleteChargeMutation.isPending ? "Deleting..." : "Yes, Delete"}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setDeletingChargeId(null)} data-testid="button-cancel-delete-charge">
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
      <Dialog open={ledgerTenantId !== null} onOpenChange={(open) => !open && setLedgerTenantId(null)}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          {ledgerTenantId && (() => {
            const tenant = getTenant(ledgerTenantId);
            const sortedLedger = [...ledgerCharges].sort((a, b) => {
              const dateA = a.chargeMonth || "";
              const dateB = b.chargeMonth || "";
              return dateA.localeCompare(dateB);
            });
            const totalDue = sortedLedger.reduce((sum, c) => sum + parseFloat(c.totalDue || "0"), 0);
            const totalPaid = sortedLedger.reduce((sum, c) => sum + parseFloat(c.amountPaid || "0"), 0);
            const balance = totalDue - totalPaid;

            return (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2" data-testid="ledger-dialog-title">
                    <BookOpen className="w-5 h-5" />
                    Tenant Ledger — {tenant ? `${tenant.firstName} ${tenant.lastName}` : "Unknown"}
                  </DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                  {tenant && (
                    <div className="text-sm text-muted-foreground">
                      {tenant.email}{tenant.phone ? ` · ${tenant.phone}` : ""}
                    </div>
                  )}

                  <div className="grid grid-cols-3 gap-4">
                    <Card>
                      <CardContent className="p-4 text-center">
                        <p className="text-xs text-muted-foreground">Total Charged</p>
                        <p className="text-lg font-bold" data-testid="ledger-total-charged">${fmtCurrency(totalDue)}</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4 text-center">
                        <p className="text-xs text-muted-foreground">Total Paid</p>
                        <p className="text-lg font-bold text-green-600" data-testid="ledger-total-paid">${fmtCurrency(totalPaid)}</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4 text-center">
                        <p className="text-xs text-muted-foreground">Balance Due</p>
                        <p className={`text-lg font-bold ${balance > 0 ? "text-destructive" : "text-green-600"}`} data-testid="ledger-balance">${fmtCurrency(balance)}</p>
                      </CardContent>
                    </Card>
                  </div>

                  {ledgerLoading ? (
                    <p className="text-sm text-muted-foreground text-center py-4">Loading ledger...</p>
                  ) : sortedLedger.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">No charges found for this tenant.</p>
                  ) : (
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Month</TableHead>
                            <TableHead>Property</TableHead>
                            <TableHead className="text-right">Rent</TableHead>
                            <TableHead className="text-right">Late Fee</TableHead>
                            <TableHead className="text-right">Total Due</TableHead>
                            <TableHead className="text-right">Paid</TableHead>
                            <TableHead className="text-right">Balance</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {sortedLedger.map((c) => {
                            const rowBalance = parseFloat(c.totalDue || "0") - parseFloat(c.amountPaid || "0");
                            return (
                              <TableRow key={c.id} data-testid={`ledger-row-${c.id}`}>
                                <TableCell className="font-medium">{formatMonth(c.chargeMonth)}</TableCell>
                                <TableCell>{c.manualPropertyName || getPropertyName(c.propertyId)}</TableCell>
                                <TableCell className="text-right">${fmtCurrency(parseFloat(c.baseRent))}</TableCell>
                                <TableCell className="text-right">{c.lateFeeApplied ? `$${fmtCurrency(parseFloat(c.lateFeeAmount || "0"))}` : "—"}</TableCell>
                                <TableCell className="text-right font-medium">${fmtCurrency(parseFloat(c.totalDue))}</TableCell>
                                <TableCell className="text-right">${fmtCurrency(parseFloat(c.amountPaid || "0"))}</TableCell>
                                <TableCell className={`text-right font-medium ${rowBalance > 0 ? "text-destructive" : "text-green-600"}`}>${fmtCurrency(rowBalance)}</TableCell>
                                <TableCell>{getStatusBadge(c.status || "open")}</TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
