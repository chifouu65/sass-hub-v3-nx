-- ============================================================
-- Migration : activation du Row Level Security (RLS)
-- Supabase — hub-backend + foodtruck-backend
-- Date : 2026-04-08
--
-- IMPORTANT : les backends utilisent la SERVICE_ROLE key qui
-- contourne le RLS par conception (accès admin total).
-- Ces policies protègent les données en cas d'accès direct à
-- la base (ex. anon key mal configurée, fuite de credentials).
--
-- Pour appliquer : Supabase Dashboard > SQL Editor > coller et exécuter.
-- ============================================================

-- ── Hub-backend tables ────────────────────────────────────────────────────

-- 1. users
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Un utilisateur ne peut lire que sa propre ligne
CREATE POLICY "users: select own row"
  ON users FOR SELECT
  USING (id = auth.uid());

-- Seul le service role peut insérer (register géré côté API)
CREATE POLICY "users: insert via service role only"
  ON users FOR INSERT
  WITH CHECK (false);

-- Un utilisateur peut mettre à jour uniquement ses propres données
CREATE POLICY "users: update own row"
  ON users FOR UPDATE
  USING (id = auth.uid());

-- Aucune suppression via API cliente
CREATE POLICY "users: no delete"
  ON users FOR DELETE
  USING (false);

-- 2. refresh_tokens
ALTER TABLE refresh_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "refresh_tokens: select own"
  ON refresh_tokens FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "refresh_tokens: no direct insert/update/delete"
  ON refresh_tokens FOR INSERT
  WITH CHECK (false);

CREATE POLICY "refresh_tokens: no update"
  ON refresh_tokens FOR UPDATE
  USING (false);

CREATE POLICY "refresh_tokens: no delete"
  ON refresh_tokens FOR DELETE
  USING (false);

-- 3. password_reset_tokens
ALTER TABLE password_reset_tokens ENABLE ROW LEVEL SECURITY;

-- Lecture bloquée côté client (tout passe par le service role)
CREATE POLICY "password_reset_tokens: deny all client access"
  ON password_reset_tokens FOR SELECT
  USING (false);

CREATE POLICY "password_reset_tokens: deny insert"
  ON password_reset_tokens FOR INSERT
  WITH CHECK (false);

CREATE POLICY "password_reset_tokens: deny update"
  ON password_reset_tokens FOR UPDATE
  USING (false);

-- 4. stripe_customers
ALTER TABLE stripe_customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "stripe_customers: select own"
  ON stripe_customers FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "stripe_customers: no direct insert"
  ON stripe_customers FOR INSERT
  WITH CHECK (false);

CREATE POLICY "stripe_customers: no update"
  ON stripe_customers FOR UPDATE
  USING (false);

CREATE POLICY "stripe_customers: no delete"
  ON stripe_customers FOR DELETE
  USING (false);

-- 5. user_app_subscriptions
ALTER TABLE user_app_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_app_subscriptions: select own"
  ON user_app_subscriptions FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "user_app_subscriptions: no direct write"
  ON user_app_subscriptions FOR INSERT
  WITH CHECK (false);

CREATE POLICY "user_app_subscriptions: no update"
  ON user_app_subscriptions FOR UPDATE
  USING (false);

CREATE POLICY "user_app_subscriptions: no delete"
  ON user_app_subscriptions FOR DELETE
  USING (false);

-- ── Foodtruck-backend tables ──────────────────────────────────────────────

-- 6. trucks
ALTER TABLE trucks ENABLE ROW LEVEL SECURITY;

-- Lecture publique pour les trucks ouverts
CREATE POLICY "trucks: public read"
  ON trucks FOR SELECT
  USING (true);

-- Un owner ne peut écrire que sur son propre truck
CREATE POLICY "trucks: owner insert"
  ON trucks FOR INSERT
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "trucks: owner update"
  ON trucks FOR UPDATE
  USING (owner_id = auth.uid());

CREATE POLICY "trucks: owner delete"
  ON trucks FOR DELETE
  USING (owner_id = auth.uid());

-- 7. locations
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "locations: public read"
  ON locations FOR SELECT
  USING (true);

