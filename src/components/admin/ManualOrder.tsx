import { useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { manualOrder } from '@/lib/shop.functions';
import { DELIVERY_FEE, pkr } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
export function ManualOrder({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
 const submit = useServerFn(manualOrder);
 const items = useQuery({ queryKey: ['admin','available'], queryFn: async () => { const { data, error } = await supabase.from('items').select('id,title,sell_price').eq('status','Available').order('title'); if(error) throw error; return data ?? []; } });
 const [form,setForm] = useState({ name:'', phone:'', address:'', city:'', itemId:'', channel:'WhatsApp' as 'WhatsApp' | 'Instagram', advancePaid:0, deliveryFee:DELIVERY_FEE, discountCode:'' });
 const [busy,setBusy] = useState(false);
 const [checkoutId] = useState(() => crypto.randomUUID());
 return <Dialog open onOpenChange={o => !o && onClose()}><DialogContent><DialogHeader><DialogTitle>Manual order</DialogTitle></DialogHeader><form className="grid gap-3" onSubmit={async e => {e.preventDefault(); setBusy(true); try { const result = await submit({data:{...form, itemIds:[form.itemId], checkoutId}}); toast.success(`Order ${result.codes.join(', ')} saved`); onSaved(); } catch(e){toast.error((e as Error).message);} finally {setBusy(false);} }}>
 <Label>Item<select required className="mt-1 h-10 w-full rounded-md border bg-background px-2" value={form.itemId} onChange={e=>setForm({...form,itemId:e.target.value})}><option value="">Choose an available item</option>{items.data?.map(i=><option key={i.id} value={i.id}>{i.title} · {pkr(i.sell_price)}</option>)}</select></Label>
 <Label>Sale through<select className="mt-1 h-10 w-full rounded-md border bg-background px-2" value={form.channel} onChange={e=>setForm({...form,channel:e.target.value as typeof form.channel})}><option>WhatsApp</option><option>Instagram</option></select></Label>
 {(['name','phone','city','address','discountCode'] as const).map(k=><Label key={k}>{({name:'Customer name',phone:'WhatsApp number',city:'City',address:'Delivery address',discountCode:'Discount code (optional)'})[k]}<Input required={k!=='discountCode'} value={form[k]} onChange={e=>setForm({...form,[k]:e.target.value})}/></Label>)}
 <div className="grid grid-cols-2 gap-3"><Label>Advance Paid (Rs.)<Input min={0} type="number" value={form.advancePaid} onChange={e=>setForm({...form,advancePaid:+e.target.value})}/></Label><Label>Delivery (Rs.)<Input min={0} type="number" value={form.deliveryFee} onChange={e=>setForm({...form,deliveryFee:+e.target.value})}/></Label></div><p className="text-xs text-muted-foreground">Advance Paid is the amount you have already received.</p>
 <Button disabled={busy || items.isLoading}>{busy?'Saving…':'Save order'}</Button></form></DialogContent></Dialog>;
}
