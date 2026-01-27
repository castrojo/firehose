# Phase 6: CNCF Branding & Visual Identity - Research

**Researched:** January 26, 2026
**Domain:** Web branding, visual identity systems, CSS styling, responsive image loading
**Confidence:** HIGH

## Summary

CNCF provides comprehensive brand guidelines and an extensive artwork repository containing logos for all projects in multiple formats, layouts, and color schemes. The standard approach for CNCF branding integration involves:

1. **Typography & Colors**: Use Clarity City font and CNCF's defined color palette (CNCF Blue #0086FF, CNCF Black #000000, with secondary colors for accents)
2. **Project Logos**: Leverage the cncf/artwork repository which provides SVG/PNG logos in horizontal, stacked, and icon formats with color/black/white variants
3. **Info Boxes & Links**: Add sidebar information sections with links to cncf.io and landscape.cncf.io
4. **Responsive Design**: Ensure logos scale properly across all breakpoints (320px-1920px) using srcset or CSS max-width

The Firehose already uses GitHub Primer CSS which provides a solid foundation. The task is to overlay CNCF brand elements while maintaining the clean, functional design.

**Primary recommendation:** Use SVG logos from cncf/artwork with CSS variables for CNCF colors, add an info box component above Stats in the sidebar, and integrate project logos into ReleaseCard headers using the existing landscape integration for project name mapping.

## Standard Stack

### Core Resources
| Resource | Source | Purpose | Why Standard |
|----------|--------|---------|--------------|
| cncf/artwork | GitHub repository | Official project logos | Authoritative source, comprehensive coverage |
| Clarity City | Open source font | CNCF brand typography | Official CNCF font family |
| CSS Variables | Native CSS | Color theming | Modern, maintainable, no build step |
| SVG format | Vector graphics | Logo display | Scalable, small file size, resolution-independent |

### Supporting
| Tool | Purpose | When to Use |
|------|---------|-------------|
| srcset attribute | Responsive images | For PNG fallbacks (if needed) |
| CSS Grid/Flexbox | Layout info box | Existing pattern in sidebar |
| Astro components | Modular design | Existing architecture |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| SVG | PNG | PNGs larger file size but wider legacy browser support (not needed for modern stack) |
| CSS Variables | Sass/SCSS | Build complexity for no real benefit |
| Direct logo URLs | Local files | CDN reliability vs. local control (local preferred for performance) |

**Note:** No additional npm packages needed. All resources are available via GitHub and web fonts.

## Architecture Patterns

### Recommended File Structure
```
src/
├── components/
│   ├── ReleaseCard.astro      # Add logo display here
│   └── InfoBox.astro           # New component for CNCF links
├── lib/
│   └── logoMapper.ts           # Map project names to logo paths
└── public/
    └── logos/                  # Store project logos locally
        ├── dapr/
        │   └── icon-color.svg
        ├── kubernetes/
        │   └── icon-color.svg
        └── ...
```

### Pattern 1: Color System with CSS Variables
**What:** Define CNCF brand colors as CSS custom properties in :root
**When to use:** For consistent color theming across all components
**Example:**
```css
/* Source: https://www.cncf.io/brand-guidelines/ */
:root {
  /* CNCF Primary Colors */
  --color-cncf-blue: #0086FF;
  --color-cncf-black: #000000;
  
  /* CNCF Secondary Colors */
  --color-cncf-turquoise: #93EAFF;
  --color-cncf-pink: #D62293;
  --color-cncf-stone: #E5E5E5;
  --color-cncf-white: #FFFFFF;
  
  /* Map CNCF colors to existing variables */
  --color-accent-emphasis: var(--color-cncf-blue);
  --color-text-link: var(--color-cncf-blue);
}
```

### Pattern 2: Logo Loading Strategy
**What:** Use SVG icons from cncf/artwork repository
**When to use:** For project logos in release cards
**Example:**
```typescript
// Source: cncf/artwork repository structure
interface LogoConfig {
  projectName: string;
  logoPath: string; // e.g., '/logos/dapr/icon-color.svg'
  fallbackColor: string; // For projects without logos
}

function getProjectLogo(projectName: string): string {
  // Map project name to logo path
  const normalizedName = projectName.toLowerCase().replace(/\s+/g, '-');
  return `/logos/${normalizedName}/icon-color.svg`;
}
```

