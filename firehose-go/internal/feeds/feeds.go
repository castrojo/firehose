package feeds

import (
	"fmt"
	"log"
	"os"
	"sort"
	"sync"
	"time"

	"github.com/castrojo/firehose-go/internal/models"
	gofeed "github.com/mmcdole/gofeed"
	"gopkg.in/yaml.v3"
)

// LoadConfig loads feed configuration from YAML
func LoadConfig(path string) (*models.FeedConfig, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf("read config: %w", err)
	}

	var config models.FeedConfig
	if err := yaml.Unmarshal(data, &config); err != nil {
		return nil, fmt.Errorf("parse YAML: %w", err)
	}

	return &config, nil
}

// FetchAllFeeds fetches all feeds in parallel and enriches with landscape data
func FetchAllFeeds(sources []models.FeedSource, landscapeData map[string]models.LandscapeProject) *models.FetchResults {
	var (
		wg            sync.WaitGroup
		mu            sync.Mutex
		allReleases   []models.Release
		allFeedStatus []models.FeedStatus
	)

	// Fetch feeds in parallel
	for _, source := range sources {
		wg.Add(1)
		go func(src models.FeedSource) {
			defer wg.Done()

			feedStart := time.Now()
			releases, status := fetchSingleFeed(src, landscapeData)
			duration := time.Since(feedStart)

			status.Duration = duration.String()

			mu.Lock()
			allReleases = append(allReleases, releases...)
			allFeedStatus = append(allFeedStatus, status)
			mu.Unlock()
		}(source)
	}

	wg.Wait()

	// Sort releases by pubDate descending (newest first)
	sort.Slice(allReleases, func(i, j int) bool {
		return allReleases[i].PubDate.After(allReleases[j].PubDate)
	})

	return &models.FetchResults{
		Releases: allReleases,
		Feeds:    allFeedStatus,
	}
}

// fetchSingleFeed fetches a single feed and enriches entries
func fetchSingleFeed(source models.FeedSource, landscapeData map[string]models.LandscapeProject) ([]models.Release, models.FeedStatus) {
	fetchedAt := time.Now().UTC()

	// Parse feed
	fp := gofeed.NewParser()
	feed, err := fp.ParseURL(source.URL)
	if err != nil {
		log.Printf("❌ Failed to fetch %s: %v", source.URL, err)
		return nil, models.FeedStatus{
			FeedURL:   source.URL,
			Status:    "error",
			Error:     err.Error(),
			ErrorType: classifyError(err),
			FetchedAt: fetchedAt.Format(time.RFC3339),
		}
	}

	// Extract org/repo from feed URL for landscape lookup
	orgRepo := extractOrgRepoFromFeedURL(source.URL)
	landscapeProject, hasLandscape := landscapeData[orgRepo]

	// Convert feed items to releases
	var releases []models.Release
	for _, item := range feed.Items {
		// Determine ID (prefer GUID, fallback to link)
		id := item.GUID
		if id == "" {
			id = item.Link
		}

		// Parse pubDate
		pubDate := time.Now()
		if item.PublishedParsed != nil {
			pubDate = *item.PublishedParsed
		}

		// Create release entry
		release := models.Release{
			ID:             id,
			Title:          item.Title,
			Link:           item.Link,
			PubDate:        pubDate,
			Content:        item.Content,
			ContentSnippet: item.Description,
			GUID:           item.GUID,
			FeedURL:        source.URL,
			FeedTitle:      feed.Title,
			FeedStatus:     "success",
			FetchedAt:      fetchedAt,
		}

		// Enrich with landscape metadata if available
		if hasLandscape {
			release.ProjectName = landscapeProject.Name
			release.ProjectDescription = landscapeProject.Description
			release.ProjectStatus = landscapeProject.Status
			release.ProjectHomepage = landscapeProject.HomepageURL
		}

		releases = append(releases, release)
	}

	log.Printf("✅ Fetched %s: %d releases", source.URL, len(releases))

	return releases, models.FeedStatus{
		FeedURL:      source.URL,
		Status:       "success",
		EntriesCount: len(releases),
		FetchedAt:    fetchedAt.Format(time.RFC3339),
	}
}

// extractOrgRepoFromFeedURL extracts org/repo from GitHub releases feed URL
// Example: https://github.com/kubernetes/kubernetes/releases.atom → kubernetes/kubernetes
func extractOrgRepoFromFeedURL(feedURL string) string {
	const githubPrefix = "github.com/"
	idx := -1

	// Find github.com in URL
	for i := range feedURL {
		if i+len(githubPrefix) <= len(feedURL) && feedURL[i:i+len(githubPrefix)] == githubPrefix {
			idx = i + len(githubPrefix)
			break
		}
	}

	if idx == -1 {
		return ""
	}

	// Extract org/repo (before "/releases")
	remainder := feedURL[idx:]

	// Find "/releases" marker
	const releasesMarker = "/releases"
	releaseIdx := -1
	for i := range remainder {
		if i+len(releasesMarker) <= len(remainder) && remainder[i:i+len(releasesMarker)] == releasesMarker {
			releaseIdx = i
			break
		}
	}

	if releaseIdx == -1 {
		// No /releases marker, try to extract first two path segments
		firstSlash := -1
		secondSlash := -1
		for i, c := range remainder {
			if c == '/' {
				if firstSlash == -1 {
					firstSlash = i
				} else if secondSlash == -1 {
					secondSlash = i
					break
				}
			}
		}
		if secondSlash != -1 {
			return remainder[:secondSlash]
		}
		return remainder
	}

	return remainder[:releaseIdx]
}

// classifyError classifies fetch errors
func classifyError(err error) string {
	// Simple classification (can be improved with error wrapping)
	errStr := err.Error()

	if contains(errStr, "timeout") || contains(errStr, "deadline exceeded") {
		return "timeout"
	}
	if contains(errStr, "404") || contains(errStr, "403") || contains(errStr, "500") {
		return "network"
	}
	if contains(errStr, "parse") || contains(errStr, "XML") || contains(errStr, "invalid") {
		return "parse"
	}

	return "network" // Default to network error
}

// contains checks if string contains substring (case-insensitive)
func contains(s, substr string) bool {
	for i := range s {
		if i+len(substr) <= len(s) {
			match := true
			for j := range substr {
				// Simple case-insensitive check
				c1 := s[i+j]
				c2 := substr[j]
				if c1 >= 'A' && c1 <= 'Z' {
					c1 = c1 + 32 // Convert to lowercase
				}
				if c2 >= 'A' && c2 <= 'Z' {
					c2 = c2 + 32
				}
				if c1 != c2 {
					match = false
					break
				}
			}
			if match {
				return true
			}
		}
	}
	return false
}
