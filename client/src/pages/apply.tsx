import { useState } from "react";
import { Link } from "wouter";
import { isoToDisplay, displayToIso, formatDate } from "@/lib/date-utils";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { PublicLayout } from "@/components/layout/public-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { FileText, User, Briefcase, Home, Users, Upload, CheckCircle, Loader2, ArrowLeft, ArrowRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

const applicationSchema = z.object({
  firstName: z.string().min(2, "First name is required"),
  lastName: z.string().min(2, "Last name is required"),
  email: z.string().email("Please enter a valid email"),
  phone: z.string().min(10, "Please enter a valid phone number"),
  dateOfBirth: z.string().min(1, "Date of birth is required"),
  ssn: z.string().optional(),
  currentAddress: z.string().min(5, "Current address is required"),
  currentCity: z.string().min(2, "City is required"),
  currentState: z.string().min(2, "State is required"),
  currentZip: z.string().min(5, "ZIP code is required"),
  employerName: z.string().min(2, "Employer name is required"),
  employerPhone: z.string().optional(),
  jobTitle: z.string().min(2, "Job title is required"),
  monthlyIncome: z.string().min(1, "Monthly income is required"),
  employmentLength: z.string().min(1, "Length of employment is required"),
  previousLandlord: z.string().optional(),
  previousLandlordPhone: z.string().optional(),
  reasonForLeaving: z.string().optional(),
  reference1Name: z.string().min(2, "Reference name is required"),
  reference1Phone: z.string().min(10, "Reference phone is required"),
  reference1Relationship: z.string().min(2, "Relationship is required"),
  reference2Name: z.string().optional(),
  reference2Phone: z.string().optional(),
  reference2Relationship: z.string().optional(),
  desiredMoveIn: z.string().min(1, "Desired move-in date is required"),
  desiredPropertyId: z.string().optional(),
  pets: z.string().optional(),
  additionalInfo: z.string().optional(),
});

type ApplicationFormData = z.infer<typeof applicationSchema>;

const steps = [
  { id: 1, title: "Personal Info", icon: User },
  { id: 2, title: "Employment", icon: Briefcase },
  { id: 3, title: "Rental History", icon: Home },
  { id: 4, title: "References", icon: Users },
  { id: 5, title: "Review", icon: FileText },
];

