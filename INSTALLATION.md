# Installation Guide

## Installing the Extension in Chrome/Edge

### Step 1: Prepare the Extension

1. Download or clone this repository to your local machine
2. Ensure all files are present in the `diagram` directory

### Step 2: Create Icons (Important!)

The extension requires icon files. You have two options:

#### Option A: Use the provided SVG to create PNG icons

1. Open `assets/icons/icon.svg` in a browser
2. Take a screenshot or use a tool to convert to PNG
3. Create three PNG files:
   - `icon16.png` (16x16 pixels)
   - `icon48.png` (48x48 pixels)
   - `icon128.png` (128x128 pixels)
4. Save them in the `assets/icons/` directory

#### Option B: Use an online icon generator

1. Visit https://icon.kitchen/ or similar service
2. Create an icon with diagram/flowchart theme
3. Download the icon pack
4. Place the PNG files in `assets/icons/`

### Step 3: Load the Extension in Chrome

1. Open Google Chrome or Microsoft Edge
2. Navigate to the extensions page:
   - **Chrome**: `chrome://extensions/`
   - **Edge**: `edge://extensions/`
3. Enable **Developer mode** (toggle in the top-right corner)
4. Click **Load unpacked**
5. Select the `diagram` directory
6. The extension should now appear in your extensions list

### Step 4: Pin the Extension (Optional)

1. Click the puzzle piece icon in the browser toolbar
2. Find "Mermaid Diagram Editor & Viewer"
3. Click the pin icon to keep it visible in the toolbar

## Verifying Installation

1. Click the extension icon - you should see the popup
2. Click "New Diagram" - the editor should open in a new tab
3. Visit a webpage with Mermaid code blocks - they should be rendered automatically

## Troubleshooting

### Extension doesn't load

- Make sure all required files are present
- Check the browser console for errors
- Ensure manifest.json is valid

### Icons not showing

- Create PNG icon files as described in Step 2
- Make sure they are named exactly:
  - `icon16.png`
  - `icon48.png`
  - `icon128.png`

### Popup doesn't open

- Check if the extension is enabled
- Try reloading the extension
- Check browser console for errors

### Diagrams don't render

- Make sure you have internet connection (for loading Mermaid.js CDN)
- Check if the Mermaid code syntax is correct
- Look for errors in the browser console

## Updating the Extension

After making changes to the code:

1. Go to `chrome://extensions/` or `edge://extensions/`
2. Find the extension
3. Click the refresh/reload icon

## Uninstalling

1. Go to `chrome://extensions/` or `edge://extensions/`
2. Find "Mermaid Diagram Editor & Viewer"
3. Click **Remove**
4. Confirm the removal

## Next Steps

- Read the README.md for usage instructions
- Check out the templates in the popup
- Try creating your first diagram!

## Support

If you encounter issues:

1. Check the browser console (F12)
2. Verify all files are present
3. Ensure icons are created
4. Check the GitHub repository for known issues