CREATE POLICY "locations: owner write"
  ON locations FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM trucks WHERE trucks.id = truck_id AND trucks.owner_id = auth.uid())
  );

CREATE POLICY "locations: owner update"
  ON locations FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM trucks WHERE trucks.id = truck_id AND trucks.owner_id = auth.uid())
  );

-- 8. menu_categories
ALTER TABLE menu_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "menu_categories: public read"
  ON menu_categories FOR SELECT
  USING (true);

CREATE POLICY "menu_categories: owner insert"
  ON menu_categories FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM trucks WHERE trucks.id = truck_id AND trucks.owner_id = auth.uid())
  );

CREATE POLICY "menu_categories: owner update"
  ON menu_categories FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM trucks WHERE trucks.id = truck_id AND trucks.owner_id = auth.uid())
  );

CREATE POLICY "menu_categories: owner delete"
  ON menu_categories FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM trucks WHERE trucks.id = truck_id AND trucks.owner_id = auth.uid())
  );

-- 9. menu_items
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "menu_items: public read"
  ON menu_items FOR SELECT
  USING (true);

CREATE POLICY "menu_items: owner insert"
  ON menu_items FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM trucks WHERE trucks.id = truck_id AND trucks.owner_id = auth.uid())
  );

CREATE POLICY "menu_items: owner update"
  ON menu_items FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM trucks WHERE trucks.id = truck_id AND trucks.owner_id = auth.uid())
  );

CREATE POLICY "menu_items: owner delete"
  ON menu_items FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM trucks WHERE trucks.id = truck_id AND trucks.owner_id = auth.uid())
  );

-- 10. orders
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Un customer voit ses propres commandes ; le propriétaire du truck voit celles de son truck
CREATE POLICY "orders: customer or owner read"
  ON orders FOR SELECT
  USING (
    customer_id = auth.uid()
    OR EXISTS (SELECT 1 FROM trucks WHERE trucks.id = truck_id AND trucks.owner_id = auth.uid())
  );

CREATE POLICY "orders: customer insert"
  ON orders FOR INSERT
  WITH CHECK (customer_id = auth.uid());

-- Seul le propriétaire du truck peut mettre à jour le statut
CREATE POLICY "orders: owner update status"
  ON orders FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM trucks WHERE trucks.id = truck_id AND trucks.owner_id = auth.uid())
  );

-- 11. order_items
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "order_items: customer or owner read"
  ON order_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_id
        AND (
          orders.customer_id = auth.uid()
          OR EXISTS (SELECT 1 FROM trucks WHERE trucks.id = orders.truck_id AND trucks.owner_id = auth.uid())
        )
    )
  );

CREATE POLICY "order_items: customer insert"
  ON order_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_id AND orders.customer_id = auth.uid()
    )
  );

-- 12. schedules
ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "schedules: public read"
  ON schedules FOR SELECT
  USING (true);

CREATE POLICY "schedules: owner write"
  ON schedules FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM trucks WHERE trucks.id = truck_id AND trucks.owner_id = auth.uid())
  );

CREATE POLICY "schedules: owner update"
  ON schedules FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM trucks WHERE trucks.id = truck_id AND trucks.owner_id = auth.uid())
  );

CREATE POLICY "schedules: owner delete"
  ON schedules FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM trucks WHERE trucks.id = truck_id AND trucks.owner_id = auth.uid())
  );

-- 13. notifications
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notifications: user reads own"
  ON notifications FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "notifications: user updates own (mark read)"
  ON notifications FOR UPDATE
  USING (user_id = auth.uid());

-- Insert via service role uniquement (déclenché par les actions backend)
CREATE POLICY "notifications: no direct insert"
  ON notifications FOR INSERT
  WITH CHECK (false);

-- 14. followers
ALTER TABLE followers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "followers: public read"
  ON followers FOR SELECT
  USING (true);

CREATE POLICY "followers: customer insert own"
  ON followers FOR INSERT
  WITH CHECK (customer_id = auth.uid());

CREATE POLICY "followers: customer delete own"
  ON followers FOR DELETE
  USING (customer_id = auth.uid());
