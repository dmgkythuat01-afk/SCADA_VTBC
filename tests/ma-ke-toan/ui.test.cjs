const {test}=require('node:test'),a=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),{load}=require('./helpers.cjs');
const key=JSON.stringify(['NL','Material']);
function sample(){const weeks=[{index:0,year:2026,week:43,nam:2026,tuan:43,start:'2026-10-19',visible:true}];return {success:true,calculatedAt:'test',warnings:[],weeks,matrix:{weeks,rows:[{key,code:'NL',name:'<img onerror=bad>',unit:'kg',choices:[{code:'A',priority:0}],weeks:{'2026|43':{demand:10,receipts:0,closing:0}},opening:5,actual:5,proposed:5,canDat:true,products:[],purchases:[],leadtime:0}]},purchaseReport:[],details:[{weekIndex:0,material:key,name:'NL',demands:[{id:'d',product:'P',choices:[]}],allocations:[],shortages:[],opening:[],arrivals:[],balances:[]}]};}
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
 const {api,exported}=setup(async()=>sample());await api.show('mktDemand');api.exportExcel();a.equal(exported.rows[1][4],10);a.equal(typeof exported.rows[1][4],'number');
});

test('forecast responses from a logged-out session cannot populate the new namespace cache',async()=>{
 let done;const {api}=setup(()=>new Promise(r=>done=r));const pending=api.request('getBaoCaoForecastBanHang',4,'');const check=a.rejects(pending);api.reset();done({ok:true,weeks:[],products:[],customers:[]});await check;
});
