const test=require('node:test'),a=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
function load(file,globals={}){const ctx=vm.createContext({console,...globals});let source=fs.readFileSync(path.join(__dirname,'../../NhapLieuUocLuongDatHang',file),'utf8');if(file.endsWith('.html'))source=source.match(/<script>([\s\S]*?)<\/script>/)[1];vm.runInContext(source,ctx);return ctx;}
test('accounting choices match both material code and name, preserve zeros and remove duplicates',()=>{
 const ctx=load('MasterPCNBomInlineGs.js');
 const result=ctx.masterPCNBom_codes_({maNguyenLieu:'NL',tenNguyenLieu:'Name'},[
 {maNguyenLieu:'NL',tenNguyenLieu:'Name',MaKeToan:'001'},
 {maNguyenLieu:'NL',tenNguyenLieu:'Name',MaKeToan:'002'},
 {maNguyenLieu:'NL',tenNguyenLieu:'Other',MaKeToan:'WRONG'},
 {maNguyenLieu:'Other',tenNguyenLieu:'Name',MaKeToan:'WRONG2'},
 {maNguyenLieu:' NL ',tenNguyenLieu:' Name ',MaKeToan:'001'}]);
 a.deepEqual(Array.from(result),['001','002']);
});
test('inline validation accepts blank codes and booleans but rejects codes from another material',()=>{
 const ctx=load('MasterPCNBomInlineGs.js');
 const values={MaKeToan:'001',MaKeToan1:'001',MaKeToan2:'',MaKeToan3:'002',SuDung0:'TRUE',SuDung1:'FALSE',SuDung2:'',SuDung3:'TRUE'};
 const result=ctx.masterPCNBom_validate_(values,['001','002']);
 a.equal(result.SuDung0,true);a.equal(result.SuDung1,false);a.equal(result.SuDung2,'');a.equal(result.MaKeToan1,'001');
 a.throws(()=>ctx.masterPCNBom_validate_({...values,MaKeToan1:'WRONG'},['001']),/MaKeToan1/);
 a.throws(()=>ctx.masterPCNBom_validate_({...values,MaKeToan:'WRONG'},['001','002']),/MaKeToan/);
 a.throws(()=>ctx.masterPCNBom_validate_({...values,SuDung1:'invalid'},['001','002']),/SuDung1/);
});
function backendSetup(){
 const headers=['maDinhLuong','maSanPham','maNguyenLieu','tenNguyenLieu','MaKeToan','dinhLuong1SKU','MaKeToan1','MaKeToan2','MaKeToan3','SuDung0','SuDung1','SuDung2','SuDung3'];
 const data=[headers,['BOM_SHARED','SP','NL','Name','000',12,'001','','','TRUE','FALSE','',''],['BOM_SHARED','SP','OTHER','Other','999',20,'','','','TRUE','','','']];
 const writes=[];let released=false;
 const sheet={getLastRow:()=>data.length,getLastColumn:()=>headers.length,getRange(row,col,count=1,width=1){return {getDisplayValues:()=>data.slice(row-1,row-1+count).map(r=>r.slice(col-1,col-1+width).map(String)),setNumberFormat(){return this;},setValue(value){data[row-1][col-1]=value;writes.push({row,col,value});return this;}};}};
 const ctx=load('MasterPCNBomInlineGs.js',{MASTER_PCN_CONFIG:{DINH_LUONG:'DinhLuong',NGUYEN_LIEU:'NguyenLieuVatTu'},masterPCN_getSheet_:()=>sheet,masterPCN_read_:()=>({rows:[{maNguyenLieu:'NL',tenNguyenLieu:'Name',MaKeToan:'001'},{maNguyenLieu:'NL',tenNguyenLieu:'Name',MaKeToan:'002'}]}),LockService:{getScriptLock:()=>({waitLock(){},releaseLock(){released=true;}})},SpreadsheetApp:{flush(){}}});
 const identity={maDinhLuong:'BOM_SHARED',maSanPham:'SP',maNguyenLieu:'NL',tenNguyenLieu:'Name'};
 const expected={MaKeToan:'000',MaKeToan1:'001',MaKeToan2:'',MaKeToan3:'',SuDung0:'TRUE',SuDung1:'FALSE',SuDung2:'',SuDung3:''};
 return {ctx,data,writes,get released(){return released;},request:{rowNumber:2,identity,expected,values:{...expected,MaKeToan:'001',MaKeToan1:'002',SuDung1:'TRUE'},ghiChu:'DO NOT WRITE'}};
}
test('row save writes all four code choices and four flags on the chosen physical BOM row',()=>{
 const s=backendSetup();const result=s.ctx.masterPCN_saveBOMAccounting(s.request);
 a.equal(s.writes.length,8);a.ok(s.writes.every(w=>w.row===2&&(w.col===5||w.col>=7)));
 a.equal(s.data[1][4],'001');a.equal(s.data[1][5],12);a.equal(s.data[1][6],'002');a.equal(s.data[1][10],true);
 a.equal(s.data[2][6],'');a.equal(result.row.__rowNumber,2);a.equal(result.row.SuDung1,'TRUE');a.equal(s.released,true);
});
test('stale identity, concurrent edits and invalid accounting codes are rejected before any write',()=>{
 for(const kind of ['identity','concurrent','code','row']){
  const s=backendSetup();
  if(kind==='identity')s.data[1][2]='CHANGED';
  if(kind==='concurrent')s.data[1][6]='OTHER';
  if(kind==='code')s.request.values.MaKeToan2='WRONG';
  if(kind==='row')s.request.rowNumber=1;
  a.throws(()=>s.ctx.masterPCN_saveBOMAccounting(s.request));a.equal(s.writes.length,0);a.equal(s.released,true);
 }
});

