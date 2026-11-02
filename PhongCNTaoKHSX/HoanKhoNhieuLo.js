// Dựng lại lượng trừ FIFO từ tổng thực xuất và ảnh chụp tồn từng lô trước khi xuất.
function phanBoHoanKhoNhieuLo_(idsText, quantity, unit, snapshotIdsText, quantitiesText, unitsText, ledgerText) {
  const split = value => normalizeText_(value).split(',').map(normalizeText_);
  const ids = split(idsText);
  if (!ids[0] || ids.some(id => !id) || new Set(ids).size !== ids.length) throw new Error('IdKhoDaTru không hợp lệ: ' + idsText);
  if (!isFinite(quantity) || quantity <= 0 || !unit) throw new Error('Thiếu số lượng hoặc đơn vị thực xuất để hoàn kho.');
  if (normalizeText_(ledgerText)) {
    let ledger;
    try { ledger=JSON.parse(ledgerText); } catch(error) { throw new Error('Chi tiết trừ kho không hợp lệ.'); }
    if(!Array.isArray(ledger)||ledger.length!==ids.length)throw new Error('Chi tiết trừ kho không khớp số lô.');
    const seen=new Set();let total=0;
    const result=ledger.map(part=>{
      const id=normalizeText_(part.IdKho),qty=Number(part.khoiLuong),sourceUnit=normalizeText_(part.donVi);
      if(!ids.includes(id)||seen.has(id)||!isFinite(qty)||qty<=0||!sourceUnit)throw new Error('Chi tiết trừ kho không khớp lô: '+id);
      seen.add(id);total+=convertUnitForCancelPlan_(qty,sourceUnit,'kg');
      return {id,quantity:qty,unit:sourceUnit};
    });
    if(Math.abs(total-quantity*unitToKgForCancelPlan_(unit))>0.000001*Math.max(1,ids.length))throw new Error('Tổng chi tiết trừ kho không khớp thực xuất.');
    return result;
  }
  if (ids.length === 1) return [{id: ids[0], quantity, unit}];

  const snapshotIds = split(snapshotIdsText);
  const quantities = split(quantitiesText);
  const units = split(unitsText);
  if (snapshotIds.length !== ids.length || quantities.length !== ids.length || units.length !== ids.length ||
      new Set(snapshotIds).size !== ids.length || ids.some(id => !snapshotIds.includes(id))) {
    throw new Error('Thiếu dữ liệu từng lô trước khi xuất (IdKho, khoiLuongKho, donViKho) cho: ' + idsText);
  }
  const capacities = new Map();
  snapshotIds.forEach((id, index) => {
    const before = Number(quantities[index]);
    if (!quantities[index] || !isFinite(before) || before <= 0 || !units[index]) throw new Error('Tồn trước khi xuất không hợp lệ cho lô ' + id);
    const capacity = convertUnitForCancelPlan_(before, units[index], unit);
    if (!isFinite(capacity) || capacity <= 0) throw new Error('Không quy đổi được tồn trước khi xuất của lô ' + id);
    capacities.set(id, capacity);
  });
  let remaining = quantity;
  const result = ids.map(id => {
    const taken = Math.min(capacities.get(id), remaining);
    if (taken <= 0.000001) throw new Error('Danh sách lô đã trừ không khớp tổng thực xuất: ' + idsText);
    remaining -= taken;
    return {id, quantity: taken, unit};
  });
  if (remaining > 0.000001) throw new Error('Tổng tồn từng lô trước khi xuất nhỏ hơn lượng đã xuất: ' + idsText);
  return result;
}
