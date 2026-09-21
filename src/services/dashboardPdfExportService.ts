import jsPDF from "jspdf";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { fetchAnalyticsConsents, getPayloadText, type AnalyticsConsent } from "@/services/dashboardAnalyticsService";
import { normalizeConsentType, consentTypeLabel, CONSENT_TYPE_SPECIALTY } from "@/utils/consentTypeNormalizer";

export interface DashboardExportFilters {
  dateFrom?: string;
  dateTo?: string;
}

interface Row {
  name: string;
  total: number;
  signed: number;
  pending: number;
  completion: number;
}

function buildRows(consents: AnalyticsConsent[], keyFn: (c: AnalyticsConsent) => string): Row[] {
  const grouped = new Map<string, { total: number; signed: number; pending: number }>();
  consents.forEach((c) => {
    const key = keyFn(c) || "Sin dato";
    const current = grouped.get(key) || { total: 0, signed: 0, pending: 0 };
    current.total += 1;
    if (c.status === "signed") current.signed += 1;
    else current.pending += 1;
    grouped.set(key, current);
  });
  return Array.from(grouped.entries())
    .map(([name, row]) => ({
      name,
      ...row,
      completion: row.total ? Math.round((row.signed / row.total) * 100) : 0,
    }))
    .sort((a, b) => b.total - a.total);
}

const PAGE_MARGIN = 14;

