import { Injectable } from '@nestjs/common';
import { SupabaseService, DbMenuCategory, DbMenuItem } from '../supabase/supabase.service';

@Injectable()
export class MenuService {
  constructor(private readonly supabase: SupabaseService) {}

  async getMenuWithCategories(truckId: string) {
    const categories = await this.supabase.getCategories(truckId);
    const items = await this.supabase.getMenuItems(truckId);

    // Group items into their respective categories
    const categoriesWithItems = categories.map(cat => ({
      ...cat,
      items: items.filter(item => item.category_id === cat.id).map(item => ({
        id: item.id,
        name: item.name,
        description: item.description,
        price: item.price,
        categoryId: item.category_id,
        imageUrl: item.image_url,
        available: item.is_available ?? true,
      })),
    }));

    return { categories: categoriesWithItems };
  }

  async createCategory(truckId: string, name: string, position?: number) {
    return this.supabase.createCategory(truckId, name, position);
  }

  async updateCategory(id: string, data: Partial<DbMenuCategory>) {
    await this.supabase.updateCategory(id, data);
  }

  async deleteCategory(id: string) {
    await this.supabase.deleteCategory(id);
  }

  async createMenuItem(data: Partial<DbMenuItem>) {
    return this.supabase.createMenuItem(data);
  }

  async updateMenuItem(id: string, data: Partial<DbMenuItem>) {
    await this.supabase.updateMenuItem(id, data);
  }

  async deleteMenuItem(id: string) {
    await this.supabase.deleteMenuItem(id);
  }
}
