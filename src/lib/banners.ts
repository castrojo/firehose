/**
 * CNCF Banner System - Official Integration
 * 
 * Fetches banner configuration from cncf.github.io/banners at build time.
 * 
 * Architecture:
 * - Build-time fetching = zero runtime overhead
 * - Graceful degradation = site works even if banners unavailable
 * - Single source of truth = CNCF controls banner rotation
 * - No date logic needed = CNCF manages active banners
 * 
 * Banner format (500x500px square):
 * - light-theme: For light mode display
 * - dark-theme: For dark mode display
 */

export interface BannerConfig {
  name: string;
  link: string;
  lightImage: string;
  darkImage: string;
}

interface RawBanner {
  name?: string;
  link?: string;
  images?: {
    'light-theme'?: string;
    'dark-theme'?: string;
  };
}

/**
 * Minimal inline parser for banners.yml.
 *
 * Handles exactly this structure (no js-yaml dependency needed):
 *
 *   - name: "Foo"
 *     link: "https://..."
 *     images:
 *       light-theme: "https://..."
 *       dark-theme: "https://..."
 *
 * Rules:
 * - Lines starting with "- " begin a new banner object
 * - Key-value lines: `  key: value` (leading whitespace ignored)
 * - Nested `images:` block: next lines with deeper indent are sub-keys
 * - Values may be quoted with single or double quotes (stripped)
 * - Blank lines and comment lines (#) are ignored
 */
function parseBannersYamlInline(yamlText: string): RawBanner[] {
  const banners: RawBanner[] = [];
  let current: RawBanner | null = null;
  let inImages = false;

  for (const rawLine of yamlText.split('\n')) {
    const line = rawLine.trimEnd();
    if (!line.trim() || line.trim().startsWith('#')) continue;

    // Strip an optional leading quote character from values
    const stripQuotes = (s: string): string => s.replace(/^['"]|['"]$/g, '').trim();

    // New top-level list item
    if (/^- /.test(line)) {
      if (current) banners.push(current);
      current = {};
      inImages = false;
      const rest = line.slice(2).trim();
      const colonIdx = rest.indexOf(':');
      if (colonIdx !== -1) {
        const k = rest.slice(0, colonIdx).trim();
        const v = rest.slice(colonIdx + 1).trim();
        if (k && v) (current as Record<string, unknown>)[k] = stripQuotes(v);
      }
      continue;
    }

    if (!current) continue;

    const trimmed = line.trim();
    const colonIdx = trimmed.indexOf(':');
    if (colonIdx === -1) continue;

    const key = trimmed.slice(0, colonIdx).trim();
    const val = trimmed.slice(colonIdx + 1).trim();

    // Entering images block
    if (key === 'images' && !val) {
      inImages = true;
      current.images = {};
      continue;
    }

    if (inImages && current.images) {
      // Detect end of images block: line indented less than image sub-keys
      const indent = line.match(/^(\s*)/)?.[1].length ?? 0;
      if (indent <= 2) {
        inImages = false;
        // Fall through to handle as top-level key
      } else {
        if (key === 'light-theme') current.images['light-theme'] = stripQuotes(val);
        else if (key === 'dark-theme') current.images['dark-theme'] = stripQuotes(val);
        continue;
      }
    }

    if (key === 'name') current.name = stripQuotes(val);
    else if (key === 'link') current.link = stripQuotes(val);
  }

  if (current) banners.push(current);
  return banners;
}

/**
 * Fetch CNCF banners configuration from official source
 * 
 * Returns empty array on error (graceful degradation)
 */
export async function fetchBannersConfig(): Promise<RawBanner[]> {
  try {
    const response = await fetch('https://cncf.github.io/banners/banners.yml');
    
    if (!response.ok) {
      console.warn(`Failed to fetch banners.yml: ${response.status} ${response.statusText}`);
      return [];
    }
    
    const yamlText = await response.text();
    return parseBannersYamlInline(yamlText);
  } catch (error) {
    console.warn('Error fetching CNCF banners:', error);
    return [];
  }
}

/**
 * Parse banners YAML and extract banner objects
 *
 * Returns empty array on parse errors
 */
export function parseBannersYaml(yamlText: string): RawBanner[] {
  return parseBannersYamlInline(yamlText);
}

/**
 * Get active KubeCon banner from CNCF configuration
 * 
 * Strategy:
 * - Filter to KubeCon/CloudNativeCon events (name includes "KubeCon")
 * - Return first banner (following Artifact Hub pattern)
 * - CNCF controls which banners are active and their order
 * 
 * Returns null if no active KubeCon banners
 */
export async function getActiveBanner(): Promise<BannerConfig | null> {
  const banners = await getActiveBanners();
  return banners.length > 0 ? banners[0] : null;
}

/**
 * Get all active KubeCon banners from CNCF configuration
 *
 * Returns all valid KubeCon/CloudNativeCon banners for client-side rotation.
 * Returns empty array if none available.
 */
export async function getActiveBanners(): Promise<BannerConfig[]> {
  const banners = await fetchBannersConfig();

  if (banners.length === 0) {
    return [];
  }

  // Filter to KubeCon events only
  const kubeconBanners = banners.filter(banner =>
    banner.name?.includes('KubeCon') || banner.name?.includes('CloudNative')
  );

  if (kubeconBanners.length === 0) {
    return [];
  }

  const configs: BannerConfig[] = [];
  for (const banner of kubeconBanners) {
    if (!banner.name || !banner.link || !banner.images?.['light-theme'] || !banner.images?.['dark-theme']) {
      console.warn('Banner missing required fields, skipping:', banner);
      continue;
    }
    configs.push({
      name: banner.name,
      link: banner.link,
      lightImage: banner.images['light-theme'],
      darkImage: banner.images['dark-theme'],
    });
  }

  return configs;
}
