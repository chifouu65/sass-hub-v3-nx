import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';

export interface TruckLocation {
  id?: string;
  truck_id?: string;
  latitude: number;
  longitude: number;
  address?: string;
  updated_at?: string;
}

@Injectable({ providedIn: 'root' })
export class LocationService {
  private readonly http = inject(HttpClient);
  private readonly apiBase = '/api';

  getLocation(truckId: string) {
    return this.http.get<TruckLocation>(`${this.apiBase}/locations/truck/${truckId}`, {
      withCredentials: true,
    });
  }

  upsertLocation(truckId: string, data: { latitude: number; longitude: number; address?: string }) {
    return this.http.post<TruckLocation>(`${this.apiBase}/locations/truck/${truckId}`, data, {
      withCredentials: true,
    });
  }
}
