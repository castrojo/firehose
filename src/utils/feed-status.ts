import type { FeedEntry } from '../lib/schemas';
import { classifyError } from './errors';

/**
 * Create a "failed feed" entry to track errors in the collection
 * These entries allow users to see which feeds failed and why
 */
export function createFailedFeedEntry(
  feedUrl: string,
  error: Error,
  projectName?: string,
): Partial<FeedEntry> {
  const classified = classifyError(error);
  const now = new Date().toISOString();
  
  // Map classified error type to feed error type
  let feedErrorType: 'network' | 'parse' | 'validation' | 'timeout';
  if (classified.message.includes('timeout') || classified.message.includes('DNS')) {
    feedErrorType = 'timeout';
  } else if (classified.message.includes('parse')) {
    feedErrorType = 'parse';
  } else if (classified.statusCode && classified.statusCode >= 400 && classified.statusCode < 500) {
    feedErrorType = 'validation';
  } else {
    feedErrorType = 'network';
  }
  
  return {
    // Minimal required fields for failed entry
    title: `Feed Error: ${projectName || feedUrl}`,
    link: feedUrl,
    
    // Error tracking
    feedStatus: 'error',
    feedError: classified.message,
    feedErrorType,
    feedUrl,
    fetchedAt: now,
    
    // Project enrichment if available
    ...(projectName && { projectName }),
  };
}

/**
 * Add fetch timestamp to successful entries
 */
export function addFetchMetadata(entry: Partial<FeedEntry>): Partial<FeedEntry> {
  return {
    ...entry,
    feedStatus: 'success',
    fetchedAt: new Date().toISOString(),
  };
}
