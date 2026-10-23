-- Glory Home : mise à jour pour une base DÉJÀ installée (livraison par commune + protections anti-abus).
-- À exécuter UNE fois dans Supabase > SQL Editor. Ne supprime aucune donnée et peut être relancé sans risque.

-- Frais de livraison par commune
create table if not exists delivery_zones (
  name text primary key,
  fee integer not null check (fee >= 0),
  sort integer not null default 0
);
insert into delivery_zones (name, fee, sort) values
  ('Abatta', 1500, 1), ('Bingerville', 1500, 2), ('Faya', 1500, 3), ('Angré', 1500, 4), ('Cocody', 1500, 5),
  ('Koumassi', 2000, 6), ('Port-Bouët', 2000, 7), ('Yopougon', 2000, 8), ('Abobo', 2000, 9), ('Marcory', 2000, 10), ('Treichville', 2000, 11)
on conflict (name) do update set fee = excluded.fee, sort = excluded.sort;
alter table delivery_zones enable row level security;
drop policy if exists zones_read on delivery_zones;
create policy zones_read on delivery_zones for select using (true);
drop policy if exists zones_admin on delivery_zones;
create policy zones_admin on delivery_zones for all using (is_admin()) with check (is_admin());

-- Création d'une commande : prix, stock et frais de livraison vérifiés côté serveur
create or replace function create_order(payload jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  c jsonb := payload->'customer';
  item jsonb;
  prod products%rowtype;
  v_qty integer;
  v_sub integer := 0;
  v_num text;
  v_id uuid;
  v_pay text := payload->>'payment';
  v_zone text := trim(coalesce(c->>'zone', ''));
  v_fee integer := 0;
  v_city text;
begin
  if c is null or coalesce(trim(c->>'name'), '') = '' or coalesce(trim(c->>'phone'), '') = ''
     or coalesce(trim(c->>'address'), '') = '' then
    raise exception 'Informations de livraison incomplètes.';
  end if;
  if length(regexp_replace(c->>'phone', '\D', '', 'g')) not between 8 and 15 then
    raise exception 'Numéro de téléphone invalide.';
  end if;
  if v_pay <> 'livraison' then raise exception 'Mode de paiement invalide.'; end if;
  if coalesce(trim(c->>'email'), '') <> '' and trim(c->>'email') !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'Adresse email invalide.';
  end if;
  if jsonb_typeof(payload->'items') <> 'array' or jsonb_array_length(payload->'items') not between 1 and 10 then
    raise exception 'Panier invalide.';
  end if;
  -- Quantités : entiers de 1 à 2 chiffres, 20 articles maximum par commande
  if exists (select 1 from jsonb_array_elements(payload->'items') e where coalesce(e->>'q', '') !~ '^\d{1,2}$') then
    raise exception 'Quantité invalide.';
  end if;
  if (select sum((e->>'q')::int) from jsonb_array_elements(payload->'items') e) > 20 then
    raise exception 'Maximum 20 articles par commande. Contactez-nous pour une commande plus importante.';
  end if;
  -- Anti-abus : un robot ne doit pas pouvoir vider le stock avec de fausses commandes
  if (select count(*) from orders where created_at > now() - interval '1 hour'
        and right(regexp_replace(phone, '\D', '', 'g'), 8) = right(regexp_replace(c->>'phone', '\D', '', 'g'), 8)) >= 3 then
    raise exception 'Trop de commandes avec ce numéro. Contactez-nous directement.';
  end if;
  if (select count(*) from orders where created_at > now() - interval '10 minutes') >= 40 then
    raise exception 'Le service est très sollicité, réessayez dans quelques minutes.';
  end if;

  if v_zone = 'expedition' then
    if coalesce(trim(c->>'city'), '') = '' then raise exception 'Indiquez la ville de destination.'; end if;
    v_city := 'Expédition : ' || left(trim(c->>'city'), 70);
  else
    select fee into v_fee from delivery_zones where name = v_zone;
    if not found then raise exception 'Commune de livraison invalide.'; end if;
    v_city := v_zone;
  end if;

  loop
    v_num := 'GH-' || to_char(now(), 'YYMMDD') || '-' || lpad((floor(random() * 10000))::int::text, 4, '0');
    exit when not exists (select 1 from orders where number = v_num);
  end loop;

  insert into orders (number, customer_name, phone, email, city, address, notes, payment, subtotal, delivery, total)
  values (v_num, left(trim(c->>'name'), 80), left(trim(c->>'phone'), 25), nullif(left(trim(coalesce(c->>'email', '')), 120), ''),
          v_city, left(trim(c->>'address'), 200), nullif(left(trim(coalesce(c->>'notes', '')), 300), ''), v_pay, 0, v_fee, 0)
  returning id into v_id;

  for item in select * from jsonb_array_elements(payload->'items') loop
    v_qty := (item->>'q')::integer;
    if v_qty is null or v_qty not between 1 and 10 then raise exception 'Quantité invalide.'; end if;
    select * into prod from products where id = item->>'p' and active;
    if not found then raise exception 'Produit indisponible.'; end if;
    update variants set stock = stock - v_qty where product_id = prod.id and color = item->>'c' and stock >= v_qty;
    if not found then raise exception 'Stock insuffisant pour % (%).', prod.name, item->>'c'; end if;
    insert into order_items (order_id, product_id, product_name, color, qty, unit_price)
    values (v_id, prod.id, prod.name, item->>'c', v_qty, prod.price);
    v_sub := v_sub + prod.price * v_qty;
  end loop;

  update orders set subtotal = v_sub, total = v_sub + v_fee where id = v_id;
  return jsonb_build_object('number', v_num, 'total', v_sub + v_fee, 'delivery', v_fee, 'shipping', v_zone = 'expedition');
end $$;

-- Anti-spam : limite globale des inscriptions et des messages (les formulaires sont publics)
create or replace function throttle_public_insert() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_table_name = 'messages' and (select count(*) from messages where created_at > now() - interval '10 minutes') >= 30 then
    raise exception 'Trop de demandes, réessayez dans quelques minutes.';
  end if;
  if tg_table_name = 'subscribers' and (select count(*) from subscribers where created_at > now() - interval '10 minutes') >= 60 then
    raise exception 'Trop de demandes, réessayez dans quelques minutes.';
  end if;
  return new;
end $$;
drop trigger if exists messages_throttle on messages;
create trigger messages_throttle before insert on messages for each row execute function throttle_public_insert();
drop trigger if exists subscribers_throttle on subscribers;
create trigger subscribers_throttle before insert on subscribers for each row execute function throttle_public_insert();

-- Droits minimaux (en plus de la RLS) : le public ne peut rien lire ni modifier d'autre que ci-dessous
revoke all on products, variants, orders, order_items, subscribers, messages, admins, delivery_zones from anon, authenticated;
grant select on products, variants, delivery_zones to anon, authenticated;
grant insert on subscribers, messages to anon, authenticated;
grant insert, update, delete on products, variants, delivery_zones to authenticated;
grant select, update on orders to authenticated;
grant select on order_items, subscribers, messages, admins to authenticated;
revoke all on function throttle_public_insert() from public;

revoke all on function create_order(jsonb), track_order(text, text) from public;
grant execute on function create_order(jsonb), track_order(text, text) to anon, authenticated;
