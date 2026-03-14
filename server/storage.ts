import { 
  entities,
  properties, 
  units, 
  tenants, 
  leases, 
  files, 
  maintenanceRequests, 
  maintenanceMessages,
  applications, 
  payments, 
  auditLogs,
  userProfiles,
  tenantInvitations,
  adminUsers,
  publicProperties,
  leaseDocuments,
  rentCharges,
  type Entity,
  type InsertEntity,
  type Property, 
  type InsertProperty,
  type Unit,
  type InsertUnit,
  type Tenant,
  type InsertTenant,
  type Lease,
  type InsertLease,
  type File,
  type InsertFile,
  type MaintenanceRequest,
  type InsertMaintenanceRequest,
  type MaintenanceMessage,
  type InsertMaintenanceMessage,
  type Application,
  type InsertApplication,
  type Payment,
  type InsertPayment,
  type AuditLog,
  type InsertAuditLog,
  type UserProfile,
  type InsertUserProfile,
  type TenantInvitation,
  type InsertTenantInvitation,
  type AdminUser,
  type InsertAdminUser,
  type PublicProperty,
  type InsertPublicProperty,
  type LeaseDocument,
  type InsertLeaseDocument,
  expenses,
  type Expense,
  type InsertExpense,
  type RentCharge,
  type InsertRentCharge,
  invoiceItems,
  type InvoiceItem,
  type InsertInvoiceItem,
  propertyImages,
  type PropertyImage,
  type InsertPropertyImage,
  tenantMessages,
  type TenantMessage,
  type InsertTenantMessage,
  suppressedRentCharges,
} from "@shared/schema";
import { users, type User, type UpsertUser } from "@shared/models/auth";
import { db } from "./db";
import { eq, desc, and, or, sql, ilike } from "drizzle-orm";

export interface IStorage {
  // Entities (Property Owners)
  getEntities(): Promise<Entity[]>;
  getEntity(id: string): Promise<Entity | undefined>;
  createEntity(data: InsertEntity): Promise<Entity>;
  updateEntity(id: string, data: Partial<InsertEntity>): Promise<Entity | undefined>;
  deleteEntity(id: string): Promise<boolean>;
  
  // Properties
  getProperties(): Promise<Property[]>;
  getPropertiesByEntity(entityId: string): Promise<Property[]>;
  getProperty(id: string): Promise<Property | undefined>;
  getPropertyByCode(code: string): Promise<Property | undefined>;
  createProperty(data: InsertProperty): Promise<Property>;
  updateProperty(id: string, data: Partial<InsertProperty>): Promise<Property | undefined>;
  deleteProperty(id: string): Promise<boolean>;
  
  // Units
  getUnits(propertyId: string): Promise<Unit[]>;
  getUnit(id: string): Promise<Unit | undefined>;
  createUnit(data: InsertUnit): Promise<Unit>;
  
  // Tenants
  getTenants(): Promise<Tenant[]>;
  getTenant(id: string): Promise<Tenant | undefined>;
  getTenantByUserId(userId: string): Promise<Tenant | undefined>;
  createTenant(data: InsertTenant): Promise<Tenant>;
  updateTenant(id: string, data: Partial<InsertTenant>): Promise<Tenant | undefined>;
  deleteTenant(id: string): Promise<boolean>;
  
  // Leases
  getLeases(tenantId?: string): Promise<Lease[]>;
  getLeasesByProperty(propertyId: string): Promise<Lease[]>;
  getLease(id: string): Promise<Lease | undefined>;
  createLease(data: InsertLease): Promise<Lease>;
  updateLease(id: string, data: Partial<InsertLease>): Promise<Lease | undefined>;
  deleteLease(id: string): Promise<boolean>;
  
  // Maintenance
  getMaintenanceRequests(filters?: { tenantId?: string; propertyId?: string; status?: string }): Promise<MaintenanceRequest[]>;
  getMaintenanceRequest(id: string): Promise<MaintenanceRequest | undefined>;
  getMaintenanceRequestByTicket(ticketNumber: string): Promise<MaintenanceRequest | undefined>;
  createMaintenanceRequest(data: InsertMaintenanceRequest): Promise<MaintenanceRequest>;
  updateMaintenanceRequest(id: string, data: Partial<InsertMaintenanceRequest>): Promise<MaintenanceRequest | undefined>;
  deleteMaintenanceRequest(id: string): Promise<boolean>;
  getMaintenanceMessages(requestId: string): Promise<MaintenanceMessage[]>;
  createMaintenanceMessage(data: InsertMaintenanceMessage): Promise<MaintenanceMessage>;
  