function frontendSetup(){
 const nodes=new Map();const node=id=>{if(!nodes.has(id))nodes.set(id,{value:'',textContent:'',innerHTML:''});return nodes.get(id);};
 const ctx=load('MasterPCN.html',{document:{getElementById:node},alert(){}});
 vm.runInContext(fs.readFileSync(path.join(__dirname,'../../NhapLieuUocLuongDatHang/MasterPCNBomInline.html'),'utf8').match(/<script>([\s\S]*?)<\/script>/)[1],ctx);
 const row={__rowNumber:2,maDinhLuong:'BOM_SHARED',maSanPham:'SP',maNguyenLieu:'NL',tenNguyenLieu:'Name',MaKeToan:'000',dinhLuong1SKU:'12',MaKeToan1:'001',MaKeToan2:'',MaKeToan3:'',SuDung0:'TRUE',SuDung1:'FALSE',SuDung2:'',SuDung3:''};
 ctx.fixture={row,other:{...row,__rowNumber:3,maNguyenLieu:'OTHER'},headers:Object.keys(row).filter(k=>k!=='__rowNumber'),catalog:[{maNguyenLieu:'NL',tenNguyenLieu:'Name',MaKeToan:'001'},{maNguyenLieu:'NL',tenNguyenLieu:'Name',MaKeToan:'002'},{maNguyenLieu:'OTHER',tenNguyenLieu:'Name',MaKeToan:'999'}]};
 vm.runInContext('MASTER_PCN.tab="bom";MASTER_PCN.data={dinhLuong:{headers:fixture.headers,rows:[fixture.row,fixture.other]},nguyenLieu:fixture.catalog}',ctx);
 return {ctx,node};
}
test('BOM table shows eight inline dropdowns per row, exact-pair codes and a save action',()=>{
 const s=frontendSetup();vm.runInContext('masterPCN_render()',s.ctx);
 const html=s.node('pcnTable').innerHTML;const first=html.split('<tbody>')[1].split('</tr>')[0];
 a.equal((first.match(/<select /g)||[]).length,8);a.match(first,/>002<\/option>/);a.doesNotMatch(first,/>999<\/option>/);
 a.match(first,/masterPCNBom_save\(2\)/);a.match(first,/Có/);a.match(first,/Không/);
});
test('product search lists full unique names, supports typing and exact selection',()=>{
 const s=frontendSetup();
 vm.runInContext('fixture.row.tenSanPham="Nước giặt hương hoa";fixture.other.tenSanPham="Nước giặt hương hoa cao cấp";MASTER_PCN.data.sanPham=[]',s.ctx);
 a.deepEqual(Array.from(vm.runInContext('masterPCNBom_products()',s.ctx)),['Nước giặt hương hoa','Nước giặt hương hoa cao cấp']);
 s.node('pcnProductInput').value='cao cấp';vm.runInContext('masterPCNBom_productInput();masterPCN_render()',s.ctx);
 a.doesNotMatch(s.node('pcnTable').innerHTML,/masterPCNBom_save\(2\)/);a.match(s.node('pcnTable').innerHTML,/masterPCNBom_save\(3\)/);
 vm.runInContext('masterPCNBom_productToggle(true);masterPCNBom_pickProduct(1)',s.ctx);
 a.equal(s.node('pcnProductInput').value,'Nước giặt hương hoa');
 a.match(s.node('pcnTable').innerHTML,/masterPCNBom_save\(2\)/);a.doesNotMatch(s.node('pcnTable').innerHTML,/masterPCNBom_save\(3\)/);
});
test('inline drafts survive search rerenders and saving one row preserves another draft',async()=>{
 const s=frontendSetup();vm.runInContext('masterPCNBom_change(2,"MaKeToan1","002");masterPCNBom_change(3,"SuDung1","TRUE");masterPCN_render()',s.ctx);
 a.match(s.node('pcnTable').innerHTML,/value="002" selected/);
 s.ctx.masterPCN_server=async(fn,request)=>{s.ctx.savedRequest=request;return {ok:true,row:{...s.ctx.fixture.row,...request.values}};};
 await vm.runInContext('masterPCNBom_save(2)',s.ctx);
 a.equal(s.ctx.savedRequest.values.MaKeToan1,'002');a.equal(s.ctx.savedRequest.expected.MaKeToan1,'001');
 a.equal(vm.runInContext('MASTER_PCN.data.dinhLuong.rows[0].MaKeToan1',s.ctx),'002');
 a.equal(vm.runInContext('MASTER_PCN_BOM_INLINE.drafts.get(3).values.SuDung1',s.ctx),'TRUE');
});
test('failed saves retain edits with a visible error; other PCN tabs remain read-only tables',async()=>{
 const s=frontendSetup();vm.runInContext('masterPCNBom_change(2,"MaKeToan1","002")',s.ctx);
 s.ctx.masterPCN_server=async()=>{throw new Error('Sheet changed; reload');};
 await vm.runInContext('masterPCNBom_save(2)',s.ctx);
 a.equal(vm.runInContext('MASTER_PCN_BOM_INLINE.drafts.get(2).values.MaKeToan1',s.ctx),'002');
 a.match(s.node('pcnTable').innerHTML,/Sheet changed; reload/);
 vm.runInContext('MASTER_PCN.tab="sku";MASTER_PCN.data.quyDoiSKU={headers:["MaKeToan1"],rows:[{__rowNumber:2,MaKeToan1:"TEXT"}]};masterPCN_render()',s.ctx);
 a.doesNotMatch(s.node('pcnTable').innerHTML,/<select|masterPCNBom_save/);a.match(s.node('pcnTable').innerHTML,/TEXT/);
});
test('all project scripts parse together and template includes exist',()=>{
 const root=path.join(__dirname,'../../NhapLieuUocLuongDatHang');
 const files=fs.readdirSync(root);const server=files.filter(file=>file.endsWith('.js')).map(file=>fs.readFileSync(path.join(root,file),'utf8')).join('\n');
 a.doesNotThrow(()=>new vm.Script(server));
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8').replace(/<\?!= include\('([^']+)'\); \?>/g,(_,name)=>fs.readFileSync(path.join(root,name+'.html'),'utf8'));
 const scripts=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(match=>match[1]);
 a.doesNotThrow(()=>new vm.Script(scripts.join('\n')));
});
