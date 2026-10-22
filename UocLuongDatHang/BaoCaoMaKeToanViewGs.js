/** Presentation adapter: the inventory identity is material CODE + NAME.
 * Accounting codes remain capacities/permissions inside each material group. */
function mktCreateReports_(source,options) {
  const names=new Map(),text=mktText_;
  ['materials','bom','stocks','receipts'].forEach(list=>(source[list]||[]).forEach(r=>{
    const code=text(r.maNguyenLieu),name=text(r.tenNguyenLieu);
    if(code&&name){if(!names.has(code))names.set(code,new Set());names.get(code).add(name);}
  }));
  const snapshot={...source};
  ['materials','bom','stocks','receipts'].forEach(list=>{
    snapshot[list]=(source[list]||[]).map(r=>{
      const code=text(r.maNguyenLieu);if(!code)return {...r};
      let name=text(r.tenNguyenLieu);
      if(!name) {
        const candidates=names.get(code)||new Set([code]);
        if(candidates.size!==1)throw new Error('Thiếu tên nguyên liệu để xác định cặp mã + tên: '+code+' ('+list+', dòng '+(r.__rowNumber||'?')+')');
        name=[...candidates][0];
      }
      return {...r,maNguyenLieu:JSON.stringify([code,name]),tenNguyenLieu:name};
    });
  });
  const input=mktBuildInputs(snapshot,options);
  Object.keys(input.materialConfig).forEach(key=>{const pair=JSON.parse(key);input.materialConfig[key].code=pair[0];input.materialConfig[key].name=pair[1];});
  const result=mktSimulate(input),rows=new Map();
  const sum=(list,field='quantity')=>list.reduce((n,r)=>n+(r[field]||0),0);
  const codeLabel=choices=>choices.map(c=>c.code+' ('+c.priority+')').join(', ');
  result.details.filter(d=>d.visible).forEach(d=>{
    const cfg=input.materialConfig[d.material];
    if(!rows.has(d.material))rows.set(d.material,{key:d.material,code:cfg.code,name:cfg.name,unit:d.unit,choices:[],weeks:{},opening:sum(d.opening),actual:Array.isArray(source.actual)?0:null,leadtime:cfg.leadDays,proposed:0,purchases:[],products:[]});
    const row=rows.get(d.material),weekKey=d.year+'|'+d.week;
    const choiceMap=new Map(row.choices.map(c=>[JSON.stringify([c.code,c.priority]),c]));
    d.demands.forEach(n=>n.choices.forEach(c=>choiceMap.set(JSON.stringify([c.code,c.priority]),c)));
    row.choices=[...choiceMap.values()].sort((a,b)=>a.priority-b.priority||a.code.localeCompare(b.code));
    row.products=[...new Set(row.products.concat(d.demands.map(n=>n.productName||n.product)))].sort();
    row.weeks[weekKey]={...d,opening:sum(d.opening),receipts:sum(d.arrivals),closing:sum(d.balances),choices:d.choices};
  });
  result.purchaseReport.forEach(p=>{const row=rows.get(p.material);if(row){row.proposed+=p.proposed;row.purchases.push(p);}});
  if(source.actualError)result.warnings.push(source.actualError);
  (source.actual||[]).forEach(r=>{
    const code=text(r.maNguyenLieu),candidates=names.get(code)||new Set([code]);
    const name=text(r.tenNguyenLieu)||(candidates.size===1?[...candidates][0]:'');
    if(!name){rows.forEach(row=>{if(row.code===code)row.actual=null;});result.warnings.push('Không xác định được tên cho tồn thực tế '+code+' (dòng '+(r.__rowNumber||'?')+'); chưa tính cột tồn thực tế của mã này.');return;}
    const row=rows.get(JSON.stringify([code,name]));if(!row)return;
    try {
      const src=text(r.doViTinhToan||r.donViTinhToan||row.unit).toLowerCase(),dst=text(row.unit).toLowerCase();
      const conversion=src===dst?1:(source.conversions||[]).filter(c=>text(c.trangThai||'Dang dung')!=='Ngung dung').find(c=>text(c.donViNguon).toLowerCase()===src&&text(c.donViDich).toLowerCase()===dst)?.heSoQuyDoi;
      const factor=mktNumber_(conversion,'quy đổi tồn thực tế '+src+' -> '+dst);
      if(!(factor>0))throw new Error('Hệ số quy đổi phải lớn hơn 0');
      if(row.actual!==null)row.actual+=mktNumber_(r.khoiLuongNhap,'tồn thực tế')*mktNumber_(r.heSoQuyDoiKho,'heSoQuyDoiKho',1)*factor;
    } catch(err){row.actual=null;result.warnings.push('Không xác định được tồn thực tế '+row.code+' / '+row.name+': '+err.message);}
  });
  const matrixRows=[...rows.values()].sort((a,b)=>a.name.localeCompare(b.name,'vi')||a.code.localeCompare(b.code));
  matrixRows.forEach(row=>{
    row.maNguyenLieu=row.code;row.tenNguyenLieu=row.name;row.MaKeToan=codeLabel(row.choices);row.canDat=row.proposed>0;
    const earliest=row.purchases.slice().sort((a,b)=>a.orderDate.localeCompare(b.orderDate))[0];
    row.orderDate=earliest?earliest.orderDate:'';row.needDate=earliest?earliest.needDate:'';
  });
  const weeks=result.weeks.filter(w=>w.visible).map(w=>({...w,nam:w.year,tuan:w.week,ngayDauTuan:w.start,ngayCuoiTuan:w.end}));
  return {success:true,...result,matrix:{weeks,rows:matrixRows},calculatedAt:new Date().toISOString()};
}