  // Applications
  getApplications(userId?: string): Promise<Application[]>;
  getApplication(id: string): Promise<Application | undefined>;
  createApplication(data: InsertApplication): Promise<Application>;
  updateApplication(id: string, data: Partial<InsertApplication>): Promise<Application | undefined>;
  
  // Payments
  getPayments(filters?: { tenantId?: string; propertyId?: string }): Promise<Payment[]>;
  getPayment(id: string): Promise<Payment | undefined>;
  getPaymentByStripeIntentId(stripePaymentIntentId: string): Promise<Payment | undefined>;
  createPayment(data: InsertPayment): Promise<Payment>;
  updatePayment(id: string, data: Partial<InsertPayment>): Promise<Payment | undefined>;
  
  // Files
  getFiles(ownerType?: string, ownerId?: string): Promise<File[]>;
  getFile(id: string): Promise<File | undefined>;
  createFile(data: InsertFile): Promise<File>;
  updateFile(id: string, data: Partial<InsertFile>): Promise<File | undefined>;
  deleteFile(id: string): Promise<boolean>;
  
  // User Profiles
  getUserProfile(userId: string): Promise<UserProfile | undefined>;
  createUserProfile(data: InsertUserProfile): Promise<UserProfile>;
  updateUserProfile(userId: string, data: Partial<InsertUserProfile>): Promise<UserProfile | undefined>;
  
  // Audit Logs
  createAuditLog(data: InsertAuditLog): Promise<AuditLog>;
  
  // Users (for admin)
  getUsers(): Promise<User[]>;
  getUser(id: string): Promise<User | undefined>;
  
  // Tenant Invitations
  getTenantInvitation(id: string): Promise<TenantInvitation | undefined>;
  getTenantInvitationByToken(token: string): Promise<TenantInvitation | undefined>;
  getTenantInvitationsByTenant(tenantId: string): Promise<TenantInvitation[]>;
  createTenantInvitation(data: InsertTenantInvitation): Promise<TenantInvitation>;
  updateTenantInvitation(id: string, data: Partial<InsertTenantInvitation>): Promise<TenantInvitation | undefined>;
  
  // Admin Users
  getAdminUsers(): Promise<AdminUser[]>;
  getAdminUser(id: string): Promise<AdminUser | undefined>;
  getAdminUserByEmail(email: string): Promise<AdminUser | undefined>;
  createAdminUser(data: InsertAdminUser): Promise<AdminUser>;
  updateAdminUser(id: string, data: Partial<InsertAdminUser>): Promise<AdminUser | undefined>;
  deleteAdminUser(id: string): Promise<boolean>;
  
  // Public Properties (Website property search)
  getPublicProperties(): Promise<PublicProperty[]>;
  getPublicProperty(id: string): Promise<PublicProperty | undefined>;
  getPublicPropertyByPropertyId(propertyId: string): Promise<PublicProperty | undefined>;
  createPublicProperty(data: InsertPublicProperty): Promise<PublicProperty>;
  updatePublicProperty(id: string, data: Partial<InsertPublicProperty>): Promise<PublicProperty | undefined>;
  deletePublicProperty(id: string): Promise<boolean>;
  
  // Lease Documents
  getLeaseDocuments(): Promise<LeaseDocument[]>;
  getLeaseDocument(id: string): Promise<LeaseDocument | undefined>;
  getLeaseDocumentByToken(token: string): Promise<LeaseDocument | undefined>;
  getLeaseDocumentByLeaseId(leaseId: string): Promise<LeaseDocument | undefined>;
  createLeaseDocument(data: InsertLeaseDocument): Promise<LeaseDocument>;
  updateLeaseDocument(id: string, data: Partial<InsertLeaseDocument>): Promise<LeaseDocument | undefined>;
  deleteLeaseDocument(id: string): Promise<boolean>;

  // Expenses
  getExpenses(filters?: { propertyId?: string; tenantId?: string; category?: string }): Promise<Expense[]>;
  getExpense(id: string): Promise<Expense | undefined>;
  createExpense(data: InsertExpense): Promise<Expense>;
  updateExpense(id: string, data: Partial<InsertExpense>): Promise<Expense | undefined>;
  deleteExpense(id: string): Promise<boolean>;

  // Rent Charges
  getRentCharges(filters?: { leaseId?: string; tenantId?: string; propertyId?: string; status?: string; chargeMonth?: string }): Promise<RentCharge[]>;
  getRentCharge(id: string): Promise<RentCharge | undefined>;
  getRentChargeByLeaseAndMonth(leaseId: string, chargeMonth: string): Promise<RentCharge | undefined>;
  createRentCharge(data: InsertRentCharge): Promise<RentCharge>;
  updateRentCharge(id: string, data: Partial<InsertRentCharge>): Promise<RentCharge | undefined>;
  deleteRentCharge(id: string): Promise<boolean>;
  getActiveLeases(): Promise<Lease[]>;
  
