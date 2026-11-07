const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
for(const folder of ['CNXuatKhoThuCong','MobileXuatKhoThuCong'])test(folder+': name/code suggestions select only an unambiguous material',()=>{
 const html=fs.readFileSync(folder+'/index.html','utf8'),els=Object.fromEntries(['manualMa','manualName','manualId','manualMaList','manualNameList'].map(id=>[id,{value:'',innerHTML:''}]));let renders=0;
 const ctx={stockItems:[{maNguyenLieu:'NL1',tenNguyenLieu:'Soda'},{maNguyenLieu:'NL1',tenNguyenLieu:'Soda'},{maNguyenLieu:'NL2',tenNguyenLieu:'Soda'}],document:{getElementById:id=>els[id]},escapeHtml:s=>s,resetManualStockDetail:()=>{els.manualName.value=''},renderManualIdOptions:()=>renders++};vm.createContext(ctx);vm.runInContext(html.slice(html.indexOf('  function manualMaterialOptions()'),html.indexOf('  function renderManualIdOptions()')),ctx);
 ctx.renderManualMaList();assert.equal((els.manualNameList.innerHTML.match(/<option/g)||[]).length,2);
 els.manualName.value='Soda';ctx.handleManualNameChange();assert.equal(els.manualMa.value,'');assert.equal(renders,0);
 els.manualName.value='Soda | NL2';ctx.handleManualNameChange();assert.equal(els.manualMa.value,'NL2');assert.equal(els.manualName.value,'Soda');assert.equal(renders,1);
 els.manualMa.value='nl1';ctx.handleManualMaChange();assert.equal(els.manualMa.value,'NL1');assert.equal(els.manualName.value,'Soda');assert.equal(renders,2);
 assert.ok(html.indexOf('id="manualName"')<html.indexOf('id="manualId"'));
});
