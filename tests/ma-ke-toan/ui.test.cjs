const {test}=require('node:test'),a=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),{load}=require('./helpers.cjs');
const key=JSON.stringify(['NL','Material']);
function sample(){
 const weeks=[{index:0,year:2026,week:43,nam:2026,tuan:43,start:'2026-10-19',visible:true}];
 const material={key,variant:'vP',code:'NL',name:'<img onerror=bad>',unit:'kg',choices:[{code:'A',priority:0}],weeks:{'2026|43':{demand:10,allocated:5,shortage:5,receipts:0,closing:0,demandIds:['d']}},opening:5,actual:5,proposed:5,canDat:true,products:[],purchases:[],leadtime:0};
 return {success:true,calculatedAt:'test',warnings:[],weeks,matrix:{weeks,rows:[material],products:[{code:'P',name:'Product P',materials:[material]}]},purchaseReport:[],details:[{weekIndex:0,material:key,name:'NL',unit:'kg',demands:[{id:'d',product:'P',quantity:10,choices:[{code:'A',priority:0}]}],allocations:[{demandId:'d',code:'A',priority:0,quantity:5}],shortages:[{demandId:'d',quantity:5}],opening:[],arrivals:[],balances:[]}]};
}
function setup(server){
 const elements=new Map();const el=id=>{if(!elements.has(id))elements.set(id,{value:id.includes('WeekCount')?'4':id.includes('DisplayFilter')?'all':'',innerHTML:'',textContent:'',disabled:false,classList:{add(){},remove(){}},style:{},showModal(){this.open=true;},close(){this.open=false;}});return elements.get(id);};
 const root=path.join(__dirname,'../../UocLuongDatHang');
 const generator=load(['BaoCaoMaKeToanViewGs.js'],{HtmlService:{createHtmlOutputFromFile:f=>({getContent:()=>fs.readFileSync(path.join(root,f+'.html'),'utf8')})}});
 const exported={};const XLSX={utils:{aoa_to_sheet:rows=>(exported.rows=rows),book_new:()=>({}),book_append_sheet(){}},writeFile(){}};
 const context=vm.createContext({XLSX,document:{getElementById:el,querySelectorAll:()=>[]},server,renderMenu(){},hideBaoCaoModule(){},setLoading(){},alert(){},esc:v=>String(v),fmtNum:v=>String(v),console,currentView:'mktDemand'});
 vm.runInContext(generator.mktLegacyScript_().replace(/^<script>/,'').replace(/<\/script>$/,''),context);
 vm.runInContext(fs.readFileSync(path.join(root,'JS_BaoCaoMaKeToan.html'),'utf8').replace(/^\s*<script>\s*/,'').replace(/<\/script>\s*$/,''),context);
 return {api:vm.runInContext('MktReports',context),legacy:vm.runInContext('MktLegacy',context),el,exported};
}

test('three matching report menus, isolated controls and shared snapshot detail',async()=>{
 let calls=0;const {api,el}=setup(async()=>{calls++;return sample();});for(const k of ['mktForecast','mktDemand','mktPurchase'])a.ok(api.isKey(k));a.ok(!api.isKey('mktDetails'));
 await api.show('mktDemand');a.equal(calls,1);a.ok(el('mkt_materialDemandTable').innerHTML.includes('&lt;img'));a.ok(!el('mkt_materialDemandTable').innerHTML.includes('<img'));api.openDetail(0,key);a.equal(el('mktDialog').open,true);a.equal(calls,1);await api.show('mktPurchase');a.equal(calls,1);a.ok(el('mkt_orderRequestTable').innerHTML.includes('Nhu c'));
});

test('failed reload clears stale matrix results',async()=>{let calls=0;const {api,legacy,el}=setup(async()=>{if(calls++)throw Error('offline');return sample();});await api.show('mktDemand');await legacy.loadNhuCauNguyenLieu(true);a.equal(el('mkt_materialDemandTable').innerHTML,'');});

