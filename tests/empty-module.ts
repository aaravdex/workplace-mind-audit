// Stub for `server-only` under Vitest. In the real Next runtime `server-only`
// enforces server-only usage; in tests it is a harmless no-op so we can import
// server modules (e.g. lib/scores-service.ts) directly.
export {};
