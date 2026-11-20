# Spec: drawer "Criar usuário" no painel admin

- Versão: 1.0 · Estado: implementada · Workflow: `standard-development` v1.1
- Fonte: pedido do usuário em 10/11/2026 ("abrir um drawer lateral de 600px, com select Cliente ou Administrador").
- Decisão (usuário, 10/11/2026): administrador recebe **senha inicial digitada no formulário**, repassada por quem cadastra; sem convite por e-mail.

## Objetivo
Cadastrar cliente ou administrador sem sair da lista de clientes.

## Escopo
- Botão "Criar usuário" em `/admin/clientes` abre um drawer à direita, 600 px (largura total no celular).
- Select "Tipo de usuário": Cliente (padrão) ou Administrador.
- Cliente: mesmos campos e regras do antigo `/admin/clientes/novo` (`POST /admin/customers`); ao salvar, abre o cliente criado.
- Administrador: nome, e-mail e senha inicial (8 a 128 caracteres); cria pelo endpoint do Better Auth `admin/create-user` com `role: "admin"`, que já exige sessão de admin.
- A rota `/admin/clientes/novo` deixa de existir.

## Fora do escopo
Convite por e-mail para admin, lista ou remoção de admins, outros papéis, mudanças no `apps/api` ou no `packages/shared`.

## Requisitos e critérios
| ID | Requisito | Critério de aceitação |
|---|---|---|
| REQ-001 | Drawer lateral | CA-001: clicar em "Criar usuário" abre `<dialog>` à direita com 600 px; Esc, X ou clique fora fecham sem salvar. |
| REQ-002 | Select de tipo | CA-002: trocar o select alterna os campos de cliente e de administrador. |
| REQ-003 | Cliente | CA-003: envio válido chama `adminCreateCustomer` e leva a `/admin/cliente?id=…&aba=access`; CPF/CNPJ inválido mostra erro. Valor em reais vira centavos (teste unitário). |
| REQ-004 | Administrador | CA-004: envio chama `authClient.admin.createUser` com `role: "admin"`; sucesso fecha o drawer e mostra aviso na lista; e-mail já usado ou senha fora do tamanho mostram mensagem própria (teste unitário do mapeamento). |

## Validação
`pnpm --filter web test` (unitários de `src/lib/new-user.ts`), lint e build do web. Conferência manual com `NEXT_PUBLIC_USE_MOCK=true`. E2E desativado pelo workflow.
