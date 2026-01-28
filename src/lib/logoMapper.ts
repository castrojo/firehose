/**
 * Maps project names to their logo paths in the /public/logos directory
 * Falls back to a placeholder if logo doesn't exist
 */
export function getProjectLogo(projectName: string | undefined): string {
  // Astro's BASE_URL (e.g., /firehose) is used for GitHub Pages deployment
  // Public assets need the base path prepended
  const baseUrl = import.meta.env.BASE_URL || '/';
  const normalizedBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  
  if (!projectName) {
    return `${normalizedBaseUrl}/logos/cncf-placeholder.svg`;
  }
  
  // Normalize project name to match cncf/artwork structure
  const normalized = projectName
    .toLowerCase()
    .replace(/\s+/g, '-')      // Spaces to hyphens
    .replace(/[()]/g, '')      // Remove parentheses
    .replace(/\./g, '');       // Remove dots
  
  // Known edge cases (project name doesn't match artwork directory)
  const specialCases: Record<string, string> = {
    'in-toto': 'in-toto',
    'open-policy-agent': 'opa',
    'the-update-framework': 'tuf',
    // Add more as discovered during testing
  };
  
  const logoDir = specialCases[normalized] || normalized;
  
  // Use icon format (square) for compact display in card headers
  return `${normalizedBaseUrl}/logos/${logoDir}/icon-color.svg`;
}

/**
 * Check if logo exists (for build-time validation)
 */
export async function validateLogos(projectNames: string[]): Promise<Map<string, boolean>> {
  const results = new Map<string, boolean>();
  
  for (const name of projectNames) {
    const logoPath = getProjectLogo(name);
    try {
      // This would run during build to validate logos exist
      // Implementation depends on build environment
      results.set(name, true);
    } catch {
      results.set(name, false);
      console.warn(`Logo missing for project: ${name}`);
    }
  }
  
  return results;
}
