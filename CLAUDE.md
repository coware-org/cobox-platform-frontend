# CLAUDE.md

Guidance for Claude Code when working in this repository.

## Active Specifications

- `simplify-route-assignment` — Simplificar el flujo de asignacion de rutas y vehiculos. Unifica los 4 modales de `RoutesPage` en un solo dialogo, reduce `RouteCard` de 6 a 2 botones y hace idempotente el guardado. **Restriccion dura: no agregar ni eliminar endpoints.**
  - Spec: `.kiro/specs/simplify-route-assignment/`

## Workflow

Este proyecto sigue Spec-Driven Development con TDD. Los artefactos viven en `.kiro/specs/<feature>/` y cada fase requiere aprobacion humana antes de avanzar:

1. `spec-init` -> 2. `spec-requirements` -> 3. `spec-design` -> 4. `spec-tasks` -> 5. `spec-impl`

## Comandos

- `npm run dev` — servidor de desarrollo (puerto 5173, strictPort)
- `npm run build` — `tsc -b` + `vite build`
- `npm run lint` — ESLint
- `npm run test` — `node --test` sobre `tests/*.test.ts` y `tests/*.test.mjs`

## Convenciones

- Sin i18n: los labels de usuario van hardcodeados en espanol dentro de los componentes.
- IDs del backend son `number`; la capa de UI los expone como `string` (ver mappers en `services/*Service.ts`).
- Tests de logica pura con `node:test` + `node:assert/strict`, importando los `.ts` con extension explicita (ver `tests/evidence-flow.test.ts`).