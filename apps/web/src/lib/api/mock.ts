import { createLeadSchema, type CreateLeadInput } from "@exactra/shared";

/**
 * In-browser stand-in for apps/api. Validates input with the same zod schemas
 * the API uses, so a payload that passes here should pass there too.
 */

const delay = (ms = 500) => new Promise((r) => setTimeout(r, ms));
const id = (prefix: string) => `${prefix}_${Math.random().toString(36).slice(2, 10)}`;

export const mockApi = {
  async createLead(input: CreateLeadInput): Promise<{ id: string }> {
    createLeadSchema.parse(input);
    await delay();
    return { id: id("lead") };
  },
};
