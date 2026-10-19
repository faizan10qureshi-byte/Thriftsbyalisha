CREATE TABLE public.collections (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL CHECK (length(name) BETWEEN 1 AND 80), created_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT ON public.collections TO anon,authenticated; GRANT INSERT,UPDATE,DELETE ON public.collections TO authenticated; GRANT ALL ON public.collections TO service_role;
ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "browse collections" ON public.collections FOR SELECT TO anon,authenticated USING(true);
CREATE POLICY "manage collections" ON public.collections FOR ALL TO authenticated USING(public.is_staff(auth.uid())) WITH CHECK(public.is_staff(auth.uid()));
ALTER TABLE public.items ADD COLUMN collection_id uuid REFERENCES public.collections(id) ON DELETE SET NULL;
ALTER TABLE public.customers ADD COLUMN tags text[] NOT NULL DEFAULT '{}';
ALTER TABLE public.orders ADD COLUMN checkout_id uuid, ADD COLUMN sales_channel text NOT NULL DEFAULT 'Storefront', ADD COLUMN discount_amount integer NOT NULL DEFAULT 0;
CREATE UNIQUE INDEX one_active_sale_per_item ON public.orders(item_id) WHERE status <> 'Cancelled' AND item_id IS NOT NULL;
CREATE TABLE public.discount_codes (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), code text UNIQUE NOT NULL CHECK(code ~ '^[A-Z0-9_-]{2,30}$'), kind text NOT NULL CHECK(kind IN ('percent','fixed')), amount integer NOT NULL CHECK(amount > 0), active boolean NOT NULL DEFAULT true, expires_at timestamptz, usage_limit integer NOT NULL DEFAULT 100 CHECK(usage_limit > 0), uses integer NOT NULL DEFAULT 0, CHECK(kind <> 'percent' OR amount <= 100));
GRANT SELECT,INSERT,UPDATE,DELETE ON public.discount_codes TO authenticated; GRANT ALL ON public.discount_codes TO service_role;
ALTER TABLE public.discount_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner discounts" ON public.discount_codes FOR ALL TO authenticated USING(public.has_role(auth.uid(),'admin')) WITH CHECK(public.has_role(auth.uid(),'admin'));
CREATE TABLE public.saved_bags (id uuid PRIMARY KEY, token_hash text NOT NULL, name text NOT NULL, phone text NOT NULL, item_ids uuid[] NOT NULL, updated_at timestamptz NOT NULL DEFAULT now(), state text NOT NULL DEFAULT 'open' CHECK(state IN ('open','purchased')), checkout_id uuid);
GRANT SELECT ON public.saved_bags TO authenticated; GRANT ALL ON public.saved_bags TO service_role;
ALTER TABLE public.saved_bags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff saved bags" ON public.saved_bags FOR SELECT TO authenticated USING(public.is_staff(auth.uid()));
ALTER TABLE public.leads DROP CONSTRAINT leads_source_check;
ALTER TABLE public.leads ADD CONSTRAINT leads_source_check CHECK(source IN ('Storefront','Instagram','WhatsApp','Website Chat'));
CREATE TABLE public.chat_conversations (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), token_hash text NOT NULL, name text NOT NULL CHECK(length(name) BETWEEN 2 AND 80), phone text NOT NULL, lead_id uuid UNIQUE NOT NULL REFERENCES public.leads(id), updated_at timestamptz NOT NULL DEFAULT now(), unread integer NOT NULL DEFAULT 1, closed boolean NOT NULL DEFAULT false);
GRANT SELECT,UPDATE ON public.chat_conversations TO authenticated; GRANT ALL ON public.chat_conversations TO service_role;
ALTER TABLE public.chat_conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff chat read" ON public.chat_conversations FOR SELECT TO authenticated USING(public.is_staff(auth.uid()));
CREATE POLICY "staff chat update" ON public.chat_conversations FOR UPDATE TO authenticated USING(public.is_staff(auth.uid())) WITH CHECK(public.is_staff(auth.uid()));
CREATE TABLE public.chat_messages (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), conversation_id uuid NOT NULL REFERENCES public.chat_conversations(id) ON DELETE CASCADE, sender text NOT NULL CHECK(sender IN ('visitor','team')), body text NOT NULL CHECK(length(body) BETWEEN 1 AND 1000), created_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT ON public.chat_messages TO authenticated; GRANT ALL ON public.chat_messages TO service_role;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff messages read" ON public.chat_messages FOR SELECT TO authenticated USING(public.is_staff(auth.uid()));
CREATE INDEX chat_messages_thread ON public.chat_messages(conversation_id,created_at);
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages,public.chat_conversations,public.items;
CREATE POLICY "finance orders read" ON public.orders FOR SELECT TO authenticated USING(public.can_see_finance(auth.uid()));
CREATE POLICY "finance customers read" ON public.customers FOR SELECT TO authenticated USING(public.can_see_finance(auth.uid()));
CREATE OR REPLACE FUNCTION public.sync_order_inventory() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE current_status text;
BEGIN
 IF TG_OP = 'UPDATE' AND NEW.item_id IS DISTINCT FROM OLD.item_id THEN RAISE EXCEPTION 'The item on an existing order cannot be changed'; END IF;
 IF NEW.item_id IS NULL THEN RETURN NEW; END IF;
 SELECT status INTO current_status FROM public.items WHERE id=NEW.item_id FOR UPDATE;
 IF NEW.status <> 'Cancelled' AND (TG_OP='INSERT' OR OLD.status='Cancelled') THEN
   IF current_status <> 'Available' OR EXISTS(SELECT 1 FROM public.orders WHERE item_id=NEW.item_id AND status <> 'Cancelled' AND id <> NEW.id) THEN RAISE EXCEPTION 'This item has already been reserved or sold'; END IF;
 END IF;
 IF NEW.advance_paid < 0 OR NEW.advance_paid > NEW.price THEN RAISE EXCEPTION 'Advance Paid must be between zero and the order total'; END IF;
 UPDATE public.items SET status=CASE WHEN NEW.status='Cancelled' THEN 'Available' WHEN NEW.status IN ('Shipped','Delivered') THEN 'Sold' ELSE 'Reserved' END WHERE id=NEW.item_id;
 RETURN NEW;
