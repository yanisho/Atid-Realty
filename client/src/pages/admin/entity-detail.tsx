import { useQuery } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Briefcase, Building2, CreditCard, DollarSign, Mail, Phone, MapPin, User } from "lucide-react";
import type { Entity } from "@shared/schema";

interface Property {
  id: string;
  propertyCode: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  type: string | null;
  status: string | null;
  bedrooms: number | null;
  bathrooms: string | null;
}

function getTypeLabel(type: string | null | undefined) {
  switch (type) {
    case "llc": return "LLC";
    case "corporation": return "Corporation";
    case "partnership": return "Partnership";
    case "individual": return "Individual";
    case "trust": return "Trust";
    default: return type || "Unknown";
  }
}

export default function EntityDetail() {
  const [, params] = useRoute("/admin/entities/:id");
  const entityId = params?.id;

  const { data: entity, isLoading: entityLoading } = useQuery<Entity>({
    queryKey: ["/api/admin/entities", entityId],
    enabled: !!entityId,
  });

  const { data: properties, isLoading: propertiesLoading } = useQuery<Property[]>({
    queryKey: ["/api/admin/entities", entityId, "properties"],
    enabled: !!entityId,
  });

  if (entityLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!entity) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <p className="text-muted-foreground">Entity not found</p>
          <Link href="/admin/entities">
            <Button variant="outline" className="mt-4" data-testid="link-back-entities">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Landlords
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4 flex-wrap">
        <Link href="/admin/entities">
          <Button variant="ghost" size="icon" data-testid="button-back">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
            <Briefcase className="h-6 w-6 text-muted-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-entity-name">{entity.name}</h1>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <Badge variant="outline" data-testid="badge-entity-type">{getTypeLabel(entity.type)}</Badge>
              {entity.paymentEnabled ? (
                <Badge className="bg-green-500/10 text-green-600 border-green-500/20" data-testid="badge-payment-status">
                  <CreditCard className="h-3 w-3 mr-1" />
                  Payments Connected
                </Badge>
              ) : (
                <Badge variant="secondary" data-testid="badge-payment-status">
                  Payments Not Connected
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Briefcase className="h-4 w-4" />
              Entity Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {entity.taxId && (
              <div className="flex items-start gap-3">
                <span className="text-sm text-muted-foreground w-24 shrink-0">Tax ID / EIN</span>
                <span className="text-sm font-medium" data-testid="text-tax-id">{entity.taxId}</span>
              </div>
            )}
            {entity.type && (
              <div className="flex items-start gap-3">
                <span className="text-sm text-muted-foreground w-24 shrink-0">Type</span>
                <span className="text-sm font-medium">{getTypeLabel(entity.type)}</span>
              </div>
            )}
            {(entity.address || entity.city || entity.state || entity.zip) && (
              <div className="flex items-start gap-3">
                <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <div className="text-sm" data-testid="text-address">
                  {entity.address && <p>{entity.address}</p>}
                  <p>
                    {[entity.city, entity.state].filter(Boolean).join(", ")}
                    {entity.zip ? ` ${entity.zip}` : ""}
                  </p>
                </div>
              </div>
            )}
            {entity.stripeAccountId && (
              <div className="flex items-start gap-3">
                <CreditCard className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <div className="text-sm">
                  <p className="text-muted-foreground">Stripe Account</p>
                  <p className="font-mono text-xs" data-testid="text-stripe-id">{entity.stripeAccountId}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <User className="h-4 w-4" />
              Contact Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {(entity.contactName || entity.contactEmail || entity.contactPhone || entity.zelleInfo) ? (
              <>
                {entity.contactName && (
                  <div className="flex items-center gap-3">
                    <User className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="text-sm font-medium" data-testid="text-contact-name">{entity.contactName}</span>
                  </div>
                )}
                {entity.contactEmail && (
                  <div className="flex items-center gap-3">
                    <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                    <a href={`mailto:${entity.contactEmail}`} className="text-sm text-primary hover:underline" data-testid="text-contact-email">
                      {entity.contactEmail}
                    </a>
                  </div>
                )}
                {entity.contactPhone && (
                  <div className="flex items-center gap-3">
                    <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                    <a href={`tel:${entity.contactPhone}`} className="text-sm text-primary hover:underline" data-testid="text-contact-phone">
                      {entity.contactPhone}
                    </a>
                  </div>
                )}
                {entity.zelleInfo && (
                  <div className="flex items-center gap-3">
                    <DollarSign className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">Zelle</p>
                      <span className="text-sm font-medium" data-testid="text-zelle-info">{entity.zelleInfo}</span>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <p className="text-sm text-muted-foreground">No contact information provided</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Properties ({properties?.length || 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {propertiesLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : properties && properties.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Property</TableHead>
                    <TableHead>Address</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {properties.map((property) => (
                    <TableRow key={property.id} data-testid={`property-row-${property.id}`}>
                      <TableCell>
                        <Link href={`/admin/properties/${property.id}`}>
                          <span className="text-sm font-medium text-primary cursor-pointer" data-testid={`link-property-${property.id}`}>
                            {property.name}
                          </span>
                        </Link>
                        <p className="text-xs text-muted-foreground">{property.propertyCode}</p>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm">{property.address}</p>
                        <p className="text-xs text-muted-foreground">
                          {property.city}, {property.state} {property.zip}
                        </p>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{property.type || "House"}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={property.status === "active" ? "default" : "secondary"}>
                          {property.status || "Active"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-6">No properties assigned to this entity</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
