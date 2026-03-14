import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { isoToDisplay, displayToIso, formatDate } from "@/lib/date-utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { DollarSign, Search, Plus, Pencil, Trash2, Paperclip, Download, Loader2, FileText, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Expense, Property, Tenant } from "@shared/schema";

const expenseCategories = [
  { value: "plumbing", label: "Plumbing" },
  { value: "electrical", label: "Electrical" },
  { value: "hvac", label: "HVAC" },
  { value: "appliance", label: "Appliance Repair" },
  { value: "roofing", label: "Roofing" },
  { value: "painting", label: "Painting" },
  { value: "flooring", label: "Flooring" },
  { value: "pest_control", label: "Pest Control" },
  { value: "landscaping", label: "Landscaping" },
  { value: "cleaning", label: "Cleaning" },
  { value: "general_maintenance", label: "General Maintenance" },
  { value: "renovation", label: "Renovation" },
  { value: "insurance", label: "Insurance" },
  { value: "taxes", label: "Taxes" },
  { value: "utilities", label: "Utilities" },
  { value: "legal", label: "Legal" },
  { value: "management_fees", label: "Management Fees" },
  { value: "other", label: "Other" },
];

function getCategoryLabel(value: string) {
  return expenseCategories.find((c) => c.value === value)?.label || value;
}

interface ExpenseFormData {
  propertyId: string;
  tenantId: string;
  maintenanceRequestId: string;
  date: string;
  amount: string;
  category: string;
  vendor: string;
  description: string;
  notes: string;
}

const emptyForm: ExpenseFormData = {
  propertyId: "",
  tenantId: "",
  maintenanceRequestId: "",
  date: new Date().toISOString().split("T")[0],
  amount: "",
  category: "",
  vendor: "",
  description: "",
  notes: "",
};

