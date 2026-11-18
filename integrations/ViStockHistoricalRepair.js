/** One-time reconciliation planner. Not part of normal API writes. */
function viHistoryTime_(value){
  if(Object.prototype.toString.call(value)==='[object Date]')return isNaN(value)?'':Utilities.formatDate(value,'Asia/Ho_Chi_Minh','yyyy-MM-dd HH:mm:ss');
  let text=String(value??'').trim(),m;
  if(/[zZ]$|[+-]\d\d:\d\d$/.test(text)){const local=text.replace(/(?:[zZ]|[+-]\d\d:\d\d)$/,'').replace(/\.\d+$/,'');if(!viHistoryTime_(local))return '';const date=new Date(text);return isNaN(date)?'':Utilities.formatDate(date,'Asia/Ho_Chi_Minh','yyyy-MM-dd HH:mm:ss');}
  m=/^(\d{1,2})\/(\d{1,2})\/(\d{4})(.*)$/.exec(text);if(m)text=m[3]+'-'+m[2].padStart(2,'0')+'-'+m[1].padStart(2,'0')+m[4];
  m=/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/.exec(text);if(!m)return '';
  const y=Number(m[1]),month=Number(m[2]),day=Number(m[3]),hour=Number(m[4]||0),minute=Number(m[5]||0),second=Number(m[6]||0),d=new Date(Date.UTC(y,month-1,day));
  if(y<2000||y>2100||d.getUTCFullYear()!==y||d.getUTCMonth()!==month-1||d.getUTCDate()!==day||hour>23||minute>59||second>59)return '';
  return m[1]+'-'+m[2]+'-'+m[3]+(m[4]?' '+String(hour).padStart(2,'0')+':'+m[5]+':'+String(second).padStart(2,'0'):'');
}
function viHistoryPlan_(stock,events,aliases){
  const byId=new Map(),source=new Map(),changes=[],skipped=[];
  stock.forEach(row=>{const id=String(row.IdThungDungVi||'').trim();if(!id)return;if(!byId.has(id))byId.set(id,[]);byId.get(id).push(row);});
  events.forEach(row=>{const original=String(row.IdThungDungVi||'').trim(),id=aliases&&Object.prototype.hasOwnProperty.call(aliases,original)?String(aliases[original]).trim():original;if(!id)return;const time=viHistoryTime_(row.thoiGianLuu);if(!source.has(id))source.set(id,{count:0,time:''});const entry=source.get(id);entry.count++;if(time&&(!entry.time||time<entry.time))entry.time=time;});
  let exportedQuantity=0,matched=0,alreadyProcessed=0;
  const number=value=>String(value??'').trim()===''?0:Number(String(value).replace(/,/g,''));
  source.forEach((event,id)=>{
    const rows=byId.get(id)||[],skip=reason=>skipped.push({Id:id,reason});
    if(!rows.length){skip('Không có mã thùng trong KetQuaLapVi');return;}if(rows.length!==1){skip('Trùng mã thùng trong KetQuaLapVi');return;}matched++;
    const row=rows[0],remaining=number(row.soLuongViDaLap),issued=number(row.daXuat),time=String(row.thoiGianXuat??'').trim();
    if(!Number.isSafeInteger(remaining)||remaining<0||!Number.isSafeInteger(issued)||issued<0){skip('Số lượng không hợp lệ');return;}
    if(issued>0&&remaining===0&&time){alreadyProcessed++;return;}
    if(!event.time){skip('Thiếu thời gian ép màng hợp lệ');return;}
    if((issued>0&&remaining>0)||(remaining>0&&time)){skip('Đã có dấu xuất nhưng vẫn còn tồn, cần kiểm tra riêng');return;}
    if(remaining===0&&issued===0){skip('Không còn số lượng gốc để xác định số vỉ đã xuất');return;}
    const before={soLuongViDaLap:row.soLuongViDaLap??'',daXuat:row.daXuat??'',thoiGianXuat:row.thoiGianXuat??''},after={...before};
    if(remaining>0){after.soLuongViDaLap=0;after.daXuat=remaining;exportedQuantity+=remaining;}
    if(!time)after.thoiGianXuat=event.time;
    changes.push({row:row._row,Id:id,before,after});
  });return {eventRows:events.length,eventContainers:source.size,matched,alreadyProcessed,exportedQuantity,changes,skipped};
}
