import '@testing-library/jest-dom/vitest'

// jsdom tampoco implementa IntersectionObserver (usado por Reveal para animar al
// entrar en viewport) -- un stub inerte alcanza para tests, no se testea scroll real.
if (!('IntersectionObserver' in window)) {
  class MockIntersectionObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() { return [] }
  }
  // @ts-expect-error -- stub mínimo, no implementa la interfaz completa
  window.IntersectionObserver = MockIntersectionObserver
}

// jsdom no implementa matchMedia -- lo necesitan los componentes que respetan
// prefers-reduced-motion (ver src/components/landing/Reveal.tsx).
if (!window.matchMedia) {
  window.matchMedia = (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }) as unknown as MediaQueryList
}
