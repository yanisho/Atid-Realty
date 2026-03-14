import { useState } from "react";
import { formatDate } from "@/lib/date-utils";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { PenTool, Check, CheckCircle } from "lucide-react";
import type { LeaseDocument } from "@shared/schema";

function TenantTypedSignature({ onSave, disabled, defaultName }: {
  onSave: (signature: string, name: string) => void;
  disabled?: boolean;
  defaultName?: string;
}) {
  const [signerName, setSignerName] = useState(defaultName || "");

  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium mb-1 block">Type Your Full Legal Name to Sign</label>
        <Input
          value={signerName}
          onChange={(e) => setSignerName(e.target.value)}
          placeholder="Enter your full legal name"
          disabled={disabled}
          data-testid="input-signer-name"
        />
      </div>
      {signerName.trim() && (
        <div>
          <label className="text-sm font-medium mb-1 block">Signature Preview</label>
          <div className="border rounded-md p-4 bg-white dark:bg-gray-950 min-h-[60px] flex items-center">
            <p
              className="text-3xl text-gray-900 dark:text-gray-100"
              style={{ fontFamily: "'Dancing Script', cursive" }}
              data-testid="text-signature-preview"
            >
              {signerName}
            </p>
          </div>
        </div>
      )}
      <Button
        onClick={() => onSave(signerName.trim(), signerName.trim())}
        disabled={!signerName.trim() || disabled}
        data-testid="button-submit-signature"
      >
        <PenTool className="h-4 w-4 mr-2" />
        Sign Lease
      </Button>
    </div>
  );
}

