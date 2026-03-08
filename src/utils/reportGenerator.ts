import { GapAnalysisReport } from '../services/gapAnalysisService';
import { CEDAR_POINTE_ADDRESSES } from '../data/addresses';

export function generateCSVReport(report: GapAnalysisReport): string {
  const lines: string[] = [];

  lines.push('Cedar Pointe Address Gap Analysis Report');
  lines.push(`Generated: ${new Date(report.analysisDate).toLocaleString()}`);
  lines.push('');
  lines.push('SUMMARY');
  lines.push(`Total Properties: ${report.totalProperties}`);
  lines.push(`Total Gaps Found: ${report.totalGapsFound}`);
  lines.push(`Verified Properties: ${report.verifiedProperties}`);
  lines.push(`Completion: ${report.completionPercentage}%`);
  lines.push('');
  lines.push('GAPS BY STREET');
  lines.push(
    'Street,Total Numbers,Actual Properties,Gap Count,Gap Percentage'
  );

  for (const street of report.gapsByStreet) {
    lines.push(
      `"${street.direction} ${street.streetName} ${street.streetSuffix}",${street.totalNumbers},${street.actualProperties},${street.gapCount},${street.gapPercentage.toFixed(1)}%`
    );
  }

  lines.push('');
  lines.push('ALL GAPS (Missing Addresses)');
  lines.push('Street Number,Street Name,Full Address');

  for (const gap of report.allGaps.sort((a, b) => a.fullAddress.localeCompare(b.fullAddress))) {
    lines.push(`${gap.streetNumber},"${gap.direction} ${gap.streetName} ${gap.streetSuffix}","${gap.fullAddress}"`);
  }

  lines.push('');
  lines.push('ALL PROPERTIES (Confirmed)');
  lines.push('Address');

  for (const address of CEDAR_POINTE_ADDRESSES) {
    lines.push(`"${address}"`);
  }

  return lines.join('\n');
}

