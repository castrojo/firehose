package landscape

import (
	"testing"

	"github.com/castrojo/firehose-go/internal/models"
)

func TestParseLandscapeYAML(t *testing.T) {
	tests := []struct {
		name    string
		yaml    string
		wantErr bool
		check   func(t *testing.T, result map[string]models.LandscapeProject)
	}{
		{
			name: "valid landscape with multiple projects",
			yaml: `
landscape:
  - name: "CNCF Projects"
    subcategories:
      - name: "Graduated"
        items:
          - name: "Kubernetes"
            repo_url: "https://github.com/kubernetes/kubernetes"
            homepage_url: "https://kubernetes.io"
            description: "Container orchestration platform"
            project: "graduated"
          - name: "Prometheus"
            repo_url: "https://github.com/prometheus/prometheus"
            homepage_url: "https://prometheus.io"
            description: "Monitoring and alerting toolkit"
            project: "graduated"
            extra:
              blog_url: "https://prometheus.io/blog"
      - name: "Incubating"
        items:
          - name: "Argo"
            repo_url: "https://github.com/argoproj/argo-workflows"
            description: "Workflow engine for Kubernetes"
            project: "incubating"
            extra:
              blog_url: "https://blog.argoproj.io"
`,
			wantErr: false,
			check: func(t *testing.T, result map[string]models.LandscapeProject) {
				if len(result) != 3 {
					t.Errorf("expected 3 projects, got %d", len(result))
				}

				k8s, ok := result["kubernetes/kubernetes"]
				if !ok {
					t.Fatal("kubernetes/kubernetes not found")
				}
				if k8s.Name != "Kubernetes" {
					t.Errorf("expected name 'Kubernetes', got '%s'", k8s.Name)
				}
				if k8s.Status != "graduated" {
					t.Errorf("expected status 'graduated', got '%s'", k8s.Status)
				}
				if k8s.Description != "Container orchestration platform" {
					t.Errorf("expected description 'Container orchestration platform', got '%s'", k8s.Description)
				}
				if k8s.HomepageURL != "https://kubernetes.io" {
					t.Errorf("expected homepage 'https://kubernetes.io', got '%s'", k8s.HomepageURL)
				}
				if k8s.BlogURL != "" {
					t.Errorf("expected no blog URL, got '%s'", k8s.BlogURL)
				}

				prom, ok := result["prometheus/prometheus"]
				if !ok {
					t.Fatal("prometheus/prometheus not found")
				}
				if prom.BlogURL != "https://prometheus.io/blog" {
					t.Errorf("expected blog URL 'https://prometheus.io/blog', got '%s'", prom.BlogURL)
				}

				argo, ok := result["argoproj/argo-workflows"]
				if !ok {
					t.Fatal("argoproj/argo-workflows not found")
				}
				if argo.Status != "incubating" {
					t.Errorf("expected status 'incubating', got '%s'", argo.Status)
				}
			},
		},
		{
			name: "skip entries without repo_url",
			yaml: `
landscape:
  - name: "CNCF Projects"
    subcategories:
      - name: "Graduated"
        items:
          - name: "Valid Project"
            repo_url: "https://github.com/example/valid"
            project: "graduated"
          - name: "No Repo URL"
            description: "This should be skipped"
            project: "graduated"
`,
			wantErr: false,
			check: func(t *testing.T, result map[string]models.LandscapeProject) {
				if len(result) != 1 {
					t.Errorf("expected 1 project (skipped entry without repo_url), got %d", len(result))
				}
				if _, ok := result["example/valid"]; !ok {
					t.Error("example/valid not found")
				}
			},
		},
		{
			name: "canonical entry wins over duplicate",
			yaml: `
landscape:
  - name: "CNCF Projects"
    subcategories:
      - name: "Graduated"
        items:
          - name: "Kubernetes"
            repo_url: "https://github.com/kubernetes/kubernetes"
            description: "Canonical graduated entry"
            project: "graduated"
      - name: "Wasm Subcategory"
        items:
          - name: "Kubernetes (duplicate)"
            repo_url: "https://github.com/kubernetes/kubernetes"
            description: "Duplicate without status"
`,
			wantErr: false,
			check: func(t *testing.T, result map[string]models.LandscapeProject) {
				if len(result) != 1 {
					t.Errorf("expected 1 project (duplicate should not overwrite), got %d", len(result))
				}
				k8s, ok := result["kubernetes/kubernetes"]
				if !ok {
					t.Fatal("kubernetes/kubernetes not found")
				}
				if k8s.Status != "graduated" {
					t.Errorf("expected canonical status 'graduated', got '%s'", k8s.Status)
				}
				if k8s.Description != "Canonical graduated entry" {
					t.Errorf("expected canonical description, got '%s'", k8s.Description)
				}
			},
		},
		{
			name: "extra.summary_use_case fallback when no description",
			yaml: `
landscape:
  - name: "CNCF Projects"
    subcategories:
      - name: "Sandbox"
        items:
          - name: "Project With Summary"
            repo_url: "https://github.com/example/project"
            project: "sandbox"
            extra:
              summary_use_case: "Fallback description from summary_use_case"
              blog_url: "https://example.com/blog"
`,
			wantErr: false,
			check: func(t *testing.T, result map[string]models.LandscapeProject) {
				if len(result) != 1 {
					t.Errorf("expected 1 project, got %d", len(result))
				}
				proj, ok := result["example/project"]
				if !ok {
					t.Fatal("example/project not found")
				}
				if proj.Description != "Fallback description from summary_use_case" {
					t.Errorf("expected summary_use_case fallback, got '%s'", proj.Description)
				}
				if proj.BlogURL != "https://example.com/blog" {
					t.Errorf("expected blog URL 'https://example.com/blog', got '%s'", proj.BlogURL)
				}
			},
		},
		{
			name: "extra.summary_business_use_case fallback when no description or summary_use_case",
			yaml: `
landscape:
  - name: "CNCF Projects"
    subcategories:
      - name: "Sandbox"
        items:
          - name: "Project With Business Summary"
            repo_url: "https://github.com/example/business"
            project: "sandbox"
            extra:
              summary_business_use_case: "Fallback from business use case"
`,
			wantErr: false,
			check: func(t *testing.T, result map[string]models.LandscapeProject) {
				proj, ok := result["example/business"]
				if !ok {
					t.Fatal("example/business not found")
				}
				if proj.Description != "Fallback from business use case" {
					t.Errorf("expected business use case fallback, got '%s'", proj.Description)
				}
			},
		},
		{
			name: "top-level description takes priority over extra summaries",
			yaml: `
landscape:
  - name: "CNCF Projects"
    subcategories:
      - name: "Graduated"
        items:
          - name: "Priority Test"
            repo_url: "https://github.com/example/priority"
            description: "Top-level description"
            project: "graduated"
            extra:
              summary_use_case: "Should not override"
              summary_business_use_case: "Should also not override"
`,
			wantErr: false,
			check: func(t *testing.T, result map[string]models.LandscapeProject) {
				proj, ok := result["example/priority"]
				if !ok {
					t.Fatal("example/priority not found")
				}
				if proj.Description != "Top-level description" {
					t.Errorf("expected top-level description to win, got '%s'", proj.Description)
				}
			},
		},
		{
			name:    "invalid YAML returns error",
			yaml:    `invalid: [unclosed bracket`,
			wantErr: true,
		},
		{
			name: "empty landscape array",
			yaml: `
landscape: []
`,
			wantErr: false,
			check: func(t *testing.T, result map[string]models.LandscapeProject) {
				if len(result) != 0 {
					t.Errorf("expected empty map, got %d projects", len(result))
				}
			},
		},
		{
			name: "extract org/repo from various GitHub URL formats",
			yaml: `
landscape:
  - name: "URL Format Tests"
    subcategories:
      - name: "Various URLs"
        items:
          - name: "Standard Format"
            repo_url: "https://github.com/org/repo"
            project: "sandbox"
          - name: "With Releases Suffix"
            repo_url: "https://github.com/owner/project/releases.atom"
            project: "sandbox"
          - name: "With Extra Path"
            repo_url: "https://github.com/company/app/tree/main"
            project: "sandbox"
`,
			wantErr: false,
			check: func(t *testing.T, result map[string]models.LandscapeProject) {
				if len(result) != 3 {
					t.Errorf("expected 3 projects, got %d", len(result))
				}
				if _, ok := result["org/repo"]; !ok {
					t.Error("org/repo not found")
				}
				if _, ok := result["owner/project"]; !ok {
					t.Error("owner/project not found (should strip /releases.atom)")
				}
				if _, ok := result["company/app"]; !ok {
					t.Error("company/app not found (should extract first two path segments)")
				}
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result, err := parseLandscapeYAML([]byte(tt.yaml))

			if tt.wantErr {
				if err == nil {
					t.Error("expected error, got nil")
				}
				return
			}

			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}

			if tt.check != nil {
				tt.check(t, result)
			}
		})
	}
}
