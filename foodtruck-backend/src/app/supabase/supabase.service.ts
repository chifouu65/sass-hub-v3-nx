import { Injectable, Logger, OnModuleInit } from '@nestjs/common';

// ── Types PostgREST ───────────────────────────────────────────────────────────

export interface DbTruck {
  id: string;
  owner_id: string;
  name: string;
  description: string | null;
  logo_url: string | null;
  cover_url: string | null;
  phone: string | null;
  cuisine_type: string | null;
  is_open: boolean;
  created_at: string;
  updated_at: string;
}

export interface DbLocation {
  id: string;
  truck_id: string;
  latitude: number;
  longitude: number;
  address: string | null;
  updated_at: string;
}

export interface DbSchedule {
  id: string;
  truck_id: string;
  day_of_week: number;
  location_name: string | null;
  latitude: number | null;
  longitude: number | null;
  open_time: string;
  close_time: string;
  created_at: string;
}

export interface DbMenuCategory {
  id: string;
  truck_id: string;
  name: string;
  position: number;
  created_at: string;
}

export interface DbMenuItem {
  id: string;
  truck_id: string;
  category_id: string | null;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  is_available: boolean;
  created_at: string;
  updated_at: string;
}

export interface DbOrder {
  id: string;
  truck_id: string;
  customer_id: string;
  status: string;
  total_price: number;
  pickup_time: string | null;
  note: string | null;
  created_at: string;
  updated_at: string;
  items?: DbOrderItem[];
}

export interface DbOrderItem {
  id: string;
  order_id: string;
  menu_item_id: string;
  quantity: number;
  unit_price: number;
  note: string | null;
}

export interface DbFollower {
  id: string;
  truck_id: string;
  customer_id: string;
  created_at: string;
}

export interface DbNotification {
  id: string;
  user_id: string;
  truck_id: string | null;
  type: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

// ── Service ───────────────────────────────────────────────────────────────────

@Injectable()
export class SupabaseService implements OnModuleInit {
  private readonly logger = new Logger(SupabaseService.name);
  private readonly baseUrl: string;
  private readonly key: string;

  constructor() {
    this.baseUrl =
      (process.env.SUPABASE_URL ?? 'https://ovofzfaqarofafckxykg.supabase.co') + '/rest/v1';
    this.key =
      process.env.SUPABASE_SERVICE_KEY ??
      process.env.SUPABASE_ANON_KEY ??
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im92b2Z6ZmFxYXJvZmFmY2t4eWtnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ1MjI2ODcsImV4cCI6MjA5MDA5ODY4N30.aG1_wkz7Hy4tqNWwv5ap9dGOyw6ccoq8pNpOrAfc-8E';
  }

  async onModuleInit() {
    try {
      await this.get<DbTruck[]>('trucks?select=id&limit=1');
      this.logger.log('Supabase connected ✓');
    } catch (e) {
      this.logger.error('Supabase connection failed', e);
    }
  }

  // ── HTTP helpers ──────────────────────────────────────────────────────────

