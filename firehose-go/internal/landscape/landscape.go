package landscape

import (
	"fmt"
	"io"
	"net/http"

	"github.com/castrojo/firehose-go/internal/models"
	"gopkg.in/yaml.v3"
)

const landscapeURL = "https://raw.githubusercontent.com/cncf/landscape/master/landscape.yml"

// FetchAndParse fetches and parses the CNCF Landscape
func FetchAndParse() (map[string]models.LandscapeProject, error) {
	// Fetch landscape.yml
	resp, err := http.Get(landscapeURL)
	if err != nil {
		return nil, fmt.Errorf("fetch landscape: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("fetch landscape: HTTP %d", resp.StatusCode)
	}

	// Read response body
	data, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("read landscape: %w", err)
	}

	// Parse YAML
	return parseLandscapeYAML(data)
}

// parseLandscapeYAML parses landscape.yml and builds org/repo → project map
func parseLandscapeYAML(data []byte) (map[string]models.LandscapeProject, error) {
	var doc struct {
		Landscape []map[string]interface{} `yaml:"landscape"`
	}

	if err := yaml.Unmarshal(data, &doc); err != nil {
		return nil, fmt.Errorf("parse YAML: %w", err)
	}

	// Build map keyed by org/repo
	projectMap := make(map[string]models.LandscapeProject)

	for _, categoryMap := range doc.Landscape {
		// Parse subcategories array
		subcategories, ok := categoryMap["subcategories"].([]interface{})
		if !ok {
			continue
		}

		for _, subInterface := range subcategories {
			subMap, ok := subInterface.(map[string]interface{})
			if !ok {
				continue
			}

			// Parse items array
			items, ok := subMap["items"].([]interface{})
			if !ok {
				continue
			}

			for _, itemInterface := range items {
				itemMap, ok := itemInterface.(map[string]interface{})
				if !ok {
					continue
				}

				// Extract fields
				name, _ := itemMap["name"].(string)
				repoURL, _ := itemMap["repo_url"].(string)
				homepageURL, _ := itemMap["homepage_url"].(string)
				project, _ := itemMap["project"].(string)
				description, _ := itemMap["description"].(string)

				if repoURL == "" {
					continue
				}

				// Extract org/repo from GitHub URL
				slug := extractOrgRepo(repoURL)
				if slug == "" {
					continue
				}

				// Get description from extra.summary_use_case if not present
				if description == "" {
					if extra, ok := itemMap["extra"].(map[string]interface{}); ok {
						if summaryUseCase, ok := extra["summary_use_case"].(string); ok {
							description = summaryUseCase
						} else if summaryBusinessUseCase, ok := extra["summary_business_use_case"].(string); ok {
							description = summaryBusinessUseCase
						}
					}
				}

				projectMap[slug] = models.LandscapeProject{
					Name:        name,
					Description: description,
					RepoURL:     repoURL,
					HomepageURL: homepageURL,
					Status:      project,
				}
			}
		}
	}

	return projectMap, nil
}

// extractOrgRepo extracts org/repo from GitHub URL
// Example: https://github.com/kubernetes/kubernetes → kubernetes/kubernetes
func extractOrgRepo(repoURL string) string {
	// Simple extraction: find "github.com/" and take next two path segments
	const githubPrefix = "github.com/"
	idx := -1

	// Find github.com in URL (handles both http and https)
	for i := range repoURL {
		if i+len(githubPrefix) <= len(repoURL) && repoURL[i:i+len(githubPrefix)] == githubPrefix {
			idx = i + len(githubPrefix)
			break
		}
	}

	if idx == -1 {
		return ""
	}

	// Extract org/repo (everything after github.com/)
	remainder := repoURL[idx:]

	// Find first and second slash
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

	if firstSlash == -1 {
		return ""
	}

	// If no second slash, return everything (e.g., "kubernetes/kubernetes")
	if secondSlash == -1 {
		return remainder
	}

	// Return org/repo (e.g., "kubernetes/kubernetes" from "kubernetes/kubernetes/releases")
	return remainder[:secondSlash]
}
