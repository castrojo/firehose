import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { marked } from 'marked';

export const GET: APIRoute = async ({ site }) => {
  const releases = await getCollection('releases');
  
  // Filter out errors and sort by date (newest first)
  const validReleases = releases
    .filter(r => r.data.feedStatus !== 'error')
    .sort((a, b) => {
      const dateA = a.data.isoDate ? new Date(a.data.isoDate).getTime() : 0;
      const dateB = b.data.isoDate ? new Date(b.data.isoDate).getTime() : 0;
      return dateB - dateA;
    })
    .slice(0, 100); // Limit to 100 most recent releases

  const siteUrl = site?.toString() || 'https://castrojo.github.io/firehose/';
  const feedUrl = `${siteUrl}feed.xml`;
  const buildDate = new Date().toUTCString();

  // Generate RSS 2.0 feed
  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>The Firehose - CNCF Project Releases</title>
    <description>Aggregated release feed from ${releases.length} CNCF projects. Stay updated with the latest releases from the cloud native ecosystem.</description>
    <link>${siteUrl}</link>
    <atom:link href="${feedUrl}" rel="self" type="application/rss+xml" />
    <language>en-us</language>
    <lastBuildDate>${buildDate}</lastBuildDate>
    <generator>Astro</generator>
${validReleases.map(release => {
  const title = `${release.data.projectName || release.data.feedTitle} ${release.data.title}`;
  const link = release.data.link;
  const pubDate = release.data.isoDate ? new Date(release.data.isoDate).toUTCString() : buildDate;
  const guid = release.data.link;
  const status = release.data.projectStatus || 'unknown';
  const projectName = release.data.projectName || release.data.feedTitle || 'Unknown Project';
  
  // Convert markdown content to HTML
  let description = release.data.contentSnippet || '';
  if (release.data.content) {
    try {
      description = marked.parse(release.data.content, { async: false }) as string;
    } catch (e) {
      description = release.data.content || release.data.contentSnippet || '';
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
