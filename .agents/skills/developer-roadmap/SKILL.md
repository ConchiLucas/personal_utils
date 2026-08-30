---
name: developer-roadmap
description: >-
  Comprehensive guide and structured technical reference based on Developer Roadmap (roadmap.sh).
  Use this skill to guide frontend, backend, and full-stack technical learning paths, skill tree evaluations,
  architectural best practices, and code quality checklists.
---

# Developer Roadmap (roadmap.sh) Skill

This skill embeds the industry-standard developer learning paths and technical competencies defined by [roadmap.sh](https://roadmap.sh) (Developer Roadmap, 300k+ GitHub Stars) into your development workflows.

---

## 🧭 Core Roadmap Domains

When designing, reviewing, or implementing features, evaluate the code against the relevant technical stages:

```
                  ┌───────────────────────────────┐
                  │   Internet & Web Fundamentals │
                  │  (HTTP/3, DNS, Browsers, SSL) │
                  └───────────────┬───────────────┘
                                  ▼
                  ┌───────────────────────────────┐
                  │    HTML & Semantic Standards  │
                  │   (Accessibility / WAI-ARIA)  │
                  └───────────────┬───────────────┘
                                  ▼
         ┌────────────────────────┴────────────────────────┐
         ▼                                                 ▼
┌──────────────────┐                              ┌──────────────────┐
│   Modern CSS     │                              │   JavaScript     │
│ (Flex/Grid/Uno)  │                              │ (ESNext/Workers) │
└────────┬─────────┘                              └────────┬─────────┘
         │                                                 │
         └────────────────────────┬────────────────────────┘
                                  ▼
                  ┌───────────────────────────────┐
                  │      TypeScript Mastery       │
                  │ (Strict Types, Generics, Zod) │
                  └───────────────┬───────────────┘
                                  ▼
                  ┌───────────────────────────────┐
                  │  Component Frameworks & State │
                  │ (Vue 3, Pinia, React, Next)   │
                  └───────────────┬───────────────┘
                                  ▼
                  ┌───────────────────────────────┐
                  │      Build & Engineering      │
                  │   (Vite, Vitest, Playwright)  │
                  └───────────────┬───────────────┘
                                  ▼
                  ┌───────────────────────────────┐
                  │   Web Performance & Security  │
                  │ (Web Vitals, XSS/CSP, Workers)│
                  └───────────────────────────────┘
```

---

## 🛠️ Step-by-Step Evaluation Workflows

### 1. Frontend Skill Tree & Implementation Verification
When writing or refactoring frontend code, apply this checklist:

1. **Semantic & Accessibility (a11y)**:
   - Ensure semantic HTML tags (`<main>`, `<nav>`, `<section>`, `<article>`, `<header>`, `<footer>`).
   - Interactive elements must be keyboard-navigable (`tabindex`, focus rings, `aria-label` for icon buttons).
2. **Modern CSS & Layout**:
   - Prefer modern layout tools: CSS Grid and Flexbox.
   - Use design tokens or atomic CSS (Tailwind / UnoCSS / CSS variables).
   - Ensure responsive breakpoints (`sm`, `md`, `lg`, `xl`) and Dark/Light theme support.
3. **Type Safety (TypeScript)**:
   - Zero `any` policy. Use explicit interfaces, types, and generic parameters.
   - Validate runtime external data (JSON, User inputs) using Zod or custom Type Guards.
4. **State & Reactive Data Flow**:
   - Decouple business/computational logic (`*.service.ts`) from UI components (`*.vue` / `*.tsx`).
   - Use Pinia or lightweight state stores for cross-component shared state.
5. **Performance & Worker Delegation**:
   - Heavy operations (e.g. hashing, big JSON parsing, regex matching over large text, compression) must run off the main thread via **Web Workers**.
   - Optimize bundle size with dynamic imports (`() => import(...)`).

---

## 📚 Detailed Reference Guides

Refer to the included sub-guides for in-depth knowledge:
* [Frontend Roadmap Deep Dive](references/frontend-roadmap.md)
* [Vue 3 & Modern Frontend Ecosystem Guide](references/vue-ecosystem.md)
* [Developer Skills & Code Quality Checklist](references/developer-checklist.md)
