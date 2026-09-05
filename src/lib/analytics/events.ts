/**
 * Product analytics boundary (frontend spec §25).
 *
 * PRODUCT ANALYTICS is deliberately distinct from the backend's
 * authoritative LEARNING DOMAIN EVENTS. MVP ships a no-op adapter —
 * no third-party scripts (CSP `script-src 'self'`), no PII, no quiz
 * answers. A backend ingestion endpoint is a documented future gap.
 */
export interface ProductEvent {
  name:
    | "module_viewed"
    | "lesson_viewed"
    | "lesson_started"
    | "lesson_completed"
    | "quiz_viewed"
    | "quiz_started"
    | "quiz_completed"
    | "resource_opened";
  properties: Record<string, string | number | boolean>;
}

export interface AnalyticsAdapter {
  track(event: ProductEvent): void;
}

const noopAdapter: AnalyticsAdapter = {
  track: (event) => {
    if (import.meta.env.DEV) {
      console.debug("[analytics:noop]", event.name, event.properties);
    }
  },
};

export const analytics: AnalyticsAdapter = noopAdapter;
