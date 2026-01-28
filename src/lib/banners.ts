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

import yaml from 'js-yaml';

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
 * Fetch CNCF banners configuration from official source
 * 
 * Returns empty array on error (graceful degradation)
 */
export async function fetchBannersConfig(): Promise<RawBanner[]> {
  try {
    console.log('Fetching CNCF banners configuration...');
    const response = await fetch('https://cncf.github.io/banners/banners.yml');
    
    if (!response.ok) {
      console.warn(`Failed to fetch banners.yml: ${response.status} ${response.statusText}`);
      return [];
    }
    
    const yamlText = await response.text();
    return parseBannersYaml(yamlText);
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
  try {
    const data = yaml.load(yamlText);
    
    if (Array.isArray(data)) {
      return data;
    }
    
    console.warn('Banners YAML is not an array');
    return [];
  } catch (error) {
    console.warn('Error parsing banners YAML:', error);
    return [];
  }
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
  const banners = await fetchBannersConfig();
  
  if (banners.length === 0) {
    console.log('No banners available');
    return null;
  }
  
  // Filter to KubeCon events only
  const kubeconBanners = banners.filter(banner => 
    banner.name?.includes('KubeCon') || banner.name?.includes('CloudNative')
  );
  
  if (kubeconBanners.length === 0) {
    console.log('No KubeCon banners found');
    return null;
  }
  
  // Take first KubeCon banner (CNCF controls order)
  const banner = kubeconBanners[0];
  
  // Validate required fields
  if (!banner.name || !banner.link || !banner.images?.['light-theme'] || !banner.images?.['dark-theme']) {
    console.warn('Banner missing required fields:', banner);
    return null;
  }
  
  const config: BannerConfig = {
    name: banner.name,
    link: banner.link,
    lightImage: banner.images['light-theme'],
    darkImage: banner.images['dark-theme'],
  };
  
  console.log(`Fetched active KubeCon banner: ${config.name}`);
  console.log(`  Link: ${config.link}`);
  console.log(`  Light image: ${config.lightImage}`);
  console.log(`  Dark image: ${config.darkImage}`);
  
  return config;
}
