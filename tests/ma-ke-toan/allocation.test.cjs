const {test} = require('node:test');
const a = require('node:assert/strict');
const {load} = require('./helpers.cjs');
const solve = input => load(['PhanBoMaKeToan.js']).mktAllocate(input);
const demand = (id, quantity, choices) => ({id,product:id,material:'NL',quantity,choices:choices.map((code,priority)=>({code,priority}))});
const stocks = entries => entries.map(([code,quantity])=>({material:'NL',code,quantity}));
test('example1400: max coverage, legal edges and capacities',()=>{
  const input={stocks:stocks([['A',300],['B',400],['C',200],['D',350],['E',150]]),demands:[demand('SP1',700,['A','B','C']),demand('SP2',800,['A','B','D','E'])]};
  const r=solve(input); a.equal(r.totals.allocated,1400); a.equal(r.totals.shortage,100);
  for(const s of input.stocks)a.ok(r.allocations.filter(x=>x.code===s.code).reduce((n,x)=>n+x.quantity,0)<=s.quantity);
  for(const x of r.allocations)a.ok(input.demands.find(d=>d.id===x.demandId).choices.some(c=>c.code===x.code));
  const reversed=solve({stocks:[...input.stocks].reverse(),demands:[...input.demands].reverse()});
  a.equal(JSON.stringify(r),JSON.stringify(reversed));
});
test('rerouteSharedStock avoids greedy shortage',()=>{
 const r=solve({stocks:stocks([['A',5],['B',5]]),demands:[demand('SP1',5,['A','B']),demand('SP2',5,['A'])]});
 a.equal(r.totals.allocated,10); a.equal(r.allocations.find(x=>x.demandId==='SP1').code,'B');
});
test('priority vector prefers priority zero over weighted sum',()=>{
 const d1=demand('S1',1,['A','B']),d2=demand('S2',1,['B','A']);
 d2.choices[0].priority=3;d2.choices[1].priority=1;
 const r=solve({stocks:stocks([['A',1],['B',1]]),demands:[d1,d2]});
 a.equal(r.allocations.find(x=>x.demandId==='S1').code,'A');
});
test('fractional, disabled choices, empty and surplus',()=>{
 const r=solve({stocks:stocks([['A',0.3],['B',100]]),demands:[demand('S1',0.5,['A']),demand('S2',1,[])]});
 a.ok(Math.abs(r.totals.shortage-1.2)<1e-9);a.equal(r.balances.find(x=>x.code==='B').quantity,100);
 a.equal(solve({stocks:[],demands:[]}).totals.allocated,0);
 a.throws(()=>solve({stocks:stocks([['A',-1]]),demands:[]}));
});