  // Invoice Items
  getInvoiceItems(rentChargeId: string): Promise<InvoiceItem[]>;
  createInvoiceItem(data: InsertInvoiceItem): Promise<InvoiceItem>;
  updateInvoiceItem(id: string, data: Partial<InsertInvoiceItem>): Promise<InvoiceItem | undefined>;
  deleteInvoiceItem(id: string): Promise<boolean>;

  // Property Images
  getPropertyImages(propertyId: string): Promise<PropertyImage[]>;
  getPropertyImage(id: string): Promise<PropertyImage | undefined>;
  createPropertyImage(data: InsertPropertyImage): Promise<PropertyImage>;
  deletePropertyImage(id: string): Promise<boolean>;

  getTenantMessages(tenantId: string): Promise<TenantMessage[]>;
  getAllTenantMessages(): Promise<TenantMessage[]>;
  createTenantMessage(data: InsertTenantMessage): Promise<TenantMessage>;
}

export class DatabaseStorage implements IStorage {
  // Entities (Property Owners)
  async getEntities(): Promise<Entity[]> {
    return db.select().from(entities).orderBy(desc(entities.createdAt));
  }

  async getEntity(id: string): Promise<Entity | undefined> {
    const [entity] = await db.select().from(entities).where(eq(entities.id, id));
    return entity || undefined;
  }

  async createEntity(data: InsertEntity): Promise<Entity> {
    const [entity] = await db.insert(entities).values(data).returning();
    return entity;
  }

