/**
 * Generador mínimo de archivos .xlsx reales, sin librerías externas.
 *
 * Por qué existe este archivo: un .xlsx es, por dentro, un ZIP con archivos XML
 * (el formato OOXML). Aquí armamos ese ZIP a mano usando el método "store" (sin
 * comprimir), que es perfectamente válido para el formato y evita depender de
 * una librería de compresión. El resultado es un archivo que Excel, LibreOffice
 * y Google Sheets abren de verdad — no es un CSV disfrazado.
 *
 * Limitación consciente: no soporta estilos, fórmulas ni múltiples hojas.
 * Para un reporte de datos (lo que necesita PracticIA) es suficiente.
 */

type Celda = string | number | null | undefined;

/* ------------------------------ CRC32 ------------------------------ */
const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) {
    crc = CRC_TABLE[(crc ^ bytes[i]!) & 0xff]! ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

/* -------------------------- Utilidades ZIP -------------------------- */
const enc = new TextEncoder();

function dosDateTime(d = new Date()): { date: number; time: number } {
  const time = ((d.getHours() & 0x1f) << 11) | ((d.getMinutes() & 0x3f) << 5) | ((d.getSeconds() >> 1) & 0x1f);
  const date = (((d.getFullYear() - 1980) & 0x7f) << 9) | (((d.getMonth() + 1) & 0xf) << 5) | (d.getDate() & 0x1f);
  return { date, time };
}

interface ZipEntrada {
  nombre: Uint8Array;
  datos: Uint8Array;
  crc: number;
  offset: number;
}

/** Arma un .zip (método "store") a partir de {ruta: texto} y devuelve un Blob. */
function crearZip(archivos: Record<string, string>): Blob {
  const { date, time } = dosDateTime();
  const partes: Uint8Array[] = [];
  const entradas: ZipEntrada[] = [];
  let offset = 0;

  const push = (u8: Uint8Array) => {
    partes.push(u8);
    offset += u8.length;
  };

  for (const [ruta, contenido] of Object.entries(archivos)) {
    const nombre = enc.encode(ruta);
    const datos = enc.encode(contenido);
    const crc = crc32(datos);
    const entradaOffset = offset;

    const header = new DataView(new ArrayBuffer(30));
    header.setUint32(0, 0x04034b50, true); // firma local file header
    header.setUint16(4, 20, true); // versión mínima
    header.setUint16(6, 0, true); // flags
    header.setUint16(8, 0, true); // sin compresión (store)
    header.setUint16(10, time, true);
    header.setUint16(12, date, true);
    header.setUint32(14, crc, true);
    header.setUint32(18, datos.length, true); // tamaño comprimido = tamaño real (store)
    header.setUint32(22, datos.length, true);
    header.setUint16(26, nombre.length, true);
    header.setUint16(28, 0, true); // sin campo extra

    push(new Uint8Array(header.buffer));
    push(nombre);
    push(datos);

    entradas.push({ nombre, datos, crc, offset: entradaOffset });
  }

  const inicioCentral = offset;
  for (const e of entradas) {
    const header = new DataView(new ArrayBuffer(46));
    header.setUint32(0, 0x02014b50, true); // firma central directory
    header.setUint16(4, 20, true);
    header.setUint16(6, 20, true);
    header.setUint16(8, 0, true);
    header.setUint16(10, 0, true);
    header.setUint16(12, time, true);
    header.setUint16(14, date, true);
    header.setUint32(16, e.crc, true);
    header.setUint32(20, e.datos.length, true);
    header.setUint32(24, e.datos.length, true);
    header.setUint16(28, e.nombre.length, true);
    header.setUint16(30, 0, true);
    header.setUint16(32, 0, true);
    header.setUint16(34, 0, true);
    header.setUint16(36, 0, true);
    header.setUint32(38, 0, true);
    header.setUint32(42, e.offset, true);
    push(new Uint8Array(header.buffer));
    push(e.nombre);
  }
  const tamanoCentral = offset - inicioCentral;

  const eocd = new DataView(new ArrayBuffer(22));
  eocd.setUint32(0, 0x06054b50, true);
  eocd.setUint16(4, 0, true);
  eocd.setUint16(6, 0, true);
  eocd.setUint16(8, entradas.length, true);
  eocd.setUint16(10, entradas.length, true);
  eocd.setUint32(12, tamanoCentral, true);
  eocd.setUint32(16, inicioCentral, true);
  eocd.setUint16(20, 0, true);
  push(new Uint8Array(eocd.buffer));

  return new Blob(partes as BlobPart[], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}

/* --------------------------- Contenido OOXML --------------------------- */
const xmlEscape = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");

const colLetter = (i: number): string => {
  let n = i + 1;
  let s = "";
  while (n > 0) {
    const r = (n - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
};

function filaAXml(valores: Celda[], filaIdx: number): string {
  const celdas = valores
    .map((v, i) => {
      const ref = `${colLetter(i)}${filaIdx}`;
      if (v == null || v === "") return `<c r="${ref}"/>`;
      if (typeof v === "number" && Number.isFinite(v)) return `<c r="${ref}"><v>${v}</v></c>`;
      return `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${xmlEscape(String(v))}</t></is></c>`;
    })
    .join("");
  return `<row r="${filaIdx}">${celdas}</row>`;
}

/** Construye un .xlsx real con una sola hoja a partir de una matriz de filas (la primera fila = encabezados). */
export function buildXlsx(sheetName: string, rows: Celda[][]): Blob {
  const filasXml = rows.map((r, i) => filaAXml(r, i + 1)).join("");
  const nombreHoja = xmlEscape(sheetName.slice(0, 31) || "Datos");

  const archivos: Record<string, string> = {
    "[Content_Types].xml": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
</Types>`,
    "_rels/.rels": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`,
    "xl/workbook.xml": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheets><sheet name="${nombreHoja}" sheetId="1" r:id="rId1"/></sheets>
</workbook>`,
    "xl/_rels/workbook.xml.rels": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
</Relationships>`,
    "xl/worksheets/sheet1.xml": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${filasXml}</sheetData></worksheet>`,
  };

  return crearZip(archivos);
}

export function downloadXlsx(filename: string, sheetName: string, rows: Celda[][]) {
  const blob = buildXlsx(sheetName, rows);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
