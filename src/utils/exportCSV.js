/**
 * exportCSV.js
 * ------------
 * CSV export utilities for APES CRM.
 *
 * Three export profiles:
 *   • exportToCSV           — full client overview
 *   • exportForFacebookAds  — Facebook Custom Audience format
 *   • exportForEmailMarketing — lightweight email-campaign list
 *
 * Uses papaparse's `unparse` for CSV serialization.
 */

import Papa from 'papaparse';

// ─── Internal helpers ───────────────────────────────────────────────

/**
 * Triggers a browser download of a CSV string.
 * @param {string} csvContent  — serialised CSV text
 * @param {string} filename    — desired file name (including .csv)
 */
function downloadCSV(csvContent, filename) {
  const blob = new Blob(['\uFEFF' + csvContent], {
    type: 'text/csv;charset=utf-8;',
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.display = 'none';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Release the blob URL after a short delay
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Splits a full name into first and last name.
 * Falls back to the full name as firstName if no space is found.
 * @param {string} fullName
 * @returns {{ firstName: string, lastName: string }}
 */
function splitName(fullName) {
  if (!fullName || typeof fullName !== 'string') {
    return { firstName: '', lastName: '' };
  }
  const parts = fullName.trim().split(/\s+/);
  const firstName = parts[0] || '';
  const lastName = parts.slice(1).join(' ') || '';
  return { firstName, lastName };
}

/**
 * Formats a number as ARS currency string (dot thousands, comma decimals).
 * @param {number} value
 * @returns {string}
 */
function formatARS(value) {
  if (typeof value !== 'number' || Number.isNaN(value)) return '0';
  return value.toLocaleString('es-CO', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

// ─── Public API ─────────────────────────────────────────────────────

/**
 * Exports the full client table as a downloadable CSV.
 *
 * Columns: Nombre | Email | Teléfono | Ciudad | DNI/CUIT |
 *          Total Consumido | Cantidad Compras | Segmento
 *
 * @param {Array<object>} clients   — unified client array
 * @param {string}        [filename='clientes_apes.csv']
 */
export function exportToCSV(clients, filename = 'clientes_apes.csv') {
  const rows = clients.map((c) => ({
    Nombre: c.name || '',
    Email: c.email || '',
    'Teléfono': c.phone || '',
    Ciudad: c.city || '',
    'DNI/CUIT': c.dniCuit || '',
    'Total Consumido': formatARS(c.totalSpent || 0),
    'Cantidad Compras': c.purchaseCount ?? 0,
    Segmento: c.segment || '',
  }));

  const csv = Papa.unparse(rows, { quotes: true });
  downloadCSV(csv, filename);
}

/**
 * Exports clients in the format required by Facebook Custom Audiences.
 *
 * Columns: email | phone | fn | ln | ct | country
 *
 * @param {Array<object>} clients
 * @param {string}        [filename='facebook_audience_apes.csv']
 */
export function exportForFacebookAds(clients, filename = 'facebook_audience_apes.csv') {
  const rows = clients
    .filter((c) => c.email || c.phone) // at least one identifier
    .map((c) => {
      const { firstName, lastName } = splitName(c.name);
      return {
        email: (c.email || '').toLowerCase().trim(),
        phone: (c.phone || '').replace(/\D/g, ''),
        fn: firstName.toLowerCase(),
        ln: lastName.toLowerCase(),
        ct: (c.city || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''),
        country: 'AR',
      };
    });

  const csv = Papa.unparse(rows, { quotes: false });
  downloadCSV(csv, filename);
}

/**
 * Exports a lightweight list for email marketing platforms
 * (Mailchimp, Brevo, etc.).
 *
 * Columns: Email | Nombre | Segmento | Ciudad
 *
 * @param {Array<object>} clients
 * @param {string}        [filename='email_marketing_apes.csv']
 */
export function exportForEmailMarketing(clients, filename = 'email_marketing_apes.csv') {
  const rows = clients
    .filter((c) => c.email && c.email.includes('@'))
    .map((c) => ({
      Email: (c.email || '').toLowerCase().trim(),
      Nombre: c.name || '',
      Segmento: c.segment || '',
      Ciudad: c.city || '',
    }));

  const csv = Papa.unparse(rows, { quotes: true });
  downloadCSV(csv, filename);
}
