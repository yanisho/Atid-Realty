import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { MessageSquare, Send, Search, Mail, Clock, CheckCircle, XCircle, Users, Loader2, ChevronRight, Megaphone } from "lucide-react";
import type { Tenant, TenantMessage } from "@shared/schema";

export default function AdminMessaging() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);
  const [composeOpen, setComposeOpen] = useState(false);
  const [broadcastOpen, setBroadcastOpen] = useState(false);
  const [composeSubject, setComposeSubject] = useState("");
  const [composeBody, setComposeBody] = useState("");
  const [composeTenantId, setComposeTenantId] = useState("");
  const [broadcastSubject, setBroadcastSubject] = useState("");
  const [broadcastBody, setBroadcastBody] = useState("");
  const [selectedTenantIds, setSelectedTenantIds] = useState<string[]>([]);
  const [broadcastSearch, setBroadcastSearch] = useState("");

  const { data: tenants = [], isLoading: tenantsLoading } = useQuery<Tenant[]>({
    queryKey: ["/api/admin/tenants"],
  });

  const { data: allMessages = [], isLoading: messagesLoading } = useQuery<TenantMessage[]>({
    queryKey: ["/api/admin/messages"],
  });

  const { data: tenantMessages = [] } = useQuery<TenantMessage[]>({
    queryKey: ["/api/admin/messages/tenant", selectedTenantId],
    queryFn: async () => {
      const res = await fetch(`/api/admin/messages/tenant/${selectedTenantId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("adminToken")}` },
      });
      if (!res.ok) throw new Error("Failed to fetch messages");
      return res.json();
    },
    enabled: !!selectedTenantId,
  });

  const sendMutation = useMutation({
    mutationFn: async (data: { tenantId: string; subject: string; body: string }) => {
      const res = await apiRequest("POST", "/api/admin/messages/send", data);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/messages"] });
      if (selectedTenantId) queryClient.invalidateQueries({ queryKey: ["/api/admin/messages/tenant", selectedTenantId] });
      if (data.emailSent) {
        toast({ title: "Message Sent", description: "Email delivered successfully." });
      } else {
        toast({ title: "Message Saved", description: "Email delivery failed but message was saved.", variant: "destructive" });
      }
      setComposeOpen(false);
      setComposeSubject("");
      setComposeBody("");
      setComposeTenantId("");
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message || "Failed to send message.", variant: "destructive" });
    },
  });

  const broadcastMutation = useMutation({
    mutationFn: async (data: { tenantIds: string[]; subject: string; body: string }) => {
      const res = await apiRequest("POST", "/api/admin/messages/broadcast", data);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/messages"] });
      toast({ title: "Broadcast Complete", description: `${data.sent} sent, ${data.failed} failed, ${data.skipped} skipped.` });
      setBroadcastOpen(false);
      setBroadcastSubject("");
      setBroadcastBody("");
      setSelectedTenantIds([]);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message || "Failed to broadcast.", variant: "destructive" });
    },
  });

  const tenantsWithMessages = tenants.map(t => {
    const msgs = allMessages.filter(m => m.tenantId === t.id);
    const lastMsg = msgs[0];
    return { ...t, messageCount: msgs.length, lastMessage: lastMsg };
  }).filter(t => t.email);

  const filteredTenants = tenantsWithMessages.filter(t => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      `${t.firstName} ${t.lastName}`.toLowerCase().includes(q) ||
      t.email?.toLowerCase().includes(q) ||
      t.phone?.toLowerCase().includes(q)
    );
  }).sort((a, b) => {
    if (a.lastMessage && b.lastMessage) {
      return new Date(b.lastMessage.createdAt!).getTime() - new Date(a.lastMessage.createdAt!).getTime();
    }
    if (a.lastMessage) return -1;
    if (b.lastMessage) return 1;
    return `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`);
  });

  const selectedTenant = tenants.find(t => t.id === selectedTenantId);

  const broadcastFilteredTenants = tenants.filter(t => {
    if (!t.email) return false;
    if (!broadcastSearch) return true;
    const q = broadcastSearch.toLowerCase();
    return `${t.firstName} ${t.lastName}`.toLowerCase().includes(q) || t.email?.toLowerCase().includes(q);
  });

  const [inlineSubject, setInlineSubject] = useState("");
  const [inlineBody, setInlineBody] = useState("");

  const inlineSendMutation = useMutation({
    mutationFn: async (data: { tenantId: string; subject: string; body: string }) => {
      const res = await apiRequest("POST", "/api/admin/messages/send", data);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/messages/tenant", selectedTenantId] });
      if (data.emailSent) {
        toast({ title: "Sent" });
      } else {
        toast({ title: "Email delivery failed", variant: "destructive" });
      }
      setInlineSubject("");
      setInlineBody("");
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  if (tenantsLoading || messagesLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <MessageSquare className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold" data-testid="text-messaging-title">Messaging</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setBroadcastOpen(true)} data-testid="button-broadcast">
            <Megaphone className="h-4 w-4 mr-2" />
            Broadcast
          </Button>
          <Button onClick={() => setComposeOpen(true)} data-testid="button-compose">
            <Mail className="h-4 w-4 mr-2" />
            Compose
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4" style={{ height: "calc(100vh - 200px)" }}>
        <Card className="md:col-span-1 flex flex-col overflow-hidden">
          <CardHeader className="pb-2 shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search tenants..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                data-testid="input-search-tenants"
              />
            </div>
          </CardHeader>
          <CardContent className="p-0 flex-1 overflow-y-auto">
            {filteredTenants.length === 0 ? (
              <p className="text-sm text-muted-foreground p-4 text-center">No tenants with email found.</p>
            ) : (
              <div className="divide-y">
                {filteredTenants.map(t => (
                  <button
                    key={t.id}
                    className={`w-full text-left p-3 hover:bg-muted/50 transition-colors flex items-center gap-3 ${selectedTenantId === t.id ? "bg-muted" : ""}`}
                    onClick={() => setSelectedTenantId(t.id)}
                    data-testid={`tenant-row-${t.id}`}
                  >
                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium text-primary shrink-0">
                      {t.firstName?.[0]}{t.lastName?.[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-sm truncate">{t.firstName} {t.lastName}</p>
                        {t.messageCount > 0 && (
                          <Badge variant="secondary" className="text-xs ml-1 shrink-0">{t.messageCount}</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{t.email}</p>
                      {t.lastMessage && (
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {t.lastMessage.subject}
                        </p>
                      )}
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="md:col-span-2 flex flex-col overflow-hidden">
          {selectedTenant ? (
            <>
              <CardHeader className="pb-2 shrink-0 border-b">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg" data-testid="text-selected-tenant">
                      {selectedTenant.firstName} {selectedTenant.lastName}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">{selectedTenant.email}</p>
                    {selectedTenant.phone && (
                      <p className="text-xs text-muted-foreground">{selectedTenant.phone}</p>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex-1 overflow-y-auto p-4">
                {tenantMessages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                    <Mail className="h-12 w-12 mb-3 opacity-30" />
                    <p className="text-sm">No messages yet. Send the first email below.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {[...tenantMessages].reverse().map(msg => (
                      <div
                        key={msg.id}
                        className={`p-3 rounded-lg text-sm ${msg.direction === "outbound" ? "bg-primary/10 ml-8" : "bg-muted mr-8"}`}
                        data-testid={`message-${msg.id}`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant={msg.direction === "outbound" ? "default" : "secondary"} className="text-xs">
                            {msg.direction === "outbound" ? "Sent" : "Received"}
                          </Badge>
                          {msg.status === "sent" && <CheckCircle className="h-3 w-3 text-green-500" />}
                          {msg.status === "failed" && <XCircle className="h-3 w-3 text-red-500" />}
                          <span className="text-xs text-muted-foreground">
                            {new Date(msg.createdAt!).toLocaleString()}
                          </span>
                        </div>
                        <p className="font-medium text-xs mb-1">{msg.subject}</p>
                        <p className="whitespace-pre-wrap">{msg.body}</p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
              <div className="border-t p-3 shrink-0 space-y-2">
                <Input
                  placeholder="Subject"
                  value={inlineSubject}
                  onChange={(e) => setInlineSubject(e.target.value)}
                  data-testid="input-inline-subject"
                />
                <div className="flex gap-2">
                  <Textarea
                    placeholder="Type your message..."
                    value={inlineBody}
                    onChange={(e) => setInlineBody(e.target.value)}
                    rows={2}
                    className="flex-1"
                    data-testid="input-inline-body"
                  />
                  <Button
                    className="self-end"
                    disabled={!inlineSubject.trim() || !inlineBody.trim() || inlineSendMutation.isPending}
                    onClick={() => inlineSendMutation.mutate({ tenantId: selectedTenantId!, subject: inlineSubject, body: inlineBody })}
                    data-testid="button-inline-send"
                  >
                    {inlineSendMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-8">
              <MessageSquare className="h-16 w-16 mb-4 opacity-20" />
              <p className="text-lg font-medium mb-1">Select a Tenant</p>
              <p className="text-sm text-center">Choose a tenant from the list to view conversation history and send emails.</p>
            </div>
          )}
        </Card>
      </div>

      <Dialog open={composeOpen} onOpenChange={setComposeOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Compose Email</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>To (Tenant)</Label>
              <Select value={composeTenantId} onValueChange={setComposeTenantId}>
                <SelectTrigger data-testid="select-compose-tenant">
                  <SelectValue placeholder="Select a tenant" />
                </SelectTrigger>
                <SelectContent>
                  {tenants.filter(t => t.email).map(t => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.firstName} {t.lastName} ({t.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Subject</Label>
              <Input
                value={composeSubject}
                onChange={(e) => setComposeSubject(e.target.value)}
                placeholder="Email subject"
                data-testid="input-compose-subject"
              />
            </div>
            <div className="space-y-2">
              <Label>Message</Label>
              <Textarea
                value={composeBody}
                onChange={(e) => setComposeBody(e.target.value)}
                placeholder="Type your message..."
                rows={6}
                data-testid="input-compose-body"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setComposeOpen(false)}>Cancel</Button>
            <Button
              disabled={!composeTenantId || !composeSubject.trim() || !composeBody.trim() || sendMutation.isPending}
              onClick={() => sendMutation.mutate({ tenantId: composeTenantId, subject: composeSubject, body: composeBody })}
              data-testid="button-compose-send"
            >
              {sendMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
              Send Email
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={broadcastOpen} onOpenChange={setBroadcastOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Broadcast Email</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Select Recipients ({selectedTenantIds.length} selected)</Label>
              <Input
                placeholder="Search tenants..."
                value={broadcastSearch}
                onChange={(e) => setBroadcastSearch(e.target.value)}
                data-testid="input-broadcast-search"
              />
              <div className="flex gap-2 mb-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedTenantIds(broadcastFilteredTenants.map(t => t.id))}
                  data-testid="button-select-all"
                >
                  Select All
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedTenantIds([])}
                  data-testid="button-deselect-all"
                >
                  Deselect All
                </Button>
              </div>
              <div className="max-h-48 overflow-y-auto border rounded-md p-2 space-y-1">
                {broadcastFilteredTenants.map(t => (
                  <label key={t.id} className="flex items-center gap-2 p-1.5 rounded hover:bg-muted/50 cursor-pointer text-sm">
                    <Checkbox
                      checked={selectedTenantIds.includes(t.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedTenantIds(prev => [...prev, t.id]);
                        } else {
                          setSelectedTenantIds(prev => prev.filter(id => id !== t.id));
                        }
                      }}
                      data-testid={`checkbox-tenant-${t.id}`}
                    />
                    <span>{t.firstName} {t.lastName}</span>
                    <span className="text-muted-foreground text-xs ml-auto">{t.email}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Subject</Label>
              <Input
                value={broadcastSubject}
                onChange={(e) => setBroadcastSubject(e.target.value)}
                placeholder="Email subject"
                data-testid="input-broadcast-subject"
              />
            </div>
            <div className="space-y-2">
              <Label>Message</Label>
              <Textarea
                value={broadcastBody}
                onChange={(e) => setBroadcastBody(e.target.value)}
                placeholder="Type your message to all selected tenants..."
                rows={6}
                data-testid="input-broadcast-body"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBroadcastOpen(false)}>Cancel</Button>
            <Button
              disabled={selectedTenantIds.length === 0 || !broadcastSubject.trim() || !broadcastBody.trim() || broadcastMutation.isPending}
              onClick={() => broadcastMutation.mutate({ tenantIds: selectedTenantIds, subject: broadcastSubject, body: broadcastBody })}
              data-testid="button-broadcast-send"
            >
              {broadcastMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Megaphone className="h-4 w-4 mr-2" />}
              Send to {selectedTenantIds.length} Tenants
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
