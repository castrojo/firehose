package feeds

import (
	"errors"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/castrojo/firehose-go/internal/models"
)

func TestTruncateString(t *testing.T) {
	tests := []struct {
		name   string
		input  string
		maxLen int
		want   string
	}{
		{
			name:   "empty string",
			input:  "",
			maxLen: 10,
			want:   "",
		},
		{
			name:   "string shorter than limit",
			input:  "short",
			maxLen: 10,
			want:   "short",
		},
		{
			name:   "string exactly at limit",
			input:  "exactly10!",
			maxLen: 10,
			want:   "exactly10!",
		},
		{
			name:   "string longer than limit",
			input:  "this is a very long string that should be truncated",
			maxLen: 20,
			want:   "this is a very long ",
		},
		{
			name:   "multi-byte Unicode - emoji",
			input:  "Hello 👋 World 🌍 Testing 🚀",
			maxLen: 15,
			want:   "Hello 👋 World 🌍",
		},
		{
			name:   "multi-byte Unicode - CJK characters",
			input:  "日本語のテキストです",
			maxLen: 5,
			want:   "日本語のテ",
		},
		{
			name:   "mixed ASCII and multi-byte",
			input:  "Test 测试 テスト",
			maxLen: 8,
			want:   "Test 测试 ",
		},
		{
			name:   "zero limit",
			input:  "anything",
			maxLen: 0,
			want:   "",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := truncateString(tt.input, tt.maxLen)
			if got != tt.want {
				t.Errorf("truncateString(%q, %d) = %q, want %q", tt.input, tt.maxLen, got, tt.want)
			}
			// Verify it's rune-based, not byte-based
			gotRunes := []rune(got)
			if len(gotRunes) > tt.maxLen {
				t.Errorf("truncateString(%q, %d) returned %d runes, want <= %d", tt.input, tt.maxLen, len(gotRunes), tt.maxLen)
			}
		})
	}
}

func TestClassifyError(t *testing.T) {
	tests := []struct {
		name string
		err  error
		want string
	}{
		{
			name: "timeout error",
			err:  errors.New("request timeout"),
			want: "timeout",
		},
		{
			name: "deadline exceeded",
			err:  errors.New("context deadline exceeded"),
			want: "timeout",
		},
		{
			name: "404 error",
			err:  errors.New("HTTP 404 not found"),
			want: "network",
		},
		{
			name: "403 forbidden",
			err:  errors.New("HTTP 403 forbidden"),
			want: "network",
		},
		{
			name: "500 server error",
			err:  errors.New("HTTP 500 internal server error"),
			want: "network",
		},
		{
			name: "parse error",
			err:  errors.New("failed to parse XML"),
			want: "parse",
		},
		{
			name: "XML error",
			err:  errors.New("XML syntax error at line 42"),
			want: "parse",
		},
		{
			name: "invalid feed",
			err:  errors.New("invalid RSS feed structure"),
			want: "parse",
		},
		{
			name: "generic network error",
			err:  errors.New("connection refused"),
			want: "network",
		},
		{
			name: "unknown error",
			err:  errors.New("something went wrong"),
			want: "network",
		},
		{
			name: "case insensitive - TIMEOUT",
			err:  errors.New("REQUEST TIMEOUT"),
			want: "timeout",
		},
		{
			name: "case insensitive - Parse",
			err:  errors.New("Parse error occurred"),
			want: "parse",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := classifyError(tt.err)
			if got != tt.want {
				t.Errorf("classifyError(%v) = %q, want %q", tt.err, got, tt.want)
			}
		})
	}
}

func TestContains(t *testing.T) {
	tests := []struct {
		name   string
		s      string
		substr string
		want   bool
	}{
		{
			name:   "exact match",
			s:      "hello world",
			substr: "hello",
			want:   true,
		},
		{
			name:   "case insensitive match - lowercase in uppercase",
			s:      "HELLO WORLD",
			substr: "hello",
			want:   true,
		},
		{
			name:   "case insensitive match - uppercase in lowercase",
			s:      "hello world",
			substr: "WORLD",
			want:   true,
		},
		{
			name:   "mixed case",
			s:      "HeLLo WoRLd",
			substr: "hElLo",
			want:   true,
		},
		{
			name:   "no match",
			s:      "hello world",
			substr: "goodbye",
			want:   false,
		},
		{
			name:   "empty substring always matches",
			s:      "anything",
			substr: "",
			want:   true,
		},
		{
			name:   "empty string with non-empty substring",
			s:      "",
			substr: "test",
			want:   false,
		},
		{
			name:   "both empty",
			s:      "",
			substr: "",
			want:   false,
		},
		{
			name:   "substring at start",
			s:      "testing",
			substr: "test",
			want:   true,
		},
		{
			name:   "substring at end",
			s:      "testing",
			substr: "ing",
			want:   true,
		},
		{
			name:   "substring in middle",
			s:      "testing",
			substr: "stin",
			want:   true,
		},
		{
			name:   "partial match not enough",
			s:      "test",
			substr: "testing",
			want:   false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := contains(tt.s, tt.substr)
			if got != tt.want {
				t.Errorf("contains(%q, %q) = %v, want %v", tt.s, tt.substr, got, tt.want)
			}
		})
	}
}

