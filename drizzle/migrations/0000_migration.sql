
create type public.app_role as enum ('admin','team','finance');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;
create or replace function public.is_staff(_user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role in ('admin','team'))
$$;
create or replace function public.can_see_finance(_user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role in ('admin','finance'))
$$;

create policy "read own roles" on public.user_roles for select to authenticated using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));

create or replace function public.handle_new_user_role()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.user_roles where role = 'admin') then
    insert into public.user_roles (user_id, role) values (new.id, 'admin');
  end if;
  return new;
end $$;
create trigger on_auth_user_created_role after insert on auth.users for each row execute function public.handle_new_user_role();

create table public.items (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category text not null default 'clothing' check (category in ('clothing','shoes')),
  subcategory text,
  size text not null default 'M',
  measurements jsonb not null default '{}'::jsonb,
  condition_notes text,
  description text,
  photos text[] not null default '{}',
  sell_price integer not null default 0,
  source_bazaar text,
  date_sourced date default current_date,
  status text not null default 'Available' check (status in ('Available','Reserved','Sold')),
  created_at timestamptz not null default now()
);
grant select on public.items to anon, authenticated;
grant insert, update, delete on public.items to authenticated;
grant all on public.items to service_role;
alter table public.items enable row level security;
create policy "public read items" on public.items for select to anon, authenticated using (true);
create policy "staff write items" on public.items for all to authenticated using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));

create table public.item_costs (
  item_id uuid primary key references public.items(id) on delete cascade,
  cost_price integer not null default 0
);
grant select, insert, update, delete on public.item_costs to authenticated;
grant all on public.item_costs to service_role;
alter table public.item_costs enable row level security;
create policy "finance read costs" on public.item_costs for select to authenticated using (public.can_see_finance(auth.uid()) or public.is_staff(auth.uid()));
create policy "staff write costs" on public.item_costs for all to authenticated using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  name text not null,
  phone text not null unique,
  address text,
  city text,
  instagram_handle text,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.customers to authenticated;
grant all on public.customers to service_role;
alter table public.customers enable row level security;
create policy "staff customers" on public.customers for all to authenticated using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));
create policy "own customer" on public.customers for select to authenticated using (user_id = auth.uid());

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  code text not null unique default upper(substr(md5(random()::text),1,6)),
  customer_id uuid not null references public.customers(id) on delete cascade,
  item_id uuid references public.items(id) on delete set null,
  price integer not null default 0,
  advance_paid integer not null default 0,
  balance_due integer generated always as (price - advance_paid) stored,
  advance_status text not null default 'Pending' check (advance_status in ('Pending','Received')),
  courier text default 'TCS',
  tracking_number text,
  status text not null default 'Confirmed' check (status in ('Pending','Confirmed','Packed','Shipped','Delivered','Cancelled')),
  order_date timestamptz not null default now()
);
grant select, insert, update, delete on public.orders to authenticated;
grant all on public.orders to service_role;
alter table public.orders enable row level security;
create policy "staff orders" on public.orders for all to authenticated using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));
create policy "own orders" on public.orders for select to authenticated using (exists (select 1 from public.customers c where c.id = customer_id and c.user_id = auth.uid()));

create table public.leads (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references public.customers(id) on delete cascade,
  item_id uuid references public.items(id) on delete set null,
  source text not null default 'Instagram' check (source in ('Storefront','Instagram','WhatsApp')),
  status text not null default 'New' check (status in ('New','Contacted','Interested','Ordered','Lost')),
  note text,
  first_contact_at timestamptz not null default now(),
  last_reply_at timestamptz
);
grant select, insert, update, delete on public.leads to authenticated;
grant all on public.leads to service_role;
alter table public.leads enable row level security;
create policy "staff leads" on public.leads for all to authenticated using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('sourcing','ads','packaging','delivery')),
  amount integer not null,
  date date not null default current_date,
  note text,
  linked_item_id uuid references public.items(id) on delete set null
);
grant select, insert, update, delete on public.expenses to authenticated;
grant all on public.expenses to service_role;
alter table public.expenses enable row level security;
create policy "finance expenses" on public.expenses for all to authenticated using (public.can_see_finance(auth.uid())) with check (public.can_see_finance(auth.uid()));

create policy "staff upload photos" on storage.objects for insert to authenticated with check (bucket_id = 'item-photos' and public.is_staff(auth.uid()));
create policy "staff delete photos" on storage.objects for delete to authenticated using (bucket_id = 'item-photos' and public.is_staff(auth.uid()));