END $$;
CREATE TRIGGER order_inventory_lock BEFORE INSERT OR UPDATE OF status,advance_paid,item_id ON public.orders FOR EACH ROW EXECUTE FUNCTION public.sync_order_inventory();
CREATE OR REPLACE FUNCTION public.guard_item_release() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF NEW.status='Available' AND EXISTS(SELECT 1 FROM public.orders WHERE item_id=NEW.id AND status<>'Cancelled') AND pg_trigger_depth()=1 THEN RAISE EXCEPTION 'Cancel the active order before making this item available'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER guard_item_availability BEFORE UPDATE OF status ON public.items FOR EACH ROW EXECUTE FUNCTION public.guard_item_release();
CREATE OR REPLACE FUNCTION public.checkout_shop(p jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE ids uuid[]; it record; cid uuid; co uuid; ds record; subtotal integer; remaining_discount integer:=0; allocated integer; codes jsonb:='[]'; first_item boolean:=true; order_code text; saved_codes jsonb;
BEGIN
 co := (p->>'checkoutId')::uuid;
 PERFORM pg_advisory_xact_lock(hashtextextended(co::text,0));
 SELECT jsonb_agg(code ORDER BY order_date,id) INTO saved_codes FROM public.orders WHERE checkout_id=co;
 IF saved_codes IS NOT NULL THEN
   IF EXISTS(SELECT 1 FROM public.orders o JOIN public.customers c ON c.id=o.customer_id WHERE o.checkout_id=co AND c.phone<>p->>'phone') THEN RAISE EXCEPTION 'This checkout is not available'; END IF;
   RETURN jsonb_build_object('codes',saved_codes);
 END IF;
 SELECT array_agg(value::uuid) INTO ids FROM jsonb_array_elements_text(p->'itemIds');
 IF cardinality(ids) IS NULL OR cardinality(ids)<1 OR cardinality(ids)>10 OR cardinality(ids)<>(SELECT count(DISTINCT x) FROM unnest(ids) x) THEN RAISE EXCEPTION 'Choose distinct available items'; END IF;
 PERFORM id FROM public.items WHERE id=ANY(ids) ORDER BY id FOR UPDATE;
 IF (SELECT count(*) FROM public.items WHERE id=ANY(ids) AND status='Available')<>cardinality(ids) THEN RAISE EXCEPTION 'Sorry, an item has just been reserved or sold'; END IF;
 SELECT sum(sell_price) INTO subtotal FROM public.items WHERE id=ANY(ids);
 IF coalesce(p->>'discountCode','')<>'' THEN
  SELECT * INTO ds FROM public.discount_codes WHERE code=upper(p->>'discountCode') FOR UPDATE;
  IF NOT FOUND OR NOT ds.active OR (ds.expires_at IS NOT NULL AND ds.expires_at<=now()) OR ds.uses>=ds.usage_limit THEN RAISE EXCEPTION 'This discount code is not available'; END IF;
  remaining_discount:=least(subtotal,CASE WHEN ds.kind='percent' THEN floor(subtotal*ds.amount/100.0)::integer ELSE ds.amount END);
  UPDATE public.discount_codes SET uses=uses+1 WHERE id=ds.id;
 END IF;
 SELECT id INTO cid FROM public.customers WHERE phone=p->>'phone';
 IF cid IS NULL THEN
  INSERT INTO public.customers(name,phone,address,city,instagram_handle) VALUES(p->>'name',p->>'phone',p->>'address',p->>'city',nullif(p->>'instagram','')) ON CONFLICT(phone) DO NOTHING RETURNING id INTO cid;
  IF cid IS NULL THEN SELECT id INTO cid FROM public.customers WHERE phone=p->>'phone'; END IF;
 END IF;
 FOR it IN SELECT * FROM public.items WHERE id=ANY(ids) ORDER BY id LOOP
  allocated:=least(it.sell_price,remaining_discount); remaining_discount:=remaining_discount-allocated;
  INSERT INTO public.orders(customer_id,item_id,price,status,advance_paid,advance_status,checkout_id,sales_channel,discount_amount)
   VALUES(cid,it.id,it.sell_price-allocated+CASE WHEN first_item THEN (p->>'deliveryFee')::integer ELSE 0 END,
    CASE WHEN p->>'channel'='Storefront' THEN 'Pending' ELSE 'Confirmed' END,
    CASE WHEN first_item THEN coalesce((p->>'advancePaid')::integer,0) ELSE 0 END,
    CASE WHEN first_item AND coalesce((p->>'advancePaid')::integer,0)>0 THEN 'Received' ELSE 'Pending' END,co,p->>'channel',allocated) RETURNING code INTO order_code;
  codes:=codes||jsonb_build_array(order_code); first_item:=false;
  INSERT INTO public.leads(customer_id,item_id,source,status,note) VALUES(cid,it.id,p->>'channel','Ordered',nullif(p->>'advanceRef',''));
 END LOOP;
 IF p->>'bagId' IS NOT NULL THEN UPDATE public.saved_bags SET state='purchased',checkout_id=co,updated_at=now() WHERE id=(p->>'bagId')::uuid AND token_hash=p->>'bagHash'; END IF;
 RETURN jsonb_build_object('codes',codes);
END $$;
REVOKE ALL ON FUNCTION public.checkout_shop(jsonb) FROM PUBLIC,anon,authenticated; GRANT EXECUTE ON FUNCTION public.checkout_shop(jsonb) TO service_role;
CREATE OR REPLACE FUNCTION public.start_shop_chat(p_name text,p_phone text,p_hash text,p_body text) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE cid uuid; lid uuid; conv uuid;
BEGIN
 SELECT id INTO cid FROM public.customers WHERE phone=p_phone;
 IF cid IS NULL THEN INSERT INTO public.customers(name,phone) VALUES(p_name,p_phone) ON CONFLICT(phone) DO NOTHING RETURNING id INTO cid; IF cid IS NULL THEN SELECT id INTO cid FROM public.customers WHERE phone=p_phone; END IF; END IF;
 INSERT INTO public.leads(customer_id,source,note) VALUES(cid,'Website Chat',p_body) RETURNING id INTO lid;
 INSERT INTO public.chat_conversations(name,phone,token_hash,lead_id) VALUES(p_name,p_phone,p_hash,lid) RETURNING id INTO conv;
 INSERT INTO public.chat_messages(conversation_id,sender,body) VALUES(conv,'visitor',p_body);
 RETURN conv;
END $$;
REVOKE ALL ON FUNCTION public.start_shop_chat(text,text,text,text) FROM PUBLIC,anon,authenticated; GRANT EXECUTE ON FUNCTION public.start_shop_chat(text,text,text,text) TO service_role;