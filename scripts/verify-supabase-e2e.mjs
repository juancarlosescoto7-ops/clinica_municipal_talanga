import { readFile } from "node:fs/promises";

function parseEnv(source) {
  return Object.fromEntries(
    source
      .split(/\r?\n/u)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#") && line.includes("="))
      .map((line) => {
        const separator = line.indexOf("=");
        const key = line.slice(0, separator).trim();
        const value = line
          .slice(separator + 1)
          .trim()
          .replace(/^(['"])(.*)\1$/u, "$2");
        return [key, value];
      }),
  );
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function first(rows, rpcName) {
  assert(Array.isArray(rows) && rows.length > 0, `${rpcName} no retornó filas.`);
  return rows[0];
}

function amount(value) {
  const parsed = Number(value);
  assert(Number.isFinite(parsed), `Monto inválido recibido: ${String(value)}`);
  return parsed;
}

const env = parseEnv(await readFile(".env.local", "utf8"));
const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/u, "");
const publishableKey = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const annulmentAdminKey = process.env.SIEMC_ANNULMENT_ADMIN_KEY;

assert(supabaseUrl, "Falta NEXT_PUBLIC_SUPABASE_URL en .env.local.");
assert(
  publishableKey,
  "Falta NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY en .env.local.",
);
assert(
  annulmentAdminKey,
  "Falta SIEMC_ANNULMENT_ADMIN_KEY en el entorno temporal de la prueba.",
);

async function rpc(name, body = {}) {
  const response = await fetch(`${supabaseUrl}/rest/v1/rpc/${name}`, {
    method: "POST",
    headers: {
      apikey: publishableKey,
      Authorization: `Bearer ${publishableKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const text = await response.text();
  let payload = null;

  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = text;
    }
  }

  if (!response.ok) {
    const detail =
      payload && typeof payload === "object"
        ? payload.message ?? payload.details ?? JSON.stringify(payload)
        : String(payload ?? response.statusText);
    throw new Error(`${name} (${response.status}): ${detail}`);
  }

  return payload;
}

const now = new Date();
const today = now.toISOString().slice(0, 10);
const period = `${today.slice(0, 7)}-01`;
let runId = now.toISOString().replace(/\D/gu, "").slice(0, 14);
const completedSteps = [];
let opening;
let cashReceipt;
let annulledReceipt;
let transferReceipt;

function mark(step) {
  completedSteps.push(step);
}

function catalogItem(rows, code) {
  const item = rows.find((row) => row.codigo === code);
  assert(item, `No se encontró ${code} en el catálogo guiado.`);
  assert(item.servicio_id, `${code} no tiene servicio configurado.`);
  assert(item.proveedor_id, `${code} no tiene proveedor configurado.`);
  return item;
}

async function registerAttention(suffix, category, firstNames) {
  return first(
    await rpc("registrar_paciente_atencion", {
      p_tipo_documento: "pasaporte",
      p_numero_documento: `QA-${runId}-${suffix}`,
      p_nombres: firstNames,
      p_apellidos: "PRUEBA SIEMC",
      p_fecha_nacimiento: "1990-01-15",
      p_telefono: null,
      p_correo: null,
      p_direccion: null,
      p_crear_atencion: true,
      p_observaciones_atencion: `Prueba integral ${runId}`,
      p_categoria_tarifaria: category,
    }),
    "registrar_paciente_atencion",
  );
}

async function assignService(attentionId, item) {
  const rows = await rpc("registrar_servicios_guiados", {
    p_atencion_id: attentionId,
    p_asignaciones: [
      {
        servicio_id: item.servicio_id,
        proveedor_id: item.proveedor_id,
        cantidad: 1,
      },
    ],
  });
  return first(rows, "registrar_servicios_guiados");
}

try {
  const initialDay = first(
    await rpc("obtener_jornada_guiada"),
    "obtener_jornada_guiada",
  ).jornada;
  if (initialDay.caja === null) {
    assert(initialDay.atenciones.length === 0, "El proyecto nuevo ya contiene atenciones.");
    mark("instalacion_limpia");

  const [generalCatalog, elderlyCatalog, policeCatalog] = await Promise.all([
    rpc("listar_servicios_guiados_disponibles", {
      p_fecha_referencia: today,
      p_categoria_tarifaria: "general",
    }),
    rpc("listar_servicios_guiados_disponibles", {
      p_fecha_referencia: today,
      p_categoria_tarifaria: "tercera_edad",
    }),
    rpc("listar_servicios_guiados_disponibles", {
      p_fecha_referencia: today,
      p_categoria_tarifaria: "policia",
    }),
  ]);
  const generalMedical = catalogItem(generalCatalog, "EX-MED");
  const elderlyPsychological = catalogItem(elderlyCatalog, "EX-PSI");
  const policeMedical = catalogItem(policeCatalog, "EX-MED");
  assert(amount(generalMedical.monto) === 250, "La tarifa general no es L 250.");
  assert(
    amount(elderlyPsychological.monto) === 100,
    "La tarifa de tercera edad no es L 100.",
  );
  assert(amount(policeMedical.monto) === 100, "La tarifa policial no es L 100.");
  mark("catalogo_tarifas_proveedores");

  opening = first(
    await rpc("abrir_caja", {
      p_monto_inicial: 500,
      p_observaciones: `PRUEBA SIEMC ${runId} - apertura real`,
    }),
    "abrir_caja",
  );
  assert(opening.estado === "abierta", "La caja no quedó abierta.");
  mark("apertura_caja");

  const cashAttention = await registerAttention("01", "general", "COBRO EFECTIVO");
  const cashAssignment = await assignService(
    cashAttention.atencion_id,
    generalMedical,
  );
  assert(
    amount(cashAssignment.monto_unitario) === 250,
    "La atención general no conservó la tarifa de L 250.",
  );
  cashReceipt = first(
    await rpc("registrar_pago_atencion", {
      p_atencion_id: cashAttention.atencion_id,
      p_metodo: "efectivo",
      p_monto_recibido: 300,
      p_banco: null,
      p_referencia_transferencia: null,
      p_fecha_transferencia: null,
      p_observaciones: `Prueba efectivo ${runId}`,
    }),
    "registrar_pago_atencion",
  );
  assert(amount(cashReceipt.total) === 250, "El recibo en efectivo no totalizó L 250.");
  assert(amount(cashReceipt.cambio) === 50, "El cambio del recibo no fue L 50.");
  mark("cobro_efectivo_tarifa_incorrecta");

  annulledReceipt = first(
    await rpc("anular_recibo", {
      p_recibo_id: cashReceipt.recibo_id,
      p_motivo: "Tarifa general aplicada por error a paciente policía",
      p_clave_administrativa: annulmentAdminKey,
    }),
    "anular_recibo",
  );
  assert(annulledReceipt.estado === "anulado", "El recibo no quedó anulado.");

  const correctedAttention = first(
    await rpc("registrar_paciente_guiado", {
      p_tipo_documento: "pasaporte",
      p_numero_documento: `QA-${runId}-01`,
      p_nombres: "DATOS QUE NO DEBEN REEMPLAZAR",
      p_apellidos: "AL PACIENTE EXISTENTE",
      p_fecha_nacimiento: "1995-02-20",
      p_telefono: null,
      p_correo: null,
      p_direccion: null,
      p_observaciones_atencion: `Corrección de tarifa ${runId}`,
      p_categoria_tarifaria: "policia",
    }),
    "registrar_paciente_guiado",
  );
  assert(
    correctedAttention.paciente_id === cashAttention.paciente_id,
    "El re-registro duplicó o sustituyó la ficha del paciente.",
  );
  assert(
    correctedAttention.atencion_id !== cashAttention.atencion_id,
    "El re-registro no creó una atención nueva.",
  );
  assert(
    correctedAttention.nombres === "COBRO EFECTIVO",
    "El re-registro modificó los datos del paciente existente.",
  );
  const correctedAssignment = await assignService(
    correctedAttention.atencion_id,
    policeMedical,
  );
  assert(
    amount(correctedAssignment.monto_unitario) === 100,
    "La atención corregida no aplicó la tarifa policial de L 100.",
  );
  cashReceipt = first(
    await rpc("registrar_pago_atencion", {
      p_atencion_id: correctedAttention.atencion_id,
      p_metodo: "efectivo",
      p_monto_recibido: 150,
      p_banco: null,
      p_referencia_transferencia: null,
      p_fecha_transferencia: null,
      p_observaciones: `Cobro corregido ${runId}`,
    }),
    "registrar_pago_atencion",
  );
  assert(amount(cashReceipt.total) === 100, "El recibo corregido no totalizó L 100.");
  assert(amount(cashReceipt.cambio) === 50, "El cambio corregido no fue L 50.");
  mark("anulacion_y_reregistro_paciente");

  const transferAttention = await registerAttention(
    "02",
    "tercera_edad",
    "COBRO TRANSFERENCIA",
  );
  const transferAssignment = await assignService(
    transferAttention.atencion_id,
    elderlyPsychological,
  );
  assert(
    amount(transferAssignment.monto_unitario) === 100,
    "La atención de tercera edad no conservó la tarifa de L 100.",
  );
  transferReceipt = first(
    await rpc("registrar_pago_atencion", {
      p_atencion_id: transferAttention.atencion_id,
      p_metodo: "transferencia",
      p_monto_recibido: null,
      p_banco: "BANCO PRUEBA SIEMC",
      p_referencia_transferencia: `TR-${runId}`,
      p_fecha_transferencia: today,
      p_observaciones: `Prueba transferencia ${runId}`,
    }),
    "registrar_pago_atencion",
  );
  assert(
    amount(transferReceipt.total) === 100,
    "El recibo por transferencia no totalizó L 100.",
  );
  mark("cobro_transferencia");

  const unpaidAttention = await registerAttention("03", "policia", "NO COBRADO");
  const unpaidAssignment = await assignService(
    unpaidAttention.atencion_id,
    policeMedical,
  );
  assert(
    amount(unpaidAssignment.monto_unitario) === 100,
    "La atención policial no conservó la tarifa de L 100.",
  );
  const unpaid = first(
    await rpc("registrar_no_cobrado_atencion", {
      p_atencion_id: unpaidAttention.atencion_id,
      p_motivo: `Prueba no cobrada ${runId}`,
    }),
    "registrar_no_cobrado_atencion",
  );
  assert(unpaid.estado === "no_cobrada", "La atención no quedó como no cobrada.");
  mark("atencion_no_cobrada");

  const abandonedAttention = await registerAttention(
    "04",
    "general",
    "CASO ABANDONO",
  );
  const abandoned = first(
    await rpc("registrar_abandono_atencion", {
      p_atencion_id: abandonedAttention.atencion_id,
      p_motivo: `Abandono sintético para prueba integral ${runId}`,
    }),
    "registrar_abandono_atencion",
  );
  assert(abandoned.estado === "abandonada", "La atención no quedó abandonada.");
  mark("atencion_abandonada");
  } else {
    const openingNotes = initialDay.caja.observaciones_apertura ?? "";
    const previousRun = openingNotes.match(/PRUEBA SIEMC (\d{14})/u);
    assert(
      initialDay.caja.estado === "abierta" && previousRun,
      "El proyecto contiene una jornada que no pertenece a esta prueba.",
    );
    runId = previousRun[1];
    assert(initialDay.atenciones.length === 5, "La jornada reanudada no tiene cinco atenciones.");
    assert(initialDay.resumen.pagadas === 2, "La jornada reanudada no tiene dos pagos.");
    assert(initialDay.resumen.no_cobradas === 1, "La jornada reanudada no tiene un no cobrado.");
    assert(initialDay.resumen.abandonadas === 1, "La jornada reanudada no tiene un abandono.");
    assert(initialDay.resumen.anuladas === 1, "La jornada reanudada no tiene una anulación.");
    assert(amount(initialDay.resumen.efectivo) === 100, "El efectivo previo no es L 100.");
    assert(
      amount(initialDay.resumen.transferencias) === 100,
      "La transferencia previa no es L 100.",
    );
    const paidCases = initialDay.atenciones.filter((item) => item.estado === "pagada");
    const cashCase = paidCases.find((item) => item.pago?.metodo === "efectivo");
    const transferCase = paidCases.find(
      (item) => item.pago?.metodo === "transferencia",
    );
    assert(cashCase?.pago?.numero_recibo, "No se recuperó el recibo en efectivo.");
    assert(
      transferCase?.pago?.numero_recibo,
      "No se recuperó el recibo por transferencia.",
    );
    opening = { caja_sesion_id: initialDay.caja.id };
    cashReceipt = { numero_recibo: cashCase.pago.numero_recibo };
    transferReceipt = { numero_recibo: transferCase.pago.numero_recibo };
    mark("jornada_interrumpida_reanudada");
  }

  const closing = first(
    await rpc("cerrar_jornada_guiada", {
      p_efectivo_declarado: 600,
      p_deposito: {
        fecha_deposito: today,
        monto_depositado: 100,
        monto_aplicado: 100,
        banco: "BANCO PRUEBA SIEMC",
        referencia: `DEP-${runId}`,
        evidencia_url: null,
        observaciones: `Depósito sintético ${runId}`,
      },
      p_observaciones: `PRUEBA SIEMC ${runId} - cierre cuadrado`,
    }),
    "cerrar_jornada_guiada",
  ).resultado;
  assert(closing.estado_arqueo === "confirmado", "El arqueo no quedó confirmado.");
  assert(amount(closing.diferencia) === 0, "El arqueo cerró con diferencia.");
  assert(closing.deposito_id, "El cierre no creó el depósito.");
  mark("cierre_arqueo_deposito");

  const finalDay = first(
    await rpc("obtener_jornada_guiada"),
    "obtener_jornada_guiada",
  ).jornada;
  assert(finalDay.caja.estado === "cerrada", "La jornada releída no está cerrada.");
  assert(finalDay.resumen.pagadas === 2, "La jornada no contiene dos casos pagados.");
  assert(finalDay.resumen.no_cobradas === 1, "La jornada no contiene un no cobrado.");
  assert(finalDay.resumen.abandonadas === 1, "La jornada no contiene un abandono.");
  assert(finalDay.resumen.anuladas === 1, "La jornada no contiene una anulación.");
  assert(amount(finalDay.resumen.efectivo) === 100, "El efectivo diario no es L 100.");
  assert(
    amount(finalDay.resumen.transferencias) === 100,
    "Las transferencias diarias no son L 100.",
  );
  assert(amount(finalDay.resumen.total_cobrado) === 200, "El total diario no es L 200.");
  assert(amount(finalDay.caja.efectivo_esperado) === 600, "El efectivo esperado no es L 600.");
  assert(amount(finalDay.caja.efectivo_declarado) === 600, "El efectivo declarado no es L 600.");
  assert(amount(finalDay.caja.diferencia) === 0, "La diferencia releída no es cero.");
  assert(amount(finalDay.deposito.monto_depositado) === 100, "El depósito no se recuperó.");
  assert(
    finalDay.caja.observaciones_cierre.includes(runId),
    "No se recuperaron las observaciones del cierre.",
  );
  assert(finalDay.atenciones.length === 5, "La jornada no contiene cinco atenciones.");
  const annulledCase = finalDay.atenciones.find(
    (item) => item.estado === "anulada",
  );
  assert(annulledCase?.pago?.estado === "anulado", "No se recuperó el pago anulado.");
  assert(
    annulledCase?.pago?.motivo_anulacion,
    "No se recuperó la justificación de la anulación.",
  );
  mark("relectura_persistente");

  const serviceCode = `QA-${runId.slice(-12)}`;
  const createdService = first(
    await rpc("crear_servicio", {
      p_codigo: serviceCode,
      p_nombre: `Servicio prueba ${runId}`,
      p_descripcion: "Servicio sintético para validar persistencia real",
    }),
    "crear_servicio",
  );
  for (const [category, rate] of [
    ["general", 321],
    ["tercera_edad", 123],
    ["policia", 111],
  ]) {
    const scheduled = first(
      await rpc("programar_tarifa_servicio", {
        p_servicio_id: createdService.servicio_id,
        p_monto: rate,
        p_vigente_desde: today,
        p_vigente_hasta: null,
        p_categoria_tarifaria: category,
      }),
      "programar_tarifa_servicio",
    );
    assert(scheduled.categoria_tarifaria === category, `No se guardó la tarifa ${category}.`);
    assert(amount(scheduled.monto) === rate, `Monto incorrecto en la tarifa ${category}.`);
  }
  const rates = await rpc("obtener_tarifas_servicio", {
    p_servicio_id: createdService.servicio_id,
    p_fecha_referencia: today,
  });
  assert(rates.length === 3, "El servicio sintético no conservó sus tres tarifas.");
  const updatedService = first(
    await rpc("actualizar_servicio", {
      p_servicio_id: createdService.servicio_id,
      p_codigo: serviceCode,
      p_nombre: `Servicio prueba ${runId}`,
      p_descripcion: "Prueba finalizada; servicio inactivo",
      p_estado: "inactivo",
    }),
    "actualizar_servicio",
  );
  assert(updatedService.estado === "inactivo", "El servicio sintético no quedó inactivo.");
  const listedService = await rpc("listar_catalogo_servicios", {
    p_busqueda: serviceCode,
    p_estado: "inactivo",
    p_fecha_referencia: today,
    p_limite: 10,
    p_desplazamiento: 0,
    p_categoria_tarifaria: "general",
  });
  assert(
    listedService.some((item) => item.servicio_id === createdService.servicio_id),
    "El servicio sintético no reapareció al consultar el catálogo.",
  );
  mark("catalogo_servicios_crud_tarifas");

  const generatedReport = first(
    await rpc("generar_informe_mensual", { p_periodo: period }),
    "generar_informe_mensual",
  );
  assert(amount(generatedReport.ingresos_brutos) === 200, "El informe no totalizó L 200.");
  assert(amount(generatedReport.total_comisiones) === 130, "Las comisiones no totalizaron L 130.");
  assert(amount(generatedReport.total_salarios) === 18000, "Los salarios no totalizaron L 18,000.");
  const persistedReport = first(
    await rpc("obtener_informe_mensual", { p_periodo: period }),
    "obtener_informe_mensual",
  ).informe;
  assert(persistedReport.id === generatedReport.informe_id, "El informe releído no coincide.");
  assert(persistedReport.servicios.length === 2, "El informe no contiene ambos servicios.");
  assert(persistedReport.comisiones.length === 2, "El informe no contiene ambas comisiones.");
  assert(persistedReport.salarios.length === 2, "El informe no contiene ambos salarios.");
  const reportList = await rpc("listar_informes_mensuales");
  assert(
    reportList.some((item) => item.informe_id === generatedReport.informe_id),
    "El informe no aparece en el listado mensual.",
  );
  mark("informe_mensual_persistente");

  process.stdout.write(
    `${JSON.stringify(
      {
        ok: true,
        project: new URL(supabaseUrl).hostname.split(".")[0],
        runId,
        completedSteps,
        cashSessionId: opening.caja_sesion_id,
        receipts: [cashReceipt.numero_recibo, transferReceipt.numero_recibo],
        totals: {
          cash: 100,
          transfers: 100,
          collected: 200,
          expectedCash: 600,
          declaredCash: 600,
          difference: 0,
          deposit: 100,
        },
        cases: { paid: 2, unpaid: 1, abandoned: 1, annulled: 1 },
        serviceTest: { code: serviceCode, status: "inactivo", rates: 3 },
        report: {
          period,
          grossIncome: amount(generatedReport.ingresos_brutos),
          commissions: amount(generatedReport.total_comisiones),
          salaries: amount(generatedReport.total_salarios),
          profit: amount(generatedReport.ganancia_general),
        },
      },
      null,
      2,
    )}\n`,
  );
} catch (error) {
  process.stderr.write(
    `${JSON.stringify(
      {
        ok: false,
        runId,
        completedSteps,
        error: error instanceof Error ? error.message : String(error),
      },
      null,
      2,
    )}\n`,
  );
  process.exitCode = 1;
}
