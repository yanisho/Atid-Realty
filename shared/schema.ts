import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, decimal, boolean, jsonb, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Re-export auth models
export * from "./models/auth";

// User Roles
export const userRoleEnum = ["ADMIN", "MANAGER", "MAINTENANCE", "ACCOUNTING", "READ_ONLY", "TENANT", "APPLICANT"] as const;
export type UserRole = typeof userRoleEnum[number];

// Property status
export const propertyStatusEnum = ["active", "inactive", "maintenance"] as const;
export type PropertyStatus = typeof propertyStatusEnum[number];

// Property type
export const propertyTypeEnum = ["house", "condo", "commercial", "townhouse"] as const;
export type PropertyType = typeof propertyTypeEnum[number];

// Unit status
export const unitStatusEnum = ["available", "occupied", "maintenance", "reserved"] as const;
export type UnitStatus = typeof unitStatusEnum[number];

// Tenant status
export const tenantStatusEnum = ["active", "inactive", "pending"] as const;
export type TenantStatus = typeof tenantStatusEnum[number];

// Lease status
export const leaseStatusEnum = ["active", "expired", "pending", "terminated"] as const;
export type LeaseStatus = typeof leaseStatusEnum[number];

// Maintenance status
export const maintenanceStatusEnum = ["submitted", "in_progress", "completed", "cancelled"] as const;
export type MaintenanceStatus = typeof maintenanceStatusEnum[number];

// Maintenance priority
export const maintenancePriorityEnum = ["low", "medium", "high", "emergency"] as const;
export type MaintenancePriority = typeof maintenancePriorityEnum[number];

// Application status
export const applicationStatusEnum = ["draft", "submitted", "under_review", "approved", "rejected"] as const;
export type ApplicationStatus = typeof applicationStatusEnum[number];

// Payment status
export const paymentStatusEnum = ["pending", "completed", "failed", "refunded"] as const;
export type PaymentStatus = typeof paymentStatusEnum[number];

// Payment method
export const paymentMethodEnum = ["card", "ach", "zelle"] as const;
export type PaymentMethod = typeof paymentMethodEnum[number];

// Entity type
export const entityTypeEnum = ["llc", "corporation", "individual", "partnership", "trust"] as const;
export type EntityType = typeof entityTypeEnum[number];

// ========== ENTITIES (Property Owners) ==========
export const entities = pgTable("entities", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 255 }).notNull(),
  type: varchar("type", { length: 50 }).default("llc"),
  taxId: varchar("tax_id", { length: 50 }),
  address: varchar("address", { length: 500 }),
  city: varchar("city", { length: 100 }),
  state: varchar("state", { length: 50 }),
  zip: varchar("zip", { length: 20 }),
  contactName: varchar("contact_name", { length: 255 }),
  contactEmail: varchar("contact_email", { length: 255 }),
  contactPhone: varchar("contact_phone", { length: 20 }),
  zelleInfo: varchar("zelle_info", { length: 500 }),
  stripeAccountId: varchar("stripe_account_id", { length: 255 }),
  stripeAccountStatus: varchar("stripe_account_status", { length: 50 }).default("pending"),
  paymentEnabled: boolean("payment_enabled").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertEntitySchema = createInsertSchema(entities).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertEntity = z.infer<typeof insertEntitySchema>;
export type Entity = typeof entities.$inferSelect;