  async updateEntity(id: string, data: Partial<InsertEntity>): Promise<Entity | undefined> {
    const [entity] = await db
      .update(entities)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(entities.id, id))
      .returning();
    return entity || undefined;
  }

  async deleteEntity(id: string): Promise<boolean> {
    const result = await db.delete(entities).where(eq(entities.id, id)).returning();
    return result.length > 0;
  }

  // Properties
  async getProperties(): Promise<Property[]> {
    return db.select().from(properties).orderBy(desc(properties.createdAt));
  }

  async getPropertiesByEntity(entityId: string): Promise<Property[]> {
    return db.select().from(properties).where(eq(properties.entityId, entityId)).orderBy(desc(properties.createdAt));
  }

  async getProperty(id: string): Promise<Property | undefined> {
    const [property] = await db.select().from(properties).where(eq(properties.id, id));
    return property || undefined;
  }

  async getPropertyByCode(code: string): Promise<Property | undefined> {
    const [property] = await db.select().from(properties).where(eq(properties.propertyCode, code));
    return property || undefined;
  }

  async createProperty(data: InsertProperty): Promise<Property> {
    const [property] = await db.insert(properties).values(data).returning();
    return property;
  }

  async updateProperty(id: string, data: Partial<InsertProperty>): Promise<Property | undefined> {
    const [property] = await db
      .update(properties)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(properties.id, id))
      .returning();
    return property || undefined;
  }

  async deleteProperty(id: string): Promise<boolean> {
    const propertyLeases = await db.select({ id: leases.id }).from(leases).where(eq(leases.propertyId, id));
    const leaseIds = propertyLeases.map(l => l.id);
    if (leaseIds.length > 0) {
      for (const leaseId of leaseIds) {
        await db.delete(leaseDocuments).where(eq(leaseDocuments.leaseId, leaseId));
        await db.delete(suppressedRentCharges).where(eq(suppressedRentCharges.leaseId, leaseId));
      }
    }
    await db.delete(rentCharges).where(eq(rentCharges.propertyId, id));
    await db.delete(leases).where(eq(leases.propertyId, id));
    const propertyUnits = await db.select({ id: units.id }).from(units).where(eq(units.propertyId, id));
    const unitIds = propertyUnits.map(u => u.id);
    if (unitIds.length > 0) {
      for (const unitId of unitIds) {
        await db.update(tenants).set({ unitId: null }).where(eq(tenants.unitId, unitId));
        await db.update(maintenanceRequests).set({ unitId: null }).where(eq(maintenanceRequests.unitId, unitId));
        await db.update(applications).set({ unitId: null }).where(eq(applications.unitId, unitId));
      }
    }
    await db.delete(units).where(eq(units.propertyId, id));
    await db.update(tenants).set({ propertyId: null }).where(eq(tenants.propertyId, id));
    await db.update(maintenanceRequests).set({ propertyId: null }).where(eq(maintenanceRequests.propertyId, id));
    await db.update(applications).set({ propertyId: null }).where(eq(applications.propertyId, id));
    await db.update(payments).set({ propertyId: null }).where(eq(payments.propertyId, id));
    await db.update(expenses).set({ propertyId: null }).where(eq(expenses.propertyId, id));
    await db.delete(files).where(and(eq(files.ownerType, "property"), eq(files.ownerId, id)));
    const result = await db.delete(properties).where(eq(properties.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Units
  async getUnits(propertyId: string): Promise<Unit[]> {
    return db.select().from(units).where(eq(units.propertyId, propertyId));
  }

  async getUnit(id: string): Promise<Unit | undefined> {
    const [unit] = await db.select().from(units).where(eq(units.id, id));
    return unit || undefined;
  }

  async createUnit(data: InsertUnit): Promise<Unit> {
    const [unit] = await db.insert(units).values(data).returning();
    return unit;
  }

  // Tenants
  async getTenants(): Promise<Tenant[]> {
    return db.select().from(tenants).orderBy(desc(tenants.createdAt));
  }

  async getTenant(id: string): Promise<Tenant | undefined> {
    const [tenant] = await db.select().from(tenants).where(eq(tenants.id, id));
    return tenant || undefined;
  }

  async getTenantByUserId(userId: string): Promise<Tenant | undefined> {
    const [tenant] = await db.select().from(tenants).where(eq(tenants.userId, userId));
    return tenant || undefined;
  }

  async createTenant(data: InsertTenant): Promise<Tenant> {
    const [tenant] = await db.insert(tenants).values(data).returning();
    return tenant;
  }

  async updateTenant(id: string, data: Partial<InsertTenant>): Promise<Tenant | undefined> {
    const [tenant] = await db.update(tenants).set(data).where(eq(tenants.id, id)).returning();
    return tenant || undefined;
  }

  async deleteTenant(id: string): Promise<boolean> {
    const tenantLeases = await db.select({ id: leases.id }).from(leases).where(eq(leases.tenantId, id));
    const leaseIds = tenantLeases.map(l => l.id);
    if (leaseIds.length > 0) {
      for (const leaseId of leaseIds) {
        await db.delete(leaseDocuments).where(eq(leaseDocuments.leaseId, leaseId));
        await db.delete(suppressedRentCharges).where(eq(suppressedRentCharges.leaseId, leaseId));
      }
    }
    await db.delete(tenantMessages).where(eq(tenantMessages.tenantId, id));
    await db.delete(tenantInvitations).where(eq(tenantInvitations.tenantId, id));
    await db.delete(rentCharges).where(eq(rentCharges.tenantId, id));
    await db.delete(leases).where(eq(leases.tenantId, id));
    await db.update(maintenanceRequests).set({ tenantId: null }).where(eq(maintenanceRequests.tenantId, id));
    await db.update(payments).set({ tenantId: null }).where(eq(payments.tenantId, id));
    await db.update(expenses).set({ tenantId: null }).where(eq(expenses.tenantId, id));
    await db.delete(files).where(and(eq(files.ownerType, "tenant"), eq(files.ownerId, id)));
    const result = await db.delete(tenants).where(eq(tenants.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Leases
  async getLeases(tenantId?: string): Promise<Lease[]> {
    if (tenantId) {
      return db.select().from(leases).where(eq(leases.tenantId, tenantId)).orderBy(desc(leases.createdAt));
    }
    return db.select().from(leases).orderBy(desc(leases.createdAt));
  }

  async getLease(id: string): Promise<Lease | undefined> {
    const [lease] = await db.select().from(leases).where(eq(leases.id, id));
    return lease || undefined;
  }

  async createLease(data: InsertLease): Promise<Lease> {
    const [lease] = await db.insert(leases).values(data).returning();
    return lease;
  }

  async getLeasesByProperty(propertyId: string): Promise<Lease[]> {
    return db.select().from(leases).where(eq(leases.propertyId, propertyId)).orderBy(desc(leases.createdAt));
  }

  async updateLease(id: string, data: Partial<InsertLease>): Promise<Lease | undefined> {
    const [lease] = await db.update(leases).set(data).where(eq(leases.id, id)).returning();
    return lease || undefined;
  }

  async deleteLease(id: string): Promise<boolean> {
    return await db.transaction(async (tx) => {
      await tx.delete(rentCharges).where(eq(rentCharges.leaseId, id));
      await tx.delete(leaseDocuments).where(eq(leaseDocuments.leaseId, id));
      await tx.delete(suppressedRentCharges).where(eq(suppressedRentCharges.leaseId, id));
      const result = await tx.delete(leases).where(eq(leases.id, id)).returning();
      return result.length > 0;
    });
  }

  // Maintenance Requests
  async getMaintenanceRequests(filters?: { tenantId?: string; propertyId?: string; status?: string }): Promise<MaintenanceRequest[]> {
    let query = db.select().from(maintenanceRequests);
    
    const conditions = [];
    if (filters?.tenantId) conditions.push(eq(maintenanceRequests.tenantId, filters.tenantId));
    if (filters?.propertyId) conditions.push(eq(maintenanceRequests.propertyId, filters.propertyId));
    if (filters?.status) conditions.push(eq(maintenanceRequests.status, filters.status));
    
    if (conditions.length > 0) {
      return db.select().from(maintenanceRequests).where(and(...conditions)).orderBy(desc(maintenanceRequests.createdAt));
    }
    return db.select().from(maintenanceRequests).orderBy(desc(maintenanceRequests.createdAt));
  }

  async getMaintenanceRequest(id: string): Promise<MaintenanceRequest | undefined> {
    const [request] = await db.select().from(maintenanceRequests).where(eq(maintenanceRequests.id, id));
    return request || undefined;
  }

  async getMaintenanceRequestByTicket(ticketNumber: string): Promise<MaintenanceRequest | undefined> {
    const [request] = await db.select().from(maintenanceRequests).where(eq(maintenanceRequests.ticketNumber, ticketNumber));
    return request || undefined;
  }

  async createMaintenanceRequest(data: InsertMaintenanceRequest): Promise<MaintenanceRequest> {
    const ticketNumber = `MR-${Date.now().toString(36).toUpperCase()}`;
    const [request] = await db.insert(maintenanceRequests).values({ ...data, ticketNumber }).returning();
    return request;
  }

  async updateMaintenanceRequest(id: string, data: Partial<InsertMaintenanceRequest>): Promise<MaintenanceRequest | undefined> {
    const [request] = await db
      .update(maintenanceRequests)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(maintenanceRequests.id, id))
      .returning();
    return request || undefined;
  }

  async deleteMaintenanceRequest(id: string): Promise<boolean> {
    await db.delete(maintenanceMessages).where(eq(maintenanceMessages.requestId, id));
    const result = await db.delete(maintenanceRequests).where(eq(maintenanceRequests.id, id)).returning();
    return result.length > 0;
  }

  async getMaintenanceMessages(requestId: string): Promise<MaintenanceMessage[]> {
    return db.select().from(maintenanceMessages).where(eq(maintenanceMessages.requestId, requestId)).orderBy(maintenanceMessages.createdAt);
  }

  async createMaintenanceMessage(data: InsertMaintenanceMessage): Promise<MaintenanceMessage> {
    const [message] = await db.insert(maintenanceMessages).values(data).returning();
    return message;
  }

  // Applications
  async getApplications(userId?: string): Promise<Application[]> {
    if (userId) {
      return db.select().from(applications).where(eq(applications.applicantUserId, userId)).orderBy(desc(applications.createdAt));
    }
    return db.select().from(applications).orderBy(desc(applications.createdAt));
  }

  async getApplication(id: string): Promise<Application | undefined> {
    const [application] = await db.select().from(applications).where(eq(applications.id, id));
    return application || undefined;
  }

  async createApplication(data: InsertApplication): Promise<Application> {
    const [application] = await db.insert(applications).values({
      ...data,
      submittedAt: data.status === "submitted" ? new Date() : null,
    }).returning();
    return application;
  }

  async updateApplication(id: string, data: Partial<InsertApplication>): Promise<Application | undefined> {
    const [application] = await db
      .update(applications)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(applications.id, id))
      .returning();
    return application || undefined;
  }

  // Payments
  async getPayments(filters?: { tenantId?: string; propertyId?: string }): Promise<Payment[]> {
    if (filters?.tenantId) {
      return db.select().from(payments).where(eq(payments.tenantId, filters.tenantId)).orderBy(desc(payments.createdAt));
    }
    if (filters?.propertyId) {
      return db.select().from(payments).where(eq(payments.propertyId, filters.propertyId)).orderBy(desc(payments.createdAt));
    }
    return db.select().from(payments).orderBy(desc(payments.createdAt));
  }

  async getPayment(id: string): Promise<Payment | undefined> {
    const [payment] = await db.select().from(payments).where(eq(payments.id, id));
    return payment || undefined;
  }

  async getPaymentByStripeIntentId(stripePaymentIntentId: string): Promise<Payment | undefined> {
    const [payment] = await db.select().from(payments).where(eq(payments.stripePaymentIntentId, stripePaymentIntentId));
    return payment || undefined;
  }

  async createPayment(data: InsertPayment): Promise<Payment> {
    const [payment] = await db.insert(payments).values(data).returning();
    return payment;
  }

  async updatePayment(id: string, data: Partial<InsertPayment>): Promise<Payment | undefined> {
    const [payment] = await db.update(payments).set(data).where(eq(payments.id, id)).returning();
    return payment || undefined;
  }

  // Files
  async getFiles(ownerType?: string, ownerId?: string): Promise<File[]> {
    if (ownerType && ownerId) {
      return db.select().from(files).where(and(eq(files.ownerType, ownerType), eq(files.ownerId, ownerId)));
    }
    return db.select().from(files).orderBy(desc(files.createdAt));
  }

  async getFile(id: string): Promise<File | undefined> {
    const [file] = await db.select().from(files).where(eq(files.id, id));
    return file || undefined;
  }

  async createFile(data: InsertFile): Promise<File> {
    const [file] = await db.insert(files).values(data).returning();
    return file;
  }

  async updateFile(id: string, data: Partial<InsertFile>): Promise<File | undefined> {
    const [file] = await db.update(files).set(data).where(eq(files.id, id)).returning();
    return file || undefined;
  }

  async deleteFile(id: string): Promise<boolean> {
    const result = await db.delete(files).where(eq(files.id, id)).returning();
    return result.length > 0;
  }

  // User Profiles
  async getUserProfile(userId: string): Promise<UserProfile | undefined> {
    const [profile] = await db.select().from(userProfiles).where(eq(userProfiles.userId, userId));
    return profile || undefined;
  }

  async createUserProfile(data: InsertUserProfile): Promise<UserProfile> {
    const [profile] = await db.insert(userProfiles).values(data).returning();
    return profile;
  }

  async updateUserProfile(userId: string, data: Partial<InsertUserProfile>): Promise<UserProfile | undefined> {
    const [profile] = await db
      .update(userProfiles)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(userProfiles.userId, userId))
      .returning();
    return profile || undefined;
  }

  // Audit Logs
  async createAuditLog(data: InsertAuditLog): Promise<AuditLog> {
    const [log] = await db.insert(auditLogs).values(data).returning();
    return log;
  }

  // Users (for admin)
  async getUsers(): Promise<User[]> {
    return db.select().from(users).orderBy(desc(users.createdAt));
  }

  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  // Tenant Invitations
  async getTenantInvitation(id: string): Promise<TenantInvitation | undefined> {
    const [invitation] = await db.select().from(tenantInvitations).where(eq(tenantInvitations.id, id));
    return invitation || undefined;
  }

  async getTenantInvitationByToken(token: string): Promise<TenantInvitation | undefined> {
    const [invitation] = await db.select().from(tenantInvitations).where(eq(tenantInvitations.token, token));
    return invitation || undefined;
  }

  async getTenantInvitationsByTenant(tenantId: string): Promise<TenantInvitation[]> {
    return db.select().from(tenantInvitations).where(eq(tenantInvitations.tenantId, tenantId)).orderBy(desc(tenantInvitations.createdAt));
  }

  async createTenantInvitation(data: InsertTenantInvitation): Promise<TenantInvitation> {
    const [invitation] = await db.insert(tenantInvitations).values(data).returning();
    return invitation;
  }

  async updateTenantInvitation(id: string, data: Partial<InsertTenantInvitation>): Promise<TenantInvitation | undefined> {
    const [invitation] = await db
      .update(tenantInvitations)
      .set(data)
      .where(eq(tenantInvitations.id, id))
      .returning();
    return invitation || undefined;
  }

  // Admin Users
  async getAdminUser(id: string): Promise<AdminUser | undefined> {
    const [admin] = await db.select().from(adminUsers).where(eq(adminUsers.id, id));
    return admin || undefined;
  }

  async getAdminUserByEmail(email: string): Promise<AdminUser | undefined> {
    const [admin] = await db.select().from(adminUsers).where(eq(adminUsers.email, email.toLowerCase()));
    return admin || undefined;
  }

  async createAdminUser(data: InsertAdminUser): Promise<AdminUser> {
    const [admin] = await db.insert(adminUsers).values({
      ...data,
      email: data.email.toLowerCase(),
    }).returning();
    return admin;
  }

  async updateAdminUser(id: string, data: Partial<InsertAdminUser>): Promise<AdminUser | undefined> {
    const updateData = { ...data };
    if (updateData.email) {
      updateData.email = updateData.email.toLowerCase();
    }
    const [admin] = await db
      .update(adminUsers)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(adminUsers.id, id))
      .returning();
    return admin || undefined;
  }

  async getAdminUsers(): Promise<AdminUser[]> {
    return db.select().from(adminUsers).orderBy(desc(adminUsers.createdAt));
  }

  async deleteAdminUser(id: string): Promise<boolean> {
    const result = await db.delete(adminUsers).where(eq(adminUsers.id, id)).returning();
    return result.length > 0;
  }

  // Public Properties (Website property search)
  async getPublicProperties(): Promise<PublicProperty[]> {
    return db.select().from(publicProperties).orderBy(publicProperties.address);
  }

  async getPublicProperty(id: string): Promise<PublicProperty | undefined> {
    const [property] = await db.select().from(publicProperties).where(eq(publicProperties.id, id));
    return property || undefined;
  }

  async getPublicPropertyByPropertyId(propertyId: string): Promise<PublicProperty | undefined> {
    const [property] = await db.select().from(publicProperties).where(eq(publicProperties.propertyId, propertyId));
    return property || undefined;
  }

  async createPublicProperty(data: InsertPublicProperty): Promise<PublicProperty> {
    const [property] = await db.insert(publicProperties).values(data).returning();
    return property;
  }

  async updatePublicProperty(id: string, data: Partial<InsertPublicProperty>): Promise<PublicProperty | undefined> {
    const [property] = await db
      .update(publicProperties)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(publicProperties.id, id))
      .returning();
    return property || undefined;
  }

  async deletePublicProperty(id: string): Promise<boolean> {
    const result = await db.delete(publicProperties).where(eq(publicProperties.id, id)).returning();
    return result.length > 0;
  }

  // Lease Documents
  async getLeaseDocuments(): Promise<LeaseDocument[]> {
    return db.select().from(leaseDocuments).orderBy(desc(leaseDocuments.createdAt));
  }

  async getLeaseDocument(id: string): Promise<LeaseDocument | undefined> {
    const [doc] = await db.select().from(leaseDocuments).where(eq(leaseDocuments.id, id));
    return doc || undefined;
  }

  async getLeaseDocumentByToken(token: string): Promise<LeaseDocument | undefined> {
    const [doc] = await db.select().from(leaseDocuments).where(eq(leaseDocuments.tenantSigningToken, token));
    return doc || undefined;
  }

  async getLeaseDocumentByLeaseId(leaseId: string): Promise<LeaseDocument | undefined> {
    const [doc] = await db.select().from(leaseDocuments).where(eq(leaseDocuments.leaseId, leaseId));
    return doc || undefined;
  }

  async createLeaseDocument(data: InsertLeaseDocument): Promise<LeaseDocument> {
    const [doc] = await db.insert(leaseDocuments).values(data).returning();
    return doc;
  }

  async updateLeaseDocument(id: string, data: Partial<InsertLeaseDocument>): Promise<LeaseDocument | undefined> {
    const [doc] = await db
      .update(leaseDocuments)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(leaseDocuments.id, id))
      .returning();
    return doc || undefined;
  }

  async deleteLeaseDocument(id: string): Promise<boolean> {
    const result = await db.delete(leaseDocuments).where(eq(leaseDocuments.id, id)).returning();
    return result.length > 0;
  }

  // Expenses
  async getExpenses(filters?: { propertyId?: string; tenantId?: string; category?: string }): Promise<Expense[]> {
    const conditions = [];
    if (filters?.propertyId) conditions.push(eq(expenses.propertyId, filters.propertyId));
    if (filters?.tenantId) conditions.push(eq(expenses.tenantId, filters.tenantId));
    if (filters?.category) conditions.push(eq(expenses.category, filters.category));
    if (conditions.length > 0) {
      return db.select().from(expenses).where(and(...conditions)).orderBy(desc(expenses.date));
    }
    return db.select().from(expenses).orderBy(desc(expenses.date));
  }

  async getExpense(id: string): Promise<Expense | undefined> {
    const [expense] = await db.select().from(expenses).where(eq(expenses.id, id));
    return expense || undefined;
  }

  async createExpense(data: InsertExpense): Promise<Expense> {
    const [expense] = await db.insert(expenses).values(data).returning();
    return expense;
  }

  async updateExpense(id: string, data: Partial<InsertExpense>): Promise<Expense | undefined> {
    const [expense] = await db
      .update(expenses)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(expenses.id, id))
      .returning();
    return expense || undefined;
  }

  async deleteExpense(id: string): Promise<boolean> {
    const result = await db.delete(expenses).where(eq(expenses.id, id)).returning();
    return result.length > 0;
  }

  // Rent Charges
  async getRentCharges(filters?: { leaseId?: string; tenantId?: string; propertyId?: string; status?: string; chargeMonth?: string }): Promise<RentCharge[]> {
    const conditions: any[] = [];
    if (filters?.leaseId) conditions.push(eq(rentCharges.leaseId, filters.leaseId));
    if (filters?.tenantId) conditions.push(eq(rentCharges.tenantId, filters.tenantId));
    if (filters?.propertyId) conditions.push(eq(rentCharges.propertyId, filters.propertyId));
    if (filters?.status) conditions.push(eq(rentCharges.status, filters.status));
    if (filters?.chargeMonth) conditions.push(eq(rentCharges.chargeMonth, filters.chargeMonth));
    if (conditions.length > 0) {
      return db.select().from(rentCharges).where(and(...conditions)).orderBy(desc(rentCharges.dueDate));
    }
    return db.select().from(rentCharges).orderBy(desc(rentCharges.dueDate));
  }

  async getRentCharge(id: string): Promise<RentCharge | undefined> {
    const [charge] = await db.select().from(rentCharges).where(eq(rentCharges.id, id));
    return charge || undefined;
  }

  async getRentChargeByLeaseAndMonth(leaseId: string, chargeMonth: string): Promise<RentCharge | undefined> {
    const [charge] = await db.select().from(rentCharges)
      .where(and(eq(rentCharges.leaseId, leaseId), eq(rentCharges.chargeMonth, chargeMonth)));
    return charge || undefined;
  }

  async createRentCharge(data: InsertRentCharge): Promise<RentCharge> {
    const [charge] = await db.insert(rentCharges).values(data).returning();
    return charge;
  }

  async updateRentCharge(id: string, data: Partial<InsertRentCharge>): Promise<RentCharge | undefined> {
    const [charge] = await db.update(rentCharges).set(data).where(eq(rentCharges.id, id)).returning();
    return charge || undefined;
  }

  async deleteRentCharge(id: string): Promise<boolean> {
    const result = await db.delete(rentCharges).where(eq(rentCharges.id, id)).returning();
    return result.length > 0;
  }

  async getActiveLeases(): Promise<Lease[]> {
    return db.select().from(leases).where(eq(leases.status, "active"));
  }

  // Invoice Items
  async getInvoiceItems(rentChargeId: string): Promise<InvoiceItem[]> {
    return db.select().from(invoiceItems).where(eq(invoiceItems.rentChargeId, rentChargeId));
  }

  async createInvoiceItem(data: InsertInvoiceItem): Promise<InvoiceItem> {
    const [item] = await db.insert(invoiceItems).values(data).returning();
    return item;
  }

  async updateInvoiceItem(id: string, data: Partial<InsertInvoiceItem>): Promise<InvoiceItem | undefined> {
    const [item] = await db.update(invoiceItems).set(data).where(eq(invoiceItems.id, id)).returning();
    return item || undefined;
  }

  async deleteInvoiceItem(id: string): Promise<boolean> {
    const result = await db.delete(invoiceItems).where(eq(invoiceItems.id, id)).returning();
    return result.length > 0;
  }

  // Property Images
  async getPropertyImages(propertyId: string): Promise<PropertyImage[]> {
    return db.select().from(propertyImages).where(eq(propertyImages.propertyId, propertyId)).orderBy(propertyImages.createdAt);
  }

  async getPropertyImage(id: string): Promise<PropertyImage | undefined> {
    const [image] = await db.select().from(propertyImages).where(eq(propertyImages.id, id));
    return image || undefined;
  }

  async createPropertyImage(data: InsertPropertyImage): Promise<PropertyImage> {
    const [image] = await db.insert(propertyImages).values(data).returning();
    return image;
  }

  async deletePropertyImage(id: string): Promise<boolean> {
    const result = await db.delete(propertyImages).where(eq(propertyImages.id, id)).returning();
    return result.length > 0;
  }

  async getTenantMessages(tenantId: string): Promise<TenantMessage[]> {
    return db.select().from(tenantMessages).where(eq(tenantMessages.tenantId, tenantId)).orderBy(desc(tenantMessages.createdAt));
  }

  async getAllTenantMessages(): Promise<TenantMessage[]> {
    return db.select().from(tenantMessages).orderBy(desc(tenantMessages.createdAt));
  }

  async createTenantMessage(data: InsertTenantMessage): Promise<TenantMessage> {
    const [message] = await db.insert(tenantMessages).values(data).returning();
    return message;
  }
}

export const storage = new DatabaseStorage();