export async function exportDashboardToPdf(filters: DashboardExportFilters): Promise<string> {
  const consents = await fetchAnalyticsConsents(filters.dateFrom, filters.dateTo);

  const total = consents.length;
  const signed = consents.filter((c) => c.status === "signed").length;
  const pending = total - signed;
  const completion = total ? Math.round((signed / total) * 100) : 0;

  const monthly = buildRows(consents, (c) => format(parseISO(c.created_at), "yyyy-MM"))
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((row) => ({ ...row, name: format(parseISO(`${row.name}-01`), "MMMM yyyy", { locale: es }) }));

  const eps = buildRows(consents, (c) =>
    getPayloadText(c.payload, ["eps", "EPS", "nombreEps", "NOMBRE_EPS", "entidad"], "Sin EPS registrada")
  );
  const specialty = buildRows(
    consents,
    (c) => CONSENT_TYPE_SPECIALTY[normalizeConsentType(c.consent_type)] || "General"
  );
  const doctors = buildRows(consents, (c) => (c.professional_name || "Sin profesional registrado").toUpperCase());
  const types = buildRows(consents, (c) => consentTypeLabel(c.consent_type));
  const centers = buildRows(consents, (c) =>
    getPayloadText(c.payload, ["centroSalud", "centro_salud", "sede"], "Sin sede asignada")
  );

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let y = PAGE_MARGIN;

  const ensureSpace = (needed: number) => {
    if (y + needed > pageHeight - 18) {
      doc.addPage();
      y = PAGE_MARGIN;
    }
  };

  // Header
  doc.setFillColor(13, 71, 121);
  doc.rect(0, 0, pageWidth, 26, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("E.S.E. HOSPITAL PEDRO LEÓN ÁLVAREZ DÍAZ DE LA MESA", pageWidth / 2, 11, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text("Informe gerencial de consentimientos informados", pageWidth / 2, 18, { align: "center" });
  y = 34;
  doc.setTextColor(30, 30, 30);

  // Filters used
  const fromLabel = filters.dateFrom ? format(parseISO(filters.dateFrom), "dd/MM/yyyy", { locale: es }) : "Sin límite";
  const toLabel = filters.dateTo ? format(parseISO(filters.dateTo), "dd/MM/yyyy", { locale: es }) : "Sin límite";
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("Filtros aplicados", PAGE_MARGIN, y);
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`Rango de fechas: ${fromLabel} a ${toLabel}`, PAGE_MARGIN, y);
  y += 4.5;
  doc.text(
    `Generado el: ${format(new Date(), "dd/MM/yyyy 'a las' HH:mm", { locale: es })}`,
    PAGE_MARGIN,
    y
  );
  y += 8;

  // KPI cards
  const kpis: Array<[string, string]> = [
    ["Total", String(total)],
    ["Firmados", String(signed)],
    ["Pendientes", String(pending)],
    ["Cumplimiento", `${completion}%`],
  ];
  const cardWidth = (pageWidth - PAGE_MARGIN * 2 - 9) / 4;
  kpis.forEach(([label, value], index) => {
    const x = PAGE_MARGIN + index * (cardWidth + 3);
    doc.setDrawColor(200, 210, 220);
    doc.setFillColor(243, 247, 251);
    doc.roundedRect(x, y, cardWidth, 18, 2, 2, "FD");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(90, 100, 110);
    doc.text(label, x + cardWidth / 2, y + 6, { align: "center" });
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(13, 71, 121);
    doc.text(value, x + cardWidth / 2, y + 14, { align: "center" });
  });
  doc.setTextColor(30, 30, 30);
  y += 26;

  const renderTable = (title: string, rows: Row[], maxRows = 20) => {
    ensureSpace(22);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(13, 71, 121);
    doc.text(title, PAGE_MARGIN, y);
    doc.setTextColor(30, 30, 30);
    y += 5;

    const colX = [PAGE_MARGIN, pageWidth - 78, pageWidth - 58, pageWidth - 38, pageWidth - 16];
    const drawHeader = () => {
      doc.setFillColor(232, 238, 245);
      doc.rect(PAGE_MARGIN, y, pageWidth - PAGE_MARGIN * 2, 7, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.text("Concepto", colX[0] + 2, y + 4.8);
      doc.text("Total", colX[1], y + 4.8, { align: "right" });
      doc.text("Firmados", colX[2], y + 4.8, { align: "right" });
      doc.text("Pendientes", colX[3], y + 4.8, { align: "right" });
      doc.text("Cumpl.", colX[4], y + 4.8, { align: "right" });
      y += 7;
    };
    drawHeader();

    const visible = rows.slice(0, maxRows);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);

    if (visible.length === 0) {
      doc.text("Sin datos en el rango seleccionado", colX[0] + 2, y + 5);
      y += 12;
      return;
    }

    visible.forEach((row, index) => {
      if (y + 6.5 > pageHeight - 18) {
        doc.addPage();
        y = PAGE_MARGIN;
        drawHeader();
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.5);
      }
      if (index % 2 === 1) {
        doc.setFillColor(248, 250, 252);
        doc.rect(PAGE_MARGIN, y, pageWidth - PAGE_MARGIN * 2, 6.5, "F");
      }
      const name = doc.splitTextToSize(row.name, pageWidth - 100)[0] as string;
      doc.text(name, colX[0] + 2, y + 4.5);
      doc.text(String(row.total), colX[1], y + 4.5, { align: "right" });
      doc.text(String(row.signed), colX[2], y + 4.5, { align: "right" });
      doc.text(String(row.pending), colX[3], y + 4.5, { align: "right" });
      doc.text(`${row.completion}%`, colX[4], y + 4.5, { align: "right" });
      y += 6.5;
    });

    if (rows.length > maxRows) {
      doc.setFontSize(7.5);
      doc.setTextColor(120, 125, 130);
      doc.text(`Mostrando ${maxRows} de ${rows.length} registros`, PAGE_MARGIN + 2, y + 4);
      doc.setTextColor(30, 30, 30);
      y += 6;
    }
    y += 6;
  };

  renderTable("Consentimientos por mes", monthly, 24);
  renderTable("Consentimientos por especialidad", specialty, 20);
  renderTable("Consentimientos por EPS / EAPB", eps, 20);
  renderTable("Consentimientos por profesional", doctors, 25);
  renderTable("Consentimientos por sede", centers, 20);
  renderTable("Consentimientos por tipo", types, 25);

  // Footer with page numbers
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(120, 125, 130);
    doc.text(
      "Sistema de Consentimientos Informados - Informe para validación administrativa",
      PAGE_MARGIN,
      pageHeight - 8
    );
    doc.text(`Página ${i} de ${pageCount}`, pageWidth - PAGE_MARGIN, pageHeight - 8, { align: "right" });
  }

  const fileName = `dashboard-consentimientos_${format(new Date(), "yyyyMMdd-HHmm")}.pdf`;
  doc.save(fileName);
  return fileName;
}
