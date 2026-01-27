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
 * - Special handling for prereleases (RC, alpha, beta):
 *   - All prereleases from same project collapse together
 *   - This handles parallel development tracks (e.g., v2.11.12-RC.5 and v2.12.4-RC.5)
 * - For stable releases, group by minor version series:
 *   - If multiple releases in same minor series (e.g., v1.2.3, v1.2.2, v1.2.1):
 *     - Show most recent (v1.2.3) as lead
 *     - Collapse older patch releases (v1.2.2, v1.2.1)
 *   - Major/minor bumps start new group (always expanded)
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
    
    const canCollapse = 
      prevGroup &&
      prevGroup.project === projectName &&
      version &&
      prevGroup.version &&
      (
        // Case 1: Both are prereleases from same project → always group
        (version.prerelease && prevGroup.version.prerelease) ||
        // Case 2: Both are stable and in same minor series → group
        (!version.prerelease && !prevGroup.version.prerelease && isSameMinorSeries(prevGroup.version, version))
      );
    
    if (canCollapse) {
      // Collapse into previous group
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