export default function AdminExpenses() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [propertyFilter, setPropertyFilter] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [formData, setFormData] = useState<ExpenseFormData>(emptyForm);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [sortField, setSortField] = useState<"vendor" | "property" | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const toggleSort = (field: "vendor" | "property") => {
    if (sortField === field) {
      if (sortDir === "asc") setSortDir("desc");
      else { setSortField(null); setSortDir("asc"); }
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const { data: allExpenses, isLoading } = useQuery<Expense[]>({
    queryKey: ["/api/admin/expenses"],
  });

  const { data: properties } = useQuery<Property[]>({
    queryKey: ["/api/admin/properties"],
  });

  const { data: tenants } = useQuery<Tenant[]>({
    queryKey: ["/api/admin/tenants"],
  });

  const propertyTenants = formData.propertyId
    ? tenants?.filter((t) => t.propertyId === formData.propertyId)
    : tenants;

  const filteredExpenses = allExpenses?.filter((expense) => {
    if (categoryFilter !== "all" && expense.category !== categoryFilter) return false;
    if (propertyFilter !== "all" && expense.propertyId !== propertyFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const property = properties?.find((p) => p.id === expense.propertyId);
      const tenant = tenants?.find((t) => t.id === expense.tenantId);
      const match =
        expense.description?.toLowerCase().includes(q) ||
        expense.notes?.toLowerCase().includes(q) ||
        expense.amount?.includes(q) ||
        expense.category?.toLowerCase().includes(q) ||
        expense.vendor?.toLowerCase().includes(q) ||
        property?.name?.toLowerCase().includes(q) ||
        `${tenant?.firstName} ${tenant?.lastName}`.toLowerCase().includes(q) ||
        expense.fileName?.toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  }).sort((a, b) => {
    if (sortField === "vendor") {
      const cmp = (a.vendor || "").localeCompare(b.vendor || "");
      return sortDir === "asc" ? cmp : -cmp;
    }
    if (sortField === "property") {
      const aName = a.propertyId ? (properties?.find(p => p.id === a.propertyId)?.name || "") : "";
      const bName = b.propertyId ? (properties?.find(p => p.id === b.propertyId)?.name || "") : "";
      const cmp = aName.localeCompare(bName);
      return sortDir === "asc" ? cmp : -cmp;
    }
    return 0;
  });

  const totalAmount = filteredExpenses?.reduce((sum, e) => sum + parseFloat(e.amount || "0"), 0) || 0;

  const createMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const headers: Record<string, string> = {};
      const token = localStorage.getItem("adminToken");
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const response = await fetch("/api/admin/expenses", { method: "POST", body: data, credentials: "include", headers });
      if (!response.ok) throw new Error("Failed to create expense");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/expenses"] });
      toast({ title: "Expense created" });
      closeDialog();
    },
    onError: () => {
      toast({ title: "Failed to create expense", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: FormData }) => {
      const headers: Record<string, string> = {};
      const token = localStorage.getItem("adminToken");
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const response = await fetch(`/api/admin/expenses/${id}`, { method: "PATCH", body: data, credentials: "include", headers });
      if (!response.ok) throw new Error("Failed to update expense");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/expenses"] });
      toast({ title: "Expense updated" });
      closeDialog();
    },
    onError: () => {
      toast({ title: "Failed to update expense", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/admin/expenses/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/expenses"] });
      toast({ title: "Expense deleted" });
    },
    onError: () => {
      toast({ title: "Failed to delete expense", variant: "destructive" });
    },
  });

  function openCreate() {
    setEditingExpense(null);
    setFormData(emptyForm);
    setSelectedFile(null);
    setDialogOpen(true);
  }

  function openEdit(expense: Expense) {
    setEditingExpense(expense);
    setFormData({
      propertyId: expense.propertyId || "",
      tenantId: expense.tenantId || "",
      maintenanceRequestId: expense.maintenanceRequestId || "",
      date: expense.date || "",
      amount: expense.amount || "",
      category: expense.category || "",
      vendor: expense.vendor || "",
      description: expense.description || "",
      notes: expense.notes || "",
    });
    setSelectedFile(null);
    setDialogOpen(true);
  }

  function closeDialog() {
    setDialogOpen(false);
    setEditingExpense(null);
    setFormData(emptyForm);
    setSelectedFile(null);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.date || !formData.amount || !formData.category) {
      toast({ title: "Please fill in required fields (date, amount, category)", variant: "destructive" });
      return;
    }
    const fd = new FormData();
    fd.append("date", formData.date);
    fd.append("amount", formData.amount.replace(/,/g, ''));
    fd.append("category", formData.category);
    if (formData.propertyId) fd.append("propertyId", formData.propertyId);
    if (formData.tenantId) fd.append("tenantId", formData.tenantId);
    if (formData.maintenanceRequestId) fd.append("maintenanceRequestId", formData.maintenanceRequestId);
    if (formData.vendor) fd.append("vendor", formData.vendor);
    if (formData.description) fd.append("description", formData.description);
    if (formData.notes) fd.append("notes", formData.notes);
    if (selectedFile) fd.append("file", selectedFile);

    if (editingExpense) {
      updateMutation.mutate({ id: editingExpense.id, data: fd });
    } else {
      createMutation.mutate(fd);
    }
  }

  const isSaving = createMutation.isPending || updateMutation.isPending;

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-expenses-title">Expenses</h1>
          <p className="text-muted-foreground">Track and manage property expenses</p>
        </div>
        <Button onClick={openCreate} data-testid="button-add-expense">
          <Plus className="h-4 w-4 mr-2" />
          Add Expense
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-expenses">
              ${totalAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">{filteredExpenses?.length || 0} expense(s)</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Expenses</CardTitle>
          <CardDescription>{filteredExpenses?.length || 0} expense records</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search expenses..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                data-testid="input-search-expenses"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[180px]" data-testid="select-category-filter">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {expenseCategories.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={propertyFilter} onValueChange={setPropertyFilter}>
              <SelectTrigger className="w-[200px]" data-testid="select-property-filter">
                <SelectValue placeholder="Property" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Properties</SelectItem>
                {properties?.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-md border overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>
                    <button
                      className="flex items-center gap-1 hover-elevate rounded px-1 -ml-1"
                      onClick={(e) => { e.stopPropagation(); toggleSort("property"); }}
                      data-testid="button-sort-property"
                    >
                      Property
                      {sortField === "property" ? (sortDir === "asc" ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />) : <ArrowUpDown className="h-3.5 w-3.5 opacity-50" />}
                    </button>
                  </TableHead>
                  <TableHead>Tenant</TableHead>
                  <TableHead>
                    <button
                      className="flex items-center gap-1 hover-elevate rounded px-1 -ml-1"
                      onClick={(e) => { e.stopPropagation(); toggleSort("vendor"); }}
                      data-testid="button-sort-vendor"
                    >
                      Vendor
                      {sortField === "vendor" ? (sortDir === "asc" ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />) : <ArrowUpDown className="h-3.5 w-3.5 opacity-50" />}
                    </button>
                  </TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>File</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!filteredExpenses?.length ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      No expenses found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredExpenses.map((expense) => {
                    const property = properties?.find((p) => p.id === expense.propertyId);
                    const tenant = tenants?.find((t) => t.id === expense.tenantId);
                    return (
                      <TableRow key={expense.id} data-testid={`row-expense-${expense.id}`}>
                        <TableCell className="whitespace-nowrap">{isoToDisplay(expense.date)}</TableCell>
                        <TableCell>{property?.name || "—"}</TableCell>
                        <TableCell>{tenant ? `${tenant.firstName} ${tenant.lastName}` : "—"}</TableCell>
                        <TableCell data-testid={`text-vendor-${expense.id}`}>{expense.vendor || "—"}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{getCategoryLabel(expense.category)}</Badge>
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate">{expense.description || "—"}</TableCell>
                        <TableCell className="text-right font-medium whitespace-nowrap" data-testid={`text-amount-${expense.id}`}>
                          ${parseFloat(expense.amount || "0").toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell>
                          {expense.fileUrl ? (
                            <a
                              href={expense.fileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                              data-testid={`link-expense-file-${expense.id}`}
                            >
                              <Paperclip className="h-3 w-3" />
                              <span className="max-w-[100px] truncate">{expense.fileName}</span>
                            </a>
                          ) : (
                            <span className="text-muted-foreground text-sm">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button size="icon" variant="ghost" onClick={() => openEdit(expense)} data-testid={`button-edit-expense-${expense.id}`}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button size="icon" variant="ghost" data-testid={`button-delete-expense-${expense.id}`}>
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Expense</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete this expense? This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => deleteMutation.mutate(expense.id)}
                                    data-testid="button-confirm-delete"
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingExpense ? "Edit Expense" : "Add Expense"}</DialogTitle>
            <DialogDescription>
              {editingExpense ? "Update the expense details below." : "Fill in the expense details below."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date">Date *</Label>
                <Input
                  id="date"
                  type="text"
                  placeholder="MM.DD.YYYY"
                  value={isoToDisplay(formData.date)}
                  onChange={(e) => setFormData({ ...formData, date: displayToIso(e.target.value) })}
                  required
                  data-testid="input-expense-date"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="amount">Amount *</Label>
                <Input
                  id="amount"
                  type="text"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  onFocus={(e) => e.target.select()}
                  required
                  data-testid="input-expense-amount"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category *</Label>
              <Select value={formData.category} onValueChange={(val) => setFormData({ ...formData, category: val })}>
                <SelectTrigger data-testid="select-expense-category">
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {expenseCategories.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="vendor">Vendor</Label>
              <Input
                id="vendor"
                placeholder="e.g. ABC Plumbing, Home Depot"
                value={formData.vendor}
                onChange={(e) => setFormData({ ...formData, vendor: e.target.value })}
                data-testid="input-expense-vendor"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="propertyId">Property</Label>
              <Select
                value={formData.propertyId || "none"}
                onValueChange={(val) => setFormData({ ...formData, propertyId: val === "none" ? "" : val, tenantId: "" })}
              >
                <SelectTrigger data-testid="select-expense-property">
                  <SelectValue placeholder="Select a property" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Property</SelectItem>
                  {properties?.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name} ({p.propertyCode})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tenantId">Tenant</Label>
              <Select
                value={formData.tenantId || "none"}
                onValueChange={(val) => setFormData({ ...formData, tenantId: val === "none" ? "" : val })}
              >
                <SelectTrigger data-testid="select-expense-tenant">
                  <SelectValue placeholder="Select a tenant" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Tenant</SelectItem>
                  {propertyTenants?.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.firstName} {t.lastName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                placeholder="Brief description of the expense"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                data-testid="input-expense-description"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Additional notes or comments..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
                data-testid="input-expense-notes"
              />
            </div>

            <div className="space-y-2">
              <Label>Attachment (Invoice/Receipt)</Label>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  data-testid="button-attach-file"
                >
                  <Paperclip className="h-4 w-4 mr-2" />
                  {selectedFile ? "Change File" : "Attach File"}
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
                />
                {selectedFile && (
                  <span className="text-sm text-muted-foreground truncate max-w-[200px]">{selectedFile.name}</span>
                )}
                {!selectedFile && editingExpense?.fileName && (
                  <span className="text-sm text-muted-foreground truncate max-w-[200px]">
                    Current: {editingExpense.fileName}
                  </span>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={closeDialog} data-testid="button-cancel-expense">
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving} data-testid="button-save-expense">
                {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {editingExpense ? "Update Expense" : "Add Expense"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