test('duplicate compute requests share one call and logout invalidates pending response',async()=>{let done,calls=0;const {api}=setup(()=>{calls++;return new Promise(r=>done=r);});const p1=api.request('getBaoCaoNhuCauNguyenLieu',4),p2=api.request('getBaoCaoYeuCauDatHang',4);const check1=a.rejects(p1),check2=a.rejects(p2);a.equal(calls,1);api.reset();done(sample());await Promise.all([check1,check2]);});

test('purchase display filter keeps one material row and independent legacy cache',async()=>{const {api,legacy,el}=setup(async()=>sample());await api.show('mktPurchase');el('mkt_orderRequestDisplayFilter').value='needOrder';legacy.filterYeuCauDatHangClient();a.ok(el('mkt_orderRequestTable').innerHTML.includes('NL'));});



test('demand Excel export contains raw numeric amounts without detail button labels',async()=>{
 const {api,exported}=setup(async()=>sample());await api.show('mktDemand');api.exportExcel();a.equal(exported.rows[1][5],10);a.equal(typeof exported.rows[1][5],'number');
});

test('forecast responses from a logged-out session cannot populate the new namespace cache',async()=>{
 let done;const {api}=setup(()=>new Promise(r=>done=r));const pending=api.request('getBaoCaoForecastBanHang',4,'');const check=a.rejects(pending);api.reset();done({ok:true,weeks:[],products:[],customers:[]});await check;
});

test('purchase table matches legacy cell classes, multiline weeks, signed ending and VN dates',async()=>{
 const data=sample(),row=data.matrix.rows[0];row.leadtime=30;row.orderDate='2026-09-19';row.needDate='2026-10-19';row.weeks['2026|43'].closing=-5;
 const {api,el}=setup(async()=>data);await api.show('mktPurchase');const html=el('mkt_orderRequestTable').innerHTML;
 for(const name of ['order-request-name','order-request-week-demand','order-request-week-inbound','order-request-week-ending','order-request-negative','order-request-date','order-request-number'])a.ok(html.includes(name),name);
 a.ok(html.includes('19/09/2026'));a.ok(html.includes('19/10/2026'));a.ok(html.includes('<br>'));
});


test('demand table groups products and labels permitted priorities explicitly',async()=>{
 const data=sample();data.matrix.products.push({code:'Q',name:'Product Q',materials:[{...data.matrix.rows[0],variant:'vQ',choices:[{code:'QONLY',priority:2}]}]});
 const {api,el}=setup(async()=>data);await api.show('mktDemand');const html=el('mkt_materialDemandTable').innerHTML;
 a.ok(html.includes('Product P'));a.ok(html.includes('Product Q'));a.ok(html.includes('Ưu tiên 0'));a.ok(html.includes('Ưu tiên 2'));a.ok(html.includes('mkt-priority-0'));a.ok(html.includes('data-product="P"'));
 const pRow=html.match(/<tr[^>]*data-product="P"[^>]*>([\s\S]*?)<\/tr>/)[1];a.ok(!pRow.includes('QONLY'));
});

test('product detail excludes another products allocation and shortlist',async()=>{
 const data=sample();data.details[0].demands.push({id:'q',product:'Q',quantity:999,choices:[{code:'QONLY',priority:0}]});data.details[0].allocations.push({demandId:'q',code:'QONLY',priority:0,quantity:999});data.details[0].shortages.push({demandId:'q',quantity:0});
 const {api,el}=setup(async()=>data);await api.show('mktDemand');api.openDetail(0,key,'P',['d']);const html=el('mktDetailBody').innerHTML;a.ok(!html.includes('QONLY'));a.ok(html.includes('toàn nguyên liệu'));
});

test('variant detail does not suggest a code permitted only for another BOM variant',async()=>{
 const data=sample();data.purchaseReport=[{needWeek:0,material:key,products:['P'],code:'B',priority:0,proposed:99,unit:'kg',reason:'OTHER_VARIANT_PURCHASE',configurationScope:'Material'}];
 const {api,el}=setup(async()=>data);await api.show('mktDemand');api.openDetail(0,key,'P',['d']);a.ok(!el('mktDetailBody').innerHTML.includes('OTHER_VARIANT_PURCHASE'));
});