// ========== PROPERTIES ==========
export const properties = pgTable("properties", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  entityId: varchar("entity_id").references(() => entities.id),
  propertyCode: varchar("property_code", { length: 50 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  nickname: varchar("nickname", { length: 100 }),
  address: varchar("address", { length: 500 }).notNull(),
  city: varchar("city", { length: 100 }).notNull(),
  state: varchar("state", { length: 50 }).notNull(),
  zip: varchar("zip", { length: 20 }).notNull(),
  type: varchar("type", { length: 50 }).default("house"),
  bedrooms: integer("bedrooms").default(1),
  bathrooms: decimal("bathrooms", { precision: 3, scale: 1 }).default("1"),
  sqft: integer("sqft"),
  status: varchar("status", { length: 20 }).default("active"),
  description: text("description"),
  imageUrl: varchar("image_url", { length: 500 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertPropertySchema = createInsertSchema(properties).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertProperty = z.infer<typeof insertPropertySchema>;
export type Property = typeof properties.$inferSelect;

// ========== UNITS ==========
export const units = pgTable("units", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  propertyId: varchar("property_id").notNull().references(() => properties.id),
  unitLabel: varchar("unit_label", { length: 50 }).notNull(),
  bedrooms: integer("bedrooms").default(1),
  bathrooms: decimal("bathrooms", { precision: 3, scale: 1 }).default("1"),
  sqft: integer("sqft"),
  rentAmount: decimal("rent_amount", { precision: 10, scale: 2 }),
  status: varchar("status", { length: 20 }).default("available"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertUnitSchema = createInsertSchema(units).omit({ id: true, createdAt: true });
export type InsertUnit = z.infer<typeof insertUnitSchema>;
export type Unit = typeof units.$inferSelect;

// ========== TENANTS ==========
export const tenants = pgTable("tenants", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  propertyId: varchar("property_id").references(() => properties.id),
  unitId: varchar("unit_id").references(() => units.id),
  firstName: varchar("first_name", { length: 100 }).notNull(),
  lastName: varchar("last_name", { length: 100 }).notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 20 }),
  portalPassword: varchar("portal_password", { length: 255 }),
  rentAmount: decimal("rent_amount", { precision: 10, scale: 2 }),
  securityDeposit: decimal("security_deposit", { precision: 10, scale: 2 }),
  lastMonthPayment: decimal("last_month_payment", { precision: 10, scale: 2 }),
  status: varchar("status", { length: 20 }).default("inactive"),
  moveInDate: timestamp("move_in_date"),
  moveOutDate: timestamp("move_out_date"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Import users from auth
import { users } from "./models/auth";

export const insertTenantSchema = createInsertSchema(tenants).omit({ id: true, createdAt: true });
export type InsertTenant = z.infer<typeof insertTenantSchema>;
export type Tenant = typeof tenants.$inferSelect;

// ========== TENANT INVITATIONS ==========
export const tenantInvitations = pgTable("tenant_invitations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id),
  token: varchar("token", { length: 100 }).notNull().unique(),
  email: varchar("email", { length: 255 }).notNull(),
  status: varchar("status", { length: 20 }).default("pending"),
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertTenantInvitationSchema = createInsertSchema(tenantInvitations).omit({ id: true, createdAt: true });
export type InsertTenantInvitation = z.infer<typeof insertTenantInvitationSchema>;
export type TenantInvitation = typeof tenantInvitations.$inferSelect;

// ========== LEASES ==========
export const leases = pgTable("leases", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id),
  propertyId: varchar("property_id").notNull().references(() => properties.id),
  unitId: varchar("unit_id").references(() => units.id),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  rentAmount: decimal("rent_amount", { precision: 10, scale: 2 }).notNull(),
  depositAmount: decimal("deposit_amount", { precision: 10, scale: 2 }),
  leaseType: varchar("lease_type", { length: 20 }).default("annual"),
  status: varchar("status", { length: 20 }).default("active"),
  leaseFileId: varchar("lease_file_id"),
  lastMonthRent: decimal("last_month_rent", { precision: 10, scale: 2 }),
  lateFeeRate: decimal("late_fee_rate", { precision: 5, scale: 4 }).default("0.0500"),
  lateFeeGraceDays: integer("late_fee_grace_days").default(5),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertLeaseSchema = createInsertSchema(leases).omit({ id: true, createdAt: true });
export type InsertLease = z.infer<typeof insertLeaseSchema>;
export type Lease = typeof leases.$inferSelect;

// ========== FILES ==========
export const files = pgTable("files", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ownerType: varchar("owner_type", { length: 50 }).notNull(),
  ownerId: varchar("owner_id").notNull(),
  filename: varchar("filename", { length: 255 }).notNull(),
  mimeType: varchar("mime_type", { length: 100 }),
  size: integer("size"),
  storageKey: varchar("storage_key", { length: 500 }).notNull(),
  fileData: text("file_data"),
  tags: text("tags").array(),
  uploadedByUserId: varchar("uploaded_by_user_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertFileSchema = createInsertSchema(files).omit({ id: true, createdAt: true });
export type InsertFile = z.infer<typeof insertFileSchema>;
export type File = typeof files.$inferSelect;

// ========== MAINTENANCE REQUESTS ==========
export const maintenanceRequests = pgTable("maintenance_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").references(() => tenants.id),
  propertyId: varchar("property_id").references(() => properties.id),
  unitId: varchar("unit_id").references(() => units.id),
  ticketNumber: varchar("ticket_number", { length: 20 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 20 }),
  propertyAddress: varchar("property_address", { length: 500 }),
  unitLabel: varchar("unit_label", { length: 50 }),
  category: varchar("category", { length: 100 }),
  description: text("description").notNull(),
  status: varchar("status", { length: 20 }).default("submitted"),
  priority: varchar("priority", { length: 20 }).default("medium"),
  entryPermission: boolean("entry_permission").default(false),
  hasPets: boolean("has_pets").default(false),
  photos: text("photos").array(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertMaintenanceRequestSchema = createInsertSchema(maintenanceRequests).omit({ id: true, createdAt: true, updatedAt: true, ticketNumber: true });
export type InsertMaintenanceRequest = z.infer<typeof insertMaintenanceRequestSchema>;
export type MaintenanceRequest = typeof maintenanceRequests.$inferSelect;

// ========== MAINTENANCE MESSAGES ==========
export const maintenanceMessages = pgTable("maintenance_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  requestId: varchar("request_id").notNull().references(() => maintenanceRequests.id),
  senderType: varchar("sender_type", { length: 20 }).notNull(),
  senderUserId: varchar("sender_user_id"),
  message: text("message").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertMaintenanceMessageSchema = createInsertSchema(maintenanceMessages).omit({ id: true, createdAt: true });
export type InsertMaintenanceMessage = z.infer<typeof insertMaintenanceMessageSchema>;
export type MaintenanceMessage = typeof maintenanceMessages.$inferSelect;

// ========== MAINTENANCE ATTACHMENTS ==========
export const maintenanceAttachments = pgTable("maintenance_attachments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  requestId: varchar("request_id").notNull().references(() => maintenanceRequests.id),
  fileId: varchar("file_id").notNull().references(() => files.id),
});

export const insertMaintenanceAttachmentSchema = createInsertSchema(maintenanceAttachments).omit({ id: true });
export type InsertMaintenanceAttachment = z.infer<typeof insertMaintenanceAttachmentSchema>;
export type MaintenanceAttachment = typeof maintenanceAttachments.$inferSelect;

// ========== APPLICATIONS ==========
export const applications = pgTable("applications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  applicantUserId: varchar("applicant_user_id"),
  propertyId: varchar("property_id").references(() => properties.id),
  unitId: varchar("unit_id").references(() => units.id),
  status: varchar("status", { length: 20 }).default("draft"),
  applicationData: jsonb("application_data"),
  submittedAt: timestamp("submitted_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertApplicationSchema = createInsertSchema(applications).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertApplication = z.infer<typeof insertApplicationSchema>;
export type Application = typeof applications.$inferSelect;

// ========== PAYMENTS ==========
export const payments = pgTable("payments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").references(() => tenants.id),
  propertyId: varchar("property_id").references(() => properties.id),
  entityId: varchar("entity_id").references(() => entities.id),
  propertyCode: varchar("property_code", { length: 50 }),
  email: varchar("email", { length: 255 }),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  method: varchar("method", { length: 20 }),
  status: varchar("status", { length: 20 }).default("pending"),
  stripePaymentIntentId: varchar("stripe_payment_intent_id", { length: 255 }),
  stripeTransferId: varchar("stripe_transfer_id", { length: 255 }),
  zelleConfirmationId: varchar("zelle_confirmation_id", { length: 255 }),
  paidAt: timestamp("paid_at"),
  receiptUrl: varchar("receipt_url", { length: 500 }),
  description: varchar("description", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertPaymentSchema = createInsertSchema(payments).omit({ id: true, createdAt: true });
export type InsertPayment = z.infer<typeof insertPaymentSchema>;
export type Payment = typeof payments.$inferSelect;

// ========== RENT CHARGES (Monthly Ledger) ==========
export const rentCharges = pgTable("rent_charges", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  leaseId: varchar("lease_id").references(() => leases.id),
  tenantId: varchar("tenant_id").references(() => tenants.id),
  propertyId: varchar("property_id").references(() => properties.id),
  chargeMonth: varchar("charge_month", { length: 7 }).notNull(),
  baseRent: decimal("base_rent", { precision: 10, scale: 2 }).notNull(),
  lateFeeAmount: decimal("late_fee_amount", { precision: 10, scale: 2 }).default("0"),
  lateFeeApplied: boolean("late_fee_applied").default(false),
  lateFeeAppliedAt: timestamp("late_fee_applied_at"),
  totalDue: decimal("total_due", { precision: 10, scale: 2 }).notNull(),
  amountPaid: decimal("amount_paid", { precision: 10, scale: 2 }).default("0"),
  status: varchar("status", { length: 20 }).default("open"),
  dueDate: timestamp("due_date").notNull(),
  paidAt: timestamp("paid_at"),
  manualPropertyName: varchar("manual_property_name", { length: 500 }),
  manualTenantName: varchar("manual_tenant_name", { length: 500 }),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertRentChargeSchema = createInsertSchema(rentCharges).omit({ id: true, createdAt: true });
export type InsertRentCharge = z.infer<typeof insertRentChargeSchema>;
export type RentCharge = typeof rentCharges.$inferSelect;

// ========== SUPPRESSED RENT CHARGES (prevent regeneration) ==========
export const suppressedRentCharges = pgTable("suppressed_rent_charges", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  leaseId: varchar("lease_id").references(() => leases.id),
  chargeMonth: varchar("charge_month", { length: 7 }).notNull(),
  type: varchar("type", { length: 20 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// ========== INVOICE LINE ITEMS ==========
export const invoiceItems = pgTable("invoice_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  rentChargeId: varchar("rent_charge_id").notNull().references(() => rentCharges.id, { onDelete: "cascade" }),
  description: varchar("description", { length: 255 }).notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertInvoiceItemSchema = createInsertSchema(invoiceItems).omit({ id: true, createdAt: true });
export type InsertInvoiceItem = z.infer<typeof insertInvoiceItemSchema>;
export type InvoiceItem = typeof invoiceItems.$inferSelect;

// ========== AUDIT LOG ==========
export const auditLogs = pgTable("audit_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  actorUserId: varchar("actor_user_id"),
  action: varchar("action", { length: 100 }).notNull(),
  entityType: varchar("entity_type", { length: 50 }).notNull(),
  entityId: varchar("entity_id"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_audit_logs_entity").on(table.entityType, table.entityId),
]);

export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({ id: true, createdAt: true });
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
export type AuditLog = typeof auditLogs.$inferSelect;

// ========== USER PROFILES (Extended from auth) ==========
export const userProfiles = pgTable("user_profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id).unique(),
  role: varchar("role", { length: 20 }).default("TENANT"),
  phone: varchar("phone", { length: 20 }),
  profileImage: text("profile_image"),
  status: varchar("status", { length: 20 }).default("active"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertUserProfileSchema = createInsertSchema(userProfiles).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertUserProfile = z.infer<typeof insertUserProfileSchema>;
export type UserProfile = typeof userProfiles.$inferSelect;

// ========== ADMIN USERS (Username/Password Auth) ==========
export const adminUsers = pgTable("admin_users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email", { length: 255 }).notNull().unique(),
  password: varchar("password", { length: 255 }).notNull(),
  firstName: varchar("first_name", { length: 100 }),
  lastName: varchar("last_name", { length: 100 }),
  role: varchar("role", { length: 20 }).default("ADMIN"),
  profileImage: text("profile_image"),
  mustChangePassword: boolean("must_change_password").default(true),
  status: varchar("status", { length: 20 }).default("active"),
  lastLoginAt: timestamp("last_login_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertAdminUserSchema = createInsertSchema(adminUsers).omit({ id: true, createdAt: true, updatedAt: true, lastLoginAt: true });
export type InsertAdminUser = z.infer<typeof insertAdminUserSchema>;
export type AdminUser = typeof adminUsers.$inferSelect;

// ========== RELATIONS ==========
export const entitiesRelations = relations(entities, ({ many }) => ({
  properties: many(properties),
  payments: many(payments),
}));

export const propertiesRelations = relations(properties, ({ one, many }) => ({
  entity: one(entities, { fields: [properties.entityId], references: [entities.id] }),
  units: many(units),
  tenants: many(tenants),
  leases: many(leases),
  maintenanceRequests: many(maintenanceRequests),
}));

export const unitsRelations = relations(units, ({ one, many }) => ({
  property: one(properties, { fields: [units.propertyId], references: [properties.id] }),
  tenants: many(tenants),
  leases: many(leases),
}));

export const tenantsRelations = relations(tenants, ({ one, many }) => ({
  property: one(properties, { fields: [tenants.propertyId], references: [properties.id] }),
  unit: one(units, { fields: [tenants.unitId], references: [units.id] }),
  leases: many(leases),
  payments: many(payments),
  maintenanceRequests: many(maintenanceRequests),
}));

export const leasesRelations = relations(leases, ({ one, many }) => ({
  tenant: one(tenants, { fields: [leases.tenantId], references: [tenants.id] }),
  property: one(properties, { fields: [leases.propertyId], references: [properties.id] }),
  unit: one(units, { fields: [leases.unitId], references: [units.id] }),
  rentCharges: many(rentCharges),
}));

export const rentChargesRelations = relations(rentCharges, ({ one }) => ({
  lease: one(leases, { fields: [rentCharges.leaseId], references: [leases.id] }),
  tenant: one(tenants, { fields: [rentCharges.tenantId], references: [tenants.id] }),
  property: one(properties, { fields: [rentCharges.propertyId], references: [properties.id] }),
}));

export const maintenanceRequestsRelations = relations(maintenanceRequests, ({ one, many }) => ({
  tenant: one(tenants, { fields: [maintenanceRequests.tenantId], references: [tenants.id] }),
  property: one(properties, { fields: [maintenanceRequests.propertyId], references: [properties.id] }),
  unit: one(units, { fields: [maintenanceRequests.unitId], references: [units.id] }),
  messages: many(maintenanceMessages),
  attachments: many(maintenanceAttachments),
}));

export const maintenanceMessagesRelations = relations(maintenanceMessages, ({ one }) => ({
  request: one(maintenanceRequests, { fields: [maintenanceMessages.requestId], references: [maintenanceRequests.id] }),
}));

export const maintenanceAttachmentsRelations = relations(maintenanceAttachments, ({ one }) => ({
  request: one(maintenanceRequests, { fields: [maintenanceAttachments.requestId], references: [maintenanceRequests.id] }),
  file: one(files, { fields: [maintenanceAttachments.fileId], references: [files.id] }),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  tenant: one(tenants, { fields: [payments.tenantId], references: [tenants.id] }),
  property: one(properties, { fields: [payments.propertyId], references: [properties.id] }),
  entity: one(entities, { fields: [payments.entityId], references: [entities.id] }),
}));

export const applicationsRelations = relations(applications, ({ one }) => ({
  property: one(properties, { fields: [applications.propertyId], references: [properties.id] }),
  unit: one(units, { fields: [applications.unitId], references: [units.id] }),
}));

export const userProfilesRelations = relations(userProfiles, ({ one }) => ({
  user: one(users, { fields: [userProfiles.userId], references: [users.id] }),
}));

// ========== PUBLIC PROPERTIES (For website property search) ==========
export const publicProperties = pgTable("public_properties", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  propertyId: varchar("property_id", { length: 50 }).notNull().unique(),
  address: varchar("address", { length: 500 }).notNull(),
  unitNumber: varchar("unit_number", { length: 50 }),
  bedrooms: integer("bedrooms").default(0),
  bathrooms: decimal("bathrooms", { precision: 3, scale: 1 }).default("0"),
  ownerName: varchar("owner_name", { length: 255 }),
  description: text("description"),
  amenities: text("amenities").array(),
  images: text("images").array(),
  isAvailable: boolean("is_available").default(true),
  monthlyRent: decimal("monthly_rent", { precision: 10, scale: 2 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertPublicPropertySchema = createInsertSchema(publicProperties).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertPublicProperty = z.infer<typeof insertPublicPropertySchema>;
export type PublicProperty = typeof publicProperties.$inferSelect;

// ========== LEASE DOCUMENTS ==========
export const leaseDocuments = pgTable("lease_documents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  leaseId: varchar("lease_id").references(() => leases.id),
  leaseDate: varchar("lease_date", { length: 100 }),
  landlordName: varchar("landlord_name", { length: 255 }),
  tenantNames: varchar("tenant_names", { length: 500 }),
  premisesAddress: varchar("premises_address", { length: 500 }),
  leaseTerm: varchar("lease_term", { length: 100 }),
  commencingDate: varchar("commencing_date", { length: 100 }),
  endingDate: varchar("ending_date", { length: 100 }),
  monthlyRent: varchar("monthly_rent", { length: 50 }),
  firstMonthRent: varchar("first_month_rent", { length: 50 }),
  lastMonthRent: varchar("last_month_rent", { length: 50 }),
  securityDeposit: varchar("security_deposit", { length: 50 }),
  lateFeePercent: varchar("late_fee_percent", { length: 10 }).default("5"),
  paymentInfo: text("payment_info"),
  noPets: boolean("no_pets").default(true),
  noSmoking: boolean("no_smoking").default(true),
  insuranceMinimum: varchar("insurance_minimum", { length: 50 }).default("$300,000.00"),
  repairCopay: varchar("repair_copay", { length: 50 }).default("$250"),
  acFilterCheckbox: boolean("ac_filter_checkbox").default(true),
  landlordPhone: varchar("landlord_phone", { length: 50 }),
  landlordEmail: varchar("landlord_email", { length: 255 }),
  tenantPhone: varchar("tenant_phone", { length: 50 }),
  tenantEmail: varchar("tenant_email", { length: 255 }),
  landlordSignature: text("landlord_signature"),
  landlordSignedAt: timestamp("landlord_signed_at"),
  landlordSignedBy: varchar("landlord_signed_by", { length: 255 }),
  tenantSignature: text("tenant_signature"),
  tenantSignedAt: timestamp("tenant_signed_at"),
  tenantSignedBy: varchar("tenant_signed_by", { length: 255 }),
  tenantSigningToken: varchar("tenant_signing_token", { length: 100 }).unique(),
  status: varchar("status", { length: 30 }).default("draft"),
  pdfData: text("pdf_data"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertLeaseDocumentSchema = createInsertSchema(leaseDocuments).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertLeaseDocument = z.infer<typeof insertLeaseDocumentSchema>;
export type LeaseDocument = typeof leaseDocuments.$inferSelect;

// ========== EXPENSES ==========
export const expenses = pgTable("expenses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  propertyId: varchar("property_id").references(() => properties.id),
  tenantId: varchar("tenant_id").references(() => tenants.id),
  maintenanceRequestId: varchar("maintenance_request_id").references(() => maintenanceRequests.id),
  date: varchar("date", { length: 20 }).notNull(),
  amount: varchar("amount", { length: 50 }).notNull(),
  category: varchar("category", { length: 100 }).notNull(),
  vendor: varchar("vendor", { length: 255 }),
  description: text("description"),
  notes: text("notes"),
  fileUrl: varchar("file_url", { length: 1000 }),
  fileName: varchar("file_name", { length: 500 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertExpenseSchema = createInsertSchema(expenses).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertExpense = z.infer<typeof insertExpenseSchema>;
export type Expense = typeof expenses.$inferSelect;

// ========== PROPERTY IMAGES (Database-backed persistent storage) ==========
export const propertyImages = pgTable("property_images", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  propertyId: varchar("property_id").notNull().references(() => publicProperties.id, { onDelete: "cascade" }),
  data: text("data").notNull(),
  contentType: varchar("content_type", { length: 100 }).notNull(),
  filename: varchar("filename", { length: 500 }),
  size: integer("size"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("property_images_property_id_idx").on(table.propertyId),
]);

export const insertPropertyImageSchema = createInsertSchema(propertyImages).omit({ id: true, createdAt: true });
export type InsertPropertyImage = z.infer<typeof insertPropertyImageSchema>;
export type PropertyImage = typeof propertyImages.$inferSelect;

// ========== TENANT MESSAGES (EMAIL) ==========
export const tenantMessages = pgTable("tenant_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id),
  direction: varchar("direction", { length: 10 }).notNull(),
  subject: varchar("subject", { length: 500 }).notNull(),
  body: text("body").notNull(),
  senderEmail: varchar("sender_email", { length: 255 }),
  recipientEmail: varchar("recipient_email", { length: 255 }),
  status: varchar("status", { length: 20 }).default("sent"),
  readAt: timestamp("read_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertTenantMessageSchema = createInsertSchema(tenantMessages).omit({ id: true, createdAt: true });
export type InsertTenantMessage = z.infer<typeof insertTenantMessageSchema>;
export type TenantMessage = typeof tenantMessages.$inferSelect;
