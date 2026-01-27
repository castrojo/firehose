/**
 * Truncate text to a specified number of sentences
 * @param text - The text to truncate
 * @param sentenceCount - Number of sentences to keep (default: 2)
 * @returns Truncated text with "..." appended if truncated
 */
export function truncateToSentences(
  text: string | undefined,
  sentenceCount: number = 2
): string | undefined {
  if (!text || text.trim().length === 0) {
    return text;
  }

  // Split on sentence boundaries: period, exclamation, or question mark followed by space or end of string
  const sentenceRegex = /[.!?](?:\s+|$)/g;
  const matches = [];
  let match;
  
  while ((match = sentenceRegex.exec(text)) !== null) {
    matches.push(match.index + 1); // Position after the punctuation
  }

  // If fewer sentences than requested, return original text
  if (matches.length <= sentenceCount) {
    return text;
  }

  // Get position of nth sentence ending
  const truncateAt = matches[sentenceCount - 1];
  const truncated = text.slice(0, truncateAt).trim();
  
  return truncated + '...';
}

/**
 * Check if text was truncated
 * @param original - Original text
 * @param truncated - Truncated text
 * @returns true if text was truncated
 */
export function wasTruncated(
  original: string | undefined,
  truncated: string | undefined
): boolean {
  if (!original || !truncated) return false;
  return truncated.endsWith('...') && original.length > truncated.length - 3;
}
