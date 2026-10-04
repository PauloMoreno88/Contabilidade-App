import { mockApi } from "./mock";

/**
 * The only module the UI imports to talk to the backend.
 * When apps/api is ready, replace mockApi with an HTTP client against
 * NEXT_PUBLIC_API_URL that keeps the same method signatures.
 */
export const api = mockApi;
