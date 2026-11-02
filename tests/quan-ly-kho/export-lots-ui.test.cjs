const test=require('node:test'),a=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
test('lot editor preserves custom splits, validates shared stock and serializes only selected IDs and quantities',()=>{
 const nodes=new Map(),node=id=>{if(!nodes.has(id))nodes.set(id,{value:'',innerHTML:''});return nodes.get(id);};
 const item={rowNumber:2,MaKeToan:'001',donViCanXuat:'kg',khoiLuongCanXuat:8,revision:'REV',lotOptions:[{Id:'A',LotNo:'L1',qtyKg:5,available:5},{Id:'B',LotNo:'L2',qtyKg:20,available:20}],allocations:[{id:'A',quantity:5},{id:'B',quantity:3}]};
 const ctx=vm.createContext({console,document:{getElementById:node},exportApprovalRequests:[{items:[item]}]});
 vm.runInContext(fs.readFileSync(path.join(__dirname,'../../QuanLyKho/ExportLotSelection.html'),'utf8').match(/<script>([\s\S]*?)<\/script>/)[1],ctx);
 const api=vm.runInContext('ExportLots',ctx);node('exportActualQty_2').value='8';api.prepare(ctx.exportApprovalRequests);
 a.match(api.html(2),/Mã KT 001/);a.equal(api.collect(2).allocationError,'');
 api.change(2,0,'quantity',2);api.change(2,1,'quantity',6);a.equal(api.collect(2).allocationError,'');
 a.deepEqual(Array.from(api.collect(2).allocations,part=>[part.id,part.quantity]),[['A',2],['B',6]]);
 api.change(2,0,'quantity',7);a.match(api.collect(2).allocationError,/vượt tồn/);
 api.auto(2);a.deepEqual(Array.from(api.collect(2).allocations,part=>[part.id,part.quantity]),[['A',5],['B',3]]);
 api.change(2,0,'quantity',2);api.change(2,1,'quantity',6);
 ctx.exportApprovalRequests=[{items:[{...item,allocations:[{id:'A',quantity:5},{id:'B',quantity:3}]}]}];
 api.prepare(ctx.exportApprovalRequests);a.deepEqual(Array.from(api.collect(2).allocations,part=>[part.id,part.quantity]),[['A',2],['B',6]]);
 api.reset();api.prepare(ctx.exportApprovalRequests);a.deepEqual(Array.from(api.collect(2).allocations,part=>[part.id,part.quantity]),[['A',5],['B',3]]);
});
