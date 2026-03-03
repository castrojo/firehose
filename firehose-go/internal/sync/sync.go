package sync

import (
	"fmt"
	"os"
	"sort"
	"strings"
	gosync "sync"

	"github.com/castrojo/firehose-go/internal/blog"
	"github.com/castrojo/firehose-go/internal/feeds"
	"github.com/castrojo/firehose-go/internal/models"
	"gopkg.in/yaml.v3"
)

// SyncResult describes what the sync run did
type SyncResult struct {
	Added                []SyncEntry     `json:"added"`
	Removed              []SyncEntry     `json:"removed"`
	Total                int             `json:"total"`
	Changed              bool            `json:"changed"`
	BlogsAdded           []BlogSyncEntry `json:"blogsAdded"`
	BlogsRemoved         []BlogSyncEntry `json:"blogsRemoved"`
	BlogsDiscoveryFailed []BlogSyncEntry `json:"blogsDiscoveryFailed"`
	BlogsTotal           int             `json:"blogsTotal"`
}

// SyncEntry describes a single add/remove action for release feeds
type SyncEntry struct {
	OrgRepo string `json:"orgRepo"`
	Name    string `json:"name"`
	Status  string `json:"status"`
	FeedURL string `json:"feedUrl"`
}

// BlogSyncEntry describes a single add/remove action for blog feeds
type BlogSyncEntry struct {
	OrgRepo string `json:"orgRepo"`
	Name    string `json:"name"`
	Status  string `json:"status"`
	BlogURL string `json:"blogUrl"`
	FeedURL string `json:"feedUrl"`
}

// Run performs the landscape sync against feeds.yaml.
// It reads configPath, diffs it against landscapeData, and writes the result back.
func Run(configPath string, landscapeData map[string]models.LandscapeProject) (*SyncResult, error) {
	config, err := feeds.LoadConfig(configPath)
	if err != nil {
		return nil, fmt.Errorf("load config: %w", err)
	}

	// Build set of org/repo slugs currently tracked in feeds.yaml
	existing := make(map[string]bool)
	for _, f := range config.Feeds {
		slug := extractOrgRepo(f.URL)
		if slug != "" {
			existing[slug] = true
		}
	}

	// Build set of CNCF projects from landscape (only those with a project status)
	landscapeSet := make(map[string]models.LandscapeProject)
	for slug, proj := range landscapeData {
		if proj.Status == "graduated" || proj.Status == "incubating" || proj.Status == "sandbox" {
			landscapeSet[slug] = proj
		}
	}

	// Compute additions: in landscape but not in feeds.yaml
	var added []SyncEntry
	for slug, proj := range landscapeSet {
		if !existing[slug] {
			feedURL := "https://github.com/" + slug + "/releases.atom"
			added = append(added, SyncEntry{
				OrgRepo: slug,
				Name:    proj.Name,
				Status:  proj.Status,
				FeedURL: feedURL,
			})
		}
	}

	// Compute removals: in feeds.yaml but not in landscape as a CNCF project
	var removed []SyncEntry
	for _, f := range config.Feeds {
		slug := extractOrgRepo(f.URL)
		if slug == "" {
			continue
		}
		if _, inLandscape := landscapeSet[slug]; !inLandscape {
			proj := landscapeData[slug] // may be zero value if fully removed from landscape
			removed = append(removed, SyncEntry{
				OrgRepo: slug,
				Name:    proj.Name,
				Status:  proj.Status,
				FeedURL: f.URL,
			})
		}
	}

	// Sort for deterministic output and diffs
	sort.Slice(added, func(i, j int) bool { return added[i].OrgRepo < added[j].OrgRepo })
	sort.Slice(removed, func(i, j int) bool { return removed[i].OrgRepo < removed[j].OrgRepo })

	result := &SyncResult{
		Added:   added,
		Removed: removed,
		Changed: len(added) > 0 || len(removed) > 0,
		Total:   len(config.Feeds),
	}

	// Build removal set for filtering
	removeSet := make(map[string]bool)
	for _, r := range removed {
		removeSet[r.OrgRepo] = true
	}

	// Rebuild feed list: keep existing (minus removed), append added
	var newFeeds []models.FeedSource
	for _, f := range config.Feeds {
		slug := extractOrgRepo(f.URL)
		if !removeSet[slug] {
			newFeeds = append(newFeeds, f)
		}
	}
	for _, a := range added {
		newFeeds = append(newFeeds, models.FeedSource{
			URL:      a.FeedURL,
			Category: a.Status, // required by validator; landscape is authoritative at runtime
		})
	}

	result.Total = len(newFeeds)

	// Blog sync runs before early-return so it always fires.
	result.BlogsAdded, result.BlogsRemoved, result.BlogsDiscoveryFailed = syncBlogs(config, landscapeData)
	result.BlogsTotal = len(config.Blogs) + len(result.BlogsAdded) - len(result.BlogsRemoved)
	if len(result.BlogsAdded) > 0 || len(result.BlogsRemoved) > 0 {
		result.Changed = true
	}

	if !result.Changed {
		return result, nil
	}

	// Rebuild blog list: retain existing minus removals, then append additions.
	// Key removeBlogSet by project name (r.Name) — that is what b.Project stores.
	var newBlogs []models.BlogSource
	removeBlogSet := make(map[string]bool)
	for _, r := range result.BlogsRemoved {
		removeBlogSet[r.Name] = true
	}
	for _, b := range config.Blogs {
		if !removeBlogSet[b.Project] {
			newBlogs = append(newBlogs, b)
		}
	}
	for _, a := range result.BlogsAdded {
		newBlogs = append(newBlogs, models.BlogSource{
			URL:      a.FeedURL,
			Category: a.Status,
			Project:  a.Name,
			BlogURL:  a.BlogURL,
		})
	}

	if err := writeConfig(configPath, newFeeds, newBlogs); err != nil {
		return nil, fmt.Errorf("write config: %w", err)
	}

	return result, nil
}

