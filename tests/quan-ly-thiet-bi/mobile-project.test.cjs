const test = require('node:test'), a=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
test('separate mobile project delegates authenticated workflow to the shared backend',()=>{
 const calls=[],c={EquipmentCore:{loginEquipment:(...args)=>{calls.push(['login',...args]);return {token:'opaque'};},logoutEquipment:(...args)=>calls.push(['logout',...args]),mobileApi:(...args)=>{calls.push(['api',...args]);return args[1]==='snapshot'?{desktopUrl:'wrong',requests:[]}:{ok:true};}}};
 vm.createContext(c);vm.runInContext(fs.readFileSync('MobileQuanLyThietBi/appscript/Code.js','utf8'),c);
 a.equal(c.loginEquipment('u','secret').token,'opaque');
 a.equal(c.mobileApi('opaque','snapshot',{}).desktopUrl,'https://script.google.com/macros/s/AKfycbxySBhZ2vOCKpWAgPOj8IlsIRCnH0HjkPxbzPr6pF5VsHuyL_RTDmJQfh4dKjCeVfRvKg/exec');
 a.equal(c.mobileApi('opaque','claim',{requestId:'r'}).ok,true);c.logoutEquipment('opaque');
 a.equal(calls[2][1],'opaque');a.equal(calls[2][2],'claim');
 a.equal(typeof c.equipmentApi,'undefined');
});
test('mobile project pins its backend library and owns mobile template files',()=>{
 const root='MobileQuanLyThietBi/appscript/',manifest=JSON.parse(fs.readFileSync(root+'appsscript.json','utf8'));
 a.equal(manifest.dependencies.libraries[0].userSymbol,'EquipmentCore');
 a.equal(manifest.dependencies.libraries[0].developmentMode,false);
 for(const f of ['MobileIndex','MobileStyles','MobileClient'])a.ok(fs.existsSync(root+f+'.html'));
 a.ok(!fs.existsSync(root+'Store.js'));
});
