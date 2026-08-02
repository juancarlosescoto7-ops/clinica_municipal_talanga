# Estructura frontend

```text
src/
├── app/
│   └── clinica/
├── components/
│   ├── ui/
│   ├── forms/
│   ├── tables/
│   ├── layout/
│   └── shared/
├── modules/
│   ├── pacientes/
│   ├── servicios/
│   ├── caja/
│   ├── arqueos/
│   ├── depositos/
│   ├── reportes/
│   ├── comisiones/
│   └── operacion-guiada/
├── services/
│   └── supabase.ts
├── lib/
└── types/
```

## Módulo
```text
src/modules/pacientes/
├── components/
├── services/
├── types/
├── schemas/
├── hooks/
├── sql/
└── index.ts
```

No crear carpetas vacías.

## Regla de ubicación
- Uso exclusivo de un módulo: dentro del módulo.
- Uso real por dos o más módulos: `src/components`.
- Servicio específico: dentro del módulo.
- Cliente general Supabase: `src/services/supabase.ts`.
- Adaptador RPC general: `src/services/supabase-rpc-executor.ts`.
- Tipos compartidos: `src/types`.

## Rutas
Las rutas se crean únicamente cuando se desarrolla el módulo correspondiente.

Las rutas vigentes se registran mediante `CLINIC_PATHS` y se clasifican con el
tipo `ClinicRouteType`:

- `daily-operation`
- `end-of-day-control`
- `month-end-control`
- `configuration`

`/clinica/caja` es el punto de entrada y presenta la operación guiada completa:
apertura, paciente, servicio, cobro y cierre. El estado temporal de Caja y de
la jornada se comparte desde el layout.

La navegación principal expone únicamente:

- Operación guiada.
- Informe mensual.
- Catálogo y tarifas.

Las rutas anteriores de pacientes, arqueos y depósitos redirigen a la
operación guiada. La ruta anterior de comisiones redirige al informe mensual.
