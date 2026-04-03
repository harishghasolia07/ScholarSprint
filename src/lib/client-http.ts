export interface ApiValidationDetails {
  fieldErrors?: Record<string, string[] | undefined>;
}

export interface ApiErrorPayload {
  error?: string;
  message?: string;
  details?: ApiValidationDetails;
}

function pickValidationMessage(details: ApiValidationDetails | undefined): string | null {
  if (!details?.fieldErrors) {
    return null;
  }

  for (const value of Object.values(details.fieldErrors)) {
    const message = value?.[0]?.trim();
    if (message) {
      return message;
    }
  }

  return null;
}

function extractApiErrorMessage(payload: unknown, response: Response): string {
  const parsed = (payload ?? {}) as ApiErrorPayload;

  const directMessage = parsed.error?.trim() || parsed.message?.trim();
  if (directMessage) {
    return directMessage;
  }

  const validationMessage = pickValidationMessage(parsed.details);
  if (validationMessage) {
    return validationMessage;
  }

  return `Request failed (${response.status})`;
}

export async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);

  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    throw new Error(extractApiErrorMessage(payload, response));
  }

  return payload as T;
}

export function getClientErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return fallback;
}
