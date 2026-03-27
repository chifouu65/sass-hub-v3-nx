import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class LocationsService {
  constructor(private readonly supabase: SupabaseService) {}

  async getLocation(truckId: string) {
    return this.supabase.getLocation(truckId);
  }

  async upsertLocation(truckId: string, latitude: number, longitude: number, address?: string) {
    await this.supabase.upsertLocation(truckId, latitude, longitude, address);
    return this.supabase.getLocation(truckId);
  }

  async getOpenTrucksWithLocation() {
    return this.supabase.getOpenTrucksWithLocation();
  }
}