func syncBlogs(
	config *models.FeedConfig,
	landscapeData map[string]models.LandscapeProject,
) (added, removed, failed []BlogSyncEntry) {
	existing := make(map[string]models.BlogSource)
	for _, b := range config.Blogs {
		existing[b.Project] = b
	}

	type blogCandidate struct {
		orgRepo string
		proj    models.LandscapeProject
	}
	var candidates []blogCandidate
	for slug, proj := range landscapeData {
		if proj.BlogURL == "" {
			continue
		}
		if proj.Status != "graduated" && proj.Status != "incubating" && proj.Status != "sandbox" {
			continue
		}
		if _, tracked := existing[proj.Name]; tracked {
			continue
		}
		candidates = append(candidates, blogCandidate{orgRepo: slug, proj: proj})
	}

	type discoveryResult struct {
		candidate blogCandidate
		feedURL   string
	}
	resultCh := make(chan discoveryResult, len(candidates))
	var wg gosync.WaitGroup
	sem := make(chan struct{}, 10)

	for _, c := range candidates {
		wg.Add(1)
		go func(cand blogCandidate) {
			defer wg.Done()
			sem <- struct{}{}
			defer func() { <-sem }()
			resultCh <- discoveryResult{candidate: cand, feedURL: blog.DiscoverFeedURL(cand.proj.BlogURL)}
		}(c)
	}
	go func() { wg.Wait(); close(resultCh) }()

	for res := range resultCh {
		entry := BlogSyncEntry{
			OrgRepo: res.candidate.orgRepo,
			Name:    res.candidate.proj.Name,
			Status:  res.candidate.proj.Status,
			BlogURL: res.candidate.proj.BlogURL,
			FeedURL: res.feedURL,
		}
		if res.feedURL != "" {
			added = append(added, entry)
		} else {
			failed = append(failed, entry)
		}
	}

	// Removals: tracked blogs whose project no longer has blog_url or CNCF status.
	landscapeByName := make(map[string]models.LandscapeProject)
	for _, proj := range landscapeData {
		landscapeByName[proj.Name] = proj
	}
	for _, b := range config.Blogs {
		proj, exists := landscapeByName[b.Project]
		if !exists || proj.BlogURL == "" ||
			(proj.Status != "graduated" && proj.Status != "incubating" && proj.Status != "sandbox") {
			removed = append(removed, BlogSyncEntry{
				Name:    b.Project,
				Status:  b.Category,
				BlogURL: b.BlogURL,
				FeedURL: b.URL,
			})
		}
	}

	sort.Slice(added, func(i, j int) bool { return added[i].Name < added[j].Name })
	sort.Slice(removed, func(i, j int) bool { return removed[i].Name < removed[j].Name })
	sort.Slice(failed, func(i, j int) bool { return failed[i].Name < failed[j].Name })
	return
}

// writeConfig writes the updated feed and blog lists back to feeds.yaml.
func writeConfig(path string, feedSources []models.FeedSource, blogSources []models.BlogSource) error {
	config := models.FeedConfig{
		Feeds: feedSources,
		Blogs: blogSources,
	}
	header := fmt.Sprintf(
		"# Feed Configuration for The Firehose (Go)\n"+
			"# Managed by landscape-sync workflow — do not edit feed URLs manually\n"+
			"# Source of truth: https://landscape.cncf.io\n"+
			"# Total: %d release feeds, %d blog feeds\n\n",
		len(feedSources), len(blogSources),
	)
	data, err := yaml.Marshal(config)
	if err != nil {
		return fmt.Errorf("marshal YAML: %w", err)
	}
	return os.WriteFile(path, append([]byte(header), data...), 0644)
}

// extractOrgRepo extracts org/repo from a GitHub feed URL or repo URL.
// Examples:
//
//	https://github.com/kubernetes/kubernetes/releases.atom → kubernetes/kubernetes
//	https://github.com/kubernetes/kubernetes              → kubernetes/kubernetes
//
// Note: this duplicates logic from feeds.go and landscape.go to avoid circular imports.
// TODO: extract to a shared internal/util package.
func extractOrgRepo(url string) string {
	const prefix = "github.com/"
	idx := strings.Index(url, prefix)
	if idx == -1 {
		return ""
	}
	remainder := url[idx+len(prefix):]

	// Strip anything after /releases
	if i := strings.Index(remainder, "/releases"); i != -1 {
		remainder = remainder[:i]
	}

	// Take only the first two path segments (org/repo)
	parts := strings.SplitN(remainder, "/", 3)
	if len(parts) < 2 {
		return remainder
	}
	return parts[0] + "/" + parts[1]
}
