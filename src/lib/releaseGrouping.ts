import type { CollectionEntry } from 'astro:content';
import { parseVersion, isSameMinorSeries, compareVersions, type SemanticVersion } from './semver';

export interface ReleaseGroup {
  project: string;
  leadRelease: CollectionEntry<'releases'>; // Most recent release (always shown)
  collapsedReleases: CollectionEntry<'releases'>[]; // Older releases in same minor series
  version?: SemanticVersion;
}

/**
 * Group releases by project and minor version series
 * Creates collapsible groups for releases in the same minor series
 * 
 * Strategy:
 * - Group consecutive releases by project name
 * - Within each project group, detect version series
 * - If multiple releases in same minor series (e.g., v1.2.3, v1.2.2, v1.2.1):
 *   - Show most recent (v1.2.3) as lead
 *   - Collapse older patch releases (v1.2.2, v1.2.1)
 * - Major/minor bumps always start new group (always expanded)
 * 
 * @param releases - Sorted releases (newest first)
 * @returns Array of release groups
 */
export function groupReleases(
  releases: CollectionEntry<'releases'>[]
): ReleaseGroup[] {
  const groups: ReleaseGroup[] = [];
  
  for (let i = 0; i < releases.length; i++) {
    const release = releases[i];
    const projectName = release.data.projectName || release.data.feedTitle || 'Unknown';
    const version = parseVersion(release.data.title);
    
    // Check if we can collapse this release into the previous group
    const prevGroup = groups[groups.length - 1];
    
    if (
      prevGroup &&
      prevGroup.project === projectName &&
      version &&
      prevGroup.version &&
      isSameMinorSeries(prevGroup.version, version)
    ) {
      // Same project, same minor series → collapse into previous group
      prevGroup.collapsedReleases.push(release);
    } else {
      // Different project, different series, or no version → new group
      groups.push({
        project: projectName,
        leadRelease: release,
        collapsedReleases: [],
        version: version || undefined,
      });
    }
  }
  
  return groups;
}

/**
 * Check if a release group should be collapsible
 * Only groups with 2+ releases can be collapsed
 */
export function isCollapsible(group: ReleaseGroup): boolean {
  return group.collapsedReleases.length > 0;
}

/**
 * Get summary text for collapsed releases
 * e.g., "3 more releases", "1 more release"
 */
export function getCollapsedSummary(group: ReleaseGroup): string {
  const count = group.collapsedReleases.length;
  if (count === 0) return '';
  if (count === 1) return '1 more release';
  return `${count} more releases`;
}

/**
 * Get version list for collapsed releases
 * e.g., "v1.2.2, v1.2.1, v1.2.0"
 */
export function getCollapsedVersionList(group: ReleaseGroup): string {
  return group.collapsedReleases
    .map(r => {
      const v = parseVersion(r.data.title);
      return v ? `v${v.major}.${v.minor}.${v.patch}` : r.data.title;
    })
    .join(', ');
}
