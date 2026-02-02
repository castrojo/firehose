package models

import (
	"encoding/json"
	"fmt"
	"os"
	"time"
)

// OutputData represents the top-level JSON structure
type OutputData struct {
	Metadata Metadata     `json:"metadata"`
	Releases []Release    `json:"releases"`
	Feeds    []FeedStatus `json:"feeds"`
}

// Metadata contains build metadata and statistics
type Metadata struct {
	SchemaVersion string      `json:"schemaVersion"`
	GeneratedAt   string      `json:"generatedAt"`
	GeneratedBy   string      `json:"generatedBy"`
	BuildDuration string      `json:"buildDuration"`
	Stats         Stats       `json:"stats"`
	Performance   Performance `json:"performance"`
}

// Stats contains aggregate statistics
type Stats struct {
	FeedsTotal               int `json:"feedsTotal"`
	FeedsSuccessful          int `json:"feedsSuccessful"`
	FeedsFailed              int `json:"feedsFailed"`
	FeedsSkipped             int `json:"feedsSkipped"`
	ReleasesTotal            int `json:"releasesTotal"`
	LandscapeProjectsTotal   int `json:"landscapeProjectsTotal"`
	LandscapeProjectsMatched int `json:"landscapeProjectsMatched"`
}

// Performance contains timing breakdown
type Performance struct {
	LandscapeFetchDuration string `json:"landscapeFetchDuration"`
	FeedsFetchDuration     string `json:"feedsFetchDuration"`
	EnrichmentDuration     string `json:"enrichmentDuration"`
	ValidationDuration     string `json:"validationDuration"`
	OutputDuration         string `json:"outputDuration"`
}

// Release represents a single release entry
type Release struct {
	ID                 string    `json:"id" validate:"required"`
	Title              string    `json:"title" validate:"required"`
	Link               string    `json:"link" validate:"required,url"`
	PubDate            time.Time `json:"pubDate" validate:"required"`
	Content            string    `json:"content,omitempty"`
	ContentSnippet     string    `json:"contentSnippet,omitempty"`
	GUID               string    `json:"guid,omitempty"`
	ProjectName        string    `json:"projectName,omitempty"`
	ProjectDescription string    `json:"projectDescription,omitempty"`
	ProjectStatus      string    `json:"projectStatus,omitempty" validate:"omitempty,oneof=graduated incubating sandbox"`
	ProjectHomepage    string    `json:"projectHomepage,omitempty" validate:"omitempty,url"`
	FeedURL            string    `json:"feedUrl" validate:"required,url"`
	FeedTitle          string    `json:"feedTitle,omitempty"`
	FeedStatus         string    `json:"feedStatus" validate:"required,oneof=success error"`
	FetchedAt          time.Time `json:"fetchedAt" validate:"required"`
}

// FeedStatus tracks feed fetch results
type FeedStatus struct {
	FeedURL      string `json:"feedUrl" validate:"required,url"`
	Status       string `json:"status" validate:"required,oneof=success error"`
	EntriesCount int    `json:"entriesCount,omitempty"`
	Error        string `json:"error,omitempty"`
	ErrorType    string `json:"errorType,omitempty" validate:"omitempty,oneof=network parse validation timeout"`
	FetchedAt    string `json:"fetchedAt" validate:"required"`
	Duration     string `json:"duration" validate:"required"`
}

// LandscapeProject represents a CNCF project from landscape.yml
type LandscapeProject struct {
	Name        string `json:"name"`
	Description string `json:"description,omitempty"`
	RepoURL     string `json:"repo_url,omitempty"`
	HomepageURL string `json:"homepage_url,omitempty"`
	Status      string `json:"project,omitempty"` // graduated, incubating, sandbox
}

// FeedConfig represents the feeds.yaml configuration
type FeedConfig struct {
	Feeds []FeedSource `yaml:"feeds"`
}

// FeedSource represents a single feed source
type FeedSource struct {
	URL      string  `yaml:"url" validate:"required,url"`
	Category string  `yaml:"category" validate:"required,oneof=graduated incubating sandbox"`
	Project  *string `yaml:"project,omitempty"` // Optional project name override
}

// WriteJSON writes OutputData to a JSON file (pretty-printed)
func (o *OutputData) WriteJSON(path string) error {
	file, err := os.Create(path)
	if err != nil {
		return fmt.Errorf("create file: %w", err)
	}
	defer file.Close()

	encoder := json.NewEncoder(file)
	encoder.SetIndent("", "  ")
	encoder.SetEscapeHTML(false) // Keep URLs readable

	if err := encoder.Encode(o); err != nil {
		return fmt.Errorf("encode JSON: %w", err)
	}

	return nil
}

// FetchResults holds the results of parallel feed fetching
type FetchResults struct {
	Releases []Release
	Feeds    []FeedStatus
}
