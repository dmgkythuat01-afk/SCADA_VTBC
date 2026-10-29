const test=require('node:test'),a=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
function setup(){
 const nodes=new Map();const node=id=>{if(!nodes.has(id))nodes.set(id,{id,value:'',children:[],appendChild(child){if(child.parentElement)child.parentElement.children=child.parentElement.children.filter(item=>item!==child);this.children.push(child);child.parentElement=this;}});return nodes.get(id);};
 let legacyCalls=0, renders=0, reportRows=[];
 const ctx=vm.createContext({console,currentView:'mktPurchase',document:{getElementById:node,readyState:'loading',addEventListener(){}},mountDonDatHangCard(){},changeDonDatHangMaterialScope(){legacyCalls++;},renderDonDatHangMaterialOptions(){renders++;},MktReports:{purchaseRows:()=>reportRows},onDonDatHangMaterialSelected(){legacyCalls++;},onDonDatHangSupplierChange(){legacyCalls++;},addSelectedMaterialToOrder(){ctx.added=vm.runInContext('DON_DAT_HANG_SELECTED_MATERIAL',ctx);},prepareDonDatHangPrintForm(){},setLoading(){},alert(message){ctx.message=message;},escapeDonDatHangHtml:value=>String(value)});
 vm.runInContext('let DON_DAT_HANG_CURRENT_MATERIALS=[],DON_DAT_HANG_SELECTED_MATERIAL=null,DON_DAT_HANG_CURRENT_SUPPLIER="";',ctx);
 const old=node('reportView_baoCaoYeuCauDatHang');for(const id of ['donDatHangCard','donDatHangHistoryCard','poHistoryImageInput'])old.appendChild(node(id));
 vm.runInContext(fs.readFileSync(path.join(__dirname,'../../UocLuongDatHang/JS_DonDatHangMaKeToan.html'),'utf8').replace(/^\s*<script>\s*/,'').replace(/<\/script>\s*$/,''),ctx);
 return {ctx,node,api:vm.runInContext('MktPurchaseOrder',ctx),get legacyCalls(){return legacyCalls;},get renders(){return renders;},setRows(rows){reportRows=rows;}};
}
test('same PO form and history move between reports without duplicate nodes or lost draft',()=>{
 const s=setup();s.node('donDatHangCard').draft='KEEP';s.api.mount('mktPurchase');a.equal(s.node('donDatHangCard').parentElement.id,'mkt_reportView_mktPurchase');a.equal(s.node('mkt_reportView_mktPurchase').children.length,3);
 s.api.mount('mktPurchase');a.equal(s.node('mkt_reportView_mktPurchase').children.length,3);
 s.api.mount('baoCaoYeuCauDatHang');a.equal(s.node('donDatHangCard').parentElement.id,'reportView_baoCaoYeuCauDatHang');a.equal(s.node('donDatHangCard').draft,'KEEP');
});

test('new PO selects manufacturer independently from payment and adds its accounting code',async()=>{
 const s=setup();s.node('poNguyenLieuSearch').value='Material';
 vm.runInContext('DON_DAT_HANG_CURRENT_MATERIALS=[{tenNguyenLieu:"Material"}]',s.ctx);
 s.ctx.server=async()=>({data:{tenNguyenLieu:'Material',MaKeToan:'WRONG',phuongThucTTNCC1:'Cash',phuongThucTTNCC2:'30 days',phuongThucTTNCC3:'Cash',manufacturers:[{name:'Maker A',codes:['001']},{name:'Maker B',codes:['002']}]}});
 await vm.runInContext('onDonDatHangMaterialSelected()',s.ctx);
 a.match(s.node('poNhaSanXuatSelect').innerHTML,/Maker B/);
 a.match(s.node('poMktPaymentSelect').innerHTML,/30 days/);
 s.node('poMktPaymentSelect').value='30 days';vm.runInContext('MktPurchaseOrder.paymentChanged()',s.ctx);
 s.node('poNhaSanXuatSelect').value='2';vm.runInContext('onDonDatHangSupplierChange()',s.ctx);
 a.equal(s.node('poNhaSanXuat').value,'Maker B');a.equal(s.node('poPhuongThucThanhToan').value,'30 days');
 await vm.runInContext('addSelectedMaterialToOrder()',s.ctx);
 a.equal(s.ctx.added.MaKeToan,'002');a.equal(s.ctx.added.nhaCungCap2,'Maker B');a.equal(s.ctx.added.phuongThucTTNCC2,'30 days');
});

