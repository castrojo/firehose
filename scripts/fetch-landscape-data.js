#!/usr/bin/env node

/**
 * Fetch project descriptions from CNCF Landscape
 * Maps feed URLs to project names and descriptions for better display
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const OUTPUT_PATH = path.join(__dirname, '../public/landscape-data.json');
const LANDSCAPE_YML_URL = 'https://raw.githubusercontent.com/cncf/landscape/master/landscape.yml';

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { timeout: 30000 }, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode} for ${url}`));
        return;
      }
      
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject).on('timeout', () => {
      reject(new Error(`Timeout for ${url}`));
    });
  });
}

function parseYaml(text) {
  const projects = [];
  const lines = text.split('\n');
  let currentItem = null;
  let inExtra = false;
  let inSummaryUseCase = false;
  let summaryLines = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // New item starts (check for "- item:" at any indentation)
    if (line.match(/^\s+- item:\s*$/)) {
      // Save previous item
      if (currentItem && currentItem.name) {
        // Finalize any pending summary
        if (inSummaryUseCase && summaryLines.length > 0) {
          currentItem.description = summaryLines.join(' ').trim();
        }
        projects.push(currentItem);
      }
      currentItem = { name: '', description: '', repo_url: '', homepage_url: '' };
      inExtra = false;
      inSummaryUseCase = false;
      summaryLines = [];
      continue;
    } 
    
    if (!currentItem) continue;
    
    // Check for name (12 spaces + "name:")
    if (line.match(/^\s{12}name:\s+(.+)$/)) {
      currentItem.name = line.match(/^\s{12}name:\s+(.+)$/)[1].trim();
      continue;
    }
    
    // Check for repo_url (12 spaces + "repo_url:")
    if (line.match(/^\s{12}repo_url:\s+(.+)$/)) {
      currentItem.repo_url = line.match(/^\s{12}repo_url:\s+(.+)$/)[1].trim();
      continue;
    }
    
    // Check for homepage_url (12 spaces + "homepage_url:")
    if (line.match(/^\s{12}homepage_url:\s+(.+)$/)) {
      currentItem.homepage_url = line.match(/^\s{12}homepage_url:\s+(.+)$/)[1].trim();
      continue;
    }
    
    // Check for extra section (12 spaces + "extra:")
    if (line.match(/^\s{12}extra:\s*$/)) {
      inExtra = true;
      continue;
    }
    
    // Inside extra section
    if (inExtra) {
      // Start of summary_use_case (14 spaces + "summary_use_case:")
      if (line.match(/^\s{14}summary_use_case:\s+>-?\s*$/)) {
        inSummaryUseCase = true;
        summaryLines = [];
        continue;
      }
      
      // Collecting summary_use_case lines (16 spaces + content)
      if (inSummaryUseCase) {
        if (line.match(/^\s{16}\S/)) {
          summaryLines.push(line.trim());
        } else if (line.match(/^\s{14}\S/)) {
          // Another field at 14 spaces means summary_use_case ended
          if (summaryLines.length > 0) {
            currentItem.description = summaryLines.join(' ').trim();
          }
          inSummaryUseCase = false;
          summaryLines = [];
        } else if (line.match(/^\s{0,13}\S/)) {
          // Back to item level, exit extra
          if (summaryLines.length > 0) {
            currentItem.description = summaryLines.join(' ').trim();
          }
          inExtra = false;
          inSummaryUseCase = false;
          summaryLines = [];
        }
      }
    }
  }
  
  // Save last item
  if (currentItem && currentItem.name) {
    if (inSummaryUseCase && summaryLines.length > 0) {
      currentItem.description = summaryLines.join(' ').trim();
    }
    projects.push(currentItem);
  }
  
  return projects;
}

function createProjectMap(projects) {
  const map = {};
  
  for (const project of projects) {
    const name = project.name.toLowerCase();
    const repoUrl = project.repo_url ? project.repo_url.toLowerCase() : '';
    
    map[name] = {
      name: project.name,
      description: project.description || '',
      repo_url: project.repo_url,
      homepage_url: project.homepage_url
    };
    
    // Extract org/repo from GitHub URL for easier matching
    if (repoUrl.includes('github.com')) {
      const match = repoUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/);
      if (match) {
        const org = match[1];
        const repo = match[2].replace(/\.git$/, '');
        map[`${org}/${repo}`] = map[name];
      }
    }
  }
  
  return map;
}

async function fetchLandscapeData() {
  console.log('🌍 Fetching CNCF Landscape YAML...');
  
  try {
    const yaml = await fetchUrl(LANDSCAPE_YML_URL);
    const projects = parseYaml(yaml);
    const projectMap = createProjectMap(projects);
    
    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(projectMap, null, 2));
    console.log(`✅ Cached ${Object.keys(projectMap).length} project mappings to ${OUTPUT_PATH}`);
  } catch (error) {
    console.error('❌ Error fetching landscape data:', error.message);
    // Create empty cache on error
    fs.writeFileSync(OUTPUT_PATH, JSON.stringify({}, null, 2));
    console.log('⚠️  Created empty landscape cache');
  }
}

fetchLandscapeData().catch(error => {
  console.error('💥 Fatal error:', error);
  process.exit(1);
});
