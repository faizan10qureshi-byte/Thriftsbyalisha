import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { capabilityHash } from './shop.functions';
import { chatCredentialSchema, chatIdentitySchema, discountAvailable, discountValue, orderSchema } from './shop-rules';
import { normalizePhone } from './format';

export const checkDiscount = createServerFn({ method: 'POST' })
 .inputValidator((d: unknown) => z.object({ code: z.string().trim().max(30), itemIds: z.array(z.string().uuid()).min(1).max(10) }).parse(d))
 .handler(async ({ data }) => {
  const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
  const [{ data: discount }, { data: items, error }] = await Promise.all([
   supabaseAdmin.from('discount_codes').select('*').eq('code', data.code.toUpperCase()).maybeSingle(),
   supabaseAdmin.from('items').select('id,sell_price,status').in('id', data.itemIds),
  ]);
  if (error || !discount || !discountAvailable(discount) || items?.length !== new Set(data.itemIds).size) return { ok: false as const, amount: 0 };
  return { ok: true as const, amount: discountValue(items.reduce((n, i) => n + i.sell_price, 0), discount.kind, discount.amount) };
 });

export const saveBag = createServerFn({ method: 'POST' })
 .inputValidator((d: unknown) => z.object({ id: z.string().uuid(), token: z.string().uuid(), name: orderSchema.shape.name, phone: orderSchema.shape.phone, itemIds: z.array(z.string().uuid()).max(10) }).parse(d))
 .handler(async ({ data }) => {
  const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
  const hash = await capabilityHash(data.token);
  const { error } = await supabaseAdmin.rpc('save_shop_bag', { p: { ...data, hash, phone: normalizePhone(data.phone) } });
  if (error) throw new Error('Could not save your bag');
  return { ok: true };
 });

export const startChat = createServerFn({ method: 'POST' })
 .inputValidator((d: unknown) => chatIdentitySchema.parse(d))
 .handler(async ({ data }) => {
  const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
  const { count } = await supabaseAdmin.from('chat_conversations').select('id', { count: 'exact', head: true }).eq('phone', normalizePhone(data.phone)).gte('updated_at', new Date(Date.now() - 3600000).toISOString());
  if ((count ?? 0) >= 5) throw new Error('Please continue your existing chat or try again later');
  const token = crypto.randomUUID();
  const { data: id, error } = await supabaseAdmin.rpc('start_shop_chat', { p_name: data.name, p_phone: normalizePhone(data.phone), p_hash: await capabilityHash(token), p_body: data.body });
  if (error || !id) throw new Error('Could not start your chat');
  return { id, token };
 });

export const readChat = createServerFn({ method: 'POST' })
 .inputValidator((d: unknown) => chatCredentialSchema.parse(d))
 .handler(async ({ data }) => {
  const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
  const { data: conversation } = await supabaseAdmin.from('chat_conversations').select('id,closed').eq('id', data.id).eq('token_hash', await capabilityHash(data.token)).maybeSingle();
  if (!conversation) throw new Error('This chat is not available');
  const { data: messages, error } = await supabaseAdmin.from('chat_messages').select('id,sender,body,created_at').eq('conversation_id', conversation.id).order('created_at', { ascending: false }).limit(500);
  if (error) throw new Error('Could not load messages');
  return { messages: (messages ?? []).reverse(), closed: conversation.closed };
 });

export const sendVisitorMessage = createServerFn({ method: 'POST' })
 .inputValidator((d: unknown) => chatCredentialSchema.extend({ body: chatIdentitySchema.shape.body }).parse(d))
 .handler(async ({ data }) => {
  const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
  const { data: conversation } = await supabaseAdmin.from('chat_conversations').select('id,closed,updated_at,unread').eq('id', data.id).eq('token_hash', await capabilityHash(data.token)).maybeSingle();
  if (!conversation || conversation.closed) throw new Error('This chat is closed');
  const { count } = await supabaseAdmin.from('chat_messages').select('id', { count: 'exact', head: true }).eq('conversation_id', data.id).eq('sender', 'visitor').gte('created_at', new Date(Date.now() - 60000).toISOString());
  if ((count ?? 0) >= 10) throw new Error('Please wait a moment before sending another message');
  const { error } = await supabaseAdmin.from('chat_messages').insert({ conversation_id: data.id, sender: 'visitor', body: data.body });
  if (error) throw new Error('Message not sent; please try again');
  await supabaseAdmin.from('chat_conversations').update({ updated_at: new Date().toISOString(), unread: conversation.unread + 1 }).eq('id', data.id);
  return { ok: true };
 });

export const replyToChat = createServerFn({ method: 'POST' })
 .middleware([requireSupabaseAuth])
 .inputValidator((d: unknown) => z.object({ id: z.string().uuid(), body: chatIdentitySchema.shape.body }).parse(d))
 .handler(async ({ data, context }) => {
  const { data: staff } = await context.supabase.rpc('is_staff', { _user_id: context.userId });
  if (!staff) throw new Error('Shop access is required');
  const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
  const { data: conversation } = await context.supabase.from('chat_conversations').select('lead_id,closed').eq('id', data.id).single();
  if (!conversation || conversation.closed) throw new Error('This chat is closed');
  const { error } = await supabaseAdmin.from('chat_messages').insert({ conversation_id: data.id, sender: 'team', body: data.body });
  if (error) throw new Error('Reply not sent');
  await supabaseAdmin.from('chat_conversations').update({ updated_at: new Date().toISOString(), unread: 0 }).eq('id', data.id);
  await context.supabase.from('leads').update({ last_reply_at: new Date().toISOString(), status: 'Contacted' }).eq('id', conversation.lead_id).in('status', ['New', 'Contacted']);
  return { ok: true };
 });
