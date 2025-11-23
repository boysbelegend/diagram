# Mermaid Diagram Editor & Viewer

A powerful Chrome/Edge extension for creating, editing, and viewing Mermaid diagrams with live preview.

## Features

### Editor
- **Live Preview**: Real-time diagram rendering as you type
- **Multiple Diagram Types**: Support for flowcharts, sequence diagrams, class diagrams, state diagrams, ER diagrams, Gantt charts, pie charts, git graphs, and **C4 diagrams**
- **Templates**: Quick start with pre-built templates
- **Export**: Save diagrams as PNG, SVG, or text files
- **Dark Mode**: Toggle between light and dark themes
- **Auto-Save**: Automatically save your work
- **Zoom Controls**: Zoom in/out for detailed viewing

### Viewer
- **Auto-Render**: Automatically renders Mermaid code blocks on any webpage
- **Quick Actions**: Edit, copy, or view code with one click
- **Smart Detection**: Finds and renders all Mermaid diagrams on the page

### Storage
- **Local Storage**: All diagrams saved locally
- **Recent Diagrams**: Quick access to your recent work
- **Import/Export**: Backup and restore your diagrams

## Supported Diagram Types

1. **Flowchart** - Process flows and decision trees
2. **Sequence Diagram** - Interaction sequences between components
3. **Class Diagram** - Object-oriented design diagrams
4. **State Diagram** - State machines and workflows
5. **ER Diagram** - Entity relationship diagrams for databases
6. **Gantt Chart** - Project timelines and schedules
7. **Pie Chart** - Data visualization
8. **Git Graph** - Git branching diagrams
9. **C4 Diagram** - Software architecture diagrams (Context, Container, Component)

## Installation

### From Source

1. Clone or download this repository
2. Open Chrome/Edge and navigate to `chrome://extensions/`
3. Enable "Developer mode"
4. Click "Load unpacked"
5. Select the `diagram` directory

### From Chrome Web Store

(Coming soon)

## Usage

### Creating a Diagram

1. Click the extension icon in your browser toolbar
2. Click "New Diagram" or select a template
3. Type your Mermaid code in the editor
4. See the live preview on the right
5. Save your diagram using Ctrl+S or the Save button

### Viewing Diagrams on Web Pages

1. Visit any webpage with Mermaid code blocks
2. The extension automatically renders them
3. Click "Edit" to open in the full editor
4. Click "Copy" to copy the code
5. Click "View Code" to see the original code

### Keyboard Shortcuts

- `Ctrl+S` - Save diagram
- `Ctrl+Enter` - Update preview
- `Ctrl++` - Zoom in
- `Ctrl+-` - Zoom out
- `Ctrl+0` - Reset zoom

## Project Structure

```
diagram/
├── manifest.json           # Extension manifest
├── src/
│   ├── popup/             # Extension popup
│   ├── editor/            # Full page editor
│   ├── content/           # Content script for viewing
│   ├── background/        # Background service worker
│   └── utils/             # Utility functions
├── assets/
│   ├── icons/             # Extension icons
│   └── templates/         # Diagram templates
├── styles/                # Common styles
└── README.md
```

## Development

### Prerequisites

- Chrome or Edge browser
- Basic knowledge of HTML, CSS, and JavaScript

### Setup

1. Clone the repository
2. Make your changes
3. Load the extension in Chrome (see Installation)
4. Test your changes

### Building

No build process required - this is a vanilla JavaScript extension.

## Technologies

- **Manifest V3** - Latest Chrome extension API
- **Mermaid.js** - Diagram rendering library
- **Chrome Storage API** - Local data storage
- **Chrome Extension APIs** - Context menus, tabs, etc.

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Credits

- [Mermaid.js](https://mermaid.js.org/) - Diagram rendering
- Icons - (Add your icon source here)

## Support

For bugs or feature requests, please open an issue on GitHub.

## Roadmap

- [ ] Cloud sync support
- [ ] Collaboration features
- [ ] More export formats (PDF)
- [ ] Custom themes
- [ ] Diagram version history
- [ ] Import from various formats
- [ ] AI-powered diagram suggestions

## Version History

### v1.0.0 (Initial Release)
- Basic editor with live preview
- Support for 9 diagram types including C4
- Auto-render on web pages
- Export to PNG/SVG
- Local storage
- Dark mode
- Templates

---

Made with ❤️ for the diagramming community