/** Reuse the existing report markup/script in a private namespace. Old files
 * remain untouched; controls and forecast behaviour stay in sync with them. */
function mktLegacyTransform_(value) {
  const html=HtmlService.createHtmlOutputFromFile('BaoCao').getContent();
  const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
  ids.sort((a,b)=>b.length-a.length);
  value=value.replace(new RegExp(ids.map(id=>id.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|'),'g'),id=>id==='viewBaoCao'?'mktReports':'mkt_'+id);
  value=value.replace(/baoCaoForecastBanHang/g,'mktForecast').replace(/baoCaoNhuCauNguyenLieu/g,'mktDemand').replace(/baoCaoYeuCauDatHang/g,'mktPurchase');
  value=value.replace(/'reportView_'/g,"'mkt_reportView_'");
  value=value.replace(/\bon(click|change|input)="([^"]*)"/g,(all,event,handler)=>'on'+event+'="'+handler.replace(/\b([A-Za-z_$][\w$]*)\s*\(/g,(call,name)=>'MktLegacy.'+name+'(')+'"');
  return value;
}
function mktLegacyMarkup_(){return mktLegacyTransform_(HtmlService.createHtmlOutputFromFile('BaoCao').getContent());}
function mktLegacyStyle_(){return mktLegacyTransform_(HtmlService.createHtmlOutputFromFile('BaoCao_Style').getContent());}
function mktLegacyScript_() {
  const source=HtmlService.createHtmlOutputFromFile('JS_BaoCao').getContent().replace(/^\s*<script>\s*/,'').replace(/<\/script>\s*$/,'');
  const functions=[...source.matchAll(/\b(?:async\s+)?function\s+(\w+)\s*\(/g)].map(m=>m[1]);
  const body=mktLegacyTransform_(source);
  return '<script>const MktLegacy=(function(){let REPORT_MENU=[];\n'+body+`\n
    async function server(fn,...args){return MktReports.request(fn,...args);}
    renderNhuCauNguyenLieu=function(data){MktReports.renderDemand(data);};
    renderYeuCauDatHang=function(data){MktReports.renderPurchase(data);};
    function clearComputed(){NHU_CAU_NGUYEN_LIEU_CACHE={};YEU_CAU_DAT_HANG_CACHE={};}
    return {${functions.map(name=>name+':'+name).join(',')},clearComputed,
      reset:function(){clearComputed();FORECAST_BAN_HANG_CACHE={};FORECAST_SELECTED_CUSTOMERS=[];FORECAST_SELECTED_PRODUCTS=[];hideBaoCaoModule();},
      exportCurrentReportExcel:function(){if(currentView==='mktForecast')return exportCurrentReportExcel();return MktReports.exportExcel();},
      loadNhuCauNguyenLieu:function(force){if(force)MktReports.invalidate(Number(document.getElementById('mkt_materialDemandWeekCount').value));return loadNhuCauNguyenLieu(force);},
      loadYeuCauDatHang:function(force){if(force)MktReports.invalidate(Number(document.getElementById('mkt_orderRequestWeekCount').value));return loadYeuCauDatHang(force);}
    };})();</script>`;
}
