import { describe, expect, it } from 'vitest';
import { accessAllowed, chatCredentialSchema, chatIdentitySchema, discountAvailable, discountValue, latestFive, orderSchema } from '@/lib/shop-rules';
describe('shop operations rules',()=>{
 it('overview shows exactly latest five records',()=>expect(latestFive([1,2,3,4,5,6,7])).toEqual([1,2,3,4,5]));
 it('an item cannot appear twice in an order',()=>{const id='123e4567-e89b-42d3-a456-426614174000';expect(orderSchema.safeParse({itemIds:[id,id],checkoutId:id,name:'Buyer',phone:'0300-1234567',address:'House 12',city:'Islamabad'}).success).toBe(false);});
 it('discount usage limit is exclusive',()=>expect(discountAvailable({active:true,uses:5,usage_limit:5,expires_at:null})).toBe(false));
 it('expired codes cannot be used',()=>expect(discountAvailable({active:true,uses:0,usage_limit:5,expires_at:'2026-10-18T00:00:00Z'},Date.parse('2026-10-19T00:00:00Z'))).toBe(false));
 it('discount cannot exceed the items total',()=>expect(discountValue(500,'fixed',700)).toBe(500));
 it('percentage is calculated on item subtotal',()=>expect(discountValue(2800,'percent',10)).toBe(280));
 it('team has shop access but not owner permissions',()=>{expect(accessAllowed(['team'],'shop')).toBe(true);expect(accessAllowed(['team'],'owner')).toBe(false);});
 it('finance alone does not grant shop work',()=>{expect(accessAllowed(['finance'],'finance')).toBe(true);expect(accessAllowed(['finance'],'shop')).toBe(false);});
 it('chat requires a contact and bounded message',()=>expect(chatIdentitySchema.safeParse({name:'Buyer',phone:'0300-1234567',body:'x'.repeat(1001)}).success).toBe(false));
 it('chat reads require an unguessable conversation credential',()=>expect(chatCredentialSchema.safeParse({id:'123e4567-e89b-42d3-a456-426614174000'}).success).toBe(false));
});
