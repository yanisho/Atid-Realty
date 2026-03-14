import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, TrendingUp, TrendingDown, DollarSign, FileBarChart } from "lucide-react";
import type { Entity, RentCharge, Expense } from "@shared/schema";

type ViewMode = "entity" | "property";

interface PropertyWithEntity {
  id: string;
  name: string;
  address: string;
  entityId: string | null;
}

function formatCurrency(value: number): string {
  return value.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 });
}

function ProfitLossReport() {
  const [viewMode, setViewMode] = useState<ViewMode>("entity");
  const [selectedId, setSelectedId] = useState<string>("all");
  const [dateRange, setDateRange] = useState<string>("ytd");

  const { data: entities } = useQuery<Entity[]>({ queryKey: ["/api/admin/entities"] });
  const { data: properties } = useQuery<PropertyWithEntity[]>({ queryKey: ["/api/admin/properties"] });
  const { data: rentCharges, isLoading: loadingCharges } = useQuery<RentCharge[]>({ queryKey: ["/api/admin/rent-charges"] });
  const { data: expenses, isLoading: loadingExpenses } = useQuery<Expense[]>({ queryKey: ["/api/admin/expenses"] });

  const dateFilter = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    switch (dateRange) {
      case "ytd":
        return { start: new Date(year, 0, 1), end: now };
      case "last-year":
        return { start: new Date(year - 1, 0, 1), end: new Date(year - 1, 11, 31) };
      case "last-month": {
        const lastMonth = new Date(year, now.getMonth() - 1, 1);
        const endOfLastMonth = new Date(year, now.getMonth(), 0);
        return { start: lastMonth, end: endOfLastMonth };
      }
      case "this-month":
        return { start: new Date(year, now.getMonth(), 1), end: now };
      default:
        return { start: new Date(year, 0, 1), end: now };
    }
  }, [dateRange]);

  const getPropertyEntityId = (propertyId: string): string | null => {
    return properties?.find(p => p.id === propertyId)?.entityId || null;
  };

  const filteredData = useMemo(() => {
    if (!rentCharges || !expenses || !properties) return null;

    const isInDateRange = (dateStr: string) => {
      const d = new Date(dateStr);
      return d >= dateFilter.start && d <= dateFilter.end;
    };

    const chargeMonthToDate = (chargeMonth: string) => {
      const [y, m] = chargeMonth.split("-");
      return new Date(parseInt(y), parseInt(m) - 1, 1);
    };

    let filteredCharges = rentCharges.filter(rc => {
      const d = chargeMonthToDate(rc.chargeMonth);
      return d >= dateFilter.start && d <= dateFilter.end;
    });

    let filteredExpenses = expenses.filter(e => isInDateRange(e.date));

    if (selectedId !== "all") {
      if (viewMode === "entity") {
        const entityPropertyIds = properties.filter(p => p.entityId === selectedId).map(p => p.id);
        filteredCharges = filteredCharges.filter(rc => entityPropertyIds.includes(rc.propertyId));
        filteredExpenses = filteredExpenses.filter(e => e.propertyId && entityPropertyIds.includes(e.propertyId));
      } else {
        filteredCharges = filteredCharges.filter(rc => rc.propertyId === selectedId);
        filteredExpenses = filteredExpenses.filter(e => e.propertyId === selectedId);
      }
    }

    const totalIncome = filteredCharges.reduce((sum, rc) => sum + Number(rc.amountPaid || 0), 0);
    const totalBaseRent = filteredCharges.reduce((sum, rc) => sum + Number(rc.baseRent || 0), 0);
    const totalLateFees = filteredCharges.reduce((sum, rc) => sum + Number(rc.lateFeeAmount || 0), 0);
    const totalExpenses = filteredExpenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
    const netIncome = totalIncome - totalExpenses;

    const expensesByCategory: Record<string, number> = {};
    filteredExpenses.forEach(e => {
      const cat = e.category || "Uncategorized";
      expensesByCategory[cat] = (expensesByCategory[cat] || 0) + Number(e.amount || 0);
    });

    let groupedData: { name: string; income: number; expenses: number; net: number }[] = [];
    if (viewMode === "entity") {
      const entityMap = new Map<string, { income: number; expenses: number }>();
      filteredCharges.forEach(rc => {
        const eid = getPropertyEntityId(rc.propertyId) || "unassigned";
        const curr = entityMap.get(eid) || { income: 0, expenses: 0 };
        curr.income += Number(rc.amountPaid || 0);
        entityMap.set(eid, curr);
      });
      filteredExpenses.forEach(e => {
        const eid = e.propertyId ? (getPropertyEntityId(e.propertyId) || "unassigned") : "unassigned";
        const curr = entityMap.get(eid) || { income: 0, expenses: 0 };
        curr.expenses += Number(e.amount || 0);
        entityMap.set(eid, curr);
      });
      entityMap.forEach((val, key) => {
        const entity = entities?.find(e => e.id === key);
        groupedData.push({
          name: entity?.name || "Unassigned",
          income: val.income,
          expenses: val.expenses,
          net: val.income - val.expenses,
        });
      });
    } else {
      const propMap = new Map<string, { income: number; expenses: number }>();
      filteredCharges.forEach(rc => {
        const curr = propMap.get(rc.propertyId) || { income: 0, expenses: 0 };
        curr.income += Number(rc.amountPaid || 0);
        propMap.set(rc.propertyId, curr);
      });
      filteredExpenses.forEach(e => {
        if (!e.propertyId) return;
        const curr = propMap.get(e.propertyId) || { income: 0, expenses: 0 };
        curr.expenses += Number(e.amount || 0);
        propMap.set(e.propertyId, curr);
      });
      propMap.forEach((val, key) => {
        const prop = properties?.find(p => p.id === key);
        groupedData.push({
          name: prop?.address || prop?.name || "Unknown",
          income: val.income,
          expenses: val.expenses,
          net: val.income - val.expenses,
        });
      });
    }
    groupedData.sort((a, b) => b.net - a.net);

    return { totalIncome, totalBaseRent, totalLateFees, totalExpenses, netIncome, expensesByCategory, groupedData };
  }, [rentCharges, expenses, properties, entities, viewMode, selectedId, dateFilter]);

  if (loadingCharges || loadingExpenses) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-3 items-center">
        <Select value={viewMode} onValueChange={(v) => { setViewMode(v as ViewMode); setSelectedId("all"); }}>
          <SelectTrigger className="w-[160px]" data-testid="select-pnl-view-mode">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="entity">By Entity</SelectItem>
            <SelectItem value="property">By Property</SelectItem>
          </SelectContent>
        </Select>

        <Select value={selectedId} onValueChange={setSelectedId}>
          <SelectTrigger className="w-[280px]" data-testid="select-pnl-filter">
            <SelectValue placeholder={viewMode === "entity" ? "All Entities" : "All Properties"} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{viewMode === "entity" ? "All Entities" : "All Properties"}</SelectItem>
            {viewMode === "entity"
              ? entities?.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)
              : properties?.map(p => <SelectItem key={p.id} value={p.id}>{p.address}</SelectItem>)
            }
          </SelectContent>
        </Select>

        <Select value={dateRange} onValueChange={setDateRange}>
          <SelectTrigger className="w-[160px]" data-testid="select-pnl-date-range">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="this-month">This Month</SelectItem>
            <SelectItem value="last-month">Last Month</SelectItem>
            <SelectItem value="ytd">Year to Date</SelectItem>
            <SelectItem value="last-year">Last Year</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filteredData && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                  <TrendingUp className="h-4 w-4 text-green-600" />
                  Total Income
                </div>
                <p className="text-xl font-bold text-green-700" data-testid="text-pnl-income">{formatCurrency(filteredData.totalIncome)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                  <TrendingDown className="h-4 w-4 text-red-600" />
                  Total Expenses
                </div>
                <p className="text-xl font-bold text-red-700" data-testid="text-pnl-expenses">{formatCurrency(filteredData.totalExpenses)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                  <DollarSign className="h-4 w-4" />
                  Net Income
                </div>
                <p className={`text-xl font-bold ${filteredData.netIncome >= 0 ? "text-green-700" : "text-red-700"}`} data-testid="text-pnl-net">
                  {formatCurrency(filteredData.netIncome)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                  <DollarSign className="h-4 w-4 text-blue-600" />
                  Late Fees Charged
                </div>
                <p className="text-xl font-bold text-blue-700" data-testid="text-pnl-late-fees">{formatCurrency(filteredData.totalLateFees)}</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Income Statement</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-semibold">Category</TableHead>
                    <TableHead className="text-right font-semibold">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow className="bg-green-50 dark:bg-green-950/20">
                    <TableCell className="font-semibold text-green-700">Revenue</TableCell>
                    <TableCell className="text-right font-semibold text-green-700">{formatCurrency(filteredData.totalIncome)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="pl-8">Base Rent Collected</TableCell>
                    <TableCell className="text-right">{formatCurrency(filteredData.totalBaseRent)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="pl-8">Late Fees</TableCell>
                    <TableCell className="text-right">{formatCurrency(filteredData.totalLateFees)}</TableCell>
                  </TableRow>
                  <TableRow className="bg-red-50 dark:bg-red-950/20">
                    <TableCell className="font-semibold text-red-700">Expenses</TableCell>
                    <TableCell className="text-right font-semibold text-red-700">{formatCurrency(filteredData.totalExpenses)}</TableCell>
                  </TableRow>
                  {Object.entries(filteredData.expensesByCategory)
                    .sort(([, a], [, b]) => b - a)
                    .map(([cat, amt]) => (
                      <TableRow key={cat}>
                        <TableCell className="pl-8">{cat}</TableCell>
                        <TableCell className="text-right">{formatCurrency(amt)}</TableCell>
                      </TableRow>
                    ))}
                  <TableRow className="border-t-2 border-foreground/20">
                    <TableCell className="font-bold text-lg">Net Income</TableCell>
                    <TableCell className={`text-right font-bold text-lg ${filteredData.netIncome >= 0 ? "text-green-700" : "text-red-700"}`}>
                      {formatCurrency(filteredData.netIncome)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {filteredData.groupedData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Breakdown by {viewMode === "entity" ? "Entity" : "Property"}</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="font-semibold">{viewMode === "entity" ? "Entity" : "Property"}</TableHead>
                      <TableHead className="text-right font-semibold">Income</TableHead>
                      <TableHead className="text-right font-semibold">Expenses</TableHead>
                      <TableHead className="text-right font-semibold">Net</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredData.groupedData.map((row) => (
                      <TableRow key={row.name}>
                        <TableCell className="font-medium">{row.name}</TableCell>
                        <TableCell className="text-right text-green-700">{formatCurrency(row.income)}</TableCell>
                        <TableCell className="text-right text-red-700">{formatCurrency(row.expenses)}</TableCell>
                        <TableCell className={`text-right font-semibold ${row.net >= 0 ? "text-green-700" : "text-red-700"}`}>
                          {formatCurrency(row.net)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

function BalanceSheetReport() {
  const [viewMode, setViewMode] = useState<ViewMode>("entity");
  const [selectedId, setSelectedId] = useState<string>("all");

  const { data: entities } = useQuery<Entity[]>({ queryKey: ["/api/admin/entities"] });
  const { data: properties } = useQuery<PropertyWithEntity[]>({ queryKey: ["/api/admin/properties"] });
  const { data: rentCharges, isLoading: loadingCharges } = useQuery<RentCharge[]>({ queryKey: ["/api/admin/rent-charges"] });
  const { data: expenses, isLoading: loadingExpenses } = useQuery<Expense[]>({ queryKey: ["/api/admin/expenses"] });

  const getPropertyEntityId = (propertyId: string): string | null => {
    return properties?.find(p => p.id === propertyId)?.entityId || null;
  };

  const balanceData = useMemo(() => {
    if (!rentCharges || !expenses || !properties) return null;

    let filteredCharges = [...rentCharges];
    let filteredExpenses = [...expenses];

    if (selectedId !== "all") {
      if (viewMode === "entity") {
        const entityPropertyIds = properties.filter(p => p.entityId === selectedId).map(p => p.id);
        filteredCharges = filteredCharges.filter(rc => entityPropertyIds.includes(rc.propertyId));
        filteredExpenses = filteredExpenses.filter(e => e.propertyId && entityPropertyIds.includes(e.propertyId));
      } else {
        filteredCharges = filteredCharges.filter(rc => rc.propertyId === selectedId);
        filteredExpenses = filteredExpenses.filter(e => e.propertyId === selectedId);
      }
    }

    const totalReceivable = filteredCharges.reduce((sum, rc) => {
      const due = Number(rc.totalDue || 0);
      const paid = Number(rc.amountPaid || 0);
      return sum + Math.max(0, due - paid);
    }, 0);

    const totalCollected = filteredCharges.reduce((sum, rc) => sum + Number(rc.amountPaid || 0), 0);
    const totalBilled = filteredCharges.reduce((sum, rc) => sum + Number(rc.totalDue || 0), 0);
    const totalExpenseAmt = filteredExpenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
    const retainedEarnings = totalCollected - totalExpenseAmt;

    let groupedData: { name: string; receivable: number; collected: number; billed: number; expenses: number; retained: number }[] = [];

    if (viewMode === "entity") {
      const entityMap = new Map<string, { receivable: number; collected: number; billed: number; expenses: number }>();
      filteredCharges.forEach(rc => {
        const eid = getPropertyEntityId(rc.propertyId) || "unassigned";
        const curr = entityMap.get(eid) || { receivable: 0, collected: 0, billed: 0, expenses: 0 };
        const due = Number(rc.totalDue || 0);
        const paid = Number(rc.amountPaid || 0);
        curr.receivable += Math.max(0, due - paid);
        curr.collected += paid;
        curr.billed += due;
        entityMap.set(eid, curr);
      });
      filteredExpenses.forEach(e => {
        const eid = e.propertyId ? (getPropertyEntityId(e.propertyId) || "unassigned") : "unassigned";
        const curr = entityMap.get(eid) || { receivable: 0, collected: 0, billed: 0, expenses: 0 };
        curr.expenses += Number(e.amount || 0);
        entityMap.set(eid, curr);
      });
      entityMap.forEach((val, key) => {
        const entity = entities?.find(e => e.id === key);
        groupedData.push({
          name: entity?.name || "Unassigned",
          ...val,
          retained: val.collected - val.expenses,
        });
      });
    } else {
      const propMap = new Map<string, { receivable: number; collected: number; billed: number; expenses: number }>();
      filteredCharges.forEach(rc => {
        const curr = propMap.get(rc.propertyId) || { receivable: 0, collected: 0, billed: 0, expenses: 0 };
        const due = Number(rc.totalDue || 0);
        const paid = Number(rc.amountPaid || 0);
        curr.receivable += Math.max(0, due - paid);
        curr.collected += paid;
        curr.billed += due;
        propMap.set(rc.propertyId, curr);
      });
      filteredExpenses.forEach(e => {
        if (!e.propertyId) return;
        const curr = propMap.get(e.propertyId) || { receivable: 0, collected: 0, billed: 0, expenses: 0 };
        curr.expenses += Number(e.amount || 0);
        propMap.set(e.propertyId, curr);
      });
      propMap.forEach((val, key) => {
        const prop = properties?.find(p => p.id === key);
        groupedData.push({
          name: prop?.address || prop?.name || "Unknown",
          ...val,
          retained: val.collected - val.expenses,
        });
      });
    }
    groupedData.sort((a, b) => b.retained - a.retained);

    return { totalReceivable, totalCollected, totalBilled, totalExpenseAmt, retainedEarnings, groupedData };
  }, [rentCharges, expenses, properties, entities, viewMode, selectedId]);

  if (loadingCharges || loadingExpenses) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-3 items-center">
        <Select value={viewMode} onValueChange={(v) => { setViewMode(v as ViewMode); setSelectedId("all"); }}>
          <SelectTrigger className="w-[160px]" data-testid="select-bs-view-mode">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="entity">By Entity</SelectItem>
            <SelectItem value="property">By Property</SelectItem>
          </SelectContent>
        </Select>

        <Select value={selectedId} onValueChange={setSelectedId}>
          <SelectTrigger className="w-[280px]" data-testid="select-bs-filter">
            <SelectValue placeholder={viewMode === "entity" ? "All Entities" : "All Properties"} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{viewMode === "entity" ? "All Entities" : "All Properties"}</SelectItem>
            {viewMode === "entity"
              ? entities?.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)
              : properties?.map(p => <SelectItem key={p.id} value={p.id}>{p.address}</SelectItem>)
            }
          </SelectContent>
        </Select>
      </div>

      {balanceData && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                  <DollarSign className="h-4 w-4 text-amber-600" />
                  Accounts Receivable
                </div>
                <p className="text-xl font-bold text-amber-700" data-testid="text-bs-receivable">{formatCurrency(balanceData.totalReceivable)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                  <TrendingUp className="h-4 w-4 text-green-600" />
                  Total Collected
                </div>
                <p className="text-xl font-bold text-green-700" data-testid="text-bs-collected">{formatCurrency(balanceData.totalCollected)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                  <TrendingDown className="h-4 w-4 text-red-600" />
                  Total Expenses
                </div>
                <p className="text-xl font-bold text-red-700" data-testid="text-bs-expenses">{formatCurrency(balanceData.totalExpenseAmt)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                  <DollarSign className="h-4 w-4" />
                  Retained Earnings
                </div>
                <p className={`text-xl font-bold ${balanceData.retainedEarnings >= 0 ? "text-green-700" : "text-red-700"}`} data-testid="text-bs-retained">
                  {formatCurrency(balanceData.retainedEarnings)}
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Balance Sheet Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-semibold">Category</TableHead>
                    <TableHead className="text-right font-semibold">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow className="bg-blue-50 dark:bg-blue-950/20">
                    <TableCell className="font-semibold text-blue-700">Assets</TableCell>
                    <TableCell className="text-right font-semibold text-blue-700">
                      {formatCurrency(balanceData.totalCollected + balanceData.totalReceivable)}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="pl-8">Cash (Rent Collected)</TableCell>
                    <TableCell className="text-right">{formatCurrency(balanceData.totalCollected)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="pl-8">Accounts Receivable (Unpaid Rent)</TableCell>
                    <TableCell className="text-right">{formatCurrency(balanceData.totalReceivable)}</TableCell>
                  </TableRow>

                  <TableRow className="bg-red-50 dark:bg-red-950/20">
                    <TableCell className="font-semibold text-red-700">Liabilities / Expenses</TableCell>
                    <TableCell className="text-right font-semibold text-red-700">{formatCurrency(balanceData.totalExpenseAmt)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="pl-8">Operating Expenses</TableCell>
                    <TableCell className="text-right">{formatCurrency(balanceData.totalExpenseAmt)}</TableCell>
                  </TableRow>

                  <TableRow className="border-t-2 border-foreground/20 bg-green-50 dark:bg-green-950/20">
                    <TableCell className="font-bold text-lg">Equity (Retained Earnings)</TableCell>
                    <TableCell className={`text-right font-bold text-lg ${balanceData.retainedEarnings >= 0 ? "text-green-700" : "text-red-700"}`}>
                      {formatCurrency(balanceData.retainedEarnings)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {balanceData.groupedData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Breakdown by {viewMode === "entity" ? "Entity" : "Property"}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="font-semibold">{viewMode === "entity" ? "Entity" : "Property"}</TableHead>
                        <TableHead className="text-right font-semibold">Billed</TableHead>
                        <TableHead className="text-right font-semibold">Collected</TableHead>
                        <TableHead className="text-right font-semibold">Receivable</TableHead>
                        <TableHead className="text-right font-semibold">Expenses</TableHead>
                        <TableHead className="text-right font-semibold">Retained</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {balanceData.groupedData.map((row) => (
                        <TableRow key={row.name}>
                          <TableCell className="font-medium">{row.name}</TableCell>
                          <TableCell className="text-right">{formatCurrency(row.billed)}</TableCell>
                          <TableCell className="text-right text-green-700">{formatCurrency(row.collected)}</TableCell>
                          <TableCell className="text-right text-amber-700">{formatCurrency(row.receivable)}</TableCell>
                          <TableCell className="text-right text-red-700">{formatCurrency(row.expenses)}</TableCell>
                          <TableCell className={`text-right font-semibold ${row.retained >= 0 ? "text-green-700" : "text-red-700"}`}>
                            {formatCurrency(row.retained)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

export default function AdminReports() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold" data-testid="text-reports-title">Reports</h1>
        <p className="text-muted-foreground mt-1" data-testid="text-reports-subtitle">
          Financial reports and summaries
        </p>
      </div>

      <Tabs defaultValue="profit-loss">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="profit-loss" data-testid="tab-profit-loss">
            <TrendingUp className="h-4 w-4 mr-2" />
            Profit & Loss
          </TabsTrigger>
          <TabsTrigger value="balance-sheet" data-testid="tab-balance-sheet">
            <FileBarChart className="h-4 w-4 mr-2" />
            Balance Sheet
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profit-loss" className="mt-6">
          <ProfitLossReport />
        </TabsContent>

        <TabsContent value="balance-sheet" className="mt-6">
          <BalanceSheetReport />
        </TabsContent>
      </Tabs>
    </div>
  );
}
