import { createFileRoute } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { useState } from 'react';
import { toast } from 'sonner';
import { grantRole, listTeam, revokeRole } from '@/lib/team.functions';
import { useAuth } from '@/lib/auth';
import { pageHead } from '@/lib/page-head';
import { PageHead } from '@/components/admin/ui';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
export const Route=createFileRoute('/_authenticated/admin/settings')({head:()=>pageHead('Teams & Permissions','Manage members and shop access.',true),component:Members});
function Members(){const{isAdmin,user}=useAuth();const list=useServerFn(listTeam);const grant=useServerFn(grantRole);const revoke=useServerFn(revokeRole);const team=useQuery({queryKey:['team'],enabled:isAdmin,queryFn:()=>list()});const[email,setEmail]=useState('');const[busy,setBusy]=useState(false);
 if(!isAdmin)return <p>Only an owner can manage team access.</p>;
 const members=Array.from(new Map((team.data??[]).map(r=>[r.user_id,{id:r.user_id,email:r.email}])).values());
 const options=[{role:'team' as const,label:'Shop work',help:'Items, orders, customers, leads and chat.'},{role:'finance' as const,label:'Finance',help:'Sales insights and expense records.'},{role:'admin' as const,label:'Owner',help:'All shop work, finance and member access.'}];
 return <div><PageHead title="Teams & Permissions"/><form className="mb-8 flex flex-wrap gap-3" onSubmit={async e=>{e.preventDefault();setBusy(true);try{const r=await grant({data:{email,role:'team'}});if(!r.ok){toast.error(r.error);return;}setEmail('');toast.success('Member added');team.refetch();}catch(e){toast.error((e as Error).message);}finally{setBusy(false);}}}><Input aria-label="Member email" type="email" required placeholder="Member email" value={email} onChange={e=>setEmail(e.target.value)} className="min-w-48 flex-1"/><Button disabled={busy}>Add member</Button><p className="w-full text-xs text-muted-foreground">Members create an account first. New members start with Shop work access.</p></form>
 <div className="grid gap-3 border-b pb-4 text-sm md:grid-cols-[1fr_repeat(3,130px)]"><span className="font-semibold">Member</span>{options.map(o=><div key={o.role}><b>{o.label}</b><p className="mt-1 text-xs text-muted-foreground">{o.help}</p></div>)}</div>{team.isError&&<p role="alert">The member list could not load.</p>}{members.map(m=><div key={m.id} className="grid items-center gap-4 border-b py-5 md:grid-cols-[1fr_repeat(3,130px)]"><p className="min-w-0 break-words font-semibold">{m.email}{m.id===user?.id&&<span className="ml-2 text-xs font-normal text-muted-foreground">You</span>}</p>{options.map(o=>{const roleRow=team.data?.find(r=>r.user_id===m.id&&r.role===o.role);return <label key={o.role} className="flex items-center gap-2 text-sm"><span className="md:hidden">{o.label}</span><Switch aria-label={`${m.email}: ${o.label}`} checked={!!roleRow} disabled={busy||(m.id===user?.id&&o.role==='admin')} onCheckedChange={async on=>{setBusy(true);try{if(on){const r=await grant({data:{email:m.email,role:o.role}});if(!r.ok)throw new Error(r.error);}else if(roleRow)await revoke({data:{id:roleRow.id}});await team.refetch();}catch(e){toast.error((e as Error).message);}finally{setBusy(false);}}}/><span className="text-xs text-muted-foreground">{roleRow?'On':'Off'}</span></label>;})}</div>)}</div>;
}
