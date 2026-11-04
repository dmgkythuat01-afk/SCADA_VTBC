/** Read-only mapping of actual quantities to LotNo positions; never infer a multi-lot split. */
function exportLotHistoryDetails_(lotText, perLotText, total, unit) {
  const split = value => String(value === null || value === undefined ? '' : value).split(/\s*,\s*|\r?\n/).map(value => value.trim());
  const lots = split(lotText);
  const raw = String(perLotText === null || perLotText === undefined ? '' : perLotText).trim();
  const hasTotal = total !== '' && total !== null && total !== undefined && isFinite(Number(total));
  if (!raw && (lots.length !== 1 || !hasTotal)) return {text:'', quantities:[], warning:''};
  const values = raw ? split(raw) : [String(total)];
  const quantities = values.map(Number);
  const valid = values.length === lots.length && values.every((v,i) => v !== '' && isFinite(quantities[i]) && (raw ? quantities[i] > 0 : quantities[i] >= 0)) && hasTotal && Math.abs(quantities.reduce((sum,q) => sum+q,0)-Number(total)) <= 0.000001 * Math.max(1,lots.length);
  if (!valid) return {text:raw, quantities:[], warning:'D\u1eef li\u1ec7u kh\u1ed1i l\u01b0\u1ee3ng theo l\u00f4 kh\u00f4ng kh\u1edbp LotNo ho\u1eb7c t\u1ed5ng th\u1ef1c xu\u1ea5t.'};
  return {text:lots.map((lot,i) => (lot || 'Lot '+(i+1))+': '+quantities[i].toLocaleString('vi-VN',{maximumFractionDigits:12})+(unit ? ' '+unit : '')).join('; '), quantities:quantities, warning:''};
}
