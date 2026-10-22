const {test}=require('node:test'),a=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),{load}=require('./helpers.cjs');
test('source normalization through report detail conserves 1400 and 100 shortage',()=>{
 const c=load(['PhanBoMaKeToan.js','BaoCaoMaKeToanGs.js']);
 const b=(id,qty,codes)=>({maDinhLuong:id,maSanPham:id,maNguyenLieu:'NL',dinhLuong1SKU:qty,donViDinhLuong:'kg',trangThai:'Dang dung',...Object.fromEntries(codes.flatMap((code,i)=>[['MaKeToan'+(i||''),code],['SuDung'+i,true]]))});
 const source={today:'2026-10-21',params:{soTuanGiuChoNguyenLieu:0},headers:{bom:['MaKeToan1','MaKeToan2','MaKeToan3','SuDung0','SuDung1','SuDung2','SuDung3']},materials:[{maNguyenLieu:'NL',donVi:'kg'}],stocks:['A','B','C','D','E'].map((MaKeToan,i)=>({maNguyenLieu:'NL',MaKeToan,tonDauTuanQuyDoi:[300,400,200,350,150][i],donVi:'kg',trangThai:'Dat'})),bom:[b('SP1',700,['A','B','C']),b('SP2',800,['A','B','D','E'])],plans:['SP1','SP2'].map(maSanPham=>({maSanPham,soLuongSKU:1,ngayDauTuan:'2026-10-19',trangThai:'Da duyet'})),receipts:[],conversions:[]};
 const r=c.mktSimulate(c.mktBuildInputs(source,{weeks:4}));a.equal(r.demandReport[0].allocated,1400);a.equal(r.demandReport[0].shortage,100);a.equal(r.purchaseReport[0].code,'A');a.equal(r.purchaseReport[0].proposed,100);a.equal(r.details[0].allocations.reduce((n,x)=>n+x.quantity,0),1400);
});
test('all assembled scripts parse and Apps Script basenames are unique',()=>{
 const root=path.join(__dirname,'../../UocLuongDatHang');
 function expand(text){return text.replace(/<\?!= include\('([^']+)'\); \?>/g,(_,f)=>expand(fs.readFileSync(path.join(root,f+'.html'),'utf8')));}
 const html=expand(fs.readFileSync(path.join(root,'Index.html'),'utf8'));
 const generator=load(['BaoCaoMaKeToanViewGs.js'],{HtmlService:{createHtmlOutputFromFile:f=>({getContent:()=>fs.readFileSync(path.join(root,f+'.html'),'utf8')})}});
 const assembled=html.replace(/<\?!= (mktLegacy(?:Style|Markup|Script)_)\(\); \?>/g,(_,fn)=>generator[fn]());
 for(const m of assembled.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi))new vm.Script(m[1]);
 const generatedIds=[...generator.mktLegacyMarkup_().matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
 const originalIds=[...fs.readFileSync(path.join(root,'BaoCao.html'),'utf8').matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
 a.equal(new Set(generatedIds).size,generatedIds.length);a.ok(generatedIds.every(id=>!originalIds.includes(id)));
 const names=new Set();for(const f of fs.readdirSync(root).filter(f=>/\.(js|html)$/.test(f))){const name=f.replace(/\.(js|html)$/,'');a.ok(!names.has(name),'duplicate Apps Script file: '+name);names.add(name);if(f.endsWith('.js'))new vm.Script(fs.readFileSync(path.join(root,f),'utf8'));}
});
test('allocator agrees with exhaustive integer optimization for small graphs',()=>{
 const c=load(['PhanBoMaKeToan.js']);let seed=17;const rand=n=>(seed=(seed*1664525+1013904223)>>>0)%n;
 for(let t=0;t<80;t++) {
  const stocks=['A','B','C'].map(code=>({code,quantity:rand(3)}));
  const demands=['P','Q'].map(id=>({id,product:id,quantity:rand(4),choices:stocks.filter(()=>rand(3)>0).map(s=>({code:s.code,priority:rand(4)}))}));
  const edges=demands.flatMap((d,j)=>d.choices.map(ch=>({j,i:stocks.findIndex(s=>s.code===ch.code),priority:ch.priority})));let best=null;
  function enumerate(k,supply,need,score){if(k===edges.length){if(!best||score.some((v,i)=>v!==best[i]&&score.slice(0,i).every((x,z)=>x===best[z])&&v>best[i]))best=score;return;}const e=edges[k];for(let q=0;q<=Math.min(supply[e.i],need[e.j]);q++){const s=supply.slice(),n=need.slice(),v=score.slice();s[e.i]-=q;n[e.j]-=q;v[0]+=q;if(e.priority<3)v[1+e.priority]+=q;enumerate(k+1,s,n,v);}}
  enumerate(0,stocks.map(s=>s.quantity),demands.map(d=>d.quantity),[0,0,0,0]);
  const r=c.mktAllocate({stocks,demands}),score=[r.totals.allocated,0,0,0];r.allocations.forEach(x=>{if(x.priority<3)score[x.priority+1]+=x.quantity;});a.deepEqual(score,best);
 }
});
