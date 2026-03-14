import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { loadStripe, type Stripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { PublicLayout } from "@/components/layout/public-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CreditCard, Building2, Smartphone, CheckCircle, Loader2, DollarSign, ShieldCheck, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

const paymentSchema = z.object({
  propertyCode: z.string().min(3, "Property ID is required"),
  email: z.string().email("Please enter a valid email"),
  paymentType: z.string().min(1, "Please select a payment type"),
  amount: z.string().refine((val) => {
    const num = parseFloat(val);
    return !isNaN(num) && num > 0;
  }, "Please enter a valid amount"),
  description: z.string().optional(),
});

type PaymentFormData = z.infer<typeof paymentSchema>;

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

function StripePaymentForm({ clientSecret, paymentIntentId, onSuccess, onError, amount }: {
  clientSecret: string;
  paymentIntentId: string;
  onSuccess: (data: any) => void;
  onError: (error: string) => void;
  amount: string;
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
        const response = await apiRequest("POST", "/api/stripe/confirm-payment", {
          paymentIntentId: paymentIntent.id,
        });
        onSuccess(response);
      } else if (paymentIntent && paymentIntent.status === "processing") {
        onSuccess({ status: "processing", message: "Payment is processing. You will receive confirmation shortly." });
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
        size="lg"
        disabled={!stripe || !elements || processing}
        data-testid="button-stripe-pay"
      >
        {processing ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Processing...
          </>
        ) : (
          <>Pay ${amount}</>
        )}
      </Button>
    </form>
  );
}

