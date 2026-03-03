package main

import (
	"encoding/json"
	"fmt"
	"log"

	"github.com/castrojo/firehose-go/internal/landscape"
	landscapesync "github.com/castrojo/firehose-go/internal/sync"
)

func main() {
	log.Println("Firehose Landscape Sync")

	landscapeData, err := landscape.FetchAndParse()
	if err != nil {
		log.Fatalf("Failed to fetch landscape: %v", err)
	}
	log.Printf("Fetched %d landscape projects", len(landscapeData))

	result, err := landscapesync.Run("config/feeds.yaml", landscapeData)
	if err != nil {
		log.Fatalf("Sync failed: %v", err)
	}

	log.Printf("Release feeds: +%d -%d (total %d)",
		len(result.Added), len(result.Removed), result.Total)
	log.Printf("Blog feeds: +%d -%d (discovery failed: %d, total: %d)",
		len(result.BlogsAdded), len(result.BlogsRemoved),
		len(result.BlogsDiscoveryFailed), result.BlogsTotal)

	out, err := json.MarshalIndent(result, "", "  ")
	if err != nil {
		log.Fatalf("Failed to marshal sync result: %v", err)
	}
	fmt.Println(string(out))
}