test('ambiguous manufacturer codes block adding a PO item',async()=>{
 const s=setup();s.node('poNguyenLieuSearch').value='Material';s.node('poNhaSanXuatSelect').value='1';
 vm.runInContext('DON_DAT_HANG_SELECTED_MATERIAL={tenNguyenLieu:"Material",manufacturers:[{name:"Maker",codes:["001","002"]}]}',s.ctx);
 await vm.runInContext('addSelectedMaterialToOrder()',s.ctx);
 a.equal(s.ctx.added,undefined);a.match(s.ctx.message,/mã kế toán/);
});

test('switching reports clears pending material selection but preserves the order draft',()=>{
 const s=setup();s.api.mount('mktPurchase');s.node('poNguyenLieuSearch').value='Material';
 vm.runInContext('DON_DAT_HANG_SELECTED_MATERIAL={tenNguyenLieu:"Material",manufacturers:[]}',s.ctx);
 s.node('poNhaSanXuatSelect').value='4';s.node('poNhaSanXuat').value='Order maker';
 s.ctx.currentView='baoCaoYeuCauDatHang';s.api.mount(s.ctx.currentView);
 a.equal(vm.runInContext('DON_DAT_HANG_SELECTED_MATERIAL',s.ctx),null);
 a.equal(s.node('poNhaSanXuatSelect').value,'');a.equal(s.node('poNguyenLieuSearch').value,'');
 a.equal(s.node('poNhaSanXuat').value,'Order maker');a.equal(s.node('poMktPaymentWrap').hidden,true);
});

test('a delayed material response cannot replace a newer selection',async()=>{
 const s=setup();let resolveFirst;
 vm.runInContext('DON_DAT_HANG_CURRENT_MATERIALS=[{tenNguyenLieu:"First"},{tenNguyenLieu:"Second"}]',s.ctx);
 s.ctx.server=async(fn,name)=>name==='First'?new Promise(resolve=>{resolveFirst=resolve;}):{data:{tenNguyenLieu:'Second',manufacturers:[{name:'Second maker',codes:['02']}]}};
 s.node('poNguyenLieuSearch').value='First';const first=vm.runInContext('onDonDatHangMaterialSelected()',s.ctx);
 s.node('poNguyenLieuSearch').value='Second';await vm.runInContext('onDonDatHangMaterialSelected()',s.ctx);
 resolveFirst({data:{tenNguyenLieu:'First',manufacturers:[{name:'First maker',codes:['01']}]}});await first;
 a.equal(vm.runInContext('DON_DAT_HANG_SELECTED_MATERIAL.tenNguyenLieu',s.ctx),'Second');
 a.match(s.node('poNhaSanXuatSelect').innerHTML,/Second maker/);a.doesNotMatch(s.node('poNhaSanXuatSelect').innerHTML,/First maker/);
});
test('need-order materials use new calculation; all-materials and old report keep legacy behavior',()=>{
 const s=setup();s.setRows([{key:'NL',code:'NL',name:'New material',unit:'kg',canDat:true,proposed:12,orderDate:'2026-10-29',needDate:'2026-11-02',purchases:[{code:'A'},{code:'A'},{code:'B'}]},{code:'ENOUGH',name:'Not needed',canDat:false}]);
 s.node('poNguyenLieuScope').value='needOrder';vm.runInContext('changeDonDatHangMaterialScope()',s.ctx);const rows=vm.runInContext('DON_DAT_HANG_CURRENT_MATERIALS',s.ctx);a.equal(rows.length,1);a.equal(rows[0].tenNguyenLieu,'New material');a.equal(rows[0].soLuongThieu,12);a.equal(rows[0].MaKeToan,'A, B');a.equal(s.legacyCalls,0);
 s.node('poNguyenLieuScope').value='all';vm.runInContext('changeDonDatHangMaterialScope()',s.ctx);a.equal(s.legacyCalls,1);
 s.ctx.currentView='baoCaoYeuCauDatHang';s.node('poNguyenLieuScope').value='needOrder';vm.runInContext('changeDonDatHangMaterialScope()',s.ctx);a.equal(s.legacyCalls,2);
});
