import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { rxResource } from '@angular/core/rxjs-interop';

export interface Truck {
  id: string;
  name: string;
  cuisineType: string | null;
  description?: string | null;
  isOpen: boolean;
  latitude?: number | null;
  longitude?: number | null;
  address?: string | null;
  imageUrl?: string | null;
  phone?: string | null;
  rating?: number | null;
}

@Injectable({ providedIn: 'root' })
export class TruckService {
  private readonly http = inject(HttpClient);
  private readonly apiBase = '/api';

  readonly trucks = rxResource({
    stream: () => this.http.get<Truck[]>(`${this.apiBase}/trucks/public/all`, { withCredentials: true }),
  });

  getTruck(id: string) {
    return this.http.get<Truck>(`${this.apiBase}/trucks/${id}`, { withCredentials: true });
  }

  getMyTruck() {
    return this.http.get<Truck>(`${this.apiBase}/trucks?myTruck=true`, { withCredentials: true });
  }

  createTruck(data: Partial<Truck>) {
    return this.http.post<Truck>(`${this.apiBase}/trucks`, data, { withCredentials: true });
  }

  updateTruck(id: string, data: Partial<Truck>) {
    return this.http.patch<Truck>(`${this.apiBase}/trucks/${id}`, data, { withCredentials: true });
  }

  toggleOpen(id: string, isOpen: boolean) {
    return this.http.patch<Truck>(`${this.apiBase}/trucks/${id}/toggle-open`, { isOpen }, { withCredentials: true });
  }
}
