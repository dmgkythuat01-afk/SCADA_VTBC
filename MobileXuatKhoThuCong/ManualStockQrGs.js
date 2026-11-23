function buildManualStockQrBoot_(e){
  const params=e&&e.parameter||{},qr=String(params.qr||''),lineId=String(params.lineId||'');
  return JSON.stringify({url:ScriptApp.getService().getUrl()||'',qr:qr.length<=4096?qr:'',lineId:lineId.length<=512?lineId:''})
    .replace(/</g,'\\u003c').replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029');
}
