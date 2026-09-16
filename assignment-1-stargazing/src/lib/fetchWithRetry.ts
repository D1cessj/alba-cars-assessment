/**
 * Minimal retry/backoff wrapper for upstream fetches. Retries transient
 * failures (network errors, 429, 5xx) with exponential backoff; gives up
 * immediately on client errors (4xx other than 429) since retrying won't help.
 */
export async function fetchWithRetry(
  url: string,
  init: RequestInit & { next?: { revalidate?: number } } = {},
  maxRetries = 2
): Promise<Response> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, init);

      if (response.ok) return response;

      const shouldRetry = response.status === 429 || response.status >= 500;
      if (!shouldRetry || attempt === maxRetries) return response;

      lastError = new Error(`HTTP ${response.status}`);
    } catch (error) {
      lastError = error;
      if (attempt === maxRetries) throw error;
    }

    const backoffMs = 300 * 2 ** attempt;
    await new Promise((resolve) => setTimeout(resolve, backoffMs));
  }

  throw lastError;
}