export default function Pay() {
  const { toast } = useToast();
  const [paymentMethod, setPaymentMethod] = useState<"card" | "ach" | "zelle">("card");
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [paymentData, setPaymentData] = useState<any>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);
  const [stripeReady, setStripeReady] = useState(false);
  const [stripeInstance, setStripeInstance] = useState<Stripe | null>(null);

  useEffect(() => {
    getStripePromise().then(s => {
      setStripeInstance(s);
      setStripeReady(true);
    });
  }, []);

  const form = useForm<PaymentFormData>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      propertyCode: "",
      email: "",
      paymentType: "",
      amount: "",
      description: "",
    },
  });

  const createIntentMutation = useMutation({
    mutationFn: async (data: PaymentFormData & { method: string }) => {
      const response = await apiRequest("POST", "/api/stripe/create-payment-intent", {
        amount: parseFloat(data.amount),
        method: data.method,
        propertyCode: data.propertyCode,
        email: data.email,
        paymentType: data.paymentType,
        description: data.description,
      });
      return await response.json();
    },
    onSuccess: (data: any) => {
      setClientSecret(data.clientSecret);
      setPaymentIntentId(data.paymentIntentId);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to initialize payment. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: PaymentFormData) => {
    if (paymentMethod === "zelle") {
      toast({
        title: "Zelle Instructions",
        description: "Please follow the Zelle instructions shown below to complete your payment.",
      });
      return;
    }
    createIntentMutation.mutate({ ...data, amount: data.amount.replace(/,/g, ''), method: paymentMethod });
  };

  const handlePaymentSuccess = (data: any) => {
    setPaymentSuccess(true);
    setPaymentData({ ...data, amount: parseFloat(form.getValues("amount")) });
    setClientSecret(null);
    setPaymentIntentId(null);
    toast({
      title: "Payment Successful",
      description: "Your payment has been processed successfully.",
    });
  };

  const handlePaymentError = (errorMessage: string) => {
    toast({
      title: "Payment Failed",
      description: errorMessage,
      variant: "destructive",
    });
  };

  if (paymentSuccess) {
    return (
      <PublicLayout>
        <div className="container mx-auto px-4 py-16 max-w-2xl">
          <Card className="text-center">
            <CardHeader className="pb-4">
              <div className="w-20 h-20 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="h-10 w-10 text-emerald-600 dark:text-emerald-400" />
              </div>
              <CardTitle className="text-2xl">Payment Successful!</CardTitle>
              <CardDescription>
                Your payment has been processed
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-muted rounded-lg p-6 space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Amount Paid</span>
                  <span className="font-semibold text-lg" data-testid="text-amount">
                    ${paymentData?.amount?.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Payment Method</span>
                  <span className="font-medium capitalize">{paymentMethod === "ach" ? "Bank Transfer (ACH)" : "Card"}</span>
                </div>
                {paymentData?.id && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Confirmation #</span>
                    <span className="font-mono text-sm">{paymentData.id.slice(0, 12)}</span>
                  </div>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                A receipt has been sent to your email address.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
                <Button onClick={() => { setPaymentSuccess(false); setPaymentData(null); form.reset(); }} variant="outline">
                  Make Another Payment
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
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-100 dark:bg-emerald-900/30 mb-4">
            <DollarSign className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-2">Quick Pay</h1>
          <p className="text-muted-foreground">
            Pay your rent or deposit securely using your preferred payment method
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-4 mb-8">
          <Card className="text-center p-4">
            <ShieldCheck className="h-8 w-8 mx-auto mb-2 text-primary" />
            <p className="text-sm font-medium">Secure Payments</p>
            <p className="text-xs text-muted-foreground">Bank-level encryption</p>
          </Card>
          <Card className="text-center p-4">
            <CreditCard className="h-8 w-8 mx-auto mb-2 text-primary" />
            <p className="text-sm font-medium">Multiple Options</p>
            <p className="text-xs text-muted-foreground">Card, ACH, or Zelle</p>
          </Card>
          <Card className="text-center p-4">
            <CheckCircle className="h-8 w-8 mx-auto mb-2 text-primary" />
            <p className="text-sm font-medium">Instant Confirmation</p>
            <p className="text-xs text-muted-foreground">Email receipt included</p>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Payment Information</CardTitle>
            <CardDescription>
              Enter your property ID and payment details
            </CardDescription>
          </CardHeader>
          <CardContent>
            {clientSecret && stripeInstance ? (
              <div className="space-y-4">
                <div className="bg-muted rounded-lg p-4 space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Property ID</span>
                    <span className="font-medium">{form.getValues("propertyCode")}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Amount</span>
                    <span className="font-medium">${form.getValues("amount")}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Method</span>
                    <span className="font-medium capitalize">{paymentMethod === "ach" ? "Bank Transfer (ACH)" : "Card"}</span>
                  </div>
                </div>
                <Elements stripe={stripeInstance} options={{ clientSecret, appearance: { theme: "stripe" } }}>
                  <StripePaymentForm
                    clientSecret={clientSecret}
                    paymentIntentId={paymentIntentId!}
                    onSuccess={handlePaymentSuccess}
                    onError={handlePaymentError}
                    amount={form.getValues("amount")}
                  />
                </Elements>
                <Button
                  variant="ghost"
                  onClick={() => { setClientSecret(null); setPaymentIntentId(null); }}
                  className="w-full"
                  data-testid="button-change-details"
                >
                  Change Payment Details
                </Button>
              </div>
            ) : (
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="propertyCode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Property ID *</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., PROP-001" {...field} data-testid="input-property-code" />
                          </FormControl>
                          <FormDescription>
                            Found on your lease or welcome letter
                          </FormDescription>
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
                          <FormDescription>
                            Receipt will be sent here
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="paymentType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Payment Type *</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-payment-type">
                              <SelectValue placeholder="Select payment type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="rent">Rent Payment</SelectItem>
                            <SelectItem value="deposit">Deposit Payment</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Payment Amount *</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              type="text"
                              inputMode="decimal"
                              placeholder="0.00"
                              className="pl-9"
                              {...field}
                              onFocus={(e) => e.target.select()}
                              data-testid="input-amount"
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Payment Description (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., January 2025 Rent" {...field} data-testid="input-description" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="space-y-4">
                    <FormLabel>Payment Method</FormLabel>
                    <Tabs value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as any)}>
                      <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="card" data-testid="tab-card">
                          <CreditCard className="h-4 w-4 mr-2" />
                          Card
                        </TabsTrigger>
                        <TabsTrigger value="ach" data-testid="tab-ach">
                          <Building2 className="h-4 w-4 mr-2" />
                          ACH
                        </TabsTrigger>
                        <TabsTrigger value="zelle" data-testid="tab-zelle">
                          <Smartphone className="h-4 w-4 mr-2" />
                          Zelle
                        </TabsTrigger>
                      </TabsList>
                      <TabsContent value="card" className="mt-4">
                        <Alert>
                          <CreditCard className="h-4 w-4" />
                          <AlertDescription>
                            Pay securely with credit or debit card. A 2.99% processing fee applies.
                          </AlertDescription>
                        </Alert>
                      </TabsContent>
                      <TabsContent value="ach" className="mt-4">
                        <Alert>
                          <Building2 className="h-4 w-4" />
                          <AlertDescription>
                            Direct bank transfer (ACH). No processing fee. Takes 3-5 business days.
                          </AlertDescription>
                        </Alert>
                      </TabsContent>
                      <TabsContent value="zelle" className="mt-4">
                        <Alert>
                          <Smartphone className="h-4 w-4" />
                          <AlertDescription className="space-y-2">
                            <p>Send payment via Zelle to: <strong>atidrealtyllc@gmail.com</strong></p>
                            <p className="text-xs">Include your Property ID in the memo. Allow 1-2 business days for processing.</p>
                          </AlertDescription>
                        </Alert>
                      </TabsContent>
                    </Tabs>
                  </div>

                  <div className="flex justify-end pt-4">
                    <Button
                      type="submit"
                      size="lg"
                      disabled={createIntentMutation.isPending || !stripeReady}
                      data-testid="button-submit"
                    >
                      {createIntentMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Initializing...
                        </>
                      ) : paymentMethod === "zelle" ? (
                        "View Zelle Instructions"
                      ) : (
                        <>Continue to Pay ${form.watch("amount") || "0.00"}</>
                      )}
                    </Button>
                  </div>
                </form>
              </Form>
            )}
          </CardContent>
        </Card>
      </div>
    </PublicLayout>
  );
}
