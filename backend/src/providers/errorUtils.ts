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
