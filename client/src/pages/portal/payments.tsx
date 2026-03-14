import { useState, useEffect, useMemo } from "react";
import zelleQrCode from "@assets/Zelle_Code_1772343289079.jpeg";
import { formatDate } from "@/lib/date-utils";
import { useQuery, useMutation } from "@tanstack/react-query";
import { loadStripe, type Stripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CreditCard, Building2, DollarSign, CheckCircle, Download, Plus, Loader2, AlertCircle, Smartphone, Copy, Mail } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

function calcProcessingFee(amount: number, method: "card" | "ach"): number {
  if (method === "ach") {
    return Math.min(amount * 0.008, 5.00);
  }
  return Math.round(amount * 0.0299 * 100) / 100;
}

let stripePromise: Promise<Stripe | null> | null = null;

function getStripePromise() {
  if (!stripePromise) {
    stripePromise = fetch("/api/stripe/publishable-key")
      .then(r => r.json())
      .then(data => data.publishableKey ? loadStripe(data.publishableKey) : null)
      .catch(() => null);
  }
  return stripePromise;
}

function PortalStripePaymentForm({ onSuccess, onError, totalWithFee }: {
  onSuccess: (data: any) => void;
  onError: (error: string) => void;
  totalWithFee: string;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setProcessing(true);
    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: window.location.href,
        },
        redirect: "if_required",
      });

      if (error) {
        onError(error.message || "Payment failed");
        setProcessing(false);
        return;
      }

      if (paymentIntent && paymentIntent.status === "succeeded") {
        const response = await apiRequest("POST", "/api/stripe/portal/confirm-payment", {
          paymentIntentId: paymentIntent.id,
        });
        onSuccess(response);
      } else if (paymentIntent && paymentIntent.status === "processing") {
        onSuccess({ status: "processing" });
      } else {
        onError("Payment was not completed. Please try again.");
      }
    } catch (err: any) {
      onError(err.message || "Payment failed");
    }
    setProcessing(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />
      <Button
        type="submit"
        className="w-full"
        disabled={!stripe || !elements || processing}
        data-testid="button-stripe-confirm"
      >
        {processing ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Processing...
          </>
        ) : (
          <>Pay ${totalWithFee}</>
        )}
      </Button>
    </form>
  );
}

