# Icons

This directory should contain the extension icons in PNG format:

- `icon16.png` - 16x16 pixels (toolbar icon)
- `icon48.png` - 48x48 pixels (extension management page)
- `icon128.png` - 128x128 pixels (Chrome Web Store)

## How to Create Icons

You can create icons using any image editing software. Here are some suggestions:

### Using Online Tools

1. **Favicon Generator** (https://realfavicongenerator.net/)
   - Upload a square image (at least 260x260)
   - Download the generated icons

2. **IconGenerator** (https://icon.kitchen/)
   - Create icons from text or upload an image
   - Download in multiple sizes

### Design Guidelines

- Use a simple, recognizable design
- Make sure the icon is clear at small sizes (16x16)
- Use colors that stand out but fit the extension theme
- Consider using a diagram or flowchart symbol

### Suggested Icon Design

For a Mermaid diagram editor, consider:
- A flowchart node shape
- A diagram symbol
- The letter "M" in a stylized way
- A combination of geometric shapes representing diagrams

### Quick SVG Icon Template

If you want to create an SVG icon first, here's a template:

```svg
<svg width="128" height="128" xmlns="http://www.w3.org/2000/svg">
  <rect width="128" height="128" fill="#667eea" rx="16"/>
  <circle cx="64" cy="40" r="12" fill="white"/>
  <circle cx="40" cy="88" r="12" fill="white"/>
  <circle cx="88" cy="88" r="12" fill="white"/>
  <line x1="64" y1="52" x2="40" y2="76" stroke="white" stroke-width="3"/>
  <line x1="64" y1="52" x2="88" y2="76" stroke="white" stroke-width="3"/>
</svg>
```

Convert this SVG to PNG at the required sizes using tools like:
- GIMP
- Inkscape
- Online converters (CloudConvert, etc.)

## Temporary Icons

For development/testing, you can use emoji or text-based icons temporarily, but replace them with proper PNG icons before publishing.
