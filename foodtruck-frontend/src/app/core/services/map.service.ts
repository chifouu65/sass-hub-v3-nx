import { Injectable } from '@angular/core';

declare const L: any;

export interface MapMarker {
  id: string;
  lat: number;
  lng: number;
  label: string;
  isOpen?: boolean;
  popup?: string;
}

@Injectable({ providedIn: 'root' })
export class MapService {
  private maps = new Map<string, any>();

  /** Initialise une carte Leaflet dans l'élément DOM donné */
  initMap(containerId: string, center: [number, number] = [48.8566, 2.3522], zoom = 12): any {
    if (this.maps.has(containerId)) {
      this.maps.get(containerId).remove();
    }
    const map = L.map(containerId, { zoomControl: true }).setView(center, zoom);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);
    this.maps.set(containerId, map);
    return map;
  }

  /** Retourne la carte stockée */
  getMap(containerId: string): any {
    return this.maps.get(containerId) ?? null;
  }

  /** Supprime la carte et libère la mémoire */
  destroyMap(containerId: string): void {
    const map = this.maps.get(containerId);
    if (map) { map.remove(); this.maps.delete(containerId); }
  }

  /** Crée un marker coloré selon le statut ouvert/fermé */
  createTruckMarker(map: any, marker: MapMarker): any {
    const color = marker.isOpen ? '#22c55e' : '#9ca3af';
    const icon = L.divIcon({
      className: '',
      html: `
        <div style="
          background:${color};
          width:36px;height:36px;
          border-radius:50% 50% 50% 0;
          transform:rotate(-45deg);
          border:3px solid #fff;
          box-shadow:0 2px 8px rgba(0,0,0,0.4);
          display:flex;align-items:center;justify-content:center;
        ">
          <span style="transform:rotate(45deg);font-size:16px;">🚚</span>
        </div>`,
      iconSize: [36, 36],
      iconAnchor: [18, 36],
      popupAnchor: [0, -38],
    });
    const m = L.marker([marker.lat, marker.lng], { icon }).addTo(map);
    if (marker.popup) {
      m.bindPopup(marker.popup);
    }
    return m;
  }

  /** Marker de position courante (bleu) */
  createLocationMarker(map: any, lat: number, lng: number, draggable = false): any {
    const icon = L.divIcon({
      className: '',
      html: `<div style="
        background:#3b82f6;
        width:18px;height:18px;
        border-radius:50%;
        border:3px solid #fff;
        box-shadow:0 0 0 3px rgba(59,130,246,0.3),0 2px 8px rgba(0,0,0,0.4);
      "></div>`,
      iconSize: [18, 18],
      iconAnchor: [9, 9],
    });
    return L.marker([lat, lng], { icon, draggable }).addTo(map);
  }

  /** Géocodage inverse Nominatim (OpenStreetMap, gratuit) */
  async reverseGeocode(lat: number, lng: number): Promise<string | null> {
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=fr`;
      const res = await fetch(url, { headers: { 'User-Agent': 'MyFoodTruck/1.0' } });
      if (!res.ok) return null;
      const data = await res.json();
      return data.display_name ?? null;
    } catch {
      return null;
    }
  }

  /** Geocodage (adresse → lat/lng) via Nominatim */
  async geocode(address: string): Promise<{ lat: number; lng: number } | null> {
    try {
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1&accept-language=fr`;
      const res = await fetch(url, { headers: { 'User-Agent': 'MyFoodTruck/1.0' } });
      if (!res.ok) return null;
      const data = await res.json();
      if (!data[0]) return null;
      return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
    } catch {
      return null;
    }
  }
}
