export interface ShippingLabelData {
  orderId: number
  barcode: string
  createdAt: string
  shipFrom: string
  shipTo: {
    name: string
    address: string
    city: string
    district: string
    phone: string
  }
  items: Array<{ name: string; qty: number }>
  totalItems: number
}

export function generateShippingLabelHTML(label: ShippingLabelData): string {
  const created = new Date(label.createdAt)
  const createdStr = isNaN(created.getTime())
    ? label.createdAt
    : created.toLocaleString('tr-TR', { dateStyle: 'medium', timeStyle: 'short' })

  const itemsRows = label.items
    .map(
      (it, idx) => `
        <tr>
          <td>${idx + 1}</td>
          <td>${escapeHtml(it.name)}</td>
          <td class="text-right">${it.qty}</td>
        </tr>`
    )
    .join('')

  return `<!doctype html>
<html lang="tr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Kargo Fişi #${label.orderId}</title>
  <style>
    :root{ --ink:#0f172a; --muted:#64748b; --accent:#16a34a; --border:#e2e8f0; }
    *{ box-sizing:border-box; }
    body{ margin:0; font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial; color:var(--ink); }
    .sheet{ width: 148mm; min-height: 210mm; padding: 14mm; margin: 0 auto; background:#fff; }
    @media print{ body{ background:#fff; } .sheet{ box-shadow:none; margin:0; } }
    @media screen{ body{ background:#f1f5f9; } .sheet{ box-shadow:0 10px 30px rgba(2,6,23,.15); margin:12px; border:1px solid var(--border); border-radius:12px; } }
    h1{ margin:0 0 4mm; font-size:18px; }
    .row{ display:grid; grid-template-columns:1fr 1fr; gap:8mm; }
    .card{ border:1px solid var(--border); border-radius:10px; padding:6mm; }
    .muted{ color:var(--muted); font-size:12px; }
    .value{ font-weight:700; }
    .barcode{ font-family: 'Courier New', ui-monospace, monospace; font-size:28px; letter-spacing:3px; text-align:center; padding:6mm; border:2px dashed var(--border); border-radius:10px; }
    .brand{ display:flex; align-items:center; justify-content:space-between; margin-bottom:6mm; }
    .brand .name{ font-weight:800; letter-spacing:.5px; font-size:16px; }
    .brand .tag{ color:#065f46; background:#ecfdf5; border:1px solid #a7f3d0; padding:4px 8px; border-radius:999px; font-size:11px; }
    table{ width:100%; border-collapse:collapse; }
    th, td{ padding:6px 8px; border-bottom:1px solid var(--border); font-size:13px; }
    th{ text-align:left; color:var(--muted); font-weight:600; }
    .text-right{ text-align:right; }
    .footer{ margin-top:8mm; display:flex; justify-content:space-between; font-size:12px; color:var(--muted); }
  </style>
  <script>
    window.addEventListener('load', () => setTimeout(() => window.print(), 200));
  </script>
  </head>
  <body>
    <div class="sheet">
      <div class="brand">
        <div class="name">huğlu outdoor</div>
        <div class="tag">Kargo Fişi</div>
      </div>

      <div class="row">
        <div class="card">
          <div class="muted">Sipariş No</div>
          <div class="value">#${label.orderId}</div>
        </div>
        <div class="card">
          <div class="muted">Oluşturulma</div>
          <div class="value">${createdStr}</div>
        </div>
      </div>

      <div class="row" style="margin-top:8mm">
        <div class="card">
          <div class="muted">Gönderen</div>
          <div class="value">${escapeHtml(label.shipFrom)}</div>
        </div>
        <div class="card">
          <div class="muted">Alıcı</div>
          <div class="value">${escapeHtml(label.shipTo.name)}</div>
          <div class="muted">${escapeHtml(label.shipTo.address)}</div>
          <div class="muted">${escapeHtml(label.shipTo.district)}, ${escapeHtml(label.shipTo.city)}</div>
          <div class="muted">${escapeHtml(label.shipTo.phone)}</div>
        </div>
      </div>

      <div class="card" style="margin-top:8mm">
        <div class="barcode">${escapeHtml(label.barcode)}</div>
      </div>

      <div class="card" style="margin-top:8mm">
        <table>
          <thead>
            <tr><th>#</th><th>Ürün</th><th class="text-right">Adet</th></tr>
          </thead>
          <tbody>
            ${itemsRows}
          </tbody>
          <tfoot>
            <tr>
              <td colspan="2" class="text-right" style="border-bottom:none; font-weight:700">Toplam Kalem</td>
              <td class="text-right" style="border-bottom:none; font-weight:700">${label.totalItems}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div class="footer">
        <div>Bu fiş kargo sevki için otomatik oluşturulmuştur.</div>
        <div>© ${new Date().getFullYear()} huğlu outdoor</div>
      </div>
    </div>
  </body>
</html>`
}

function escapeHtml(input: string): string {
  return String(input)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}


