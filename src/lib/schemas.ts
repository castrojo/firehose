/**
 * FeedEntry — shape of a single release or blog post entry as produced
 * by the Go pipeline and written to src/data/releases.json.
 *
 * Fields are enriched by the CNCF Landscape integration in
 * firehose-go/internal/landscape/landscape.go.
 */
export interface FeedEntry {
  id: string;
  title: string;
  link: string;
  pubDate: string;
  content: string;
  guid: string;

  // Landscape-enriched fields (may be undefined for unmatched feeds)
  projectName?: string;
  projectDescription?: string;
  projectStatus?: 'graduated' | 'incubating' | 'sandbox';
  projectHomepage?: string;

  // Feed metadata
  feedUrl?: string;
  feedTitle?: string;
  feedStatus?: string;
  contentSnippet?: string;
  fetchedAt?: string;
}
