import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';

export interface MenuItem {
  id: string;
  name: string;
  description?: string;
  price: number;
  categoryId: string;
  imageUrl?: string;
  available: boolean;
}

export interface MenuCategory {
  id: string;
  name: string;
  position: number;
  items: MenuItem[]; // populated by backend grouping
}

export interface Menu {
  truckId: string;
  categories: MenuCategory[];
}

@Injectable({ providedIn: 'root' })
export class MenuService {
  private readonly http = inject(HttpClient);
  private readonly apiBase = '/api';

  getMenu(truckId: string) {
    return this.http.get<Menu>(`${this.apiBase}/menu/truck/${truckId}`, {
      withCredentials: true,
    });
  }

  createCategory(truckId: string, name: string, position?: number) {
    return this.http.post<MenuCategory>(`${this.apiBase}/menu/truck/${truckId}/categories`,
      { name, position },
      { withCredentials: true }
    );
  }

  updateCategory(id: string, data: Partial<MenuCategory>) {
    return this.http.patch<MenuCategory>(`${this.apiBase}/menu/categories/${id}`, data, {
      withCredentials: true,
    });
  }

  deleteCategory(id: string) {
    return this.http.delete<void>(`${this.apiBase}/menu/categories/${id}`, {
      withCredentials: true,
    });
  }

  createItem(truckId: string, data: Partial<MenuItem>) {
    return this.http.post<MenuItem>(`${this.apiBase}/menu/truck/${truckId}/items`, data, {
      withCredentials: true,
    });
  }

  updateItem(id: string, data: Partial<MenuItem>) {
    return this.http.patch<MenuItem>(`${this.apiBase}/menu/items/${id}`, data, {
      withCredentials: true,
    });
  }

  deleteItem(id: string) {
    return this.http.delete<void>(`${this.apiBase}/menu/items/${id}`, {
      withCredentials: true,
    });
  }
}
