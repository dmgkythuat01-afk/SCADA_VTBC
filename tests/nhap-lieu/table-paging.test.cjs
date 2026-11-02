const test=require('node:test'),a=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
function setup(){const ctx=vm.createContext({console,document:{}});vm.runInContext(fs.readFileSync(path.join(__dirname,'../../NhapLieuUocLuongDatHang/MasterTablePaging.html'),'utf8').match(/<script>([\s\S]*?)<\/script>/)[1],ctx);ctx.MASTER_TABLE_PAGES=vm.runInContext('MASTER_TABLE_PAGES',ctx);return ctx;}
test('large tables only render one page and retain original indices for edit/remove actions',()=>{
 const ctx=setup(),container={};const rows=Array.from({length:1200},(_,i)=>({__rowNumber:i+2,value:'Row '+i}));let calls=0;
 const render=(row,index)=>{calls++;return index;};
 a.equal(ctx.masterPagedMap(container,rows,()=>{},render).length,100);a.equal(calls,100);
 ctx.MASTER_TABLE_PAGES.get(container).page=4;
 const page=ctx.masterPagedMap(container,rows,()=>{},render);a.equal(page[0],400);a.equal(page[99],499);
 rows[400].value='Edited';ctx.masterPagedMap(container,rows,()=>{},render);a.equal(ctx.MASTER_TABLE_PAGES.get(container).page,4);
 const filtered=rows.filter(row=>row.__rowNumber===802);a.equal(ctx.masterPagedMap(container,filtered,()=>{},render).length,1);
 a.equal(ctx.MASTER_TABLE_PAGES.get(container).page,0);
 a.equal(ctx.masterPagedMap(container,rows,()=>{},render).length,100);a.equal(rows[400].value,'Edited');
});
test('empty filters hide pagination and page sizes remain bounded',()=>{
 const ctx=setup(),container={},rows=Array.from({length:230},(_,i)=>({originalIndex:i,row:{value:i}}));
 ctx.masterPagedMap(container,rows,()=>{},(_,i)=>i);const state=ctx.MASTER_TABLE_PAGES.get(container);state.size=50;state.page=4;
 a.deepEqual(Array.from(ctx.masterPagedMap(container,rows,()=>{},(_,i)=>i)),Array.from({length:30},(_,i)=>200+i));
 ctx.masterPageEmpty(container);a.equal(state.page,0);a.equal(state.signature,'');
});
