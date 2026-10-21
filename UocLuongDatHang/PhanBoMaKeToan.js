/** Pure lexicographic min-cost max-flow. No Sheets or application side effects. */
function mktAllocate(input) {
  const EPS = 1e-9;
  const compare = (a,b) => a < b ? -1 : a > b ? 1 : 0;
  const amount = value => {
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) throw new Error('Invalid allocation quantity');
    return value;
  };
  const stockMap = new Map();
  (input.stocks || []).forEach(s => {
    if (!s.code) throw new Error('Stock code is required');
    stockMap.set(String(s.code), (stockMap.get(String(s.code)) || 0) + amount(s.quantity));
  });
  const stocks = [...stockMap].sort((a,b)=>compare(a[0],b[0])).map(([code,quantity])=>({code,quantity}));
  const demands = (input.demands || []).slice().sort((a,b)=>compare(String(a.product),String(b.product)) || compare(String(a.id),String(b.id)));
  const ids = new Set();
  demands.forEach(d => { amount(d.quantity); if (!d.id || ids.has(d.id)) throw new Error('Demand IDs must be unique'); ids.add(d.id); });
  const sink = 1 + stocks.length + demands.length;
  const graph = Array.from({length:sink+1},()=>[]);
  function edge(from,to,cap,cost) {
    const f={to,rev:graph[to].length,cap,initial:cap,cost}, r={to:from,rev:graph[from].length,cap:0,initial:0,cost:cost.map(x=>-x)};
    graph[from].push(f);graph[to].push(r);return f;
  }
  const zero=[0,0,0], links=[], stockEdges=[];
  stocks.forEach((s,i)=>stockEdges.push(edge(0,i+1,s.quantity,zero)));
  demands.forEach((d,j)=>{
    edge(1+stocks.length+j,sink,d.quantity,zero);
    const choices=new Map();
    (d.choices||[]).forEach(c=>{
      if(!c.code || !Number.isInteger(c.priority) || c.priority<0 || c.priority>3) throw new Error('Invalid permitted code priority');
      const code=String(c.code);choices.set(code,Math.min(choices.get(code) ?? 3,c.priority));
    });
    stocks.forEach((s,i)=>{
      if(!choices.has(s.code))return;
      const priority=choices.get(s.code),cost=[0,0,0];if(priority<3)cost[priority]=-1;
      links.push({demandId:d.id,code:s.code,priority,edge:edge(i+1,1+stocks.length+j,Math.min(s.quantity,d.quantity),cost)});
    });
  });
  const less=(a,b)=>!b || a.some((v,i)=>v!==b[i] && a.slice(0,i).every((x,k)=>x===b[k]) && v<b[i]);
  while(true) {
    const dist=Array(graph.length).fill(null),prev=Array(graph.length).fill(null);dist[0]=zero;
    for(let pass=0;pass<graph.length-1;pass++) {
      let changed=false;
      for(let u=0;u<graph.length;u++) {
        if(!dist[u])continue;
        graph[u].forEach((e,k)=>{
          if(e.cap<=EPS)return;
          const value=dist[u].map((x,i)=>x+e.cost[i]);
          if(less(value,dist[e.to])) {dist[e.to]=value;prev[e.to]=[u,k];changed=true;}
        });
      }
      if(!changed)break;
    }
    if(!prev[sink])break;
    let q=Infinity,v=sink,steps=0;
    while(v!==0) {if(++steps>graph.length)throw new Error('Allocation residual cycle');const [u,k]=prev[v];q=Math.min(q,graph[u][k].cap);v=u;}
    for(v=sink;v!==0;) {const [u,k]=prev[v],e=graph[u][k];e.cap-=q;graph[v][e.rev].cap+=q;v=u;}
  }
  const allocations=links.map(l=>({demandId:l.demandId,code:l.code,priority:l.priority,quantity:l.edge.initial-l.edge.cap})).filter(l=>l.quantity>EPS);
  const shortages=demands.map(d=>({demandId:d.id,quantity:Math.max(0,d.quantity-allocations.filter(a=>a.demandId===d.id).reduce((n,a)=>n+a.quantity,0))}));
  const balances=stocks.map((s,i)=>({code:s.code,quantity:Math.max(0,stockEdges[i].cap)}));
  const totalDemand=demands.reduce((n,d)=>n+d.quantity,0),allocated=allocations.reduce((n,a)=>n+a.quantity,0);
  if(allocated>totalDemand+EPS || allocated>stocks.reduce((n,s)=>n+s.quantity,0)+EPS)throw new Error('Allocation conservation failed');
  return {allocations,shortages,balances,totals:{demand:totalDemand,allocated,shortage:Math.max(0,totalDemand-allocated)}};
}
