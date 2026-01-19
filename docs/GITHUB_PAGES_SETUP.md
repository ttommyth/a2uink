# GitHub Pages Deployment Setup & Validation

## Overview
This document describes the GitHub Actions workflow for automatically building and deploying the A2UI Ink demo page to GitHub Pages.

## Workflow Configuration

### File Location
`.github/workflows/deploy-pages.yml`

### Triggers
- **Automatic**: Pushes to the `main` branch
- **Manual**: Via GitHub Actions UI (workflow_dispatch)

### Permissions Required
The workflow requires the following GITHUB_TOKEN permissions:
- `contents: read` - Read repository contents
- `pages: write` - Deploy to GitHub Pages
- `id-token: write` - Required for GitHub Pages deployment authentication

### Build Process
1. Checks out the repository
2. Sets up Node.js 20.x with npm caching
3. Installs dependencies in `docs/demo/`
4. Runs `npm run build` to create production build
5. Uploads the `docs/demo/dist/` directory as GitHub Pages artifact
6. Deploys the artifact to GitHub Pages

## GitHub Pages Configuration

### Repository Settings Required

To enable GitHub Pages deployment, the repository owner must configure the following settings:

1. **Navigate to Repository Settings**
   - Go to https://github.com/ttommyth/a2uink/settings/pages

2. **Configure Pages Source**
   - **Source**: Select "GitHub Actions"
   - This allows the workflow to deploy directly without using a branch

3. **Verify Deployment Settings**
   - The workflow will automatically handle deployments
   - Each deployment creates a new environment named `github-pages`

### Expected Configuration
```
Source: GitHub Actions
Branch: Not applicable (GitHub Actions deployment)
Custom domain: (optional)
Enforce HTTPS: ✓ (recommended)
```

## Validation Steps

### 1. Verify Workflow Execution

After pushing to main or running the workflow manually:

1. Navigate to the Actions tab: https://github.com/ttommyth/a2uink/actions
2. Find the "Deploy Demo to GitHub Pages" workflow run
3. Verify both jobs complete successfully:
   - ✅ `build` - Builds the demo page
   - ✅ `deploy` - Deploys to GitHub Pages

### 2. Check Deployment Status

1. Go to repository Settings → Pages
2. Verify the deployment shows:
   - **Status**: "Your site is live at https://ttommyth.github.io/a2uink/"
   - **Last deployment**: Recent timestamp matching workflow run

### 3. Access the Demo Site

Visit the deployed site at:
```
https://ttommyth.github.io/a2uink/
```

Expected behavior:
- Page loads without errors
- A2UI Ink demo interface is visible
- Interactive features work (terminal, component catalog, JSON playground)
- Navigation between sections functions correctly

### 4. Verify Build Artifacts

In the workflow run details:
1. Click on the `build` job
2. Check the "Upload artifact" step shows successful upload
3. Verify artifact size is reasonable (typically ~1-2 MB)

### 5. Test Manual Deployment

1. Go to Actions → "Deploy Demo to GitHub Pages" workflow
2. Click "Run workflow" button
3. Select the `main` branch
4. Click "Run workflow"
5. Verify successful execution

## Troubleshooting

### Common Issues

#### Workflow Fails with "Resource not accessible by integration"
**Cause**: GitHub Pages not enabled or insufficient permissions
**Solution**: Enable GitHub Pages in repository settings (see Configuration section)

#### Build Fails with Module Resolution Errors
**Cause**: Missing npm dependencies or build configuration issues
**Solution**: 
- Verify `docs/demo/package.json` includes all required dependencies
- Check that shim files exist in `docs/demo/src/shims/`

#### Page Shows 404 After Deployment
**Cause**: Incorrect base path or artifact upload path
**Solution**: 
- Verify `vite.config.js` has `base: "./"` for relative paths
- Check workflow uploads from correct path: `docs/demo/dist`

#### Assets Not Loading (404 on CSS/JS)
**Cause**: Incorrect base URL configuration
**Solution**: 
- Ensure Vite config uses relative paths: `base: "./"`
- Clear browser cache and hard reload

## Monitoring

### Deployment URL
The workflow outputs the deployment URL in the `deploy` job:
```yaml
environment:
  name: github-pages
  url: ${{ steps.deployment.outputs.page_url }}
```

### Notifications
- GitHub will send notifications on workflow failures
- Each deployment creates a new entry in the Deployments section

## Maintenance

### Updating the Workflow
When updating the workflow:
1. Test changes in a feature branch first
2. Verify build completes successfully locally: `cd docs/demo && npm run build`
3. Create PR and review workflow changes
4. Merge only after successful test deployment

### Dependencies
Keep the following GitHub Actions up to date:
- `actions/checkout` (currently v4)
- `actions/setup-node` (currently v4)
- `actions/configure-pages` (currently v4)
- `actions/upload-pages-artifact` (currently v3)
- `actions/deploy-pages` (currently v4)

## Security Notes

- The workflow uses OIDC authentication for GitHub Pages
- No sensitive secrets are required
- All permissions are scoped to minimum required access
- Concurrency control prevents race conditions in deployments

## Additional Resources

- [GitHub Pages Documentation](https://docs.github.com/en/pages)
- [GitHub Actions Workflow Syntax](https://docs.github.com/en/actions/reference/workflow-syntax-for-github-actions)
- [Vite Static Deployment Guide](https://vitejs.dev/guide/static-deploy.html)