export function generateHTMLReport(report: GapAnalysisReport): string {
  const analysisDate = new Date(report.analysisDate).toLocaleString();

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Cedar Pointe Address Gap Analysis</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
      color: #333;
      line-height: 1.6;
    }
    h1 { color: #1e293b; margin-bottom: 10px; }
    .summary { background: #f1f5f9; padding: 15px; border-radius: 6px; margin-bottom: 20px; }
    .metric { display: inline-block; margin-right: 30px; margin-bottom: 10px; }
    .metric-label { font-size: 0.85em; color: #64748b; }
    .metric-value { font-size: 1.5em; font-weight: bold; color: #0f172a; }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 30px;
    }
    th {
      background: #1e293b;
      color: white;
      padding: 12px;
      text-align: left;
      font-weight: 600;
    }
    td {
      padding: 10px 12px;
      border-bottom: 1px solid #e2e8f0;
    }
    tr:hover { background: #f8fafc; }
    .high-gap { color: #dc2626; font-weight: 600; }
    .medium-gap { color: #f59e0b; font-weight: 600; }
    .timestamp { color: #64748b; font-size: 0.9em; }
    .section-title { font-size: 1.2em; font-weight: 600; color: #1e293b; margin-top: 30px; margin-bottom: 15px; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; }
  </style>
</head>
<body>
  <h1>Cedar Pointe Address Gap Analysis Report</h1>
  <p class="timestamp">Generated: ${analysisDate}</p>

  <div class="summary">
    <div class="metric">
      <div class="metric-label">Total Properties</div>
      <div class="metric-value">${report.totalProperties}</div>
    </div>
    <div class="metric">
      <div class="metric-label">Total Gaps Found</div>
      <div class="metric-value">${report.totalGapsFound}</div>
    </div>
    <div class="metric">
      <div class="metric-label">Verified Properties</div>
      <div class="metric-value">${report.verifiedProperties}</div>
    </div>
    <div class="metric">
      <div class="metric-label">Completion</div>
      <div class="metric-value">${report.completionPercentage}%</div>
    </div>
  </div>

  <div class="section-title">Gaps by Street</div>
  <table>
    <thead>
      <tr>
        <th>Street</th>
        <th>Total Numbers</th>
        <th>Actual Properties</th>
        <th>Gap Count</th>
        <th>Gap %</th>
      </tr>
    </thead>
    <tbody>
      ${report.gapsByStreet
        .map(street => {
          const gapClass = street.gapPercentage > 10 ? 'high-gap' : street.gapPercentage > 5 ? 'medium-gap' : '';
          return `
        <tr>
          <td>${street.direction} ${street.streetName} ${street.streetSuffix}</td>
          <td>${street.totalNumbers}</td>
          <td>${street.actualProperties}</td>
          <td class="${gapClass}">${street.gapCount}</td>
          <td>${street.gapPercentage.toFixed(1)}%</td>
        </tr>`;
        })
        .join('')}
    </tbody>
  </table>

  <div class="section-title">Missing Addresses (All Gaps)</div>
  <p>Total missing addresses: <strong>${report.allGaps.length}</strong></p>
  <table>
    <thead>
      <tr>
        <th>Address Number</th>
        <th>Street Name</th>
        <th>Full Address</th>
      </tr>
    </thead>
    <tbody>
      ${report.allGaps
        .sort((a, b) => a.fullAddress.localeCompare(b.fullAddress))
        .map(gap => `
        <tr>
          <td>${gap.streetNumber}</td>
          <td>${gap.direction} ${gap.streetName} ${gap.streetSuffix}</td>
          <td>${gap.fullAddress}</td>
        </tr>`)
        .join('')}
    </tbody>
  </table>

  <div class="section-title">Analysis Notes</div>
  <ul>
    <li>Gaps represent missing address numbers in sequential street ranges</li>
    <li>These may indicate non-buildable areas, water features, easements, or infrastructure</li>
    <li>Verification requires review of Miami-Dade County GIS and Property Appraiser records</li>
    <li>High gap percentages (>10%) suggest potential development opportunities or infrastructure constraints</li>
  </ul>
</body>
</html>`;
}

export function generateTextReport(report: GapAnalysisReport): string {
  const analysisDate = new Date(report.analysisDate).toLocaleString();
  const lines: string[] = [];

  lines.push('═'.repeat(80));
  lines.push('CEDAR POINTE ADDRESS GAP ANALYSIS REPORT');
  lines.push('═'.repeat(80));
  lines.push(`\nGenerated: ${analysisDate}`);
  lines.push('\n' + '─'.repeat(80));
  lines.push('SUMMARY');
  lines.push('─'.repeat(80));
  lines.push(`Total Properties:        ${report.totalProperties}`);
  lines.push(`Total Gaps Found:        ${report.totalGapsFound}`);
  lines.push(`Verified Properties:     ${report.verifiedProperties}`);
  lines.push(`Completion:              ${report.completionPercentage}%`);

  lines.push('\n' + '─'.repeat(80));
  lines.push('GAPS BY STREET (Sorted by Gap Count)');
  lines.push('─'.repeat(80));
  lines.push('Street'.padEnd(45) + 'Total'.padEnd(8) + 'Props'.padEnd(8) + 'Gaps'.padEnd(8) + 'Gap %'.padEnd(8));
  lines.push('─'.repeat(80));

  for (const street of report.gapsByStreet) {
    const streetName = `${street.direction} ${street.streetName} ${street.streetSuffix}`;
    lines.push(
      streetName.substring(0, 44).padEnd(45) +
      String(street.totalNumbers).padEnd(8) +
      String(street.actualProperties).padEnd(8) +
      String(street.gapCount).padEnd(8) +
      street.gapPercentage.toFixed(1).padEnd(7) + '%'
    );
  }

  lines.push('\n' + '─'.repeat(80));
  lines.push(`ALL MISSING ADDRESSES (Total: ${report.allGaps.length})`);
  lines.push('─'.repeat(80));

  const sortedGaps = report.allGaps.sort((a, b) => a.fullAddress.localeCompare(b.fullAddress));
  for (const gap of sortedGaps) {
    lines.push(gap.fullAddress);
  }

  lines.push('\n' + '─'.repeat(80));
  lines.push('RESEARCH NOTES');
  lines.push('─'.repeat(80));
  lines.push('• Gaps represent missing address numbers in sequential street ranges');
  lines.push('• These may indicate water features, easements, or infrastructure');
  lines.push('• High gap percentages (>10%) may suggest development opportunities');
  lines.push('• Verification requires Miami-Dade County GIS review');
  lines.push('═'.repeat(80));

  return lines.join('\n');
}

export function downloadReport(filename: string, content: string, mimeType: string = 'text/plain'): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
