package main

import (
	"encoding/json"
	"fmt"
	"log"
	"time"

	"github.com/castrojo/firehose-go/internal/feeds"
	"github.com/castrojo/firehose-go/internal/landscape"
	"github.com/castrojo/firehose-go/internal/models"
)

const version = "1.0.0"

func main() {
	startTime := time.Now()

	log.Printf("Firehose Go Pipeline v%s", version)
	log.Println("Starting data aggregation...")

	// Step 1: Fetch and parse CNCF Landscape
	log.Println("Fetching CNCF Landscape data...")
	landscapeStart := time.Now()
	landscapeData, err := landscape.FetchAndParse()
	if err != nil {
		log.Fatalf("Failed to fetch landscape: %v", err)
	}
	landscapeDuration := time.Since(landscapeStart)
	log.Printf("Parsed %d landscape projects in %s", len(landscapeData), landscapeDuration)

	// Step 2: Load feed configuration
	log.Println("Loading feed configuration...")
	feedConfig, err := feeds.LoadConfig("config/feeds.yaml")
	if err != nil {
		log.Fatalf("Failed to load feed config: %v", err)
	}
	log.Printf("Loaded %d feeds", len(feedConfig.Feeds))

	// Step 3: Fetch all feeds in parallel
	log.Println("Fetching feeds in parallel...")
	feedsStart := time.Now()
	results := feeds.FetchAllFeeds(feedConfig.Feeds, landscapeData)
	feedsDuration := time.Since(feedsStart)
	log.Printf("Fetched %d feeds in %s", len(results.Feeds), feedsDuration)

	// Step 4: Collect statistics
	successCount := 0
	failCount := 0
	for _, feed := range results.Feeds {
		if feed.Status == "success" {
			successCount++
		} else {
			failCount++
		}
	}

	log.Printf("Feed results: %d successful, %d failed", successCount, failCount)
	log.Printf("Total releases: %d", len(results.Releases))

	// Check if we have enough successful feeds (>50% threshold)
	successRate := float64(successCount) / float64(len(feedConfig.Feeds))
	if successRate < 0.5 {
		log.Fatalf("Catastrophic failure: only %.1f%% feeds succeeded (threshold: 50%%)", successRate*100)
	}

	// Step 5: Build output structure
	buildDuration := time.Since(startTime)
	output := &models.OutputData{
		Metadata: models.Metadata{
			SchemaVersion: "1.0.0",
			GeneratedAt:   time.Now().UTC().Format(time.RFC3339),
			GeneratedBy:   fmt.Sprintf("firehose-go v%s", version),
			BuildDuration: buildDuration.String(),
			Stats: models.Stats{
				FeedsTotal:               len(feedConfig.Feeds),
				FeedsSuccessful:          successCount,
				FeedsFailed:              failCount,
				FeedsSkipped:             0,
				ReleasesTotal:            len(results.Releases),
				LandscapeProjectsTotal:   len(landscapeData),
				LandscapeProjectsMatched: countMatchedProjects(results.Releases),
			},
			Performance: models.Performance{
				LandscapeFetchDuration: landscapeDuration.String(),
				FeedsFetchDuration:     feedsDuration.String(),
				EnrichmentDuration:     "0s", // Tracked during fetch
				ValidationDuration:     "0s", // Tracked during fetch
				OutputDuration:         "0s", // Will be updated
			},
		},
		Releases: results.Releases,
		Feeds:    results.Feeds,
	}

	// Step 6: Write output JSON
	log.Println("Writing output JSON...")
	outputStart := time.Now()
	outputPath := "../src/data/releases.json"
	if err := output.WriteJSON(outputPath); err != nil {
		log.Fatalf("Failed to write output: %v", err)
	}
	outputDuration := time.Since(outputStart)
	output.Metadata.Performance.OutputDuration = outputDuration.String()

	// Log final summary
	log.Printf("✅ Pipeline complete in %s", buildDuration)
	log.Printf("📊 Output: %s", outputPath)

	// Write summary as JSON for GitHub Actions
	summary := map[string]interface{}{
		"success":      true,
		"duration":     buildDuration.String(),
		"feeds_total":  len(feedConfig.Feeds),
		"feeds_ok":     successCount,
		"feeds_failed": failCount,
		"releases":     len(results.Releases),
	}
	summaryJSON, _ := json.MarshalIndent(summary, "", "  ")
	fmt.Println(string(summaryJSON))
}

// countMatchedProjects counts unique projects with Landscape enrichment
func countMatchedProjects(releases []models.Release) int {
	matched := make(map[string]bool)
	for _, rel := range releases {
		if rel.ProjectName != "" {
			matched[rel.ProjectName] = true
		}
	}
	return len(matched)
}
