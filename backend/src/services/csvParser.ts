import Papa from 'papaparse';
import * as XLSX from 'xlsx';

export interface ParsedData {
  headers: string[];
  rows: Record<string, string>[];
  totalRows: number;
}

export interface SheetValidation {
  missingColumns: string[];
  foundColumns: string[];
  requiredColumns: string[];
  duplicateEmails: string[];
  invalidEmails: Array<{ row: number; email: string }>;
  emptyEmailRows: number[];
  emailField: string | null;
  valid: boolean;
  errors: string[];
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
      rows: rows.filter(row => Object.values(row).some(v => v && String(v).trim())),
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
      rows: jsonData.filter(row => Object.values(row).some(v => v && String(v).trim())),
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

  static extractRequiredVariables(...templates: string[]): string[] {
    const variables = new Set<string>();
    for (const template of templates) {
      if (!template) continue;
      for (const v of this.detectVariables(template)) {
        variables.add(v);
      }
    }
    return Array.from(variables);
  }

  static resolveHeader(headers: string[], name: string): string | undefined {
    const normalized = name.toLowerCase().trim();
    return headers.find(h => h.toLowerCase().trim() === normalized);
  }

  static detectEmailField(headers: string[]): string | undefined {
    const exact = headers.find(h => h.toLowerCase().trim() === 'email');
    if (exact) return exact;
    return headers.find(h => h.toLowerCase().includes('email'));
  }

  static validateRequiredColumns(
    requiredVariables: string[],
    headers: string[]
  ): { missing: string[]; found: string[]; allPresent: boolean } {
    const found: string[] = [];
    const missing: string[] = [];

    for (const variable of requiredVariables) {
      if (this.resolveHeader(headers, variable)) {
        found.push(variable);
      } else {
        missing.push(variable);
      }
    }

    return { missing, found, allPresent: missing.length === 0 };
  }

  /** @deprecated use validateRequiredColumns */
  static validateVariables(template: string, headers: string[]): { missing: string[]; found: string[]; allPresent: boolean } {
    const required = this.extractRequiredVariables(template);
    return this.validateRequiredColumns(required, headers);
  }

  static validateSheet(
    parsed: ParsedData,
    options: {
      requiredVariables?: string[];
      emailField?: string;
    } = {}
  ): SheetValidation {
    const errors: string[] = [];
    const requiredColumns = options.requiredVariables || [];
    let missingColumns: string[] = [];
    let foundColumns: string[] = [];

    if (requiredColumns.length > 0) {
      const columnCheck = this.validateRequiredColumns(requiredColumns, parsed.headers);
      missingColumns = columnCheck.missing;
      foundColumns = columnCheck.found;
      if (missingColumns.length > 0) {
        errors.push(`Missing columns required by template: ${missingColumns.join(', ')}`);
      }
    }

    const emailField =
      (options.emailField && this.resolveHeader(parsed.headers, options.emailField)) ||
      this.detectEmailField(parsed.headers) ||
      null;

    if (!emailField) {
      errors.push('No email column found. Add a column named "Email" (or similar).');
    }

    const duplicateEmails: string[] = [];
    const invalidEmails: Array<{ row: number; email: string }> = [];
    const emptyEmailRows: number[] = [];

    if (emailField) {
      const seen = new Map<string, number>();

      parsed.rows.forEach((row, index) => {
        const rowNum = index + 1;
        const email = String(row[emailField] || '').trim();

        if (!email) {
          emptyEmailRows.push(rowNum);
          return;
        }

        if (!this.validateEmail(email)) {
          invalidEmails.push({ row: rowNum, email });
        }

        const lower = email.toLowerCase();
        if (seen.has(lower)) {
          if (!duplicateEmails.includes(lower)) {
            duplicateEmails.push(lower);
          }
        } else {
          seen.set(lower, rowNum);
        }
      });

      if (emptyEmailRows.length > 0) {
        const shown = emptyEmailRows.slice(0, 10).join(', ');
        const suffix = emptyEmailRows.length > 10 ? ` (+${emptyEmailRows.length - 10} more)` : '';
        errors.push(`Empty email on row(s): ${shown}${suffix}`);
      }

      if (invalidEmails.length > 0) {
        const shown = invalidEmails
          .slice(0, 5)
          .map(e => `${e.row} (${e.email})`)
          .join(', ');
        const suffix = invalidEmails.length > 5 ? ` (+${invalidEmails.length - 5} more)` : '';
        errors.push(`Invalid email on row(s): ${shown}${suffix}`);
      }

      if (duplicateEmails.length > 0) {
        const shown = duplicateEmails.slice(0, 10).join(', ');
        const suffix = duplicateEmails.length > 10 ? ` (+${duplicateEmails.length - 10} more)` : '';
        errors.push(`Duplicate emails: ${shown}${suffix}`);
      }
    }

    if (parsed.rows.length === 0) {
      errors.push('The file has no data rows.');
    }

    return {
      missingColumns,
      foundColumns,
      requiredColumns,
      duplicateEmails,
      invalidEmails,
      emptyEmailRows,
      emailField,
      valid: errors.length === 0,
      errors,
    };
  }

  static renderTemplate(template: string, variables: Record<string, string>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
      return variables[key] || `{{${key}}}`;
    });
  }

  static findDuplicates(rows: Record<string, string>[], emailField: string): string[] {
    const emails = rows.map(r => String(r[emailField] || '').trim().toLowerCase()).filter(Boolean);
    const seen = new Set<string>();
    const duplicates = new Set<string>();
    for (const email of emails) {
      if (seen.has(email)) duplicates.add(email);
      seen.add(email);
    }
    return Array.from(duplicates);
  }
}
