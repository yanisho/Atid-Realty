import { db } from "./db";
import { adminUsers } from "@shared/schema";
import bcrypt from "bcryptjs";

export async function seedAdminUser() {
  try {
    const existing = await db.select().from(adminUsers);
    if (existing.length > 0) {
      console.log(`Admin users already seeded (${existing.length} records found)`);
      return;
    }

    const hashedPassword = await bcrypt.hash("Admin123", 10);
    await db.insert(adminUsers).values({
      email: "info@atidrealty.com",
      password: hashedPassword,
      firstName: "Yanni",
      lastName: "Sabag",
      role: "ADMIN",
      status: "active",
      mustChangePassword: false,
    });

    console.log("Admin user seeded: info@atidrealty.com");
  } catch (error) {
    console.error("Error seeding admin user:", error);
  }
}