  private headers(extra: Record<string, string> = {}): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      apikey: this.key,
      Authorization: `Bearer ${this.key}`,
      ...extra,
    };
  }

  private async get<T>(path: string): Promise<T> {
    const res = await fetch(`${this.baseUrl}/${path}`, {
      headers: this.headers({ Accept: 'application/json' }),
    });
    if (!res.ok) throw new Error(`Supabase GET /${path} → ${res.status}: ${await res.text()}`);
    return res.json() as Promise<T>;
  }

  private async post<T>(path: string, body: unknown, prefer = ''): Promise<T> {
    const headers = this.headers({ Prefer: prefer || 'return=representation' });
    const res = await fetch(`${this.baseUrl}/${path}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`Supabase POST /${path} → ${res.status}: ${await res.text()}`);
    const text = await res.text();
    return text ? (JSON.parse(text) as T) : ([] as unknown as T);
  }

  private async patch(path: string, body: unknown): Promise<void> {
    const res = await fetch(`${this.baseUrl}/${path}`, {
      method: 'PATCH',
      headers: this.headers({ Prefer: 'return=minimal' }),
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`Supabase PATCH /${path} → ${res.status}: ${await res.text()}`);
  }

  private async del(path: string): Promise<void> {
    const res = await fetch(`${this.baseUrl}/${path}`, {
      method: 'DELETE',
      headers: this.headers({ Prefer: 'return=minimal' }),
    });
    if (!res.ok) throw new Error(`Supabase DELETE /${path} → ${res.status}: ${await res.text()}`);
  }

  // ── Trucks ─────────────────────────────────────────────────────────────────

  async findAll(): Promise<DbTruck[]> {
    return this.get<DbTruck[]>('trucks?select=*');
  }

  async findAllOpen(): Promise<DbTruck[]> {
    return this.get<DbTruck[]>('trucks?is_open=eq.true&select=*');
  }

  async findByOwner(ownerId: string): Promise<DbTruck[]> {
    return this.get<DbTruck[]>(`trucks?owner_id=eq.${ownerId}&select=*`);
  }

  async findById(id: string): Promise<DbTruck | null> {
    const rows = await this.get<DbTruck[]>(`trucks?id=eq.${id}&select=*`);
    return rows[0] ?? null;
  }

  async createTruck(ownerId: string, data: Partial<DbTruck>): Promise<DbTruck> {
    const rows = await this.post<DbTruck[]>(
      'trucks',
      { owner_id: ownerId, ...data },
      'return=representation',
    );
    const truck = Array.isArray(rows) ? rows[0] : (rows as unknown as DbTruck);
    if (!truck) throw new Error('Truck creation failed');
    return truck;
  }

  async updateTruck(id: string, data: Partial<DbTruck>): Promise<void> {
    await this.patch(`trucks?id=eq.${id}`, {
      ...data,
      updated_at: new Date().toISOString(),
    });
  }

  async setOpen(id: string, isOpen: boolean): Promise<void> {
    await this.patch(`trucks?id=eq.${id}`, {
      is_open: isOpen,
      updated_at: new Date().toISOString(),
    });
  }

  // ── Locations ──────────────────────────────────────────────────────────────

  async upsertLocation(
    truckId: string,
    lat: number,
    lng: number,
    address?: string,
  ): Promise<void> {
    const existing = await this.get<DbLocation[]>(`locations?truck_id=eq.${truckId}&select=id`);
    if (existing.length > 0) {
      await this.patch(`locations?truck_id=eq.${truckId}`, {
        latitude: lat,
        longitude: lng,
        address: address ?? null,
        updated_at: new Date().toISOString(),
      });
    } else {
      await this.post(
        'locations',
        {
          truck_id: truckId,
          latitude: lat,
          longitude: lng,
          address: address ?? null,
        },
        'return=minimal',
      );
    }
  }

  async getLocation(truckId: string): Promise<DbLocation | null> {
    const rows = await this.get<DbLocation[]>(`locations?truck_id=eq.${truckId}&select=*`);
    return rows[0] ?? null;
  }

  async getOpenTrucksWithLocation(): Promise<Array<DbTruck & { location: DbLocation | null }>> {
    const trucks = await this.findAllOpen();
    const result: Array<DbTruck & { location: DbLocation | null }> = [];
    for (const truck of trucks) {
      const location = await this.getLocation(truck.id);
      result.push({ ...truck, location });
    }
    return result;
  }

  // ── Schedules ──────────────────────────────────────────────────────────────

  async getSchedules(truckId: string): Promise<DbSchedule[]> {
    return this.get<DbSchedule[]>(`schedules?truck_id=eq.${truckId}&select=*`);
  }

  async upsertSchedule(truckId: string, data: Partial<DbSchedule>): Promise<DbSchedule> {
    const rows = await this.post<DbSchedule[]>(
      'schedules',
      { truck_id: truckId, ...data },
      'resolution=merge-duplicates,return=representation',
    );
    const schedule = Array.isArray(rows) ? rows[0] : (rows as unknown as DbSchedule);
    if (!schedule) throw new Error('Schedule upsert failed');
    return schedule;
  }

  async getScheduleById(id: string): Promise<DbSchedule | null> {
    const rows = await this.get<DbSchedule[]>(`schedules?id=eq.${id}&select=*`);
    return rows[0] ?? null;
  }

  async deleteSchedule(id: string): Promise<void> {
    await this.del(`schedules?id=eq.${id}`);
  }

  // ── Menu Categories ───────────────────────────────────────────────────────

  async getCategories(truckId: string): Promise<DbMenuCategory[]> {
    return this.get<DbMenuCategory[]>(
      `menu_categories?truck_id=eq.${truckId}&order=position.asc&select=*`,
    );
  }

  async createCategory(truckId: string, name: string, position?: number): Promise<DbMenuCategory> {
    const existing = await this.getCategories(truckId);
    const nextPosition = position ?? existing.length;
    const rows = await this.post<DbMenuCategory[]>(
      'menu_categories',
      { truck_id: truckId, name, position: nextPosition },
      'return=representation',
    );
    const category = Array.isArray(rows) ? rows[0] : (rows as unknown as DbMenuCategory);
    if (!category) throw new Error('Category creation failed');
    return category;
  }

  async updateCategory(id: string, data: Partial<DbMenuCategory>): Promise<void> {
    await this.patch(`menu_categories?id=eq.${id}`, data);
  }

  async deleteCategory(id: string): Promise<void> {
    await this.del(`menu_categories?id=eq.${id}`);
  }

  // ── Menu Items ─────────────────────────────────────────────────────────────

  async getMenuItems(truckId: string): Promise<DbMenuItem[]> {
    return this.get<DbMenuItem[]>(`menu_items?truck_id=eq.${truckId}&select=*`);
  }

  async getMenuItemById(id: string): Promise<DbMenuItem | null> {
    const rows = await this.get<DbMenuItem[]>(`menu_items?id=eq.${id}&select=*`);
    return rows[0] ?? null;
  }

  async getMenuCategoryById(id: string): Promise<DbMenuCategory | null> {
    const rows = await this.get<DbMenuCategory[]>(`menu_categories?id=eq.${id}&select=*`);
    return rows[0] ?? null;
  }

  async createMenuItem(data: Partial<DbMenuItem>): Promise<DbMenuItem> {
    const rows = await this.post<DbMenuItem[]>(
      'menu_items',
      data,
      'return=representation',
    );
    const item = Array.isArray(rows) ? rows[0] : (rows as unknown as DbMenuItem);
    if (!item) throw new Error('Menu item creation failed');
    return item;
  }

  async updateMenuItem(id: string, data: Partial<DbMenuItem>): Promise<void> {
    await this.patch(`menu_items?id=eq.${id}`, {
      ...data,
      updated_at: new Date().toISOString(),
    });
  }

  async deleteMenuItem(id: string): Promise<void> {
    await this.del(`menu_items?id=eq.${id}`);
  }

  // ── Orders ─────────────────────────────────────────────────────────────────

  async createOrder(
    data: Partial<DbOrder>,
    items: Array<{ menuItemId: string; quantity: number; unitPrice: number; note?: string }>,
  ): Promise<DbOrder> {
    const rows = await this.post<DbOrder[]>(
      'orders',
      data,
      'return=representation',
    );
    const order = Array.isArray(rows) ? rows[0] : (rows as unknown as DbOrder);
    if (!order) throw new Error('Order creation failed');

    // Create order items
    const orderItems: DbOrderItem[] = [];
    for (const item of items) {
      const itemRows = await this.post<DbOrderItem[]>(
        'order_items',
        {
          order_id: order.id,
          menu_item_id: item.menuItemId,
          quantity: item.quantity,
          unit_price: item.unitPrice,
          note: item.note ?? null,
        },
        'return=representation',
      );
      const orderItem = Array.isArray(itemRows) ? itemRows[0] : (itemRows as unknown as DbOrderItem);
      if (orderItem) orderItems.push(orderItem);
    }

    order.items = orderItems;
    return order;
  }

  async getOrdersByTruck(truckId: string, status?: string): Promise<DbOrder[]> {
    const query = status
      ? `orders?truck_id=eq.${truckId}&status=eq.${status}&order=created_at.desc&select=*`
      : `orders?truck_id=eq.${truckId}&order=created_at.desc&select=*`;
    const orders = await this.get<DbOrder[]>(query);
    // Enrich each order with its items + menu item name
    for (const order of orders) {
      const items = await this.get<DbOrderItem[]>(`order_items?order_id=eq.${order.id}&select=*`);
      // Enrich items with menu item name
      for (const item of items) {
        const menuItem = await this.getMenuItemById(item.menu_item_id);
        (item as any).menu_item_name = menuItem?.name ?? null;
      }
      order.items = items;
    }
    return orders;
  }

  async getOrdersByCustomer(customerId: string): Promise<DbOrder[]> {
    return this.get<DbOrder[]>(`orders?customer_id=eq.${customerId}&select=*`);
  }

  async getOrderById(id: string): Promise<DbOrder | null> {
    const rows = await this.get<DbOrder[]>(`orders?id=eq.${id}&select=*`);
    if (!rows[0]) return null;
    const order = rows[0];
    const items = await this.get<DbOrderItem[]>(`order_items?order_id=eq.${id}&select=*`);
    order.items = items;
    return order;
  }

  async updateOrderStatus(id: string, status: string): Promise<void> {
    await this.patch(`orders?id=eq.${id}`, {
      status,
      updated_at: new Date().toISOString(),
    });
  }

  // ── Followers ──────────────────────────────────────────────────────────────

  async followTruck(truckId: string, customerId: string): Promise<void> {
    // Use ignore-duplicates to silently skip if already following
    const already = await this.isFollowing(truckId, customerId);
    if (already) return;
    await this.post(
      'followers',
      { truck_id: truckId, customer_id: customerId },
      'return=minimal',
    );
  }

  async unfollowTruck(truckId: string, customerId: string): Promise<void> {
    await this.del(`followers?truck_id=eq.${truckId}&customer_id=eq.${customerId}`);
  }

  async getFollowedTrucks(customerId: string): Promise<DbTruck[]> {
    const followers = await this.get<DbFollower[]>(
      `followers?customer_id=eq.${customerId}&select=truck_id`,
    );
    const truckIds = followers.map(f => f.truck_id);
    if (!truckIds.length) return [];

    // PostgREST or() uses dot-notation: id.eq.value (not id=eq.value)
    const query = truckIds.map((id) => `id.eq.${id}`).join(',');
    return this.get<DbTruck[]>(`trucks?or=(${query})&select=*`);
  }

  async isFollowing(truckId: string, customerId: string): Promise<boolean> {
    const rows = await this.get<DbFollower[]>(
      `followers?truck_id=eq.${truckId}&customer_id=eq.${customerId}&select=id`,
    );
    return rows.length > 0;
  }

  // ── Notifications ──────────────────────────────────────────────────────────

  async createNotification(
    userId: string,
    truckId: string | null,
    type: string,
    message: string,
  ): Promise<void> {
    await this.post(
      'notifications',
      {
        user_id: userId,
        truck_id: truckId,
        type,
        message,
        is_read: false,
      },
      'return=minimal',
    );
  }

  async getNotifications(userId: string): Promise<DbNotification[]> {
    return this.get<DbNotification[]>(`notifications?user_id=eq.${userId}&select=*`);
  }

  async markAsRead(id: string): Promise<void> {
    await this.patch(`notifications?id=eq.${id}`, { is_read: true });
  }

  async markAllAsRead(userId: string): Promise<void> {
    await this.patch(`notifications?user_id=eq.${userId}`, { is_read: true });
  }

  async notifyFollowers(truckId: string, type: string, message: string): Promise<void> {
    const followers = await this.get<DbFollower[]>(
      `followers?truck_id=eq.${truckId}&select=customer_id`,
    );
    for (const follower of followers) {
      await this.createNotification(follower.customer_id, truckId, type, message);
    }
  }
}
