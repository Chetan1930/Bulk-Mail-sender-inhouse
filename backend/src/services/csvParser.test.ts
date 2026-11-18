import { describe, expect, it } from 'vitest';
import { CsvParserService, ParsedData } from './csvParser';

describe('CsvParserService.extractRequiredVariables', () => {
  it('extracts unique {{variables}} from subject and body', () => {
    const vars = CsvParserService.extractRequiredVariables(
      'Hello {{Name}}',
      '<p>{{Name}}</p><p>{{Coupon}}</p>'
    );
    expect(vars.sort()).toEqual(['Coupon', 'Name'].sort());
  });

  it('skips Handlebars helpers', () => {
    const vars = CsvParserService.extractRequiredVariables(
      '{{#if Name}}Hi {{Name}}{{/if}}{{else}}Bye'
    );
    expect(vars).toEqual(['Name']);
  });
});

describe('CsvParserService.validateRequiredColumns', () => {
  it('matches columns case-insensitively', () => {
    const result = CsvParserService.validateRequiredColumns(
      ['Name', 'Coupon'],
      ['email', 'name', 'coupon']
    );
    expect(result.allPresent).toBe(true);
    expect(result.missing).toEqual([]);
  });

  it('reports missing columns', () => {
    const result = CsvParserService.validateRequiredColumns(['Name', 'Code'], ['email', 'Name']);
    expect(result.allPresent).toBe(false);
    expect(result.missing).toEqual(['Code']);
  });
});

describe('CsvParserService.validateSheet', () => {
  const baseSheet = (rows: Record<string, string>[]): ParsedData => ({
    headers: Object.keys(rows[0] || { Email: '' }),
    rows,
    totalRows: rows.length,
  });

  it('passes a valid sheet with required template columns', () => {
    const parsed = baseSheet([
      { Email: 'a@example.com', Name: 'Ada', Coupon: 'SAVE' },
      { Email: 'b@example.com', Name: 'Bob', Coupon: 'SAVE' },
    ]);
    const result = CsvParserService.validateSheet(parsed, {
      requiredVariables: ['Name', 'Coupon'],
    });
    expect(result.valid).toBe(true);
    expect(result.emailField).toBe('Email');
    expect(result.errors).toEqual([]);
  });

  it('fails when required template columns are missing', () => {
    const parsed = baseSheet([{ Email: 'a@example.com', Name: 'Ada' }]);
    const result = CsvParserService.validateSheet(parsed, {
      requiredVariables: ['Name', 'Coupon'],
    });
    expect(result.valid).toBe(false);
    expect(result.missingColumns).toContain('Coupon');
  });

  it('fails on invalid emails and duplicates', () => {
    const parsed = baseSheet([
      { Email: 'not-an-email', Name: 'Ada' },
      { Email: 'a@example.com', Name: 'Bob' },
      { Email: 'a@example.com', Name: 'Bob2' },
    ]);
    const result = CsvParserService.validateSheet(parsed, {
      requiredVariables: ['Name'],
    });
    expect(result.valid).toBe(false);
    expect(result.invalidEmails.length).toBeGreaterThan(0);
    expect(result.duplicateEmails).toContain('a@example.com');
  });

  it('detects email column by name containing email', () => {
    const parsed: ParsedData = {
      headers: ['User Email', 'Name'],
      rows: [{ 'User Email': 'a@example.com', Name: 'Ada' }],
      totalRows: 1,
    };
    const result = CsvParserService.validateSheet(parsed);
    expect(result.emailField).toBe('User Email');
    expect(result.valid).toBe(true);
  });
});
