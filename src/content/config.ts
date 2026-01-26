import { defineCollection } from 'astro:content';
import { feedLoader } from '../lib/feed-loader';
import { FeedEntrySchema } from '../lib/schemas';

/**
 * Define the 'releases' content collection
 * Uses custom feed loader to fetch and parse CNCF project releases
 */
const releases = defineCollection({
  loader: feedLoader([
    // Phase 1: Single feed for proof of concept
    { url: 'https://github.com/dapr/dapr/releases.atom' },
    
    // Phase 2 will expand to ~100 feeds from osmosfeed.yaml
  ]),
  schema: FeedEntrySchema,
});

export const collections = {
  releases,
};
