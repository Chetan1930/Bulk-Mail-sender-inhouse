export function isRateLimitError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const err = error as {
    code?: number | string;
    statusCode?: number;
    response?: { statusCode?: number; status?: number };
    message?: string;
  };
  const status =
    err.code === 429 ||
    err.statusCode === 429 ||
    err.response?.statusCode === 429 ||
    err.response?.status === 429;
  if (status) return true;
  const msg = (err.message || '').toLowerCase();
  return msg.includes('too many requests') || msg.includes('rate limit');
}

export function formatProviderError(error: unknown, provider = 'Email'): string {
  if (!error || typeof error !== 'object') {
    return `${provider} send failed`;
  }

  const err = error as {
    message?: string;
    response?: { body?: { errors?: Array<{ message?: string; field?: string }> } };
    code?: string;
  };

  const sendGridErrors = err.response?.body?.errors;
  if (sendGridErrors?.length) {
    return sendGridErrors
      .map((e) => (e.field ? `${e.field}: ${e.message}` : e.message))
      .filter(Boolean)
      .join('; ');
  }

  if (err.message) {
    return err.message;
  }

  if (err.code) {
    return `${provider} error: ${err.code}`;
  }

  return `${provider} send failed`;
}
