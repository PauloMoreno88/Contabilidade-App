import { HttpException, HttpStatus, UseGuards, type CanActivate, type ExecutionContext } from '@nestjs/common';
import type { Request, Response } from 'express';

const MAX_KEYS = 10_000;

/** IPv6 clients get a whole /64, so they are keyed by that prefix; IPv4 (and IPv4-mapped) by address. */
export function clientKey(ip: string): string {
  if (!ip.includes(':') || ip.includes('.')) return ip;
  const [head, tail = ''] = ip.split('::');
  const left = head ? head.split(':') : [];
  const right = tail ? tail.split(':') : [];
  const groups = [...left, ...Array<string>(Math.max(0, 8 - left.length - right.length)).fill('0'), ...right];
  return groups.slice(0, 4).map((g) => g.toLowerCase().replace(/^0+(?=.)/, '')).join(':') + '::/64';
}

/**
 * Fixed window per client, kept in memory. Enough because the API runs a single
 * instance (render*.yaml). `trust proxy` in setup-app.ts gives the real IP; check it
 * on Render before paid traffic (docs/lancamento-producao.md).
 */
class RateLimitGuard implements CanActivate {
  private readonly hits = new Map<string, { count: number; resetAt: number }>();

  constructor(
    private readonly limit: number,
    private readonly windowMs: number,
  ) {}

  canActivate(ctx: ExecutionContext): boolean {
    const http = ctx.switchToHttp();
    const key = clientKey(http.getRequest<Request>().ip ?? 'unknown');
    const now = Date.now();
    const hit = this.hits.get(key);
    if (!hit || hit.resetAt <= now) {
      if (this.hits.size >= MAX_KEYS) {
        for (const [k, v] of this.hits) if (v.resetAt <= now) this.hits.delete(k);
        if (this.hits.size >= MAX_KEYS) this.hits.clear(); // hard cap: fail open rather than grow
      }
      this.hits.set(key, { count: 1, resetAt: now + this.windowMs });
      return true;
    }
    if (++hit.count <= this.limit) return true;
    http.getResponse<Response>().setHeader('Retry-After', String(Math.ceil((hit.resetAt - now) / 1000)));
    throw new HttpException('Muitas tentativas seguidas. Tente de novo em alguns minutos.', HttpStatus.TOO_MANY_REQUESTS);
  }
}

/** At most `limit` requests per client every `windowMs` on the decorated route. */
export const RateLimit = ({ limit, windowMs }: { limit: number; windowMs: number }) =>
  UseGuards(new RateLimitGuard(limit, windowMs));

/** Generous enough for many people behind one mobile carrier IP (CGNAT). */
export const LEAD_LIMIT = { limit: 30, windowMs: 10 * 60_000 } as const;
export const CHECKOUT_LIMIT = { limit: 20, windowMs: 10 * 60_000 } as const;
