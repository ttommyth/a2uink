# A2UI Ink Wrapper Overview

## Purpose
This library renders A2UI v0.8 surfaces in a terminal using Ink. It is a lightweight client that accepts A2UI JSON messages, builds a UI tree from the adjacency list, resolves data bindings, renders the result, and emits `userAction` events to send back to your server/agent.

You can pair it with any A2UI message source (agent, service, or MCP server). The wrapper is transport-agnostic; it only needs parsed A2UI messages.

## Quick start
1. Create the renderer with `createA2uiInkRenderer`.
2. Forward incoming A2UI messages to `handleMessage`.
3. Listen to `onUserAction` and send those actions back to your server.

## Example integration (Node.js)
Below is a minimal example that connects a transport to the renderer. Replace the `receiveMessage` and `sendAction` functions with your MCP client or your own transport.

```ts
import { createA2uiInkRenderer } from "a2uink";

const renderer = createA2uiInkRenderer({
	onUserAction: (action) => {
		sendAction(action); // forward to your server/agent
	}
});

receiveMessage((message) => {
	renderer.handleMessage(message);
});
```

## Sample terminal output
The demo renders a catalog of components similar to this:

```
╭────────────────────────────────────────────────────╮
│ A2UI Ink Demo                                      │
│                                                    │
│ ┌ Input ────────────────────────────────────────┐  │
│ │ [name input field]                            │  │
│ └───────────────────────────────────────────────┘  │
│                                                    │
│ ┌ Choices ──────────────────────────────────────┐  │
│ │ [ ] Enable feature                            │  │
│ │ (o) Medium                                    │  │
│ │   Low                                         │  │
│ │   High                                        │  │
│ │ Select: Alpha                                 │  │
│ └───────────────────────────────────────────────┘  │
│                                                    │
│ ┌ Content ──────────────────────────────────────┐  │
│ │ • Item A                                      │  │
│ │ • Item B                                      │  │
│ │ • Item C                                      │  │
│ │ [Tab A] [Tab B] [Tab C]                        │  │
│ │ Panel A content                                │  │
│ │ Name     Status                                │  │
│ │ Service A OK                                   │  │
│ │ Service B Warn                                 │  │
│ └───────────────────────────────────────────────┘  │
│                                                    │
│ [ Submit ]                                         │
╰────────────────────────────────────────────────────╯
```

## Message lifecycle (v0.8)
The renderer expects the A2UI v0.8 flow:

1. `surfaceUpdate`
	 - Provides the component catalog and `rootComponentId`.
2. `dataModelUpdate`
	 - Provides initial data for bindings (and later updates).
3. `beginRendering`
	 - Signals the client to render (and optionally selects a catalog).

Subsequent `surfaceUpdate` and `dataModelUpdate` messages re-render the surface.

## Message types handled
The client accepts the following messages:

- `beginRendering`
	- Required fields: `surfaceId`
	- Optional: `catalogId`
	- Effect: unlock rendering for that surface.

- `surfaceUpdate`
	- Required fields: `surfaceId`, `rootComponentId`, `components` array
	- Effect: updates the component catalog and root reference.

- `dataModelUpdate`
	- Required fields: `surfaceId`, `dataModel` object
	- Effect: merges into the existing data model.

- `deleteSurface`
	- Required fields: `surfaceId`
	- Effect: removes surface and clears UI.

## How rendering works
### 1) Component storage
Each `surfaceUpdate` builds a map of components keyed by `id`.

### 2) Tree reconstruction
The tree is built from the adjacency list:
- `children.explicitList` is rendered in order.
- `children.template` renders multiple instances by binding a list from the data model.

### 3) Binding resolution
`BoundValue` is resolved as:
1. If `path` is present, read it from the data model.
2. If no value is found, use the literal (`literalString`, `literalNumber`, etc.).
3. If neither exists, value is `undefined`.

### 4) Ink rendering
The resolved tree is converted into Ink components. Renders are refreshed on message updates, user input, or terminal size changes.

## Component catalog
The wrapper implements a small, pragmatic subset of the standard catalog.

### Layout and text
- `Box` (layout container)
- `Spacer`
- `Text`

### Inputs
- `Input`
- `Select`
- `Checkbox`
- `RadioGroup`

### Navigation/content
- `Tabs`
- `List`

### Data display
- `Table`

### Actions
- `Button`

## Component behaviors and props
Below is a pragmatic reference for the supported props and actions.

### Text
- Props: `text`, `value`, `color`, `backgroundColor`, `bold`, `italic`, `underline`, `dim`

### Box
- Props: `direction`, `padding`, `paddingX`, `paddingY`, `margin`, `marginX`, `marginY`, `borderStyle`, `borderColor`, `width`, `height`, `flexGrow`, `flexShrink`, `justifyContent`, `alignItems`
- Children: explicit list or template.

