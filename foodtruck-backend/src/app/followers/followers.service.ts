import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class FollowersService {
  constructor(private readonly supabase: SupabaseService) {}

  async getFollowedTrucks(customerId: string) {
    return this.supabase.getFollowedTrucks(customerId);
  }

  async followTruck(truckId: string, customerId: string) {
    await this.supabase.followTruck(truckId, customerId);
  }

  async unfollowTruck(truckId: string, customerId: string) {
    await this.supabase.unfollowTruck(truckId, customerId);
  }

  async isFollowing(truckId: string, customerId: string) {
    return this.supabase.isFollowing(truckId, customerId);
  }
}
