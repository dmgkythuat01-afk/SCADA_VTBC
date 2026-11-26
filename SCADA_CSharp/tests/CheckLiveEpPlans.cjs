const fs=require('fs');
(async()=>{
 const code=fs.readFileSync('outputs/LuuCanBatch_V2_deploy/Code.js','utf8');
 const service=fs.readFileSync('CanScadaVienTreoBC/Services/GoogleSheetApiService.cs','utf8');
 const token=code.match(/const API_TOKEN\s*=\s*"([^"]+)"/)[1];
 const base=service.match(/_writeBaseUrl\s*=\s*"([^"]+)"/)[1];
 const url=new URL(base);url.searchParams.set('action','getScadaEpMangInPlans');url.searchParams.set('days','2');url.searchParams.set('token',token);
 const response=await fetch(url,{signal:AbortSignal.timeout(60000)});const data=await response.json();
 if(!data.success){console.log('API ERROR:',data.message);process.exitCode=1;return;}
 if(!Array.isArray(data.plans)||!data.trace)throw Error('Missing plans or trace');
 console.log(JSON.stringify({success:true,fromDate:data.fromDate,toDate:data.toDate,plans:data.plans.length,boxes:data.plans.reduce((n,p)=>n+(p.items||[]).length,0),traceContainers:(data.trace.KetQuaLapVi||[]).length,traceBtp:(data.trace.ChiTietBTPTheoThung||[]).length}));
})().catch(error=>{console.log('Verification failed:',error.message);process.exitCode=1;});