### Input
- Props: `value`
- Optional props: `debounceMs` (number, defaults to 500 when `onChange` is set)
- Actions: `onChange`, `onSubmit`
- Keys: text input, Backspace/Delete, Enter.
- Behavior: when `value` is bound to a path, the client updates the local data model on every keystroke. `onChange` only fires when explicitly provided (use it for live search or server-side validation).

### Select
- Props: `items`, `selectedIndex`
- Actions: `onSelect`
- Keys: Up/Down to move, Enter/Space to select.

### Checkbox
- Props: `checked`, `label`
- Actions: `onChange`
- Keys: Enter/Space toggles.

### RadioGroup
- Props: `options`, `selectedIndex`
- Actions: `onChange`
- Keys: Up/Down to move, Enter/Space to select.

### Tabs
- Props: `tabs`, `selectedIndex`
- Actions: `onChange`
- Keys: Left/Right to move, Enter/Space to select.
- Children: the active child panel is rendered.

### List
- Props: `items`
- Read-only display list.

### Table
- Props: `columns`, `rows`
- Read-only table layout.

### Button
- Props: `label` or `text`
- Actions: `onPress`
- Keys: Enter/Space triggers.

## Focus and input
The wrapper maintains a focus registry:
- Use Tab to move forward.
- Use Shift+Tab to move backward.
- The focused component receives key handling.

Focusable components: Input, Select, Checkbox, RadioGroup, Tabs, Button.

## Styling defaults
Selectable components (Input, Select, Checkbox, RadioGroup, Tabs, Button) receive:
- Subtle borders
- Highlight on focus
- Bold label text

You can still pass custom props (e.g., `borderStyle`, `borderColor`) via A2UI props.

## A2UI integration with an agent
### Transport-agnostic contract
You only need to supply A2UI messages. The wrapper does not care about the transport.

### Typical loop
1. Agent/server sends `surfaceUpdate` and `dataModelUpdate`.
2. Client calls `handleMessage` for each message.
3. `beginRendering` starts rendering.
4. User actions are emitted via `onUserAction`.
5. You forward `userAction` to your agent/server.
6. The agent updates the data model and sends new messages.

## MCP + Sampling integration (high-level)
If your agent is an MCP server using Sampling:

1. MCP client requests UI from the server.
2. The MCP server uses Sampling to query the model for A2UI JSON.
3. The MCP server streams the A2UI messages to your renderer process.
4. `userAction` messages are sent back to the MCP server.
5. The MCP server uses those actions as new input to Sampling and emits updated A2UI.

The wrapper can sit in the same process as your MCP client or in a separate process.

## Minimal integration checklist
- Create renderer with `createA2uiInkRenderer({ onUserAction })`.
- Parse incoming A2UI messages (JSON).
- Call `handleMessage` for each message.
- Forward `userAction` back to your server.

## Integration guidelines: passing JSON into the renderer
You can feed A2UI JSON to the renderer in multiple ways. Choose the one that fits your app:

### 1) In-process function calls (recommended)
If your A2UI agent runs in the same Node process, parse the JSON and call `handleMessage` directly.

Flow:
- Agent produces A2UI JSON objects
- You call `renderer.handleMessage(message)`
- `onUserAction` forwards actions back to the agent

### 2) JSON lines (stdin or a socket)
If your agent is in another process, stream JSON lines over stdin, TCP, or a pipe. Parse each line into a message and call `handleMessage`.

### 3) File-based or parameter input (debug only)
For debugging, you can pass a JSON file path or a JSON string and load it at startup, then call `handleMessage` once for each message in the array.

## Transport tips
- Always parse and validate JSON before passing it to `handleMessage`.
- If you batch messages, preserve order: `surfaceUpdate` → `dataModelUpdate` → `beginRendering`.
- Avoid writing to stdout while Ink is rendering; use stderr for logs.

## Suggested code map
- Renderer core: src/renderer.ts
- Component registry: src/components/renderNode.ts
- Component implementations: src/components/*
- Bindings: src/binding.ts
- Tree builder: src/tree.ts

## Limitations (current MVP)
- A2UI v0.8 only.
- Small component subset (listed above).
- Terminal-only rendering.
- No advanced styling or custom layouts beyond Ink support.

## FAQ
### Why do I see multiple frames or overlap?
The renderer clears and re-renders on updates. Ensure your terminal supports full repainting, and avoid writing to stdout outside of Ink while rendering.

### Why doesn’t my input update the UI?
Make sure your agent responds to `userAction` with a new `dataModelUpdate`.

### Can I use a different catalog?
You can, but this wrapper only implements the component list above. Unsupported components will render as “Unsupported: <type>”.
