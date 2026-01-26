import type { Loader } from 'astro/loaders';
import Parser from 'rss-parser';
import { fetchLandscapeData, matchFeedToProject } from './landscape';
import { FeedEntrySchema, type FeedEntry, type FeedSource } from './schemas';
import { createFailedFeedEntry, addFetchMetadata } from '../utils/feed-status';
import { retryWithBackoff } from '../utils/retry';

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
      const failedFeeds: Array<{ url: string; error: string; project?: string }> = [];
      
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
          
          // Track failed feed for summary
          failedFeeds.push({
            url: feedUrl,
            error: error.message,
            project: projectName,
          });
          
          errorCount++;
          logger.error(`${feedUrl}: ${error.message}`);
        }
      }
      
      // Log detailed summary
      logger.info('─'.repeat(80));
      logger.info(`📊 Feed Load Summary:`);
      logger.info(`   ✅ Success: ${successCount}/${sources.length} feeds (${((successCount/sources.length)*100).toFixed(1)}%)`);
      logger.info(`   ❌ Failed:  ${errorCount}/${sources.length} feeds (${((errorCount/sources.length)*100).toFixed(1)}%)`);
      logger.info(`   📝 Entries: ${totalEntries} total`);
      logger.info(`   ⏱️  Duration: ${fetchDuration}s`);
      
      if (failedFeeds.length > 0) {
        logger.info(`\n❌ Failed Feeds:`);
        for (const failed of failedFeeds) {
          logger.info(`   • ${failed.project || failed.url}: ${failed.error}`);
        }
      }
      
      logger.info('─'.repeat(80));
      
      // Warn if too many failures
      const failureRate = errorCount / sources.length;
      if (failureRate > 0.5) {
        logger.warn(`⚠️  High failure rate: ${(failureRate * 100).toFixed(1)}% of feeds failed`);
      }
      
      // Fail build if catastrophic failure (>50% of feeds failed)
      if (failureRate > 0.5) {
        throw new Error(
          `Build failed: ${errorCount}/${sources.length} feeds failed (${(failureRate * 100).toFixed(1)}%). ` +
          `This exceeds the 50% threshold for graceful degradation.`
        );
      }
      
      // Success! Build continues with partial data if <50% failed
      if (errorCount > 0 && errorCount <= sources.length * 0.5) {
        logger.info(`✅ Build succeeds with partial data (${successCount}/${sources.length} feeds loaded)`);
      }
    },
  };
}

/**
 * Fetch a single feed and return its entries
 * Includes automatic retry with exponential backoff for transient errors
 */
async function fetchSingleFeed(
  source: FeedSource,
  parser: Parser,
  landscapeData: any,
  logger: any,
): Promise<{ entries: Partial<FeedEntry>[]; feedUrl: string }> {
  try {
    // Parse the feed with retry logic
    const feed = await retryWithBackoff(
      () => parser.parseURL(source.url),
      {
        maxAttempts: 3,
        initialDelay: 1000,
        maxDelay: 10000,
        backoffMultiplier: 2,
      },
      source.url
    );
    
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
