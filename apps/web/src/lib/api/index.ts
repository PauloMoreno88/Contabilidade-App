import { httpApi, type Api } from "./http";
import { mockApi } from "./mock";

/** Set at build time. Mock only for local work without apps/api running. */
export const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === "true";

/** The only module the UI imports to talk to the backend. */
export const api: Api = USE_MOCK ? mockApi : httpApi;
export { ApiError } from "./http";
