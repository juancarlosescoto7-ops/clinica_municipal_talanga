import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const sources = [
  "src/modules/pacientes/sql/01_tables.sql",
  "src/modules/pacientes/sql/02_indexes.sql",
  "src/modules/pacientes/sql/03_functions.sql",
  "src/modules/servicios/sql/01_tables.sql",
  "src/modules/servicios/sql/02_indexes.sql",
  "src/modules/servicios/sql/03_functions.sql",
  "src/modules/servicios/sql/04_seed.sql",
  "src/modules/personal/sql/01_tables.sql",
  "src/modules/personal/sql/02_indexes.sql",
  "src/modules/personal/sql/03_functions.sql",
  "src/modules/personal/sql/04_seed.sql",
  "src/modules/caja/sql/01_tables.sql",
  "src/modules/caja/sql/02_indexes.sql",
  "src/modules/caja/sql/03_functions.sql",
  "src/modules/caja/sql/04_seed.sql",
  "src/modules/caja/sql/05_guided_functions.sql",
  "src/modules/comisiones/sql/01_tables.sql",
  "src/modules/comisiones/sql/02_indexes.sql",
  "src/modules/comisiones/sql/03_functions.sql",
  "src/modules/comisiones/sql/04_seed.sql",
  "src/modules/arqueos/sql/01_tables.sql",
  "src/modules/arqueos/sql/02_indexes.sql",
  "src/modules/arqueos/sql/03_functions.sql",
  "src/modules/depositos/sql/01_tables.sql",
  "src/modules/depositos/sql/02_indexes.sql",
  "src/modules/depositos/sql/03_functions.sql",
  "src/modules/operacion-guiada/sql/01_tables.sql",
  "src/modules/operacion-guiada/sql/02_indexes.sql",
  "src/modules/operacion-guiada/sql/03_functions.sql",
  "src/modules/reportes/sql/01_tables.sql",
  "src/modules/reportes/sql/02_indexes.sql",
  "src/modules/reportes/sql/03_functions.sql",
  "src/modules/autenticacion/sql/01_permissions.sql",
];

const projectRoot = process.cwd();
const defaultOutput = path.join("supabase", "SIEMC_INSTALACION.sql");
const outputPath = path.resolve(projectRoot, process.argv[2] ?? defaultOutput);
const sections = [];

function makeInstallerRerunnable(sql) {
  return sql
    .replace(/^create table public\./gmu, "create table if not exists public.")
    .replace(/^create unique index /gmu, "create unique index if not exists ")
    .replace(/^create index /gmu, "create index if not exists ")
    .replace(
      /^create trigger ([a-z0-9_]+)\n((?:before|after)[^\n]* on public\.([a-z0-9_]+))/gimu,
      "drop trigger if exists $1 on public.$3;\n\ncreate trigger $1\n$2",
    );
}

for (const relativePath of sources) {
  const absolutePath = path.resolve(projectRoot, relativePath);
  const sql = makeInstallerRerunnable(await readFile(absolutePath, "utf8"));
  sections.push(
    `-- ============================================================================\n` +
      `-- Fuente: ${relativePath.replaceAll("\\", "/")}\n` +
      `-- ============================================================================\n\n` +
      sql.trim(),
  );
}

const output = [
  "-- SIEMC · INSTALACIÓN ÚNICA Y DEFINITIVA",
  "-- Copiar y pegar este archivo completo en Supabase SQL Editor.",
  "-- Puede ejecutarse en un proyecto nuevo o repetirse para actualizar RPC.",
  "-- No elimina tablas ni datos existentes.",
  "-- Archivo generado. No editar manualmente.",
  "-- Los archivos fuente viven en src/modules/<modulo>/sql/.",
  "",
  "create extension if not exists pgcrypto;",
  "create extension if not exists supabase_vault with schema vault;",
  "",
  "begin;",
  "",
  sections.join("\n\n"),
  "",
  "commit;",
  "",
].join("\n");

await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, output, "utf8");

process.stdout.write(`${path.relative(projectRoot, outputPath)}\n`);
