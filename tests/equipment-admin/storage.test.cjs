const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
test('header-driven real storage adapter reads reordered account cells and preserves extra columns',()=>{
 const data=[['hoTen','matKhau','maNhanVien','tenDangNhap','email','chucVu','cotRieng'],['An','secret','NV1','demo.admin','','admin','KEEP']],c={};vm.createContext(c);vm.runInContext(fs.readFileSync('QuanLyThietBi/admin/Schema.js','utf8'),c);
 const sheet={getLastRow:()=>data.length,getLastColumn:()=>data[0].length,getRange:(r,col,n=1,width=1)=>({getValues:()=>Array.from({length:n},(_,i)=>Array.from({length:width},(_,j)=>data[r-1+i]?.[col-1+j]??'')),setNumberFormat(){return this;},setValues(values){for(let i=0;i<values.length;i++){data[r-1+i]??=[];for(let j=0;j<values[i].length;j++)data[r-1+i][col-1+j]=values[i][j];}return this;}})};
 c.SpreadsheetApp={openById:()=>({getSheetByName:()=>sheet}),flush(){}};
 const row=c.readAdminRows_('TaiKhoan')[0];assert.equal(row.tenDangNhap,'demo.admin');assert.equal(row.matKhau,'secret');assert.equal(row.chucVu,'admin');c.writeAdminRow_('TaiKhoan',{...row,hoTen:'Bình'},row._row);assert.equal(data[1][0],'Bình');assert.equal(data[1][6],'KEEP');
});
