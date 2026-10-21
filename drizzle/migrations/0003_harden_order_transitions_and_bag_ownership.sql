ALTER TABLE public.orders ADD COLUMN delivery_details jsonb;
CREATE OR REPLACE FUNCTION public.sync_order_inventory() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE current_status text;
BEGIN
 IF TG_OP='UPDATE' AND NEW.item_id IS DISTINCT FROM OLD.item_id AND NEW.item_id IS NOT NULL THEN RAISE EXCEPTION 'The item on an existing order cannot be changed'; END IF;
 IF NEW.advance_paid<0 OR NEW.advance_paid>NEW.price THEN RAISE EXCEPTION 'Advance Paid must be between zero and the order total'; END IF;
 IF NEW.item_id IS NULL THEN RETURN NEW; END IF;
 IF TG_OP='UPDATE' AND NEW.status=OLD.status THEN RETURN NEW; END IF;
 SELECT status INTO current_status FROM public.items WHERE id=NEW.item_id FOR UPDATE;
 IF NEW.status<>'Cancelled' AND (TG_OP='INSERT' OR OLD.status='Cancelled') THEN
  IF current_status<>'Available' OR EXISTS(SELECT 1 FROM public.orders WHERE item_id=NEW.item_id AND status<>'Cancelled' AND id<>NEW.id) THEN RAISE EXCEPTION 'This item has already been reserved or sold'; END IF;
 END IF;
 IF NEW.status='Cancelled' THEN
  IF NOT EXISTS(SELECT 1 FROM public.orders WHERE item_id=NEW.item_id AND status<>'Cancelled' AND id<>NEW.id) THEN UPDATE public.items SET status='Available' WHERE id=NEW.item_id; END IF;
 ELSE UPDATE public.items SET status=CASE WHEN NEW.status IN ('Shipped','Delivered') THEN 'Sold' ELSE 'Reserved' END WHERE id=NEW.item_id;
 END IF;
 RETURN NEW;
END $$;
CREATE OR REPLACE FUNCTION public.snapshot_order_delivery() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW.delivery_details IS NULL THEN NEW.delivery_details:=nullif(current_setting('shop.delivery_details',true),'')::jsonb; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER checkout_delivery_snapshot BEFORE INSERT ON public.orders FOR EACH ROW EXECUTE FUNCTION public.snapshot_order_delivery();
CREATE OR REPLACE FUNCTION public.checkout_with_delivery(p jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 PERFORM set_config('shop.delivery_details',jsonb_build_object('name',p->>'name','phone',p->>'phone','address',p->>'address','city',p->>'city')::text,true);
 RETURN public.checkout_shop(p);
END $$;
REVOKE ALL ON FUNCTION public.checkout_with_delivery(jsonb) FROM PUBLIC,anon,authenticated; GRANT EXECUTE ON FUNCTION public.checkout_with_delivery(jsonb) TO service_role;
CREATE OR REPLACE FUNCTION public.save_shop_bag(p jsonb) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE existing public.saved_bags; ids uuid[];
BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended(p->>'id',0));
 SELECT * INTO existing FROM public.saved_bags WHERE id=(p->>'id')::uuid FOR UPDATE;
 IF FOUND AND existing.token_hash<>p->>'hash' THEN RAISE EXCEPTION 'This bag is not available'; END IF;
 IF existing.state='purchased' THEN RETURN; END IF;
 SELECT coalesce(array_agg(value::uuid),'{}') INTO ids FROM jsonb_array_elements_text(p->'itemIds');
 INSERT INTO public.saved_bags(id,token_hash,name,phone,item_ids) VALUES((p->>'id')::uuid,p->>'hash',p->>'name',p->>'phone',ids)
 ON CONFLICT(id) DO UPDATE SET name=EXCLUDED.name,phone=EXCLUDED.phone,item_ids=EXCLUDED.item_ids,updated_at=now();
END $$;
REVOKE ALL ON FUNCTION public.save_shop_bag(jsonb) FROM PUBLIC,anon,authenticated; GRANT EXECUTE ON FUNCTION public.save_shop_bag(jsonb) TO service_role;
CREATE POLICY "finance saved bag metrics" ON public.saved_bags FOR SELECT TO authenticated USING(public.can_see_finance(auth.uid()));