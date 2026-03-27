/**
 * DTO de réponse pour le Truck API
 * Convertit DbTruck (snake_case) → Truck (camelCase) pour le frontend
 */
export interface TruckResponseDto {
  id: string;
  name: string;
  cuisineType: string | null;
  description: string | null;
  imageUrl: string | null; // Maps from logo_url ou cover_url
  phone: string | null;
  isOpen: boolean;
  owner_id?: string; // For internal use (authorization checks)
  latitude?: number;
  longitude?: number;
  address?: string;
  rating?: number;
  createdAt: string;
  updatedAt: string;
}
