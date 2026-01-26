import { shouldRetry, getErrorMessage } from './errors';

/**
 * Retry Configuration
 */
export interface RetryConfig {
  maxAttempts: number;
  initialDelay: number; // milliseconds
  maxDelay: number; // milliseconds
  backoffMultiplier: number;
}

/**
 * Default retry configuration
 * - 3 attempts total (1 initial + 2 retries)
 * - Start with 1 second delay
 * - Max 10 second delay
 * - 2x backoff multiplier (1s, 2s, 4s pattern)
 */
export const defaultRetryConfig: RetryConfig = {
  maxAttempts: 3,
  initialDelay: 1000,
  maxDelay: 10000,
  backoffMultiplier: 2,
};

/**
 * Retry a function with exponential backoff
 * 
 * @param fn Function to retry
 * @param config Retry configuration
 * @param context Context string for logging
 * @returns Result of successful function execution
 * @throws Last error if all attempts fail
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  config: RetryConfig = defaultRetryConfig,
  context: string = 'operation',
): Promise<T> {
  let lastError: Error | undefined;
  let delay = config.initialDelay;
  
  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // Check if we should retry this error
      if (!shouldRetry(lastError)) {
        console.log(`[Retry] ${context}: Permanent error, not retrying: ${getErrorMessage(lastError)}`);
        throw lastError;
      }
      
      // If this was the last attempt, throw the error
      if (attempt === config.maxAttempts) {
        console.log(`[Retry] ${context}: All ${config.maxAttempts} attempts failed`);
        throw lastError;
      }
      
      // Log the retry attempt
      console.log(
        `[Retry] ${context}: Attempt ${attempt}/${config.maxAttempts} failed: ${getErrorMessage(lastError)}. ` +
        `Retrying in ${delay}ms...`
      );
      
      // Wait before retrying
      await sleep(delay);
      
      // Calculate next delay with exponential backoff
      delay = Math.min(delay * config.backoffMultiplier, config.maxDelay);
    }
  }
  
  // Should never reach here, but TypeScript needs this
  throw lastError || new Error('Retry logic failed unexpectedly');
}

/**
 * Sleep for a specified duration
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Wrap a function to automatically retry on transient errors
 * 
 * Usage:
 * ```ts
 * const fetchWithRetry = withRetry(fetchFeed, { maxAttempts: 3 });
 * const result = await fetchWithRetry('https://example.com/feed');
 * ```
 */
export function withRetry<TArgs extends any[], TReturn>(
  fn: (...args: TArgs) => Promise<TReturn>,
  config: RetryConfig = defaultRetryConfig,
): (...args: TArgs) => Promise<TReturn> {
  return async (...args: TArgs): Promise<TReturn> => {
    const context = `${fn.name || 'function'}(${args.slice(0, 1).join(', ')})`;
    return retryWithBackoff(() => fn(...args), config, context);
  };
}
