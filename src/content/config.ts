import { defineCollection } from 'astro:content';
import { feedLoader } from '../lib/feed-loader';
import { FeedEntrySchema } from '../lib/schemas';
import feeds from '../config/feeds';

/**
 * Define the 'releases' content collection
 * Uses custom feed loader to fetch and parse CNCF project releases
 */
const releases = defineCollection({
  loader: feedLoader(feeds),
  schema: FeedEntrySchema,
});

export const collections = {
  releases,
};
