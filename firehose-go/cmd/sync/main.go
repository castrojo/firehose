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

	out, err := json.MarshalIndent(result, "", "  ")
	if err != nil {
		log.Fatalf("Failed to marshal sync result: %v", err)
	}
	fmt.Println(string(out))
}
