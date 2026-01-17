# A2UI Ink Demo Site

A Vite-powered demo page and integration guide for the A2UI Ink library.

## Features

- **Component Catalog**: Browse all available components with examples and prop documentation
- **Interactive Terminal**: Web-based terminal preview using xterm.js
- **JSON Playground**: Paste your A2UI JSON and see it rendered in real-time (full or simple mode)
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

Run the TypeScript typecheck:

```bash
npm run typecheck
```

## Structure

```
docs/demo/
├── index.html        # Main HTML page
├── vite.config.js    # Vite configuration (Node polyfills)
├── package.json      # Demo dependencies and scripts
├── src/
│   ├── App.tsx        # Demo UI + playground
│   ├── main.tsx       # React entrypoint
│   └── styles.css     # Styling
└── README.md          # This file
```

## Dependencies

- [ink](https://github.com/vadimdemedes/ink) - React renderer for terminal UIs
- [xterm.js](https://xtermjs.org/) - Terminal emulation
- [vite-plugin-node-polyfills](https://github.com/davidmyersdev/vite-plugin-node-polyfills) - Node stream polyfills

## Customization

### Adding New Components

1. Add a new section in `src/App.tsx` following the existing pattern
2. Update the example JSON in `src/App.tsx`
3. Update the navigation in the sidebar

### Simple Input Mode

The playground includes a **Simple Mode** toggle that lets users paste:

- A components array (no surface metadata)
- A separate dataModel object

The demo uses a fixed surface ID (`demo`) and root component ID (`root`) in this mode.

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
