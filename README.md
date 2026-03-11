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
- Modulos de Clientes e Projetos
- Cadastro de configuracoes com:
  - `ip` (IP unico)
- Cadastro multiplo na tela Nova Config (`+ Adicionar equipamento`)
- Cadastro de cliente via modal com:
  - `ip`
  - `mask`
  - `gateway`
- Validacao/reprovacao com regra:
  - quem configura nao pode validar/reprovar o mesmo registro
- Dashboard com cards:
  - pendentes
  - aprovadas
  - reprovadas
  - total
- Relatorios com filtros por:
  - cliente
  - projeto
- Exportacao Excel/PDF com filtros
- Pagina de detalhes por projeto e por configuracao
- Paginacao no frontend (Pendentes, Historico, Relatorios)

## Permissoes por role

Somente `ADMIN` pode excluir:

- configuracoes
- clientes
- projetos

O backend valida role antes de executar delete.

## Validacoes de seguranca (backend)

- IPv4 valido (`ip`, `mask`, `gateway`)
- MAC valido (`AA:BB:CC:DD:EE:FF`)
- VLAN de `1` a `4094`
- SQL com query parametrizada (`$1`, `$2`, ...)

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

### projects

- `id`
- `client_id`
- `name`
- `network_range`
- `mask`
- `gateway`
- `created_at`

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
- `validated_at`

Scripts SQL:

- `backend/sql/schema.sql`
- `backend/sql/seed.sql`

## Rodar sem Docker

### Backend

```bash
cd backend
npm install
npm run db:init
npm run dev
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
