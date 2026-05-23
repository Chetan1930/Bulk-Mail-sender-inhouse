import Papa from 'papaparse';
import * as XLSX from 'xlsx';

export interface ParsedData {
  headers: string[];
  rows: Record<string, string>[];
  totalRows: number;
}

export class CsvParserService {
  static parse(file: Express.Multer.File): ParsedData {
    const ext = file.originalname.split('.').pop()?.toLowerCase();

    if (ext === 'csv') {
      return this.parseCsv(file.buffer.toString('utf-8'));
    } else if (ext === 'xlsx' || ext === 'xls') {
      return this.parseExcel(file.buffer);
    } else {
      throw new Error('Unsupported file format. Please upload CSV or XLSX files.');
    }
  }

  private static parseCsv(content: string): ParsedData {
    const result = Papa.parse(content, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: false,
    });

    const rows = result.data as Record<string, string>[];
    const headers = result.meta.fields || [];

    return {
      headers,
      rows: rows.filter(row => Object.values(row).some(v => v && v.trim())),
      totalRows: rows.length,
    };
  }

  private static parseExcel(buffer: Buffer): ParsedData {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, { defval: '' });

    const headers = jsonData.length > 0 ? Object.keys(jsonData[0]) : [];

    return {
      headers,
      rows: jsonData.filter(row => Object.values(row).some(v => v && v.trim())),
      totalRows: jsonData.length,
    };
  }

  static validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
  }

  static detectVariables(template: string): string[] {
    const regex = /\{\{(\w+)\}\}/g;
    const variables: string[] = [];
    let match;
    while ((match = regex.exec(template)) !== null) {
      if (!variables.includes(match[1])) {
        variables.push(match[1]);
      }
    }
    return variables;
  }

  static validateVariables(template: string, headers: string[]): { missing: string[]; found: string[]; allPresent: boolean } {
    const templateVars = this.detectVariables(template);
    const found = templateVars.filter(v => headers.includes(v));
    const missing = templateVars.filter(v => !headers.includes(v));
    return { missing, found, allPresent: missing.length === 0 };
  }

  static renderTemplate(template: string, variables: Record<string, string>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
      return variables[key] || `{{${key}}}`;
    });
  }

  static findDuplicates(rows: Record<string, string>[], emailField: string): string[] {
    const emails = rows.map(r => r[emailField]?.trim().toLowerCase()).filter(Boolean);
    const seen = new Set<string>();
    const duplicates = new Set<string>();
    for (const email of emails) {
      if (seen.has(email)) duplicates.add(email);
      seen.add(email);
    }
    return Array.from(duplicates);
  }
}
