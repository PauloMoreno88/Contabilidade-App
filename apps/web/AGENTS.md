# apps/web — agente de front

Leia primeiro o `AGENTS.md` da raiz e o `docs/plano.md`. Este arquivo só traz o que é específico do front.

- Branch: `feat/web` (worktree próprio). Só altere `apps/web`. Mudanças em `packages/shared` exigem avisar o agente de back.
- Stack: Next.js 15 (App Router, `output: 'export'`: sem rotas de API, sem SSR dinâmico), React 19, TypeScript, Tailwind 4, Framer Motion, Lucide.
- Base visual: `docs/prototype/exactra-prototype-d.html`. Não copiar nada da Studio Fiscal. Preservar a identidade da Exactra (vermelho `#C82333`, fundo azul-petróleo escuro nos materiais do projeto; confira o site atual).
- Um componente por seção. **Copy, preços e listas ficam em arquivos de configuração** (nada de texto solto no JSX), porque o cliente ainda vai aprovar e pedir mudanças.
- Preços e regras vêm de `@exactra/shared` (`PLANS`, `totalPriceCents`, `calculateSimulation`). Nunca duplique no front.
- Enquanto o API não existe, use um client com mock que respeite os schemas zod de `@exactra/shared`. A troca para o API real deve ser mudar um módulo só (`lib/api`).
- Variável de ambiente: `NEXT_PUBLIC_API_URL` (ver `.env.example`).
- Para trabalho de design, use a skill `frontend-design`. Mobile first; teste 360px, 768px e 1280px.
- Admin (`/admin`): página cliente que usa o client do Better Auth contra o API (cookies compartilhados entre `www.` e `api.`).

Comandos: `pnpm --filter web dev`, `pnpm --filter web build`, `pnpm --filter web lint`.
