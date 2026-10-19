import { Link } from '@tanstack/react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Plus, Rows3, Search } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { PageHead } from './ui';
import { blank, BulkDialog, ItemDialog } from './ItemEditor';
import { ManualOrder } from './ManualOrder';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { HangerLoader, StatusPill } from '@/components/site/bits';
import { ITEM_STATUSES, LEAD_STATUSES, ORDER_STATUSES, photoUrl, pkr } from '@/lib/format';
export type RecordKind = 'inventory' | 'leads' | 'orders' | 'customers';
const titles = {inventory:'Inventory',leads:'Leads',orders:'Orders',customers:'Customers'};
const paths = {inventory:'/admin/inventory/$id',leads:'/admin/leads/$id',orders:'/admin/orders/$id',customers:'/admin/customers/$id'} as const;
export function Records({kind}:{kind:RecordKind}) {
 const [q,setQ]=useState(''); const [filter,setFilter]=useState('All'); const [page,setPage]=useState(0); const [add,setAdd]=useState(false); const [bulk,setBulk]=useState(false);
 const qc=useQueryClient(); const refresh=()=>{qc.invalidateQueries({queryKey:['admin']}); setAdd(false);setBulk(false);};
 const result=useQuery({queryKey:['admin','list',kind,q,filter,page],queryFn:async()=>{
  // Each list is bounded at the database; detail data is requested separately.
  let query: any;
  const safe=q.replace(/[,%().]/g,' ').trim();
  if(kind==='inventory'){query=supabase.from('items').select('id,title,size,photos,sell_price,status',{count:'exact'}).order('created_at',{ascending:false}); if(safe)query=query.ilike('title',`%${safe}%`);}
  if(kind==='orders'){query=supabase.from('orders').select('id,code,price,status,customers(name),items(title)',{count:'exact'}).order('order_date',{ascending:false});if(safe)query=query.ilike('code',`%${safe}%`);}
  if(kind==='leads'){query=supabase.from('leads').select('id,status,source,customers(name,phone),items(title)',{count:'exact'}).order('first_contact_at',{ascending:false});if(safe)query=query.ilike('note',`%${safe}%`);}
  if(kind==='customers'){query=supabase.from('customers').select('id,name,phone,city,tags',{count:'exact'}).order('created_at',{ascending:false});if(safe)query=query.or(`name.ilike.%${safe}%,phone.ilike.%${safe}%,city.ilike.%${safe}%`);if(filter!=='All')query=query.contains('tags',[filter]);}
  if(kind!=='customers' && filter!=='All')query=query.eq('status',filter);
  const {data,error,count}=await query.range(page*10,page*10+9);if(error)throw error;return {rows:data as any[],count:count??0};
 }});
 const tags=useQuery({queryKey:['admin','tag-options'],enabled:kind==='customers',queryFn:async()=>{const {data}=await supabase.from('customers').select('tags');return [...new Set((data??[]).flatMap(c=>c.tags))];}});
 const filters=kind==='inventory'?ITEM_STATUSES:kind==='orders'?ORDER_STATUSES:kind==='leads'?LEAD_STATUSES:tags.data??[];
 return <div><PageHead title={titles[kind]}>{kind==='inventory'&&<><Button variant="outline" onClick={()=>setBulk(true)}><Rows3/>Bazaar Haul</Button><Button onClick={()=>setAdd(true)}><Plus/>Add item</Button></>}{kind==='orders'&&<Button onClick={()=>setAdd(true)}><Plus/>Manual order</Button>}{kind==='leads'&&<Button asChild><Link to="/admin/leads/$id" params={{id:'new'}}><Plus/>Add lead</Link></Button>}</PageHead>
 <div className="mb-6 flex flex-wrap items-center gap-3"><div className="relative min-w-48 flex-1"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground"/><Input aria-label={`Search ${titles[kind]}`} className="pl-9" placeholder={kind==='orders'?'Search order code…':kind==='leads'?'Search inquiry notes…':'Search…'} value={q} onChange={e=>{setQ(e.target.value);setPage(0);}}/></div><select aria-label="Filter" className="h-10 rounded-md border bg-background px-3 text-sm" value={filter} onChange={e=>{setFilter(e.target.value);setPage(0);}}><option>All</option>{filters.map(f=><option key={f}>{f}</option>)}</select></div>
 {result.isLoading?<HangerLoader/>:result.isError?<p role="alert" className="text-destructive">Could not load this list. <Button variant="ghost" onClick={()=>result.refetch()}>Try again</Button></p>:<div className="overflow-x-auto border-y"><table className="w-full text-left text-sm"><thead className="text-xs text-muted-foreground"><tr><th className="py-3 pr-4">{kind==='inventory'?'Item':kind==='orders'?'Order':'Customer'}</th><th className="py-3 pr-4">{kind==='inventory'?'Size':kind==='customers'?'Phone':'Item'}</th><th className="py-3 pr-4">{kind==='customers'?'Tags':kind==='leads'?'Source':'Price'}</th>{kind!=='customers'&&<th className="py-3">Status</th>}</tr></thead><tbody>{result.data?.rows.map(r=><tr className="border-t" key={r.id}><td className="py-4 pr-4"><Link to={paths[kind]} params={{id:r.id}} className="flex items-center gap-3 font-semibold hover:text-primary">{kind==='inventory'&&<img src={photoUrl(r.photos?.[0])} alt="" className="h-12 w-10 rounded-md object-cover"/>}{kind==='inventory'?r.title:kind==='orders'?<span>{r.code}<span className="block text-xs font-normal text-muted-foreground">{r.customers?.name}</span></span>:kind==='leads'?r.customers?.name??'Website visitor':r.name}</Link></td><td className="py-4 pr-4">{kind==='inventory'?r.size:kind==='customers'?r.phone:r.items?.title??'—'}</td><td className="py-4 pr-4">{kind==='customers'?r.tags.join(', ')||'—':kind==='leads'?r.source:pkr(kind==='inventory'?r.sell_price:r.price)}</td>{kind!=='customers'&&<td className="py-4"><StatusPill status={r.status}/></td>}</tr>)}</tbody></table>{!result.data?.rows.length&&<p className="py-10 text-center text-muted-foreground">No matches.</p>}</div>}
 <div className="mt-5 flex items-center justify-between gap-3 text-sm"><span className="text-muted-foreground">{result.data?.count??0} {titles[kind].toLowerCase()} · Page {page+1}</span><div className="flex gap-2"><Button variant="outline" disabled={!page} onClick={()=>setPage(page-1)}>Previous</Button><Button variant="outline" disabled={(page+1)*10>=(result.data?.count??0)} onClick={()=>setPage(page+1)}>Next</Button></div></div>
 {add&&kind==='inventory'&&<ItemDialog draft={blank()} onClose={()=>setAdd(false)} onSaved={refresh}/>} {bulk&&<BulkDialog onClose={()=>setBulk(false)} onSaved={refresh}/>} {add&&kind==='orders'&&<ManualOrder onClose={()=>setAdd(false)} onSaved={refresh}/>}</div>;
}
