# Vue 3 & Modern Frontend Toolbox Ecosystem Guide

This guide specializes roadmap.sh principles for modern Vue 3 application development, particularly suited for toolboxes, dashboards, and developer utilities (e.g. IT-Tools).

---

## 1. Project Architecture for Web Toolboxes

A robust, scalable toolbox architecture separates concerns into 4 distinct layers:

```
src/
├── tools/
│   ├── [tool-id]/
│   │   ├── [tool-id].service.ts    # Layer 1: Pure TypeScript Business Logic & Algorithms
│   │   ├── [tool-id].service.test.ts # Layer 2: Vitest Unit Tests for Algorithms
│   │   ├── [tool-id].vue           # Layer 3: Vue 3 UI Component (Forms, Previews)
│   │   └── index.ts                # Layer 4: Tool Metadata (routes, icons, keywords)
│   ├── tools.types.ts              # Global Tool Definition interfaces
│   └── index.ts                    # Global Tool Registry
```

---

## 2. Best Practices for Tool Development

### 1. The Pure Service Pattern
Never embed core algorithms inside Vue components. Keep algorithms pure in `.service.ts`:

```typescript
// Good: Pure function, 100% testable, zero DOM/Vue dependencies
export function parseCronExpression(cron: string): CronParseResult {
  if (!isValidCron(cron)) {
    return { valid: false, error: 'Invalid format' };
  }
  return { valid: true, schedule: describeCron(cron) };
}
```

### 2. Modern Vue 3 Composition API
* Use `<script setup lang="ts">`.
* Use `ref` for primitives, `shallowRef` for large/complex objects (e.g. Monaco Editor instances, Canvas contexts) to avoid deep reactivity overhead.
* Use `@vueuse/core` for common browser APIs (`useClipboard`, `useDark`, `useStorage`, `useEventListener`).

### 3. Asynchronous Tool Loading
To keep initial bundle size tiny (< 100KB), all tools must be loaded dynamically:

```typescript
export const myTool = defineTool({
  name: 'JSON to TypeScript',
  path: '/json-to-ts',
  component: () => import('./json-to-ts.vue'), // Lazy loaded chunk
  icon: IconCode,
  keywords: ['json', 'typescript', 'types', 'convert'],
});
```

---

## 3. UI/UX Standards for Utilities

1. **Auto-Copy & Quick Feedback**:
   - Provide one-click copy buttons with clear visual confirmation (e.g. tooltip "Copied!").
2. **Instant Input Clearing & Sample Data**:
   - Offer a "Paste Sample" button so users can instantly test the tool.
   - Offer a "Clear" button for quick reset.
3. **Responsive Split Views**:
   - Desktop: Side-by-side (Input on Left, Output on Right).
   - Mobile: Stacked view (Input on Top, Output below).
4. **Persistent Settings**:
   - Save user preferences (e.g. indentation spaces, tab style, favorite tools) in `localStorage` via `useStorage`.