export default function Apply() {
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [applicationSubmitted, setApplicationSubmitted] = useState(false);
  const [applicationId, setApplicationId] = useState<string | null>(null);

  const form = useForm<ApplicationFormData>({
    resolver: zodResolver(applicationSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      dateOfBirth: "",
      ssn: "",
      currentAddress: "",
      currentCity: "",
      currentState: "",
      currentZip: "",
      employerName: "",
      employerPhone: "",
      jobTitle: "",
      monthlyIncome: "",
      employmentLength: "",
      previousLandlord: "",
      previousLandlordPhone: "",
      reasonForLeaving: "",
      reference1Name: "",
      reference1Phone: "",
      reference1Relationship: "",
      reference2Name: "",
      reference2Phone: "",
      reference2Relationship: "",
      desiredMoveIn: "",
      desiredPropertyId: "",
      pets: "",
      additionalInfo: "",
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: ApplicationFormData) => {
      const response = await apiRequest("POST", "/api/applications", {
        applicationData: data,
        status: "submitted",
      });
      return response;
    },
    onSuccess: (data: any) => {
      setApplicationSubmitted(true);
      setApplicationId(data.id);
      toast({
        title: "Application Submitted",
        description: "Your rental application has been received.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to submit application. Please try again.",
        variant: "destructive",
      });
    },
  });

  const nextStep = async () => {
    const fieldsToValidate = getFieldsForStep(currentStep);
    const isValid = await form.trigger(fieldsToValidate as any);
    if (isValid && currentStep < 5) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const getFieldsForStep = (step: number): string[] => {
    switch (step) {
      case 1:
        return ["firstName", "lastName", "email", "phone", "dateOfBirth", "currentAddress", "currentCity", "currentState", "currentZip"];
      case 2:
        return ["employerName", "jobTitle", "monthlyIncome", "employmentLength"];
      case 3:
        return [];
      case 4:
        return ["reference1Name", "reference1Phone", "reference1Relationship", "desiredMoveIn"];
      default:
        return [];
    }
  };

  const onSubmit = (data: ApplicationFormData) => {
    mutation.mutate({ ...data, monthlyIncome: data.monthlyIncome?.replace(/,/g, '') });
  };

  if (applicationSubmitted) {
    return (
      <PublicLayout>
        <div className="container mx-auto px-4 py-16 max-w-2xl">
          <Card className="text-center">
            <CardHeader className="pb-4">
              <div className="w-20 h-20 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="h-10 w-10 text-emerald-600 dark:text-emerald-400" />
              </div>
              <CardTitle className="text-2xl">Application Submitted!</CardTitle>
              <CardDescription>
                Your rental application has been received
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-muted rounded-lg p-6">
                <p className="text-sm text-muted-foreground mb-2">Application Reference</p>
                <p className="text-xl font-mono font-bold text-primary" data-testid="text-application-id">
                  {applicationId?.slice(0, 12)}
                </p>
              </div>
              <div className="text-sm text-muted-foreground space-y-2">
                <p>A confirmation email has been sent to your email address.</p>
                <p>Our team will review your application and contact you within 2-3 business days.</p>
                <p>You can log in to track your application status.</p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
                <a href="/api/login">
                  <Button>
                    Log In to Track Status
                  </Button>
                </a>
                <Button onClick={() => window.location.href = "/"} variant="outline">
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
      <div className="container mx-auto px-4 py-8 md:py-12 max-w-4xl">
        <div className="mb-4">
          <Button variant="ghost" size="sm" onClick={() => window.history.back()} data-testid="button-back">
            <ArrowLeft className="h-4 w-4 mr-1.5" />
            Back
          </Button>
        </div>
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-100 dark:bg-blue-900/30 mb-4">
            <FileText className="h-8 w-8 text-blue-600 dark:text-blue-400" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-2">Rental Application</h1>
          <p className="text-muted-foreground">
            Complete your application to find your next home
          </p>
        </div>

        <div className="mb-8">
          <div className="flex justify-between items-center mb-2">
            {steps.map((step) => (
              <div
                key={step.id}
                className={`flex flex-col items-center gap-1 flex-1 ${
                  step.id <= currentStep ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                    step.id < currentStep
                      ? "bg-primary text-primary-foreground"
                      : step.id === currentStep
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  }`}
                >
                  {step.id < currentStep ? (
                    <CheckCircle className="h-5 w-5" />
                  ) : (
                    <step.icon className="h-5 w-5" />
                  )}
                </div>
                <span className="text-xs hidden sm:block">{step.title}</span>
              </div>
            ))}
          </div>
          <Progress value={(currentStep / 5) * 100} className="h-2" />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{steps[currentStep - 1].title}</CardTitle>
            <CardDescription>
              Step {currentStep} of 5
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {currentStep === 1 && (
                  <div className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="firstName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>First Name *</FormLabel>
                            <FormControl>
                              <Input placeholder="John" {...field} data-testid="input-first-name" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="lastName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Last Name *</FormLabel>
                            <FormControl>
                              <Input placeholder="Doe" {...field} data-testid="input-last-name" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="grid md:grid-cols-2 gap-4">
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
                      <FormField
                        control={form.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Phone *</FormLabel>
                            <FormControl>
                              <Input type="tel" placeholder="(555) 123-4567" {...field} data-testid="input-phone" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <FormField
                      control={form.control}
                      name="dateOfBirth"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Date of Birth *</FormLabel>
                          <FormControl>
                            <Input type="text" placeholder="MM.DD.YYYY" {...field} value={isoToDisplay(field.value)} onChange={(e) => field.onChange(displayToIso(e.target.value))} data-testid="input-dob" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="currentAddress"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Current Address *</FormLabel>
                          <FormControl>
                            <Input placeholder="123 Current Street" {...field} data-testid="input-address" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="grid md:grid-cols-3 gap-4">
                      <FormField
                        control={form.control}
                        name="currentCity"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>City *</FormLabel>
                            <FormControl>
                              <Input placeholder="City" {...field} data-testid="input-city" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="currentState"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>State *</FormLabel>
                            <FormControl>
                              <Input placeholder="State" {...field} data-testid="input-state" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="currentZip"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>ZIP Code *</FormLabel>
                            <FormControl>
                              <Input placeholder="12345" {...field} data-testid="input-zip" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                )}

                {currentStep === 2 && (
                  <div className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="employerName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Employer Name *</FormLabel>
                            <FormControl>
                              <Input placeholder="Company Inc." {...field} data-testid="input-employer" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="employerPhone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Employer Phone</FormLabel>
                            <FormControl>
                              <Input type="tel" placeholder="(555) 123-4567" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <FormField
                      control={form.control}
                      name="jobTitle"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Job Title *</FormLabel>
                          <FormControl>
                            <Input placeholder="Software Engineer" {...field} data-testid="input-job-title" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="grid md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="monthlyIncome"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Monthly Income *</FormLabel>
                            <FormControl>
                              <Input type="text" inputMode="decimal" placeholder="5,000" {...field} onFocus={(e) => e.target.select()} data-testid="input-income" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="employmentLength"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Length of Employment *</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-employment-length">
                                  <SelectValue placeholder="Select duration" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="less_than_6_months">Less than 6 months</SelectItem>
                                <SelectItem value="6_months_to_1_year">6 months - 1 year</SelectItem>
                                <SelectItem value="1_to_2_years">1 - 2 years</SelectItem>
                                <SelectItem value="2_to_5_years">2 - 5 years</SelectItem>
                                <SelectItem value="more_than_5_years">More than 5 years</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                )}

                {currentStep === 3 && (
                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="previousLandlord"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Previous Landlord Name</FormLabel>
                          <FormControl>
                            <Input placeholder="John Smith" {...field} data-testid="input-landlord" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="previousLandlordPhone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Previous Landlord Phone</FormLabel>
                          <FormControl>
                            <Input type="tel" placeholder="(555) 123-4567" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="reasonForLeaving"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Reason for Leaving</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Please describe why you're moving from your current residence"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}

                {currentStep === 4 && (
                  <div className="space-y-6">
                    <div className="space-y-4">
                      <h3 className="font-medium">Reference 1 (Required)</h3>
                      <div className="grid md:grid-cols-3 gap-4">
                        <FormField
                          control={form.control}
                          name="reference1Name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Name *</FormLabel>
                              <FormControl>
                                <Input placeholder="Jane Doe" {...field} data-testid="input-ref1-name" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="reference1Phone"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Phone *</FormLabel>
                              <FormControl>
                                <Input type="tel" placeholder="(555) 123-4567" {...field} data-testid="input-ref1-phone" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="reference1Relationship"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Relationship *</FormLabel>
                              <FormControl>
                                <Input placeholder="Friend" {...field} data-testid="input-ref1-relationship" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h3 className="font-medium">Reference 2 (Optional)</h3>
                      <div className="grid md:grid-cols-3 gap-4">
                        <FormField
                          control={form.control}
                          name="reference2Name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Name</FormLabel>
                              <FormControl>
                                <Input placeholder="Bob Smith" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="reference2Phone"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Phone</FormLabel>
                              <FormControl>
                                <Input type="tel" placeholder="(555) 123-4567" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="reference2Relationship"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Relationship</FormLabel>
                              <FormControl>
                                <Input placeholder="Coworker" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>

                    <div className="space-y-4 pt-4 border-t">
                      <FormField
                        control={form.control}
                        name="desiredMoveIn"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Desired Move-In Date *</FormLabel>
                            <FormControl>
                              <Input type="text" placeholder="MM.DD.YYYY" {...field} value={isoToDisplay(field.value)} onChange={(e) => field.onChange(displayToIso(e.target.value))} data-testid="input-move-in" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="desiredPropertyId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Property ID (if known)</FormLabel>
                            <FormControl>
                              <Input placeholder="PROP-001" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="pets"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Pets</FormLabel>
                            <FormControl>
                              <Input placeholder="Dog, 2 years old, 30 lbs" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                )}

                {currentStep === 5 && (
                  <div className="space-y-6">
                    <div className="bg-muted/50 rounded-lg p-4 space-y-4">
                      <h3 className="font-medium">Personal Information</h3>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <span className="text-muted-foreground">Name:</span>
                        <span>{form.watch("firstName")} {form.watch("lastName")}</span>
                        <span className="text-muted-foreground">Email:</span>
                        <span>{form.watch("email")}</span>
                        <span className="text-muted-foreground">Phone:</span>
                        <span>{form.watch("phone")}</span>
                      </div>
                    </div>

                    <div className="bg-muted/50 rounded-lg p-4 space-y-4">
                      <h3 className="font-medium">Employment</h3>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <span className="text-muted-foreground">Employer:</span>
                        <span>{form.watch("employerName")}</span>
                        <span className="text-muted-foreground">Job Title:</span>
                        <span>{form.watch("jobTitle")}</span>
                        <span className="text-muted-foreground">Monthly Income:</span>
                        <span>${form.watch("monthlyIncome")}</span>
                      </div>
                    </div>

                    <div className="bg-muted/50 rounded-lg p-4 space-y-4">
                      <h3 className="font-medium">Move-In Details</h3>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <span className="text-muted-foreground">Desired Move-In:</span>
                        <span>{form.watch("desiredMoveIn")}</span>
                        {form.watch("desiredPropertyId") && (
                          <>
                            <span className="text-muted-foreground">Property ID:</span>
                            <span>{form.watch("desiredPropertyId")}</span>
                          </>
                        )}
                      </div>
                    </div>

                    <FormField
                      control={form.control}
                      name="additionalInfo"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Additional Information</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Any additional information you'd like us to know..."
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}

                <div className="flex justify-between pt-6 border-t">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={prevStep}
                    disabled={currentStep === 1}
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Previous
                  </Button>
                  
                  {currentStep < 5 ? (
                    <Button type="button" onClick={nextStep}>
                      Next
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  ) : (
                    <Button type="submit" disabled={mutation.isPending} data-testid="button-submit">
                      {mutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Submitting...
                        </>
                      ) : (
                        "Submit Application"
                      )}
                    </Button>
                  )}
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </PublicLayout>
  );
}
