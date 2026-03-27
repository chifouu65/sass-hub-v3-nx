import { Injectable } from '@nestjs/common';
import { SupabaseService, DbTruck } from '../supabase/supabase.service';
import { TruckResponseDto } from './truck-response.dto';

@Injectable()
export class TrucksService {
  constructor(private readonly supabase: SupabaseService) {}

  /**
   * Map DbTruck (snake_case from DB) → TruckResponseDto (camelCase for API)
   */
  private mapTruckToResponse(dbTruck: DbTruck): TruckResponseDto {
    return {
      id: dbTruck.id,
      name: dbTruck.name,
      cuisineType: dbTruck.cuisine_type,
      description: dbTruck.description,
      imageUrl: dbTruck.logo_url || dbTruck.cover_url || null,
      phone: dbTruck.phone,
      isOpen: dbTruck.is_open,
      owner_id: dbTruck.owner_id,
      createdAt: dbTruck.created_at,
      updatedAt: dbTruck.updated_at,
    };
  }

  private async mapTrucksWithLocation(trucks: import('../supabase/supabase.service').DbTruck[]): Promise<TruckResponseDto[]> {
    const result: TruckResponseDto[] = [];
    for (const t of trucks) {
      const dto = this.mapTruckToResponse(t);
      const loc = await this.supabase.getLocation(t.id);
      if (loc) {
        dto.latitude = loc.latitude;
        dto.longitude = loc.longitude;
        dto.address = loc.address ?? undefined;
      }
      result.push(dto);
    }
    return result;
  }

  async findAll(): Promise<TruckResponseDto[]> {
    const trucks = await this.supabase.findAll();
    return this.mapTrucksWithLocation(trucks);
  }

  async findAllOpen(): Promise<TruckResponseDto[]> {
    const trucks = await this.supabase.findAllOpen();
    return this.mapTrucksWithLocation(trucks);
  }

  async findByOwner(ownerId: string): Promise<TruckResponseDto[]> {
    const trucks = await this.supabase.findByOwner(ownerId);
    return trucks.map(t => this.mapTruckToResponse(t));
  }

  async findById(id: string): Promise<TruckResponseDto | null> {
    const truck = await this.supabase.findById(id);
    return truck ? this.mapTruckToResponse(truck) : null;
  }

  async createTruck(ownerId: string, data: Partial<DbTruck>): Promise<TruckResponseDto> {
    const truck = await this.supabase.createTruck(ownerId, data);
    return this.mapTruckToResponse(truck);
  }

  async updateTruck(id: string, data: Partial<DbTruck>): Promise<TruckResponseDto> {
    await this.supabase.updateTruck(id, data);
    const truck = await this.supabase.findById(id);
    if (!truck) throw new Error(`Truck ${id} not found after update`);
    return this.mapTruckToResponse(truck);
  }

  async toggleOpen(id: string, isOpen: boolean): Promise<void> {
    await this.supabase.setOpen(id, isOpen);
    if (isOpen) {
      const truck = await this.supabase.findById(id);
      if (truck) {
        await this.supabase.notifyFollowers(id, 'truck_opened', `${truck.name} is now open!`);
      }
    }
  }
}
