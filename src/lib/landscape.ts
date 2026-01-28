import yaml from 'js-yaml';
import type { LandscapeData, LandscapeProject } from './schemas';

const LANDSCAPE_URL = 'https://raw.githubusercontent.com/cncf/landscape/master/landscape.yml';

/**
 * Fetch and parse CNCF landscape.yml
 * Returns a map of org/repo -> project metadata
 */
export async function fetchLandscapeData(): Promise<LandscapeData> {
  console.log('[Landscape] Fetching from:', LANDSCAPE_URL);
  
  try {
    const response = await fetch(LANDSCAPE_URL);
    if (!response.ok) {
      throw new Error(`Failed to fetch landscape: ${response.status} ${response.statusText}`);
    }
    
    const yamlText = await response.text();
    console.log('[Landscape] Downloaded', yamlText.length, 'bytes');
    
    const parsed = yaml.load(yamlText) as any;
    const projectMap = parseLandscapeYaml(parsed);
    
    console.log('[Landscape] Parsed', Object.keys(projectMap).length, 'projects');
    return projectMap;
  } catch (error) {
    console.error('[Landscape] Error fetching landscape:', error);
    throw error;
  }
}

/**
 * Parse landscape YAML structure into flat project map
 * Structure: landscape -> categories -> subcategories -> items
 */
function parseLandscapeYaml(data: any): LandscapeData {
  const projectMap: LandscapeData = {};
  
  if (!data.landscape || !Array.isArray(data.landscape)) {
    console.warn('[Landscape] No landscape array found in data');
    return projectMap;
  }
  
  // Iterate through categories
  for (const category of data.landscape) {
    if (!category.subcategories || !Array.isArray(category.subcategories)) {
      continue;
    }
    
    // Iterate through subcategories
    for (const subcategory of category.subcategories) {
      if (!subcategory.items || !Array.isArray(subcategory.items)) {
        continue;
      }
      
      // Iterate through items (projects)
      for (const item of subcategory.items) {
        const project = parseProjectItem(item);
        if (project && project.repo_url) {
          // Extract org/repo from GitHub URL
          const slug = extractRepoSlug(project.repo_url);
          if (slug) {
            // Only overwrite if new project has CNCF status or existing doesn't
            const existing = projectMap[slug];
            if (!existing || project.project || !existing.project) {
              projectMap[slug] = project;
            }
            // If both have status, prefer the CNCF one (non-Wasm, non-duplicate)
            if (existing && existing.project && project.project) {
              // Keep the one without "(Wasm)" or other suffixes in the name
              if (!project.name.includes('(') && existing.name.includes('(')) {
                projectMap[slug] = project;
              }
            }
          }
        }
      }
    }
  }
  
  return projectMap;
}

/**
 * Parse individual project item from landscape
 */
function parseProjectItem(item: any): LandscapeProject | null {
  if (!item || typeof item !== 'object') {
    return null;
  }
  
  // Extract project status from 'project' field
  let projectStatus: 'graduated' | 'incubating' | 'sandbox' | undefined;
  if (item.project === 'graduated' || item.project === 'incubating' || item.project === 'sandbox') {
    projectStatus = item.project;
  }
  
  // Extract description from extra.summary_use_case or extra.summary_business_use_case
  let description: string | undefined;
  if (item.extra) {
    description = item.extra.summary_use_case || item.extra.summary_business_use_case;
    // Clean up description (remove extra whitespace)
    if (description) {
      description = description.replace(/\s+/g, ' ').trim();
    }
  }
  
  return {
    name: item.name || '',
    description,
    repo_url: item.repo_url,
    homepage_url: item.homepage_url,
    project: projectStatus,
  };
}

/**
 * Extract org/repo slug from GitHub URL
 * Example: https://github.com/dapr/dapr -> dapr/dapr
 */
export function extractRepoSlug(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (parsed.hostname !== 'github.com') {
      return null;
    }
    
    // Remove leading/trailing slashes and extract org/repo
    const parts = parsed.pathname.replace(/^\/|\/$/g, '').split('/');
    if (parts.length >= 2) {
      return `${parts[0]}/${parts[1]}`;
    }
    
    return null;
  } catch {
    return null;
  }
}

/**
 * Match a feed URL to a landscape project
 * Example: https://github.com/dapr/dapr/releases.atom -> dapr/dapr
 */
export function matchFeedToProject(feedUrl: string, landscapeData: LandscapeData): LandscapeProject | null {
  const slug = extractRepoSlug(feedUrl);
  if (!slug) {
    return null;
  }
  
  return landscapeData[slug] || null;
}
