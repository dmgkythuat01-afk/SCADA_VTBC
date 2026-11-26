using System;
using System.Data;
using CanScadaVienTreoBC.Services;
class MaterialSaveTests {
 static DataTable Table() { var t=new DataTable(); foreach(var c in new[]{"PhieuXuatId","KeHoachId","tenBaiLieu","STT","maNguyenLieu","IdBatch","SttBatchNL"}) t.Columns.Add(c); return t; }
 static void Assert(bool b,string m) { if(!b) throw new Exception(m); }
 static DataTable Select(DataTable pending, int required, string type, int saved) {
 var method=typeof(NguyenLieuCanSave).GetMethod("SelectForSave");
 Assert(method!=null,"Missing per-type save rule: Mau mui must allow one batch and resume after restart");
 try { return (DataTable)method.Invoke(null,new object[]{pending,"P","K","Recipe","1","A",required,type,saved}); }
 catch(System.Reflection.TargetInvocationException ex) { throw ex.InnerException; }
 }
 static void Reject(Action action,string reason) { bool rejected=false; try { action(); } catch(InvalidOperationException) { rejected=true; } Assert(rejected,reason); }
 static void PartialTests() {
 var t=Table(); t.Rows.Add("P","K","Recipe","1","A","C1","1");
 Assert(Select(t,3,"Màu mùi",0).Rows.Count==1,"Mau mui can save batch 1 of 3");
 Reject(()=>Select(t,3,"Thường",0),"Normal material still requires all batches");
 t.Rows[0]["IdBatch"]="C2"; t.Rows[0]["SttBatchNL"]="2";
 Assert(Select(t,3,"Màu Mùi",1).Rows.Count==1,"Resume batch 2 after restart with one saved");
 Reject(()=>Select(t,3,"Màu mùi",3),"Completed material remains locked after restart");
 t.Rows[0]["SttBatchNL"]="1";
 Reject(()=>Select(t,3,"Màu mùi",1),"Reject batch numbering reset after restart");
 t.Rows[0]["SttBatchNL"]="2"; t.Rows.Add("P","K","Recipe","1","A","C3","3");
 Assert(Select(t,3,"Màu mùi",1).Rows.Count==1,"Save one batch while retaining queued batches");
 Assert(t.Rows.Count==2,"Leave pending data intact");
 Reject(()=>Select(t,3,"unknown",1),"Unknown type cannot bypass complete-batch rule");
 }
 static void SqlBatchRulesTests() {
 var saved=Table(); saved.Rows.Add("P","K","Recipe","1","A","C1","1");
 var incoming=Table(); incoming.Rows.Add("P","K","Recipe","1","A","C2","2");
 Assert(NguyenLieuCanSave.GetNewRows(incoming,saved,3,true).Rows.Count==1,"Accept next color batch after restart");
 Reject(()=>NguyenLieuCanSave.GetNewRows(incoming,saved,3,false),"Normal material cannot use partial saves");
 saved.ImportRow(incoming.Rows[0]);
 Assert(NguyenLieuCanSave.GetNewRows(incoming,saved,3,true).Rows.Count==0,"Retry batch 2 without duplicating it or blocking on batch 1");
 incoming.Rows[0]["IdBatch"]="changed";
 Reject(()=>NguyenLieuCanSave.GetNewRows(incoming,saved,3,true),"Reject different ID reusing saved sequence");
 incoming.Rows[0]["IdBatch"]="C3"; incoming.Rows[0]["SttBatchNL"]="3";
 Assert(NguyenLieuCanSave.GetNewRows(incoming,saved,3,true).Rows.Count==1,"Allow final planned batch");
 saved.ImportRow(incoming.Rows[0]); incoming.Rows[0]["IdBatch"]="C4"; incoming.Rows[0]["SttBatchNL"]="4";
 Reject(()=>NguyenLieuCanSave.GetNewRows(incoming,saved,3,true),"Reject extra batch after full completion");
 var normal=Table(); normal.Rows.Add("P","K","Recipe","1","A","N1","1"); normal.Rows.Add("P","K","Recipe","1","A","N2","2");
 Assert(NguyenLieuCanSave.GetNewRows(normal,Table(),2,false).Rows.Count==2,"Normal material saves full batch set");
 incoming.Rows[0]["IdBatch"]="C5"; incoming.Rows[0]["SttBatchNL"]="5";
 Reject(()=>NguyenLieuCanSave.GetNewRows(incoming,saved,6,true),"Reject missing sequence");
 }
 static void Main() {
 PartialTests();
 SqlBatchRulesTests();
 var t=Table(); t.Rows.Add("P","K","Recipe","1","A","B1","1"); t.Rows.Add("P","K","Recipe","1","A","B2","2"); t.Rows.Add("P","K","Recipe","2","B","B3","1");
 var result=NguyenLieuCanSave.SelectComplete(t,"P","K","Recipe","1","A",2);
 Assert(result.Rows.Count==2,"Must save A without requiring B"); Assert(t.Rows.Count==3,"Must preserve other materials");
 bool rejected=false; try { NguyenLieuCanSave.SelectComplete(t,"P","K","Recipe","2","B",2); } catch(InvalidOperationException) { rejected=true; } Assert(rejected,"Reject incomplete material");
 t.Rows[1]["SttBatchNL"]="1"; rejected=false; try { NguyenLieuCanSave.SelectComplete(t,"P","K","Recipe","1","A",2); } catch(InvalidOperationException) { rejected=true; } Assert(rejected,"Reject duplicated batch sequence");
 t.Rows[1]["SttBatchNL"]="2"; t.Rows.Add("P","K2","Recipe","1","A","B4","1"); Assert(NguyenLieuCanSave.SelectComplete(t,"P","K","Recipe","1","A",2).Rows.Count==2,"Do not mix plans");
 result.TableName="ChiTietCanBatch"; result.ExtendedProperties["SavedAt"]=DateTime.Now.ToString("o");
 using(var stream=new System.IO.MemoryStream()) { result.WriteXml(stream,XmlWriteMode.WriteSchema); stream.Position=0; var recovered=new DataSet(); recovered.ReadXml(stream,XmlReadMode.ReadSchema); Assert(recovered.Tables[0].Rows.Count==2,"Recover pending batches"); Assert(recovered.Tables[0].ExtendedProperties["SavedAt"]!=null,"Recover retry timestamp"); }
 Console.WriteLine("PASS: normal full-batch rule; color per-batch rule; restart/resume; completion lock; SQL retry/dedup; sequence validation; plan isolation; XML recovery");
 }
}
