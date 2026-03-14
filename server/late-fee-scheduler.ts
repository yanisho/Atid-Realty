import { storage } from "./storage";
import { db } from "./db";
import { suppressedRentCharges } from "@shared/schema";
import { eq, and } from "drizzle-orm";

function getEasternNow(): Date {
  const utcNow = new Date();
  const eastern = new Date(utcNow.toLocaleString("en-US", { timeZone: "America/New_York" }));
  return eastern;
}

function getEasternMonth(): string {
  const now = getEasternNow();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

async function generateMonthlyCharges(targetMonth: string) {
  const activeLeases = await storage.getActiveLeases();
  let generated = 0;

  const suppressions = await db.select().from(suppressedRentCharges)
    .where(and(eq(suppressedRentCharges.chargeMonth, targetMonth), eq(suppressedRentCharges.type, "invoice")));
  const suppressedSet = new Set(suppressions.map(s => s.leaseId));

  for (const lease of activeLeases) {
    if (suppressedSet.has(lease.id)) continue;

    const existing = await storage.getRentChargeByLeaseAndMonth(lease.id, targetMonth);
    if (existing) continue;

    const [year, monthNum] = targetMonth.split("-").map(Number);
    const dueDate = new Date(Date.UTC(year, monthNum - 1, 1));

    await storage.createRentCharge({
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
    generated++;
  }

  return generated;
}

async function applyLateFees(targetMonth: string) {
  const now = getEasternNow();
  const openCharges = await storage.getRentCharges({ chargeMonth: targetMonth });
  let applied = 0;

  const suppressions = await db.select().from(suppressedRentCharges)
    .where(and(eq(suppressedRentCharges.chargeMonth, targetMonth), eq(suppressedRentCharges.type, "latefee")));
  const suppressedLateFeeSet = new Set(suppressions.map(s => s.leaseId));

  for (const charge of openCharges) {
    if (charge.lateFeeApplied) continue;
    if (charge.status === "paid") continue;

    if (charge.leaseId && suppressedLateFeeSet.has(charge.leaseId)) continue;

    const amountPaid = parseFloat(charge.amountPaid || "0");
    const totalDue = parseFloat(charge.totalDue || "0");
    if (amountPaid >= totalDue) continue;

    const leaseData = charge.leaseId ? await storage.getLease(charge.leaseId) : null;
    const graceDays = leaseData?.lateFeeGraceDays ?? 5;
    const lateFeeRate = parseFloat(leaseData?.lateFeeRate || "0.05");

    const [year, monthNum] = targetMonth.split("-").map(Number);
    const graceDeadline = new Date(year, monthNum - 1, graceDays + 1);

    if (now < graceDeadline) continue;

    const baseRent = parseFloat(charge.baseRent);
    const lateFeeAmount = parseFloat((baseRent * lateFeeRate).toFixed(2));
    const newTotal = parseFloat((baseRent + lateFeeAmount).toFixed(2));

    await storage.updateRentCharge(charge.id, {
      lateFeeApplied: true,
      lateFeeAppliedAt: new Date(),
      lateFeeAmount: lateFeeAmount.toString(),
      totalDue: newTotal.toString(),
      status: amountPaid > 0 ? "partial" : "late",
    });
    applied++;
  }

  return applied;
}

export function startLateFeeScheduler() {
  const CHECK_INTERVAL = 60 * 60 * 1000;

  async function checkAndApply() {
    try {
      const currentMonth = getEasternMonth();

      const generated = await generateMonthlyCharges(currentMonth);
      if (generated > 0) {
        console.log(`[Scheduler] Generated ${generated} rent charges for ${currentMonth}`);
      }

      const applied = await applyLateFees(currentMonth);
      if (applied > 0) {
        console.log(`[Scheduler] Applied late fees to ${applied} charges for ${currentMonth}`);
      }
    } catch (error) {
      console.error("[Scheduler] Error:", error);
    }
  }

  checkAndApply();
  setInterval(checkAndApply, CHECK_INTERVAL);
  console.log("[Scheduler] Started - checks hourly, generates charges on 1st, applies 5% late fee after 5th (Eastern Time)");
}
