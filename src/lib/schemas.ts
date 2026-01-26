import { z } from 'zod';

/**
 * CNCF Project Status
 */
export const ProjectStatusSchema = z.enum(['graduated', 'incubating', 'sandbox']);
export type ProjectStatus = z.infer<typeof ProjectStatusSchema>;

/**
 * CNCF Landscape Project Metadata
 */
export const LandscapeProjectSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  repo_url: z.string().url().optional(),
  homepage_url: z.string().url().optional(),
  project: ProjectStatusSchema.optional(),
});
export type LandscapeProject = z.infer<typeof LandscapeProjectSchema>;

/**
 * Landscape Data Map (keyed by org/repo slug)
 */
export const LandscapeDataSchema = z.record(z.string(), LandscapeProjectSchema);
export type LandscapeData = z.infer<typeof LandscapeDataSchema>;

/**
 * RSS/Atom Feed Entry
 */
export const FeedEntrySchema = z.object({
  // Required fields
  title: z.string().min(1, 'Title is required'),
  link: z.string().url('Link must be a valid URL'),
  
  // Optional standard fields
  pubDate: z.string().optional(),
  content: z.string().optional(),
  contentSnippet: z.string().optional(),
  guid: z.string().optional(),
  isoDate: z.string().optional(),
  
  // Enriched fields from landscape
  projectName: z.string().optional(),
  projectDescription: z.string().optional(),
  projectStatus: ProjectStatusSchema.optional(),
  projectHomepage: z.string().url().optional(),
  
  // Feed metadata
  feedUrl: z.string().url(),
  feedTitle: z.string().optional(),
});
export type FeedEntry = z.infer<typeof FeedEntrySchema>;

/**
 * Feed Source Configuration
 */
export const FeedSourceSchema = z.object({
  url: z.string().url('Feed URL must be valid'),
  name: z.string().optional(), // Override feed title
});
export type FeedSource = z.infer<typeof FeedSourceSchema>;

/**
 * Feed Fetch Result (success or error)
 */
export const FeedResultSchema = z.discriminatedUnion('status', [
  z.object({
    status: z.literal('success'),
    feedUrl: z.string().url(),
    entries: z.array(FeedEntrySchema),
    fetchedAt: z.string(),
  }),
  z.object({
    status: z.literal('error'),
    feedUrl: z.string().url(),
    error: z.string(),
    errorType: z.enum(['network', 'parse', 'validation']),
    fetchedAt: z.string(),
  }),
]);
export type FeedResult = z.infer<typeof FeedResultSchema>;
