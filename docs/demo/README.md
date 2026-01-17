# A2UI Ink Demo Site

A Vite-powered demo page and integration guide for the A2UI Ink library.

## Features

- **Component Catalog**: Browse all available components with examples and prop documentation
- **Interactive Terminal**: Web-based terminal preview using xterm.js
- **JSON Playground**: Paste your A2UI JSON and see it rendered in real-time
- **Integration Guide**: Step-by-step instructions for getting started

## Running Locally

This demo is a Vite app with Ink running in a browser-based xterm instance.

```bash
cd docs/demo
npm install
npm run dev
```

Build for static deployment:

```bash
npm run build
npm run preview
```

## Structure

```
docs/demo/
├── index.html        # Main HTML page
├── vite.config.js    # Vite configuration (Node polyfills)
├── package.json      # Demo dependencies and scripts
├── src/
│   ├── main.js        # App logic + Ink/xterm bridge
│   └── styles.css     # Styling
└── README.md         # This file
```

## Dependencies

- [ink](https://github.com/vadimdemedes/ink) - React renderer for terminal UIs
- [xterm.js](https://xtermjs.org/) - Terminal emulation
- [vite-plugin-node-polyfills](https://github.com/davidmyersdev/vite-plugin-node-polyfills) - Node stream polyfills

## Customization

### Adding New Components
1. Add a new section in `index.html` following the existing pattern
2. Update the example JSON in `src/main.js`
3. Update the navigation in the sidebar

### Theming
Edit the CSS variables in `src/styles.css`:
```css
:root {
  --bg-primary: #1a1a2e;
  --accent-primary: #00d9ff;
  /* ... */
}
```

## Browser Support

Works in all modern browsers that support:
- ES6+ JavaScript
- CSS Grid & Flexbox
- WebGL (for xterm.js performance)
