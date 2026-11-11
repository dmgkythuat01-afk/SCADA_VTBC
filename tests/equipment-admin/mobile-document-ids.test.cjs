const {test}=require('node:test'),assert=require('node:assert/strict');
const {setup}=require('./mobile-work-fixture.cjs');
test('new mobile documents use readable prefixes and unique Vietnam millisecond timestamps',()=>{
 const f=setup({workflow:'v2'});f.c.mobileWorkIdMillis_=()=>Date.parse('2026-11-11T03:45:30.123Z');
 const owner=f.login('CongNhan'),initial=f.login('KyThuat'),worker=f.login('CoKhi');
 const r=f.create(owner,'repair'),lm=f.create(owner,'new_work');
 assert.equal(r.id,'SC11112026104530123');assert.equal(lm.id,'LM11112026104530124');
 let fresh=()=>f.api(owner,'snapshot').requests.find(x=>x.id===r.id);
 const event=f.api(initial,'assign',{requestId:r.id,revision:fresh().revision,worker:'cokhi',operationKey:'pc'});assert.match(event.id,/^PC\d{17}$/);
 let d=f.start(worker,fresh());assert.match(d.id,/^BP\d{17}$/);d=f.api(worker,'submitReport',{reportId:d.id,revision:d.revision,submitKey:'plan',content:'Biện pháp'});
 for(const [role,prefix]of [['PGDChatLuong','PDCL'],['PGDSanXuat','PDSX']]){const v=f.api(f.login(role),'approve',{requestId:r.id,reportId:d.id,decision:'accept',reviewKey:role});assert.match(v.id,new RegExp('^'+prefix+'\\d{17}$'));}
 d=f.start(worker,fresh());assert.match(d.id,/^BG\d{17}$/);d=f.api(worker,'uploadPhoto',{reportId:d.id,revision:d.revision,uploadKey:'anh',dataUrl:'data:image/jpeg;base64,/9j/2Q=='}).report;
 assert.match([...f.files.values()][0].name,/ANH\d{17}/);
 d=f.api(worker,'submitReport',{reportId:d.id,revision:d.revision,submitKey:'handover',performedDate:'2026-11-09'});const review=f.review(owner,fresh(),d);assert.match(review.id,/^XN\d{17}$/);
 const ids=[...f.tables.Requests,...f.tables.ServiceReports,...f.tables.ServiceReviews].map(x=>x.id);assert.equal(new Set(ids).size,ids.length);
 const count=f.tables.Requests.length;const prior=f.api(owner,'create',{requestKey:r.requestKey.slice(3)});assert.equal(prior.id,r.id);assert.equal(f.tables.Requests.length,count);
});
test('readable document generator rejects invalid prefixes and stays unique across API contexts and backward clocks',()=>{
 const f=setup({workflow:'v2'});f.c.mobileWorkIdMillis_=()=>Date.parse('2026-11-11T03:45:30.123Z');
 const first=f.c.mobileWorkDocumentId_('SC');f.c.mobileWorkResetContext_();f.c.mobileWorkIdMillis_=()=>Date.parse('2026-11-11T03:45:29.000Z');const second=f.c.mobileWorkDocumentId_('SC');
 assert.equal(first,'SC11112026104530123');assert.equal(second,'SC11112026104530124');assert.throws(()=>f.c.mobileWorkDocumentId_('bad-prefix'),/tiền tố/i);
});
