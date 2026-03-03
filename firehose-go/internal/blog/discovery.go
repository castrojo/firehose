// Package blog provides RSS/Atom feed discovery for CNCF project blog pages.
package blog

import (
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/mmcdole/gofeed"
	"golang.org/x/net/html"
)

var httpClient = &http.Client{
	Timeout: 5 * time.Second,
	CheckRedirect: func(req *http.Request, via []*http.Request) error {
		if len(via) >= 5 {
			return fmt.Errorf("too many redirects")
		}
		return nil
	},
}

var suffixCandidates = []string{
	"/feed", "/feed.xml", "/rss.xml", "/atom.xml", "/rss",
	"/blog/feed", "/blog/rss.xml", "/blog/atom.xml", "/feed/",
}

// DiscoverFeedURL finds an RSS/Atom feed URL for a blog page. Returns "" on failure.
func DiscoverFeedURL(blogURL string) string {
	blogURL = strings.TrimRight(blogURL, "/")

	if feedURL := tryMedium(blogURL); feedURL != "" {
		return feedURL
	}
	for _, suffix := range suffixCandidates {
		candidate := blogURL + suffix
		if isValidFeed(candidate) {
			log.Printf("  blog discovery: %s -> %s", blogURL, candidate)
			return candidate
		}
	}
	if feedURL := discoverFromHTML(blogURL); feedURL != "" {
		log.Printf("  blog discovery: %s -> %s (html link)", blogURL, feedURL)
		return feedURL
	}
	log.Printf("  blog discovery: no feed found for %s", blogURL)
	return ""
}

func tryMedium(blogURL string) string {
	u, err := url.Parse(blogURL)
	if err != nil || !strings.Contains(u.Host, "medium.com") {
		return ""
	}
	path := strings.TrimLeft(u.Path, "/")
	if path == "" {
		return ""
	}
	candidate := fmt.Sprintf("https://medium.com/feed/%s", path)
	if isValidFeed(candidate) {
		return candidate
	}
	return ""
}

func discoverFromHTML(blogURL string) string {
	resp, err := httpClient.Get(blogURL)
	if err != nil || resp.StatusCode != http.StatusOK {
		if resp != nil {
			resp.Body.Close()
		}
		return ""
	}
	defer resp.Body.Close()
	body, err := io.ReadAll(io.LimitReader(resp.Body, 512*1024))
	if err != nil {
		return ""
	}
	return extractFeedLink(blogURL, string(body))
}

func extractFeedLink(baseURL, htmlContent string) string {
	doc, err := html.Parse(strings.NewReader(htmlContent))
	if err != nil {
		return ""
	}
	base, _ := url.Parse(baseURL)
	var feedURL string
	var traverse func(*html.Node)
	traverse = func(n *html.Node) {
		if feedURL != "" {
			return
		}
		if n.Type == html.ElementNode && n.Data == "link" {
			var rel, typ, href string
			for _, attr := range n.Attr {
				switch attr.Key {
				case "rel":
					rel = attr.Val
				case "type":
					typ = attr.Val
				case "href":
					href = attr.Val
				}
			}
			if rel == "alternate" &&
				(typ == "application/rss+xml" || typ == "application/atom+xml") &&
				href != "" {
				u, err := url.Parse(href)
				if err == nil {
					resolved := base.ResolveReference(u).String()
					if isValidFeed(resolved) {
						feedURL = resolved
						return
					}
				}
			}
		}
		for c := n.FirstChild; c != nil; c = c.NextSibling {
			traverse(c)
		}
	}
	traverse(doc)
	return feedURL
}

func isValidFeed(feedURL string) bool {
	fp := gofeed.NewParser()
	fp.Client = httpClient
	feed, err := fp.ParseURL(feedURL)
	return err == nil && feed != nil && len(feed.Items) > 0
}
