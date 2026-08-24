# Almacen-api

Backend API del sistema POS Distribuidora.

## Stack

- NestJS 11 + TypeORM + PostgreSQL 15
- Redis 7 (cache / sesiones)
- Multer (uploads)
- Passport JWT
- Azure Database for PostgreSQL Flexible Server (prod)

## Scripts

```bash
npm install
npm run start:dev      # watch mode
npm test               # 177 tests
npm run build          # tsc → dist/
npm run migration:sql  # Aplica archivos .sql de migrations/
npm run lint           # ESLint --fix
```

## Módulos principales

- `src/auth` — JWT, login, guards
- `src/productos` — catálogo
- `src/inventario-almacen` — stock por almacén y lote
- `src/ventas` — POS, totales, descuentos
- `src/descuentos` — descuentos acumulables (lógica delicada)
- `src/facturas` — CFDI + Facturapi
- `src/updates` — proxy público para auto-update del frontend Tauri
- `src/reports` — reportes de ventas y utilidad

## Deploy

Ver [docs/production-release.md](docs/production-release.md).

## Infra Azure (Terraform)

Ver [infra/terraform/README.md](infra/terraform/README.md).

## Contexto del proyecto

- Contexto completo: [`../contexto/README.md`](../contexto/README.md)
- Servicios delicados: [`../contexto/services/`](../contexto/services/) (precios, descuentos, trazabilidad, printer)
- Índice raíz: [`../AGENTS.md`](../AGENTS.md)