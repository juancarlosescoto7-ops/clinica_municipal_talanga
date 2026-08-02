"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { MunicipalLogo } from "@/components/shared/municipal-logo";
import { getSupabaseBrowserRpcExecutor } from "@/services";

import { mapPersistedMonthlyReport } from "../services/reportes-rpc-mappers";
import { createReportsService } from "../services/reportes.service";
import type {
  MonthlyManagementReport,
  MonthlyRateCategory,
} from "../types/reportes.types";
import styles from "./monthly-report.module.css";

const moneyFormatter = new Intl.NumberFormat("es-HN", {
  style: "currency",
  currency: "HNL",
  minimumFractionDigits: 2,
});

const integerFormatter = new Intl.NumberFormat("es-HN");

const shortDateFormatter = new Intl.DateTimeFormat("es-HN", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

const RATE_CATEGORY_LABELS: Record<MonthlyRateCategory, string> = {
  general: "General",
  tercera_edad: "Tercera edad",
  policia: "Policía",
  medico: "Médico (histórico)",
  psicologico: "Psicológico (histórico)",
  tipo_sangre: "Tipo de sangre (histórico)",
};

interface ReportParticipant {
  name: string;
  role: string;
  activities: readonly string[];
  monthlySalary: number | null;
  medicalExams: number | null;
  unitCommission: number | null;
  totalCommission: number | null;
}

function participantActivities(role: string): readonly string[] {
  const normalizedRole = role.toLocaleLowerCase("es");

  if (normalizedRole.includes("psic")) {
    return [
      "Realizar la evaluación psicológica incluida en el examen médico.",
      "Orientar al paciente, aplicar las pruebas correspondientes y registrar el resultado.",
      "Comunicar incidencias que puedan afectar la emisión del certificado.",
    ];
  }

  if (normalizedRole.includes("méd") || normalizedRole.includes("medic")) {
    return [
      "Realizar la evaluación clínica y revisar los signos vitales del paciente.",
      "Evaluar vista, audición y condiciones generales de salud.",
      "Emitir el criterio médico y registrar cualquier incidencia del examen.",
    ];
  }

  if (normalizedRole.includes("cobro")) {
    return [
      "Coordinar la atención y orientación de los pacientes.",
      "Cobrar los servicios, emitir y resguardar los recibos correlativos.",
      "Conciliar los ingresos y preparar la información del informe mensual.",
      "Coordinar con Tesorería el depósito del dinero recaudado.",
    ];
  }

  if (normalizedRole.includes("capt")) {
    return [
      "Recibir al paciente y verificar la documentación presentada.",
      "Registrar sus datos y la categoría tarifaria correspondiente.",
      "Organizar el orden de atención y apoyar el control de expedientes.",
    ];
  }

  if (
    normalizedRole.includes("recursos humanos") ||
    normalizedRole.includes("rrhh")
  ) {
    return [
      "Revisar la información operativa y administrativa del período.",
      "Verificar el personal, los salarios y las responsabilidades reportadas.",
      "Recibir y firmar el informe mensual para su remisión institucional.",
    ];
  }

  return [
    "Cumplir las funciones asignadas a su cargo durante el período.",
    "Apoyar el registro y control de las actividades de la Clínica Municipal.",
  ];
}

function formatMoney(value: number): string {
  return moneyFormatter.format(value);
}

function formatInteger(value: number): string {
  return integerFormatter.format(value);
}

function formatShortDate(value: string): string {
  return shortDateFormatter.format(new Date(`${value.slice(0, 10)}T12:00:00`));
}

function MunicipalLetterhead() {
  return (
    <header className={styles.letterhead}>
      <MunicipalLogo
        className={styles.municipalLogo}
        alt="Escudo de la Municipalidad de Talanga"
        width={58}
        height={60}
      />
      <div>
        <strong>Municipalidad de Talanga</strong>
        <span>Departamento de Francisco Morazán · Honduras, C. A.</span>
        <small>Clínica Municipal · Informe mensual de actividades</small>
      </div>
    </header>
  );
}

function PageFooter({ page }: { page: number }) {
  return (
    <footer className={styles.pageFooter}>
      <span>Clínica Municipal · Documento generado electrónicamente</span>
      <span>Página {page} de 4</span>
    </footer>
  );
}

function Signature({ label, name }: { label: string; name?: string }) {
  return (
    <div className={styles.signature}>
      <span />
      {name ? <strong>{name}</strong> : null}
      <small>{label}</small>
    </div>
  );
}

function ReportDocument({ report }: { report: MonthlyManagementReport }) {
  const doctor = report.providerCommissions.find(
    (item) => item.specialty === "Medicina",
  );
  const psychologist = report.providerCommissions.find(
    (item) => item.specialty === "Psicología",
  );
  const participants: ReportParticipant[] = report.salaries.map((item) => ({
    name: item.person,
    role: item.role,
    activities: participantActivities(item.role),
    monthlySalary: item.monthlySalary,
    medicalExams: null,
    unitCommission: null,
    totalCommission: null,
  }));

  for (const commission of report.providerCommissions) {
    const normalizedProvider = commission.provider.toLocaleLowerCase("es");
    const participant = participants.find((item) => {
      const normalizedName = item.name.toLocaleLowerCase("es");
      return (
        normalizedName === normalizedProvider ||
        normalizedName.includes(normalizedProvider) ||
        normalizedProvider.includes(normalizedName)
      );
    });

    if (participant) {
      participant.medicalExams = commission.services;
      participant.unitCommission = commission.unitCommission;
      participant.totalCommission = commission.totalCommission;
    } else {
      participants.push({
        name: commission.provider,
        role: commission.specialty,
        activities: participantActivities(commission.specialty),
        monthlySalary: null,
        medicalExams: commission.services,
        unitCommission: commission.unitCommission,
        totalCommission: commission.totalCommission,
      });
    }
  }

  const collectionsStaff = participants.find((item) =>
    item.role.toLocaleLowerCase("es").includes("cobro"),
  );
  let humanResources = participants.find((item) => {
    const role = item.role.toLocaleLowerCase("es");
    return role.includes("recursos humanos") || role.includes("rrhh");
  });

  if (!humanResources) {
    humanResources = {
      name: "Responsable de Recursos Humanos",
      role: "Recursos Humanos",
      activities: participantActivities("Recursos Humanos"),
      monthlySalary: null,
      medicalExams: null,
      unitCommission: null,
      totalCommission: null,
    };
    participants.push(humanResources);
  }
  const totalExams = report.medicalExams + report.bloodTypeExams;
  const dailyTotals = report.dailySummary.reduce(
    (total, item) => ({
      patients: total.patients + item.patientsAttended,
      receipts: total.receipts + item.validReceipts,
      general: total.general + item.generalMedicalExams,
      seniors: total.seniors + item.seniorMedicalExams,
      police: total.police + item.policeMedicalExams,
      blood: total.blood + item.bloodTypeExams,
      cancelled: total.cancelled + item.cancelledReceipts,
      uncollected: total.uncollected + item.uncollectedAttentions,
      income: total.income + item.income,
    }),
    {
      patients: 0,
      receipts: 0,
      general: 0,
      seniors: 0,
      police: 0,
      blood: 0,
      cancelled: 0,
      uncollected: 0,
      income: 0,
    },
  );

  return (
    <article className={styles.report}>
      <section className={styles.reportPage}>
        <MunicipalLetterhead />

        <div className={styles.letterDate}>
          <strong>Talanga, Francisco Morazán</strong>
          <span>Informe generado el {report.generatedAt}</span>
        </div>

        <div className={styles.recipients}>
          <strong>Jefatura de Presupuesto</strong>
          <strong>Tesorería Municipal</strong>
          <span>Municipalidad de Talanga</span>
        </div>

        <h2 className={styles.formalTitle}>Informe mensual</h2>

        <div className={styles.narrative}>
          <p>{report.headerText}</p>
          <p>
            Las actividades tienen como objetivo realizar y respaldar los
            servicios requeridos por las personas que acuden a la Clínica
            Municipal. La atención se desarrolla de lunes a viernes, de 7:00
            a. m. a 2:00 p. m.
          </p>

          <h3>Actividades realizadas</h3>

          <p>
            <strong>Exámenes médicos:</strong> registro del paciente, toma de
            signos vitales y evaluaciones médica y psicológica necesarias para
            determinar su aptitud. Cada examen cobrado con recibo válido genera
            la comisión correspondiente para el médico y la psicóloga.
          </p>
          <p>
            <strong>Examen de tipo de sangre:</strong> registro y realización
            del examen para determinar el grupo sanguíneo y factor Rh del
            paciente. Este servicio se informa por separado y no genera
            comisión profesional.
          </p>

          <p className={styles.periodStatement}>
            Del <strong>{report.periodStart}</strong> al{" "}
            <strong>{report.periodEnd}</strong> se registraron{" "}
            <strong>{formatInteger(report.medicalExams)}</strong> exámenes
            médicos y <strong>{formatInteger(report.bloodTypeExams)}</strong>{" "}
            exámenes de tipo de sangre, todos respaldados por recibos válidos.
          </p>

          <h3>Profesionales vinculados a los exámenes médicos</h3>
          <ul className={styles.professionalList}>
            <li>
              <strong>{doctor?.provider ?? "Médico no registrado"}</strong>
              <span>Medicina general</span>
            </li>
            <li>
              <strong>
                {psychologist?.provider ?? "Psicóloga no registrada"}
              </strong>
              <span>Psicología</span>
            </li>
          </ul>
        </div>

        <div className={styles.pageSignatures}>
          <Signature
            label="Encargada de cobros · Elaboró y entregó"
            name={collectionsStaff?.name}
          />
          <Signature
            label="Recursos Humanos · Revisó y recibió"
            name={humanResources.name}
          />
        </div>
        <PageFooter page={1} />
      </section>

      <section className={styles.reportPage}>
        <MunicipalLetterhead />
        <header className={styles.pageTitle}>
          <span>Reporte ejecutivo · {report.period}</span>
          <h2>Resumen administrativo y financiero</h2>
          <p>
            Comprende exclusivamente movimientos respaldados por recibos
            válidos. Los recibos anulados y las atenciones no cobradas se
            presentan como incidencias independientes.
          </p>
        </header>

        <div className={styles.summaryGrid}>
          <div>
            <span>Pacientes atendidos</span>
            <strong>{formatInteger(report.patientsAttended)}</strong>
          </div>
          <div>
            <span>Recibos válidos</span>
            <strong>{formatInteger(report.validReceipts)}</strong>
          </div>
          <div>
            <span>Exámenes emitidos</span>
            <strong>{formatInteger(totalExams)}</strong>
          </div>
          <div>
            <span>Ingresos percibidos</span>
            <strong>{formatMoney(report.grossIncome)}</strong>
          </div>
        </div>

        <section className={styles.compactSection}>
          <h3>Servicios realizados por tarifa</h3>
          <table>
            <thead>
              <tr>
                <th>Servicio</th>
                <th>Categoría</th>
                <th>Cantidad</th>
                <th>Tarifa</th>
                <th>Ingreso</th>
              </tr>
            </thead>
            <tbody>
              {report.services.map((item) => (
                <tr key={`${item.serviceId}-${item.rateCategory}`}>
                  <td>{item.serviceName}</td>
                  <td>{RATE_CATEGORY_LABELS[item.rateCategory]}</td>
                  <td>{formatInteger(item.quantity)}</td>
                  <td>{formatMoney(item.unitPrice)}</td>
                  <td>{formatMoney(item.income)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={4}>Total de ingresos</td>
                <td>{formatMoney(report.grossIncome)}</td>
              </tr>
            </tfoot>
          </table>
        </section>

        <div className={styles.twoColumns}>
          <section className={styles.compactSection}>
            <h3>Comisiones por examen médico</h3>
            <table>
              <thead>
                <tr>
                  <th>Profesional</th>
                  <th>Exámenes</th>
                  <th>Unidad</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {report.providerCommissions.map((item) => (
                  <tr key={`${item.specialty}-${item.provider}`}>
                    <td>
                      {item.provider}
                      <small>{item.specialty}</small>
                    </td>
                    <td>{formatInteger(item.services)}</td>
                    <td>{formatMoney(item.unitCommission)}</td>
                    <td>{formatMoney(item.totalCommission)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={3}>Total</td>
                  <td>{formatMoney(report.totalCommissions)}</td>
                </tr>
              </tfoot>
            </table>
          </section>

          <section className={styles.compactSection}>
            <h3>Salarios base del personal</h3>
            <table>
              <thead>
                <tr>
                  <th>Persona</th>
                  <th>Cargo</th>
                  <th>Salario</th>
                </tr>
              </thead>
              <tbody>
                {report.salaries.map((item) => (
                  <tr key={`${item.role}-${item.person}`}>
                    <td>{item.person}</td>
                    <td>{item.role}</td>
                    <td>{formatMoney(item.monthlySalary)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={2}>Total</td>
                  <td>{formatMoney(report.totalSalaries)}</td>
                </tr>
              </tfoot>
            </table>
          </section>
        </div>

        <section className={styles.participantSection}>
          <h3>Personal involucrado y actividades realizadas</h3>
          <div className={styles.participantGrid}>
            {participants.map((item) => (
              <article key={`${item.role}-${item.name}`}>
                <header>
                  <strong>{item.name}</strong>
                  <span>{item.role}</span>
                </header>
                <ul>
                  {item.activities.map((activity) => (
                    <li key={activity}>{activity}</li>
                  ))}
                </ul>
                {item.monthlySalary !== null || item.medicalExams !== null ? (
                  <dl>
                    {item.monthlySalary !== null ? (
                      <div>
                        <dt>Salario base</dt>
                        <dd>{formatMoney(item.monthlySalary)}</dd>
                      </div>
                    ) : null}
                    {item.medicalExams !== null ? (
                      <div>
                        <dt>Exámenes con comisión</dt>
                        <dd>{formatInteger(item.medicalExams)}</dd>
                      </div>
                    ) : null}
                    {item.unitCommission !== null ? (
                      <div>
                        <dt>Comisión unitaria</dt>
                        <dd>{formatMoney(item.unitCommission)}</dd>
                      </div>
                    ) : null}
                    {item.totalCommission !== null ? (
                      <div>
                        <dt>Comisión total</dt>
                        <dd>{formatMoney(item.totalCommission)}</dd>
                      </div>
                    ) : null}
                  </dl>
                ) : null}
              </article>
            ))}
          </div>
        </section>

        <section className={styles.financialResult}>
          <h3>Resultado general estimado</h3>
          <dl>
            <div>
              <dt>Ingresos percibidos</dt>
              <dd>{formatMoney(report.grossIncome)}</dd>
            </div>
            <div>
              <dt>(−) Comisiones</dt>
              <dd>{formatMoney(report.totalCommissions)}</dd>
            </div>
            <div>
              <dt>(−) Salarios base</dt>
              <dd>{formatMoney(report.totalSalaries)}</dd>
            </div>
            <div>
              <dt>Resultado estimado</dt>
              <dd>{formatMoney(report.generalProfit)}</dd>
            </div>
          </dl>
        </section>

        <PageFooter page={2} />
      </section>

      <section className={styles.reportPage}>
        <MunicipalLetterhead />
        <header className={styles.pageTitle}>
          <span>Del {report.periodStart} al {report.periodEnd}</span>
          <h2>Reporte diario de exámenes por categoría</h2>
          <p>
            Cantidades cobradas con recibo válido. La categoría corresponde a
            la tarifa aplicada al paciente.
          </p>
        </header>

        <section className={`${styles.compactSection} ${styles.dailySection}`}>
          <table>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>General</th>
                <th>3.ª edad</th>
                <th>Policía</th>
                <th>Total médicos</th>
                <th>Tipo sangre</th>
                <th>Pacientes</th>
                <th>Ingresos</th>
              </tr>
            </thead>
            <tbody>
              {report.dailySummary.length > 0 ? (
                report.dailySummary.map((item) => {
                  const medicalTotal =
                    item.generalMedicalExams +
                    item.seniorMedicalExams +
                    item.policeMedicalExams;
                  return (
                    <tr key={item.date}>
                      <td>{formatShortDate(item.date)}</td>
                      <td>{formatInteger(item.generalMedicalExams)}</td>
                      <td>{formatInteger(item.seniorMedicalExams)}</td>
                      <td>{formatInteger(item.policeMedicalExams)}</td>
                      <td>{formatInteger(medicalTotal)}</td>
                      <td>{formatInteger(item.bloodTypeExams)}</td>
                      <td>{formatInteger(item.patientsAttended)}</td>
                      <td>{formatMoney(item.income)}</td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8}>No se registró actividad en el período.</td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr>
                <td>Total</td>
                <td>{formatInteger(dailyTotals.general)}</td>
                <td>{formatInteger(dailyTotals.seniors)}</td>
                <td>{formatInteger(dailyTotals.police)}</td>
                <td>{formatInteger(report.medicalExams)}</td>
                <td>{formatInteger(report.bloodTypeExams)}</td>
                <td>{formatInteger(report.patientsAttended)}</td>
                <td>{formatMoney(report.grossIncome)}</td>
              </tr>
            </tfoot>
          </table>
        </section>

        <div className={styles.certificationNote}>
          <strong>Certificación del corte</strong>
          <p>
            El total mensual de pacientes se calcula de forma única por
            persona. Por esa razón puede diferir de la suma de pacientes de
            cada día cuando una misma persona fue atendida en fechas distintas.
          </p>
        </div>

        <div className={styles.pageSignatures}>
          <Signature
            label="Encargada de cobros · Entregué conforme"
            name={collectionsStaff?.name}
          />
          <Signature
            label="Recursos Humanos · Recibí conforme"
            name={humanResources.name}
          />
        </div>
        <PageFooter page={3} />
      </section>

      <section className={styles.reportPage}>
        <MunicipalLetterhead />
        <header className={styles.pageTitle}>
          <span>{report.period}</span>
          <h2>Consolidado diario e incidencias</h2>
          <p>
            Control de pacientes, recibos y documentos que no forman parte de
            los totales válidos del informe.
          </p>
        </header>

        <section className={`${styles.compactSection} ${styles.dailySection}`}>
          <table>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Pacientes</th>
                <th>Recibos válidos</th>
                <th>Exámenes emitidos</th>
                <th>Recibos anulados</th>
                <th>No cobradas</th>
                <th>Ingresos</th>
              </tr>
            </thead>
            <tbody>
              {report.dailySummary.length > 0 ? (
                report.dailySummary.map((item) => (
                  <tr key={item.date}>
                    <td>{formatShortDate(item.date)}</td>
                    <td>{formatInteger(item.patientsAttended)}</td>
                    <td>{formatInteger(item.validReceipts)}</td>
                    <td>
                      {formatInteger(
                        item.generalMedicalExams +
                          item.seniorMedicalExams +
                          item.policeMedicalExams +
                          item.bloodTypeExams,
                      )}
                    </td>
                    <td>{formatInteger(item.cancelledReceipts)}</td>
                    <td>{formatInteger(item.uncollectedAttentions)}</td>
                    <td>{formatMoney(item.income)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7}>No se registró actividad en el período.</td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr>
                <td>Total</td>
                <td>{formatInteger(report.patientsAttended)}</td>
                <td>{formatInteger(report.validReceipts)}</td>
                <td>{formatInteger(totalExams)}</td>
                <td>{formatInteger(report.cancelledReceipts)}</td>
                <td>{formatInteger(report.uncollectedAttentions)}</td>
                <td>{formatMoney(report.grossIncome)}</td>
              </tr>
            </tfoot>
          </table>
        </section>

        <section className={styles.incidentGrid}>
          <div>
            <span>Exámenes médicos anulados</span>
            <strong>{formatInteger(report.cancelledMedicalExams)}</strong>
          </div>
          <div>
            <span>Exámenes de sangre anulados</span>
            <strong>{formatInteger(report.cancelledBloodTypeExams)}</strong>
          </div>
          <div>
            <span>Recibos anulados</span>
            <strong>{formatInteger(report.cancelledReceipts)}</strong>
          </div>
          <div>
            <span>Atenciones no cobradas</span>
            <strong>{formatInteger(report.uncollectedAttentions)}</strong>
          </div>
        </section>

        <div className={styles.certificationNote}>
          <strong>Regla de validez</strong>
          <p>
            Los exámenes asociados a recibos anulados se muestran únicamente
            para control. No se incluyen en ingresos, exámenes válidos ni en el
            cálculo de comisiones. Cada examen médico válido aplica una comisión
            para ambos profesionales según su tarifa vigente.
          </p>
        </div>

        <div className={styles.professionalSignatures}>
          <Signature
            label="Encargada de cobros · Elaboró y entregó"
            name={collectionsStaff?.name}
          />
          <Signature
            label="Recursos Humanos · Revisó y recibió"
            name={humanResources.name}
          />
        </div>
        <PageFooter page={4} />
      </section>
    </article>
  );
}

export function ReportsWorkspace() {
  const currentPeriod = new Date().toISOString().slice(0, 7);
  const service = useMemo(
    () => createReportsService(getSupabaseBrowserRpcExecutor()),
    [],
  );
  const [selectedPeriod, setSelectedPeriod] = useState(currentPeriod);
  const [report, setReport] = useState<MonthlyManagementReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState("");

  const loadReport = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const persisted = await service.getMonthly(`${selectedPeriod}-01`);
      setReport(persisted ? mapPersistedMonthlyReport(persisted) : null);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "No fue posible consultar el informe en Supabase.",
      );
      setReport(null);
    } finally {
      setIsLoading(false);
    }
  }, [selectedPeriod, service]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadReport(), 0);
    return () => window.clearTimeout(timer);
  }, [loadReport]);

  async function generateReport() {
    setIsGenerating(true);
    setError("");
    try {
      await service.generateMonthly(`${selectedPeriod}-01`);
      await loadReport();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "No fue posible generar el informe en Supabase.",
      );
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <div className={styles.workspace}>
      <header className={styles.pageHeader}>
        <div>
          <h1>Informe mensual</h1>
          <p>Documento institucional de cuatro páginas</p>
        </div>
        <div className={styles.headerActions}>
          <label>
            <span>Período</span>
            <input
              onChange={(event) => setSelectedPeriod(event.target.value)}
              type="month"
              value={selectedPeriod}
            />
          </label>
          <button
            disabled={isGenerating}
            onClick={() => void generateReport()}
            type="button"
          >
            {isGenerating ? "Generando…" : "Generar / actualizar"}
          </button>
          <button
            disabled={!report}
            onClick={() => window.print()}
            type="button"
          >
            Imprimir informe
          </button>
        </div>
      </header>

      {isLoading ? (
        <section className={styles.emptyState} aria-live="polite">
          Cargando informe desde Supabase…
        </section>
      ) : null}

      {error ? (
        <section className={styles.errorState} role="alert">
          {error}
        </section>
      ) : null}

      {!isLoading && !report ? (
        <section className={styles.emptyState}>
          <h2>No hay un informe generado para este período</h2>
          <p>
            Use “Generar / actualizar” para calcular y guardar el corte mensual
            con los datos actuales.
          </p>
        </section>
      ) : null}

      {report ? <ReportDocument report={report} /> : null}
    </div>
  );
}
