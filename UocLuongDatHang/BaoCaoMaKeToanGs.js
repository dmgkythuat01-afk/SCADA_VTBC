/** Read-only module. Uses the same source columns/status parameters as Code.js,
 * but never invokes legacy calculation or sheet-creation helpers. */
function mktReadSnapshot() {
  const ss=SpreadsheetApp.getActive();
  const names={plans:'KeHoachBanHang',bom:'DinhLuong',stocks:'TonKho',receipts:'KeHoachHangVe',materials:'NguyenLieuVatTu',conversions:'QuyDoiDonVi',skuConversions:'QuyDoiSKU',parameters:'ThamSo'};
  const snapshot={headers:{},today:Utilities.formatDate(new Date(),'Asia/Ho_Chi_Minh','yyyy-MM-dd')};
  Object.keys(names).forEach(key=>{
    const sheet=ss.getSheetByName(names[key]);
    if(!sheet)throw new Error('Không tìm thấy sheet: '+names[key]);
    const values=sheet.getDataRange().getValues(),display=sheet.getDataRange().getDisplayValues();
    const headers=(values[0]||[]).map(v=>String(v).trim());snapshot.headers[key]=headers;
    snapshot[key]=values.slice(1).map((row,i)=>{
      const obj={};headers.forEach((h,c)=>{
        if(!h)return;
        const v=row[c];
        obj[h]=/^(MaKeToan\d*|maNguyenLieu|maSanPham|maDinhLuong)$/.test(h) ? String(display[i+1][c]).trim()
          : v instanceof Date ? Utilities.formatDate(v,'Asia/Ho_Chi_Minh','yyyy-MM-dd') : v;
      });return obj;
    }).filter(row=>Object.values(row).some(v=>v!==''));
  });
  snapshot.params={};snapshot.parameters.forEach(r=>{if(r.thamSo)snapshot.params[String(r.thamSo).trim()]=r.giaTri;});
  return snapshot;
}

