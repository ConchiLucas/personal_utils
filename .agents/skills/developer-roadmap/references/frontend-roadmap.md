# Frontend Developer Roadmap (roadmap.sh Reference)

This reference outlines the full technical landscape for modern Frontend Engineering based on [roadmap.sh/frontend](https://roadmap.sh/frontend).

---

## 1. Internet & Web Fundamentals
* **How the Web Works**: Client-Server Model, HTTP/1.1 vs HTTP/2 vs HTTP/3, QUIC.
* **DNS & Hosting**: DNS Resolution, Domain records, CDNs, Edge routing.
* **Browsers**: Rendering Engine (DOM Tree, CSSOM, Render Tree, Layout, Paint, Composite), V8 Event Loop, Microtasks & Macrotasks.

---

## 2. HTML & Semantic Standards
* **Semantic Elements**: `<header>`, `<main>`, `<nav>`, `<section>`, `<article>`, `<aside>`, `<footer>`.
* **Forms & Validation**: Modern HTML5 inputs, constraint validation API, FormData.
* **SEO & Metadata**: OpenGraph, Twitter Cards, JSON-LD Structured Data, Favicon packs.
* **Accessibility (a11y)**:
  * WCAG 2.2 AA standards.
  * WAI-ARIA roles, states, and properties (`aria-expanded`, `aria-hidden`, `aria-live`).
  * Focus management, keyboard trap avoidance, color contrast ratios (≥ 4.5:1).

---

## 3. Modern CSS & Styling
* **Layout Systems**: CSS Grid (subgrid, auto-fit/auto-fill), Flexbox (alignment, wrapping).
* **Modern CSS Features**: CSS Nesting, `@container` queries, `:has()`, `:is()`, `:where()`, CSS Custom Properties (Variables).
* **Utility-First & Modern Tooling**: Tailwind CSS v3/v4, UnoCSS, PostCSS, Sass/Less.
* **Component Styling**: Scoped CSS, CSS Modules, Tailwind / Atomic CSS.

---

## 4. JavaScript & TypeScript Mastery
* **ECMAScript Standards**: ES6+ (Optional chaining, Nullish coalescing, Destructuring, Modules, Top-level await).
* **Asynchronous Programming**: Promises, Async/Await, AbortController for cancelable requests.
* **Web APIs**: Web Storage (LocalStorage/SessionStorage), IndexedDB, Web Workers, Service Workers, BroadcastChannel, Clipboard API, Web Crypto API.
* **TypeScript Strictness**:
  * Strict mode (`strict: true`, `noImplicitAny`).
  * Utility types: `Partial`, `Required`, `Readonly`, `Pick`, `Omit`, `Record`, `ReturnType`.
  * Generics and Conditional Types.
  * Runtime schema validation with Zod.

---

## 5. Modern Frameworks & State Management
* **Component Architecture**: Single File Components (Vue SFC), Props & Emits, Slots, Provide/Inject.
* **Reactivity Model**: Vue 3 `ref`, `reactive`, `computed`, `watchEffect` vs React hooks.
* **State Management**:
  * Global Store: Pinia (Vue) / Zustand (React).
  * Server State / Caching: TanStack Query (Vue Query / React Query), SWR.
  * Local State: `useStorage`, `useDark`, `@vueuse/core`.

---

## 6. Build Systems & Tooling
* **Modern Bundlers**: Vite (ESBuild for dev, Rollup for prod), Turbopack, Rspack.
* **Package Managers**: pnpm (content-addressable storage, symlinks), npm, yarn.
* **Code Quality**: ESLint (Flat Config), Prettier, Stylelint, Git Hooks (Husky, lint-staged).

---

## 7. Testing & Quality Assurance
* **Unit Testing**: Vitest / Jest for pure utility functions, algorithmic services, and stores.
* **Component Testing**: Vue Test Utils / React Testing Library.
* **End-to-End (E2E) Testing**: Playwright / Cypress for user flow validation.

---

## 8. Web Performance & Optimization
* **Core Web Vitals**:
  * **LCP** (Largest Contentful Paint) < 2.5s.
  * **INP** (Interaction to Next Paint) < 200ms.
  * **CLS** (Cumulative Layout Shift) < 0.1.
* **Optimization Strategies**:
  * Route-level code splitting & dynamic component loading.
  * Image optimization (WebP/AVIF, lazy loading, responsive srcset).
  * Heavy computation offloading to Web Workers / WebAssembly.
  * Bundle analysis via `rollup-plugin-visualizer` or `vite-bundle-visualizer`.

---

## 9. Security Best Practices
* **XSS Prevention**: DOMPurify sanitization before rendering raw HTML (`v-html` / `dangerouslySetInnerHTML`).
* **Content Security Policy (CSP)**: Strict headers, restriction of `unsafe-eval` and `unsafe-inline`.
* **CORS & CSRF**: Proper Access-Control headers, SameSite cookies.
* **Client-Side Secrets**: Never bake API secret keys into client bundles; use backend proxy endpoints.
