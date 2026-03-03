package sync

import (
	"fmt"
	"os"
	"sort"
	"strings"

	"github.com/castrojo/firehose-go/internal/feeds"
	"github.com/castrojo/firehose-go/internal/models"
	"gopkg.in/yaml.v3"
)

// SyncResult describes what the sync run did
type SyncResult struct {
	Added   []SyncEntry `json:"added"`
	Removed []SyncEntry `json:"removed"`
	Total   int         `json:"total"`
	Changed bool        `json:"changed"`
}

// SyncEntry describes a single add/remove action
type SyncEntry struct {
	OrgRepo string `json:"orgRepo"`
	Name    string `json:"name"`
	Status  string `json:"status"`
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

	if !result.Changed {
		return result, nil
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

	if err := writeConfig(configPath, newFeeds); err != nil {
		return nil, fmt.Errorf("write config: %w", err)
	}

	return result, nil
}

// writeConfig writes the updated feed list back to feeds.yaml.
func writeConfig(path string, feedSources []models.FeedSource) error {
	config := models.FeedConfig{Feeds: feedSources}

	header := fmt.Sprintf(
		"# Feed Configuration for The Firehose (Go)\n"+
			"# Managed by landscape-sync workflow — do not edit feed URLs manually\n"+
			"# Source of truth: https://landscape.cncf.io\n"+
			"# Total: %d feeds\n\n",
		len(feedSources),
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
