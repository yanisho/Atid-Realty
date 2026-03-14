import { pool } from "./db";
import { db } from "./db";
import { entities } from "@shared/schema";
import { sql } from "drizzle-orm";
import seedData from "./seed-data.json";

async function insertRows(tableName: string, rows: any[]) {
  if (!rows || rows.length === 0) return;
  
  let inserted = 0;
  for (const row of rows) {
    try {
      const columns = Object.keys(row);
      const colList = columns.map(c => `"${c}"`).join(", ");
      const placeholders = columns.map((_, i) => `$${i + 1}`).join(", ");
      const values = columns.map(c => row[c]);
      
      const query = `INSERT INTO "${tableName}" (${colList}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`;
      await pool.query(query, values);
      inserted++;
    } catch (e: any) {
      console.error(`[SEED] ${tableName} row error:`, e.message?.substring(0, 200));
    }
  }
  console.log(`[SEED] ${tableName}: ${inserted}/${rows.length} rows inserted`);
}

export async function seedProductionData() {
  try {
    const [entityCount] = await db.select({ count: sql<number>`count(*)` }).from(entities);
    
    if (Number(entityCount.count) > 0) {
      console.log("Production data already exists, skipping seed");
      return;
    }

    console.log("[SEED] Production database is empty, seeding data...");

    const tableOrder = [
      "entities",
      "properties",
      "tenants",
      "tenant_invitations",
      "leases",
      "files",
      "maintenance_requests",
      "rent_charges",
      "invoice_items",
      "payments",
      "admin_users",
      "lease_documents",
    ];

    for (const table of tableOrder) {
      const rows = (seedData as any)[table];
      if (rows && rows.length > 0) {
        await insertRows(table, rows);
      }
    }

    console.log("[SEED] Production data seeding complete!");
  } catch (error) {
    console.error("[SEED] Error seeding production data:", error);
  }
}
