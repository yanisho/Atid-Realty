import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "wouter";
import { PublicLayout } from "@/components/layout/public-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Building2, MapPin, Home, CreditCard, Wrench, FileText, LogIn, ArrowLeft, BedDouble, Bath, Image } from "lucide-react";
import type { PublicProperty } from "@shared/schema";

export default function PropertyPage() {
  const { propertyCode } = useParams<{ propertyCode: string }>();

  const { data: property, isLoading, error } = useQuery<PublicProperty>({
    queryKey: ["/api/public/properties", propertyCode],
    enabled: !!propertyCode,
  });

  if (isLoading) {
    return (
      <PublicLayout>
        <div className="container mx-auto px-4 py-12 max-w-4xl">
          <Skeleton className="h-8 w-48 mb-4" />
          <Skeleton className="h-64 w-full mb-6" />
          <div className="grid md:grid-cols-2 gap-4">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
        </div>
      </PublicLayout>
    );
  }

  if (error || !property) {
    return (
      <PublicLayout>
        <div className="container mx-auto px-4 py-16 max-w-2xl text-center">
          <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mx-auto mb-6">
            <Building2 className="h-10 w-10 text-muted-foreground" />
          </div>
          <h1 className="text-2xl font-bold mb-2" data-testid="text-property-not-found">Property Not Found</h1>
          <p className="text-muted-foreground mb-6">
            We couldn't find a property with ID "{propertyCode}". Please check the ID and try again.
          </p>
          <Link href="/">
            <Button data-testid="button-back-home">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Home
            </Button>
          </Link>
        </div>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout>
      <div className="container mx-auto px-4 py-8 md:py-12 max-w-4xl">
        <Link href="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Home
        </Link>

        <div className="space-y-8">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Badge variant={property.isAvailable ? "default" : "secondary"} data-testid="badge-availability">
                  {property.isAvailable ? "Available" : "Unavailable"}
                </Badge>
                <span className="text-sm text-muted-foreground font-mono" data-testid="text-property-id">
                  ID: {property.propertyId}
                </span>
              </div>
              <h1 className="text-3xl font-bold mb-2" data-testid="text-property-address">{property.address}</h1>
              {property.unitNumber && (
                <p className="text-lg text-muted-foreground mb-2" data-testid="text-unit-number">
                  Unit {property.unitNumber}
                </p>
              )}
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="h-4 w-4" />
                <span>Property ID: {property.propertyId}</span>
              </div>
            </div>
          </div>

          {property.images && property.images.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {property.images.map((imageUrl, index) => (
                <div key={index} className="aspect-video bg-muted rounded-lg overflow-hidden">
                  <img
                    src={imageUrl}
                    alt={`Property image ${index + 1}`}
                    className="w-full h-full object-cover"
                    data-testid={`img-property-${index}`}
                    loading="lazy"
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="aspect-video bg-gradient-to-br from-primary/10 to-accent/10 rounded-lg flex flex-col items-center justify-center">
              <Building2 className="h-24 w-24 text-muted-foreground/30 mb-4" />
              <div className="flex items-center gap-2 text-muted-foreground">
                <Image className="h-5 w-5" />
                <span>No photos available</span>
              </div>
            </div>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Property Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                    <BedDouble className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold" data-testid="text-bedrooms">{property.bedrooms || 0}</p>
                    <p className="text-sm text-muted-foreground">Bedrooms</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                    <Bath className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold" data-testid="text-bathrooms">{property.bathrooms || 0}</p>
                    <p className="text-sm text-muted-foreground">Bathrooms</p>
                  </div>
                </div>
                {property.monthlyRent && (
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                      <CreditCard className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold" data-testid="text-rent">${parseFloat(property.monthlyRent).toLocaleString()}</p>
                      <p className="text-sm text-muted-foreground">Per Month</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {property.description && (
            <Card>
              <CardHeader>
                <CardTitle>About This Property</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground" data-testid="text-description">{property.description}</p>
              </CardContent>
            </Card>
          )}

          {property.amenities && property.amenities.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Amenities</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {property.amenities.map((amenity, index) => (
                    <Badge key={index} variant="outline" data-testid={`badge-amenity-${index}`}>
                      {amenity}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="bg-primary/5 border-primary/20">
            <CardHeader>
              <CardTitle>Interested in this property?</CardTitle>
              <CardDescription>
                Take the next step towards your new home
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Link href="/apply">
                  <Card className="h-full hover-elevate cursor-pointer">
                    <CardContent className="p-6 flex flex-col items-center text-center">
                      <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mb-3">
                        <FileText className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                      </div>
                      <h3 className="font-medium">Apply Now</h3>
                      <p className="text-sm text-muted-foreground">Submit application</p>
                    </CardContent>
                  </Card>
                </Link>

                <Link href="/pay">
                  <Card className="h-full hover-elevate cursor-pointer">
                    <CardContent className="p-6 flex flex-col items-center text-center">
                      <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mb-3">
                        <CreditCard className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <h3 className="font-medium">Pay Rent</h3>
                      <p className="text-sm text-muted-foreground">Make a payment</p>
                    </CardContent>
                  </Card>
                </Link>

                <Link href="/maintenance">
                  <Card className="h-full hover-elevate cursor-pointer">
                    <CardContent className="p-6 flex flex-col items-center text-center">
                      <div className="w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mb-3">
                        <Wrench className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                      </div>
                      <h3 className="font-medium">Maintenance</h3>
                      <p className="text-sm text-muted-foreground">Request repairs</p>
                    </CardContent>
                  </Card>
                </Link>

                <a href="/api/login">
                  <Card className="h-full hover-elevate cursor-pointer">
                    <CardContent className="p-6 flex flex-col items-center text-center">
                      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
                        <LogIn className="h-6 w-6 text-primary" />
                      </div>
                      <h3 className="font-medium">Tenant Login</h3>
                      <p className="text-sm text-muted-foreground">Access portal</p>
                    </CardContent>
                  </Card>
                </a>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </PublicLayout>
  );
}