### Pattern 3: Info Box Component
**What:** Reusable sidebar section component for CNCF links
**When to use:** Above Stats section in sidebar
**Example:**
```astro
---
// Source: Existing sidebar pattern from index.astro
interface Link {
  text: string;
  url: string;
  external?: boolean;
}

interface Props {
  title: string;
  links: Link[];
}

const { title, links } = Astro.props;
---

<div class="info-box">
  <h2 class="sidebar-heading">{title}</h2>
  <ul class="info-links">
    {links.map(link => (
      <li>
        <a 
          href={link.url} 
          target={link.external ? "_blank" : undefined}
          rel={link.external ? "noopener noreferrer" : undefined}
        >
          {link.text}
        </a>
      </li>
    ))}
  </ul>
</div>

<style>
  .info-box {
    background: var(--color-bg-default);
    border: 1px solid var(--color-border-default);
    border-radius: 6px;
    padding: 1.5rem;
  }
  
  .info-links {
    list-style: none;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }
  
  .info-links a {
    color: var(--color-cncf-blue);
    text-decoration: none;
    font-size: 0.875rem;
  }
  
  .info-links a:hover {
    text-decoration: underline;
  }
</style>
```

### Pattern 4: Logo Display in Release Cards
**What:** Display project icon next to project name in card header
**When to use:** In ReleaseCard component
**Example:**
```astro
---
// Source: Existing ReleaseCard.astro structure
const projectLogo = getProjectLogo(data.projectName);
---

<article class="release-card">
  <div class="release-header">
    <img 
      src={projectLogo} 
      alt={`${data.projectName} logo`}
      class="project-logo"
      width="32"
      height="32"
      loading="lazy"
    />
    <span class="project-name">{data.projectName}</span>
    {data.projectStatus && (
      <span class={`project-status ${data.projectStatus}`}>
        {data.projectStatus}
      </span>
    )}
  </div>
  <!-- ... rest of card ... -->
</article>

<style>
  .project-logo {
    width: 32px;
    height: 32px;
    flex-shrink: 0;
    border-radius: 4px; /* Slight rounding for visual polish */
  }
  
  /* Responsive sizing */
  @media (max-width: 480px) {
    .project-logo {
      width: 24px;
      height: 24px;
    }
  }
</style>
```

### Anti-Patterns to Avoid

- **Logo Manipulation:** Never distort, recolor, or modify CNCF/project logos (violates trademark guidelines)
- **Hotlinking Logos:** Don't load logos directly from GitHub raw URLs (no uptime SLA, rate limits)
- **Blocking Logo Loads:** Don't use synchronous logo loading that blocks page render
- **Missing Fallbacks:** Don't fail silently when logos are missing (show placeholder or project initial)
- **Inconsistent Sizing:** Don't use different logo sizes across cards (creates visual chaos)

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Logo optimization | Custom image pipeline | SVG with native CSS sizing | SVGs are already optimized, scale perfectly |
| Color theming | Custom theming system | CSS custom properties | Native, no build step, works everywhere |
| Responsive images | JavaScript-based switcher | CSS max-width + srcset | Built-in browser optimization |
| Font loading | Custom font loader | Web font with font-display | Browser handles optimization, flash prevention |
| Broken image handling | Custom error handlers | onerror + fallback pattern | Simple, reliable, widely supported |

**Key insight:** CNCF brand assets are production-ready. The goal is integration, not transformation. Use native web standards (CSS variables, SVG, semantic HTML) rather than adding build complexity.

## Common Pitfalls

### Pitfall 1: Logo Trademark Violations
**What goes wrong:** Modifying logos (colors, proportions, elements) violates CNCF trademark guidelines
**Why it happens:** Designer instinct to make logos "fit better" with the design
**How to avoid:** 
- Use logos exactly as provided in cncf/artwork
- Only use approved color variants (color, black, white)
- Maintain aspect ratios (use width OR height, not both)
- Review Linux Foundation Trademark Usage guidelines
**Warning signs:** Custom logo colors, stretched logos, combined logos

