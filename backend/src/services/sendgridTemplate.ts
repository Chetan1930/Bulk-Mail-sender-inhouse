/**
 * Fetch a SendGrid Dynamic Template's active version content so we can
 * extract {{variables}} with CsvParserService.extractRequiredVariables.
 *
 * Important: Mail Send permission alone is NOT enough to read templates.
 * Template Engine → Read Access is required for GET /v3/templates/:id.
 * Keys that can send mail often return 403 here — that is not a bad key for sending.
 */

export type TemplateVariableResolution = {
  variables: string[];
  /** Non-fatal note when template content could not be read (e.g. missing Template Engine scope). */
  warning?: string;
};

function normalizeApiKey(apiKey: string): string {
  // Strip whitespace / zero-width / BOM that paste from dashboards sometimes adds
  return apiKey.replace(/[\u200B-\u200D\uFEFF]/g, '').trim();
}

export async function fetchSendGridTemplateContent(
  apiKey: string,
  templateId: string
): Promise<{ html: string; subject: string; plain: string }> {
  const trimmedKey = normalizeApiKey(apiKey);
  const trimmedId = templateId.trim();
  if (!trimmedKey) {
    throw new Error('A SendGrid API key is required to validate the template.');
  }
  if (!trimmedId) {
    throw new Error('A SendGrid template ID is required.');
  }

  // generations=legacy|dynamic — dynamic template IDs start with d-
  const url = new URL(`https://api.sendgrid.com/v3/templates/${encodeURIComponent(trimmedId)}`);

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${trimmedKey}`,
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    if (response.status === 401) {
      throw new Error(
        'SendGrid says this API key is invalid (401). Re-copy the key from SendGrid → Settings → API Keys (it is only shown once).'
      );
    }
    if (response.status === 403) {
      // Most common: restricted key has Mail Send but not Template Engine Read
      const err = new Error(
        'API key is valid for sending, but cannot read templates (403). In SendGrid → API Keys, edit the key and enable Template Engine → Read Access (or use Full Access). Sending still works without this — template variable checks will be skipped.'
      );
      (err as Error & { code?: string }).code = 'TEMPLATE_READ_FORBIDDEN';
      throw err;
    }
    if (response.status === 404) {
      throw new Error(
        `SendGrid template "${trimmedId}" was not found. Confirm it is a Dynamic Template ID (starts with d-).`
      );
    }
    throw new Error(
      `Failed to fetch SendGrid template (${response.status})${detail ? `: ${detail.slice(0, 200)}` : ''}`
    );
  }

  const data = (await response.json()) as {
    versions?: Array<{
      active?: number;
      html_content?: string;
      plain_content?: string;
      subject?: string;
    }>;
  };

  const versions = data.versions || [];
  const active = versions.find((v) => v.active === 1) || versions[0];
  if (!active) {
    throw new Error('SendGrid template has no versions to validate.');
  }

  return {
    html: active.html_content || '',
    subject: active.subject || '',
    plain: active.plain_content || '',
  };
}

export async function extractSendGridTemplateVariables(
  apiKey: string,
  templateId: string,
  extractRequiredVariables: (...templates: string[]) => string[]
): Promise<string[]> {
  const content = await fetchSendGridTemplateContent(apiKey, templateId);
  return extractRequiredVariables(content.html, content.plain, content.subject);
}

/**
 * Resolve template {{vars}} for CSV checks. Soft-fails on missing Template Engine
 * read permission so Mail Send–only keys can still upload and launch campaigns.
 */
export async function resolveTemplateVariablesForValidation(
  apiKey: string,
  templateId: string,
  extractRequiredVariables: (...templates: string[]) => string[]
): Promise<TemplateVariableResolution> {
  try {
    const variables = await extractSendGridTemplateVariables(
      apiKey,
      templateId,
      extractRequiredVariables
    );
    return { variables };
  } catch (err: unknown) {
    const code = (err as { code?: string } | null)?.code;
    const message = err instanceof Error ? err.message : 'Template validation failed';
    if (code === 'TEMPLATE_READ_FORBIDDEN') {
      return {
        variables: [],
        warning: message,
      };
    }
    throw err;
  }
}
