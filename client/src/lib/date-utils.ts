export function isoToDisplay(iso: string | null | undefined): string {
  if (!iso) return "";
  const match = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return iso;
  const [, y, m, d] = match;
  return `${m.padStart(2, "0")}.${d.padStart(2, "0")}.${y}`;
}

export function displayToIso(display: string): string {
  if (!display) return "";
  const match = display.match(/^(\d{1,2})\.(\d{1,2})\.(\d{2,4})$/);
  if (!match) return display;
  const [, m, d, y] = match;
  const fullYear = y.length === 2 ? `20${y}` : y;
  return `${fullYear}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
}

export function formatDate(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return "N/A";
  if (typeof dateInput === "string") {
    const match = dateInput.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      return `${match[2]}.${match[3]}.${match[1]}`;
    }
  }
  const d = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  if (isNaN(d.getTime())) return "N/A";
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  const year = d.getUTCFullYear();
  return `${month}.${day}.${year}`;
}

export function snapToFirstOfMonth(iso: string): string {
  if (!iso) return iso;
  const match = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return iso;
  return `${match[1]}-${match[2]}-01`;
}

export function snapToLastOfMonth(iso: string): string {
  if (!iso) return iso;
  const match = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return iso;
  const year = parseInt(match[1]);
  const month = parseInt(match[2]);
  const lastDay = new Date(year, month, 0).getDate();
  return `${match[1]}-${match[2]}-${String(lastDay).padStart(2, "0")}`;
}

export function formatMonthYear(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return "";
  if (typeof dateInput === "string") {
    const match = dateInput.match(/^(\d{4})-(\d{2})/);
    if (match) return `${match[2]}.${match[1]}`;
  }
  const d = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  if (isNaN(d.getTime())) return "";
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const year = d.getUTCFullYear();
  return `${month}.${year}`;
}