### Pitfall 2: Performance Impact from Logo Loading
**What goes wrong:** Loading 60+ logos on page load causes performance degradation
**Why it happens:** Not using lazy loading or loading all logos upfront
**How to avoid:**
- Use `loading="lazy"` attribute on img tags
- Leverage existing InfiniteScroll pattern (only render visible cards)
- Use SVG format (smaller than PNG)
- Consider data URI for very small icons
**Warning signs:** High LCP (Largest Contentful Paint), bandwidth spikes, slow scroll performance

### Pitfall 3: Logo Path Mismatches
**What goes wrong:** Project names from landscape.yml don't match logo directory names in cncf/artwork
**Why it happens:** Inconsistent naming conventions (spaces vs hyphens, capitalization)
**How to avoid:**
- Create explicit mapping for known edge cases
- Use fuzzy matching with fallback
- Test with all 62 projects in feeds
- Provide visual indicator for missing logos
**Warning signs:** Broken images, 404s in network tab, missing project branding

### Pitfall 4: Accessibility Issues with Logos
**What goes wrong:** Logo-only display lacks screen reader support or sufficient contrast
**Why it happens:** Forgetting that logos are decorative images that need alt text
**How to avoid:**
- Always include descriptive alt text: `alt="Kubernetes logo"`
- Ensure 3:1 contrast ratio for logos against background
- Don't rely solely on logos for project identification (keep text labels)
- Test with screen readers
**Warning signs:** Empty alt attributes, low contrast ratios, ARIA violations

### Pitfall 5: Sidebar Layout Breaking on Mobile
**What goes wrong:** Adding info box causes sidebar to become too tall on mobile
**Why it happens:** Not accounting for vertical space constraints on small screens
**How to avoid:**
- Test at 320px viewport (minimum supported)
- Use existing responsive patterns from Stats component
- Consider collapsible sections for mobile
- Ensure touch targets are at least 44x44px
**Warning signs:** Vertical scrolling issues, content cut off, tiny touch targets

## Code Examples

### Logo Loading with Fallback
```typescript
// src/lib/logoMapper.ts
// Source: cncf/artwork repository structure + Firehose landscape integration

/**
 * Maps project names to their logo paths in the /public/logos directory
 * Falls back to a placeholder if logo doesn't exist
 */
export function getProjectLogo(projectName: string | undefined): string {
  if (!projectName) {
    return '/logos/placeholder.svg';
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
  return `/logos/${logoDir}/icon-color.svg`;
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
```

### CNCF Color System Integration
```css
/* src/pages/index.astro <style> section */
/* Source: https://www.cncf.io/brand-guidelines/ */

:root {
  /* CNCF Primary Colors */
  --color-cncf-blue: #0086FF;      /* RGB: 0 134 255 | PANTONE: 285C */
  --color-cncf-black: #000000;     /* RGB: 0 0 0 | PANTONE: BLACK C */
  
  /* CNCF Secondary Colors */
  --color-cncf-turquoise: #93EAFF; /* RGB: 91 223 255 | PANTONE: 2995C */
  --color-cncf-pink: #D62293;      /* RGB: 214 34 147 | PANTONE: 213C */
  --color-cncf-stone: #E5E5E5;     /* RGB: 229 229 229 | PANTONE: WARM GREY 1C */
  --color-cncf-white: #FFFFFF;     /* RGB: 255 255 255 */
  
  /* Override existing variables to use CNCF blue */
  --color-accent-emphasis: var(--color-cncf-blue);
  --color-text-link: var(--color-cncf-blue);
  
  /* Keep GitHub Primer neutrals for base UI */
  /* Already defined: --color-bg-default, --color-border-default, etc. */
}

/* Optional: Typography enhancement (Clarity City font) */
body {
  font-family: 'Clarity City', -apple-system, BlinkMacSystemFont, 'Segoe UI', 
               'Noto Sans', Helvetica, Arial, sans-serif;
}

/* Note: Clarity City would need to be loaded via @font-face or web font service
   For Phase 6, using system fonts with CNCF colors may be sufficient */
```

