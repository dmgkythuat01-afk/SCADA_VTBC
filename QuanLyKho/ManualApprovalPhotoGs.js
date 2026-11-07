/** Read only the photo linked to a voucher row, after inventory-role authentication. */
function getManualApprovalPhoto(token, rowNumber) {
  requireInventoryRole_(token);
  const sheet=getSheet_(SHEET_PHIEU_XUAT_THU_CONG), n=Number(rowNumber);
  if(!Number.isInteger(n)||n<2||n>sheet.getLastRow())throw new Error('D\u00f2ng phi\u1ebfu kh\u00f4ng h\u1ee3p l\u1ec7.');
  const headers=sheet.getRange(1,1,1,sheet.getLastColumn()).getValues()[0].map(normalizeText_), column=headers.indexOf('anhXuat');
  const url=column<0?'':normalizeText_(sheet.getRange(n,column+1).getValue());
  const match=url.match(/^https:\/\/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/)||url.match(/^https:\/\/drive\.google\.com\/(?:open|uc)\?id=([a-zA-Z0-9_-]+)/);
  if(!match)throw new Error('Phi\u1ebfu ch\u01b0a c\u00f3 \u1ea3nh xu\u1ea5t h\u1ee3p l\u1ec7.');
  const file=DriveApp.getFileById(match[1]);
  if(file.getMimeType()!=='image/jpeg'||file.getSize()>3*1024*1024)throw new Error('\u1ea2nh kh\u00f4ng h\u1ee3p l\u1ec7.');
  return {dataUrl:'data:image/jpeg;base64,'+Utilities.base64Encode(file.getBlob().getBytes())};
}
