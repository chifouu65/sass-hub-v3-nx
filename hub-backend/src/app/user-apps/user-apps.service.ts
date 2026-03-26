import { Injectable } from '@nestjs/common';

@Injectable()
export class UserAppsService {
  /** In-memory: userId → Set<appId>. À remplacer par une DB en production. */
  private readonly subscriptions = new Map<string, Set<string>>();

  getSubscribedIds(userId: string): string[] {
    return [...(this.subscriptions.get(userId) ?? [])];
  }

  subscribe(userId: string, appId: string): string[] {
    if (!this.subscriptions.has(userId)) this.subscriptions.set(userId, new Set());
    this.subscriptions.get(userId)!.add(appId);
    return this.getSubscribedIds(userId);
  }

  unsubscribe(userId: string, appId: string): string[] {
    this.subscriptions.get(userId)?.delete(appId);
    return this.getSubscribedIds(userId);
  }

  isSubscribed(userId: string, appId: string): boolean {
    return this.subscriptions.get(userId)?.has(appId) ?? false;
  }
}
