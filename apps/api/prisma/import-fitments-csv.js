"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseFitmentCsv = parseFitmentCsv;
exports.loadDefaultSampleCsv = loadDefaultSampleCsv;
const fs_1 = require("fs");
const path_1 = require("path");
/**
 * A4: Toplu Araç Uyumluluk (CSV) İçe Aktarma Ayrıştırıcısı ve Eşleştiricisi
 */
function parseFitmentCsv(csvContent) {
    const lines = csvContent
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter((l) => l.length > 0);
    if (lines.length <= 1)
        return [];
    const rows = [];
    for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',').map((c) => c.trim());
        if (cols.length < 2)
            continue;
        rows.push({
            sellerCode: cols[0],
            ktypeCode: cols[1],
            notes: cols[2] || '',
            verifiedByVin: (cols[3] || 'true').toLowerCase() === 'true',
        });
    }
    return rows;
}
function loadDefaultSampleCsv() {
    const path = (0, path_1.join)(__dirname, 'sample-fitments.csv');
    return parseFitmentCsv((0, fs_1.readFileSync)(path, 'utf8'));
}
//# sourceMappingURL=import-fitments-csv.js.map