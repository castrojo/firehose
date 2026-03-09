import type { APIRoute } from 'astro';
import { marked } from 'marked';
import releasesData from '../data/releases.json';

export const GET: APIRoute = async ({ site }) => {
  // Transform JSON news items to match expected format
  const newsItems = ((releasesData as any).news as any[]).map((r: any) => ({
    data: {
      title: r.title,
      link: r.link,
      isoDate: r.pubDate,
      content: r.content || '',
      contentSnippet: r.contentSnippet || (r.content ? r.content.substring(0, 200) : ''),
      projectName: r.projectName || '',
      projectStatus: r.projectStatus,
      feedTitle: r.feedTitle || '',
      feedStatus: r.feedStatus,
    }
  }));

  // Filter out errors and sort by date (newest first)
  const validNews = newsItems
    .filter(r => r.data.feedStatus !== 'error')
    .sort((a, b) => {
      const dateA = a.data.isoDate ? new Date(a.data.isoDate).getTime() : 0;
      const dateB = b.data.isoDate ? new Date(b.data.isoDate).getTime() : 0;
      return dateB - dateA;
    })
    .slice(0, 100); // Limit to 100 most recent posts

  // Build site URL from Astro config (site + base)
  const baseUrl = (import.meta.env.BASE_URL as string).replace(/\/*$/, '/');
  const siteOrigin = site?.toString().replace(/\/$/, '') || 'http://localhost:4321';
  const siteUrl = `${siteOrigin}${baseUrl}`;
  const feedUrl = `${siteUrl}news.xml`;
  const buildDate = new Date().toUTCString();

  // Generate RSS 2.0 feed
  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>CNCF Project News</title>
    <description>Aggregated blog posts from CNCF projects. Stay updated with the latest news from the cloud native ecosystem.</description>
    <link>${siteUrl}news/</link>
    <atom:link href="${feedUrl}" rel="self" type="application/rss+xml" />
    <language>en-us</language>
    <lastBuildDate>${buildDate}</lastBuildDate>
    <generator>Astro</generator>
${validNews.map(item => {
  const title = `${item.data.projectName || item.data.feedTitle} — ${item.data.title}`;
  const link = item.data.link;
  const pubDate = item.data.isoDate ? new Date(item.data.isoDate).toUTCString() : buildDate;
  const guid = item.data.link;
  const status = item.data.projectStatus || 'unknown';
  const projectName = item.data.projectName || item.data.feedTitle || 'Unknown Project';

  // Convert markdown content to HTML
  let description = item.data.contentSnippet || '';
  if (item.data.content) {
    try {
      description = marked.parse(item.data.content, { async: false }) as string;
    } catch (e) {
      description = item.data.content || item.data.contentSnippet || '';
    }
  }

  // Escape XML special characters
  const escapeXml = (str: string) => {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  };

  return `    <item>
      <title>${escapeXml(title)}</title>
      <link>${escapeXml(link)}</link>
      <guid isPermaLink="true">${escapeXml(guid)}</guid>
      <pubDate>${pubDate}</pubDate>
      <category>${escapeXml(projectName)}</category>
      <category>${escapeXml(status)}</category>
      <description><![CDATA[
        <p><strong>Project:</strong> ${escapeXml(projectName)}</p>
        <p><strong>Status:</strong> ${escapeXml(status)}</p>
        ${description}
      ]]></description>
    </item>`;
}).join('\n')}
  </channel>
</rss>`;

  return new Response(rss, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
    },
  });
};
