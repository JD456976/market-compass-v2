/**
 * Parse AI proxy responses and return a human-readable error message.
 * Handles billing, auth, rate limit, and generic errors gracefully.
 */
export function parseAIError(response: Response, body?: any): string {
  const status = response.status;
  const message: string = body?.error?.message || '';

  if (message.toLowerCase().includes('credit balance') || message.toLowerCase().includes('too low')) {
    return 'AI features are temporarily unavailable — credits need to be added. Contact your administrator.';
  }
  if (status === 401 || message.toLowerCase().includes('invalid x-api-key') || message.toLowerCase().includes('authentication')) {
    return 'AI configuration error. Contact your administrator.';
  }
  if (status === 429 || message.toLowerCase().includes('rate limit')) {
    return 'Too many requests — please wait a moment and try again.';
  }
  if (status === 529 || message.toLowerCase().includes('overloaded')) {
    return 'AI is temporarily overloaded. Try again in a moment.';
  }
  if (status >= 500) {
    return 'AI service is temporarily unavailable. Try again shortly.';
  }
  return 'Could not generate response. Please try again.';
}

/**
 * Call the /api/claude proxy with standard error handling.
 * Returns parsed JSON on success, throws a user-friendly error on failure.
 */
export async function callClaude(body: object): Promise<any> {
  const response = await fetch('/api/claude', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const data = await response.json();

  // Check HTTP error
  if (!response.ok) {
    throw new Error(parseAIError(response, data));
  }

  // Anthropic can return 200 with a body-level error (e.g. invalid model, overloaded)
  if (data?.type === 'error') {
    const msg: string = data?.error?.message || '';
    const errType: string = data?.error?.type || '';
    if (errType === 'not_found_error' || msg.includes('not found')) {
      throw new Error('AI configuration error — invalid model. Contact your administrator.');
    }
    if (errType === 'overloaded_error') {
      throw new Error('AI is temporarily overloaded. Try again in a moment.');
    }
    if (msg.toLowerCase().includes('credit balance') || msg.toLowerCase().includes('too low')) {
      throw new Error('AI features are temporarily unavailable — credits need to be added.');
    }
    throw new Error(msg || 'Could not generate response. Please try again.');
  }

  return data;
}
