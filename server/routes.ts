import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { db } from "./db";
import { setupAuth, isAuthenticated, registerAuthRoutes } from "./replit_integrations/auth";
import { registerObjectStorageRoutes, ObjectStorageService } from "./replit_integrations/object_storage";
import { insertMaintenanceRequestSchema, insertApplicationSchema, insertPaymentSchema, insertPropertySchema, insertEntitySchema, insertTenantSchema, insertLeaseSchema, insertExpenseSchema, rentCharges, leases, suppressedRentCharges } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { sendTenantInviteEmail, sendLeaseEmail, sendMaintenanceNotificationEmail } from "./email";
import crypto from "crypto";
import multer from "multer";
import * as XLSX from "xlsx";
import fs from "fs";
import path from "path";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import mammoth from "mammoth";

const objectStorageService = new ObjectStorageService();

const JWT_SECRET = process.env.SESSION_SECRET || process.env.JWT_SECRET || "atid-admin-jwt-secret-key";

function generateAdminToken(adminUserId: string): string {
  return jwt.sign({ adminUserId }, JWT_SECRET, { expiresIn: "7d" });
}

function getAdminUserIdFromRequest(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    try {
      const token = authHeader.substring(7);
      const decoded = jwt.verify(token, JWT_SECRET) as { adminUserId: string };
      return decoded.adminUserId;
    } catch {
      return null;
    }
  }
  const queryToken = req.query.token as string | undefined;
  if (queryToken) {
    try {
      const decoded = jwt.verify(queryToken, JWT_SECRET) as { adminUserId: string };
      return decoded.adminUserId;
    } catch {
      return null;
    }
  }
  const sessionUserId = (req.session as any)?.adminUserId;
  if (sessionUserId) return sessionUserId;
  return null;
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function generateSignedLeaseHtml(doc: any): string {
  const formatSigDate = (d: any) => d ? new Date(d).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : "N/A";
  const e = (val: any, fallback = "N/A") => escapeHtml(String(val || fallback));
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Signed Lease Agreement</title>
<style>
  body { font-family: Georgia, 'Times New Roman', serif; max-width: 800px; margin: 0 auto; padding: 40px; line-height: 1.6; color: #333; }
  h1 { text-align: center; font-size: 22px; margin-bottom: 30px; }
  .section { margin-bottom: 20px; }
  .field { margin: 4px 0; }
  .label { font-weight: bold; color: #555; }
  .signature-block { margin-top: 40px; padding: 20px; border-top: 2px solid #333; }
  .signature { font-family: 'Dancing Script', cursive, 'Brush Script MT', 'Segoe Script', cursive; font-size: 28px; color: #1a1a1a; }
  .sig-line { border-bottom: 1px solid #333; display: inline-block; min-width: 200px; margin-bottom: 4px; }
  .signed-badge { display: inline-block; background: #22c55e; color: white; padding: 4px 12px; border-radius: 4px; font-size: 12px; font-weight: bold; margin-bottom: 20px; }
  .header { text-align: center; margin-bottom: 30px; }
  .header p { color: #666; font-size: 14px; }
  @media print { body { padding: 20px; } }
</style></head><body>
<div class="header">
  <h1>RESIDENTIAL LEASE AGREEMENT</h1>
  <span class="signed-badge">FULLY EXECUTED</span>
  <p>This document was digitally signed by all parties</p>
</div>
<div class="section">
  <div class="field"><span class="label">Date:</span> ${e(doc.leaseDate)}</div>
  <div class="field"><span class="label">Landlord:</span> ${e(doc.landlordName)}</div>
  <div class="field"><span class="label">Tenant(s):</span> ${e(doc.tenantNames)}</div>
  <div class="field"><span class="label">Premises:</span> ${e(doc.premisesAddress)}</div>
</div>
<div class="section">
  <div class="field"><span class="label">Lease Term:</span> ${e(doc.leaseTerm)}</div>
  <div class="field"><span class="label">Commencing:</span> ${e(doc.commencingDate)}</div>
  <div class="field"><span class="label">Ending:</span> ${e(doc.endingDate)}</div>
</div>
<div class="section">
  <div class="field"><span class="label">Monthly Rent:</span> ${e(doc.monthlyRent)}</div>
  <div class="field"><span class="label">Security Deposit:</span> ${e(doc.securityDeposit)}</div>
  <div class="field"><span class="label">First Month's Rent:</span> ${e(doc.firstMonthRent)}</div>
  <div class="field"><span class="label">Last Month's Rent:</span> ${e(doc.lastMonthRent)}</div>
  <div class="field"><span class="label">Late Fee:</span> ${e(doc.lateFeePercent, "5")}%</div>
</div>
<div class="section">
  <div class="field"><span class="label">Pets:</span> ${doc.noPets ? "No pets allowed" : "Pets allowed"}</div>
  <div class="field"><span class="label">Smoking:</span> ${doc.noSmoking ? "No smoking" : "Smoking allowed"}</div>
  <div class="field"><span class="label">Insurance Minimum:</span> ${e(doc.insuranceMinimum)}</div>
</div>
<div class="signature-block">
  <h3>Landlord Signature</h3>
  <div class="sig-line"><span class="signature">${e(doc.landlordSignature, "")}</span></div>
  <div class="field"><span class="label">Signed by:</span> ${e(doc.landlordSignedBy)}</div>
  <div class="field"><span class="label">Date:</span> ${formatSigDate(doc.landlordSignedAt)}</div>
  <div class="field"><span class="label">Print Name:</span> Yanny Sabag</div>
  <div class="field"><span class="label">Phone:</span> 954-338-3885</div>
  <div class="field"><span class="label">Email:</span> info@atidrealty.com</div>
</div>
<div class="signature-block">
  <h3>Tenant Signature</h3>
  <div class="sig-line"><span class="signature">${e(doc.tenantSignature, "")}</span></div>
  <div class="field"><span class="label">Signed by:</span> ${e(doc.tenantSignedBy)}</div>
  <div class="field"><span class="label">Date:</span> ${formatSigDate(doc.tenantSignedAt)}</div>
  ${doc.tenantPhone ? `<div class="field"><span class="label">Phone:</span> ${e(doc.tenantPhone)}</div>` : ""}
  ${doc.tenantEmail ? `<div class="field"><span class="label">Email:</span> ${e(doc.tenantEmail)}</div>` : ""}
</div>
<div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; text-align: center; color: #888; font-size: 12px;">
  <p>This lease agreement was executed digitally through ATID Property Management.</p>
</div>
</body></html>`;
}

// Role-based access middleware
async function requireRole(...allowedRoles: string[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const userId = (req as any).user?.claims?.sub;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const profile = await storage.getUserProfile(userId);
    const userRole = profile?.role || "TENANT";

    if (!allowedRoles.includes(userRole) && !allowedRoles.includes("ADMIN")) {
      // Admins have access to everything
      if (userRole !== "ADMIN" && !allowedRoles.includes(userRole)) {
        return res.status(403).json({ error: "Forbidden - insufficient permissions" });
      }
    }

    next();
  };
}

// Simplified admin check middleware
const isAdmin = async (req: Request, res: Response, next: NextFunction) => {
  const userId = (req as any).user?.claims?.sub;
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const profile = await storage.getUserProfile(userId);
  const userRole = profile?.role || "TENANT";
  const adminRoles = ["ADMIN", "MANAGER"];

  if (!adminRoles.includes(userRole)) {
    return res.status(403).json({ error: "Forbidden - admin access required" });
  }

  next();
};

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Setup authentication first
  await setupAuth(app);
  registerAuthRoutes(app);
  registerObjectStorageRoutes(app);

  // Health check with version - BUILD: 20260205-0455
  app.get("/api/health", async (req, res) => {
    try {
      const adminUser = await storage.getAdminUserByEmail("info@atidrealty.com");
      const dbUrl = process.env.DATABASE_URL;
      const dbHost = dbUrl ? new URL(dbUrl).hostname : "unknown";
      res.json({ 
        status: "ok", 
        build: "20260205-0455", 
        nodeEnv: process.env.NODE_ENV,
        dbHost: dbHost,
        dbConnected: true,
        adminUserFound: !!adminUser,
        adminUserId: adminUser?.id || null,
        passwordHashLength: adminUser?.password?.length || 0
      });
    } catch (err: any) {
      res.json({ 
        status: "error", 
        build: "20260205-0455", 
        nodeEnv: process.env.NODE_ENV,
        dbConnected: false,
        error: err.message 
      });
    }
  });

  // Export all data for migration
  app.get("/api/admin/export-data", async (req, res) => {
    try {
      const entities = await storage.getEntities();
      const properties = await storage.getProperties();
      const tenants = await storage.getTenants();
      const leases = await storage.getLeases();
      
      res.json({
        entities,
        properties,
        tenants,
        leases,
        exportedAt: new Date().toISOString()
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Import data for migration
  app.post("/api/admin/import-data", async (req, res) => {
    try {
      const { entities, properties, tenants, leases } = req.body;
      let imported = { entities: 0, properties: 0, tenants: 0, leases: 0 };
      let errors: string[] = [];
      
      // Import entities (without id, let DB generate)
      for (const entity of entities || []) {
        try {
          await storage.createEntity({
            name: entity.name,
            email: entity.email,
            phone: entity.phone,
            address: entity.address,
            stripeAccountId: entity.stripeAccountId,
            stripeOnboardingComplete: entity.stripeOnboardingComplete,
          });
          imported.entities++;
        } catch (e: any) { 
          errors.push(`Entity ${entity.name}: ${e.message}`);
        }
      }
      
      // Get newly created entities to map old IDs to new IDs
      const newEntities = await storage.getEntities();
      const entityMap: Record<string, string> = {};
      for (let i = 0; i < (entities || []).length; i++) {
        if (newEntities[i]) {
          entityMap[entities[i].id] = newEntities[newEntities.length - 1 - i]?.id || entities[i].id;
        }
      }
      
      // Import properties (without id)
      for (const property of properties || []) {
        try {
          await storage.createProperty({
            entityId: property.entityId,
            name: property.name,
            address: property.address,
            city: property.city,
            state: property.state,
            zip: property.zip || "00000",
            type: property.type,
            bedrooms: property.bedrooms,
            bathrooms: property.bathrooms,
            sqft: property.sqft,
            status: property.status,
            propertyCode: property.propertyCode,
            imageUrl: property.imageUrl,
          });
          imported.properties++;
        } catch (e: any) { 
          errors.push(`Property ${property.name}: ${e.message}`);
        }
      }
      
      // Get new properties for mapping
      const newProperties = await storage.getProperties();
      const propertyMap: Record<string, string> = {};
      for (const prop of properties || []) {
        const found = newProperties.find(p => p.propertyCode === prop.propertyCode);
        if (found) propertyMap[prop.id] = found.id;
      }
      
      // Import tenants (without id, map propertyId)
      for (const tenant of tenants || []) {
        try {
          const mappedPropertyId = propertyMap[tenant.propertyId] || tenant.propertyId;
          await storage.createTenant({
            firstName: tenant.firstName,
            lastName: tenant.lastName,
            email: tenant.email,
            phone: tenant.phone,
            propertyId: mappedPropertyId,
            unitNumber: tenant.unitNumber,
            moveInDate: tenant.moveInDate ? new Date(tenant.moveInDate) : null,
            leaseEndDate: tenant.leaseEndDate ? new Date(tenant.leaseEndDate) : null,
            rentAmount: tenant.rentAmount,
            status: tenant.status,
            inviteToken: tenant.inviteToken,
            inviteTokenExpiry: tenant.inviteTokenExpiry ? new Date(tenant.inviteTokenExpiry) : null,
            replitUserId: tenant.replitUserId,
          });
          imported.tenants++;
        } catch (e: any) { 
          errors.push(`Tenant ${tenant.firstName} ${tenant.lastName}: ${e.message}`);
        }
      }
      
      // Get new tenants for mapping
      const newTenants = await storage.getTenants();
      const tenantMap: Record<string, string> = {};
      for (const t of tenants || []) {
        const found = newTenants.find(nt => nt.email === t.email);
        if (found) tenantMap[t.id] = found.id;
      }
      
      // Import leases (without id, map tenantId and propertyId)
      for (const lease of leases || []) {
        try {
          const mappedTenantId = tenantMap[lease.tenantId] || lease.tenantId;
          const mappedPropertyId = propertyMap[lease.propertyId] || lease.propertyId;
          await storage.createLease({
            tenantId: mappedTenantId,
            propertyId: mappedPropertyId,
            unitNumber: lease.unitNumber,
            startDate: lease.startDate ? new Date(lease.startDate) : new Date(),
            endDate: lease.endDate ? new Date(lease.endDate) : new Date(),
            rentAmount: lease.rentAmount,
            securityDeposit: lease.securityDeposit,
            status: lease.status,
            documentUrl: lease.documentUrl,
          });
          imported.leases++;
        } catch (e: any) { 
          errors.push(`Lease: ${e.message}`);
        }
      }
      
      res.json({ message: "Data imported", imported, errorCount: errors.length, sampleErrors: errors.slice(0, 5) });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Initialize admin user if it doesn't exist (for production setup)
  app.post("/api/admin/init", async (req, res) => {
    try {
      const existingAdmin = await storage.getAdminUserByEmail("info@atidrealty.com");
      if (existingAdmin) {
        return res.json({ message: "Admin user already exists", exists: true });
      }
      
      const hashedPassword = await bcrypt.hash("Admin123", 10);
      const adminUser = await storage.createAdminUser({
        email: "info@atidrealty.com",
        password: hashedPassword,
        firstName: "Yanni",
        lastName: "Sabag",
        role: "ADMIN",
        status: "active",
        mustChangePassword: false,
      });
      
      res.json({ 
        message: "Admin user created successfully", 
        created: true,
        userId: adminUser.id
      });
    } catch (err: any) {
      console.error("Admin init error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // ========== ADMIN USERNAME/PASSWORD AUTHENTICATION ==========
  
  // Admin login with email/password
  app.post("/api/admin/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      
      console.log("[ADMIN LOGIN] Attempt for email:", email);
      
      if (!email || !password) {
        console.log("[ADMIN LOGIN] Missing email or password");
        return res.status(400).json({ error: "Email and password are required" });
      }

      const adminUser = await storage.getAdminUserByEmail(email);
      console.log("[ADMIN LOGIN] User found:", adminUser ? "YES" : "NO", adminUser ? `ID: ${adminUser.id}` : "");
      
      if (!adminUser) {
        console.log("[ADMIN LOGIN] No user found for email:", email.toLowerCase());
        return res.status(401).json({ error: "Invalid email or password" });
      }

      console.log("[ADMIN LOGIN] Password hash length:", adminUser.password?.length);
      console.log("[ADMIN LOGIN] Password hash starts with $2:", adminUser.password?.startsWith("$2"));
      
      const isValid = await bcrypt.compare(password, adminUser.password);
      console.log("[ADMIN LOGIN] Password valid:", isValid);
      
      if (!isValid) {
        return res.status(401).json({ error: "Invalid email or password" });
      }

      if (adminUser.status !== "active") {
        return res.status(403).json({ error: "Account is disabled" });
      }

      // Update last login time
      await storage.updateAdminUser(adminUser.id, { lastLoginAt: new Date() } as any);

      // Set session data
      (req.session as any).adminUserId = adminUser.id;
      (req.session as any).adminRole = adminUser.role;

      const token = generateAdminToken(adminUser.id);

      const { password: _, ...adminData } = adminUser;
      res.json({ 
        user: adminData,
        mustChangePassword: adminUser.mustChangePassword,
        token
      });
    } catch (error) {
      console.error("Admin login error:", error);
      res.status(500).json({ error: "Login failed" });
    }
  });

  // Admin logout
  app.post("/api/admin/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        console.error("Session destroy error:", err);
        return res.status(500).json({ error: "Logout failed" });
      }
      res.clearCookie("connect.sid");
      res.json({ success: true });
    });
  });

  // Get current admin user
  app.get("/api/admin/auth/me", async (req, res) => {
    try {
      const adminUserId = getAdminUserIdFromRequest(req);
      if (!adminUserId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const adminUser = await storage.getAdminUser(adminUserId);
      if (!adminUser) {
        return res.status(401).json({ error: "User not found" });
      }

      const { password: _, ...adminData } = adminUser;
      res.json({ 
        user: adminData,
        mustChangePassword: adminUser.mustChangePassword 
      });
    } catch (error) {
      console.error("Get admin user error:", error);
      res.status(500).json({ error: "Failed to get user" });
    }
  });

  // Change password
  app.post("/api/admin/auth/change-password", async (req, res) => {
    try {
      const adminUserId = getAdminUserIdFromRequest(req);
      if (!adminUserId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const { currentPassword, newPassword } = req.body;
      
      if (!newPassword || newPassword.length < 6) {
        return res.status(400).json({ error: "Password must be at least 6 characters" });
      }

      const adminUser = await storage.getAdminUser(adminUserId);
      if (!adminUser) {
        return res.status(401).json({ error: "User not found" });
      }

      // Only check current password if not a forced change
      if (!adminUser.mustChangePassword) {
        if (!currentPassword) {
          return res.status(400).json({ error: "Current password is required" });
        }
        const isValid = await bcrypt.compare(currentPassword, adminUser.password);
        if (!isValid) {
          return res.status(401).json({ error: "Current password is incorrect" });
        }
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await storage.updateAdminUser(adminUserId, { 
        password: hashedPassword,
        mustChangePassword: false 
      });

      res.json({ success: true });
    } catch (error) {
      console.error("Change password error:", error);
      res.status(500).json({ error: "Failed to change password" });
    }
  });

  // Middleware to check admin session
  const isAdminSession = async (req: Request, res: Response, next: NextFunction) => {
    const adminUserId = getAdminUserIdFromRequest(req);
    if (!adminUserId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const adminUser = await storage.getAdminUser(adminUserId);
    if (!adminUser || adminUser.status !== "active") {
      return res.status(401).json({ error: "Invalid session" });
    }

    (req as any).adminUser = adminUser;
    next();
  };

  // Update admin profile image
  app.post("/api/admin/auth/update-image", async (req, res) => {
    try {
      const adminUserId = getAdminUserIdFromRequest(req);
      if (!adminUserId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const { image } = req.body;
      if (!image || typeof image !== "string") {
        return res.status(400).json({ error: "Image data is required" });
      }

      if (!image.startsWith("data:image/")) {
        return res.status(400).json({ error: "Invalid image format" });
      }

      const admin = await storage.updateAdminUser(adminUserId, { profileImage: image });
      if (!admin) {
        return res.status(404).json({ error: "Admin not found" });
      }

      const { password: _, ...adminData } = admin;
      res.json({ user: adminData });
    } catch (error) {
      console.error("Error uploading profile image:", error);
      res.status(500).json({ error: "Failed to upload profile image" });
    }
  });

  // ========== END ADMIN AUTH ==========

  // Admin login - redirects to admin dashboard after auth and assigns ADMIN role
  app.get("/api/admin/login", (req, res) => {
    const isProduction = process.env.NODE_ENV === "production";
    // Set cookies directly for reliability (session may not persist through OAuth flow)
    res.cookie("auth_redirect", "/admin/dashboard", { 
      httpOnly: true, 
      secure: isProduction,
      sameSite: "lax",
      maxAge: 5 * 60 * 1000 // 5 minutes
    });
    res.cookie("assign_admin_role", "true", {
      httpOnly: true,
      secure: isProduction,
      sameSite: "lax",
      maxAge: 5 * 60 * 1000
    });
    console.log("[admin login] Setting cookies: auth_redirect=/admin/dashboard, assign_admin_role=true");
    res.redirect("/api/login");
  });

  // ============ PUBLIC ROUTES ============

  // Property lookup by code (public)
  app.get("/api/properties/code/:code", async (req, res) => {
    try {
      const property = await storage.getPropertyByCode(req.params.code);
      if (!property) {
        return res.status(404).json({ error: "Property not found" });
      }
      const units = await storage.getUnits(property.id);
      res.json({ ...property, units });
    } catch (error) {
      console.error("Error fetching property:", error);
      res.status(500).json({ error: "Failed to fetch property" });
    }
  });

  // Public maintenance request submission with validation
  app.post("/api/maintenance", async (req, res) => {
    try {
      // Validate the request body
      const validationSchema = z.object({
        name: z.string().min(2, "Name must be at least 2 characters"),
        email: z.string().email("Please enter a valid email"),
        phone: z.string().min(10, "Please enter a valid phone number"),
        propertyAddress: z.string().min(5, "Please enter your property address"),
        unitLabel: z.string().optional(),
        category: z.string().min(1, "Please select a category"),
        description: z.string().min(1, "Please provide a description"),
        entryPermission: z.boolean().default(false),
        hasPets: z.boolean().default(false),
        photos: z.array(z.string()).optional(),
      });

      const data = validationSchema.parse(req.body);
      const request = await storage.createMaintenanceRequest({
        ...data,
        photos: data.photos || null,
        propertyId: null,
        tenantId: null,
      } as any);

      const photoCount = data.photos?.length || 0;

      try {
        await sendMaintenanceNotificationEmail({
          ticketNumber: request.ticketNumber,
          tenantName: data.name,
          tenantPhone: data.phone,
          tenantEmail: data.email,
          propertyAddress: data.propertyAddress,
          unitLabel: data.unitLabel,
          category: data.category,
          description: data.description,
          entryPermission: data.entryPermission,
          hasPets: data.hasPets,
          photoCount: photoCount,
        });
      } catch (emailError) {
        console.error("Failed to send maintenance notification email:", emailError);
      }

      res.json(request);
    } catch (error) {
      console.error("Error creating maintenance request:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid request data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to submit maintenance request" });
    }
  });

  app.post("/api/maintenance/request-upload-url", async (req, res) => {
    try {
      const { uploadURL, objectPath } = await objectStorageService.getPublicUploadURL("maintenance-photos");
      res.json({ uploadURL, objectPath });
    } catch (error) {
      console.error("Error generating maintenance photo upload URL:", error);
      res.status(500).json({ error: "Failed to generate upload URL" });
    }
  });

  // Stripe: Get publishable key
  app.get("/api/stripe/publishable-key", async (req, res) => {
    try {
      const { getStripePublishableKey } = await import("./stripeClient");
      const publishableKey = await getStripePublishableKey();
      res.json({ publishableKey });
    } catch (error) {
      console.error("Error getting Stripe publishable key:", error);
      res.status(500).json({ error: "Stripe not configured" });
    }
  });

  // Stripe: Create PaymentIntent for public payments (card or ACH)
  app.post("/api/stripe/create-payment-intent", async (req, res) => {
    try {
      const schema = z.object({
        amount: z.union([z.string(), z.number()]).transform(val => {
          const num = typeof val === "string" ? parseFloat(val) : val;
          if (isNaN(num) || num <= 0) throw new Error("Invalid amount");
          return num;
        }),
        method: z.enum(["card", "ach"]),
        propertyCode: z.string().min(3, "Property ID is required"),
        email: z.string().email("Please enter a valid email"),
        paymentType: z.string().optional(),
        description: z.string().optional(),
      });

      const data = schema.parse(req.body);
      const { getUncachableStripeClient } = await import("./stripeClient");
      const stripe = await getUncachableStripeClient();

      const intentParams: any = {
        amount: Math.round(data.amount * 100),
        currency: "usd",
        automatic_payment_methods: { enabled: true },
        metadata: {
          propertyCode: data.propertyCode,
          email: data.email,
          paymentType: data.paymentType || "rent",
          description: data.description || "",
          method: data.method,
        },
        receipt_email: data.email,
      };

      const paymentIntent = await stripe.paymentIntents.create(intentParams);

      res.json({
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
      });
    } catch (error) {
      console.error("Error creating payment intent:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid payment data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create payment intent" });
    }
  });

  // Stripe: Confirm payment was successful and record it
  app.post("/api/stripe/confirm-payment", async (req, res) => {
    try {
      const schema = z.object({
        paymentIntentId: z.string(),
      });
      const { paymentIntentId } = schema.parse(req.body);

      const existing = await storage.getPaymentByStripeIntentId(paymentIntentId);
      if (existing) {
        return res.json(existing);
      }

      const { getUncachableStripeClient } = await import("./stripeClient");
      const stripe = await getUncachableStripeClient();
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

      if (paymentIntent.status === "processing") {
        return res.json({ status: "processing", message: "Payment is being processed. You will receive confirmation shortly." });
      }

      if (paymentIntent.status !== "succeeded") {
        return res.status(400).json({ error: "Payment not yet completed", status: paymentIntent.status });
      }

      const metadata = paymentIntent.metadata || {};
      const payment = await storage.createPayment({
        propertyCode: metadata.propertyCode || "",
        email: metadata.email || "",
        amount: (paymentIntent.amount / 100).toFixed(2),
        method: metadata.method || "card",
        description: metadata.description || null,
        status: "completed",
        paidAt: new Date(),
        stripePaymentIntentId: paymentIntentId,
      });

      res.json(payment);
    } catch (error) {
      console.error("Error confirming payment:", error);
      res.status(500).json({ error: "Failed to confirm payment" });
    }
  });

  // Stripe: Create PaymentIntent for portal (authenticated tenant) payments
  app.post("/api/stripe/portal/create-payment-intent", isAuthenticated, async (req, res) => {
    try {
      const userId = (req as any).user?.claims?.sub;
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      const schema = z.object({
        amount: z.union([z.string(), z.number()]).transform(val => {
          const num = typeof val === "string" ? parseFloat(val) : val;
          if (isNaN(num) || num <= 0) throw new Error("Invalid amount");
          return num;
        }),
        method: z.enum(["card", "ach"]),
        description: z.string().optional(),
      });

      const data = schema.parse(req.body);
      const tenant = await storage.getTenantByUserId(userId);
      if (!tenant) return res.status(404).json({ error: "Tenant not found" });

      const allLeases = await storage.getLeases(tenant.id);
      const lease = allLeases.find(l => l.status === "active") || allLeases[0];

      let amountDue = 0;
      if (lease) {
        const charges = await storage.getRentCharges({ tenantId: tenant.id });
        const unpaid = charges.filter(c => c.status === "open" || c.status === "late" || c.status === "partial");
        if (unpaid.length === 0) {
          amountDue = parseFloat(lease.rentAmount || tenant.rentAmount || "0");
        } else {
          for (const charge of unpaid) {
            const due = parseFloat(charge.totalDue || "0") - parseFloat(charge.amountPaid || "0");
            if (due > 0) amountDue += due;
          }
        }
      } else {
        amountDue = parseFloat(tenant.rentAmount || "0");
      }
      amountDue = Math.round(amountDue * 100) / 100;

      let expectedFee: number;
      if (data.method === "ach") {
        expectedFee = Math.min(amountDue * 0.008, 5.00);
      } else {
        expectedFee = Math.round(amountDue * 0.0299 * 100) / 100;
      }
      const expectedTotal = Math.round((amountDue + expectedFee) * 100) / 100;

      if (Math.abs(data.amount - expectedTotal) > 0.02) {
        return res.status(400).json({
          error: "Payment amount must equal full balance due plus processing fee",
          expectedAmount: expectedTotal,
          amountDue,
          processingFee: expectedFee,
        });
      }

      const { getUncachableStripeClient } = await import("./stripeClient");
      const stripe = await getUncachableStripeClient();

      const intentParams: any = {
        amount: Math.round(expectedTotal * 100),
        currency: "usd",
        automatic_payment_methods: { enabled: true },
        metadata: {
          tenantId: tenant.id?.toString() || "",
          userId,
          description: data.description || "",
          method: data.method,
          amountDue: amountDue.toFixed(2),
          processingFee: expectedFee.toFixed(2),
        },
        receipt_email: tenant?.email || undefined,
      };

      const paymentIntent = await stripe.paymentIntents.create(intentParams);

      res.json({
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
      });
    } catch (error) {
      console.error("Error creating portal payment intent:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid payment data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create payment intent" });
    }
  });

  // Stripe: Confirm portal payment
  app.post("/api/stripe/portal/confirm-payment", isAuthenticated, async (req, res) => {
    try {
      const userId = (req as any).user?.claims?.sub;
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      const schema = z.object({
        paymentIntentId: z.string(),
      });
      const { paymentIntentId } = schema.parse(req.body);

      const existing = await storage.getPaymentByStripeIntentId(paymentIntentId);
      if (existing) {
        return res.json(existing);
      }

      const { getUncachableStripeClient } = await import("./stripeClient");
      const stripe = await getUncachableStripeClient();
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

      const metadata = paymentIntent.metadata || {};
      if (metadata.userId && metadata.userId !== userId) {
        return res.status(403).json({ error: "Payment does not belong to this user" });
      }

      if (paymentIntent.status === "processing") {
        return res.json({ status: "processing", message: "Payment is being processed. You will receive confirmation shortly." });
      }

      if (paymentIntent.status !== "succeeded") {
        return res.status(400).json({ error: "Payment not yet completed", status: paymentIntent.status });
      }

      const tenant = await storage.getTenantByUserId(userId);

      const payment = await storage.createPayment({
        tenantId: tenant?.id || null,
        amount: (paymentIntent.amount / 100).toFixed(2),
        method: metadata.method || "card",
        description: metadata.description || null,
        status: "completed",
        paidAt: new Date(),
        stripePaymentIntentId: paymentIntentId,
      });

      res.json(payment);
    } catch (error) {
      console.error("Error confirming portal payment:", error);
      res.status(500).json({ error: "Failed to confirm payment" });
    }
  });

  app.post("/api/portal/zelle-payment", isAuthenticated, async (req, res) => {
    try {
      const userId = (req as any).user?.claims?.sub;
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      const schema = z.object({
        confirmationId: z.string().min(1, "Confirmation ID is required").max(255),
      });
      const { confirmationId } = schema.parse(req.body);

      const tenant = await storage.getTenantByUserId(userId);
      if (!tenant) return res.status(404).json({ error: "Tenant not found" });

      const openCharges = await storage.getRentCharges({ tenantId: tenant.id });
      const unpaidCharges = openCharges.filter(c => c.status === "open" || c.status === "late" || c.status === "partial");
      let totalDue = 0;
      for (const charge of unpaidCharges) {
        const due = parseFloat(charge.totalDue || "0") - parseFloat(charge.amountPaid || "0");
        if (due > 0) totalDue += due;
      }

      if (totalDue <= 0) {
        return res.status(400).json({ error: "No balance due" });
      }

      const payment = await storage.createPayment({
        tenantId: tenant.id,
        propertyId: tenant.propertyId || null,
        amount: totalDue.toFixed(2),
        method: "zelle",
        description: `Zelle payment - Confirmation: ${confirmationId}`,
        status: "pending",
        zelleConfirmationId: confirmationId,
      });

      res.json(payment);
    } catch (error: any) {
      if (error?.issues) {
        return res.status(400).json({ error: error.issues[0]?.message || "Validation failed" });
      }
      console.error("Error recording Zelle payment:", error);
      res.status(500).json({ error: "Failed to record Zelle payment" });
    }
  });

  // Public payment submission with validation
  app.post("/api/payments", async (req, res) => {
    try {
      const validationSchema = z.object({
        propertyCode: z.string().min(3, "Property ID is required"),
        email: z.string().email("Please enter a valid email"),
        amount: z.union([z.string(), z.number()]).transform(val => {
          const num = typeof val === "string" ? parseFloat(val) : val;
          if (isNaN(num) || num <= 0) throw new Error("Invalid amount");
          return num.toFixed(2);
        }),
        method: z.enum(["card", "ach", "zelle"]).optional(),
        description: z.string().optional(),
      });

      const data = validationSchema.parse(req.body);

      const payment = await storage.createPayment({
        propertyCode: data.propertyCode,
        email: data.email,
        amount: data.amount,
        method: data.method || "card",
        description: data.description || null,
        status: "completed",
        paidAt: new Date(),
      });
      
      res.json(payment);
    } catch (error) {
      console.error("Error processing payment:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid payment data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to process payment" });
    }
  });

  // Public application submission with validation
  app.post("/api/applications", async (req, res) => {
    try {
      const validationSchema = z.object({
        applicationData: z.record(z.any()),
        status: z.enum(["draft", "submitted"]).default("submitted"),
      });

      const { applicationData, status } = validationSchema.parse(req.body);
      const application = await storage.createApplication({
        applicationData,
        status,
      });
      res.json(application);
    } catch (error) {
      console.error("Error creating application:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid application data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to submit application" });
    }
  });

  // ============ TENANT PORTAL ROUTES ============

  // Get tenant info
  app.get("/api/portal/tenant", isAuthenticated, async (req, res) => {
    try {
      const userId = (req as any).user?.claims?.sub;
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      const tenant = await storage.getTenantByUserId(userId);
      if (!tenant) {
        return res.json({
          balance: 0,
          nextDueDate: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toLocaleDateString(),
          rentAmount: "1500.00",
          property: null,
          unit: null,
        });
      }

      const property = tenant.propertyId ? await storage.getProperty(tenant.propertyId) : null;
      const unit = tenant.unitId ? await storage.getUnit(tenant.unitId) : null;

      let balance = 0;
      try {
        const charges = await storage.getRentCharges({ tenantId: tenant.id });
        const unpaid = charges.filter(c => c.status === "open" || c.status === "late" || c.status === "partial");
        for (const charge of unpaid) {
          const due = parseFloat(charge.totalDue || "0") - parseFloat(charge.amountPaid || "0");
          if (due > 0) balance += due;
        }
      } catch {}
      
      res.json({
        ...tenant,
        balance: Math.round(balance * 100) / 100,
        nextDueDate: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toLocaleDateString(),
        rentAmount: unit?.rentAmount || tenant.rentAmount || "0.00",
        property,
        unit,
      });
    } catch (error) {
      console.error("Error fetching tenant info:", error);
      res.status(500).json({ error: "Failed to fetch tenant info" });
    }
  });

  app.get("/api/portal/amount-due", isAuthenticated, async (req, res) => {
    try {
      const userId = (req as any).user?.claims?.sub;
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      const tenant = await storage.getTenantByUserId(userId);
      if (!tenant) return res.status(404).json({ error: "Tenant not found" });

      const allLeases = await storage.getLeases(tenant.id);
      const lease = allLeases.find(l => l.status === "active") || allLeases[0];
      if (!lease) {
        return res.json({
          baseRent: parseFloat(tenant.rentAmount || "0"),
          lateFees: 0,
          totalDue: parseFloat(tenant.rentAmount || "0"),
          breakdown: [],
        });
      }

      const openCharges = await storage.getRentCharges({ tenantId: tenant.id });
      const unpaidCharges = openCharges.filter(c => c.status === "open" || c.status === "late" || c.status === "partial");

      let baseRent = 0;
      let lateFees = 0;
      let totalDue = 0;
      const breakdown: { month: string; baseRent: number; lateFee: number; paid: number; due: number }[] = [];

      if (unpaidCharges.length === 0) {
        const rentAmt = parseFloat(lease.rentAmount || tenant.rentAmount || "0");
        baseRent = rentAmt;
        totalDue = rentAmt;
        breakdown.push({
          month: "Current",
          baseRent: rentAmt,
          lateFee: 0,
          paid: 0,
          due: rentAmt,
        });
      } else {
        for (const charge of unpaidCharges) {
          const chargeBase = parseFloat(charge.baseRent || "0");
          const chargeLate = parseFloat(charge.lateFeeAmount || "0");
          const chargePaid = parseFloat(charge.amountPaid || "0");
          const chargeDue = parseFloat(charge.totalDue || "0") - chargePaid;

          if (chargeDue > 0) {
            baseRent += chargeBase;
            lateFees += chargeLate;
            totalDue += chargeDue;
            breakdown.push({
              month: charge.chargeMonth,
              baseRent: chargeBase,
              lateFee: chargeLate,
              paid: chargePaid,
              due: chargeDue,
            });
          }
        }
      }

      res.json({
        baseRent: Math.round(baseRent * 100) / 100,
        lateFees: Math.round(lateFees * 100) / 100,
        totalDue: Math.round(totalDue * 100) / 100,
        breakdown,
      });
    } catch (error) {
      console.error("Error calculating amount due:", error);
      res.status(500).json({ error: "Failed to calculate amount due" });
    }
  });

  app.patch("/api/portal/account", isAuthenticated, async (req, res) => {
    try {
      const userId = (req as any).user?.claims?.sub;
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      const tenant = await storage.getTenantByUserId(userId);
      if (!tenant) return res.status(404).json({ error: "Tenant not found" });

      const schema = z.object({
        firstName: z.string().min(1, "First name is required").optional(),
        lastName: z.string().min(1, "Last name is required").optional(),
        email: z.string().email("Invalid email address"),
        phone: z.string().min(1, "Phone number is required"),
      });

      const data = schema.parse(req.body);
      const updateFields: any = {
        email: data.email,
        phone: data.phone,
      };
      if (data.firstName !== undefined) updateFields.firstName = data.firstName;
      if (data.lastName !== undefined) updateFields.lastName = data.lastName;
      const updated = await storage.updateTenant(tenant.id, updateFields);

      res.json(updated);
    } catch (error) {
      console.error("Error updating account:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to update account" });
    }
  });

  app.post("/api/portal/change-password", isAuthenticated, async (req, res) => {
    try {
      const userId = (req as any).user?.claims?.sub;
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      const tenant = await storage.getTenantByUserId(userId);
      if (!tenant) return res.status(404).json({ error: "Tenant not found" });

      const schema = z.object({
        currentPassword: z.string().min(1),
        newPassword: z.string().min(8, "Password must be at least 8 characters"),
      });

      const data = schema.parse(req.body);

      const bcrypt = await import("bcryptjs");

      if (tenant.portalPassword) {
        const isValid = await bcrypt.compare(data.currentPassword, tenant.portalPassword);
        if (!isValid) {
          return res.status(400).json({ error: "Current password is incorrect" });
        }
      }

      const hashedPassword = await bcrypt.hash(data.newPassword, 10);
      await storage.updateTenant(tenant.id, { portalPassword: hashedPassword });

      res.json({ message: "Password updated successfully" });
    } catch (error) {
      console.error("Error changing password:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to change password" });
    }
  });

  // Get tenant payments
  app.get("/api/portal/payments", isAuthenticated, async (req, res) => {
    try {
      const userId = (req as any).user?.claims?.sub;
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      const tenant = await storage.getTenantByUserId(userId);
      const payments = tenant 
        ? await storage.getPayments({ tenantId: tenant.id })
        : [];

      const totalPaidYTD = payments
        .filter(p => p.status === "completed" && p.paidAt && new Date(p.paidAt).getFullYear() === new Date().getFullYear())
        .reduce((sum, p) => sum + parseFloat(p.amount || "0"), 0);

      res.json({ history: payments, totalPaidYTD });
    } catch (error) {
      console.error("Error fetching payments:", error);
      res.status(500).json({ error: "Failed to fetch payments" });
    }
  });

  // Get recent payments for dashboard
  app.get("/api/portal/payments/recent", isAuthenticated, async (req, res) => {
    try {
      const userId = (req as any).user?.claims?.sub;
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      const tenant = await storage.getTenantByUserId(userId);
      const payments = tenant 
        ? await storage.getPayments({ tenantId: tenant.id })
        : [];

      res.json(payments.slice(0, 5));
    } catch (error) {
      console.error("Error fetching recent payments:", error);
      res.status(500).json({ error: "Failed to fetch payments" });
    }
  });

  // Create payment from portal
  app.post("/api/portal/payments", isAuthenticated, async (req, res) => {
    try {
      const userId = (req as any).user?.claims?.sub;
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      const validationSchema = z.object({
        amount: z.union([z.string(), z.number()]).transform(val => {
          const num = typeof val === "string" ? parseFloat(val) : val;
          if (isNaN(num) || num <= 0) throw new Error("Invalid amount");
          return num.toFixed(2);
        }),
        method: z.enum(["card", "ach"]).optional(),
        description: z.string().optional(),
      });

      const data = validationSchema.parse(req.body);
      const tenant = await storage.getTenantByUserId(userId);

      const payment = await storage.createPayment({
        tenantId: tenant?.id || null,
        amount: data.amount,
        method: data.method || "card",
        description: data.description || null,
        status: "completed",
        paidAt: new Date(),
      });

      res.json(payment);
    } catch (error) {
      console.error("Error creating payment:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid payment data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to process payment" });
    }
  });

  // Get tenant maintenance requests
  app.get("/api/portal/maintenance", isAuthenticated, async (req, res) => {
    try {
      const userId = (req as any).user?.claims?.sub;
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      const tenant = await storage.getTenantByUserId(userId);
      const requests = tenant 
        ? await storage.getMaintenanceRequests({ tenantId: tenant.id })
        : [];

      const enriched = await Promise.all(requests.map(async (r) => {
        const messages = await storage.getMaintenanceMessages(r.id);
        return { ...r, messages };
      }));

      res.json(enriched);
    } catch (error) {
      console.error("Error fetching maintenance requests:", error);
      res.status(500).json({ error: "Failed to fetch requests" });
    }
  });

  // Get recent maintenance for dashboard
  app.get("/api/portal/maintenance/recent", isAuthenticated, async (req, res) => {
    try {
      const userId = (req as any).user?.claims?.sub;
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      const tenant = await storage.getTenantByUserId(userId);
      const requests = tenant 
        ? await storage.getMaintenanceRequests({ tenantId: tenant.id })
        : [];

      const openCount = requests.filter(r => r.status !== "completed" && r.status !== "cancelled").length;

      res.json({ requests: requests.slice(0, 5), openCount });
    } catch (error) {
      console.error("Error fetching maintenance requests:", error);
      res.status(500).json({ error: "Failed to fetch requests" });
    }
  });

  // Create maintenance request from portal
  app.post("/api/portal/maintenance", isAuthenticated, async (req, res) => {
    try {
      const userId = (req as any).user?.claims?.sub;
      const user = (req as any).user;
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      const validationSchema = z.object({
        category: z.string().min(1, "Please select a category"),
        description: z.string().min(1, "Please provide a description"),
        entryPermission: z.boolean().default(false),
        hasPets: z.boolean().default(false),
        photos: z.array(z.string()).optional(),
      });

      const data = validationSchema.parse(req.body);
      const tenant = await storage.getTenantByUserId(userId);

      const tenantName = `${user?.claims?.first_name || ""} ${user?.claims?.last_name || ""}`.trim() || "Tenant";
      const tenantEmail = user?.claims?.email || "";
      const tenantPhone = tenant?.phone || "";

      let propertyAddress = "";
      if (tenant?.propertyId) {
        const property = await storage.getProperty(tenant.propertyId);
        if (property) {
          propertyAddress = property.address || property.name || "";
        }
      }

      const request = await storage.createMaintenanceRequest({
        tenantId: tenant?.id || null,
        propertyId: tenant?.propertyId || null,
        name: tenantName,
        email: tenantEmail,
        phone: tenantPhone,
        propertyAddress: propertyAddress,
        category: data.category,
        description: data.description,
        entryPermission: data.entryPermission,
        hasPets: data.hasPets,
        photos: data.photos || null,
      } as any);

      const photoCount = data.photos?.length || 0;

      try {
        await sendMaintenanceNotificationEmail({
          ticketNumber: request.ticketNumber,
          tenantName: tenantName,
          tenantPhone: tenantPhone,
          tenantEmail: tenantEmail,
          propertyAddress: propertyAddress,
          category: data.category,
          description: data.description,
          entryPermission: data.entryPermission,
          hasPets: data.hasPets,
          photoCount: photoCount,
        });
      } catch (emailError) {
        console.error("Failed to send maintenance notification email:", emailError);
      }

      res.json(request);
    } catch (error) {
      console.error("Error creating maintenance request:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid request data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to submit request" });
    }
  });

  app.post("/api/portal/maintenance/:id/messages", isAuthenticated, async (req, res) => {
    try {
      const userId = (req as any).user?.claims?.sub;
      if (!userId) return res.status(401).json({ error: "Unauthorized" });
      const { message } = req.body;
      if (!message || !message.trim()) {
        return res.status(400).json({ error: "Message is required" });
      }
      const newMessage = await storage.createMaintenanceMessage({
        requestId: req.params.id,
        senderType: "tenant",
        senderUserId: userId,
        message: message.trim(),
      });
      res.json(newMessage);
    } catch (error) {
      console.error("Error creating tenant message:", error);
      res.status(500).json({ error: "Failed to send message" });
    }
  });

  // Get tenant applications
  app.get("/api/portal/applications", isAuthenticated, async (req, res) => {
    try {
      const userId = (req as any).user?.claims?.sub;
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      const applications = await storage.getApplications(userId);
      res.json(applications);
    } catch (error) {
      console.error("Error fetching applications:", error);
      res.status(500).json({ error: "Failed to fetch applications" });
    }
  });

  app.get("/api/portal/lease", isAuthenticated, async (req, res) => {
    try {
      const userId = (req as any).user?.claims?.sub;
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      const tenant = await storage.getTenantByUserId(userId);
      if (!tenant) {
        return res.json({ lease: null, leaseDocument: null, leaseFile: null });
      }

      const allLeases = await storage.getLeases(tenant.id);
      const lease = allLeases.find(l => l.status === "active") || allLeases[0] || null;

      if (!lease) {
        return res.json({ lease: null, leaseDocument: null, leaseFile: null });
      }

      const property = lease.propertyId ? await storage.getProperty(lease.propertyId) : null;
      const unit = lease.unitId ? await storage.getUnit(lease.unitId) : null;

      let leaseFile = null;
      if (lease.leaseFileId) {
        leaseFile = await storage.getFile(lease.leaseFileId);
      }

      let leaseDocument = null;
      try {
        leaseDocument = await storage.getLeaseDocumentByLeaseId(lease.id);
      } catch (e) {}

      res.json({
        lease: { ...lease, property, unit },
        leaseDocument,
        leaseFile,
      });
    } catch (error) {
      console.error("Error fetching lease:", error);
      res.status(500).json({ error: "Failed to fetch lease info" });
    }
  });

  app.get("/api/portal/lease/file/:fileId/download", isAuthenticated, async (req, res) => {
    try {
      const userId = (req as any).user?.claims?.sub;
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      const tenant = await storage.getTenantByUserId(userId);
      if (!tenant) return res.status(403).json({ error: "Tenant not found" });

      const allLeases = await storage.getLeases(tenant.id);
      const hasAccess = allLeases.some(l => l.leaseFileId === req.params.fileId);
      if (!hasAccess) return res.status(403).json({ error: "Access denied" });

      const file = await storage.getFile(req.params.fileId);
      if (!file) return res.status(404).json({ error: "File not found" });

      const inlineTypes = ["application/pdf", "image/png", "image/jpeg", "image/gif", "image/webp", "text/plain", "text/html"];
      const disposition = inlineTypes.includes(file.mimeType || "") ? "inline" : "attachment";
      res.setHeader("Content-Disposition", `${disposition}; filename="${file.filename}"`);
      res.setHeader("Content-Type", file.mimeType || "application/octet-stream");

      if (file.fileData) {
        const buffer = Buffer.from(file.fileData, "base64");
        res.setHeader("Content-Length", String(buffer.length));
        return res.send(buffer);
      }

      const filePath = path.join(process.cwd(), "uploads", file.storageKey);
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: "File not found. Please re-upload this document." });
      }
      res.sendFile(filePath);
    } catch (error) {
      console.error("Error downloading lease file:", error);
      res.status(500).json({ error: "Failed to download file" });
    }
  });

  // ============ ADMIN ROUTES (with role-based access) ============

  // Get admin profile
  app.get("/api/admin/profile", isAuthenticated, async (req, res) => {
    try {
      const userId = (req as any).user?.claims?.sub;
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      // Check if user logged in through admin portal (assignAdminRole flag)
      const assignAdminRole = (req.session as any).assignAdminRole;
      if (assignAdminRole) {
        delete (req.session as any).assignAdminRole;
      }

      let profile = await storage.getUserProfile(userId);
      if (!profile) {
        // Create profile - assign ADMIN if logged in through admin portal
        profile = await storage.createUserProfile({ 
          userId, 
          role: assignAdminRole ? "ADMIN" : "TENANT" 
        });
      } else if (assignAdminRole && profile.role !== "ADMIN") {
        // Upgrade existing user to ADMIN if they logged in through admin portal
        profile = await storage.updateUserProfile(userId, { role: "ADMIN" });
      }
      res.json(profile);
    } catch (error) {
      console.error("Error fetching admin profile:", error);
      res.status(500).json({ error: "Failed to fetch profile" });
    }
  });

  // Upload admin profile image
  app.post("/api/admin/profile/image", isAdminSession, async (req, res) => {
    try {
      const userId = (req as any).user?.claims?.sub;
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      const { image } = req.body;
      if (!image || typeof image !== "string") {
        return res.status(400).json({ error: "Image data is required" });
      }

      // Validate it's a valid data URL
      if (!image.startsWith("data:image/")) {
        return res.status(400).json({ error: "Invalid image format" });
      }

      const profile = await storage.updateUserProfile(userId, { profileImage: image });
      if (!profile) {
        return res.status(404).json({ error: "Profile not found" });
      }

      res.json(profile);
    } catch (error) {
      console.error("Error uploading profile image:", error);
      res.status(500).json({ error: "Failed to upload profile image" });
    }
  });

  // Admin dashboard stats
  app.get("/api/admin/dashboard", isAdminSession, async (req, res) => {
    try {
      const properties = await storage.getProperties();
      const tenants = await storage.getTenants();
      const maintenanceRequests = await storage.getMaintenanceRequests();

      const now = new Date();
      const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
      const rentCharges = await storage.getRentCharges({ chargeMonth: currentMonth });
      const rentCollected = rentCharges.reduce((sum, rc) => sum + parseFloat(rc.amountPaid || "0"), 0);

      res.json({
        totalProperties: properties.length,
        activeProperties: properties.filter(p => p.status === "active").length,
        totalTenants: tenants.length,
        activeTenants: tenants.filter(t => t.status === "active").length,
        openMaintenance: maintenanceRequests.filter(r => r.status !== "completed" && r.status !== "cancelled").length,
        emergencyMaintenance: maintenanceRequests.filter(r => r.priority === "emergency" && r.status !== "completed").length,
        rentCollectedThisMonth: rentCollected,
      });
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      res.status(500).json({ error: "Failed to fetch stats" });
    }
  });

  // ========== ENTITIES (Property Owners) ==========
  
  // Admin: Get all entities
  app.get("/api/admin/entities", isAdminSession, async (req, res) => {
    try {
      const entities = await storage.getEntities();
      res.json(entities);
    } catch (error) {
      console.error("Error fetching entities:", error);
      res.status(500).json({ error: "Failed to fetch entities" });
    }
  });

  // Admin: Get single entity
  app.get("/api/admin/entities/:id", isAdminSession, async (req, res) => {
    try {
      const entity = await storage.getEntity(req.params.id);
      if (!entity) {
        return res.status(404).json({ error: "Entity not found" });
      }
      res.json(entity);
    } catch (error) {
      console.error("Error fetching entity:", error);
      res.status(500).json({ error: "Failed to fetch entity" });
    }
  });

  // Admin: Create entity with validation
  app.post("/api/admin/entities", isAdminSession, async (req, res) => {
    try {
      const data = insertEntitySchema.parse(req.body);
      const entity = await storage.createEntity(data);
      res.json(entity);
    } catch (error) {
      console.error("Error creating entity:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid entity data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create entity" });
    }
  });

  // Admin: Update entity with validation
  app.patch("/api/admin/entities/:id", isAdminSession, async (req, res) => {
    try {
      const { id } = req.params;
      const validationSchema = insertEntitySchema.partial();
      const data = validationSchema.parse(req.body);
      const entity = await storage.updateEntity(id, data);
      if (!entity) {
        return res.status(404).json({ error: "Entity not found" });
      }
      res.json(entity);
    } catch (error) {
      console.error("Error updating entity:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid entity data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to update entity" });
    }
  });

  // Admin: Delete entity
  app.delete("/api/admin/entities/:id", isAdminSession, async (req, res) => {
    try {
      const { id } = req.params;
      const success = await storage.deleteEntity(id);
      if (!success) {
        return res.status(404).json({ error: "Entity not found" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting entity:", error);
      res.status(500).json({ error: "Failed to delete entity" });
    }
  });

  // Admin: Get properties by entity
  app.get("/api/admin/entities/:id/properties", isAdminSession, async (req, res) => {
    try {
      const properties = await storage.getPropertiesByEntity(req.params.id);
      res.json(properties);
    } catch (error) {
      console.error("Error fetching entity properties:", error);
      res.status(500).json({ error: "Failed to fetch properties" });
    }
  });

  // ========== PROPERTIES ==========

  // Admin: Get all properties
  app.get("/api/admin/properties", isAdminSession, async (req, res) => {
    try {
      const allProperties = await storage.getProperties();
      res.json(allProperties);
    } catch (error) {
      console.error("Error fetching properties:", error);
      res.status(500).json({ error: "Failed to fetch properties" });
    }
  });

  // Admin: Create property with validation
  app.post("/api/admin/properties", isAdminSession, async (req, res) => {
    try {
      const data = insertPropertySchema.parse(req.body);
      const property = await storage.createProperty(data);
      res.json(property);
    } catch (error) {
      console.error("Error creating property:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid property data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create property" });
    }
  });

  // Admin: Bulk upload properties via Excel
  const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: {
      fileSize: 5 * 1024 * 1024, // 5MB max file size
    },
    fileFilter: (req, file, cb) => {
      const allowedMimes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel',
      ];
      if (allowedMimes.includes(file.mimetype) || file.originalname.match(/\.(xlsx|xls)$/i)) {
        cb(null, true);
      } else {
        cb(new Error('Only Excel files (.xlsx, .xls) are allowed'));
      }
    }
  });

  // Valid property types
  const validPropertyTypes = ["house", "condo", "townhouse", "commercial"];

  // Wrapper to handle multer errors properly
  const handleUpload = (req: Request, res: Response, next: NextFunction) => {
    upload.single("file")(req, res, (err: any) => {
      if (err) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ error: "File too large. Maximum size is 5MB." });
        }
        if (err.message?.includes('Only Excel files')) {
          return res.status(400).json({ error: "Only Excel files (.xlsx, .xls) are allowed." });
        }
        return res.status(400).json({ error: err.message || "File upload failed." });
      }
      next();
    });
  };
  
  // Helper function to convert Excel serial date to JavaScript Date
  function excelDateToJSDate(excelDate: number): Date {
    // Excel dates are stored as number of days since 1900-01-01
    // JavaScript Date uses milliseconds since 1970-01-01
    const excelEpoch = new Date(1899, 11, 30); // Excel's epoch is December 30, 1899
    return new Date(excelEpoch.getTime() + excelDate * 24 * 60 * 60 * 1000);
  }

  app.post("/api/admin/properties/bulk-upload", isAdminSession, handleUpload, async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(worksheet) as Record<string, any>[];

      if (rows.length === 0) {
        return res.status(400).json({ error: "Excel file is empty" });
      }

      // Detect format based on columns
      const firstRow = rows[0];
      const providedColumns = Object.keys(firstRow);
      
      // New comprehensive format columns
      const comprehensiveColumns = ["Property Name", "Address", "Landlord", "Tenant First Name", "Rent Amount"];
      const isComprehensiveFormat = comprehensiveColumns.every(col => providedColumns.includes(col));

      if (isComprehensiveFormat) {
        // Handle comprehensive bulk import with entities, properties, tenants, leases
        const results = {
          entities: { created: 0, existing: 0 },
          properties: { created: 0, failed: 0 },
          tenants: { created: 0, failed: 0 },
          leases: { created: 0, failed: 0 },
        };
        const errors: { row: number; errors: string[] }[] = [];
        const insertErrors: { row: number; error: string }[] = [];

        // Get existing entities
        const existingEntities = await storage.getEntities();
        const entityMap = new Map(existingEntities.map(e => [e.name.toLowerCase(), e.id]));

        // Get existing properties by name to check for duplicates
        const existingProperties = await storage.getProperties();
        const propertyMap = new Map(existingProperties.map(p => [p.name.toLowerCase(), p.id]));

        for (let i = 0; i < rows.length; i++) {
          const row = rows[i];
          const excelRowNumber = i + 2; // +2 for header row and 0-indexing
          const rowErrors: string[] = [];

          // Validate required fields
          if (!row["Property Name"]) rowErrors.push("Missing Property Name");
          if (!row["Address"]) rowErrors.push("Missing Address");
          if (!row["City"]) rowErrors.push("Missing City");
          if (!row["State"]) rowErrors.push("Missing State");
          if (!row["Zip"]) rowErrors.push("Missing Zip");
          if (!row["Tenant First Name"]) rowErrors.push("Missing Tenant First Name");
          if (!row["Tenant Last Name"]) rowErrors.push("Missing Tenant Last Name");
          if (!row["Tenant Email Address"]) rowErrors.push("Missing Tenant Email Address");

          // Validate property type
          const propertyType = row["Property Type"] ? String(row["Property Type"]).trim().toLowerCase() : "condo";
          if (!validPropertyTypes.includes(propertyType)) {
            rowErrors.push(`Invalid property type: ${row["Property Type"]}. Must be one of: ${validPropertyTypes.join(", ")}`);
          }

          // Validate dates
          if (!row["Lease Start Date"]) rowErrors.push("Missing Lease Start Date");
          if (!row["Lease End Date"]) rowErrors.push("Missing Lease End Date");

          // Validate rent amount
          if (row["Rent Amount"] === undefined || row["Rent Amount"] === "") {
            rowErrors.push("Missing Rent Amount");
          }

          if (rowErrors.length > 0) {
            errors.push({ row: excelRowNumber, errors: rowErrors });
            continue;
          }

          try {
            // 1. Create or find entity (Landlord)
            let entityId: string | null = null;
            if (row["Landlord"]) {
              const landlordName = String(row["Landlord"]).trim();
              const landlordKey = landlordName.toLowerCase();
              
              if (entityMap.has(landlordKey)) {
                entityId = entityMap.get(landlordKey)!;
                results.entities.existing++;
              } else {
                // Create new entity
                const newEntity = await storage.createEntity({
                  name: landlordName,
                  type: landlordName.toLowerCase().includes("llc") ? "llc" : 
                        landlordName.toLowerCase().includes("corp") ? "corporation" : "individual",
                });
                entityId = newEntity.id;
                entityMap.set(landlordKey, entityId);
                results.entities.created++;
              }
            }

            // 2. Create property (or find existing)
            const propertyName = String(row["Property Name"]).trim();
            const propertyKey = propertyName.toLowerCase();
            let propertyId: string;

            if (propertyMap.has(propertyKey)) {
              propertyId = propertyMap.get(propertyKey)!;
            } else {
              // Generate property code from name
              const propertyCode = propertyName.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().substring(0, 20) + 
                                   "-" + Date.now().toString(36).toUpperCase();
              
              const newProperty = await storage.createProperty({
                propertyCode,
                name: propertyName,
                address: String(row["Address"]).trim(),
                city: String(row["City"]).trim(),
                state: String(row["State"]).trim(),
                zip: String(row["Zip"]),
                type: propertyType,
                entityId,
              });
              propertyId = newProperty.id;
              propertyMap.set(propertyKey, propertyId);
              results.properties.created++;
            }

            // 3. Create tenant
            const tenantEmail = String(row["Tenant Email Address"]).trim();
            const rentAmount = String(row["Rent Amount"]);
            
            // Convert lease dates from Excel serial to JavaScript Date, aligned to 1st/last of month
            const rawStart = typeof row["Lease Start Date"] === "number" 
              ? excelDateToJSDate(row["Lease Start Date"])
              : new Date(row["Lease Start Date"]);
            const rawEnd = typeof row["Lease End Date"] === "number"
              ? excelDateToJSDate(row["Lease End Date"])
              : new Date(row["Lease End Date"]);
            const leaseStartDate = new Date(rawStart.getFullYear(), rawStart.getMonth(), 1);
            const leaseEndDate = new Date(rawEnd.getFullYear(), rawEnd.getMonth() + 1, 0);

            const newTenant = await storage.createTenant({
              firstName: String(row["Tenant First Name"]).trim(),
              lastName: String(row["Tenant Last Name"]).trim(),
              email: tenantEmail,
              phone: row["Tenant Phone Number"] ? String(row["Tenant Phone Number"]).trim() : null,
              propertyId,
              rentAmount,
              status: "active",
              moveInDate: leaseStartDate,
            });
            results.tenants.created++;

            // 4. Create lease
            const depositAmount = row["Deposit Amount"] !== undefined && row["Deposit Amount"] !== "" 
              ? String(row["Deposit Amount"]) 
              : "0";

            await storage.createLease({
              tenantId: newTenant.id,
              propertyId,
              startDate: leaseStartDate,
              endDate: leaseEndDate,
              rentAmount,
              depositAmount,
              status: "active",
            });
            results.leases.created++;

          } catch (error: any) {
            insertErrors.push({
              row: excelRowNumber,
              error: error.message || "Failed to process row",
            });
          }
        }

        if (errors.length > 0 && results.properties.created === 0 && results.tenants.created === 0) {
          return res.status(400).json({
            error: "Validation errors in uploaded file",
            errors,
          });
        }

        return res.json({
          success: true,
          results,
          errors: errors.length > 0 ? errors : undefined,
          insertErrors: insertErrors.length > 0 ? insertErrors : undefined,
        });
      }

      // Legacy format - simple property-only upload
      const requiredColumns = ["propertyCode", "name", "address", "city", "state", "zip"];
      const optionalColumns = ["entityId", "nickname", "type", "bedrooms", "bathrooms", "sqft", "description"];
      const missingColumns = requiredColumns.filter(col => !providedColumns.includes(col));

      if (missingColumns.length > 0) {
        return res.status(400).json({
          error: "Missing required columns",
          missingColumns,
          requiredColumns,
          optionalColumns,
          message: `Excel file must contain these columns: ${requiredColumns.join(", ")}. Optional: ${optionalColumns.join(", ")}`
        });
      }

      // Get all entities for validation
      const entities = await storage.getEntities();
      const entityIds = entities.map(e => e.id);
      const entityNames = new Map(entities.map(e => [e.name.toLowerCase(), e.id]));

      // Validate and prepare properties
      const validProperties: any[] = [];
      const errors: { row: number; errors: string[] }[] = [];

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const rowErrors: string[] = [];

        // Check required fields
        for (const col of requiredColumns) {
          if (!row[col] || String(row[col]).trim() === "") {
            rowErrors.push(`Missing required field: ${col}`);
          }
        }

        // Validate property type
        const propertyType = row.type ? String(row.type).trim().toLowerCase() : "house";
        if (!validPropertyTypes.includes(propertyType)) {
          rowErrors.push(`Invalid property type: ${row.type}. Must be one of: ${validPropertyTypes.join(", ")}`);
        }

        // Validate numeric fields
        if (row.bedrooms !== undefined && row.bedrooms !== "" && isNaN(parseInt(String(row.bedrooms)))) {
          rowErrors.push(`Invalid bedrooms value: ${row.bedrooms}. Must be a number.`);
        }
        if (row.bathrooms !== undefined && row.bathrooms !== "" && isNaN(parseFloat(String(row.bathrooms)))) {
          rowErrors.push(`Invalid bathrooms value: ${row.bathrooms}. Must be a number.`);
        }
        if (row.sqft !== undefined && row.sqft !== "" && isNaN(parseInt(String(row.sqft)))) {
          rowErrors.push(`Invalid sqft value: ${row.sqft}. Must be a number.`);
        }

        // Resolve entityId (can be ID or name)
        let resolvedEntityId = null;
        if (row.entityId) {
          const entityValue = String(row.entityId).trim();
          if (entityIds.includes(entityValue)) {
            resolvedEntityId = entityValue;
          } else if (entityNames.has(entityValue.toLowerCase())) {
            resolvedEntityId = entityNames.get(entityValue.toLowerCase());
          } else {
            rowErrors.push(`Entity not found: ${entityValue}`);
          }
        }

        const excelRowNumber = i + 2; // +2 for header row and 0-indexing
        
        if (rowErrors.length > 0) {
          errors.push({ row: excelRowNumber, errors: rowErrors });
        } else {
          validProperties.push({
            originalRowNumber: excelRowNumber,
            data: {
              propertyCode: String(row.propertyCode).trim(),
              name: String(row.name).trim(),
              nickname: row.nickname ? String(row.nickname).trim() : null,
              address: String(row.address).trim(),
              city: String(row.city).trim(),
              state: String(row.state).trim(),
              zip: String(row.zip).trim(),
              type: row.type ? String(row.type).trim().toLowerCase() : "house",
              bedrooms: row.bedrooms ? parseInt(String(row.bedrooms)) : 1,
              bathrooms: row.bathrooms ? String(row.bathrooms) : "1",
              sqft: row.sqft ? parseInt(String(row.sqft)) : null,
              description: row.description ? String(row.description).trim() : null,
              entityId: resolvedEntityId,
            }
          });
        }
      }

      if (errors.length > 0) {
        return res.status(400).json({
          error: "Validation errors in uploaded file",
          errors,
          validCount: validProperties.length,
          invalidCount: errors.length,
        });
      }

      // Validate each property with Zod schema before insertion
      const schemaValidatedProperties: { originalRowNumber: number; data: any }[] = [];
      const schemaErrors: { row: number; errors: string[] }[] = [];

      for (const prop of validProperties) {
        const parseResult = insertPropertySchema.safeParse(prop.data);
        if (!parseResult.success) {
          schemaErrors.push({
            row: prop.originalRowNumber,
            errors: parseResult.error.errors.map(e => `${e.path.join('.')}: ${e.message}`),
          });
        } else {
          schemaValidatedProperties.push({ 
            originalRowNumber: prop.originalRowNumber, 
            data: parseResult.data 
          });
        }
      }

      if (schemaErrors.length > 0) {
        return res.status(400).json({
          error: "Schema validation errors",
          errors: schemaErrors,
          validCount: schemaValidatedProperties.length,
          invalidCount: schemaErrors.length,
        });
      }

      // Insert all valid properties
      const createdProperties = [];
      const insertErrors: { row: number; error: string }[] = [];

      for (const prop of schemaValidatedProperties) {
        try {
          const property = await storage.createProperty(prop.data);
          createdProperties.push(property);
        } catch (error: any) {
          insertErrors.push({
            row: prop.originalRowNumber,
            error: error.message || "Failed to insert property",
          });
        }
      }

      res.json({
        success: true,
        created: createdProperties.length,
        failed: insertErrors.length,
        properties: createdProperties,
        insertErrors: insertErrors.length > 0 ? insertErrors : undefined,
      });
    } catch (error: any) {
      console.error("Error processing bulk upload:", error);
      // Handle multer errors
      if (error.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: "File too large. Maximum size is 5MB." });
      }
      if (error.message?.includes('Only Excel files')) {
        return res.status(400).json({ error: error.message });
      }
      res.status(500).json({ error: "Failed to process bulk upload" });
    }
  });

  // Admin: Download properties template
  app.get("/api/admin/properties/template", isAdminSession, async (req, res) => {
    try {
      const entities = await storage.getEntities();
      
      // Create template workbook
      const templateData = [
        {
          propertyCode: "PROP001",
          name: "Sample Property",
          nickname: "The Corner House",
          address: "123 Main Street",
          city: "Springfield",
          state: "IL",
          zip: "62701",
          type: "house",
          bedrooms: 3,
          bathrooms: "2",
          sqft: 1500,
          description: "A lovely 3-bedroom house",
          entityId: entities.length > 0 ? entities[0].name : "Entity Name or ID",
        },
      ];

      const worksheet = XLSX.utils.json_to_sheet(templateData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Properties");

      // Add instructions sheet
      // Add comprehensive format template (matches user's Excel format)
      const comprehensiveTemplateData = [
        {
          "Property Name": "711 Apt 203",
          "Address": "711 N. Pine Island Rd. Apt 203",
          "City": "Plantation",
          "State": "FL",
          "Zip": "33324",
          "Property Type": "Condo",
          "Landlord": "Sample LLC",
          "Term Type": "Annual",
          "Lease Start Date": new Date("2024-07-01"),
          "Lease End Date": new Date("2025-06-30"),
          "Deposit Amount": 1200,
          "Rent Payment Frequency": "monthly",
          "First Rent Due On Day": new Date("2024-07-01"),
          "First Rental Invoice Due On": new Date("2024-07-01"),
          "Rent Amount": 1900,
          "Tenant First Name": "John",
          "Tenant Last Name": "Doe",
          "Tenant Email Address": "john.doe@example.com",
          "Tenant Phone Number": "5551234567",
        },
      ];
      const comprehensiveSheet = XLSX.utils.json_to_sheet(comprehensiveTemplateData);
      XLSX.utils.book_append_sheet(workbook, comprehensiveSheet, "Full Import Format");

      const instructionsData = [
        { Section: "SIMPLE FORMAT", Field: "", Required: "", Description: "Use 'Properties' sheet for property-only imports" },
        { Section: "", Field: "propertyCode", Required: "Yes", Description: "Unique property identifier (e.g., PROP001)" },
        { Section: "", Field: "name", Required: "Yes", Description: "Property name" },
        { Section: "", Field: "address", Required: "Yes", Description: "Street address" },
        { Section: "", Field: "city", Required: "Yes", Description: "City name" },
        { Section: "", Field: "state", Required: "Yes", Description: "State abbreviation (e.g., IL, CA)" },
        { Section: "", Field: "zip", Required: "Yes", Description: "ZIP code" },
        { Section: "", Field: "type", Required: "No", Description: "Property type: house, condo, townhouse, commercial" },
        { Section: "", Field: "entityId", Required: "No", Description: "Entity name or ID that owns the property" },
        { Section: "", Field: "", Required: "", Description: "" },
        { Section: "FULL IMPORT FORMAT", Field: "", Required: "", Description: "Use 'Full Import Format' sheet to import properties, tenants, and leases together" },
        { Section: "", Field: "Property Name", Required: "Yes", Description: "Property name (used as identifier)" },
        { Section: "", Field: "Address", Required: "Yes", Description: "Full street address" },
        { Section: "", Field: "City", Required: "Yes", Description: "City name" },
        { Section: "", Field: "State", Required: "Yes", Description: "State abbreviation" },
        { Section: "", Field: "Zip", Required: "Yes", Description: "ZIP code" },
        { Section: "", Field: "Property Type", Required: "No", Description: "house, condo, townhouse, commercial" },
        { Section: "", Field: "Landlord", Required: "No", Description: "Entity/owner name (created if not exists)" },
        { Section: "", Field: "Lease Start Date", Required: "Yes", Description: "Lease start date" },
        { Section: "", Field: "Lease End Date", Required: "Yes", Description: "Lease end date" },
        { Section: "", Field: "Deposit Amount", Required: "No", Description: "Security deposit amount" },
        { Section: "", Field: "Rent Amount", Required: "Yes", Description: "Monthly rent amount" },
        { Section: "", Field: "Tenant First Name", Required: "Yes", Description: "Tenant's first name" },
        { Section: "", Field: "Tenant Last Name", Required: "Yes", Description: "Tenant's last name" },
        { Section: "", Field: "Tenant Email Address", Required: "Yes", Description: "Tenant's email address" },
        { Section: "", Field: "Tenant Phone Number", Required: "No", Description: "Tenant's phone number" },
      ];
      const instructionsSheet = XLSX.utils.json_to_sheet(instructionsData);
      XLSX.utils.book_append_sheet(workbook, instructionsSheet, "Instructions");

      // Add entities reference sheet
      if (entities.length > 0) {
        const entitiesData = entities.map(e => ({
          "Entity ID": e.id,
          "Entity Name": e.name,
        }));
        const entitiesSheet = XLSX.utils.json_to_sheet(entitiesData);
        XLSX.utils.book_append_sheet(workbook, entitiesSheet, "Available Entities");
      }

      const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", "attachment; filename=properties_template.xlsx");
      res.send(buffer);
    } catch (error) {
      console.error("Error generating template:", error);
      res.status(500).json({ error: "Failed to generate template" });
    }
  });

  // Admin: Update property
  app.patch("/api/admin/properties/:id", isAdminSession, async (req, res) => {
    try {
      const { id } = req.params;
      const data = insertPropertySchema.partial().parse(req.body);
      const property = await storage.updateProperty(id, data);
      if (!property) {
        return res.status(404).json({ error: "Property not found" });
      }
      res.json(property);
    } catch (error) {
      console.error("Error updating property:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid property data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to update property" });
    }
  });

  // Admin: Delete property
  app.delete("/api/admin/properties/:id", isAdminSession, async (req, res) => {
    try {
      const { id } = req.params;
      const success = await storage.deleteProperty(id);
      if (!success) {
        return res.status(404).json({ error: "Property not found" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting property:", error);
      res.status(500).json({ error: "Failed to delete property" });
    }
  });

  // Admin: Get all tenants
  app.get("/api/admin/tenants", isAdminSession, async (req, res) => {
    try {
      const tenants = await storage.getTenants();
      res.json(tenants);
    } catch (error) {
      console.error("Error fetching tenants:", error);
      res.status(500).json({ error: "Failed to fetch tenants" });
    }
  });

  // Admin: Create tenant
  app.post("/api/admin/tenants", isAdminSession, async (req, res) => {
    try {
      const body = { ...req.body };
      if (body.moveInDate && typeof body.moveInDate === "string") {
        body.moveInDate = new Date(body.moveInDate);
      }
      if (body.moveOutDate && typeof body.moveOutDate === "string") {
        body.moveOutDate = new Date(body.moveOutDate);
      }
      const data = insertTenantSchema.parse(body);
      const tenant = await storage.createTenant(data);
      res.json(tenant);
    } catch (error) {
      console.error("Error creating tenant:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid tenant data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create tenant" });
    }
  });

  // Admin: Update tenant
  app.patch("/api/admin/tenants/:id", isAdminSession, async (req, res) => {
    try {
      const { id } = req.params;
      const body = { ...req.body };
      if (body.moveInDate && typeof body.moveInDate === "string") {
        body.moveInDate = new Date(body.moveInDate);
      }
      if (body.moveOutDate && typeof body.moveOutDate === "string") {
        body.moveOutDate = new Date(body.moveOutDate);
      }
      const data = insertTenantSchema.partial().parse(body);
      const tenant = await storage.updateTenant(id, data);
      if (!tenant) {
        return res.status(404).json({ error: "Tenant not found" });
      }
      res.json(tenant);
    } catch (error) {
      console.error("Error updating tenant:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid tenant data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to update tenant" });
    }
  });

  // Admin: Delete tenant
  app.delete("/api/admin/tenants/:id", isAdminSession, async (req, res) => {
    try {
      const { id } = req.params;
      const success = await storage.deleteTenant(id);
      if (!success) {
        return res.status(404).json({ error: "Tenant not found" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting tenant:", error);
      res.status(500).json({ error: "Failed to delete tenant" });
    }
  });

  // Admin: Get single property with details
  app.get("/api/admin/properties/:id", isAdminSession, async (req, res) => {
    try {
      const { id } = req.params;
      const property = await storage.getProperty(id);
      if (!property) {
        return res.status(404).json({ error: "Property not found" });
      }
      const leases = await storage.getLeasesByProperty(id);
      const units = await storage.getUnits(id);
      res.json({ ...property, leases, units });
    } catch (error) {
      console.error("Error fetching property:", error);
      res.status(500).json({ error: "Failed to fetch property" });
    }
  });

  // Admin: Get all leases with property and tenant details
  app.get("/api/admin/leases", isAdminSession, async (req, res) => {
    try {
      const leases = await storage.getLeases();
      const properties = await storage.getProperties();
      const tenants = await storage.getTenants();
      const allEntities = await storage.getEntities();
      
      const leasesWithDetails = leases.map(lease => {
        const property = properties.find(p => p.id === lease.propertyId);
        const entity = property?.entityId ? allEntities.find(e => e.id === property.entityId) : undefined;
        return {
          ...lease,
          property: property ? { ...property, entity } : undefined,
          tenant: tenants.find(t => t.id === lease.tenantId),
        };
      });
      
      res.json(leasesWithDetails);
    } catch (error) {
      console.error("Error fetching all leases:", error);
      res.status(500).json({ error: "Failed to fetch leases" });
    }
  });

  // Admin: Get leases for a property
  app.get("/api/admin/properties/:propertyId/leases", isAdminSession, async (req, res) => {
    try {
      const { propertyId } = req.params;
      const leases = await storage.getLeasesByProperty(propertyId);
      res.json(leases);
    } catch (error) {
      console.error("Error fetching leases:", error);
      res.status(500).json({ error: "Failed to fetch leases" });
    }
  });

  // Admin: Create lease
  async function updatePropertyOccupancy(_propertyId: string) {
  }

  app.post("/api/admin/leases", isAdminSession, async (req, res) => {
    try {
      const body = {
        ...req.body,
        startDate: req.body.startDate ? new Date(req.body.startDate) : undefined,
        endDate: req.body.endDate ? new Date(req.body.endDate) : undefined,
        rentAmount: req.body.rentAmount?.toString(),
        depositAmount: req.body.depositAmount?.toString(),
        lastMonthRent: req.body.lastMonthRent !== undefined ? (req.body.lastMonthRent !== null && req.body.lastMonthRent !== '' ? req.body.lastMonthRent.toString() : null) : undefined,
      };
      const data = insertLeaseSchema.parse(body);
      const lease = await storage.createLease(data);
      await updatePropertyOccupancy(lease.propertyId);
      res.json(lease);
    } catch (error) {
      console.error("Error creating lease:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid lease data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create lease" });
    }
  });

  // Admin: Update lease
  app.patch("/api/admin/leases/:id", isAdminSession, async (req, res) => {
    try {
      const { id } = req.params;
      const existingLease = await storage.getLease(id);
      const updateData: Record<string, any> = {};
      if (req.body.propertyId) updateData.propertyId = req.body.propertyId;
      if (req.body.tenantId) updateData.tenantId = req.body.tenantId;
      if (req.body.unitId !== undefined) updateData.unitId = req.body.unitId || null;
      if (req.body.startDate) {
        const d = new Date(req.body.startDate);
        if (isNaN(d.getTime())) return res.status(400).json({ error: "Invalid start date" });
        updateData.startDate = d;
      }
      if (req.body.endDate) {
        const d = new Date(req.body.endDate);
        if (isNaN(d.getTime())) return res.status(400).json({ error: "Invalid end date" });
        updateData.endDate = d;
      }
      if (req.body.rentAmount !== undefined) updateData.rentAmount = req.body.rentAmount.toString();
      if (req.body.depositAmount !== undefined) updateData.depositAmount = req.body.depositAmount.toString();
      if (req.body.lastMonthRent !== undefined) updateData.lastMonthRent = req.body.lastMonthRent !== null && req.body.lastMonthRent !== '' ? req.body.lastMonthRent.toString() : null;
      if (req.body.leaseType) updateData.leaseType = req.body.leaseType;
      if (req.body.status) updateData.status = req.body.status;
      if (req.body.lateFeeRate !== undefined) updateData.lateFeeRate = req.body.lateFeeRate.toString();
      if (req.body.lateFeeGraceDays !== undefined) updateData.lateFeeGraceDays = parseInt(req.body.lateFeeGraceDays);
      if (req.body.leaseFileId !== undefined) updateData.leaseFileId = req.body.leaseFileId || null;
      
      const lease = await storage.updateLease(id, updateData);
      if (!lease) {
        return res.status(404).json({ error: "Lease not found" });
      }
      await updatePropertyOccupancy(lease.propertyId);
      if (existingLease && existingLease.propertyId !== lease.propertyId) {
        await updatePropertyOccupancy(existingLease.propertyId);
      }
      res.json(lease);
    } catch (error) {
      console.error("Error updating lease:", error);
      res.status(500).json({ error: "Failed to update lease" });
    }
  });

  // Admin: Delete lease
  app.delete("/api/admin/leases/:id", isAdminSession, async (req, res) => {
    try {
      const { id } = req.params;
      const lease = await storage.getLease(id);
      if (!lease) {
        return res.status(404).json({ error: "Lease not found" });
      }
      const success = await storage.deleteLease(id);
      if (!success) {
        return res.status(404).json({ error: "Lease not found" });
      }
      await updatePropertyOccupancy(lease.propertyId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting lease:", error);
      res.status(500).json({ error: "Failed to delete lease" });
    }
  });

  // Admin: Get lease document status for a lease
  app.get("/api/admin/leases/:id/document", isAdminSession, async (req, res) => {
    try {
      const doc = await storage.getLeaseDocumentByLeaseId(req.params.id);
      if (!doc) {
        return res.json({ hasDocument: false });
      }
      res.json({
        hasDocument: true,
        documentId: doc.id,
        status: doc.status,
        tenantSigningToken: doc.tenantSigningToken,
        landlordSigned: !!doc.landlordSignature,
        tenantSigned: !!doc.tenantSignature,
      });
    } catch (error) {
      console.error("Error fetching lease document:", error);
      res.status(500).json({ error: "Failed to fetch lease document" });
    }
  });

  // Admin: Send lease via email
  app.post("/api/admin/leases/:id/send", isAdminSession, async (req, res) => {
    try {
      const { id: leaseId } = req.params;
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ error: "Email address is required" });
      }

      const lease = await storage.getLease(leaseId);
      if (!lease) {
        return res.status(404).json({ error: "Lease not found" });
      }

      const property = lease.propertyId ? await storage.getProperty(lease.propertyId) : null;
      const tenant = lease.tenantId ? await storage.getTenant(lease.tenantId) : null;

      const propertyName = property?.name || "Unknown Property";
      const propertyAddress = property
        ? `${property.address}, ${property.city}, ${property.state} ${property.zip}`
        : "N/A";
      const tenantName = tenant
        ? `${tenant.firstName} ${tenant.lastName}`
        : "Unknown Tenant";

      const formatDate = (dateStr: string) => {
        const d = new Date(dateStr);
        return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
      };

      const leaseDoc = await storage.getLeaseDocumentByLeaseId(leaseId);
      let signingUrl: string | undefined;
      if (leaseDoc?.tenantSigningToken && !leaseDoc.tenantSignature) {
        const host = req.headers.host || "localhost:5000";
        const protocol = req.headers["x-forwarded-proto"] || (host.includes("localhost") ? "http" : "https");
        signingUrl = `${protocol}://${host}/sign-lease/${leaseDoc.tenantSigningToken}`;
      }

      const emailResult = await sendLeaseEmail({
        recipientEmail: email,
        recipientName: tenantName,
        propertyName,
        propertyAddress,
        tenantName,
        unitNumber: lease.unitId || undefined,
        leaseType: lease.leaseType || "annual",
        startDate: formatDate(lease.startDate),
        endDate: formatDate(lease.endDate),
        rentAmount: lease.rentAmount?.toString() || "0",
        depositAmount: lease.depositAmount?.toString() || undefined,
        status: lease.status || "active",
        signingUrl,
      });

      if (!emailResult.success) {
        return res.status(500).json({ error: "Failed to send lease email", details: emailResult.error });
      }

      const message = signingUrl 
        ? `Lease with signing link sent to ${email}` 
        : `Lease details sent to ${email} (no lease document created yet - create one to include signing link)`;
      res.json({ success: true, message, hasSigningLink: !!signingUrl });
    } catch (error) {
      console.error("Error sending lease email:", error);
      res.status(500).json({ error: "Failed to send lease email" });
    }
  });

  // Admin: Send tenant invite
  app.post("/api/admin/tenants/:id/invite", isAdminSession, async (req, res) => {
    try {
      const { id: tenantId } = req.params;
      
      const tenant = await storage.getTenant(tenantId);
      if (!tenant) {
        return res.status(404).json({ error: "Tenant not found" });
      }

      if (tenant.userId) {
        return res.status(400).json({ error: "Tenant already has an account" });
      }

      const property = tenant.propertyId ? await storage.getProperty(tenant.propertyId) : null;
      const propertyAddress = property 
        ? `${property.address}, ${property.city}, ${property.state} ${property.zip}`
        : "Your rental property";

      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      const invitation = await storage.createTenantInvitation({
        tenantId,
        token,
        email: tenant.email,
        status: "pending",
        expiresAt,
      });

      const baseUrl = `${req.protocol}://${req.get("host")}`;
      const inviteLink = `${baseUrl}/invite/${token}`;

      const emailResult = await sendTenantInviteEmail({
        tenantEmail: tenant.email,
        tenantName: `${tenant.firstName} ${tenant.lastName}`,
        propertyAddress,
        inviteLink,
      });

      if (!emailResult.success) {
        return res.status(500).json({ error: "Failed to send invite email", details: emailResult.error });
      }

      res.json({ 
        success: true, 
        message: `Invitation sent to ${tenant.email}`,
        invitationId: invitation.id
      });
    } catch (error) {
      console.error("Error sending tenant invite:", error);
      res.status(500).json({ error: "Failed to send invite" });
    }
  });

  // Public: Validate invite token
  app.get("/api/invite/:token", async (req, res) => {
    try {
      const { token } = req.params;
      const invitation = await storage.getTenantInvitationByToken(token);
      
      if (!invitation) {
        return res.status(404).json({ error: "Invalid invitation" });
      }

      if (invitation.status !== "pending") {
        return res.status(400).json({ error: "Invitation already used" });
      }

      if (new Date() > new Date(invitation.expiresAt)) {
        return res.status(400).json({ error: "Invitation expired" });
      }

      const tenant = await storage.getTenant(invitation.tenantId);
      if (!tenant) {
        return res.status(404).json({ error: "Tenant not found" });
      }

      const property = tenant.propertyId ? await storage.getProperty(tenant.propertyId) : null;

      res.json({
        valid: true,
        tenantName: `${tenant.firstName} ${tenant.lastName}`,
        tenantEmail: tenant.email,
        propertyAddress: property 
          ? `${property.address}, ${property.city}, ${property.state} ${property.zip}`
          : null,
      });
    } catch (error) {
      console.error("Error validating invite:", error);
      res.status(500).json({ error: "Failed to validate invite" });
    }
  });

  // Public: Accept invite and link tenant to user account
  app.post("/api/invite/:token/accept", isAuthenticated, async (req, res) => {
    try {
      const { token } = req.params;
      const userId = (req as any).user?.claims?.sub;
      
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const invitation = await storage.getTenantInvitationByToken(token);
      
      if (!invitation) {
        return res.status(404).json({ error: "Invalid invitation" });
      }

      if (invitation.status !== "pending") {
        return res.status(400).json({ error: "Invitation already used" });
      }

      if (new Date() > new Date(invitation.expiresAt)) {
        return res.status(400).json({ error: "Invitation expired" });
      }

      const tenant = await storage.getTenant(invitation.tenantId);
      if (!tenant) {
        return res.status(404).json({ error: "Tenant not found" });
      }

      if (tenant.userId) {
        return res.status(400).json({ error: "Tenant already has an account" });
      }

      await storage.updateTenant(invitation.tenantId, { userId, status: "active" });
      await storage.updateTenantInvitation(invitation.id, { 
        status: "accepted", 
        usedAt: new Date() 
      });

      let profile = await storage.getUserProfile(userId);
      if (!profile) {
        await storage.createUserProfile({ userId, role: "TENANT" });
      } else if (profile.role !== "TENANT") {
        await storage.updateUserProfile(userId, { role: "TENANT" });
      }

      res.json({ 
        success: true, 
        message: "Account linked successfully",
        tenantId: tenant.id
      });
    } catch (error) {
      console.error("Error accepting invite:", error);
      res.status(500).json({ error: "Failed to accept invite" });
    }
  });

  // Admin: Get all maintenance requests
  app.get("/api/admin/maintenance", isAdminSession, async (req, res) => {
    try {
      const requests = await storage.getMaintenanceRequests();
      const allTenants = await storage.getTenants();
      const enriched = await Promise.all(requests.map(async (r) => {
        let updated = { ...r };
        let tenant = null;
        if (r.tenantId) {
          tenant = allTenants.find(t => t.id === r.tenantId) || null;
        }
        if (!tenant && r.name) {
          const nameParts = r.name.trim().split(/\s+/);
          if (nameParts.length >= 2) {
            tenant = allTenants.find(t => 
              t.firstName.toLowerCase() === nameParts[0].toLowerCase() && 
              t.lastName.toLowerCase() === nameParts.slice(1).join(' ').toLowerCase()
            ) || null;
          }
        }
        if (!tenant && r.email) {
          tenant = allTenants.find(t => t.email.toLowerCase() === r.email?.toLowerCase()) || null;
        }
        if (tenant) {
          if (!updated.phone && tenant.phone) {
            updated.phone = tenant.phone;
          }
          if (!updated.propertyAddress && tenant.propertyId) {
            const property = await storage.getProperty(tenant.propertyId);
            if (property) {
              updated.propertyAddress = property.address || property.name || null;
            }
          }
        }
        return updated;
      }));
      res.json(enriched);
    } catch (error) {
      console.error("Error fetching maintenance requests:", error);
      res.status(500).json({ error: "Failed to fetch requests" });
    }
  });

  // Admin: Get recent maintenance
  app.get("/api/admin/maintenance/recent", isAdminSession, async (req, res) => {
    try {
      const requests = await storage.getMaintenanceRequests();
      res.json(requests.slice(0, 10));
    } catch (error) {
      console.error("Error fetching maintenance requests:", error);
      res.status(500).json({ error: "Failed to fetch requests" });
    }
  });

  // Admin: Update maintenance request with validation
  app.patch("/api/admin/maintenance/:id", isAdminSession, async (req, res) => {
    try {
      const { id } = req.params;
      const validationSchema = z.object({
        status: z.enum(["submitted", "in_progress", "completed", "cancelled"]).optional(),
        priority: z.enum(["low", "medium", "high", "emergency"]).optional(),
        name: z.string().optional(),
        email: z.string().optional(),
        phone: z.string().optional(),
        propertyAddress: z.string().optional(),
        unitLabel: z.string().optional(),
        category: z.string().optional(),
        description: z.string().optional(),
        entryPermission: z.boolean().optional(),
        hasPets: z.boolean().optional(),
      });
      
      const data = validationSchema.parse(req.body);
      const request = await storage.updateMaintenanceRequest(id, data);
      if (!request) {
        return res.status(404).json({ error: "Request not found" });
      }
      res.json(request);
    } catch (error) {
      console.error("Error updating maintenance request:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to update request" });
    }
  });

  app.get("/api/admin/maintenance/:id/messages", isAdminSession, async (req, res) => {
    try {
      const messages = await storage.getMaintenanceMessages(req.params.id);
      res.json(messages);
    } catch (error) {
      console.error("Error fetching maintenance messages:", error);
      res.status(500).json({ error: "Failed to fetch messages" });
    }
  });

  app.post("/api/admin/maintenance/:id/messages", isAdminSession, async (req, res) => {
    try {
      const { message } = req.body;
      if (!message || !message.trim()) {
        return res.status(400).json({ error: "Message is required" });
      }
      const newMessage = await storage.createMaintenanceMessage({
        requestId: req.params.id,
        senderType: "admin",
        senderUserId: null,
        message: message.trim(),
      });
      res.json(newMessage);
    } catch (error) {
      console.error("Error creating maintenance message:", error);
      res.status(500).json({ error: "Failed to send message" });
    }
  });

  app.delete("/api/admin/maintenance/:id", isAdminSession, async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteMaintenanceRequest(id);
      if (!deleted) {
        return res.status(404).json({ error: "Request not found" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting maintenance request:", error);
      res.status(500).json({ error: "Failed to delete request" });
    }
  });

  // Admin: Get all applications
  app.get("/api/admin/applications", isAdminSession, async (req, res) => {
    try {
      const applications = await storage.getApplications();
      res.json(applications);
    } catch (error) {
      console.error("Error fetching applications:", error);
      res.status(500).json({ error: "Failed to fetch applications" });
    }
  });

  // Admin: Get recent applications
  app.get("/api/admin/applications/recent", isAdminSession, async (req, res) => {
    try {
      const applications = await storage.getApplications();
      res.json(applications.slice(0, 10));
    } catch (error) {
      console.error("Error fetching applications:", error);
      res.status(500).json({ error: "Failed to fetch applications" });
    }
  });

  app.get("/api/admin/files", isAdminSession, async (req, res) => {
    try {
      const files = await storage.getFiles();
      const result = files.map(f => ({
        ...f,
        hasFileData: !!f.fileData,
        fileData: undefined,
      }));
      res.json(result);
    } catch (error) {
      console.error("Error fetching files:", error);
      res.status(500).json({ error: "Failed to fetch files" });
    }
  });

  const documentUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 50 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      const allowedTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
      ];
      const allowedExts = /\.(pdf|doc|docx|xls|xlsx|jpg|jpeg|png|gif|webp)$/i;
      if (allowedTypes.includes(file.mimetype) || allowedExts.test(file.originalname)) {
        cb(null, true);
      } else {
        cb(new Error(`File type not allowed: ${file.mimetype}`));
      }
    },
  });

  app.post("/api/admin/files/upload", isAdminSession, (req, res, next) => {
    documentUpload.single("file")(req, res, (err: any) => {
      if (err) {
        return res.status(400).json({ error: err.message || "File upload failed" });
      }
      next();
    });
  }, async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }
      
      const { ownerType = "general", ownerId = "admin", leaseId } = req.body;
      
      const storageKey = `documents/${Date.now()}_${req.file.originalname}`;
      const base64Content = req.file.buffer.toString("base64");
      
      const fileRecord = {
        ownerType: leaseId ? "lease" : ownerType,
        ownerId: leaseId || ownerId,
        filename: req.file.originalname,
        mimeType: req.file.mimetype,
        size: req.file.size,
        storageKey,
        fileData: base64Content,
        tags: [],
        uploadedByUserId: null,
      };
      
      const file = await storage.createFile(fileRecord);
      res.json(file);
    } catch (error) {
      console.error("Error uploading file:", error);
      res.status(500).json({ error: "Failed to upload file" });
    }
  });

  // Admin: Download file
  app.get("/api/admin/files/:id/download", isAdminSession, async (req, res) => {
    try {
      const file = await storage.getFile(req.params.id);
      if (!file) {
        return res.status(404).json({ error: "File not found" });
      }
      
      const forceAttachment = req.query.attachment === "true";
      const inlineTypes = ["application/pdf", "image/png", "image/jpeg", "image/gif", "image/webp", "text/plain", "text/html"];
      const disposition = forceAttachment ? "attachment" : (inlineTypes.includes(file.mimeType || "") ? "inline" : "attachment");
      res.setHeader("Content-Disposition", `${disposition}; filename="${file.filename}"`);
      res.setHeader("Content-Type", file.mimeType || "application/octet-stream");

      if (file.fileData) {
        const buffer = Buffer.from(file.fileData, "base64");
        res.setHeader("Content-Length", String(buffer.length));
        return res.send(buffer);
      }

      const filePath = path.join(process.cwd(), "uploads", file.storageKey);
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: "File not found. Please re-upload this document." });
      }
      res.sendFile(filePath);
    } catch (error) {
      console.error("Error downloading file:", error);
      res.status(500).json({ error: "Failed to download file" });
    }
  });

  app.post("/api/admin/files/:id/reupload", isAdminSession, (req, res, next) => {
    documentUpload.single("file")(req, res, (err: any) => {
      if (err) return res.status(400).json({ error: err.message || "File upload failed" });
      next();
    });
  }, async (req, res) => {
    try {
      const file = await storage.getFile(req.params.id);
      if (!file) {
        return res.status(404).json({ error: "File not found" });
      }
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }
      const base64Content = req.file.buffer.toString("base64");
      const updated = await storage.updateFile(req.params.id, {
        fileData: base64Content,
        size: req.file.size,
        mimeType: req.file.mimetype,
      });
      res.json(updated);
    } catch (error) {
      console.error("Error re-uploading file:", error);
      res.status(500).json({ error: "Failed to re-upload file" });
    }
  });

  app.get("/api/admin/files/:id/html", isAdminSession, async (req, res) => {
    try {
      const file = await storage.getFile(req.params.id);
      if (!file) {
        return res.status(404).json({ error: "File not found" });
      }

      const isWord = file.mimeType?.includes("word") || file.mimeType?.includes("document") ||
        file.filename.endsWith(".docx") || file.filename.endsWith(".doc");
      if (!isWord) {
        return res.status(400).json({ error: "Only Word documents can be converted to HTML" });
      }

      const mammothOptions = {
        styleMap: [
          "u => u",
        ],
        convertImage: mammoth.images.inline((element: any) => {
          return element.read("base64").then((imageBuffer: string) => {
            return { src: `data:${element.contentType};base64,${imageBuffer}` };
          });
        }),
        includeDefaultStyleMap: true,
      };

      let rawResult;
      if (file.fileData) {
        const buffer = Buffer.from(file.fileData, "base64");
        rawResult = await mammoth.convertToHtml({ buffer }, mammothOptions);
      } else {
        const filePath = path.join(process.cwd(), "uploads", file.storageKey);
        if (!fs.existsSync(filePath)) {
          return res.status(404).json({ error: "File not found. Please re-upload this document." });
        }
        rawResult = await mammoth.convertToHtml({ path: filePath }, mammothOptions);
      }

      let html = rawResult.value;

      if (file.fileData) {
        try {
          const JSZip = (await import("jszip")).default;
          const buffer = Buffer.from(file.fileData, "base64");
          const zip = await JSZip.loadAsync(buffer);
          const docXml = await zip.file("word/document.xml")?.async("string");
          if (docXml) {
            const redTexts: string[] = [];
            const runRegex = /<w:r\b[^>]*>([\s\S]*?)<\/w:r>/g;
            let runMatch;
            while ((runMatch = runRegex.exec(docXml)) !== null) {
              const runContent = runMatch[1];
              const hasRedColor = /color\s*w:val="(FF0000|ff0000|FF0101|ff0101|FF3333|ff3333|C00000|c00000|CC0000|cc0000|FF1111|ff1111|EE0000|ee0000|DD0000|dd0000|BB0000|bb0000|AA0000|aa0000|990000|880000|770000|660000|550000|E00000|e00000|D00000|d00000|B00000|b00000|A00000|a00000|F00000|f00000)"/.test(runContent);
              if (hasRedColor) {
                const textMatch = runContent.match(/<w:t[^>]*>([\s\S]*?)<\/w:t>/);
                if (textMatch && textMatch[1].trim()) {
                  redTexts.push(textMatch[1].trim());
                }
              }
            }
            for (const redText of redTexts) {
              const escaped = redText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
              const regex = new RegExp(`(?<!data-red-field)>(${escaped})`, 'g');
              html = html.replace(regex, (match, text) => {
                return `><span data-red-field="true" style="color:#FF0000">${text}</span>`;
              });
            }
          }
        } catch (e) {
          console.log("Could not parse docx for red text detection:", e);
        }
      }

      res.json({ html, filename: file.filename });
    } catch (error) {
      console.error("Error converting file to HTML:", error);
      res.status(500).json({ error: "Failed to convert file" });
    }
  });

  // Admin: Update file (rename)
  app.patch("/api/admin/files/:id", isAdminSession, async (req, res) => {
    try {
      const { id } = req.params;
      const { filename } = req.body;
      if (!filename || typeof filename !== "string") {
        return res.status(400).json({ error: "Filename is required" });
      }
      const file = await storage.updateFile(id, { filename: filename.trim() });
      if (!file) {
        return res.status(404).json({ error: "File not found" });
      }
      res.json(file);
    } catch (error) {
      console.error("Error updating file:", error);
      res.status(500).json({ error: "Failed to update file" });
    }
  });

  // Admin: Delete file
  app.delete("/api/admin/files/:id", isAdminSession, async (req, res) => {
    try {
      const { id } = req.params;
      const success = await storage.deleteFile(id);
      if (!success) {
        return res.status(404).json({ error: "File not found" });
      }
      res.json({ message: "File deleted successfully" });
    } catch (error) {
      console.error("Error deleting file:", error);
      res.status(500).json({ error: "Failed to delete file" });
    }
  });

  // ========== ADMIN STAFF USER MANAGEMENT ==========
  
  // Admin: Get all admin staff users
  app.get("/api/admin/staff", isAdminSession, async (req, res) => {
    try {
      const adminUsersList = await storage.getAdminUsers();
      // Remove passwords from response
      const safeUsers = adminUsersList.map(({ password, ...user }) => user);
      res.json(safeUsers);
    } catch (error) {
      console.error("Error fetching admin staff:", error);
      res.status(500).json({ error: "Failed to fetch admin staff" });
    }
  });

  // Admin: Create admin staff user
  app.post("/api/admin/staff", isAdminSession, async (req, res) => {
    try {
      const { email, password, firstName, lastName, role } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required" });
      }

      // Check if user already exists
      const existingUser = await storage.getAdminUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ error: "A user with this email already exists" });
      }

      // Hash the password
      const hashedPassword = await bcrypt.hash(password, 10);
      
      const newUser = await storage.createAdminUser({
        email,
        password: hashedPassword,
        firstName: firstName || null,
        lastName: lastName || null,
        role: role || "READ_ONLY",
        mustChangePassword: true,
        status: "active",
      });

      // Return without password
      const { password: _, ...safeUser } = newUser;
      res.json(safeUser);
    } catch (error) {
      console.error("Error creating admin staff:", error);
      res.status(500).json({ error: "Failed to create admin staff user" });
    }
  });

  // Admin: Update admin staff user
  app.patch("/api/admin/staff/:id", isAdminSession, async (req, res) => {
    try {
      const { id } = req.params;
      const { email, password, firstName, lastName, role, status } = req.body;

      const updateData: Record<string, any> = {};
      if (email !== undefined) updateData.email = email;
      if (firstName !== undefined) updateData.firstName = firstName;
      if (lastName !== undefined) updateData.lastName = lastName;
      if (role !== undefined) updateData.role = role;
      if (status !== undefined) updateData.status = status;
      
      // If password is provided, hash it
      if (password) {
        updateData.password = await bcrypt.hash(password, 10);
        updateData.mustChangePassword = false;
      }

      const updatedUser = await storage.updateAdminUser(id, updateData);
      if (!updatedUser) {
        return res.status(404).json({ error: "Admin user not found" });
      }

      // Return without password
      const { password: _, ...safeUser } = updatedUser;
      res.json(safeUser);
    } catch (error) {
      console.error("Error updating admin staff:", error);
      res.status(500).json({ error: "Failed to update admin staff user" });
    }
  });

  // Admin: Delete admin staff user
  app.delete("/api/admin/staff/:id", isAdminSession, async (req, res) => {
    try {
      const { id } = req.params;
      
      // Prevent deleting yourself
      if (req.session?.adminUser?.id === id) {
        return res.status(400).json({ error: "You cannot delete your own account" });
      }

      const success = await storage.deleteAdminUser(id);
      if (!success) {
        return res.status(404).json({ error: "Admin user not found" });
      }

      res.json({ message: "Admin user deleted successfully" });
    } catch (error) {
      console.error("Error deleting admin staff:", error);
      res.status(500).json({ error: "Failed to delete admin staff user" });
    }
  });

  // Admin: Get all users
  app.get("/api/admin/users", isAdminSession, async (req, res) => {
    try {
      const users = await storage.getUsers();
      const usersWithProfiles = await Promise.all(
        users.map(async (user) => {
          const profile = await storage.getUserProfile(user.id);
          return { ...user, profile };
        })
      );
      res.json(usersWithProfiles);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  // Admin: Update user role with validation
  app.patch("/api/admin/users/:id/role", isAdminSession, async (req, res) => {
    try {
      const { id } = req.params;
      const validationSchema = z.object({
        role: z.enum(["ADMIN", "MANAGER", "MAINTENANCE", "ACCOUNTING", "READ_ONLY", "TENANT", "APPLICANT"]),
      });
      
      const { role } = validationSchema.parse(req.body);

      let profile = await storage.getUserProfile(id);
      if (!profile) {
        profile = await storage.createUserProfile({ userId: id, role });
      } else {
        profile = await storage.updateUserProfile(id, { role });
      }
      
      res.json(profile);
    } catch (error) {
      console.error("Error updating user role:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid role", details: error.errors });
      }
      res.status(500).json({ error: "Failed to update role" });
    }
  });

  // Serve property images publicly
  app.get("/uploads/property-images/:filename", (req, res) => {
    const filePath = path.join(process.cwd(), "uploads/property-images", req.params.filename);
    if (fs.existsSync(filePath)) {
      res.sendFile(filePath);
    } else {
      res.status(404).json({ error: "Image not found" });
    }
  });

  // ========== ASSOCIATION APPLICATIONS (Public) ==========

  app.get("/api/public/association-applications", (req, res) => {
    const dir = path.join(process.cwd(), "uploads/association-applications");
    if (!fs.existsSync(dir)) {
      return res.json([]);
    }
    const files = fs.readdirSync(dir).filter(f => f.endsWith(".pdf"));
    const applications = files.map(filename => ({
      name: filename.replace(/_/g, " ").replace(".pdf", ""),
      filename,
      downloadUrl: `/uploads/association-applications/${encodeURIComponent(filename)}`,
    }));
    res.json(applications);
  });

  app.get("/uploads/association-applications/:filename", (req, res) => {
    const sanitized = path.basename(req.params.filename);
    if (sanitized !== req.params.filename || !sanitized.endsWith(".pdf")) {
      return res.status(400).json({ error: "Invalid filename" });
    }
    const filePath = path.join(process.cwd(), "uploads/association-applications", sanitized);
    if (fs.existsSync(filePath)) {
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `inline; filename="${sanitized}"`);
      res.sendFile(filePath);
    } else {
      res.status(404).json({ error: "Application not found" });
    }
  });

  // ========== PUBLIC PROPERTY SEARCH (Website) ==========
  
  // Get property by ID (public endpoint - path param for default fetcher)
  app.get("/api/public/properties/:propertyId", async (req, res) => {
    try {
      const { propertyId } = req.params;
      if (!propertyId) {
        return res.status(400).json({ error: "Property ID is required" });
      }
      
      const property = await storage.getPublicPropertyByPropertyId(propertyId.trim());
      if (!property) {
        return res.status(404).json({ error: "Property not found" });
      }
      
      res.json(property);
    } catch (error) {
      console.error("Error fetching property:", error);
      res.status(500).json({ error: "Failed to fetch property" });
    }
  });
  
  // Search property by ID (public endpoint - query param version)
  app.get("/api/public/properties/search", async (req, res) => {
    try {
      const { propertyId } = req.query;
      if (!propertyId || typeof propertyId !== "string") {
        return res.status(400).json({ error: "Property ID is required" });
      }
      
      const property = await storage.getPublicPropertyByPropertyId(propertyId.trim());
      if (!property) {
        return res.status(404).json({ error: "Property not found" });
      }
      
      res.json(property);
    } catch (error) {
      console.error("Error searching property:", error);
      res.status(500).json({ error: "Failed to search property" });
    }
  });
  
  // Get public property images by property code (admin)
  app.get("/api/admin/property-images-by-code/:propertyCode", isAdminSession, async (req, res) => {
    try {
      const code = req.params.propertyCode;
      let property = await storage.getPublicPropertyByPropertyId(code);
      if (!property) {
        const base = code.split("-")[0];
        if (base !== code) {
          property = await storage.getPublicPropertyByPropertyId(base);
        }
      }
      if (!property) {
        const numericPrefix = code.match(/^(\d+)/)?.[1];
        if (numericPrefix && numericPrefix !== code) {
          property = await storage.getPublicPropertyByPropertyId(numericPrefix);
        }
      }
      res.json({ images: property?.images || [] });
    } catch (error) {
      res.json({ images: [] });
    }
  });

  // Get all public properties (admin only)
  app.get("/api/admin/public-properties", isAdminSession, async (req, res) => {
    try {
      const properties = await storage.getPublicProperties();
      res.json(properties);
    } catch (error) {
      console.error("Error fetching public properties:", error);
      res.status(500).json({ error: "Failed to fetch public properties" });
    }
  });
  
  // Get single public property (admin)
  app.get("/api/admin/public-properties/:id", isAdminSession, async (req, res) => {
    try {
      const property = await storage.getPublicProperty(req.params.id);
      if (!property) {
        return res.status(404).json({ error: "Property not found" });
      }
      res.json(property);
    } catch (error) {
      console.error("Error fetching public property:", error);
      res.status(500).json({ error: "Failed to fetch public property" });
    }
  });
  
  // Create public property (admin)
  app.post("/api/admin/public-properties", isAdminSession, async (req, res) => {
    try {
      const property = await storage.createPublicProperty(req.body);
      res.status(201).json(property);
    } catch (error) {
      console.error("Error creating public property:", error);
      res.status(500).json({ error: "Failed to create public property" });
    }
  });
  
  // Update public property (admin)
  app.patch("/api/admin/public-properties/:id", isAdminSession, async (req, res) => {
    try {
      const property = await storage.updatePublicProperty(req.params.id, req.body);
      if (!property) {
        return res.status(404).json({ error: "Property not found" });
      }
      res.json(property);
    } catch (error) {
      console.error("Error updating public property:", error);
      res.status(500).json({ error: "Failed to update public property" });
    }
  });
  
  // Delete public property (admin)
  app.delete("/api/admin/public-properties/:id", isAdminSession, async (req, res) => {
    try {
      const deleted = await storage.deletePublicProperty(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Property not found" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting public property:", error);
      res.status(500).json({ error: "Failed to delete public property" });
    }
  });
  
  // Import public properties from Excel data (admin)
  app.post("/api/admin/public-properties/import", isAdminSession, async (req, res) => {
    try {
      const { properties: propertyData } = req.body;
      if (!Array.isArray(propertyData)) {
        return res.status(400).json({ error: "Invalid data format" });
      }
      
      let imported = 0;
      let skipped = 0;
      
      for (const prop of propertyData) {
        const existing = await storage.getPublicPropertyByPropertyId(String(prop.propertyId));
        if (existing) {
          skipped++;
          continue;
        }
        
        await storage.createPublicProperty({
          propertyId: String(prop.propertyId),
          address: prop.address,
          unitNumber: prop.unitNumber || null,
          bedrooms: prop.bedrooms || 0,
          bathrooms: prop.bathrooms?.toString() || "0",
          ownerName: prop.ownerName || null,
          description: prop.description || null,
          amenities: null,
          images: null,
          isAvailable: true,
          monthlyRent: null,
        });
        imported++;
      }
      
      res.json({ success: true, imported, skipped });
    } catch (error) {
      console.error("Error importing public properties:", error);
      res.status(500).json({ error: "Failed to import properties" });
    }
  });

  // ========== PUBLIC PROPERTY IMAGE MANAGEMENT (Database-backed persistent storage) ==========

  const imageUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      if (file.mimetype.startsWith("image/")) cb(null, true);
      else cb(new Error("Only image files are allowed"));
    },
  });

  app.post("/api/admin/public-properties/:id/images/upload", isAdminSession, imageUpload.array("images", 20), async (req, res) => {
    try {
      const property = await storage.getPublicProperty(req.params.id);
      if (!property) {
        return res.status(404).json({ error: "Property not found" });
      }
      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) {
        return res.status(400).json({ error: "No images provided" });
      }
      const imageIds: string[] = [];
      for (const file of files) {
        const base64Data = file.buffer.toString("base64");
        const image = await storage.createPropertyImage({
          propertyId: property.id,
          data: base64Data,
          contentType: file.mimetype,
          filename: file.originalname,
          size: file.size,
        });
        imageIds.push(image.id);
      }
      const existingImages = property.images || [];
      const newImageUrls = imageIds.map(id => `/api/property-images/${id}`);
      const updatedImages = [...existingImages, ...newImageUrls];
      const updated = await storage.updatePublicProperty(req.params.id, { images: updatedImages });
      res.json(updated);
    } catch (error) {
      console.error("Error uploading property images:", error);
      res.status(500).json({ error: "Failed to upload images" });
    }
  });

  app.delete("/api/admin/public-properties/:id/images", isAdminSession, async (req, res) => {
    try {
      const property = await storage.getPublicProperty(req.params.id);
      if (!property) {
        return res.status(404).json({ error: "Property not found" });
      }
      const { imagePath } = req.body;
      if (!imagePath) {
        return res.status(400).json({ error: "Image path is required" });
      }
      const existingImages = property.images || [];
      const updatedImages = existingImages.filter(img => img !== imagePath);
      const imageIdMatch = imagePath.match(/\/api\/property-images\/(.+)$/);
      if (imageIdMatch) {
        await storage.deletePropertyImage(imageIdMatch[1]);
      }
      const updated = await storage.updatePublicProperty(req.params.id, { images: updatedImages });
      res.json(updated);
    } catch (error) {
      console.error("Error removing property image:", error);
      res.status(500).json({ error: "Failed to remove image" });
    }
  });

  app.get("/api/property-images/:imageId", async (req, res) => {
    try {
      const image = await storage.getPropertyImage(req.params.imageId);
      if (!image) {
        return res.status(404).json({ error: "Image not found" });
      }
      const buffer = Buffer.from(image.data, "base64");
      res.set({
        "Content-Type": image.contentType,
        "Content-Length": String(buffer.length),
        "Cache-Control": "public, max-age=31536000, immutable",
      });
      res.send(buffer);
    } catch (error) {
      console.error("Error serving property image:", error);
      res.status(500).json({ error: "Failed to serve image" });
    }
  });

  app.get("/api/admin/public-properties/:id/images", isAdminSession, async (req, res) => {
    try {
      const images = await storage.getPropertyImages(req.params.id);
      res.json(images.map(img => ({ id: img.id, filename: img.filename, contentType: img.contentType, size: img.size, createdAt: img.createdAt })));
    } catch (error) {
      console.error("Error listing property images:", error);
      res.status(500).json({ error: "Failed to list images" });
    }
  });

  app.get("/api/property-image-url", async (req, res) => {
    try {
      const objectPath = req.query.path as string;
      if (!objectPath) return res.status(400).json({ error: "Invalid path" });
      if (objectPath.startsWith("/api/property-images/")) {
        return res.json({ url: objectPath });
      }
      const signedUrl = await objectStorageService.getPublicObjectURL(objectPath);
      res.json({ url: signedUrl });
    } catch (error) {
      console.error("Error getting image URL:", error);
      res.status(500).json({ error: "Failed to get image URL" });
    }
  });

  app.get("/api/maintenance-photo-url", async (req, res) => {
    try {
      const objectPath = req.query.path as string;
      if (!objectPath || !objectPath.includes("/public/maintenance-photos/")) {
        return res.status(400).json({ error: "Invalid object path" });
      }
      const signedUrl = await objectStorageService.getPublicObjectURL(objectPath);
      res.json({ url: signedUrl });
    } catch (error) {
      console.error("Error getting maintenance photo URL:", error);
      res.status(500).json({ error: "Failed to get photo URL" });
    }
  });

  // ========== LEASE DOCUMENTS ==========
  
  // Get all lease documents (admin)
  app.get("/api/admin/lease-documents", isAdminSession, async (req, res) => {
    try {
      const docs = await storage.getLeaseDocuments();
      const result = docs.map(d => ({
        ...d,
        hasPdfData: !!d.pdfData,
        pdfData: undefined,
      }));
      res.json(result);
    } catch (error) {
      console.error("Error fetching lease documents:", error);
      res.status(500).json({ error: "Failed to fetch lease documents" });
    }
  });

  // Get single lease document (admin)
  app.get("/api/admin/lease-documents/:id", isAdminSession, async (req, res) => {
    try {
      const doc = await storage.getLeaseDocument(req.params.id);
      if (!doc) {
        return res.status(404).json({ error: "Lease document not found" });
      }
      res.json(doc);
    } catch (error) {
      console.error("Error fetching lease document:", error);
      res.status(500).json({ error: "Failed to fetch lease document" });
    }
  });

  // Create lease document (admin)
  app.post("/api/admin/lease-documents", isAdminSession, async (req, res) => {
    try {
      const token = crypto.randomBytes(32).toString("hex");
      const doc = await storage.createLeaseDocument({
        ...req.body,
        tenantSigningToken: token,
        status: req.body.status || "draft",
      });
      res.json(doc);
    } catch (error) {
      console.error("Error creating lease document:", error);
      res.status(500).json({ error: "Failed to create lease document" });
    }
  });

  // Update lease document (admin)
  app.patch("/api/admin/lease-documents/:id", isAdminSession, async (req, res) => {
    try {
      const doc = await storage.updateLeaseDocument(req.params.id, req.body);
      if (!doc) {
        return res.status(404).json({ error: "Lease document not found" });
      }
      res.json(doc);
    } catch (error) {
      console.error("Error updating lease document:", error);
      res.status(500).json({ error: "Failed to update lease document" });
    }
  });

  // Admin sign lease document
  app.post("/api/admin/lease-documents/:id/sign", isAdminSession, async (req, res) => {
    try {
      const { signature, signedBy } = req.body;
      if (!signature) {
        return res.status(400).json({ error: "Signature is required" });
      }
      const doc = await storage.getLeaseDocument(req.params.id);
      if (!doc) {
        return res.status(404).json({ error: "Lease document not found" });
      }
      const newStatus = doc.tenantSignature ? "fully_signed" : "partially_signed";
      const updated = await storage.updateLeaseDocument(req.params.id, {
        landlordSignature: signature,
        landlordSignedAt: new Date(),
        landlordSignedBy: signedBy || "Admin",
        status: newStatus,
      });

      if (newStatus === "fully_signed" && doc.leaseId) {
        try {
          const signedDoc = updated || { ...doc, landlordSignature: signature, landlordSignedBy: signedBy || "Admin", landlordSignedAt: new Date() };
          const htmlContent = generateSignedLeaseHtml(signedDoc);
          const htmlBase64 = Buffer.from(htmlContent).toString("base64");
          const storageKey = `signed-leases/signed_lease_${doc.leaseId}_${Date.now()}.html`;

          try {
            const uploadsDir = path.join(process.cwd(), "uploads", "signed-leases");
            if (!fs.existsSync(uploadsDir)) {
              fs.mkdirSync(uploadsDir, { recursive: true });
            }
            fs.writeFileSync(path.join(process.cwd(), "uploads", storageKey.replace("signed-leases/", "signed-leases/")), htmlContent);
          } catch (diskErr) {
            console.log("Filesystem write skipped (ephemeral):", diskErr);
          }

          const fileRecord = await storage.createFile({
            ownerType: "lease",
            ownerId: doc.leaseId,
            filename: `Signed Lease - ${doc.tenantNames || "Tenant"} - ${doc.premisesAddress || "Property"}.html`,
            storageKey,
            mimeType: "text/html",
            size: Buffer.byteLength(htmlContent).toString(),
            fileData: htmlBase64,
          });

          await storage.updateLease(doc.leaseId, { leaseFileId: fileRecord.id });

          const lease = await storage.getLease(doc.leaseId);
          if (lease) {
            await updatePropertyOccupancy(lease.propertyId);
          }
        } catch (fileError) {
          console.error("Error storing signed lease file:", fileError);
        }
      }

      res.json(updated);
    } catch (error) {
      console.error("Error signing lease document:", error);
      res.status(500).json({ error: "Failed to sign lease document" });
    }
  });

  app.get("/api/admin/lease-documents/:id/html", isAdminSession, async (req, res) => {
    try {
      const doc = await storage.getLeaseDocument(req.params.id);
      if (!doc) {
        return res.status(404).json({ error: "Lease document not found" });
      }
      const html = generateSignedLeaseHtml(doc);
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.send(html);
    } catch (error) {
      console.error("Error generating lease HTML:", error);
      res.status(500).json({ error: "Failed to generate lease document" });
    }
  });

  app.post("/api/admin/lease-documents/:id/pdf", isAdminSession, async (req, res) => {
    try {
      const { pdfData } = req.body;
      if (!pdfData) {
        return res.status(400).json({ error: "PDF data is required" });
      }
      const doc = await storage.getLeaseDocument(req.params.id);
      if (!doc) {
        return res.status(404).json({ error: "Lease document not found" });
      }
      console.log(`[PDF Save] Saving PDF for doc ${req.params.id}, base64 length: ${pdfData.length}`);
      const updated = await storage.updateLeaseDocument(req.params.id, { pdfData } as any);
      if (!updated?.pdfData) {
        console.error(`[PDF Save] pdfData not persisted for doc ${req.params.id}`);
        return res.status(500).json({ error: "PDF data failed to persist" });
      }
      console.log(`[PDF Save] Verified saved PDF for doc ${req.params.id}, stored length: ${updated.pdfData.length}`);
      res.json({ success: true });
    } catch (error) {
      console.error("Error saving lease PDF:", error);
      res.status(500).json({ error: "Failed to save lease PDF" });
    }
  });

  app.get("/api/admin/lease-documents/:id/pdf", isAdminSession, async (req, res) => {
    try {
      const doc = await storage.getLeaseDocument(req.params.id);
      if (!doc) {
        return res.status(404).json({ error: "Lease document not found" });
      }
      if (!doc.pdfData) {
        return res.status(404).json({ error: "No PDF stored for this document" });
      }
      const pdfBuffer = Buffer.from(doc.pdfData, "base64");
      const tenantName = (doc.tenantNames || "Tenant").replace(/[^a-zA-Z0-9 ]/g, "").trim();
      const filename = `Lease_${tenantName}.pdf`;
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      res.setHeader("Content-Length", pdfBuffer.length);
      res.send(pdfBuffer);
    } catch (error) {
      console.error("Error retrieving lease PDF:", error);
      res.status(500).json({ error: "Failed to retrieve lease PDF" });
    }
  });

  // Delete lease document (admin)
  app.delete("/api/admin/lease-documents/:id", isAdminSession, async (req, res) => {
    try {
      const deleted = await storage.deleteLeaseDocument(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Lease document not found" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting lease document:", error);
      res.status(500).json({ error: "Failed to delete lease document" });
    }
  });

  // ========== PUBLIC TENANT LEASE SIGNING ==========
  
  // Get lease document by signing token (public - for tenant)
  app.get("/api/lease-signing/:token", async (req, res) => {
    try {
      const doc = await storage.getLeaseDocumentByToken(req.params.token);
      if (!doc) {
        return res.status(404).json({ error: "Lease document not found or link has expired" });
      }
      const safeDoc = {
        ...doc,
        landlordSignature: doc.landlordSignature ? "signed" : null,
        tenantSignature: doc.tenantSignature ? "signed" : null,
      };
      res.json(safeDoc);
    } catch (error) {
      console.error("Error fetching lease for signing:", error);
      res.status(500).json({ error: "Failed to fetch lease document" });
    }
  });

  // Tenant sign lease document (public)
  app.post("/api/lease-signing/:token/sign", async (req, res) => {
    try {
      const { signature, signedBy } = req.body;
      if (!signature) {
        return res.status(400).json({ error: "Signature is required" });
      }
      const doc = await storage.getLeaseDocumentByToken(req.params.token);
      if (!doc) {
        return res.status(404).json({ error: "Lease document not found" });
      }
      if (doc.tenantSignature) {
        return res.status(400).json({ error: "Lease has already been signed by tenant" });
      }
      const newStatus = doc.landlordSignature ? "fully_signed" : "partially_signed";
      const updated = await storage.updateLeaseDocument(doc.id, {
        tenantSignature: signature,
        tenantSignedAt: new Date(),
        tenantSignedBy: signedBy || "Tenant",
        status: newStatus,
      });

      if (newStatus === "fully_signed" && doc.leaseId) {
        try {
          const signedDoc = updated || { ...doc, tenantSignature: signature, tenantSignedBy: signedBy || "Tenant", tenantSignedAt: new Date(), landlordSignature: doc.landlordSignature, landlordSignedBy: doc.landlordSignedBy, landlordSignedAt: doc.landlordSignedAt };
          const htmlContent = generateSignedLeaseHtml(signedDoc);
          const htmlBase64 = Buffer.from(htmlContent).toString("base64");
          const storageKey = `signed-leases/signed_lease_${doc.leaseId}_${Date.now()}.html`;

          try {
            const uploadsDir = path.join(process.cwd(), "uploads", "signed-leases");
            if (!fs.existsSync(uploadsDir)) {
              fs.mkdirSync(uploadsDir, { recursive: true });
            }
            fs.writeFileSync(path.join(process.cwd(), "uploads", storageKey.replace("signed-leases/", "signed-leases/")), htmlContent);
          } catch (diskErr) {
            console.log("Filesystem write skipped (ephemeral):", diskErr);
          }

          const fileRecord = await storage.createFile({
            ownerType: "lease",
            ownerId: doc.leaseId,
            filename: `Signed Lease - ${doc.tenantNames || "Tenant"} - ${doc.premisesAddress || "Property"}.html`,
            storageKey,
            mimeType: "text/html",
            size: Buffer.byteLength(htmlContent).toString(),
            fileData: htmlBase64,
          });

          await storage.updateLease(doc.leaseId, { leaseFileId: fileRecord.id });

          const lease = await storage.getLease(doc.leaseId);
          if (lease) {
            await updatePropertyOccupancy(lease.propertyId);
          }
        } catch (fileError) {
          console.error("Error storing signed lease file:", fileError);
        }
      }

      res.json({ success: true, status: updated?.status });
    } catch (error) {
      console.error("Error signing lease:", error);
      res.status(500).json({ error: "Failed to sign lease" });
    }
  });

  // ========== EXPENSES ==========
  app.get("/api/admin/expenses", isAdminSession, async (req, res) => {
    try {
      const filters: { propertyId?: string; tenantId?: string; category?: string } = {};
      if (req.query.propertyId) filters.propertyId = req.query.propertyId as string;
      if (req.query.tenantId) filters.tenantId = req.query.tenantId as string;
      if (req.query.category) filters.category = req.query.category as string;
      const allExpenses = await storage.getExpenses(Object.keys(filters).length ? filters : undefined);
      res.json(allExpenses);
    } catch (error) {
      console.error("Error fetching expenses:", error);
      res.status(500).json({ error: "Failed to fetch expenses" });
    }
  });

  app.get("/api/admin/expenses/:id", isAdminSession, async (req, res) => {
    try {
      const expense = await storage.getExpense(req.params.id);
      if (!expense) return res.status(404).json({ error: "Expense not found" });
      res.json(expense);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch expense" });
    }
  });

  const expenseUpload = multer({
    storage: multer.diskStorage({
      destination: (req, file, cb) => {
        const dir = path.join(process.cwd(), "uploads", "expense-files");
        fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
      },
      filename: (req, file, cb) => {
        const uniqueName = `${Date.now()}-${crypto.randomBytes(4).toString("hex")}-${file.originalname}`;
        cb(null, uniqueName);
      },
    }),
    limits: { fileSize: 20 * 1024 * 1024 },
  });

  app.post("/api/admin/expenses", isAdminSession, expenseUpload.single("file"), async (req, res) => {
    try {
      const data: any = {
        propertyId: req.body.propertyId || null,
        tenantId: req.body.tenantId || null,
        maintenanceRequestId: req.body.maintenanceRequestId || null,
        date: req.body.date,
        amount: req.body.amount,
        category: req.body.category,
        vendor: req.body.vendor || null,
        description: req.body.description || null,
        notes: req.body.notes || null,
      };
      if (req.file) {
        data.fileUrl = `/uploads/expense-files/${req.file.filename}`;
        data.fileName = req.file.originalname;
      }
      const expense = await storage.createExpense(data);
      res.json(expense);
    } catch (error) {
      console.error("Error creating expense:", error);
      res.status(500).json({ error: "Failed to create expense" });
    }
  });

  app.patch("/api/admin/expenses/:id", isAdminSession, expenseUpload.single("file"), async (req, res) => {
    try {
      const data: any = {};
      if (req.body.propertyId !== undefined) data.propertyId = req.body.propertyId || null;
      if (req.body.tenantId !== undefined) data.tenantId = req.body.tenantId || null;
      if (req.body.maintenanceRequestId !== undefined) data.maintenanceRequestId = req.body.maintenanceRequestId || null;
      if (req.body.date) data.date = req.body.date;
      if (req.body.amount) data.amount = req.body.amount;
      if (req.body.category) data.category = req.body.category;
      if (req.body.vendor !== undefined) data.vendor = req.body.vendor || null;
      if (req.body.description !== undefined) data.description = req.body.description || null;
      if (req.body.notes !== undefined) data.notes = req.body.notes || null;
      if (req.file) {
        data.fileUrl = `/uploads/expense-files/${req.file.filename}`;
        data.fileName = req.file.originalname;
      }
      const expense = await storage.updateExpense(req.params.id, data);
      if (!expense) return res.status(404).json({ error: "Expense not found" });
      res.json(expense);
    } catch (error) {
      console.error("Error updating expense:", error);
      res.status(500).json({ error: "Failed to update expense" });
    }
  });

  app.delete("/api/admin/expenses/:id", isAdminSession, async (req, res) => {
    try {
      const expense = await storage.getExpense(req.params.id);
      if (!expense) return res.status(404).json({ error: "Expense not found" });
      if (expense.fileUrl) {
        const filePath = path.join(process.cwd(), expense.fileUrl);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      }
      await storage.deleteExpense(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting expense:", error);
      res.status(500).json({ error: "Failed to delete expense" });
    }
  });

  app.get("/uploads/expense-files/:filename", (req, res) => {
    const filePath = path.join(process.cwd(), "uploads/expense-files", req.params.filename);
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: "File not found" });
    res.sendFile(filePath);
  });

  // ========== RENT CHARGES & LATE FEES ==========

  app.get("/api/admin/rent-charges", isAdminSession, async (req, res) => {
    try {
      const filters: any = {};
      if (req.query.leaseId) filters.leaseId = req.query.leaseId;
      if (req.query.tenantId) filters.tenantId = req.query.tenantId;
      if (req.query.propertyId) filters.propertyId = req.query.propertyId;
      if (req.query.status) filters.status = req.query.status;
      if (req.query.chargeMonth) filters.chargeMonth = req.query.chargeMonth;
      const charges = await storage.getRentCharges(filters);
      res.json(charges);
    } catch (error) {
      console.error("Error fetching rent charges:", error);
      res.status(500).json({ error: "Failed to fetch rent charges" });
    }
  });

  app.get("/api/admin/rent-charges/:id", isAdminSession, async (req, res) => {
    try {
      const charge = await storage.getRentCharge(req.params.id);
      if (!charge) return res.status(404).json({ error: "Rent charge not found" });
      res.json(charge);
    } catch (error) {
      console.error("Error fetching rent charge:", error);
      res.status(500).json({ error: "Failed to fetch rent charge" });
    }
  });

  app.post("/api/admin/rent-charges/create", isAdminSession, async (req, res) => {
    try {
      const { leaseId, chargeMonth, baseRent } = req.body;
      if (!leaseId || !chargeMonth || !baseRent) {
        return res.status(400).json({ error: "leaseId, chargeMonth, and baseRent are required" });
      }
      const lease = await db.query.leases.findFirst({ where: eq(leases.id, leaseId), with: { tenant: true, property: true } });
      if (!lease) return res.status(404).json({ error: "Lease not found" });

      const existing = await db.query.rentCharges.findFirst({
        where: and(eq(rentCharges.leaseId, leaseId), eq(rentCharges.chargeMonth, chargeMonth)),
      });
      if (existing) return res.status(409).json({ error: "A charge already exists for this lease and month" });

      const rent = parseFloat(baseRent);
      const [year, month] = chargeMonth.split("-");
      const dueDate = new Date(parseInt(year), parseInt(month) - 1, 1);

      const [charge] = await db.insert(rentCharges).values({
        leaseId,
        tenantId: lease.tenantId,
        propertyId: lease.propertyId,
        chargeMonth,
        baseRent: rent.toFixed(2),
        totalDue: rent.toFixed(2),
        dueDate,
        status: "open",
      }).returning();

      res.json(charge);
    } catch (error) {
      console.error("Error creating rent charge:", error);
      res.status(500).json({ error: "Failed to create rent charge" });
    }
  });

  app.post("/api/admin/rent-charges/manual", isAdminSession, async (req, res) => {
    try {
      const { propertyName, tenantName, chargeMonth, baseRent, status } = req.body;
      if (!propertyName || !tenantName || !chargeMonth || !baseRent) {
        return res.status(400).json({ error: "propertyName, tenantName, chargeMonth, and baseRent are required" });
      }
      if (!/^\d{4}-\d{2}$/.test(chargeMonth)) {
        return res.status(400).json({ error: "chargeMonth must be in YYYY-MM format" });
      }
      const rent = parseFloat(baseRent);
      if (!isFinite(rent) || rent < 0) {
        return res.status(400).json({ error: "baseRent must be zero or a positive number" });
      }
      const chargeStatus = status === "paid" ? "paid" : "open";
      const [year, month] = chargeMonth.split("-").map(Number);
      if (month < 1 || month > 12) {
        return res.status(400).json({ error: "Invalid month in chargeMonth" });
      }
      const dueDate = new Date(year, month - 1, 1);
      const amountPaid = chargeStatus === "paid" ? rent.toFixed(2) : "0.00";
      const paidAt = chargeStatus === "paid" ? new Date() : null;

      const [charge] = await db.insert(rentCharges).values({
        chargeMonth,
        baseRent: rent.toFixed(2),
        totalDue: rent.toFixed(2),
        amountPaid,
        dueDate,
        status: chargeStatus,
        paidAt,
        manualPropertyName: propertyName.trim(),
        manualTenantName: tenantName.trim(),
      }).returning();

      res.json(charge);
    } catch (error) {
      console.error("Error creating manual rent charge:", error);
      res.status(500).json({ error: "Failed to create manual rent charge" });
    }
  });

  app.post("/api/admin/rent-charges/generate", isAdminSession, async (req, res) => {
    try {
      const { month } = req.body;
      const targetMonth = month || new Date().toISOString().slice(0, 7);
      const activeLeases = await storage.getActiveLeases();
      const generated: any[] = [];
      const skipped: any[] = [];

      const suppressions = await db.select().from(suppressedRentCharges)
        .where(and(eq(suppressedRentCharges.chargeMonth, targetMonth), eq(suppressedRentCharges.type, "invoice")));
      const suppressedSet = new Set(suppressions.map(s => s.leaseId));

      for (const lease of activeLeases) {
        if (suppressedSet.has(lease.id)) {
          skipped.push({ leaseId: lease.id, reason: "Previously deleted" });
          continue;
        }
        const existing = await storage.getRentChargeByLeaseAndMonth(lease.id, targetMonth);
        if (existing) {
          skipped.push({ leaseId: lease.id, reason: "Already exists" });
          continue;
        }
        const [year, monthNum] = targetMonth.split("-").map(Number);
        const dueDate = new Date(year, monthNum - 1, 1);
        const charge = await storage.createRentCharge({
          leaseId: lease.id,
          tenantId: lease.tenantId,
          propertyId: lease.propertyId,
          chargeMonth: targetMonth,
          baseRent: lease.rentAmount,
          lateFeeAmount: "0",
          lateFeeApplied: false,
          totalDue: lease.rentAmount,
          amountPaid: "0",
          status: "open",
          dueDate,
        });
        generated.push(charge);
      }

      res.json({ generated: generated.length, skipped: skipped.length, charges: generated });
    } catch (error) {
      console.error("Error generating rent charges:", error);
      res.status(500).json({ error: "Failed to generate rent charges" });
    }
  });

  app.post("/api/admin/rent-charges/sync-lease-amounts", isAdminSession, async (req, res) => {
    try {
      const { month } = req.body;
      const targetMonth = month || new Date().toISOString().slice(0, 7);
      const allCharges = await storage.getRentCharges({ chargeMonth: targetMonth });
      let updated = 0;

      for (const charge of allCharges) {
        const lease = await storage.getLease(charge.leaseId);
        if (!lease) continue;

        const currentBase = parseFloat(charge.baseRent);
        const leaseRent = parseFloat(lease.rentAmount);
        if (Math.abs(currentBase - leaseRent) < 0.01) continue;

        const lateFeeRate = parseFloat(lease.lateFeeRate || "0.05");
        const newLateFee = charge.lateFeeApplied ? parseFloat((leaseRent * lateFeeRate).toFixed(2)) : 0;
        const newTotal = parseFloat((leaseRent + newLateFee).toFixed(2));

        await storage.updateRentCharge(charge.id, {
          baseRent: leaseRent.toFixed(2),
          lateFeeAmount: newLateFee.toFixed(2),
          totalDue: newTotal.toFixed(2),
        });
        updated++;
      }

      res.json({ updated, month: targetMonth });
    } catch (error) {
      console.error("Error syncing rent charges:", error);
      res.status(500).json({ error: "Failed to sync rent charges" });
    }
  });

  app.post("/api/admin/rent-charges/apply-late-fees", isAdminSession, async (req, res) => {
    try {
      const { month } = req.body;
      const targetMonth = month || new Date().toISOString().slice(0, 7);
      const allCharges = await storage.getRentCharges({ chargeMonth: targetMonth });
      const applied: any[] = [];
      const skipped: any[] = [];
      const now = new Date();

      const suppressions = await db.select().from(suppressedRentCharges)
        .where(and(eq(suppressedRentCharges.chargeMonth, targetMonth), eq(suppressedRentCharges.type, "latefee")));
      const suppressedLateFeeSet = new Set(suppressions.map(s => s.leaseId));

      for (const charge of allCharges) {
        if (charge.lateFeeApplied) {
          skipped.push({ chargeId: charge.id, reason: "Late fee already applied" });
          continue;
        }
        if (charge.leaseId && suppressedLateFeeSet.has(charge.leaseId)) {
          skipped.push({ chargeId: charge.id, reason: "Late fee previously waived" });
          continue;
        }
        if (charge.status === "paid") {
          skipped.push({ chargeId: charge.id, reason: "Already paid in full" });
          continue;
        }

        const amountPaid = parseFloat(charge.amountPaid || "0");
        const baseRent = parseFloat(charge.baseRent);
        if (amountPaid >= baseRent) {
          skipped.push({ chargeId: charge.id, reason: "Rent already paid in full" });
          continue;
        }

        const leaseData = await storage.getLease(charge.leaseId);
        const graceDays = leaseData?.lateFeeGraceDays ?? 5;
        const chargeDate = new Date(charge.dueDate);
        const graceDeadline = new Date(chargeDate.getFullYear(), chargeDate.getMonth(), graceDays + 1);

        if (now < graceDeadline) {
          skipped.push({ chargeId: charge.id, reason: "Grace period not yet passed" });
          continue;
        }

        const lateFeeRate = parseFloat(leaseData?.lateFeeRate || "0.05");
        const lateFeeAmount = parseFloat((baseRent * lateFeeRate).toFixed(2));
        const newTotal = parseFloat((baseRent + lateFeeAmount).toFixed(2));

        const updated = await storage.updateRentCharge(charge.id, {
          lateFeeApplied: true,
          lateFeeAppliedAt: new Date(),
          lateFeeAmount: lateFeeAmount.toString(),
          totalDue: newTotal.toString(),
          status: amountPaid >= newTotal ? "paid" : (amountPaid > 0 ? "partial" : "late"),
        });

        applied.push(updated);
      }

      res.json({ applied: applied.length, skipped: skipped.length, charges: applied });
    } catch (error) {
      console.error("Error applying late fees:", error);
      res.status(500).json({ error: "Failed to apply late fees" });
    }
  });

  app.patch("/api/admin/rent-charges/:id", isAdminSession, async (req, res) => {
    try {
      const charge = await storage.updateRentCharge(req.params.id, req.body);
      if (!charge) return res.status(404).json({ error: "Rent charge not found" });
      if (req.body.baseRent !== undefined) {
        const recalced = await recalcRentChargeTotal(req.params.id);
        return res.json(recalced || charge);
      }
      res.json(charge);
    } catch (error) {
      console.error("Error updating rent charge:", error);
      res.status(500).json({ error: "Failed to update rent charge" });
    }
  });

  async function recalcRentChargeTotal(chargeId: string) {
    const charge = await storage.getRentCharge(chargeId);
    if (!charge) return null;
    const items = await storage.getInvoiceItems(chargeId);
    const baseRent = parseFloat(charge.baseRent);
    const lateFee = charge.lateFeeApplied ? parseFloat(charge.lateFeeAmount || "0") : 0;
    const itemsTotal = items.reduce((sum, item) => sum + parseFloat(item.amount), 0);
    const totalDue = parseFloat((baseRent + lateFee + itemsTotal).toFixed(2));
    const amountPaid = parseFloat(charge.amountPaid || "0");
    let status = "open";
    if (amountPaid >= totalDue) status = "paid";
    else if (amountPaid > 0) status = "partial";
    return storage.updateRentCharge(chargeId, { totalDue: totalDue.toFixed(2), status, paidAt: status === "paid" ? new Date() : null });
  }

  app.post("/api/admin/rent-charges/:id/waive-late-fee", isAdminSession, async (req, res) => {
    try {
      const charge = await storage.getRentCharge(req.params.id);
      if (!charge) return res.status(404).json({ error: "Rent charge not found" });
      if (!charge.lateFeeApplied) return res.status(400).json({ error: "No late fee to waive" });

      await storage.updateRentCharge(charge.id, {
        lateFeeApplied: false,
        lateFeeAmount: "0",
      });

      if (charge.leaseId && charge.chargeMonth) {
        await db.insert(suppressedRentCharges).values({
          leaseId: charge.leaseId,
          chargeMonth: charge.chargeMonth,
          type: "latefee",
        });
      }

      const updated = await recalcRentChargeTotal(charge.id);
      res.json(updated);
    } catch (error) {
      console.error("Error waiving late fee:", error);
      res.status(500).json({ error: "Failed to waive late fee" });
    }
  });

  app.post("/api/admin/rent-charges/:id/apply-late-fee", isAdminSession, async (req, res) => {
    try {
      const charge = await storage.getRentCharge(req.params.id);
      if (!charge) return res.status(404).json({ error: "Rent charge not found" });
      if (charge.lateFeeApplied) return res.status(400).json({ error: "Late fee already applied" });

      const baseRent = parseFloat(charge.baseRent);
      const lateFeeRate = 0.05;
      const lateFeeAmount = parseFloat((baseRent * lateFeeRate).toFixed(2));

      await storage.updateRentCharge(charge.id, {
        lateFeeApplied: true,
        lateFeeAmount: lateFeeAmount.toFixed(2),
        lateFeeAppliedAt: new Date(),
      });
      const updated = await recalcRentChargeTotal(charge.id);
      res.json(updated);
    } catch (error) {
      console.error("Error applying late fee:", error);
      res.status(500).json({ error: "Failed to apply late fee" });
    }
  });

  app.post("/api/admin/rent-charges/:id/record-payment", isAdminSession, async (req, res) => {
    try {
      const charge = await storage.getRentCharge(req.params.id);
      if (!charge) return res.status(404).json({ error: "Rent charge not found" });

      const paymentAmount = parseFloat(req.body.amount);
      if (isNaN(paymentAmount) || paymentAmount <= 0) {
        return res.status(400).json({ error: "Payment amount must be a positive number" });
      }
      const currentPaid = parseFloat(charge.amountPaid || "0");
      const totalDue = parseFloat(charge.totalDue);
      const newPaid = parseFloat((currentPaid + paymentAmount).toFixed(2));

      let status = "partial";
      let paidAt: Date | null = req.body.paidAt ? new Date(req.body.paidAt) : null;
      if (newPaid >= totalDue) {
        status = "paid";
        if (!paidAt) paidAt = new Date();
      }

      const updated = await storage.updateRentCharge(charge.id, {
        amountPaid: newPaid.toString(),
        status,
        paidAt,
      });

      res.json(updated);
    } catch (error) {
      console.error("Error recording payment:", error);
      res.status(500).json({ error: "Failed to record payment" });
    }
  });

  app.delete("/api/admin/rent-charges/:id", isAdminSession, async (req, res) => {
    try {
      const charge = await storage.getRentCharge(req.params.id);
      if (charge && charge.leaseId && charge.chargeMonth) {
        await db.insert(suppressedRentCharges).values({
          leaseId: charge.leaseId,
          chargeMonth: charge.chargeMonth,
          type: "invoice",
        });
      }
      await storage.deleteRentCharge(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting rent charge:", error);
      res.status(500).json({ error: "Failed to delete rent charge" });
    }
  });

  // Invoice Items CRUD
  app.get("/api/admin/rent-charges/:id/invoice-items", isAdminSession, async (req, res) => {
    try {
      const items = await storage.getInvoiceItems(req.params.id);
      res.json(items);
    } catch (error) {
      console.error("Error fetching invoice items:", error);
      res.status(500).json({ error: "Failed to fetch invoice items" });
    }
  });

  app.post("/api/admin/rent-charges/:id/invoice-items", isAdminSession, async (req, res) => {
    try {
      const { description, amount } = req.body;
      if (!description || amount === undefined) {
        return res.status(400).json({ error: "Description and amount are required" });
      }
      const item = await storage.createInvoiceItem({
        rentChargeId: req.params.id,
        description,
        amount: parseFloat(amount).toFixed(2),
      });
      await recalcRentChargeTotal(req.params.id);
      res.json(item);
    } catch (error) {
      console.error("Error creating invoice item:", error);
      res.status(500).json({ error: "Failed to create invoice item" });
    }
  });

  app.patch("/api/admin/invoice-items/:id", isAdminSession, async (req, res) => {
    try {
      const { description, amount } = req.body;
      const updateData: Record<string, any> = {};
      if (description !== undefined) updateData.description = description;
      if (amount !== undefined) updateData.amount = parseFloat(amount).toFixed(2);
      const item = await storage.updateInvoiceItem(req.params.id, updateData);
      if (!item) return res.status(404).json({ error: "Invoice item not found" });
      await recalcRentChargeTotal(item.rentChargeId);
      res.json(item);
    } catch (error) {
      console.error("Error updating invoice item:", error);
      res.status(500).json({ error: "Failed to update invoice item" });
    }
  });

  app.delete("/api/admin/invoice-items/:itemId", isAdminSession, async (req, res) => {
    try {
      const { rentChargeId } = req.body;
      const deleted = await storage.deleteInvoiceItem(req.params.itemId);
      if (!deleted) return res.status(404).json({ error: "Invoice item not found" });
      if (rentChargeId) await recalcRentChargeTotal(rentChargeId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting invoice item:", error);
      res.status(500).json({ error: "Failed to delete invoice item" });
    }
  });

  app.get("/api/admin/messages", isAdminSession, async (req, res) => {
    try {
      const messages = await storage.getAllTenantMessages();
      res.json(messages);
    } catch (error) {
      console.error("Error fetching messages:", error);
      res.status(500).json({ error: "Failed to fetch messages" });
    }
  });

  app.get("/api/admin/messages/tenant/:tenantId", isAdminSession, async (req, res) => {
    try {
      const messages = await storage.getTenantMessages(req.params.tenantId);
      res.json(messages);
    } catch (error) {
      console.error("Error fetching tenant messages:", error);
      res.status(500).json({ error: "Failed to fetch messages" });
    }
  });

  app.post("/api/admin/messages/send", isAdminSession, async (req, res) => {
    try {
      const { tenantId, subject, body } = req.body;
      if (!tenantId || !subject || !body) {
        return res.status(400).json({ error: "tenantId, subject, and body are required" });
      }

      const tenant = await storage.getTenant(tenantId);
      if (!tenant) return res.status(404).json({ error: "Tenant not found" });
      if (!tenant.email) return res.status(400).json({ error: "Tenant has no email address" });

      let emailSent = false;
      try {
        const { getResendClient } = await import("./email");
        const { client, fromEmail } = await getResendClient();
        await client.emails.send({
          from: "ATID Property Management <info@atidrealty.com>",
          to: tenant.email,
          subject,
          html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #1a1a2e; color: white; padding: 20px; text-align: center;">
              <h2 style="margin: 0;">ATID Realty</h2>
            </div>
            <div style="padding: 20px; background: #ffffff;">
              <p>Dear ${tenant.firstName} ${tenant.lastName},</p>
              ${body.split('\n').map((line: string) => `<p>${line}</p>`).join('')}
              <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
              <p style="color: #666; font-size: 12px;">This email was sent from ATID Property Management. Please reply to this email or contact us at info@atidrealty.com.</p>
            </div>
          </div>`,
        });
        emailSent = true;
      } catch (emailErr) {
        console.error("Failed to send email:", emailErr);
      }

      const message = await storage.createTenantMessage({
        tenantId,
        direction: "outbound",
        subject,
        body,
        senderEmail: "info@atidrealty.com",
        recipientEmail: tenant.email,
        status: emailSent ? "sent" : "failed",
      });

      res.json({ message, emailSent });
    } catch (error) {
      console.error("Error sending message:", error);
      res.status(500).json({ error: "Failed to send message" });
    }
  });

  app.post("/api/admin/messages/broadcast", isAdminSession, async (req, res) => {
    try {
      const { tenantIds, subject, body } = req.body;
      if (!tenantIds?.length || !subject || !body) {
        return res.status(400).json({ error: "tenantIds, subject, and body are required" });
      }

      const results: any[] = [];
      for (const tenantId of tenantIds) {
        const tenant = await storage.getTenant(tenantId);
        if (!tenant || !tenant.email) {
          results.push({ tenantId, status: "skipped", reason: "No email" });
          continue;
        }

        let emailSent = false;
        try {
          const { getResendClient } = await import("./email");
          const { client } = await getResendClient();
          await client.emails.send({
            from: "ATID Property Management <info@atidrealty.com>",
            to: tenant.email,
            subject,
            html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background: #1a1a2e; color: white; padding: 20px; text-align: center;">
                <h2 style="margin: 0;">ATID Realty</h2>
              </div>
              <div style="padding: 20px; background: #ffffff;">
                <p>Dear ${tenant.firstName} ${tenant.lastName},</p>
                ${body.split('\n').map((line: string) => `<p>${line}</p>`).join('')}
                <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
                <p style="color: #666; font-size: 12px;">This email was sent from ATID Property Management.</p>
              </div>
            </div>`,
          });
          emailSent = true;
        } catch (emailErr) {
          console.error(`Failed to send email to ${tenant.email}:`, emailErr);
        }

        const message = await storage.createTenantMessage({
          tenantId,
          direction: "outbound",
          subject,
          body,
          senderEmail: "info@atidrealty.com",
          recipientEmail: tenant.email,
          status: emailSent ? "sent" : "failed",
        });
        results.push({ tenantId, status: emailSent ? "sent" : "failed", messageId: message.id });
      }

      const sent = results.filter(r => r.status === "sent").length;
      const failed = results.filter(r => r.status === "failed").length;
      const skipped = results.filter(r => r.status === "skipped").length;
      res.json({ sent, failed, skipped, results });
    } catch (error) {
      console.error("Error broadcasting messages:", error);
      res.status(500).json({ error: "Failed to broadcast messages" });
    }
  });

  return httpServer;
}
