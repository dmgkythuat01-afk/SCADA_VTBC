const test = require("node:test"),
  a = require("node:assert/strict"),
  fs = require("node:fs"),
  vm = require("node:vm");
test("mobile samples cover six roles, five request states and valid report/review ownership", () => {
  const c = {};
  vm.createContext(c);
  for (const name of ["Domain", "Store", "MobileSeed"])
    vm.runInContext(
      fs.readFileSync("QuanLyThietBi/appscript/" + name + ".js", "utf8"),
      c,
    );
  const data = c.mobileDemoData_(
    "2026-11-08",
    Object.fromEntries(
      ["truongca", "congnhan", "pcn", "kythuat", "cokhi", "tudonghoa"].map(
        (k) => [k, "example-not-real"],
      ),
    ),
  );
  a.deepEqual(
    Array.from(data.Account, (r) => r.role),
    ["TruongCa", "CongNhan", "PhongCongNghe", "KyThuat", "CoKhi", "TuDongHoa"],
  );
  a.equal(new Set(data.Requests.map((r) => r.status)).size, 5);
  a.ok(data.Requests.some((r) => r.componentId === ""));
  for (const d of data.ServiceReports) {
    const r = data.Requests.find((r) => r.id === d.requestId);
    a.ok(r);
    a.ok(data.Account.some((u) => u.useName === d.actualBy));
    a.equal(d.photos, "[]");
  }
  for (const v of data.ServiceReviews) {
    const r = data.Requests.find((r) => r.id === v.requestId);
    a.equal(v.createdBy, r.createdBy);
    a.ok(data.ServiceReports.some((d) => d.id === v.reportId));
  }
  const schema = vm.runInContext("EQUIPMENT_STORAGE", c);
  a.equal(schema.Requests.sheet, "PhieuYeuCau");
  a.equal(schema.ServiceReports.sheet, "BaoCaoKhacPhuc");
  a.equal(schema.ServiceReviews.sheet, "XacNhanKhacPhuc");
});
test("mobile page composes native scripts and has bottom nav, gallery and camera input without iframe getUserMedia", () => {
  const root = "QuanLyThietBi/appscript/";
  const html = fs
    .readFileSync(root + "MobileIndex.html", "utf8")
    .replace(
      /<\?!=\s*HtmlService\.createHtmlOutputFromFile\('([^']+)'\)\.getContent\(\);\s*\?>/g,
      (_, name) => fs.readFileSync(root + name + ".html", "utf8"),
    );
  const scripts = Array.from(
    html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g),
    (m) => m[1],
  );
  new vm.Script(scripts.join("\n"));
  a.ok(html.includes('id="mobileNav"'));
  a.ok(html.includes('capture="environment"'));
  a.ok(html.includes('id="mobileGalleryInput"'));
  a.ok(html.includes("multiple"));
  a.ok(!html.includes("getUserMedia"));
  a.ok(html.includes("mobileApi"));
});
test("a stale snapshot cannot overwrite or expire a newly signed-in session", async () => {
  const source = fs.readFileSync("QuanLyThietBi/appscript/MobileClient.html", "utf8").replace(/<\/?script>/g, "");
  for (const fail of [false, true]) {
    let success, failure;
    const elements = new Map();
    const element = id => {
      if (!elements.has(id)) elements.set(id, {value:"",hidden:false,addEventListener(){},close(){}});
      return elements.get(id);
    };
    const run = {withSuccessHandler(fn){success=fn;return this;},withFailureHandler(fn){failure=fn;return this;},mobileApi(){}};
    const c = {document:{getElementById:element,addEventListener(){}},sessionStorage:{getItem(){return null;},removeItem(){},length:0},URL:{revokeObjectURL(){}},crypto:{randomUUID:()=>"key"},setInterval(){},window:{google:{script:{run}},addEventListener(){}}};
    c.google=c.window.google;
    vm.createContext(c);vm.runInContext(source,c);
    const mobile=vm.runInContext("Mobile",c);
    mobile.state.token="old";
    const pending=mobile.load();
    mobile.state.token="new";mobile.state.data={marker:"new session"};
    if(fail)failure({message:"Phiên đăng nhập đã hết hạn."});else success({marker:"old session"});
    await pending;
    a.equal(mobile.state.token,"new");a.equal(mobile.state.data.marker,"new session");
    mobile.state.createDraft={description:"private unsent issue"};
    mobile.state.requestId="private-request";
    mobile.state.loading=false;
    const expiry=mobile.load();failure({message:"Phiên đăng nhập đã hết hạn."});await expiry;
    a.equal(mobile.state.token,"");a.equal(Object.keys(mobile.state.createDraft).length,0);
    a.equal(mobile.state.requestId,"");a.equal(mobile.state.page,"home");
  }
});
