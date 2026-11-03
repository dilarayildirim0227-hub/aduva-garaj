import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

export interface CsvFitmentRow {
  sellerCode: string;
  ktypeCode: string;
  notes: string;
  verifiedByVin: boolean;
}

/**
 * A4: Toplu Araç Uyumluluk (CSV) İçe Aktarma Ayrıştırıcısı ve Eşleştiricisi
 */
export function parseFitmentCsv(csvContent: string): CsvFitmentRow[] {
  const lines = csvContent
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length <= 1) return [];
  const rows: CsvFitmentRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',').map((c) => c.trim());
    if (cols.length < 2) continue;
    rows.push({
      sellerCode: cols[0],
      ktypeCode: cols[1],
      notes: cols[2] || '',
      verifiedByVin: (cols[3] || 'true').toLowerCase() === 'true',
    });
  }
  return rows;
}

export function loadDefaultSampleCsv(): CsvFitmentRow[] {
  const path = join(__dirname, '../../prisma/sample-fitments.csv');
  if (existsSync(path)) {
    return parseFitmentCsv(readFileSync(path, 'utf8'));
  }
  return [];
}
