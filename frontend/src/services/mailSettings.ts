export interface MailSettings {
  senderEmail: string;
  templateId: string;
}

const STORAGE_KEY = 'mailflow.mail-settings.v1';

const emptySettings: MailSettings = {
  senderEmail: '',
  templateId: '',
};

export function getMailSettings(): MailSettings {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return emptySettings;

    const parsed = JSON.parse(stored) as Partial<MailSettings>;
    return {
      senderEmail: typeof parsed.senderEmail === 'string' ? parsed.senderEmail : '',
      templateId: typeof parsed.templateId === 'string' ? parsed.templateId : '',
    };
  } catch {
    return emptySettings;
  }
}

export function saveMailSettings(settings: MailSettings): MailSettings {
  const normalized = {
    senderEmail: settings.senderEmail.trim(),
    templateId: settings.templateId.trim(),
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
  return normalized;
}

export function clearMailSettings(): void {
  localStorage.removeItem(STORAGE_KEY);
}
