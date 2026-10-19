import { z } from 'zod';
export const OVERVIEW_LIMIT = 5;
export const latestFive = <T,>(rows: T[]) => rows.slice(0, OVERVIEW_LIMIT);
export const orderSchema = z.object({
  itemIds: z.array(z.string().uuid()).min(1).max(10).refine(ids => new Set(ids).size === ids.length, 'Choose each item only once'),
  checkoutId: z.string().uuid(), name: z.string().trim().min(2).max(80),
  phone: z.string().trim().regex(/^03\d{2}-?\d{7}$/, 'Use 03XX-XXXXXXX'),
  address: z.string().trim().min(5).max(250), city: z.string().trim().min(2).max(60),
  instagram: z.string().trim().max(60).optional(), advanceRef: z.string().trim().max(80).optional(),
  discountCode: z.string().trim().max(30).default(''), bagId: z.string().uuid().optional(), bagToken: z.string().uuid().optional(),
});
export const discountValue = (subtotal: number, kind: string, amount: number) => Math.min(subtotal, kind === 'percent' ? Math.floor(subtotal * amount / 100) : amount);
export const discountAvailable = (d: { active: boolean; uses: number; usage_limit: number; expires_at: string | null }, now = Date.now()) => d.active && d.uses < d.usage_limit && (!d.expires_at || new Date(d.expires_at).getTime() > now);
export const accessAllowed = (roles: string[], access: 'shop' | 'finance' | 'owner') => roles.includes('admin') || roles.includes(access === 'shop' ? 'team' : access === 'finance' ? 'finance' : 'admin');
export const chatIdentitySchema = z.object({ name: z.string().trim().min(2).max(80), phone: orderSchema.shape.phone, body: z.string().trim().min(1).max(1000) });
export const chatCredentialSchema = z.object({ id: z.string().uuid(), token: z.string().uuid() });