insert into public.items (title, category, subcategory, size, measurements, condition_notes, description, photos, sell_price, source_bazaar, date_sourced, status) values
('Rosy Garden Midi Dress','clothing','Dresses','M','{"Chest":"36 in","Waist":"28 in","Length":"48 in"}','Excellent — no flaws','Flowy floral midi with puff sleeves.','{dress}',2800,'Sunday Bazaar G-9',current_date-20,'Available'),
('Blush Stripe Retro Sneakers','shoes','Sneakers','EU 38','{"Insole":"24 cm","Width":"9 cm"}','Light sole wear','Leather court sneakers with pink trims.','{sneakers}',3500,'Landa Bazaar Rawalpindi',current_date-18,'Available'),
('Light Wash Denim Jacket','clothing','Jackets','L','{"Chest":"40 in","Shoulder":"17 in","Length":"23 in"}','Excellent','Classic 90s trucker jacket.','{denim}',3200,'Itwar Bazaar H-9',current_date-17,'Sold'),
('High-Waist Mom Jeans','clothing','Jeans','28','{"Waist":"28 in","Hip":"38 in","Inseam":"27 in"}','Very good','Relaxed fit, light wash.','{denim}',2400,'Itwar Bazaar H-9',current_date-17,'Available'),
('Satin Pointed Heels','shoes','Heels','EU 37','{"Insole":"23.5 cm","Heel":"3.5 in"}','Worn once','Blush satin d''Orsay pumps.','{heels}',3000,'Landa Bazaar Rawalpindi',current_date-15,'Reserved'),
('Cream Chunky Cardigan','clothing','Tops','M','{"Chest":"38 in","Length":"24 in","Sleeve":"22 in"}','Excellent','Cosy open knit, horn buttons.','{top}',2200,'Sunday Bazaar G-9',current_date-14,'Sold'),
('Dusty Rose Ribbed Top','clothing','Tops','S','{"Chest":"32 in","Length":"21 in"}','New with tags','Stretchy ribbed tee.','{top}',1200,'Sunday Bazaar G-9',current_date-14,'Sold'),
('Cognac Leather Ankle Boots','shoes','Boots','EU 39','{"Insole":"25 cm","Shaft":"6 in"}','Good — minor scuffs','Real leather side-zip boots.','{boots}',4200,'Landa Bazaar Rawalpindi',current_date-12,'Reserved'),
('Mauve Suede Loafers','shoes','Flats','EU 38','{"Insole":"24 cm"}','Very good','Soft suede penny loafers.','{boots}',2600,'Itwar Bazaar H-9',current_date-12,'Sold'),
('Mauve Satin Slip Dress','clothing','Dresses','S','{"Chest":"33 in","Length":"50 in"}','Excellent','Bias-cut maxi slip.','{satin}',3400,'Sunday Bazaar G-9',current_date-10,'Available'),
('Embroidered Cotton Kurti','clothing','Tops','M','{"Chest":"38 in","Length":"30 in"}','Excellent','Hand-embroidered neckline.','{satin}',1800,'Itwar Bazaar H-9',current_date-10,'Reserved'),
('Vintage Floral Sundress','clothing','Dresses','L','{"Chest":"38 in","Waist":"31 in","Length":"46 in"}','Small mend on hem','Cottagecore classic.','{dress}',2500,'Landa Bazaar Rawalpindi',current_date-8,'Sold'),
('Ivory Court Sneakers','shoes','Sneakers','EU 37','{"Insole":"23.5 cm"}','Very good','Minimal everyday sneaker.','{sneakers}',2900,'Sunday Bazaar G-9',current_date-7,'Sold'),
('Pearl Satin Kitten Heels','shoes','Heels','EU 38','{"Insole":"24 cm","Heel":"2 in"}','Excellent','Perfect for shaadi season.','{heels}',2700,'Itwar Bazaar H-9',current_date-6,'Sold'),
('Oversized Denim Shacket','clothing','Jackets','XL','{"Chest":"44 in","Length":"28 in"}','Good','Boyfriend fit shirt-jacket.','{denim}',2900,'Landa Bazaar Rawalpindi',current_date-5,'Available'),
('Lace Trim Knit Vest','clothing','Tops','S','{"Chest":"32 in","Length":"20 in"}','Excellent','Sweet layering piece.','{top}',1500,'Sunday Bazaar G-9',current_date-3,'Available'),
('Chelsea Ankle Boots','shoes','Boots','EU 38','{"Insole":"24 cm","Shaft":"5 in"}','Very good','Brown faux leather chelsea.','{boots}',3600,'Itwar Bazaar H-9',current_date-2,'Available'),
('Rose Print Wrap Dress','clothing','Dresses','M','{"Chest":"36 in","Length":"44 in"}','Excellent','Flattering wrap silhouette.','{dress}',3100,'Sunday Bazaar G-9',current_date-1,'Reserved');

insert into public.item_costs (item_id, cost_price)
select id, round(sell_price * 0.38)::int from public.items;

