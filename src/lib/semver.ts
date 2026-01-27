/**
 * Semantic version parsing and comparison utilities
 */

export interface SemanticVersion {
  major: number;
  minor: number;
  patch: number;
  prerelease?: string;
  original: string;
}

/**
 * Extract and parse semantic version from release title
 * Handles formats: v1.2.3, 1.2.3, v1.2.3-alpha, v1.2.3-rc.1, etc.
 * 
 * @param title - Release title (e.g., "Release v1.2.3", "v2.0.0-beta")
 * @returns Parsed version or null if no valid semver found
 */
export function parseVersion(title: string): SemanticVersion | null {
  if (!title) return null;

  // Match semver pattern: optional 'v', major.minor.patch, optional prerelease
  // Handles: v1.2.3, 1.2.3, v1.2.3-alpha, v1.2.3-rc.1, etc.
  const semverRegex = /\bv?(\d+)\.(\d+)\.(\d+)(?:-([a-zA-Z0-9.-]+))?\b/;
  const match = title.match(semverRegex);

  if (!match) return null;

  const [original, major, minor, patch, prerelease] = match;

  return {
    major: parseInt(major, 10),
    minor: parseInt(minor, 10),
    patch: parseInt(patch, 10),
    prerelease,
    original,
  };
}

/**
 * Compare two semantic versions
 * @returns -1 if a < b, 0 if a === b, 1 if a > b
 */
export function compareVersions(a: SemanticVersion, b: SemanticVersion): number {
  // Compare major
  if (a.major !== b.major) return a.major - b.major;
  
  // Compare minor
  if (a.minor !== b.minor) return a.minor - b.minor;
  
  // Compare patch
  if (a.patch !== b.patch) return a.patch - b.patch;
  
  // Compare prerelease (releases without prerelease > releases with prerelease)
  if (!a.prerelease && b.prerelease) return 1;
  if (a.prerelease && !b.prerelease) return -1;
  if (a.prerelease && b.prerelease) {
    return a.prerelease.localeCompare(b.prerelease);
  }
  
  return 0;
}

/**
 * Determine release type: major, minor, or patch
 * Compares current version to previous version
 * 
 * @param current - Current version
 * @param previous - Previous version (optional)
 * @returns 'major' | 'minor' | 'patch' | 'unknown'
 */
export function getReleaseType(
  current: SemanticVersion,
  previous?: SemanticVersion
): 'major' | 'minor' | 'patch' | 'unknown' {
  if (!previous) return 'unknown';

  if (current.major > previous.major) return 'major';
  if (current.minor > previous.minor) return 'minor';
  if (current.patch > previous.patch) return 'patch';

  return 'unknown';
}

/**
 * Check if two versions are in the same minor release series
 * e.g., 1.2.3 and 1.2.5 are same series, 1.2.3 and 1.3.0 are not
 */
export function isSameMinorSeries(a: SemanticVersion, b: SemanticVersion): boolean {
  return a.major === b.major && a.minor === b.minor;
}

/**
 * Format version for display
 */
export function formatVersion(version: SemanticVersion): string {
  let formatted = `v${version.major}.${version.minor}.${version.patch}`;
  if (version.prerelease) {
    formatted += `-${version.prerelease}`;
  }
  return formatted;
}