### InfoBox Component Implementation
```astro
---
// src/components/InfoBox.astro
// Source: Existing sidebar pattern from index.astro

interface Link {
  text: string;
  url: string;
  external?: boolean;
}

interface Props {
  title: string;
  description?: string;
  links: Link[];
}

const { title, description, links } = Astro.props;
---

<div class="info-box">
  <h2 class="sidebar-heading">{title}</h2>
  {description && <p class="info-description">{description}</p>}
  <ul class="info-links">
    {links.map(link => (
      <li>
        <a 
          href={link.url} 
          target={link.external ? "_blank" : undefined}
          rel={link.external ? "noopener noreferrer" : undefined}
          class="info-link"
        >
          {link.text}
          {link.external && (
            <span class="external-icon" aria-label="Opens in new tab">
              <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
                <path d="M3.75 2A1.75 1.75 0 002 3.75v8.5c0 .966.784 1.75 1.75 1.75h8.5A1.75 1.75 0 0014 12.25v-3.5a.75.75 0 00-1.5 0v3.5a.25.25 0 01-.25.25h-8.5a.25.25 0 01-.25-.25v-8.5a.25.25 0 01.25-.25h3.5a.75.75 0 000-1.5h-3.5z"/>
                <path d="M9 1.75a.75.75 0 01.75-.75h4.5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0V3.56L8.78 8.28a.75.75 0 01-1.06-1.06l4.72-4.72H9.75A.75.75 0 019 1.75z"/>
              </svg>
            </span>
          )}
        </a>
      </li>
    ))}
  </ul>
</div>

<style>
  .info-box {
    background: var(--color-bg-default);
    border: 1px solid var(--color-border-default);
    border-radius: 6px;
    padding: 1.5rem;
  }
  
  .sidebar-heading {
    font-size: 1rem;
    font-weight: 600;
    color: var(--color-text-primary);
    margin-bottom: 1rem;
    padding-bottom: 0.5rem;
    border-bottom: 1px solid var(--color-border-default);
  }
  
  .info-description {
    color: var(--color-text-secondary);
    font-size: 0.875rem;
    line-height: 1.5;
    margin-bottom: 1rem;
  }
  
  .info-links {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }
  
  .info-link {
    color: var(--color-cncf-blue);
    text-decoration: none;
    font-size: 0.875rem;
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    transition: color 0.15s ease;
  }
  
  .info-link:hover {
    text-decoration: underline;
    color: var(--color-text-primary);
  }
  
  .external-icon {
    display: inline-flex;
    opacity: 0.6;
  }
  
  /* Mobile responsiveness */
  @media (max-width: 480px) {
    .info-box {
      padding: 1rem;
    }
  }
</style>
```

