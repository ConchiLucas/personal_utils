# Developer Skills & Code Quality Checklist (roadmap.sh)

Use this checklist during PR reviews, code refactoring, or feature implementations.

---

## 1. Code Quality & Standards

- [ ] **TypeScript Types**:
  - [ ] No `any` types used.
  - [ ] Explicit return types on public functions.
  - [ ] Appropriate use of utility types (`Partial`, `Readonly`, `Omit`).
- [ ] **Error Handling**:
  - [ ] Malformed user inputs handled gracefully without throwing unhandled exceptions.
  - [ ] Meaningful error messages displayed to the user.
- [ ] **Security**:
  - [ ] No unsafe HTML injection (`v-html`) without `DOMPurify`.
  - [ ] No sensitive credentials exposed in client-side code.

---

## 2. Performance & Responsiveness

- [ ] **Non-blocking Main Thread**:
  - [ ] Long computations (> 50ms) moved to Web Workers.
- [ ] **Memory & Event Listeners**:
  - [ ] All event listeners and timers cleaned up on component unmount (`onUnmounted`).
- [ ] **Responsive Design**:
  - [ ] Layout verified on mobile screens (< 640px) and wide screens (> 1200px).
  - [ ] Dark mode and Light mode both look polished with proper text contrast.

---

## 3. Testing Coverage

- [ ] **Unit Tests (Vitest)**:
  - [ ] Core algorithms covered by unit tests.
  - [ ] Edge cases tested (empty strings, undefined, special symbols, Unicode, large inputs).
