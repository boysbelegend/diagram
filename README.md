# Mermaid Diagram Editor & Viewer

A powerful Chrome/Edge extension for creating, editing, and viewing Mermaid diagrams with live preview.

## Features

### Editor
- **Live Preview**: Real-time diagram rendering as you type
- **Multiple Diagram Types**: Support for flowcharts, sequence diagrams, class diagrams, state diagrams, ER diagrams, Gantt charts, pie charts, git graphs, and **C4 diagrams**
- **Syntax Highlighting**: Color-coded syntax for better readability
- **Auto-completion**: Smart suggestions for Mermaid keywords and syntax
- **Error Validation**: Real-time error detection and validation
- **Templates**: Quick start with pre-built templates for all diagram types
- **Export**: Save diagrams as PNG, SVG, HTML, Markdown, or text files
- **Dark Mode**: Toggle between light and dark themes
- **Auto-Save**: Automatically save your work with configurable intervals
- **Zoom Controls**: Zoom in/out for detailed viewing

### Diagram Library
- **Organized Library**: Browse and manage all your diagrams in one place
- **Search & Filter**: Find diagrams by title, type, or content
- **Grid/List View**: Switch between grid and list layouts
- **Quick Actions**: Edit, export, duplicate, or delete diagrams
- **Sort Options**: Sort by last modified, date created, or title

### Settings
- **Customizable**: Configure theme, editor preferences, and export settings
- **Editor Options**: Font size, tab size, line numbers, word wrap
- **Auto-save Settings**: Control auto-save behavior and intervals
- **Export Preferences**: Set default export format and quality
- **Data Management**: Import/export all diagrams, clear data

### Viewer
- **Auto-Render**: Automatically renders Mermaid code blocks on any webpage
- **Interactive Drag & Drop**: Reposition diagram nodes by dragging them
- **Layout Persistence**: Automatically saves and restores custom node positions
- **Quick Actions**: Edit, copy, view code, toggle drag mode, or reset layout
- **Smart Detection**: Finds and renders all Mermaid diagrams on the page
- **Dynamic Content**: Watches for new diagrams added to the page

### Storage
- **Local Storage**: All diagrams saved locally in browser
- **Layout Storage**: Custom node positions automatically saved per diagram
- **Recent Diagrams**: Quick access to your recent work in popup
- **Import/Export**: Backup and restore your diagrams as JSON
- **Storage Statistics**: View diagram count and storage usage

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

**Global Shortcuts:**
- `Ctrl+Shift+N` (Mac: `Cmd+Shift+N`) - Create new diagram
- `Ctrl+Shift+L` (Mac: `Cmd+Shift+L`) - Open diagram library

**Editor Shortcuts:**
- `Ctrl+S` - Save diagram
- `Ctrl+Enter` - Update preview
- `Ctrl++` - Zoom in
- `Ctrl+-` - Zoom out
- `Ctrl+0` - Reset zoom

### Interactive Node Repositioning

The viewer now supports interactive drag-and-drop for repositioning diagram nodes:

1. **Enable Drag Mode**: Click the "Drag Mode" button in the viewer
2. **Drag Nodes**: Click and drag any node to reposition it
3. **Auto-Save**: Positions are automatically saved to Chrome Storage
4. **Auto-Restore**: Custom positions are restored when you revisit the page
5. **Reset Layout**: Click "Reset Layout" to restore original positions

**Technical Details:**
- Each diagram is identified by a SHA-256 hash of its code
- Node positions are stored per-diagram in Chrome Storage
- Layouts persist across browser sessions
- Works with all diagram types that have repositionable nodes

## Project Structure

```
diagram/
├── manifest.json           # Extension manifest (Manifest V3)
├── src/
│   ├── popup/             # Extension popup UI
│   ├── editor/            # Full page editor with live preview
│   ├── library/           # Diagram library/management page
│   ├── settings/          # Settings configuration page
│   ├── content/           # Content script for web page viewing
│   ├── background/        # Background service worker
│   └── utils/             # Utility functions
│       ├── storage.js     # Storage management
│       ├── export.js      # Export functionality
│       ├── syntax-highlighter.js  # Syntax highlighting
│       ├── autocomplete.js        # Auto-completion
│       └── validator.js           # Code validation
├── assets/
│   ├── icons/             # Extension icons (16, 48, 128)
│   └── templates/         # Diagram templates with examples
├── styles/
│   └── common.css         # Shared styles and themes
├── tools/
│   └── generate-icons.html # Icon generation tool
├── test/
│   └── demo.html          # Test page with sample diagrams
├── README.md
└── INSTALLATION.md
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

### v1.1.0 (Current)
- Interactive drag-and-drop for diagram nodes
- Automatic layout persistence with Chrome Storage
- Reset layout functionality
- Settings page with comprehensive configuration options
- Diagram library with search, filter, and sort
- Advanced editor features (syntax highlighting, autocomplete, validation)
- Icon generator tool
- Test/demo page with examples

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
