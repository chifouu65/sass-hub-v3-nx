import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';

export interface FollowedTruck {
  id: string;
  name: string;
  cuisineType: string;
  imageUrl?: string;
  rating?: number;
}

@Injectable({ providedIn: 'root' })
export class FollowerService {
  private readonly http = inject(HttpClient);
  private readonly apiBase = '/api';

  getFollowedTrucks() {
    return this.http.get<FollowedTruck[]>(`${this.apiBase}/followers/my`, {
      withCredentials: true,
    });
  }

  followTruck(truckId: string) {
    return this.http.post<void>(`${this.apiBase}/followers/truck/${truckId}`, {}, {
      withCredentials: true,
    });
  }

  unfollowTruck(truckId: string) {
    return this.http.delete<void>(`${this.apiBase}/followers/truck/${truckId}`, {
      withCredentials: true,
    });
  }

  isFollowing(truckId: string) {
    return this.http.get<{ following: boolean }>(
      `${this.apiBase}/followers/truck/${truckId}/status`,
      { withCredentials: true }
    );
  }
}