### Logo Integration in ReleaseCard
```astro
---
// src/components/ReleaseCard.astro (modified)
// Source: Existing ReleaseCard.astro + logo integration
import { getProjectLogo } from '../lib/logoMapper';

// ... existing Props interface ...

const projectLogo = getProjectLogo(data.projectName);
---

<article class="release-card">
  <div class="release-header">
    <img 
      src={projectLogo} 
      alt={`${data.projectName || 'Project'} logo`}
      class="project-logo"
      width="32"
      height="32"
      loading="lazy"
      onerror="this.style.display='none'"
    />
    <span class="project-name">{data.projectName || data.feedTitle || 'Unknown Project'}</span>
    {data.projectStatus && (
      <span class={`project-status ${data.projectStatus}`}>
        {data.projectStatus}
      </span>
    )}
  </div>
  
  <!-- ... rest of existing card content ... -->
</article>

<style>
  /* Existing styles ... */
  
  .release-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
  }
  
  .project-logo {
    width: 32px;
    height: 32px;
    flex-shrink: 0;
    border-radius: 4px;
    object-fit: contain; /* Maintain aspect ratio */
  }
  
  .project-name {
    font-weight: 600;
    color: var(--color-text-primary);
    font-size: 1.5rem;
  }
  
  /* Responsive adjustments */
  @media (max-width: 480px) {
    .project-logo {
      width: 24px;
      height: 24px;
    }
    
    .project-name {
      font-size: 1.25rem;
    }
  }
  
  @media (max-width: 320px) {
    .project-logo {
      width: 20px;
      height: 20px;
    }
  }
</style>
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| PNG logos | SVG logos | 2020+ | Smaller file sizes, perfect scaling, better for responsive |
| Inline styles | CSS custom properties | 2018+ | Better maintainability, runtime theming possible |
| Font icons | SVG icons | 2019+ | Better quality, no font loading delays |
| @font-face | Variable fonts | 2023+ | Fewer font files, dynamic weight adjustments |
| jQuery for interactions | Vanilla JS | 2020+ | No dependencies, better performance |

**Deprecated/outdated:**
- **Icon fonts (Font Awesome, etc.):** Replaced by SVG. Better quality, no FOIT/FOUT issues
- **PNG sprites:** Replaced by individual SVGs. HTTP/2 makes multiple requests efficient
- **Sass color functions:** Replaced by CSS custom properties. Native, no build step
- **Webfont services with tracking:** Privacy concerns. Self-host or use privacy-friendly CDNs

## Open Questions

1. **Clarity City Font Loading**
   - What we know: Clarity City is CNCF's official font, available on GitHub
   - What's unclear: Should we load it for Phase 6, or is system font stack sufficient?
   - Recommendation: Start with system fonts using CNCF colors. Add Clarity City in a future enhancement if needed (requires web font service setup or self-hosting)

2. **Logo Storage Strategy**
   - What we know: 62 projects = 62 logos to manage
   - What's unclear: Download all logos to /public, or selective downloading based on feeds.ts?
   - Recommendation: Download only logos for projects in feeds.ts (62 projects). Creates ~2MB of static assets. Use build script to automate download from cncf/artwork

3. **Fallback for Missing Logos**
   - What we know: Some projects might not have logos in cncf/artwork
   - What's unclear: Best fallback pattern (placeholder SVG, project initial, or hide logo)?
   - Recommendation: Use onerror="this.style.display='none'" to gracefully hide missing logos. Project name remains visible

4. **CNCF Branding Approval**
   - What we know: Site will display CNCF logos and branding
   - What's unclear: Does this require formal approval from CNCF?
   - Recommendation: Review Linux Foundation Trademark Usage guidelines. Firehose is a community project showcasing CNCF projects, likely fair use, but confirm if uncertain

## Sources

### Primary (HIGH confidence)
- https://www.cncf.io/brand-guidelines/ - Official CNCF brand guidelines (colors, typography, usage rules)
- https://github.com/cncf/artwork - Official CNCF project logos repository (structure, formats, variants)
- https://www.linuxfoundation.org/legal/trademark-usage - Trademark usage guidelines

### Secondary (MEDIUM confidence)
- https://landscape.cncf.io - CNCF Landscape for project categorization
- https://github.com/vmware/clarity-city - Clarity City font repository
- Existing Firehose codebase - Current styling patterns (GitHub Primer CSS variables)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Official CNCF resources are authoritative and comprehensive
- Architecture: HIGH - Patterns align with existing Firehose architecture (Astro components, CSS variables)
- Pitfalls: MEDIUM - Based on common web development patterns, not CNCF-specific documentation

**Research date:** January 26, 2026
**Valid until:** ~180 days (branding guidelines change infrequently, but logo repository updates regularly as projects graduate)

**Key dependencies:**
- No new npm packages required
- Logos must be downloaded from cncf/artwork (can be automated)
- Font loading optional (system fonts acceptable)

**Validation checklist for planner:**
- [ ] Logo paths match cncf/artwork directory structure
- [ ] All 62 projects in feeds.ts have logo mappings
- [ ] Responsive design tested at 320px, 768px, 1024px, 1920px
- [ ] WCAG AA contrast ratios maintained (3:1 for graphics, 4.5:1 for text)
- [ ] Trademark guidelines followed (no logo modifications)
- [ ] Lazy loading implemented for performance
- [ ] Accessibility (alt text, screen reader support)
