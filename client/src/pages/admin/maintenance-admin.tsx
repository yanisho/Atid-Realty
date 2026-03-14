import { useState, useEffect } from "react";
import { formatDate } from "@/lib/date-utils";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Wrench, Search, Clock, CheckCircle, AlertTriangle, Loader2, MapPin, ImageIcon, ArrowUpDown, ArrowUp, ArrowDown, Pencil, Trash2, MessageSquare, Send } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { MaintenanceRequest } from "@shared/schema";

function MaintenancePhoto({ photoData }: { photoData: string }) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (photoData.startsWith("data:")) {
      setUrl(photoData);
    } else {
      fetch(`/api/maintenance-photo-url?path=${encodeURIComponent(photoData)}`)
        .then(r => r.json())
        .then(d => setUrl(d.url))
        .catch(() => {});
    }
  }, [photoData]);

  if (!url) return <Skeleton className="w-20 h-20 rounded-md" />;
  return (
    <a href={url} target="_blank" rel="noopener noreferrer">
      <img src={url} alt="Maintenance photo" className="w-20 h-20 object-cover rounded-md" data-testid="img-maintenance-photo" />
    </a>
  );
}

export default function AdminMaintenance() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedRequest, setSelectedRequest] = useState<MaintenanceRequest | null>(null);
  const [editingRequest, setEditingRequest] = useState<MaintenanceRequest | null>(null);
  const [deletingRequest, setDeletingRequest] = useState<MaintenanceRequest | null>(null);
  const [editForm, setEditForm] = useState({ name: "", email: "", phone: "", propertyAddress: "", unitLabel: "", category: "", description: "", status: "", priority: "" });
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc" | null>(null);
  const [replyText, setReplyText] = useState("");

  const handleSort = (field: string) => {
    if (sortField !== field) {
      setSortField(field);
      setSortDirection("asc");
    } else if (sortDirection === "asc") {
      setSortDirection("desc");
    } else {
      setSortField(null);
      setSortDirection(null);
    }
  };

  const getSortIcon = (field: string) => {
    if (sortField !== field) return <ArrowUpDown className="h-4 w-4 ml-1" />;
    if (sortDirection === "asc") return <ArrowUp className="h-4 w-4 ml-1" />;
    return <ArrowDown className="h-4 w-4 ml-1" />;
  };

  const { data: requests, isLoading } = useQuery<MaintenanceRequest[]>({
    queryKey: ["/api/admin/maintenance"],
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      return await apiRequest("PATCH", `/api/admin/maintenance/${id}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/maintenance"] });
      toast({
        title: "Status Updated",
        description: "The maintenance request status has been updated.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update status.",
        variant: "destructive",
      });
    },
  });

  const editMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Record<string, any> }) => {
      return await apiRequest("PATCH", `/api/admin/maintenance/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/maintenance"] });
      toast({ title: "Request updated successfully" });
      setEditingRequest(null);
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update request", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/admin/maintenance/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/maintenance"] });
      toast({ title: "Request deleted successfully" });
      setDeletingRequest(null);
    },
    onError: (error: Error) => {
      toast({ title: "Failed to delete request", description: error.message, variant: "destructive" });
    },
  });

  const { data: messages, isLoading: messagesLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/maintenance", selectedRequest?.id, "messages"],
    queryFn: async () => {
      const res = await fetch(`/api/admin/maintenance/${selectedRequest!.id}/messages`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("adminToken")}` },
      });
      if (!res.ok) throw new Error("Failed to fetch messages");
      return res.json();
    },
    enabled: !!selectedRequest,
  });

  const replyMutation = useMutation({
    mutationFn: async ({ requestId, message }: { requestId: string; message: string }) => {
      return await apiRequest("POST", `/api/admin/maintenance/${requestId}/messages`, { message });
    },
    onSuccess: () => {
      setReplyText("");
      queryClient.invalidateQueries({ queryKey: ["/api/admin/maintenance", selectedRequest?.id, "messages"] });
      toast({ title: "Reply Sent", description: "Your message has been sent to the tenant." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message || "Failed to send reply.", variant: "destructive" });
    },
  });

  const openEditDialog = (req: MaintenanceRequest) => {
    setEditForm({
      name: req.name || "",
      email: req.email || "",
      phone: req.phone || "",
      propertyAddress: req.propertyAddress || "",
      unitLabel: req.unitLabel || "",
      category: req.category || "",
      description: req.description || "",
      status: req.status || "submitted",
      priority: req.priority || "medium",
    });
    setEditingRequest(req);
  };

  const filteredRequests = requests?.filter((req) => {
    const matchesSearch = 
      req.ticketNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.propertyAddress?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || req.status === statusFilter;
    return matchesSearch && matchesStatus;
  })?.sort((a, b) => {
    if (!sortField || !sortDirection) return 0;
    let aVal = "";
    let bVal = "";
    switch (sortField) {
      case "tenant":
        aVal = (a.name || "").toLowerCase();
        bVal = (b.name || "").toLowerCase();
        break;
      case "category":
        aVal = (a.category || "").toLowerCase();
        bVal = (b.category || "").toLowerCase();
        break;
      case "status":
        aVal = (a.status || "").toLowerCase();
        bVal = (b.status || "").toLowerCase();
        break;
      case "priority":
        aVal = (a.priority || "").toLowerCase();
        bVal = (b.priority || "").toLowerCase();
        break;
      case "date":
        aVal = a.createdAt || "";
        bVal = b.createdAt || "";
        break;
      default:
        return 0;
    }
    if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
    if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
    return 0;
  });

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">Completed</Badge>;
      case "in_progress":
        return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">In Progress</Badge>;
      case "submitted":
        return <Badge variant="secondary">Submitted</Badge>;
      case "cancelled":
        return <Badge variant="outline">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPriorityBadge = (priority: string | null) => {
    if (priority === "emergency") {
      return <Badge variant="destructive">Emergency</Badge>;
    }
    if (priority === "high") {
      return <Badge className="bg-amber-100 text-amber-800">High</Badge>;
    }
    return null;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Maintenance Requests</h1>
          <p className="text-muted-foreground">Manage repair and maintenance tickets</p>
        </div>
      </div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by ticket, name, or address..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            data-testid="input-search"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40" data-testid="select-status-filter">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="submitted">Submitted</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="grid sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-amber-600" />
              <div>
                <p className="text-2xl font-bold">
                  {requests?.filter(r => r.status === "submitted").length || 0}
                </p>
                <p className="text-xs text-muted-foreground">Submitted</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Loader2 className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-2xl font-bold">
                  {requests?.filter(r => r.status === "in_progress").length || 0}
                </p>
                <p className="text-xs text-muted-foreground">In Progress</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-emerald-600" />
              <div>
                <p className="text-2xl font-bold">
                  {requests?.filter(r => r.status === "completed").length || 0}
                </p>
                <p className="text-xs text-muted-foreground">Completed</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>All Requests</CardTitle>
          <CardDescription>
            {filteredRequests?.length || 0} requests
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : filteredRequests && filteredRequests.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="cursor-pointer select-none" onClick={() => handleSort("tenant")}>
                      <div className="flex items-center">Tenant {getSortIcon("tenant")}</div>
                    </TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead className="cursor-pointer select-none" onClick={() => handleSort("category")}>
                      <div className="flex items-center">Category {getSortIcon("category")}</div>
                    </TableHead>
                    <TableHead className="cursor-pointer select-none" onClick={() => handleSort("status")}>
                      <div className="flex items-center">Status {getSortIcon("status")}</div>
                    </TableHead>
                    <TableHead className="cursor-pointer select-none" onClick={() => handleSort("date")}>
                      <div className="flex items-center">Date {getSortIcon("date")}</div>
                    </TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRequests.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{request.name}</p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {request.propertyAddress?.slice(0, 30) || "N/A"}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{request.phone || "—"}</TableCell>
                      <TableCell className="capitalize">{request.category || "General"}</TableCell>
                      <TableCell>{getStatusBadge(request.status)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {request.createdAt ? formatDate(request.createdAt) : "N/A"}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="sm" onClick={() => setSelectedRequest(request)} data-testid={`button-view-maintenance-${request.id}`}>
                            View
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditDialog(request)} data-testid={`button-edit-maintenance-${request.id}`}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeletingRequest(request)} data-testid={`button-delete-maintenance-${request.id}`}>
                            <Trash2 className="h-4 w-4" />
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
              <Wrench className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No maintenance requests</p>
              <p className="text-sm">Requests will appear here when submitted.</p>
            </div>
          )}
        </CardContent>
      </Card>
      {selectedRequest && (
        <Dialog open={!!selectedRequest} onOpenChange={() => { setSelectedRequest(null); setReplyText(""); }}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                Ticket #{selectedRequest.ticketNumber}
              </DialogTitle>
              <DialogDescription>
                Submitted on {selectedRequest.createdAt ? formatDate(selectedRequest.createdAt) : "N/A"}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Name</p>
                  <p className="font-medium">{selectedRequest.name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium">{selectedRequest.email}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Phone</p>
                  <p className="font-medium">{selectedRequest.phone || "N/A"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Category</p>
                  <p className="font-medium capitalize">{selectedRequest.category || "General"}</p>
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Property Address</p>
                <p className="font-medium">{selectedRequest.propertyAddress}</p>
                {selectedRequest.unitLabel && (
                  <p className="text-sm text-muted-foreground">Unit: {selectedRequest.unitLabel}</p>
                )}
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Description</p>
                <p className="bg-muted p-3 rounded-lg text-sm mt-1">{selectedRequest.description}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Entry Permission</p>
                  <p className="font-medium">{selectedRequest.entryPermission ? "Yes" : "No"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Pets on Premises</p>
                  <p className="font-medium">{selectedRequest.hasPets ? "Yes" : "No"}</p>
                </div>
              </div>
              {selectedRequest.photos && selectedRequest.photos.length > 0 && (
                <div>
                  <p className="text-sm text-muted-foreground flex items-center gap-1.5 mb-2">
                    <ImageIcon className="h-3.5 w-3.5" />
                    Attached Photos ({selectedRequest.photos.length})
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {selectedRequest.photos.map((photo, idx) => (
                      <MaintenancePhoto key={idx} photoData={photo} />
                    ))}
                  </div>
                </div>
              )}
              <div className="pt-4 border-t">
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Messages
                </h4>
                {messagesLoading ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin" /> Loading messages...
                  </div>
                ) : messages && messages.length > 0 ? (
                  <div className="space-y-2 mb-3 max-h-48 overflow-y-auto">
                    {messages.map((msg: any) => (
                      <div key={msg.id} className={`p-3 rounded-lg text-sm ${msg.senderType === "admin" ? "bg-primary/10 ml-6" : "bg-muted mr-6"}`} data-testid={`message-${msg.id}`}>
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant={msg.senderType === "admin" ? "default" : "secondary"} className="text-xs">
                            {msg.senderType === "admin" ? "Admin" : "Tenant"}
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
                    placeholder="Type a reply to the tenant..."
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    rows={2}
                    className="flex-1"
                    data-testid="input-reply-message"
                  />
                  <Button
                    size="sm"
                    className="self-end"
                    disabled={!replyText.trim() || replyMutation.isPending}
                    onClick={() => replyMutation.mutate({ requestId: selectedRequest.id, message: replyText })}
                    data-testid="button-send-reply"
                  >
                    {replyMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              <div className="flex items-center gap-4 pt-4 border-t">
                <p className="text-sm font-medium">Update Status:</p>
                <Select
                  value={selectedRequest.status || "submitted"}
                  onValueChange={(value) => {
                    updateMutation.mutate({ id: selectedRequest.id, status: value });
                    setSelectedRequest({ ...selectedRequest, status: value });
                  }}
                >
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="submitted">Submitted</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
      {editingRequest && (
        <Dialog open={!!editingRequest} onOpenChange={() => setEditingRequest(null)}>
          <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Request #{editingRequest.ticketNumber}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} data-testid="input-edit-name" />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} data-testid="input-edit-email" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} data-testid="input-edit-phone" />
                </div>
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select value={editForm.category} onValueChange={(val) => setEditForm({ ...editForm, category: val })}>
                    <SelectTrigger data-testid="select-edit-category">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="plumbing">Plumbing</SelectItem>
                      <SelectItem value="electrical">Electrical</SelectItem>
                      <SelectItem value="hvac">HVAC</SelectItem>
                      <SelectItem value="appliance">Appliance</SelectItem>
                      <SelectItem value="structural">Structural</SelectItem>
                      <SelectItem value="pest">Pest Control</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Property Address</Label>
                <Input value={editForm.propertyAddress} onChange={(e) => setEditForm({ ...editForm, propertyAddress: e.target.value })} data-testid="input-edit-address" />
              </div>
              <div className="space-y-2">
                <Label>Unit</Label>
                <Input value={editForm.unitLabel} onChange={(e) => setEditForm({ ...editForm, unitLabel: e.target.value })} data-testid="input-edit-unit" />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} rows={3} data-testid="input-edit-description" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={editForm.status} onValueChange={(val) => setEditForm({ ...editForm, status: val })}>
                    <SelectTrigger data-testid="select-edit-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="submitted">Submitted</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingRequest(null)} data-testid="button-cancel-edit">Cancel</Button>
              <Button
                onClick={() => editMutation.mutate({ id: editingRequest.id, data: editForm })}
                disabled={editMutation.isPending}
                data-testid="button-save-edit"
              >
                {editMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
      {deletingRequest && (
        <Dialog open={!!deletingRequest} onOpenChange={() => setDeletingRequest(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Delete Maintenance Request</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete ticket #{deletingRequest.ticketNumber}? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeletingRequest(null)} data-testid="button-cancel-delete">Cancel</Button>
              <Button
                variant="destructive"
                onClick={() => deleteMutation.mutate(deletingRequest.id)}
                disabled={deleteMutation.isPending}
                data-testid="button-confirm-delete"
              >
                {deleteMutation.isPending ? "Deleting..." : "Delete"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
