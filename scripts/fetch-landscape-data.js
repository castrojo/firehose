#!/usr/bin/env node

/**
 * Fetch project descriptions from CNCF Landscape
 * Maps feed URLs to project names and descriptions for better display
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const OUTPUT_PATH = path.join(__dirname, '../public/landscape-data.json');
const LANDSCAPE_URL = 'https://raw.githubusercontent.com/cncf/landscape/master/landscape.yml';

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

function parseYaml(yaml) {
  const projects = [];
  const lines = yaml.split('\n');
  let currentProject = null;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Match project name
    if (line.match(/^\s+- name:\s*(.+)$/)) {
      if (currentProject) {
        projects.push(currentProject);
      }
      currentProject = { name: line.match(/^\s+- name:\s*(.+)$/)[1].trim() };
    }
    
    // Match description
    if (currentProject && line.match(/^\s+description:\s*(.+)$/)) {
      currentProject.description = line.match(/^\s+description:\s*(.+)$/)[1].trim();
    }
    
    // Match repo URL
    if (currentProject && line.match(/^\s+repo_url:\s*(.+)$/)) {
      currentProject.repo_url = line.match(/^\s+repo_url:\s*(.+)$/)[1].trim();
    }
    
    // Match homepage
    if (currentProject && line.match(/^\s+homepage_url:\s*(.+)$/)) {
      currentProject.homepage_url = line.match(/^\s+homepage_url:\s*(.+)$/)[1].trim();
    }
  }
  
  if (currentProject) {
    projects.push(currentProject);
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
  console.log('🌍 Fetching CNCF Landscape data...');
  
  try {
    const yaml = await fetchUrl(LANDSCAPE_URL);
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
