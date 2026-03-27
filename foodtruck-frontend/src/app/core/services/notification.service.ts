import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { rxResource } from '@angular/core/rxjs-interop';
import { firstValueFrom } from 'rxjs';

export interface Notification {
  id: string;
  userId: string;
  message: string;
  read: boolean;
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly http = inject(HttpClient);
  private readonly apiBase = '/api';

  private readonly refreshTrigger = signal(0);

  readonly notifications = rxResource({
    stream: () => {
      this.refreshTrigger();
      return this.http.get<Notification[]>(`${this.apiBase}/notifications`, {
        withCredentials: true,
      });
    },
  });

  readonly unreadCount = computed(() => {
    const notifs = this.notifications.value();
    return notifs?.filter(n => !n.read).length ?? 0;
  });

  readonly hasNotifications = computed(() => this.unreadCount() > 0);

  async markAsRead(id: string): Promise<void> {
    await firstValueFrom(
      this.http.patch<void>(`${this.apiBase}/notifications/${id}/read`, {}, {
        withCredentials: true,
      })
    );
    this.refresh();
  }

  async markAllAsRead(): Promise<void> {
    await firstValueFrom(
      this.http.patch<void>(`${this.apiBase}/notifications/read-all`, {}, {
        withCredentials: true,
      })
    );
    this.refresh();
  }

  private refresh(): void {
    this.refreshTrigger.update(v => v + 1);
  }
}
