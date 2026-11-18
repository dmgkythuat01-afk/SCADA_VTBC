const test=require('node:test'),a=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
function setup(){
 const source=fs.readFileSync(path.join(__dirname,'../../QuanLyKho/index.html'),'utf8');
 let html='';const box={innerHTML:''};
 const ctx=vm.createContext({document:{getElementById:()=>box,createElement:()=>({click(){},remove(){}}),body:{appendChild(){},removeChild(){}}},Blob:function(parts){html=parts.join('');},URL:{createObjectURL:()=>'',revokeObjectURL(){}},showMessage(){}});
 for(const name of ['escapeHtml','normalizeReportHeaders','isAccountingCodeHeader','formatReportCell','renderGenericReportTable','exportRowsToExcel']){
  const start=source.indexOf('    function '+name+'(');if(start<0)continue;
  const next=source.indexOf('\n    function ',start+1);vm.runInContext(source.slice(start,next<0?undefined:next),ctx);
 }
 return {ctx,box,get html(){return html;}};
}
test('accounting codes remain continuous text while quantities retain numeric formatting',()=>{
 const {ctx,box}=setup();a.equal(ctx.formatReportCell('00102010','Mã kế toán'),'00102010');a.equal(ctx.formatReportCell(1012010,'MaKeToan'),'1012010');a.equal(ctx.formatReportCell(1234.5,'Số lượng'),'1.234,5');
 ctx.renderGenericReportTable('box',['Mã kế toán','Số lượng'],[{'Mã kế toán':'00102010','Số lượng':1234.5}]);a.ok(box.innerHTML.includes('00102010'));a.ok(!box.innerHTML.includes('1.020.10'));
});
test('Excel forces accounting code cells to text to preserve leading zeros',()=>{
 const state=setup();state.ctx.exportRowsToExcel('report.xls',['Mã kế toán'],[{'Mã kế toán':'00102010'}]);a.ok(state.html.includes('00102010'));a.ok(state.html.includes('mso-number-format'));
});
test('opt-in Excel numeric columns use raw numeric cells without Vietnamese thousands separators or units',()=>{const state=setup();state.ctx.exportRowsToExcel('report.xls',['Mã kế toán','Số lượng theo lô'],[{'Mã kế toán':'00102010','Số lượng theo lô':1234.5}],null,{numericColumns:['Số lượng theo lô']});a.ok(state.html.includes('x:num="1234.5"'));a.ok(state.html.includes('>1234.5</td>'));a.ok(!state.html.includes('1.234,5'));a.ok(state.html.includes('00102010'));});