function mktNumber_(v,label,fallback) {
  if(v==='' || v===undefined || v===null) {if(fallback!==undefined)return fallback;throw new Error('Thiếu số: '+label);}
  const n=Number(typeof v==='string'?v.trim().replace(',','.'):v);
  if(!Number.isFinite(n)||n<0)throw new Error('Số không hợp lệ: '+label);
  return n;
}
function mktText_(v){return String(v ?? '').trim();}
function mktDate_(v) {
  const text=mktText_(v),iso=text.match(/^(\d{4})-(\d{2})-(\d{2})/),vn=text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  const s=iso?iso[1]+'-'+iso[2]+'-'+iso[3]:vn?vn[3]+'-'+vn[2].padStart(2,'0')+'-'+vn[1].padStart(2,'0'):'';
  if(!s || isNaN(Date.parse(s+'T00:00:00Z')) || new Date(s+'T00:00:00Z').toISOString().slice(0,10)!==s)throw new Error('Ngày không hợp lệ: '+text);
  return s;
}
function mktAddDays_(s,n){const d=new Date(s+'T00:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10);}
function mktMonday_(s){const d=new Date(s+'T00:00:00Z');return mktAddDays_(s,-((d.getUTCDay()+6)%7));}
function mktWeek_(s,index) {
  const d=new Date(s+'T00:00:00Z');d.setUTCDate(d.getUTCDate()+3);
  const year=d.getUTCFullYear(),first=new Date(Date.UTC(year,0,1));
  return {index,start:s,end:mktAddDays_(s,6),year,week:Math.ceil((((d-first)/86400000)+1)/7)};
}
function mktBuildInputs(snapshot,options) {
  const p=snapshot.params||{},visible=Number((options||{}).weeks||4);
  if(![4,8,12].includes(visible))throw new Error('Số tuần phải là 4, 8 hoặc 12');
  const reserve=Math.floor(mktNumber_(p.soTuanGiuChoNguyenLieu,'soTuanGiuChoNguyenLieu',2));
  if(reserve>52)throw new Error('Số tuần giữ chỗ tối đa 52');
  const required=['MaKeToan1','MaKeToan2','MaKeToan3','SuDung0','SuDung1','SuDung2','SuDung3'];
  const missing=required.filter(h=>!(snapshot.headers.bom||[]).includes(h));
  if(missing.length)throw new Error('DinhLuong thiếu cột: '+missing.join(', '));
  const today=mktDate_(snapshot.today),start=mktMonday_(today),count=visible+reserve;
  const weeks=Array.from({length:count},(_,i)=>({...mktWeek_(mktAddDays_(start,i*7),i),visible:i<visible}));
  const index=date=>Math.floor((Date.parse(mktDate_(date))-Date.parse(start))/604800000);
  const text=mktText_,unit=v=>text(v).replace(/\/SKU$/i,'').trim().toLowerCase().replace(/\s+/g,'');
  const conversions=new Map(),materialConfig={},warnings=[];
  (snapshot.conversions||[]).forEach(r=>{if(text(r.trangThai||'Dang dung')!=='Ngung dung')conversions.set(unit(r.donViNguon)+'|'+unit(r.donViDich),mktNumber_(r.heSoQuyDoi,'heSoQuyDoi'));});
  const convert=(src,dst)=>{src=unit(src);dst=unit(dst);if(!src||!dst)throw new Error('Thiếu đơn vị quy đổi');if(src===dst)return 1;const factor=conversions.get(src+'|'+dst);if(!(factor>0))throw new Error('Thiếu quy đổi đơn vị: '+src+' -> '+dst);return factor;};
  (snapshot.materials||[]).forEach(r=>{
    const material=text(r.maNguyenLieu);if(!material||text(r.trangThai)==='Ngung dung')return;
    materialConfig[material]={name:text(r.tenNguyenLieu)||material,unit:unit(r.doViTinhToan||r.donViTinhToan||r.donViKho||r.donVi),safety:mktNumber_(r.tonAnToan,'tonAnToan '+material,0),pack:mktNumber_(r.quyCachDatHang,'quyCachDatHang '+material,1)||1,leadDays:mktNumber_(r.soNgayVeKhoMacDinh,'soNgayVeKhoMacDinh '+material,0)};
  });
  const ensure=(material,fallback)=>{
    if(!material)throw new Error('Thiếu maNguyenLieu');
    if(!materialConfig[material])materialConfig[material]={name:material,unit:unit(fallback),safety:0,pack:1,leadDays:0};
    const cfg=materialConfig[material];if(!cfg.unit)cfg.unit=unit(fallback);return cfg;
  };
  const stocks=[],receipts=[],demands=[],bomBySP=new Map(),bomIds=new Set(),factors=new Map();
  (snapshot.stocks||[]).filter(r=>text(r.trangThai)===text(p.trangThaiTonDuocTinh||'Dat')).sort((a,b)=>text(a.maNguyenLieu).localeCompare(text(b.maNguyenLieu))||text(a.MaKeToan).localeCompare(text(b.MaKeToan))).forEach(r=>{
    const material=text(r.maNguyenLieu),code=text(r.MaKeToan),u=unit(r.doViTinhToan||r.donViKho||r.donVi),cfg=ensure(material,u);
    if(!code)throw new Error('TonKho thiếu MaKeToan: '+material);
    const factor=mktNumber_(r.heSoQuyDoiKho,'heSoQuyDoiKho '+material,1);if(!factor)throw new Error('Hệ số quy đổi phải lớn hơn 0');
    const value=r.tonDauTuanQuyDoi!=='' && r.tonDauTuanQuyDoi!=null?mktNumber_(r.tonDauTuanQuyDoi,'tonDauTuanQuyDoi'):mktNumber_(r.khoiLuongNhap,'khoiLuongNhap')*factor;
    stocks.push({material,code,quantity:value*convert(u,cfg.unit)});
    const key=JSON.stringify([material,code]);if(!factors.has(key))factors.set(key,new Set());factors.get(key).add(factor);
  });
  (snapshot.bom||[]).forEach(r=>{
    if(text(r.trangThai)!=='Dang dung')return;
    const id=text(r.maDinhLuong);if(!id||bomIds.has(id))throw new Error('Trùng hoặc thiếu maDinhLuong: '+id);bomIds.add(id);
    const product=text(r.maSanPham),material=text(r.maNguyenLieu);if(!product||!material)throw new Error('BOM thiếu mã sản phẩm/nguyên liệu: '+id);
    ensure(material,r.donViDinhLuong);const choices=new Map();
    for(let priority=0;priority<4;priority++) {
      const enabled=r['SuDung'+priority]===true || text(r['SuDung'+priority]).toUpperCase()==='TRUE';
      const code=text(r['MaKeToan'+(priority||'')]);if(enabled&&code&&!choices.has(code))choices.set(code,priority);
    }
    const item={...r,id,material,choices:[...choices].map(([code,priority])=>({code,priority}))};
    if(!bomBySP.has(product))bomBySP.set(product,[]);bomBySP.get(product).push(item);
  });
  const aggregated=new Map();
  (snapshot.plans||[]).forEach(r=>{
    if(text(r.trangThai)!==text(p.trangThaiKeHoachDuocTinh||'Da duyet'))return;
    const weekIndex=index(r.ngaySanXuatDuKien||r.ngayDauTuan);if(weekIndex<0||weekIndex>=count)return;
    const product=text(r.maSanPham),sku=r.soLuongSKU!==''&&r.soLuongSKU!=null?mktNumber_(r.soLuongSKU,'soLuongSKU'):mktNumber_(r.soLuongKeHoach,'soLuongKeHoach')*mktNumber_(r.heSoQuyDoiRaSKU,'heSoQuyDoiRaSKU',1);
    const bom=bomBySP.get(product)||[];
    if(!bom.length)throw new Error('Không có BOM đang dùng cho sản phẩm: '+product);
    bom.forEach(b=>{
      const cfg=materialConfig[b.material],quantity=sku*mktNumber_(b.dinhLuong1SKU,'dinhLuong1SKU '+b.id)*convert(b.donViDinhLuong,cfg.unit)*(1+mktNumber_(b.haoHutPhanTram,'haoHutPhanTram '+b.id,0)/100);
      const id=JSON.stringify([weekIndex,product,b.id]);
      if(!aggregated.has(id))aggregated.set(id,{id,product,productName:text(r.tenSanPham)||product,material:b.material,weekIndex,quantity:0,choices:b.choices});
      aggregated.get(id).quantity+=quantity;
    });
  });
  [...aggregated.values()].sort((a,b)=>a.id.localeCompare(b.id)).forEach(d=>{demands.push(d);if(!d.choices.length)warnings.push('Không có mã được bật: '+d.product+' / '+d.material);});
  (snapshot.receipts||[]).forEach(r=>{
    if(text(r.trangThai)!==text(p.trangThaiHangVeDuocTinh||'Dang ve'))return;
    const weekIndex=index(r.ngayDuKienVe);if(weekIndex<0||weekIndex>=count)return;
    const material=text(r.maNguyenLieu),code=text(r.MaKeToan);if(!code)throw new Error('KeHoachHangVe thiếu MaKeToan: '+material);
    const cfg=ensure(material,r.doViTinhToan||r.donVi),known=factors.get(JSON.stringify([material,code]));
    let factor;
    if(r.heSoQuyDoiKho!==''&&r.heSoQuyDoiKho!=null)factor=mktNumber_(r.heSoQuyDoiKho,'heSoQuyDoiKho hàng về');
    else {if(known&&known.size>1)throw new Error('Hàng về cần heSoQuyDoiKho rõ ràng: '+code);factor=known&&known.size?[...known][0]:convert(r.donVi||cfg.unit,cfg.unit);}
    if(!(factor>0))throw new Error('Hệ số hàng về phải lớn hơn 0');
    const normalized=r.doViTinhToan?convert(r.doViTinhToan,cfg.unit):1;
    receipts.push({material,code,weekIndex,quantity:mktNumber_(r.soLuongVeDuKien,'soLuongVeDuKien')*factor*normalized});
  });
  return {today,weeks,visibleWeeks:visible,reserveWeeks:reserve,bufferDays:mktNumber_(p.soNgayDuPhongDatHang,'soNgayDuPhongDatHang',3),demands,stocks,receipts,materialConfig,warnings};
}

/** Physical inventory and hypothetical purchasing are deliberately separate. */
function mktSimulate(input) {
  const EPS=1e-9,warnings=[...(input.warnings||[])],demandReport=[],details=[],orders=new Map();
  const materials=[...new Set([...Object.keys(input.materialConfig),...input.demands.map(d=>d.material),...input.stocks.map(s=>s.material),...input.receipts.map(r=>r.material)])].sort();
  const copy=s=>s.map(x=>({...x}));
  const total=(list,key='quantity')=>list.reduce((n,x)=>n+x[key],0);
  const needs=(week,material)=>input.demands.filter(d=>d.weekIndex===week&&d.material===material);
  const arrivals=(week,material)=>input.receipts.filter(r=>r.weekIndex===week&&r.material===material);
  const solve=(stocks,demands)=>mktAllocate({stocks,demands});
  const balances=(r,material)=>r.balances.map(s=>({...s,material}));
  const permitted=material=>{
    const map=new Map();input.demands.filter(d=>d.material===material).forEach(d=>d.choices.forEach(c=>map.set(c.code,Math.min(map.get(c.code)??3,c.priority))));
    return [...map].map(([code,priority])=>({code,priority})).sort((a,b)=>a.priority-b.priority||(a.code<b.code?-1:a.code>b.code?1:0));
  };
  const physical={},virtual={};
  materials.forEach(material=>{physical[material]=copy(input.stocks.filter(s=>s.material===material));virtual[material]=copy(physical[material]);});
  input.weeks.forEach(week=>{
    materials.forEach(material=>{
      const cfg=input.materialConfig[material],demands=needs(week.index,material),receipts=arrivals(week.index,material),opening=copy(physical[material]);
      const result=solve(opening.concat(receipts),demands);physical[material]=balances(result,material);
      const choices=permitted(material),allowed=new Set(demands.flatMap(d=>d.choices.map(c=>c.code)));
      const available=total(opening.concat(receipts).filter(s=>allowed.has(s.code)));
      const row={weekIndex:week.index,year:week.year,week:week.week,start:week.start,material,name:cfg.name,unit:cfg.unit,choices,available,demand:result.totals.demand,allocated:result.totals.allocated,shortage:result.totals.shortage,receipts:total(receipts),closing:total(physical[material])};
      if(week.visible) {
        demandReport.push(row);
        details.push({...row,opening,arrivals:receipts,balances:physical[material],demands,allocations:result.allocations,shortages:result.shortages});
      }
    });
  });
  const scheduled=(week,material)=>[...orders.values()].filter(o=>o.needWeek===week&&o.material===material).map(o=>({material,code:o.code,quantity:o.proposed}));
  function addOrder(planningWeek,needWeek,material,choice,quantity,kind,products) {
    if(quantity<=EPS)return;
    const key=JSON.stringify([needWeek,material,choice.code]),cfg=input.materialConfig[material],week=input.weeks[needWeek];
    if(!orders.has(key))orders.set(key,{planningWeek,needWeek,material,name:cfg.name,unit:cfg.unit,code:choice.code,priority:choice.priority,baseShortage:0,reserve:0,safety:0,proposed:0,products:[],needDate:week.start,orderDate:mktAddDays_(week.start,-Math.ceil(cfg.leadDays+input.bufferDays)),year:week.year,week:week.week});
    const order=orders.get(key);order[kind]+=quantity;order.priority=Math.min(order.priority,choice.priority);
    order.products=[...new Set(order.products.concat(products||[]))].sort();
    const raw=order.baseShortage+order.reserve+order.safety;
    order.proposed=Math.ceil((raw-EPS)/cfg.pack)*cfg.pack;
    order.rounding=order.proposed-raw;order.late=order.orderDate<input.today;
  }
  // Rolling look-ahead. Only first week's projected closing becomes next base.
  for(let planningWeek=0;planningWeek<input.visibleWeeks;planningWeek++) {
    materials.forEach(material=>{
      let projected=copy(virtual[material]),firstClosing;
      const end=Math.min(input.weeks.length-1,planningWeek+input.reserveWeeks);
      for(let week=planningWeek;week<=end;week++) {
        const demands=needs(week,material),receipts=arrivals(week,material),before=copy(projected).concat(receipts);
        let result=solve(before.concat(scheduled(week,material)),demands);
        const groups=new Map();
        result.shortages.filter(s=>s.quantity>EPS).forEach(s=>{
          const d=demands.find(d=>d.id===s.demandId),choice=d.choices.slice().sort((a,b)=>a.priority-b.priority||(a.code<b.code?-1:1))[0];
          if(!choice) {warnings.push('Không thể đề xuất mã mua: '+d.product+' / '+material+' / '+input.weeks[week].start);return;}
          if(!groups.has(choice.code))groups.set(choice.code,{choice,quantity:0,products:[]});
          const group=groups.get(choice.code);group.quantity+=s.quantity;group.products.push(d.product);group.choice={code:choice.code,priority:Math.min(group.choice.priority,choice.priority)};
        });
        groups.forEach(g=>addOrder(planningWeek,week,material,g.choice,g.quantity,week===planningWeek?'baseShortage':'reserve',g.products));
        result=solve(before.concat(scheduled(week,material)),demands);
        projected=balances(result,material);
        if(week===end) {
          const choices=permitted(material),allowed=new Set(choices.map(c=>c.code)),cfg=input.materialConfig[material];
          const missing=Math.max(0,cfg.safety-total(projected.filter(s=>allowed.has(s.code))));
          if(missing>EPS) {
            if(choices.length) {
              addOrder(planningWeek,week,material,choices[0],missing,'safety',[]);
              result=solve(before.concat(scheduled(week,material)),demands);projected=balances(result,material);
            } else warnings.push('Không có mã hợp lệ để bổ sung tồn an toàn: '+material);
          }
        }
        if(week===planningWeek)firstClosing=copy(projected);
      }
      virtual[material]=firstClosing;
    });
  }
  const purchaseReport=[...orders.values()].sort((a,b)=>a.needWeek-b.needWeek||a.material.localeCompare(b.material)||a.code.localeCompare(b.code)).map(o=>{
    const detail=details.find(d=>d.weekIndex===o.needWeek&&d.material===o.material);
    return {...o,allocated:detail?total(detail.allocations.filter(a=>a.code===o.code)):0,receipts:total(arrivals(o.needWeek,o.material).filter(r=>r.code===o.code)),reason:'Mã được bật có ưu tiên cao nhất của nhu cầu thiếu; tồn an toàn/quy cách dùng cấu hình nguyên liệu.',configurationScope:'Nguyên liệu',assumedReceipt:true};
  });
  return {weeks:input.weeks,today:input.today,demandReport,purchaseReport,details,warnings:[...new Set(warnings)],reserveWeeks:input.reserveWeeks};
}

function mktGetReports(options) {
  const input=mktBuildInputs(mktReadSnapshot(),options||{});
  return {success:true,...mktSimulate(input),calculatedAt:new Date().toISOString()};
}
