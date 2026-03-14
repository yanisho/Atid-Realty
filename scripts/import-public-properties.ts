import { db } from "../server/db";
import { publicProperties } from "../shared/schema";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const XLSX = require("xlsx");

async function importProperties() {
  const workbook = XLSX.readFile('attached_assets/Web-Site_Property_ID_List_1770328447342.xlsx');
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(sheet);

  console.log(`Found ${data.length} properties to import`);

  for (const row of data as any[]) {
    try {
      await db.insert(publicProperties).values({
        propertyId: String(row['Apartment  ID']),
        address: row['Address'],
        unitNumber: String(row['Apt #'] || ''),
        bedrooms: parseInt(row['Size']) || 0,
        bathrooms: String(parseFloat(row['Baths']) || 0),
        ownerName: row["Owner's Name"] || null,
        isAvailable: true,
      });
      console.log(`Imported: ${row['Apartment  ID']}`);
    } catch (error: any) {
      if (error.code === '23505') {
        console.log(`Skipped duplicate: ${row['Apartment  ID']}`);
      } else {
        console.error(`Error importing ${row['Apartment  ID']}:`, error.message);
      }
    }
  }

  console.log('Import complete!');
  process.exit(0);
}

importProperties();
