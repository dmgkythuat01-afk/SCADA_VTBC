const test=require('node:test'),a=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
test('DOCX package contains native editable Word XML with landscape page settings and UTF-8 text',()=>{
 const source=fs.readFileSync(path.join(__dirname,'../../QuanLyKho/WarehouseSlipWord.html'),'utf8');
 const title={nodeName:'H1',childNodes:[{nodeType:3,nodeValue:'PHIẾU NHẬP KHO'}]};
 const ctx=vm.createContext({TextEncoder,Uint8Array,DataView,DOMParser:class{parseFromString(){return {querySelector:()=>({children:[title]})};}}});
 vm.runInContext(source.match(/<script>([\s\S]*?)<\/script>/)[1],ctx);const api=vm.runInContext('WarehouseSlipWord',ctx);
 const bytes=Buffer.from(api.build('<section class="warehouse-slip"></section>')),files={};let offset=0;
 while(bytes.readUInt32LE(offset)===0x04034b50){
  const size=bytes.readUInt32LE(offset+18),nameSize=bytes.readUInt16LE(offset+26),extra=bytes.readUInt16LE(offset+28),start=offset+30+nameSize+extra;
  files[bytes.subarray(offset+30,offset+30+nameSize).toString('utf8')]=bytes.subarray(start,start+size).toString('utf8');offset=start+size;
 }
 a.equal(Object.keys(files).length,5);a.ok(files['[Content_Types].xml'].includes('wordprocessingml.document.main+xml'));a.ok(files['word/document.xml'].includes('PHIẾU NHẬP KHO'));a.ok(files['word/document.xml'].includes('w:orient="landscape"'));a.ok(!files['word/document.xml'].includes('altChunk'));a.equal(bytes.readUInt32LE(bytes.length-22),0x06054b50);
});
