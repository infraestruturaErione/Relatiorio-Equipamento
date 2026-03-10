# Relatorio-Campo

Sistema interno web para cadastro e validacao de configuracoes de equipamentos.

## Tecnologias

- Backend: Node.js + Express
- Banco: PostgreSQL
- Frontend: React + Vite + TypeScript

## Docker (100% automatico)

Fluxo profissional com tudo subindo automatico:

- PostgreSQL
- Execucao automatica de `schema.sql` e `seed.sql` no primeiro start do banco
- Backend API
- Frontend servido por Nginx

### Subir tudo

1. Copie `.env.example` para `.env` na raiz (opcional, para customizar portas/senhas).
2. Rode:

```bash
docker compose up --build
```

Acessos:

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:4000/api`
- Postgres (host): `localhost:5433`

### Resetar banco/init scripts

Os scripts de init do Postgres rodam apenas quando o volume e criado.
Para reset completo e reexecutar `schema.sql` + `seed.sql`:

```bash
docker compose down -v
docker compose up --build
```

## Funcionalidades implementadas

- Login com JWT
- Cadastro de configuracao de equipamento
- Listagem geral de configuracoes
- Validacao e reprovacao de configuracoes
- Regra de negocio: o mesmo analista que configurou **nao pode** validar/reprovar
- Dashboard com resumo (`PENDING`, `APPROVED`, `REJECTED`)
- Tela de validacoes pendentes
- Historico de configuracoes
- Relatorios com:
  - tabela em tela
  - busca por **equipamento** e **IP**
  - exportacao para Excel (filtrada)
  - exportacao para PDF (filtrada)
  - QR Code no PDF apontando para `/configs/{id}`
- Tela de detalhe por configuracao: `/configs/:id` (aberta via QR)
- Validacao backend de formato para IP, MAC e VLAN
- Tema visual com alternancia `Dark/Light`
- Logout com redirecionamento imediato

## Estrutura de paginas

- Login
- Painel
- Nova Configuracao
- Validacoes Pendentes
- Historico
- Relatorios
- Detalhes da Configuracao (`/configs/:id`)

## Estrutura do banco

Tabela principal: `equipment_configs`

Campos:

- `id`
- `equipment`
- `ip`
- `mask`
- `gateway`
- `vlan`
- `service`
- `mac`
- `username`
- `password`
- `configured_by`
- `validated_by`
- `status`
- `notes`
- `created_at`
- `validated_at`

Status:

- `PENDING`
- `APPROVED`
- `REJECTED`

Scripts SQL:

- `backend/sql/schema.sql`
- `backend/sql/seed.sql`

## Configuracao do backend

Entre em `backend/` e crie `.env` a partir de `.env.example`.

Voce pode usar **ou** `DATABASE_URL` **ou** configuracao por campos separados.

Exemplo usando `DATABASE_URL`:

```env
PORT=4000
DATABASE_URL=postgresql://postgres:SUA_SENHA@localhost:5433/relatorio_campo
JWT_SECRET=devsecret
WEB_BASE_URL=http://localhost:5173
```

Exemplo usando campos separados:

```env
PORT=4000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=equipment_db
DB_USER=postgres
DB_PASSWORD=postgres
JWT_SECRET=change_me
WEB_BASE_URL=http://localhost:5173
```

### Comandos backend

```bash
npm install
npm run db:init
npm run dev
```

- `npm run db:init`: cria schema e aplica seed no banco configurado no `.env`
- API base: `http://localhost:4000/api`

## Configuracao do frontend

Entre em `frontend/` e crie `.env` a partir de `.env.example`:

```env
VITE_API_URL=http://localhost:4000/api
```

### Comandos frontend

```bash
npm install
npm run dev
```

- App web: `http://localhost:5173`

## Usuarios seed

- `analyst1` / `123456`
- `analyst2` / `123456`

## Observacoes

- Para melhor desempenho da busca por equipamento, o schema inclui indice:
  - `idx_equipment_configs_equipment`
- A exportacao no modulo de relatorios respeita os filtros aplicados por equipamento/IP.
