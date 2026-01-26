import type { Loader } from 'astro/loaders';
import Parser from 'rss-parser';
import { fetchLandscapeData, matchFeedToProject } from './landscape';
import { FeedEntrySchema, type FeedEntry, type FeedSource } from './schemas';
import { createFailedFeedEntry, addFetchMetadata } from '../utils/feed-status';

/**
 * Custom Astro Content Loader for RSS/Atom feeds
 * Fetches feeds in parallel, parses them, enriches with CNCF landscape data
 */
export function feedLoader(sources: FeedSource[]): Loader {
  return {
    name: 'feed-loader',
    load: async ({ store, logger }) => {
      logger.info(`Starting feed load for ${sources.length} sources`);
      
      // Clear existing entries
      store.clear();
      
      // Fetch landscape data once (shared across all feeds)
      logger.info('Fetching CNCF landscape data...');
      const landscapeData = await fetchLandscapeData();
      
      // Initialize parser
      const parser = new Parser({
        customFields: {
          item: ['content:encoded'],
        },
      });
      
      // Fetch all feeds in parallel using Promise.allSettled
      logger.info('Fetching feeds in parallel...');
      const fetchStart = Date.now();
      
      const results = await Promise.allSettled(
        sources.map((source) =>
          fetchSingleFeed(source, parser, landscapeData, logger)
        )
      );
      
      const fetchDuration = ((Date.now() - fetchStart) / 1000).toFixed(2);
      logger.info(`Fetched all feeds in ${fetchDuration}s`);
      
      // Process results and store entries
      let successCount = 0;
      let errorCount = 0;
      let totalEntries = 0;
      
      for (const result of results) {
        if (result.status === 'fulfilled') {
          const { entries, feedUrl } = result.value;
          
          // Store all entries from this feed
          for (const entry of entries) {
            // Add fetch metadata
            const enrichedEntry = addFetchMetadata(entry);
            
            // Validate with Zod
            const validated = FeedEntrySchema.safeParse(enrichedEntry);
            if (validated.success) {
              // Generate unique ID for this entry
              const id = validated.data.guid || validated.data.link;
              
              // Store entry
              store.set({
                id,
                data: validated.data,
              });
              
              totalEntries++;
            } else {
              logger.warn(`Invalid entry from ${feedUrl}: ${validated.error.errors[0]?.message}`);
            }
          }
          
          successCount++;
        } else {
          // Feed fetch failed - store error entry
          const { feedUrl, error, projectName } = result.reason;
          
          const errorEntry = createFailedFeedEntry(feedUrl, error, projectName);
          const validated = FeedEntrySchema.safeParse(errorEntry);
          
          if (validated.success) {
            store.set({
              id: `error-${feedUrl}`,
              data: validated.data,
            });
          }
          
          errorCount++;
        }
      }
      
      // Log summary
      logger.info(`Load complete: ${successCount} succeeded, ${errorCount} failed, ${totalEntries} total entries`);
      
      // Warn if too many failures
      const failureRate = errorCount / sources.length;
      if (failureRate > 0.5) {
        logger.warn(`High failure rate: ${(failureRate * 100).toFixed(1)}% of feeds failed`);
      }
    },
  };
}

/**
 * Fetch a single feed and return its entries
 */
async function fetchSingleFeed(
  source: FeedSource,
  parser: Parser,
  landscapeData: any,
  logger: any,
): Promise<{ entries: Partial<FeedEntry>[]; feedUrl: string }> {
  try {
    // Parse the feed
    const feed = await parser.parseURL(source.url);
    
    // Match feed to project
    const project = matchFeedToProject(source.url, landscapeData);
    
    if (project) {
      logger.info(`${source.url}: Matched to ${project.name} (${project.project || 'unknown'})`);
    }
    
    // Process items
    const entries: Partial<FeedEntry>[] = [];
    
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
      
      entries.push(entry);
    }
    
    logger.info(`${source.url}: Loaded ${entries.length} entries`);
    
    return { entries, feedUrl: source.url };
  } catch (error) {
    // Throw error with context for Promise.allSettled
    throw {
      feedUrl: source.url,
      error: error instanceof Error ? error : new Error(String(error)),
      projectName: matchFeedToProject(source.url, landscapeData)?.name,
    };
  }
}
