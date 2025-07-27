// Utility functions for exporting table data

// Convert array of objects to CSV string
export function exportToCSV(data, columns, filename = 'export.csv') {
  const header = columns.map(col => col.label || col).join(',');
  const rows = data.map(row =>
    columns.map(col => {
      const key = col.key || col;
      let value = row[key];
      if (typeof value === 'string') {
        value = value.replace(/"/g, '""');
        if (value.includes(',') || value.includes('"') || value.includes('\n')) {
          value = `"${value}"`;
        }
      }
      return value;
    }).join(',')
  );
  const csvContent = [header, ...rows].join('\r\n');
  downloadFile(csvContent, filename, 'text/csv');
}

// Export to JSON
export function exportToJSON(data, filename = 'export.json') {
  const jsonContent = JSON.stringify(data, null, 2);
  downloadFile(jsonContent, filename, 'application/json');
}

// Export to TXT (tab-separated)
export function exportToTXT(data, columns, filename = 'export.txt') {
  const header = columns.map(col => col.label || col).join('\t');
  const rows = data.map(row =>
    columns.map(col => {
      const key = col.key || col;
      return row[key];
    }).join('\t')
  );
  const txtContent = [header, ...rows].join('\r\n');
  downloadFile(txtContent, filename, 'text/plain');
}

// Export to Excel (simple xls format)
export function exportToExcel(data, columns, filename = 'export.xls') {
  let table = '<table><tr>' +
    columns.map(col => `<th>${col.label || col}</th>`).join('') +
    '</tr>' +
    data.map(row =>
      '<tr>' + columns.map(col => `<td>${row[col.key || col] || ''}</td>`).join('') + '</tr>'
    ).join('') +
    '</table>';
  const excelContent = `\uFEFF${table}`;
  downloadFile(excelContent, filename, 'application/vnd.ms-excel');
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
  }, 0);
} 