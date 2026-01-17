A2UI v0.8 Ink wrapper MVP.

This library renders a minimal subset of A2UI components using Ink and React. It supports beginRendering, surfaceUpdate, dataModelUpdate, adjacency-list rendering, and basic user actions for input, selection, and buttons.

Use npm run demo to launch the sample surface renderer.

## Supported Features
- A2UI v0.8 render gate: beginRendering, surfaceUpdate, dataModelUpdate
- Adjacency-list tree reconstruction with explicit children and template lists
- Data binding via `BoundValue` (path + literal fallbacks)
- Ink-backed components: Text, Box, Spacer, Input, Select, Button, Checkbox, RadioGroup, List, Tabs, Table, Slider, Modal, Divider, Image, Chart
- Focus management with Tab / Shift+Tab navigation
- Action dispatch: onPress, onChange, onSubmit, onSelect

## Implementation Guide
1. Create a renderer instance with `createA2uiInkRenderer`.
2. Send A2UI server messages in this order:
	- surfaceUpdate: component catalog and root ID
	- dataModelUpdate: initial state
	- beginRendering: unlock rendering
3. Handle `userAction` callbacks to round-trip input back to your A2UI server.

## Usage with A2UI
Create the renderer, stream A2UI messages into `handleMessage`, and forward user actions back to your server.

Example flow:
1. `surfaceUpdate` provides the component graph.
2. `dataModelUpdate` supplies initial data.
3. `beginRendering` allows the client to render.

Use the `onUserAction` callback to capture input and selection events.

Recommended entry points:
- Public API: [src/index.ts](src/index.ts)
- Renderer core: [src/renderer.ts](src/renderer.ts)
- Component registry: [src/catalog.ts](src/catalog.ts)
- Binding and tree build: [src/binding.ts](src/binding.ts) and [src/tree.ts](src/tree.ts)

## Future Plan
- Add more standard catalog components (checkbox, radio, list view, tabs)
- Styling parity improvements (alignment, borders, padding presets)
- Better input controls (multi-line input, validation, masking)
- Multi-surface support in a single process
- Performance tuning for large dynamic lists
