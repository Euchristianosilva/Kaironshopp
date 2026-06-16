// Professional A6 (10x15cm) shipping label generator.
// Renders a self-contained HTML page with Code128 barcode (SVG via JsBarcode)
// and a QR Code (data URL via qrcode). Opens in a new window for printing
// or saving as PDF through the browser's print dialog.

import JsBarcode from "jsbarcode";
import QRCode from "qrcode";

export type LabelData = {
  orderId: string;
  orderCreatedAt: string | Date;
  trackingCode?: string | null;
  carrier?: string | null;
  shippingMethod?: string | null;
  fulfillmentStatus?: string | null;
  packageWeightGrams?: number | null;
  recipient: {
    name?: string | null;
    phone?: string | null;
    address?: string | null;
    number?: string | null;
    complement?: string | null;
    neighborhood?: string | null;
    city?: string | null;
    state?: string | null;
    zip?: string | null;
  };
  sender: {
    name?: string | null;
    phone?: string | null;
    address?: string | null;
    number?: string | null;
    complement?: string | null;
    neighborhood?: string | null;
    city?: string | null;
    state?: string | null;
    zip?: string | null;
    logoUrl?: string | null;
  };
  marketplaceName?: string;
  trackingUrl?: string;
  orderUrl?: string;
};

const esc = (v: unknown) =>
  String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

const fmtDate = (d: string | Date) => {
  try {
    return new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
  } catch { return ""; }
};

const fmtZip = (z?: string | null) => {
  if (!z) return "";
  const d = z.replace(/\D/g, "");
  return d.length === 8 ? `${d.slice(0,5)}-${d.slice(5)}` : z;
};

const STATUS_LABEL: Record<string, string> = {
  pending: "Pendente",
  processing: "Em preparação",
  shipped: "Enviado",
  delivered: "Entregue",
  canceled: "Cancelado",
  returned: "Devolvido",
};

async function buildBarcodeSvg(code: string): Promise<string> {
  if (!code) return "";
  const el = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  try {
    JsBarcode(el as any, code, {
      format: "CODE128",
      displayValue: false,
      margin: 0,
      height: 70,
      width: 2,
      background: "#ffffff",
      lineColor: "#000000",
    });
    return new XMLSerializer().serializeToString(el);
  } catch {
    return "";
  }
}

