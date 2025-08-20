// Utility functions for exporting table data

// Normalize parameters: support two calling styles:
// - exportToCSV(data, filename)
// - exportToCSV(data, columns, filename)
function resolveParams(data, columnsOrFilename, filename) {
  let columns = null;
  let finalFilename = filename;

  if (Array.isArray(columnsOrFilename)) {
    columns = columnsOrFilename;
  } else if (typeof columnsOrFilename === 'string') {
    finalFilename = columnsOrFilename;
  }

  // If columns not provided, infer from first data row (object keys)
  if (!columns) {
    if (Array.isArray(data) && data.length > 0 && typeof data[0] === 'object' && data[0] !== null) {
      columns = Object.keys(data[0]).map(k => ({ key: k, label: k }));
    } else {
      columns = [];
    }
  } else {
    // Normalize columns: allow array of strings or array of { key, label }
    columns = columns.map(col => (typeof col === 'string' ? { key: col, label: col } : col));
  }

  // Default filename handling
  if (!finalFilename) {
    finalFilename = 'export';
  }

  return { columns, filename: finalFilename };
}

// Escape CSV value
function escapeCsvValue(value) {
  if (value === null || value === undefined) return '';
  const str = String(value);
  let out = str.replace(/"/g, '""');
  if (out.includes(',') || out.includes('"') || out.includes('\n')) {
    out = `"${out}"`;
  }
  return out;
}

// Convert array of objects to CSV string
export function exportToCSV(data, columnsOrFilename, filename) {
  const { columns, filename: finalFilename } = resolveParams(data, columnsOrFilename, filename);
  const header = columns.map(col => col.label || col.key).join(',');

  const rows = data.map(row =>
    columns.map(col => {
      const key = col.key;
      const value = row ? row[key] : '';
      return escapeCsvValue(value);
    }).join(',')
  );

  const csvContent = [header, ...rows].join('\r\n');
  downloadFile(csvContent, `${finalFilename}.csv`, 'text/csv;charset=utf-8;');
}

// Export to JSON
export function exportToJSON(data, filename = 'export.json') {
  const jsonContent = JSON.stringify(data, null, 2);
  downloadFile(jsonContent, filename, 'application/json;charset=utf-8;');
}

// Export to TXT (tab-separated)
export function exportToTXT(data, columnsOrFilename, filename) {
  const { columns, filename: finalFilename } = resolveParams(data, columnsOrFilename, filename);
  const header = columns.map(col => col.label || col.key).join('\t');
  const rows = data.map(row =>
    columns.map(col => {
      const key = col.key;
      const value = row ? row[key] : '';
      return value;
    }).join('\t')
  );
  const txtContent = [header, ...rows].join('\r\n');
  downloadFile(txtContent, `${finalFilename}.txt`, 'text/plain;charset=utf-8;');
}

// Export to Excel (simple HTML table, works with .xls extension)
export function exportToExcel(data, columnsOrFilename, filename) {
  const { columns, filename: finalFilename } = resolveParams(data, columnsOrFilename, filename);

  let table = '<table><tr>' +
    columns.map(col => `<th>${escapeHtml(col.label || col.key)}</th>`).join('') +
    '</tr>' +
    data.map(row =>
      '<tr>' + columns.map(col => `<td>${escapeHtml(row ? (row[col.key] ?? '') : '')}</td>`).join('') + '</tr>'
    ).join('') +
    '</table>';

  const excelContent = `\uFEFF${table}`;
  // Use .xls extension for better compatibility with HTML table approach
  downloadFile(excelContent, `${finalFilename}.xls`, 'application/vnd.ms-excel;charset=utf-8;');
}

// Simple HTML escape
function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Helper to trigger download
function downloadFile(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 100);
}