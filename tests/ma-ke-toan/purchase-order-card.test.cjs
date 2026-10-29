const test=require('node:test'),a=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
function setup(){
 const nodes=new Map();const node=id=>{if(!nodes.has(id))nodes.set(id,{id,value:'',children:[],appendChild(child){if(child.parentElement)child.parentElement.children=child.parentElement.children.filter(item=>item!==child);this.children.push(child);child.parentElement=this;}});return nodes.get(id);};
 let legacyCalls=0, renders=0, reportRows=[];
 const ctx=vm.createContext({console,currentView:'mktPurchase',document:{getElementById:node,readyState:'loading',addEventListener(){}},mountDonDatHangCard(){},changeDonDatHangMaterialScope(){legacyCalls++;},renderDonDatHangMaterialOptions(){renders++;},MktReports:{purchaseRows:()=>reportRows}});
 vm.runInContext('let DON_DAT_HANG_CURRENT_MATERIALS=[],DON_DAT_HANG_SELECTED_MATERIAL=null;',ctx);
 const old=node('reportView_baoCaoYeuCauDatHang');for(const id of ['donDatHangCard','donDatHangHistoryCard','poHistoryImageInput'])old.appendChild(node(id));
 vm.runInContext(fs.readFileSync(path.join(__dirname,'../../UocLuongDatHang/JS_DonDatHangMaKeToan.html'),'utf8').replace(/^\s*<script>\s*/,'').replace(/<\/script>\s*$/,''),ctx);
 return {ctx,node,api:vm.runInContext('MktPurchaseOrder',ctx),get legacyCalls(){return legacyCalls;},get renders(){return renders;},setRows(rows){reportRows=rows;}};
}
test('same PO form and history move between reports without duplicate nodes or lost draft',()=>{
 const s=setup();s.node('donDatHangCard').draft='KEEP';s.api.mount('mktPurchase');a.equal(s.node('donDatHangCard').parentElement.id,'mkt_reportView_mktPurchase');a.equal(s.node('mkt_reportView_mktPurchase').children.length,3);
 s.api.mount('mktPurchase');a.equal(s.node('mkt_reportView_mktPurchase').children.length,3);
 s.api.mount('baoCaoYeuCauDatHang');a.equal(s.node('donDatHangCard').parentElement.id,'reportView_baoCaoYeuCauDatHang');a.equal(s.node('donDatHangCard').draft,'KEEP');
});
test('need-order materials use new calculation; all-materials and old report keep legacy behavior',()=>{
 const s=setup();s.setRows([{key:'NL',code:'NL',name:'New material',unit:'kg',canDat:true,proposed:12,orderDate:'2026-10-29',needDate:'2026-11-02',purchases:[{code:'A'},{code:'A'},{code:'B'}]},{code:'ENOUGH',name:'Not needed',canDat:false}]);
 s.node('poNguyenLieuScope').value='needOrder';vm.runInContext('changeDonDatHangMaterialScope()',s.ctx);const rows=vm.runInContext('DON_DAT_HANG_CURRENT_MATERIALS',s.ctx);a.equal(rows.length,1);a.equal(rows[0].tenNguyenLieu,'New material');a.equal(rows[0].soLuongThieu,12);a.equal(rows[0].MaKeToan,'A, B');a.equal(s.legacyCalls,0);
 s.node('poNguyenLieuScope').value='all';vm.runInContext('changeDonDatHangMaterialScope()',s.ctx);a.equal(s.legacyCalls,1);
 s.ctx.currentView='baoCaoYeuCauDatHang';s.node('poNguyenLieuScope').value='needOrder';vm.runInContext('changeDonDatHangMaterialScope()',s.ctx);a.equal(s.legacyCalls,2);
});