export default function SignLease() {
  const { toast } = useToast();
  const [, params] = useRoute("/sign-lease/:token");
  const token = params?.token;
  const [signed, setSigned] = useState(false);

  const { data: doc, isLoading, error } = useQuery<LeaseDocument>({
    queryKey: ["/api/lease-signing", token],
    enabled: !!token,
  });

  const signMutation = useMutation({
    mutationFn: async ({ signature, signedBy }: { signature: string; signedBy: string }) => {
      const res = await fetch(`/api/lease-signing/${token}/sign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signature, signedBy }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to sign");
      }
      return res.json();
    },
    onSuccess: () => {
      setSigned(true);
      toast({ title: "Lease signed successfully", description: "Thank you for signing your lease agreement." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Skeleton className="h-[600px] w-full max-w-3xl" />
      </div>
    );
  }

  if (error || !doc) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <p className="text-lg font-semibold mb-2">Lease Not Found</p>
            <p className="text-muted-foreground">This signing link may be invalid or expired. Please contact your property manager for a new link.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (signed || doc.tenantSignature === "signed") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center space-y-4">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
            <p className="text-lg font-semibold">Lease Signed</p>
            <p className="text-muted-foreground">
              {signed
                ? "Thank you! Your signature has been recorded. You may close this page."
                : "This lease has already been signed. Please contact your property manager if you have any questions."}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto p-4 md:p-8 space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Lease Agreement</h1>
          <p className="text-muted-foreground">Please review the lease below and sign at the bottom</p>
          <Badge variant="outline">
            {doc.landlordSignature === "signed" ? "Landlord has signed" : "Awaiting landlord signature"}
          </Badge>
        </div>

        <Card>
          <CardContent className="p-6 md:p-10">
            <div className="prose prose-sm dark:prose-invert max-w-none" data-testid="lease-document-content">
              <h2 className="text-center text-lg font-bold mb-6">RESIDENTIAL LEASE</h2>

              <p className="leading-relaxed">
                This Lease Agreement (this &ldquo;Lease&rdquo;) is dated{" "}
                <strong>{doc.leaseDate || "_______________"}</strong>{" "}
                by and between <strong>{doc.landlordName || "_______________"}</strong> (&ldquo;Landlord&rdquo;), and{" "}
                <strong>{doc.tenantNames || "_______________"}</strong> (&ldquo;Tenant/s&rdquo;). The parties agree as follows:
              </p>

              <p className="leading-relaxed mt-4">
                <strong>Premises Lease Term & Address:</strong> Landlord leases to Tenant the property known as the (&ldquo;Premises&rdquo;) located at:{" "}
                <strong>{doc.premisesAddress || "_______________"}</strong>{" "}
                for the term of <strong>{doc.leaseTerm || "_______________"}</strong>
              </p>

              <p className="leading-relaxed">
                commencing on: <strong>{doc.commencingDate || "_______________"}</strong>{" "}
                and ending on <strong>{doc.endingDate || "_______________"}</strong>.
              </p>

              <p className="leading-relaxed mt-4">
                <strong>1. Option to Renew:</strong> Tenant must notify Landlord in writing at least sixty (60) days prior to this lease termination date of Tenant&apos;s desire or non-desire to renew this lease or vacate the Premises.
              </p>

              <p className="leading-relaxed mt-4">
                <strong>2. Rent:</strong> Tenant agrees to pay the rent in the monthly amount of{" "}
                <strong>{doc.monthlyRent || "_______________"}</strong>, and any Additional Rent, without notice or deduction, by the 1st day of each and every month.
              </p>

              <p className="leading-relaxed mt-4">
                <strong>3. Late Fee:</strong> Tenant shall pay a late charge in the amount of{" "}
                <strong>{doc.lateFeePercent || "5"}%</strong> of the monthly rent for each rent payment received more than five (5) days after the day it is due.
              </p>

              <p className="leading-relaxed mt-4">
                <strong>4. Money Due Prior To Tenant&apos;s Occupancy:</strong>
              </p>
              <ul className="list-none space-y-1 ml-4">
                <li>First Month&apos;s Rent: <strong>{doc.firstMonthRent || "_______________"}</strong></li>
                <li>Last Month&apos;s Rent (partial): <strong>{doc.lastMonthRent || "_______________"}</strong></li>
                <li>Security Deposit: <strong>{doc.securityDeposit || "_______________"}</strong></li>
              </ul>

              <p className="leading-relaxed mt-4">
                <strong>5. Security Deposit:</strong> Tenant shall deliver to Landlord the sum of{" "}
                <strong>{doc.securityDeposit || "_______________"}</strong> as a security deposit. Tenant shall not use the Security Deposit as rent.
              </p>

              <p className="leading-relaxed mt-4">
                <strong>6. Occupancy / Assignment &amp; Sublet:</strong> The Premises shall be occupied only by Tenant and Tenant&apos;s immediate family for residential purposes only. The Premises may not be used for illegal, immoral, or improper purposes. Tenant shall not assign the Lease, or sublet the Premises or any part thereof without the prior written consent of Landlord.
              </p>

              <p className="leading-relaxed mt-4">
                <strong>7. Repairs:</strong> Tenant shall take good care of the Premises and Landlord&apos;s appliances and furnishings therein, and shall maintain them in good order and condition, ordinary wear and tear excepted. Landlord may repair, at the expense of Tenant, all damage or injury to the Premises resulting from the misuse or negligence of Tenant. All repairs have Tenant&apos;s Co-Pay as stated in section 19 and 20 of this lease.
              </p>

              <p className="leading-relaxed mt-4">
                <strong>8. Obligations of Tenant:</strong> (a) Tenant shall be responsible for all conditions created or caused by the negligent or wrongful act or omission of Tenant. Landlord strongly recommends that Tenant obtain a personal property insurance policy. (b) Tenant shall comply with all present and future laws, regulations, and condominium or HOA Rules and Regulations. (c) Tenant shall not destroy, deface, damage or remove any part of the Premises, commit waste, park in unauthorized areas, or make changes without Landlord&apos;s consent.
              </p>

              {doc.noPets && (
                <p className="leading-relaxed mt-4">
                  <strong>9. No Pets:</strong> No dogs or animals of any kind shall be kept in or about or on the Premises. Any violation by Tenant of this provision shall be deemed a breach of a material provision of the Lease and Landlord may elect to terminate this Lease based upon such violation.
                </p>
              )}

              {doc.noSmoking && (
                <p className="leading-relaxed mt-4">
                  <strong>10. No Smoking:</strong> Tenant shall not smoke nor permit any of Tenant&apos;s guests, invitees, service personal, or licensees to smoke anywhere in or about or on the Premises.
                </p>
              )}

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
                <strong>17.1</strong> Tenant agrees and represents to landlord that tenant will obtain liability and personal property coverage for the rented property for the minimal amount of <strong>{doc.insuranceMinimum || "$300,000.00"}</strong>. The liability coverage will insure personal property and personal injury of tenant and any guests of tenant. Tenant agrees landlord is not liable and holds landlord harmless for any personal injury which takes place on the subject property resulting from tenant&apos;s negligence, intoxication, willful misconduct, or failure to follow safety protocols.
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

              {doc.acFilterCheckbox && (
                <p className="leading-relaxed mt-4">
                  <strong>18.7</strong> Tenant is responsible for replacing the A/C filter every month. Tenant will be responsible for A/C repairs caused by not replacing the air filter on a monthly basis.
                </p>
              )}

              <p className="leading-relaxed mt-4">
                <strong>19.</strong> Tenant agrees and represents to landlord that tenant will be responsible for the first <strong>{doc.repairCopay || "$250"}</strong> of the cost of any and all repairs needed in the house, even if it is the Owner&apos;s responsibility, during the terms of the lease.
              </p>

              <p className="leading-relaxed mt-4">
                <strong>20.</strong> The following items have been provided to Tenant in good working order and condition and are the Tenant&apos;s responsibility to repair:
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
                <strong>20.2</strong> Tenant agrees to not flush ANYTHING into the toilet except toilet paper or bodily waste.
              </p>

              <p className="leading-relaxed mt-4">
                <strong>20.4</strong> Tenant agrees to not discarding food scraping into kitchen drain &amp; or garbage disposal.
              </p>

              <p className="leading-relaxed mt-4">
                <strong>21.</strong> In order to prevent molding and/or any other damage caused by Florida humidity, the tenant has been instructed to set the Air Conditioning to AUTO at 77 degrees Fahrenheit or cooler at all times even when the apartment is vacant. The tenant has agreed to this term.
              </p>

              <p className="leading-relaxed mt-4">
                <strong>21.A</strong> In the event of mold or any other health hazard and/or risk to tenant, tenant will have to vacate the premises immediately at tenant&apos;s expense, and allow to break the lease with no penalty to Tenant.
              </p>

              <p className="leading-relaxed mt-6 font-semibold text-center">
                IN WITNESS WHEREOF, the parties have executed the Lease as of the day and year first above written.
              </p>

              <div className="mt-8 border-t pt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <h4 className="font-semibold text-sm">TENANT(S):</h4>
                    <div className="border-b pb-2">
                      <p className="text-xs text-muted-foreground">Signature</p>
                      {doc.tenantSignature ? (
                        doc.tenantSignature !== "signed" ? (
                          doc.tenantSignature.startsWith("data:") ? (
                            <img src={doc.tenantSignature} alt="Tenant Signature" className="max-h-16" />
                          ) : (
                            <p className="text-2xl text-foreground" style={{ fontFamily: "'Dancing Script', cursive" }}>{doc.tenantSignature}</p>
                          )
                        ) : (
                          <Badge variant="outline"><Check className="h-3 w-3 mr-1" /> Signed</Badge>
                        )
                      ) : (
                        <p className="text-sm text-muted-foreground italic">Awaiting signature below</p>
                      )}
                    </div>
                    <div className="border-b pb-2">
                      <p className="text-xs text-muted-foreground">Print Name</p>
                      <p className="text-sm font-medium">{doc.tenantNames || "_______________"}</p>
                    </div>
                    {doc.tenantPhone && (
                      <div className="border-b pb-2">
                        <p className="text-xs text-muted-foreground">Cell Phone Number</p>
                        <p className="text-sm">{doc.tenantPhone}</p>
                      </div>
                    )}
                    {doc.tenantEmail && (
                      <div className="border-b pb-2">
                        <p className="text-xs text-muted-foreground">E-Mail</p>
                        <p className="text-sm">{doc.tenantEmail}</p>
                      </div>
                    )}
                  </div>

                  <div className="space-y-3">
                    <h4 className="font-semibold text-sm">LANDLORD:</h4>
                    <div className="border-b pb-2">
                      <p className="text-xs text-muted-foreground">Signature</p>
                      {doc.landlordSignature ? (
                        doc.landlordSignature !== "signed" ? (
                          doc.landlordSignature.startsWith("data:") ? (
                            <img src={doc.landlordSignature} alt="Landlord Signature" className="max-h-16" />
                          ) : (
                            <p className="text-2xl text-foreground" style={{ fontFamily: "'Dancing Script', cursive" }}>{doc.landlordSignature}</p>
                          )
                        ) : (
                          <Badge variant="outline"><Check className="h-3 w-3 mr-1" /> Signed</Badge>
                        )
                      ) : (
                        <p className="text-sm text-muted-foreground italic">Awaiting signature</p>
                      )}
                      {doc.landlordSignedAt && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Signed by {doc.landlordSignedBy || "Landlord"} on {formatDate(doc.landlordSignedAt)}
                        </p>
                      )}
                    </div>
                    <div className="border-b pb-2">
                      <p className="text-xs text-muted-foreground">Print Name</p>
                      <p className="text-sm font-medium" data-testid="text-landlord-print-name">Yanni Sabag</p>
                    </div>
                    <div className="border-b pb-2">
                      <p className="text-xs text-muted-foreground">Phone Number</p>
                      <p className="text-sm" data-testid="text-landlord-phone">954-338-3885</p>
                    </div>
                    <div className="border-b pb-2">
                      <p className="text-xs text-muted-foreground">E-Mail</p>
                      <p className="text-sm" data-testid="text-landlord-email">info@atidrealty.com</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Sign This Lease</CardTitle>
          </CardHeader>
          <CardContent>
            <TenantTypedSignature
              onSave={(sig, name) => signMutation.mutate({ signature: sig, signedBy: name })}
              disabled={signMutation.isPending}
              defaultName={doc?.tenantNames || ""}
            />
            {signMutation.isPending && (
              <p className="text-sm text-muted-foreground mt-2">Submitting your signature...</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}