export default function PortalPayments() {
  const { toast } = useToast();
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"card" | "ach" | "zelle">("card");
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [stripeInstance, setStripeInstance] = useState<Stripe | null>(null);
  const [zelleConfirmationId, setZelleConfirmationId] = useState("");
  const [zelleSubmitted, setZelleSubmitted] = useState(false);

  useEffect(() => {
    getStripePromise().then(s => setStripeInstance(s));
  }, []);

  const { data: payments, isLoading } = useQuery({
    queryKey: ["/api/portal/payments"],
  });

  const { data: tenantInfo } = useQuery({
    queryKey: ["/api/portal/tenant"],
  });

  const { data: amountDue, isLoading: amountDueLoading } = useQuery({
    queryKey: ["/api/portal/amount-due"],
  });

  const processingFee = useMemo(() => {
    if (!amountDue?.totalDue) return 0;
    return calcProcessingFee(amountDue.totalDue, paymentMethod);
  }, [amountDue?.totalDue, paymentMethod]);

  const totalWithFee = useMemo(() => {
    if (!amountDue?.totalDue) return 0;
    return Math.round((amountDue.totalDue + processingFee) * 100) / 100;
  }, [amountDue?.totalDue, processingFee]);

  const createIntentMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/stripe/portal/create-payment-intent", {
        amount: totalWithFee,
        method: paymentMethod,
        description: `Rent payment - ${paymentMethod === "card" ? "Card" : "ACH"}`,
      });
      return await response.json();
    },
    onSuccess: (data: any) => {
      setClientSecret(data.clientSecret);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to initialize payment.",
        variant: "destructive",
      });
    },
  });

  const zellePaymentMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/portal/zelle-payment", {
        confirmationId: zelleConfirmationId.trim(),
      });
      return await response.json();
    },
    onSuccess: () => {
      setZelleSubmitted(true);
      queryClient.invalidateQueries({ queryKey: ["/api/portal/payments"] });
      toast({
        title: "Zelle Payment Submitted",
        description: "Your payment confirmation has been recorded and is pending admin verification.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to submit Zelle payment.",
        variant: "destructive",
      });
    },
  });

  const handlePay = () => {
    if (totalWithFee <= 0) return;
    createIntentMutation.mutate();
  };

  const handlePaymentSuccess = () => {
    setShowPaymentDialog(false);
    setClientSecret(null);
    queryClient.invalidateQueries({ queryKey: ["/api/portal/payments"] });
    queryClient.invalidateQueries({ queryKey: ["/api/portal/tenant"] });
    queryClient.invalidateQueries({ queryKey: ["/api/portal/amount-due"] });
    toast({
      title: "Payment Successful",
      description: "Your payment has been processed.",
    });
  };

  const handlePaymentError = (errorMessage: string) => {
    toast({
      title: "Payment Failed",
      description: errorMessage,
      variant: "destructive",
    });
  };

  const copyZelleEmail = () => {
    navigator.clipboard.writeText("atidrealtyllc@gmail.com");
    toast({ title: "Email copied to clipboard" });
  };

  const handleDialogClose = (open: boolean) => {
    setShowPaymentDialog(open);
    if (!open) {
      setClientSecret(null);
      setZelleConfirmationId("");
      setZelleSubmitted(false);
      setPaymentMethod("card");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400" data-testid="badge-completed">Completed</Badge>;
      case "pending":
        return <Badge variant="secondary" data-testid="badge-pending">Pending</Badge>;
      case "failed":
        return <Badge variant="destructive" data-testid="badge-failed">Failed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Payments</h1>
          <p className="text-muted-foreground">Manage your rent payments and view history</p>
        </div>
        <Dialog open={showPaymentDialog} onOpenChange={handleDialogClose}>
          <DialogTrigger asChild>
            <Button data-testid="button-make-payment">
              <Plus className="h-4 w-4 mr-2" />
              Make Payment
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Make a Payment</DialogTitle>
              <DialogDescription>
                Pay your rent securely online
              </DialogDescription>
            </DialogHeader>
            {clientSecret && stripeInstance ? (
              <div className="space-y-4">
                <div className="bg-muted rounded-lg p-3 space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Rent Due</span>
                    <span className="font-medium" data-testid="text-rent-due">${amountDue?.baseRent?.toFixed(2)}</span>
                  </div>
                  {amountDue?.lateFees > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Late Fees</span>
                      <span className="font-medium text-red-600" data-testid="text-late-fees">${amountDue.lateFees.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Processing Fee ({paymentMethod === "card" ? "2.99%" : "0.8% max $5"})</span>
                    <span className="font-medium" data-testid="text-processing-fee">${processingFee.toFixed(2)}</span>
                  </div>
                  <Separator className="my-1" />
                  <div className="flex justify-between text-sm font-bold">
                    <span>Total</span>
                    <span data-testid="text-total-charge">${totalWithFee.toFixed(2)}</span>
                  </div>
                </div>
                <Elements stripe={stripeInstance} options={{ clientSecret, appearance: { theme: "stripe" } }}>
                  <PortalStripePaymentForm
                    onSuccess={handlePaymentSuccess}
                    onError={handlePaymentError}
                    totalWithFee={totalWithFee.toFixed(2)}
                  />
                </Elements>
                <Button
                  variant="ghost"
                  onClick={() => setClientSecret(null)}
                  className="w-full"
                  data-testid="button-back-to-form"
                >
                  Back
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {amountDueLoading ? (
                  <div className="space-y-3">
                    <Skeleton className="h-6 w-full" />
                    <Skeleton className="h-6 w-full" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                ) : amountDue?.totalDue > 0 ? (
                  <>
                    <div className="bg-muted rounded-lg p-4 space-y-2">
                      {amountDue.breakdown?.map((item: any, idx: number) => (
                        <div key={idx} className="space-y-1">
                          {amountDue.breakdown.length > 1 && (
                            <p className="text-xs font-medium text-muted-foreground uppercase">{item.month}</p>
                          )}
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Rent</span>
                            <span data-testid={`text-base-rent-${idx}`}>${item.baseRent.toFixed(2)}</span>
                          </div>
                          {item.lateFee > 0 && (
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Late Fee</span>
                              <span className="text-red-600" data-testid={`text-late-fee-${idx}`}>${item.lateFee.toFixed(2)}</span>
                            </div>
                          )}
                          {item.paid > 0 && (
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Already Paid</span>
                              <span className="text-green-600" data-testid={`text-paid-${idx}`}>-${item.paid.toFixed(2)}</span>
                            </div>
                          )}
                        </div>
                      ))}
                      <Separator className="my-2" />
                      <div className="flex justify-between text-sm font-semibold">
                        <span>Subtotal</span>
                        <span data-testid="text-subtotal">${amountDue.totalDue.toFixed(2)}</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Payment Method</label>
                      <Tabs value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as any)}>
                        <TabsList className="grid w-full grid-cols-3">
                          <TabsTrigger value="card" data-testid="tab-card">
                            <CreditCard className="h-4 w-4 mr-1" />
                            Card
                          </TabsTrigger>
                          <TabsTrigger value="ach" data-testid="tab-ach">
                            <Building2 className="h-4 w-4 mr-1" />
                            ACH
                          </TabsTrigger>
                          <TabsTrigger value="zelle" data-testid="tab-zelle">
                            <Smartphone className="h-4 w-4 mr-1" />
                            Zelle
                          </TabsTrigger>
                        </TabsList>
                      </Tabs>
                      {paymentMethod !== "zelle" && (
                        <p className="text-xs text-muted-foreground">
                          {paymentMethod === "card"
                            ? "A 2.99% processing fee applies to card payments."
                            : "A 0.8% processing fee (max $5.00) applies to ACH payments."}
                        </p>
                      )}
                    </div>

                    {paymentMethod === "zelle" ? (
                      zelleSubmitted ? (
                        <div className="text-center py-6">
                          <CheckCircle className="h-12 w-12 mx-auto mb-3 text-green-500" />
                          <p className="font-medium">Payment Confirmation Submitted</p>
                          <p className="text-sm text-muted-foreground mt-1">
                            Your Zelle payment is pending verification by our team.
                            You'll be notified once it's confirmed.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div className="bg-muted rounded-lg p-4 space-y-3">
                            <p className="text-sm font-medium text-center">Send payment via Zelle to:</p>
                            <div className="flex items-center justify-center gap-2 bg-background rounded-md p-3 border">
                              <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                              <span className="font-mono text-sm font-semibold" data-testid="text-zelle-email">atidrealtyllc@gmail.com</span>
                              <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={copyZelleEmail} data-testid="button-copy-zelle-email">
                                <Copy className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                            <div className="flex justify-center">
                              <div className="bg-white rounded-lg p-3">
                                <img
                                  src={zelleQrCode}
                                  alt="Zelle QR Code - ATID REALTY LLC"
                                  className="w-[200px] h-auto"
                                  data-testid="img-zelle-qr"
                                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                />
                              </div>
                            </div>
                            <p className="text-xs text-center text-muted-foreground">
                              Scan this QR code with your banking app to send payment
                            </p>
                          </div>

                          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                            <div className="flex gap-2">
                              <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                              <div className="text-xs text-amber-800 dark:text-amber-300 space-y-1">
                                <p className="font-medium">Amount to send: ${amountDue.totalDue.toFixed(2)}</p>
                                <p>No processing fee for Zelle payments.</p>
                                <p>After sending payment, enter your transaction ID or confirmation number below.</p>
                              </div>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="zelle-confirmation">Transaction ID / Confirmation Number</Label>
                            <Input
                              id="zelle-confirmation"
                              value={zelleConfirmationId}
                              onChange={(e) => setZelleConfirmationId(e.target.value)}
                              placeholder="Enter your Zelle transaction ID"
                              data-testid="input-zelle-confirmation"
                            />
                          </div>

                          <Button
                            className="w-full"
                            onClick={() => zellePaymentMutation.mutate()}
                            disabled={zellePaymentMutation.isPending || !zelleConfirmationId.trim()}
                            data-testid="button-submit-zelle"
                          >
                            {zellePaymentMutation.isPending ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Submitting...
                              </>
                            ) : (
                              "Submit Payment Confirmation"
                            )}
                          </Button>
                        </div>
                      )
                    ) : (
                      <>
                        <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 space-y-1">
                          <div className="flex justify-between text-sm">
                            <span>Rent & Fees</span>
                            <span>${amountDue.totalDue.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between text-sm text-muted-foreground">
                            <span>Processing Fee</span>
                            <span data-testid="text-fee-preview">${processingFee.toFixed(2)}</span>
                          </div>
                          <Separator className="my-1" />
                          <div className="flex justify-between font-bold">
                            <span>Total Charge</span>
                            <span data-testid="text-total-preview">${totalWithFee.toFixed(2)}</span>
                          </div>
                        </div>

                        <Button
                          className="w-full"
                          onClick={handlePay}
                          disabled={createIntentMutation.isPending}
                          data-testid="button-confirm-payment"
                        >
                          {createIntentMutation.isPending ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Initializing...
                            </>
                          ) : (
                            <>Pay ${totalWithFee.toFixed(2)}</>
                          )}
                        </Button>
                      </>
                    )}
                  </>
                ) : (
                  <div className="text-center py-6">
                    <CheckCircle className="h-12 w-12 mx-auto mb-3 text-green-500" />
                    <p className="font-medium">No balance due</p>
                    <p className="text-sm text-muted-foreground mt-1">You're all caught up!</p>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
            <CardTitle className="text-sm font-medium">Amount Due</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-balance">
              ${amountDue?.totalDue?.toFixed(2) || "0.00"}
            </div>
            {amountDue?.lateFees > 0 && (
              <p className="text-xs text-red-600 mt-1">Includes ${amountDue.lateFees.toFixed(2)} in late fees</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
            <CardTitle className="text-sm font-medium">Monthly Rent</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-monthly-rent">
              ${tenantInfo?.rentAmount || "0.00"}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
            <CardTitle className="text-sm font-medium">Total Paid YTD</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-paid-ytd">
              ${payments?.totalPaidYTD?.toFixed(2) || "0.00"}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Payment History</CardTitle>
          <CardDescription>View all your past payments</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : payments?.history?.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.history.map((payment: any) => (
                    <TableRow key={payment.id} data-testid={`row-payment-${payment.id}`}>
                      <TableCell>
                        {formatDate(payment.createdAt)}
                      </TableCell>
                      <TableCell>{payment.description || "Rent Payment"}</TableCell>
                      <TableCell className="capitalize">{payment.method || "Card"}</TableCell>
                      <TableCell className="font-medium">
                        ${parseFloat(payment.amount).toFixed(2)}
                      </TableCell>
                      <TableCell>{getStatusBadge(payment.status)}</TableCell>
                      <TableCell>
                        {payment.receiptUrl && (
                          <Button variant="ghost" size="icon" asChild>
                            <a href={payment.receiptUrl} target="_blank" rel="noopener noreferrer">
                              <Download className="h-4 w-4" />
                            </a>
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <CreditCard className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No payment history</p>
              <p className="text-sm">Your payments will appear here once you make one.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
