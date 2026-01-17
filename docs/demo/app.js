// A2UI Ink Demo - Interactive Playground
(function() {
  'use strict';

  // DOM Elements
  const navLinks = document.querySelectorAll('.nav-link');
  const sections = document.querySelectorAll('.section');
  const jsonEditor = document.getElementById('jsonEditor');
  const renderBtn = document.getElementById('renderBtn');
  const loadExampleBtn = document.getElementById('loadExample');
  const clearTerminalBtn = document.getElementById('clearTerminal');
  const actionsLog = document.getElementById('actionsLog');
  const terminalContainer = document.getElementById('terminal');

  // Terminal instance
  let term = null;
  let fitAddon = null;
  let commandBuffer = '';
  let currentJson = null;
  const promptText = '\x1b[90ma2ui> \x1b[0m';

  // Initialize
  function init() {
    setupNavigation();
    setupTerminal();
    setupPlayground();
    
    // Handle hash navigation
    if (window.location.hash) {
      navigateToSection(window.location.hash.slice(1));
    }
  }

  // Navigation
  function setupNavigation() {
    navLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const sectionId = link.dataset.section;
        navigateToSection(sectionId);
        window.history.pushState(null, '', `#${sectionId}`);
      });
    });

    window.addEventListener('popstate', () => {
      if (window.location.hash) {
        navigateToSection(window.location.hash.slice(1));
      }
    });
  }

  function navigateToSection(sectionId) {
    // Update nav
    navLinks.forEach(link => {
      link.classList.toggle('active', link.dataset.section === sectionId);
    });

    // Update sections
    sections.forEach(section => {
      // Legacy script removed. Vite entry is src/main.js
    if ('literalObject' in value) return value.literalObject;
    
    if ('path' in value) {
      const result = getValueByPath(dataModel, value.path);
      if (result !== undefined) return result;
      // Fall back to literal if path doesn't resolve
      if ('literalString' in value) return value.literalString;
      if ('literalNumber' in value) return value.literalNumber;
      if ('literalBoolean' in value) return value.literalBoolean;
      return undefined;
    }
    
    if ('actionId' in value) return value;
    
    return value;
  }

  function getValueByPath(obj, path) {
    if (!path) return obj;
    const parts = path.split('.');
    let current = obj;
    for (const part of parts) {
      if (current === null || current === undefined) return undefined;
      current = current[part];
    }
    return current;
  }

  function setValueByPath(obj, path, value) {
    const parts = path.split('.');
    let current = obj;
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (typeof current[part] !== 'object' || current[part] === null) {
        current[part] = {};
      }
      current = current[part];
    }
    current[parts[parts.length - 1]] = value;
  }

  function getChildren(component, componentMap) {
    if (!component.children) return [];
    if (component.children.explicitList) {
      return component.children.explicitList
        .map(id => componentMap[id])
        .filter(Boolean);
    }
    return [];
  }

  function getBorderChars(style) {
    const styles = {
      single: { tl: '┌', tr: '┐', bl: '└', br: '┘', h: '─', v: '│' },
      double: { tl: '╔', tr: '╗', bl: '╚', br: '╝', h: '═', v: '║' },
      round: { tl: '╭', tr: '╮', bl: '╰', br: '╯', h: '─', v: '│' },
      bold: { tl: '┏', tr: '┓', bl: '┗', br: '┛', h: '━', v: '┃' }
    };
    return styles[style] || styles.single;
  }

  function getColorCode(color) {
    const colors = {
      black: '\x1b[30m',
      red: '\x1b[31m',
      green: '\x1b[32m',
      yellow: '\x1b[33m',
      blue: '\x1b[34m',
      magenta: '\x1b[35m',
      cyan: '\x1b[36m',
      white: '\x1b[37m'
    };
    return colors[color] || '';
  }

  function logAction(type, componentId, data = {}) {
    if (!actionsLog) return;
    
    // Remove placeholder if present
    const placeholder = actionsLog.querySelector('.placeholder');
    if (placeholder) placeholder.remove();
    
    const entry = document.createElement('div');
    entry.className = 'action-entry';
    entry.innerHTML = `
      <span class="action-type">${type}</span> → 
      <span class="action-component">${componentId}</span>
      ${Object.keys(data).length ? ` <code>${JSON.stringify(data)}</code>` : ''}
    `;
    actionsLog.appendChild(entry);
    actionsLog.scrollTop = actionsLog.scrollHeight;
  }

  function loadExample() {
    const example = {
      "surfaceId": "demo",
      "rootComponentId": "root",
      "components": [
        {
          "id": "root",
          "type": "Box",
          "props": {
            "direction": "column",
            "padding": 1,
            "borderStyle": "round"
          },
          "children": {
            "explicitList": ["title", "spacer1", "inputSection", "spacer2", "statusSection"]
          }
        },
        {
          "id": "title",
          "type": "Text",
          "props": {
            "text": { "path": "title" },
            "bold": true,
            "color": "cyan"
          }
        },
        { "id": "spacer1", "type": "Spacer" },
        {
          "id": "inputSection",
          "type": "Box",
          "props": { "direction": "column" },
          "children": { "explicitList": ["nameLabel", "nameInput", "checkbox"] }
        },
        {
          "id": "nameLabel",
          "type": "Text",
          "props": { "text": { "literalString": "Enter your name:" } }
        },
        {
          "id": "nameInput",
          "type": "Input",
          "props": {
            "value": { "path": "form.name" },
            "placeholder": "Your name here",
            "onChange": { "actionId": "nameChange" }
          }
        },
        {
          "id": "checkbox",
          "type": "Checkbox",
          "props": {
            "label": "Subscribe to newsletter",
            "checked": { "path": "form.subscribe" },
            "onChange": { "actionId": "toggleSubscribe" }
          }
        },
        { "id": "spacer2", "type": "Spacer" },
        {
          "id": "statusSection",
          "type": "Box",
          "props": { "direction": "column" },
          "children": { "explicitList": ["statusLabel", "statusTable", "submitBtn"] }
        },
        {
          "id": "statusLabel",
          "type": "Text",
          "props": { "text": { "literalString": "System Status:" } }
        },
        {
          "id": "statusTable",
          "type": "Table",
          "props": {
            "columns": { "path": "status.columns" },
            "rows": { "path": "status.rows" }
          }
        },
        {
          "id": "submitBtn",
          "type": "Button",
          "props": {
            "label": { "literalString": "Submit" },
            "onPress": { "actionId": "submit" }
          }
        }
      ],
      "dataModel": {
        "title": "A2UI Demo Form",
        "form": {
          "name": "John Doe",
          "subscribe": true
        },
        "status": {
          "columns": [
            { "key": "service", "header": "Service" },
            { "key": "status", "header": "Status" }
          ],
          "rows": [
            { "service": "API", "status": "Online" },
            { "service": "Database", "status": "Online" },
            { "service": "Cache", "status": "Warning" }
          ]
        }
      }
    };

    jsonEditor.value = JSON.stringify(example, null, 2);
  }

  // Initialize on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
