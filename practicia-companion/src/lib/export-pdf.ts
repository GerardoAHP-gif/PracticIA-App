export function exportToPdf(elementId: string, title: string = "Reporte PracticIA") {
  const content = document.getElementById(elementId);
  if (!content) return;

  const printWindow = window.open("", "_blank");
  if (!printWindow) return;

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>${title}</title>
        <style>
          body {
            font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            padding: 24px;
            color: #1e293b;
          }
          h1, h2, h3 { color: #0f172a; margin-bottom: 8px; }
          .surface-card {
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 16px;
            margin-bottom: 16px;
          }
          .badge {
            display: inline-block;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: bold;
            background-color: #e2e8f0;
          }
          @media print {
            body { padding: 0; }
            button { display: none !important; }
          }
        </style>
      </head>
      <body>
        <div style="margin-bottom: 20px; border-bottom: 2px solid #2563eb; padding-bottom: 10px;">
          <h2 style="margin: 0; color: #2563eb;">PracticIA — Plataforma de Prácticas Preprofesionales</h2>
          <p style="margin: 4px 0 0 0; font-size: 12px; color: #64748b;">Reporte generado el ${new Date().toLocaleDateString("es-PE")} ${new Date().toLocaleTimeString("es-PE")}</p>
        </div>
        ${content.innerHTML}
      </body>
    </html>
  `);

  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
    printWindow.close();
  }, 300);
}