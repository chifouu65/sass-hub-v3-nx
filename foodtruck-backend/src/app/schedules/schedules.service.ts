import { Injectable } from '@nestjs/common';
import { SupabaseService, DbSchedule } from '../supabase/supabase.service';

@Injectable()
export class SchedulesService {
  constructor(private readonly supabase: SupabaseService) {}

  async getSchedules(truckId: string) {
    return this.supabase.getSchedules(truckId);
  }

  async upsertSchedule(truckId: string, data: Partial<DbSchedule>) {
    return this.supabase.upsertSchedule(truckId, data);
  }

  async deleteSchedule(id: string) {
    return this.supabase.deleteSchedule(id);
  }
}
