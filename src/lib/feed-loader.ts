import type { Loader } from 'astro/loaders';
import Parser from 'rss-parser';
import { fetchLandscapeData, matchFeedToProject } from './landscape';
import { FeedEntrySchema, type FeedEntry, type FeedSource } from './schemas';

/**
 * Custom Astro Content Loader for RSS/Atom feeds
 * Fetches feeds, parses them, enriches with CNCF landscape data
 */
export function feedLoader(sources: FeedSource[]): Loader {
  return {
    name: 'feed-loader',
    load: async ({ store, logger }) => {
      logger.info(`Starting feed load for ${sources.length} sources`);
      
      // Clear existing entries
      store.clear();
      
      // Fetch landscape data once
      logger.info('Fetching CNCF landscape data...');
      const landscapeData = await fetchLandscapeData();
      
      // Parse RSS/Atom feeds
      const parser = new Parser({
        customFields: {
          item: ['content:encoded'],
        },
      });
      
      // For Phase 1: Process only first feed as proof of concept
      const source = sources[0];
      if (!source) {
        logger.warn('No sources configured');
        return;
      }
      
      logger.info(`Fetching feed: ${source.url}`);
      
      try {
        const feed = await parser.parseURL(source.url);
        logger.info(`Parsed ${feed.items.length} items from ${feed.title || 'unknown'}`);
        
        // Match feed to project
        const project = matchFeedToProject(source.url, landscapeData);
        
        if (project) {
          logger.info(`Matched to project: ${project.name} (${project.project || 'unknown'})`);
        }
        
        // Process each item
        for (const item of feed.items) {
          // Build entry object
          const entry: Partial<FeedEntry> = {
            title: item.title || '',
            link: item.link || '',
            pubDate: item.pubDate,
            content: item['content:encoded'] || item.content,
            contentSnippet: item.contentSnippet,
            guid: item.guid,
            isoDate: item.isoDate,
            feedUrl: source.url,
            feedTitle: feed.title,
          };
          
          // Enrich with project data if matched
          if (project) {
            entry.projectName = project.name;
            entry.projectDescription = project.description;
            entry.projectStatus = project.project;
            entry.projectHomepage = project.homepage_url;
          }
          
          // Validate with Zod
          const validated = FeedEntrySchema.safeParse(entry);
          if (validated.success) {
            // Generate unique ID for this entry
            const id = validated.data.guid || validated.data.link;
            
            // Store entry
            store.set({
              id,
              data: validated.data,
            });
          } else {
            logger.warn(`Invalid entry: ${item.title || 'unknown'} - ${validated.error.errors[0]?.message}`);
          }
        }
        
        logger.info(`Successfully loaded ${feed.items.length} entries`);
      } catch (error) {
        logger.error(`Error loading feed ${source.url}: ${error}`);
      }
    },
  };
}
