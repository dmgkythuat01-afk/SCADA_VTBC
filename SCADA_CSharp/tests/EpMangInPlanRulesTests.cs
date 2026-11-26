using System;
using System.Collections.Generic;
using CanScadaVienTreoBC.Models;
using Newtonsoft.Json;

class EpMangInPlanRulesTests
{
    static void Assert(bool condition, string message) { if (!condition) throw new Exception(message); }
    static void Main()
    {
        var plan = new KeHoachEpMangInModel {
            IdEpMangIn = "P", PhienBan = 2,
            Items = new List<ThungEpMangInModel> {
                new ThungEpMangInModel { IdThungDungVi = "ISSUED", DaXuat = true, SoLuongViDaXuat = 30 },
                new ThungEpMangInModel { IdThungDungVi = "WAIT", DaXuat = false, SoLuongViDaXuat = 0 }
            }
        };
        Assert(EpMangInPlanRules.Validate(null, "ISSUED") != "", "Require selected plan");
        Assert(EpMangInPlanRules.Validate(plan, " issued ") == "", "Accept exact issued box with whitespace/case normalization");
        Assert(EpMangInPlanRules.Validate(plan, "OTHER") != "", "Reject wrong plan box");
        Assert(EpMangInPlanRules.Validate(plan, "WAIT") != "", "Reject unissued box");
        Assert(EpMangInPlanRules.Validate(plan, "") != "", "Reject empty scan");
        plan.Items.Add(plan.Items[0]);
        Assert(EpMangInPlanRules.Validate(plan, "ISSUED") != "", "Reject duplicate box definition");
        var decoded = JsonConvert.DeserializeObject<KeHoachEpMangInModel>(
            "{\"IdEpMangIn\":\"P\",\"phienBan\":2,\"items\":[{\"IdThungDungVi\":\"B\",\"daXuat\":true,\"soLuongViDaXuat\":10}]}");
        Assert(EpMangInPlanRules.Validate(decoded, "B") == "", "Accept actual API JSON shape");
        Console.WriteLine("PASS: selected plan, issued box, pending/wrong/empty/duplicate box and API deserialization");
    }
}
