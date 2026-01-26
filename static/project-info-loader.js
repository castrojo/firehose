/**
 * Load project information from landscape data and update the UI
 * Transforms "Release notes from X" to project name + description
 */

(async function() {
  try {
    const response = await fetch('landscape-data.json');
    const landscapeData = await response.json();
    
    // Find all source headers
    const sourceHeaders = document.querySelectorAll('.source-header');
    
    sourceHeaders.forEach(header => {
      const projectLink = header.querySelector('.project-link');
      if (!projectLink) return;
      
      const siteUrl = projectLink.href;
      const currentTitle = projectLink.textContent;
      
      // Extract org/repo from GitHub URLs
      if (siteUrl.includes('github.com')) {
        const match = siteUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/);
        if (match) {
          const org = match[1];
          const repo = match[2].replace(/\/releases$/, '');
          const key = `${org}/${repo}`;
          
          if (landscapeData[key]) {
            const project = landscapeData[key];
            
            // Update project name
            const projectName = header.querySelector('.project-name');
            if (projectName) {
              projectLink.textContent = project.name;
              
              // Add description if available and not already present
              if (project.description && !header.querySelector('.project-description')) {
                const descP = document.createElement('p');
                descP.className = 'project-description';
                descP.textContent = project.description;
                projectName.insertAdjacentElement('afterend', descP);
              }
            }
          }
        }
      }
    });
    
    console.log('✅ Project information loaded from CNCF Landscape');
  } catch (error) {
    console.warn('⚠️ Failed to load project information:', error);
  }
})();
