# Relatorio-Campo

Sistema web interno para cadastro, validacao e relatorios de configuracoes de equipamentos.

## Stack

- Backend: Node.js + Express
- Banco: PostgreSQL
- Frontend: React + Vite + TypeScript
- Infra local: Docker Compose (Postgres + API + Frontend)

## Subir com Docker

```bash
docker compose up --build
```

O servico `backend` aplica as migracoes automaticamente antes de iniciar a API.
Os builds de `frontend` e `backend` usam o contexto raiz do repositorio para incluir a pasta `shared/`.

Acessos:

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:4000/api`
- Postgres host: `localhost:5433`

### Reset completo do banco

```bash
docker compose down -v
docker compose up --build
```

Se o volume ja existir e voce atualizou schema/seed, rode:

```bash
cd backend
npm run db:init
```

## Funcionalidades

- Login com JWT e roles (`ADMIN`, `ANALYST`)
- Clientes com cadastro simplificado (`nome`)
- Projetos com rede propria:
  - `network_range`
  - `mask`
  - `gateway`
- Cadastro de configuracoes com `ip` unico
- Cadastro multiplo na tela Nova Config (`+ Adicionar equipamento`)
- Validacao/reprovacao com regra:
  - quem configura nao pode validar/reprovar o mesmo registro
- Dashboard com:
  - cards de resumo
  - busca global
  - ultimos projetos alterados
  - pendencias por analista
  - clientes com maior volume
- Historico com auditoria de alteracoes
- Relatorios com filtros por:
  - cliente
  - projeto
  - status
  - periodo
  - busca textual
- Exportacao Excel/PDF com filtros aplicados e total consolidado
- Pagina de detalhes por projeto e por configuracao com edicao
- Paginacao no frontend (Pendentes, Historico, Relatorios)
- Auditoria para create/update/delete/validate/reject
- Busca global por cliente, projeto, IP, VLAN, servico e equipamento
- Migracoes versionadas em `backend/sql/migrations`

## Permissoes por role

Somente `ADMIN` pode excluir e editar entidades administrativas:

- configuracoes
- clientes
- projetos

O backend valida role antes de executar delete.

## Validacoes de seguranca (backend)

- IPv4 valido (`ip`, `mask`, `gateway`)
- CIDR valido para `network_range`
- MAC valido (`AA:BB:CC:DD:EE:FF`)
- VLAN de `1` a `4094`
- SQL com query parametrizada (`$1`, `$2`, ...)

As regras de validacao sao compartilhadas entre frontend e backend a partir de `shared/validation-rules.json`.

No frontend, senha do equipamento fica oculta por padrao com botao mostrar/ocultar.

## Estrutura de paginas

- Login
- Dashboard
- Clientes
- Projetos
- Nova Config
- Pendentes
- Historico
- Relatorios
- Detalhes da Configuracao (`/configs/:id`)
- Detalhes do Projeto (`/projects/:id`)

## Banco (resumo)

### users

- `id`
- `name`
- `username`
- `password_hash`
- `role` (`ADMIN` ou `ANALYST`)
- `created_at`

### clients

- `id`
- `name`
- `ip`
- `mask`
- `gateway`
- `created_at`
- `updated_at`

### projects

- `id`
- `client_id`
- `name`
- `network_range`
- `mask`
- `gateway`
- `created_at`
- `updated_at`

### equipment_configs

- `id`
- `client_id`
- `project_id`
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
- `status` (`PENDING`, `APPROVED`, `REJECTED`)
- `notes`
- `created_at`
- `updated_at`
- `validated_at`

### audit_logs

- `id`
- `entity_type`
- `entity_id`
- `action`
- `summary`
- `changed_by`
- `before_data`
- `after_data`
- `changed_at`

Scripts SQL:

- `backend/sql/schema.sql`
- `backend/sql/seed.sql`
- `backend/sql/migrations/*.sql`

## Rodar sem Docker

### Backend

```bash
cd backend
npm install
npm run db:init
npm run dev
```

Se quiser aplicar somente migracoes sem seed:

```bash
cd backend
npm run db:migrate
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

## Usuarios de seed

- `admin1` / `123456` (ADMIN)
- `analyst1` / `123456` (ANALYST)
- `analyst2` / `123456` (ANALYST)

## Validacao manual executada

Fluxo validado localmente:

- login
- criacao e edicao de cliente
- criacao e edicao de projeto
- criacao, edicao e validacao de configuracao
- dashboard
- busca global
- auditoria
- exportacao Excel e PDF