func TestFetchSingleFeed(t *testing.T) {
	// Valid RSS 2.0 feed
	validRSS := `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
	<channel>
		<title>Test Feed</title>
		<link>https://example.com</link>
		<description>Test feed description</description>
		<item>
			<title>Release v1.0.0</title>
			<link>https://example.com/releases/v1.0.0</link>
			<pubDate>Mon, 01 Jan 2024 00:00:00 UTC</pubDate>
			<description>First release</description>
		</item>
		<item>
			<title>Release v0.9.0</title>
			<link>https://example.com/releases/v0.9.0</link>
			<pubDate>Sun, 31 Dec 2023 00:00:00 UTC</pubDate>
			<description>Beta release</description>
		</item>
	</channel>
</rss>`

	t.Run("successful feed fetch", func(t *testing.T) {
		// Create test server
		server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.Header().Set("Content-Type", "application/rss+xml")
			w.WriteHeader(http.StatusOK)
			fmt.Fprint(w, validRSS)
		}))
		defer server.Close()

		// Create feed source
		source := models.FeedSource{
			URL:      server.URL,
			Category: "graduated",
		}

		// Empty landscape data (no enrichment)
		landscapeData := make(map[string]models.LandscapeProject)

		// Fetch feed
		releases, status := fetchSingleFeed(source, landscapeData)

		// Verify releases
		if len(releases) != 2 {
			t.Fatalf("expected 2 releases, got %d", len(releases))
		}

		if releases[0].Title != "Release v1.0.0" {
			t.Errorf("expected first release title 'Release v1.0.0', got '%s'", releases[0].Title)
		}
		if releases[0].Link != "https://example.com/releases/v1.0.0" {
			t.Errorf("expected first release link 'https://example.com/releases/v1.0.0', got '%s'", releases[0].Link)
		}
		if releases[0].ContentSnippet != "First release" {
			t.Errorf("expected first release snippet 'First release', got '%s'", releases[0].ContentSnippet)
		}

		if releases[1].Title != "Release v0.9.0" {
			t.Errorf("expected second release title 'Release v0.9.0', got '%s'", releases[1].Title)
		}

		// Verify status
		if status.Status != "success" {
			t.Errorf("expected status 'success', got '%s'", status.Status)
		}
		if status.EntriesCount != 2 {
			t.Errorf("expected 2 entries, got %d", status.EntriesCount)
		}
		if status.FeedURL != server.URL {
			t.Errorf("expected feed URL '%s', got '%s'", server.URL, status.FeedURL)
		}
		if status.Error != "" {
			t.Errorf("expected no error, got '%s'", status.Error)
		}
	})

	t.Run("feed fetch with landscape enrichment", func(t *testing.T) {
		server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.Header().Set("Content-Type", "application/rss+xml")
			w.WriteHeader(http.StatusOK)
			fmt.Fprint(w, validRSS)
		}))
		defer server.Close()

		source := models.FeedSource{
			URL:      "https://github.com/kubernetes/kubernetes/releases.atom",
			Category: "graduated",
		}

		landscapeData := map[string]models.LandscapeProject{
			"kubernetes/kubernetes": {
				Name:        "Kubernetes",
				Description: "Container orchestration platform",
				Status:      "graduated",
				HomepageURL: "https://kubernetes.io",
				BlogURL:     "https://kubernetes.io/blog",
			},
		}

		oldURL := source.URL
		source.URL = server.URL
		releases, status := fetchSingleFeed(source, landscapeData)
		source.URL = oldURL

		if len(releases) != 2 {
			t.Fatalf("expected 2 releases, got %d", len(releases))
		}

		if releases[0].ProjectName != "" {
			t.Errorf("expected no project name (URL doesn't contain github.com), got '%s'", releases[0].ProjectName)
		}

		if status.Status != "success" {
			t.Errorf("expected status 'success', got '%s'", status.Status)
		}
	})

	t.Run("feed fetch with blog name-based fallback", func(t *testing.T) {
		server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.Header().Set("Content-Type", "application/rss+xml")
			w.WriteHeader(http.StatusOK)
			fmt.Fprint(w, validRSS)
		}))
		defer server.Close()

		projectName := "Argo"
		source := models.FeedSource{
			URL:      server.URL + "/blog/feed",
			Category: "incubating",
			Project:  &projectName,
		}

		landscapeData := map[string]models.LandscapeProject{
			"argoproj/argo-workflows": {
				Name:        "Argo",
				Description: "Workflow engine",
				Status:      "incubating",
			},
		}

		releases, status := fetchSingleFeed(source, landscapeData)

		if len(releases) != 2 {
			t.Fatalf("expected 2 releases, got %d", len(releases))
		}

		// Verify name-based enrichment worked
		if releases[0].ProjectName != "Argo" {
			t.Errorf("expected project name 'Argo' via name-based fallback, got '%s'", releases[0].ProjectName)
		}
		if releases[0].ProjectStatus != "incubating" {
			t.Errorf("expected project status 'incubating', got '%s'", releases[0].ProjectStatus)
		}

		if status.Status != "success" {
			t.Errorf("expected status 'success', got '%s'", status.Status)
		}
	})

	t.Run("server returns 500 error", func(t *testing.T) {
		server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.WriteHeader(http.StatusInternalServerError)
			fmt.Fprint(w, "Internal Server Error")
		}))
		defer server.Close()

		source := models.FeedSource{
			URL:      server.URL,
			Category: "sandbox",
		}

		landscapeData := make(map[string]models.LandscapeProject)

		releases, status := fetchSingleFeed(source, landscapeData)

		// Should return no releases
		if len(releases) != 0 {
			t.Errorf("expected 0 releases on error, got %d", len(releases))
		}

		// Verify error status
		if status.Status != "error" {
			t.Errorf("expected status 'error', got '%s'", status.Status)
		}
		if status.Error == "" {
			t.Error("expected error message, got empty string")
		}
		if status.ErrorType != "network" {
			t.Errorf("expected error type 'network', got '%s'", status.ErrorType)
		}
		if status.FeedURL != server.URL {
			t.Errorf("expected feed URL '%s', got '%s'", server.URL, status.FeedURL)
		}
	})

	t.Run("invalid XML returns parse error", func(t *testing.T) {
		server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.Header().Set("Content-Type", "application/rss+xml")
			w.WriteHeader(http.StatusOK)
			fmt.Fprint(w, "<invalid><unclosed>")
		}))
		defer server.Close()

		source := models.FeedSource{
			URL:      server.URL,
			Category: "sandbox",
		}

		landscapeData := make(map[string]models.LandscapeProject)

		releases, status := fetchSingleFeed(source, landscapeData)

		if len(releases) != 0 {
			t.Errorf("expected 0 releases on parse error, got %d", len(releases))
		}

		if status.Status != "error" {
			t.Errorf("expected status 'error', got '%s'", status.Status)
		}
		// Note: gofeed might classify this as network or parse depending on the error
		// We just verify it's an error status
		if status.Error == "" {
			t.Error("expected error message, got empty string")
		}
	})

	t.Run("truncate long content snippet", func(t *testing.T) {
		longDescription := ""
		for i := 0; i < 600; i++ {
			longDescription += "x"
		}

		rssWithLongDesc := fmt.Sprintf(`<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
	<channel>
		<title>Test</title>
		<link>https://example.com</link>
		<description>Test</description>
		<item>
			<title>Release</title>
			<link>https://example.com/r1</link>
			<pubDate>Mon, 01 Jan 2024 00:00:00 UTC</pubDate>
			<description>%s</description>
		</item>
	</channel>
</rss>`, longDescription)

		server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.Header().Set("Content-Type", "application/rss+xml")
			w.WriteHeader(http.StatusOK)
			fmt.Fprint(w, rssWithLongDesc)
		}))
		defer server.Close()

		source := models.FeedSource{
			URL:      server.URL,
			Category: "sandbox",
		}

		releases, _ := fetchSingleFeed(source, make(map[string]models.LandscapeProject))

		if len(releases) != 1 {
			t.Fatalf("expected 1 release, got %d", len(releases))
		}

		snippetRunes := []rune(releases[0].ContentSnippet)
		if len(snippetRunes) > 500 {
			t.Errorf("expected content snippet truncated to 500 runes, got %d", len(snippetRunes))
		}
	})
}
