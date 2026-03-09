// Package urlutil provides shared URL parsing utilities for the firehose pipeline.
package urlutil

import "strings"

// ExtractOrgRepo extracts the "org/repo" path segment from a GitHub repository URL.
// Returns an empty string if the URL does not contain a recognizable org/repo segment.
//
// Examples:
//
//	https://github.com/kubernetes/kubernetes/releases.atom → kubernetes/kubernetes
//	https://github.com/kubernetes/kubernetes              → kubernetes/kubernetes
func ExtractOrgRepo(repoURL string) string {
	const prefix = "github.com/"
	idx := strings.Index(repoURL, prefix)
	if idx == -1 {
		return ""
	}
	remainder := repoURL[idx+len(prefix):]

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
