import { createFileRoute } from '@tanstack/react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { pageHead } from '@/lib/page-head';
import { PageHead } from '@/components/admin/ui';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
export const Route=createFileRoute('/_authenticated/admin/collections')({head:()=>pageHead('Collections','Arrange thrifted items into collections.',true),component:Collections});
function Collections(){const qc=useQueryClient();const[name,setName]=useState('');const[busy,setBusy]=useState(false);const collections=useQuery({queryKey:['collections'],queryFn:async()=>{const{data,error}=await supabase.from('collections').select('*,items(id)').order('name');if(error)throw error;return data??[];}});return <div><PageHead title="Collections"/><form className="mb-8 flex gap-3" onSubmit={async e=>{e.preventDefault();setBusy(true);const{error}=await supabase.from('collections').insert({name:name.trim()});if(error)toast.error(error.message);else{setName('');qc.invalidateQueries({queryKey:['collections']});}setBusy(false);}}><Input aria-label="Collection name" required maxLength={80} placeholder="Collection name" value={name} onChange={e=>setName(e.target.value)}/><Button disabled={busy}>Add collection</Button></form><p className="mb-5 text-sm text-muted-foreground">Choose a collection on each item’s detail page.</p>{collections.isError&&<p role="alert">Could not load collections.</p>}{collections.data?.map(c=><div key={c.id} className="flex items-center justify-between gap-3 border-b py-4"><div><b>{c.name}</b><p className="text-xs text-muted-foreground">{c.items.length} items</p></div><Button variant="ghost" onClick={async()=>{if(!confirm(`Remove ${c.name}? Its items stay in the shop.`))return;const{error}=await supabase.from('collections').delete().eq('id',c.id);if(error)toast.error(error.message);qc.invalidateQueries({queryKey:['collections']});}}>Remove</Button></div>)}</div>;}