insert into public.customers (name, phone, address, city, instagram_handle) values
('Ayesha Khan','0300-1234567','House 12, Street 5, F-7/2','Islamabad','@ayesha.k'),
('Fatima Malik','0321-9876543','Flat 3B, Gulberg III','Lahore','@fatimamalik_'),
('Zainab Ahmed','0333-4455667','Block 7, Clifton','Karachi','@zainabstyles'),
('Hira Siddiqui','0345-1122334','Street 22, Bahria Phase 4','Rawalpindi','@hira.sid'),
('Maryam Raza','0312-7788990','Model Town Ext.','Lahore','@maryam.thrifts'),
('Sana Javed','0301-5566778','DHA Phase 2','Islamabad','@sanaj'),
('Mahnoor Iqbal','0322-3344556','Saddar','Peshawar','@mahnoor.iq'),
('Iqra Shah','0334-6677889','Satellite Town','Multan','@iqra_shah'),
('Noor Fatima','0346-9988776','Cantt Area','Faisalabad','@noor.f');

insert into public.orders (code, customer_id, item_id, price, advance_paid, advance_status, courier, tracking_number, status, order_date)
select v.code, c.id, i.id, i.sell_price + 250, v.adv, v.advs, v.courier, v.trk, v.st, now() - (v.days || ' days')::interval
from (values
  ('TBA101','0300-1234567','Light Wash Denim Jacket',3450,'Received','TCS','TCS-77120345','Delivered',16),
  ('TBA102','0321-9876543','Dusty Rose Ribbed Top',1450,'Received','TCS','TCS-77120876','Delivered',13),
  ('TBA103','0333-4455667','Mauve Suede Loafers',1000,'Received','Leopards','LP-5520981','Delivered',11),
  ('TBA104','0300-1234567','Ivory Court Sneakers',1000,'Received','TCS','TCS-77121990','Shipped',5),
  ('TBA105','0345-1122334','Satin Pointed Heels',1000,'Received','TCS',null,'Packed',3),
  ('TBA106','0312-7788990','Embroidered Cotton Kurti',500,'Pending','TCS',null,'Confirmed',1),
  ('TBA107','0301-5566778','Cream Chunky Cardigan',2450,'Received','M&P','MP-330192','Delivered',9),
  ('TBA108','0322-3344556','Vintage Floral Sundress',1000,'Received','TCS','TCS-77122410','Shipped',4),
  ('TBA109','0334-6677889','Cognac Leather Ankle Boots',1000,'Pending','TCS',null,'Confirmed',2),
  ('TBA110','0346-9988776','Rose Print Wrap Dress',500,'Pending','Leopards',null,'Pending',0),
  ('TBA111','0321-9876543','Pearl Satin Kitten Heels',2950,'Received','TCS','TCS-77119002','Delivered',20)
) as v(code, phone, title, adv, advs, courier, trk, st, days)
join public.customers c on c.phone = v.phone
join public.items i on i.title = v.title;

insert into public.leads (customer_id, item_id, source, status, note, first_contact_at, last_reply_at)
select c.id, i.id, v.src, v.st, v.note, now() - (v.fh || ' hours')::interval, case when v.lh is null then null else now() - (v.lh || ' hours')::interval end
from (values
  ('0346-9988776','Mauve Satin Slip Dress','Instagram','New','DM: is this available?',30,null),
  ('0334-6677889','Chelsea Ankle Boots','WhatsApp','New','Asked for size chart',5,null),
  ('0301-5566778','Oversized Denim Shacket','Instagram','Contacted','Sent measurements',50,40),
  ('0322-3344556','Lace Trim Knit Vest','Storefront','Interested','Wants combo price',26,20),
  ('0312-7788990','Rosy Garden Midi Dress','Instagram','Interested','Waiting on payday',72,60),
  ('0345-1122334','Satin Pointed Heels','WhatsApp','Ordered','Advance received',80,72),
  ('0333-4455667','High-Waist Mom Jeans','Instagram','Lost','Size too small',120,110),
  ('0300-1234567','Blush Stripe Retro Sneakers','Storefront','Contacted','Asked about COD',10,8)
) as v(phone, title, src, st, note, fh, lh)
join public.customers c on c.phone = v.phone
join public.items i on i.title = v.title;

insert into public.expenses (type, amount, date, note)
select v.t, v.a, current_date - v.d, v.n from (values
  ('sourcing',9500,27,'Sunday Bazaar haul'),('ads',2000,26,'IG boost'),('packaging',1200,25,'Mailer bags'),('delivery',1800,22,'TCS weekly'),
  ('sourcing',11200,20,'Landa Bazaar haul'),('ads',2500,19,'Reel promo'),('delivery',2100,15,'TCS weekly'),
  ('sourcing',8700,13,'Itwar Bazaar haul'),('packaging',900,12,'Tissue + stickers'),('ads',3000,11,'IG boost'),('delivery',1950,8,'TCS weekly'),
  ('sourcing',10400,6,'Sunday Bazaar haul'),('ads',2200,4,'Story ads'),('packaging',700,3,'Thank-you cards'),('delivery',1600,1,'TCS weekly')
) as v(t,a,d,n);