export async function buildLabelHtml(data: LabelData): Promise<string> {
  const r = data.recipient;
  const s = data.sender;
  const tracking = data.trackingCode || "";
  const shortOrder = data.orderId.slice(0, 8).toUpperCase();
  const marketplace = data.marketplaceName ?? "MercaBrasil";
  const trackingUrl = data.trackingUrl ?? (tracking ? `${window.location.origin}/account` : "");
  const orderUrl = data.orderUrl ?? `${window.location.origin}/account`;

  const qrPayload = JSON.stringify({
    orderId: data.orderId,
    tracking,
    orderUrl,
    trackingUrl,
  });
  const qrDataUrl = await QRCode.toDataURL(qrPayload, { margin: 0, width: 200, errorCorrectionLevel: "M" });
  const barcodeSvg = tracking ? await buildBarcodeSvg(tracking) : "";

  const recipientLines = [
    [r.address, r.number].filter(Boolean).join(", "),
    r.complement,
    r.neighborhood,
    `${r.city ?? ""}${r.state ? " - " + r.state : ""}`,
    `CEP: ${fmtZip(r.zip)}`,
  ].filter((l) => l && l.trim().length > 0);

  const senderLines = [
    [s.address, s.number].filter(Boolean).join(", "),
    s.complement,
    s.neighborhood,
    `${s.city ?? ""}${s.state ? " - " + s.state : ""}`,
    s.zip ? `CEP: ${fmtZip(s.zip)}` : "",
  ].filter((l) => l && l.trim().length > 0);

  const status = STATUS_LABEL[data.fulfillmentStatus ?? ""] ?? data.fulfillmentStatus ?? "—";
  const weight = data.packageWeightGrams ? `${(data.packageWeightGrams / 1000).toFixed(3).replace(".", ",")} kg` : "—";

  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<title>Etiqueta ${esc(shortOrder)}</title>
<style>
  @page { size: 100mm 150mm; margin: 0; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; background: #f3f4f6; font-family: Arial, Helvetica, sans-serif; color: #111; }
  .label {
    width: 100mm; height: 150mm;
    background: #fff; color: #000;
    padding: 3mm;
    display: flex; flex-direction: column;
    page-break-after: always;
    border: 1px solid #000;
  }
  .label:last-child { page-break-after: auto; }
  .row { display: flex; }
  .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1.5px solid #000; padding-bottom: 2mm; gap: 4mm; }
  .brand { display: flex; align-items: center; gap: 2mm; }
  .brand img { height: 9mm; width: auto; max-width: 22mm; object-fit: contain; }
  .brand .name { font-size: 11pt; font-weight: 900; letter-spacing: 0.3px; }
  .meta { text-align: right; font-size: 7pt; line-height: 1.3; }
  .meta b { font-size: 8.5pt; }
  .section { border-bottom: 1px dashed #000; padding: 1.8mm 0; }
  .section .title { font-size: 6.5pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.6px; color: #000; background: #000; color: #fff; display: inline-block; padding: 0.6mm 1.6mm; margin-bottom: 1.2mm; }
  .recipient .name { font-size: 11pt; font-weight: 900; line-height: 1.15; margin-bottom: 0.8mm; }
  .recipient .addr { font-size: 9pt; line-height: 1.25; }
  .recipient .cep { font-size: 10.5pt; font-weight: 900; margin-top: 1mm; }
  .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 2mm; }
  .info { font-size: 7.5pt; line-height: 1.25; }
  .info b { font-size: 7.5pt; }
  .logistics { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1mm; font-size: 7pt; }
  .logistics .cell { border: 1px solid #000; padding: 1mm; }
  .logistics .cell .k { font-size: 6pt; text-transform: uppercase; color: #333; }
  .logistics .cell .v { font-size: 8pt; font-weight: 700; }
  .codes { margin-top: auto; display: flex; gap: 2mm; align-items: flex-end; padding-top: 2mm; border-top: 2px solid #000; }
  .barcode { flex: 1; text-align: center; }
  .barcode svg { width: 100%; height: 16mm; }
  .barcode .tc { font-family: 'Courier New', monospace; font-size: 9.5pt; font-weight: 700; letter-spacing: 1px; margin-top: 0.5mm; }
  .qr { width: 22mm; height: 22mm; }
  .qr img { width: 100%; height: 100%; }
  .toolbar { position: fixed; top: 8px; right: 8px; display: flex; gap: 6px; z-index: 9999; }
  .toolbar button { font: 600 12px Arial; padding: 8px 14px; border: 0; border-radius: 6px; cursor: pointer; background: #111; color: #fff; }
  .toolbar button.alt { background: #2563eb; }
  @media print { .toolbar { display: none !important; } body { background: #fff; } .label { border: 0; } }
</style>
</head>
<body>
  <div class="toolbar">
    <button onclick="window.print()">Imprimir / Salvar PDF</button>
    <button class="alt" onclick="window.close()">Fechar</button>
  </div>

  <div class="label">
    <div class="header">
      <div class="brand">
        ${s.logoUrl ? `<img src="${esc(s.logoUrl)}" alt="logo" />` : ""}
        <div class="name">${esc(marketplace)}</div>
      </div>
      <div class="meta">
        <div><b>Pedido</b> #${esc(shortOrder)}</div>
        <div>Data pedido: ${esc(fmtDate(data.orderCreatedAt))}</div>
        <div>Emissão: ${esc(fmtDate(new Date()))}</div>
      </div>
    </div>

    <div class="section recipient">
      <div class="title">Destinatário</div>
      <div class="name">${esc(r.name ?? "—")}</div>
      <div class="addr">${recipientLines.map(esc).join("<br/>")}</div>
      <div class="cep">CEP: ${esc(fmtZip(r.zip))}</div>
      ${r.phone ? `<div class="info" style="margin-top:1mm">Tel: ${esc(r.phone)}</div>` : ""}
    </div>

    <div class="section">
      <div class="title">Remetente</div>
      <div class="info">
        <b>${esc(s.name ?? "—")}</b><br/>
        ${senderLines.map(esc).join("<br/>")}
        ${s.phone ? `<br/>Tel: ${esc(s.phone)}` : ""}
      </div>
    </div>

    <div class="section">
      <div class="title">Logística</div>
      <div class="logistics">
        <div class="cell"><div class="k">Transportadora</div><div class="v">${esc(data.carrier ?? "—")}</div></div>
        <div class="cell"><div class="k">Serviço</div><div class="v">${esc(data.shippingMethod ?? "—")}</div></div>
        <div class="cell"><div class="k">Peso</div><div class="v">${esc(weight)}</div></div>
        <div class="cell"><div class="k">Status</div><div class="v">${esc(status)}</div></div>
      </div>
    </div>

    <div class="codes">
      <div class="barcode">
        ${barcodeSvg || '<div style="font-size:9pt;color:#666">Sem código de rastreio</div>'}
        ${tracking ? `<div class="tc">${esc(tracking)}</div>` : ""}
      </div>
      <div class="qr"><img src="${qrDataUrl}" alt="QR" /></div>
    </div>
  </div>
</body>
</html>`;
}

export async function openShippingLabel(data: LabelData) {
  const html = await buildLabelHtml(data);
  const w = window.open("", "_blank", "width=480,height=720");
  if (!w) {
    alert("Permita pop-ups para abrir a etiqueta.");
    return;
  }
  w.document.open();
  w.document.write(html);
  w.document.close();
}

export async function downloadLabelHtml(data: LabelData) {
  // Saves a self-contained HTML file (the browser can later open and "Save as PDF")
  const html = await buildLabelHtml(data);
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `etiqueta-${data.orderId.slice(0, 8)}.html`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
