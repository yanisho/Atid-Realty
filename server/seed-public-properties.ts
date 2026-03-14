import { db } from "./db";
import { publicProperties } from "@shared/schema";
import { sql } from "drizzle-orm";

const PROPERTIES = [
  { propertyId: "10050103", address: "10050 Winding Lakes Sunrise, FL 33351", unitNumber: "103", bedrooms: 2, bathrooms: "2.0", ownerName: "Niluc LLC" },
  { propertyId: "10937", address: "10937 30th Place Sunrise, FL 33322", unitNumber: "242", bedrooms: 3, bathrooms: "2.0", ownerName: "Cocomil LLC" },
  { propertyId: "129201", address: "12920 Westview Dr Miami, FL 33167", unitNumber: "1", bedrooms: 3, bathrooms: "2.0", ownerName: "Niritb LLC" },
  { propertyId: "129202", address: "12920 Westview Dr Miami, FL 33167", unitNumber: "2", bedrooms: 0, bathrooms: "1.0", ownerName: "Niritb LLC" },
  { propertyId: "129203", address: "12920 Westview Dr Miami, FL 33167", unitNumber: "3", bedrooms: 0, bathrooms: "1.0", ownerName: "Niritb LLC" },
  { propertyId: "129204", address: "12920 Westview Dr Miami, FL 33167", unitNumber: "4", bedrooms: 1, bathrooms: "1.0", ownerName: "Niritb LLC" },
  { propertyId: "16401", address: "1640 SW 40th Terrace Fort Lauderdale, FL 33317", unitNumber: "1", bedrooms: 2, bathrooms: "2.0", ownerName: "Beraz Investment LLC" },
  { propertyId: "16402", address: "1640 SW 40th Terrace Fort Lauderdale, FL 33317", unitNumber: "2", bedrooms: 1, bathrooms: "1.0", ownerName: "Beraz Investment LLC" },
  { propertyId: "1699", address: "1699 NW 127th Street North Miami, FL 33167", unitNumber: "1699", bedrooms: 3, bathrooms: "2.0", ownerName: "Niritb LLC" },
  { propertyId: "18001205", address: "1800 SW 81st Ave North Lauderdale, FL 33068", unitNumber: "1205", bedrooms: 1, bathrooms: "1.5", ownerName: "DCPC LLC" },
  { propertyId: "18001304", address: "1800 SW 81st Ave North Lauderdale, FL 33068", unitNumber: "1304", bedrooms: 2, bathrooms: "2.0", ownerName: "Eliyahu Sabag" },
  { propertyId: "18001401", address: "1800 SW 81st Ave North Lauderdale, FL 33068", unitNumber: "1401", bedrooms: 1, bathrooms: "1.5", ownerName: "DCPC LLC" },
  { propertyId: "18203200", address: "1820 SW 81st Ave North Lauderdale, FL 33068", unitNumber: "3200", bedrooms: 1, bathrooms: "1.5", ownerName: "DCPC LLC" },
  { propertyId: "18203211", address: "1820 SW 81st Ave North Lauderdale, FL 33068", unitNumber: "3211", bedrooms: 1, bathrooms: "1.5", ownerName: "DCPC LLC" },
  { propertyId: "18203216", address: "1820 SW 81st Ave North Lauderdale, FL 33068", unitNumber: "3216", bedrooms: 2, bathrooms: "2.0", ownerName: "DCPC LLC" },
  { propertyId: "18304215", address: "1830 SW 81st Ave North Lauderdale, FL 33068", unitNumber: "4215", bedrooms: 2, bathrooms: "2.0", ownerName: "DCPC LLC" },
  { propertyId: "300303", address: "300 Palm Circle W Pembroke Pines, FL 33025", unitNumber: "303", bedrooms: 2, bathrooms: "2.0", ownerName: "Moti Levy" },
  { propertyId: "18102110", address: "1810 SW 81st Ave North Lauderdale, FL 33068", unitNumber: "2110", bedrooms: 2, bathrooms: "2.0", ownerName: "Asher Ron" },
  { propertyId: "3100202", address: "3100 N. Pine Island Rd Sunrise, FL 33351", unitNumber: "202", bedrooms: 2, bathrooms: "2.0", ownerName: "Factory 26 LLC" },
  { propertyId: "3262", address: "3262 Coral Ridge Dr Coral Springs, FL 33065", unitNumber: "3262", bedrooms: 2, bathrooms: "2.0", ownerName: "Factory 26 LLC" },
  { propertyId: "3634", address: "3634 NW 95th Terrace Sunrise, FL 33351", unitNumber: "8L", bedrooms: 3, bathrooms: "2.0", ownerName: "Factory 26 LLC" },
  { propertyId: "3849", address: "3849 NW 90th Ave. Sunrise, FL 33351", unitNumber: "3849", bedrooms: 2, bathrooms: "2.0", ownerName: "Atid Realty LLC" },
  { propertyId: "3900107", address: "3900 NW 76th Ave Sunrise, FL 33351", unitNumber: "107", bedrooms: 2, bathrooms: "2.0", ownerName: "Yugolo LLC" },
  { propertyId: "3933", address: "3933 NW 94th Ave Sunrise, FL 33351", unitNumber: "3933", bedrooms: 3, bathrooms: "2.0", ownerName: "Yaakov Sayag" },
  { propertyId: "405214", address: "405 S. Pine Island Rd Plantation, FL 33324", unitNumber: "D214", bedrooms: 1, bathrooms: "1.0", ownerName: "Lubren LLC" },
  { propertyId: "406308", address: "406 NW 68th Ave Plantation, FL 33317", unitNumber: "308", bedrooms: 1, bathrooms: "1.5", ownerName: "Factory 26 LLC" },
  { propertyId: "406509", address: "406 NW 68th Ave Plantation, FL 33317", unitNumber: "509", bedrooms: 1, bathrooms: "1.5", ownerName: "Factory 26 LLC" },
  { propertyId: "4204", address: "4204 NW 114th Terrace Coral Springs, FL 33065", unitNumber: "4204", bedrooms: 3, bathrooms: "2.5", ownerName: "Cocomil LLC" },
  { propertyId: "443919", address: "4439 Treehouse Lane Tamarac, FL 33319", unitNumber: "19D", bedrooms: 3, bathrooms: "2.0", ownerName: "Yehoshua Mizrahi" },
  { propertyId: "455304", address: "455 S. Pine Island Rd Plantation, FL 33324", unitNumber: "304C", bedrooms: 2, bathrooms: "2.0", ownerName: "Beraz Investment LLC" },
  { propertyId: "455407", address: "455 S. Pine Island Rd Plantation, FL 33324", unitNumber: "407C", bedrooms: 2, bathrooms: "2.0", ownerName: "Eliyahu Sabag" },
  { propertyId: "455409", address: "455 S. Pine Island Rd Plantation, FL 33324", unitNumber: "409C", bedrooms: 2, bathrooms: "2.0", ownerName: "Eliyahu Sabag" },
  { propertyId: "471408", address: "471 N. Pine Island Rd Plantation, FL 33324", unitNumber: "408D", bedrooms: 3, bathrooms: "2.0", ownerName: "Cocomil LLC" },
  { propertyId: "483202", address: "483 N. Pine Island Rd Plantation, FL 33324", unitNumber: "202C", bedrooms: 2, bathrooms: "2.0", ownerName: "Prosperity ARN LLC" },
  { propertyId: "485201", address: "485 N. Pine Island Rd Plantation, FL 33324", unitNumber: "201A", bedrooms: 2, bathrooms: "2.0", ownerName: "Prosperity ARN LLC" },
  { propertyId: "505408", address: "505 S. Pine Island Rd Plantation, FL 33324", unitNumber: "408B", bedrooms: 2, bathrooms: "2.0", ownerName: "Prosperity ARN LLC" },
  { propertyId: "5090105", address: "5090 SW 64th Ave Davie, FL 33314", unitNumber: "105", bedrooms: 2, bathrooms: "2.0", ownerName: "Yehoshua Mizrahi" },
  { propertyId: "605201", address: "605 S. Pine Island Rd Plantation, FL 33324", unitNumber: "201A", bedrooms: 3, bathrooms: "2.0", ownerName: "Beraz Investment LLC" },
  { propertyId: "605304", address: "605 S. Pine Island Rd Plantation, FL 33324", unitNumber: "304A", bedrooms: 2, bathrooms: "2.0", ownerName: "Beraz Investment LLC" },
  { propertyId: "701102", address: "701 SW 148th Ave Davie, FL 33325", unitNumber: "102", bedrooms: 3, bathrooms: "3.0", ownerName: "Cocomil LLC" },
  { propertyId: "7027", address: "7027 W. Sunrise Blvd Plantation, FL 33313", unitNumber: "7027", bedrooms: 2, bathrooms: "2.5", ownerName: "Factory 26 LLC" },
  { propertyId: "711102", address: "711 N. Pine Island Rd Plantation, FL 33324", unitNumber: "102", bedrooms: 2, bathrooms: "2.0", ownerName: "Cocomil LLC" },
  { propertyId: "711203", address: "711 N. Pine Island Rd Plantation, FL 33324", unitNumber: "203", bedrooms: 2, bathrooms: "2.0", ownerName: "Lubren LLC" },
  { propertyId: "711301", address: "711 N. Pine Island Rd Plantation, FL 33324", unitNumber: "301", bedrooms: 2, bathrooms: "2.0", ownerName: "Lubren LLC" },
  { propertyId: "711403", address: "711 N. Pine Island Rd Plantation, FL 33324", unitNumber: "403", bedrooms: 2, bathrooms: "2.0", ownerName: "Cocomil LLC" },
  { propertyId: "721116", address: "721 N. Pine Island Rd Plantation, FL 33324", unitNumber: "116", bedrooms: 3, bathrooms: "2.0", ownerName: "Factory 26 LLC" },
  { propertyId: "721204", address: "721 N. Pine Island Rd Plantation, FL 33324", unitNumber: "204", bedrooms: 1, bathrooms: "1.5", ownerName: "Niritb LLC" },
  { propertyId: "721205", address: "721 N. Pine Island Rd Plantation, FL 33324", unitNumber: "205", bedrooms: 2, bathrooms: "2.0", ownerName: "Lubren LLC" },
  { propertyId: "721307", address: "721 N. Pine Island Rd Plantation, FL 33324", unitNumber: "307", bedrooms: 2, bathrooms: "2.0", ownerName: "Cocomil LLC" },
  { propertyId: "721402", address: "721 N. Pine Island Rd Plantation, FL 33324", unitNumber: "402", bedrooms: 2, bathrooms: "2.0", ownerName: "Cocomil LLC" },
  { propertyId: "721405", address: "721 N. Pine Island Rd Plantation, FL 33324", unitNumber: "405", bedrooms: 2, bathrooms: "2.0", ownerName: "Martin Piliponsky" },
  { propertyId: "721407", address: "721 N. Pine Island Rd Plantation, FL 33324", unitNumber: "407", bedrooms: 2, bathrooms: "2.0", ownerName: "Martin Piliponsky" },
  { propertyId: "7300201", address: "7300 NW 17th St Plantation, FL 33313", unitNumber: "201", bedrooms: 2, bathrooms: "2.0", ownerName: "Factory 26 LLC" },
  { propertyId: "7341", address: "7341 W. Sunrise Blvd Plantation, FL 33313", unitNumber: "7341", bedrooms: 2, bathrooms: "2.0", ownerName: "Cocomil LLC" },
  { propertyId: "7800102", address: "7800 Colony Circle S Tamarac, FL 33321", unitNumber: "102", bedrooms: 2, bathrooms: "2.0", ownerName: "DCPC LLC" },
  { propertyId: "7801209", address: "7801 Colony Circle S Tamarac, FL 33321", unitNumber: "209", bedrooms: 2, bathrooms: "2.0", ownerName: "Marcela Sabag" },
  { propertyId: "7901205", address: "7901 Colony Cir S Tamarac, FL 33321", unitNumber: "205", bedrooms: 2, bathrooms: "2.0", ownerName: "Atid Realty LLC" },
  { propertyId: "7925205", address: "7925 Colony Cir S Tamarac, FL 33321", unitNumber: "205", bedrooms: 2, bathrooms: "2.0", ownerName: "Atid Realty LLC" },
  { propertyId: "7925210", address: "7925 Fairview Dr. Tamarac, FL 33321", unitNumber: "210", bedrooms: 2, bathrooms: "2.0", ownerName: "Yehoshua Mizrahi" },
  { propertyId: "8000205", address: "8000 Fairview Dr Tamarac, FL 33321", unitNumber: "205", bedrooms: 2, bathrooms: "2.0", ownerName: "Atid Realty LLC" },
  { propertyId: "8060202", address: "8060 Colony Circle N Tamarac, FL 33321", unitNumber: "202", bedrooms: 2, bathrooms: "2.0", ownerName: "DCPC LLC" },
  { propertyId: "8214", address: "8214 SW 14th Court North Lauderdale, FL 33068", unitNumber: "8214", bedrooms: 4, bathrooms: "2.0", ownerName: "Niritb LLC" },
  { propertyId: "909", address: "909 NW 16th Ter Fort Lauderdale, FL 33311", unitNumber: "909", bedrooms: 2, bathrooms: "2.0", ownerName: "Niritb LLC" },
  { propertyId: "92", address: "92 Ohio Rd Lake Worth, FL 33467", unitNumber: "92", bedrooms: 3, bathrooms: "2.0", ownerName: "Niritb LLC" },
  { propertyId: "9971", address: "9971 Nob Hill Lane Sunrise, FL 33351", unitNumber: "9971", bedrooms: 2, bathrooms: "2.0", ownerName: "Yaakov Sayag" },
  { propertyId: "99991004", address: "9999 Summerbreeze Dr Sunrise, FL 33322", unitNumber: "1004", bedrooms: 2, bathrooms: "2.0", ownerName: "Elad Goldstein" },
  { propertyId: "9999418", address: "9999 Summerbreeze Dr Sunrise, FL 33322", unitNumber: "418", bedrooms: 2, bathrooms: "2.0", ownerName: "Elad Goldstein" },
];

export async function seedPublicProperties() {
  try {
    const result = await db.select({ count: sql<number>`count(*)` }).from(publicProperties);
    const count = Number(result[0].count);

    if (count > 0) {
      console.log(`Public properties already seeded (${count} records found)`);
      return;
    }

    console.log("Seeding public properties...");

    for (const prop of PROPERTIES) {
      try {
        await db.insert(publicProperties).values({
          ...prop,
          isAvailable: true,
        }).onConflictDoNothing();
      } catch (err: any) {
        console.error(`Failed to seed property ${prop.propertyId}:`, err.message);
      }
    }

    console.log(`Seeded ${PROPERTIES.length} public properties`);
  } catch (error) {
    console.error("Error seeding public properties:", error);
  }
}
