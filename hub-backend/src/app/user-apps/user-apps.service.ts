import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class UserAppsService {
  constructor(private readonly supabase: SupabaseService) {}

  async getSubscribedIds(userId: string): Promise<string[]> {
    return this.supabase.getSubscribedAppIds(userId);
  }

  async subscribe(userId: string, appId: string): Promise<string[]> {
    await this.supabase.addAppSubscription(userId, appId);
    return this.supabase.getSubscribedAppIds(userId);
  }

  async unsubscribe(userId: string, appId: string): Promise<string[]> {
    await this.supabase.removeAppSubscription(userId, appId);
    return this.supabase.getSubscribedAppIds(userId);
  }

  async isSubscribed(userId: string, appId: string): Promise<boolean> {
    const ids = await this.supabase.getSubscribedAppIds(userId);
    return ids.includes(appId);
  }
}
