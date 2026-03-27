import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class NotificationsService {
  constructor(private readonly supabase: SupabaseService) {}

  async getNotifications(userId: string) {
    return this.supabase.getNotifications(userId);
  }

  async markAsRead(id: string) {
    await this.supabase.markAsRead(id);
  }

  async markAllAsRead(userId: string) {
    await this.supabase.markAllAsRead(userId);
  }
}
