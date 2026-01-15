# Hostinger Auto-Deployment Setup Guide

This guide explains how to set up automatic deployment from GitHub to your Hostinger website (www.quintbeauty.com).

## How It Works

Whenever you push changes to the `main` branch on GitHub, a GitHub Action automatically deploys your website files to Hostinger via FTP.

## Setup Instructions

### 1. Get Your Hostinger FTP Credentials

1. Log into your Hostinger account at https://hostinger.com
2. Navigate to **Hosting** → Select your domain (quintbeauty.com)
3. Find **FTP Accounts** section
4. Note down the following information:
   - **FTP Host/Server** (e.g., `ftp.quintbeauty.com` or IP like `123.45.67.89`)
   - **FTP Username** (usually your domain or account username)
   - **FTP Password** (create one if you don't have it)
   - **FTP Port** (usually `21` for FTP)
   - **Remote Directory** (usually `/public_html` or `/domains/quintbeauty.com/public_html`)

### 2. Add GitHub Secrets

1. Go to your GitHub repository: https://github.com/aarushdubey/Quint_Beauty
2. Click **Settings** (top menu)
3. In the left sidebar, click **Secrets and variables** → **Actions**
4. Click **New repository secret** button
5. Add the following secrets one by one:

   **Secret 1:**
   - Name: `FTP_SERVER`
   - Value: Your FTP host (e.g., `ftp.quintbeauty.com`)

   **Secret 2:**
   - Name: `FTP_USERNAME`
   - Value: Your FTP username

   **Secret 3:**
   - Name: `FTP_PASSWORD`
   - Value: Your FTP password

### 3. Update the Workflow File (if needed)

Open `.github/workflows/deploy.yml` and update the `server-dir` line if needed:

```yaml
server-dir: /public_html/  # Change to your actual path
```

Common Hostinger paths:
- `/public_html/` (most common)
- `/domains/quintbeauty.com/public_html/`
- `/quintbeauty.com/public_html/`

### 4. Test the Deployment

1. Commit and push the workflow file to GitHub:
   ```bash
   git add .github/workflows/deploy.yml
   git commit -m "Add auto-deployment workflow"
   git push origin main
   ```

2. Go to your GitHub repository → **Actions** tab
3. You should see a workflow run starting
4. Wait for it to complete (green checkmark = success)
5. Check your website at www.quintbeauty.com to verify the deployment

## How to Use

From now on, whenever you want to update your website:

1. Make your changes locally
2. Commit the changes:
   ```bash
   git add .
   git commit -m "Your commit message"
   ```
3. Push to GitHub:
   ```bash
   git push origin main
   ```
4. GitHub Actions will automatically deploy to Hostinger
5. Check the **Actions** tab on GitHub to monitor deployment status

## Troubleshooting

### Deployment Fails

- **Check FTP credentials**: Make sure all secrets are correct
- **Check remote path**: Verify the `server-dir` in `deploy.yml` matches your Hostinger setup
- **Check GitHub Actions logs**: Go to Actions tab → Click on the failed workflow → View logs

### Files Not Updating

- Clear your browser cache
- Check if the files are in the correct directory on Hostinger (use File Manager)
- Verify the deployment succeeded in GitHub Actions

### Permission Issues

- Make sure your FTP user has write permissions
- Try using a different FTP user if available

## Alternative: SFTP (More Secure)

If Hostinger supports SFTP (usually on port 22), you can use a more secure deployment:

1. Update `.github/workflows/deploy.yml`:
   ```yaml
   - name: Deploy to Hostinger via SFTP
     uses: easingthemes/ssh-deploy@v4.1.10
     with:
       SSH_PRIVATE_KEY: ${{ secrets.SSH_PRIVATE_KEY }}
       REMOTE_HOST: ${{ secrets.FTP_SERVER }}
       REMOTE_USER: ${{ secrets.FTP_USERNAME }}
       TARGET: /public_html/
   ```

2. Generate SSH keys and add the private key as a GitHub secret

## Support

For issues with:
- **Hostinger FTP**: Contact Hostinger support
- **GitHub Actions**: Check the Actions tab logs
- **Workflow configuration**: Review this guide or GitHub Actions documentation
