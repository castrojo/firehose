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
	var landscape struct {
		Landscape []struct {
			Name       string `yaml:"name"`
			Categories []struct {
				Name          string `yaml:"name"`
				Subcategories []struct {
					Name  string `yaml:"name"`
					Items []struct {
						Name           string `yaml:"name"`
						Homepage       string `yaml:"homepage_url"`
						Repo           string `yaml:"repo_url"`
						Project        string `yaml:"project"` // graduated, incubating, sandbox
						SummaryUseCase string `yaml:"summary_use_case"`
						Description    string `yaml:"description"`
					} `yaml:"items"`
				} `yaml:"subcategories"`
			} `yaml:"categories"`
		} `yaml:"landscape"`
	}

	if err := yaml.Unmarshal(data, &landscape); err != nil {
		return nil, fmt.Errorf("parse YAML: %w", err)
	}

	// Build map keyed by org/repo
	projectMap := make(map[string]models.LandscapeProject)

	for _, section := range landscape.Landscape {
		for _, category := range section.Categories {
			for _, subcategory := range category.Subcategories {
				for _, item := range subcategory.Items {
					if item.Repo == "" {
						continue
					}

					// Extract org/repo from GitHub URL
					// Example: https://github.com/kubernetes/kubernetes → kubernetes/kubernetes
					slug := extractOrgRepo(item.Repo)
					if slug == "" {
						continue
					}

					description := item.Description
					if description == "" {
						description = item.SummaryUseCase
					}

					projectMap[slug] = models.LandscapeProject{
						Name:        item.Name,
						Description: description,
						RepoURL:     item.Repo,
						HomepageURL: item.Homepage,
						Status:      item.Project,
					}
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
