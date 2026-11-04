// src/lib/distance.ts - FINAL V9 - TAMBAH checkOverlap alias + support hook - MRH DigitalHub
// FIX untuk useWorkPermits.ts yang import { checkOverlapWithRadius, checkOverlap }

export const PI = Math.PI;

export function calcM2FromRadius(radiusM: number): number {
  if (!radiusM || radiusM <= 0) return 0;
  return PI * radiusM * radiusM;
}
export function calculateAreaFromRadius(radiusM: number): number {
  return calcM2FromRadius(radiusM);
}
export function calculateAreaByType(radiusM: number, type: string): number {
  const base = calcM2FromRadius(radiusM);
  if (type === 'closed') return base;
  return base * 0.9;
}
export function calcRadiusFromM2(areaM2: number): number {
  if (!areaM2 || areaM2 <= 0) return 0;
  return Math.sqrt(areaM2 / PI);
}
export function calculateRadiusFromM2(areaM2: number): number {
  return calcRadiusFromM2(areaM2);
}

export function distanceM(lat1: number, lng1: number, lat2: number, lng2: number): number {
  if (lat1 == null || lng1 == null || lat2 == null || lng2 == null) return 0;
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI/180) * Math.cos(lat2 * Math.PI/180) *
            Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}
export function getDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  return distanceM(lat1, lng1, lat2, lng2);
}

export function totalRadiusM(r1: number, r2: number): number {
  return (r1 || 0) + (r2 || 0);
}
export function overlapM(dist: number, r1: number, r2: number): number {
  const total = totalRadiusM(r1, r2);
  if (dist >= total) return 0;
  return total - dist;
}
export function isOverlap(dist: number, r1: number, r2: number, buffer: number = 0): boolean {
  return dist < (totalRadiusM(r1, r2) + buffer);
}

function extractLatLngR(obj: any): { lat: number; lng: number; r: number } {
  if (!obj) return { lat: 0, lng: 0, r: 0 };
  const lat = obj.lat ?? obj.latitude ?? obj.lat1 ?? obj.y ?? 0;
  const lng = obj.lng ?? obj.longitude ?? obj.lng1 ?? obj.lon ?? obj.x ?? 0;
  let r = obj.radius ?? obj.radius_m ?? obj.radiusM ?? obj.r ?? obj.r1 ?? obj.work_radius_m ?? 0;
  if (!r && obj.area_m2) r = calcRadiusFromM2(obj.area_m2);
  if (!r && obj.area && obj.area.area_m2) r = calcRadiusFromM2(obj.area.area_m2);
  return { lat: Number(lat), lng: Number(lng), r: Number(r) };
}

export function checkOverlapWithRadius(...args: any[]): any {
  if (args.length === 2) {
    let a = args[0];
    let b = args[1];
    if (a && a.area_a && a.area_b) { b = a.area_b; a = a.area_a; }
    if (a && a.permit_a && a.permit_b) { b = a.permit_b?.area || a.permit_b; a = a.permit_a?.area || a.permit_a; }
    if (a && a.area) a = a.area;
    if (b && b.area) b = b.area;
    const A = extractLatLngR(a);
    const B = extractLatLngR(b);
    const dist = distanceM(A.lat, A.lng, B.lat, B.lng);
    const total = totalRadiusM(A.r, B.r);
    const overlap = overlapM(dist, A.r, B.r);
    const overlapBool = isOverlap(dist, A.r, B.r);
    return { distanceM: dist, distance: dist, totalRadiusM: total, totalRadius: total, overlapM: overlap, overlap: overlap, isOverlap: overlapBool, isOverlapping: overlapBool };
  }
  if (args.length === 6) {
    const [lat1, lng1, r1, lat2, lng2, r2] = args;
    const dist = distanceM(lat1, lng1, lat2, lng2);
    const total = totalRadiusM(r1, r2);
    const overlap = overlapM(dist, r1, r2);
    const overlapBool = isOverlap(dist, r1, r2);
    return { distanceM: dist, distance: dist, totalRadiusM: total, totalRadius: total, overlapM: overlap, overlap: overlap, isOverlap: overlapBool, isOverlapping: overlapBool };
  }
  if (args.length >= 3) {
    const [dist, r1, r2, buffer] = args;
    const total = totalRadiusM(r1, r2);
    const overlap = overlapM(dist, r1, r2);
    const overlapBool = isOverlap(dist, r1, r2, buffer || 0);
    return { distanceM: dist, distance: dist, totalRadiusM: total, totalRadius: total, overlapM: overlap, overlap: overlap, isOverlap: overlapBool, isOverlapping: overlapBool };
  }
  return { distanceM: 0, totalRadiusM: 0, overlapM: 0, isOverlap: false };
}

// ALIAS untuk file Bapak yang import { checkOverlap }
export function checkOverlap(...args: any[]): any {
  return checkOverlapWithRadius(...args);
}

function arrayToCSV(data: any[]): string {
  if (!data || data.length === 0) return "";
  const headers = Object.keys(data[0]);
  const rows = data.map(obj => 
    headers.map(h => {
      let val = obj[h];
      if (val === null || val === undefined) val = "";
      let str = String(val);
      if (str.includes(",") || str.includes('"') || str.includes("\n")) {
        str = '"' + str.replace(/"/g, '""') + '"';
      }
      return str;
    }).join(",")
  );
  return [headers.join(","), ...rows].join("\n");
}

export function downloadText(filename: string, data: any) {
  let text: string;
  if (Array.isArray(data)) {
    text = arrayToCSV(data);
  } else if (typeof data === 'object' && data !== null) {
    text = arrayToCSV([data]);
  } else {
    text = String(data ?? "");
  }
  const blob = new Blob([text], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function downloadCSV(filename: string, data: any) {
  return downloadText(filename, data);
}

export function formatAreaM2(area: number): string {
  return `${area.toFixed(2)} M2`;
}
export function getApprovalLevel(areaM2: number): number {
  if (areaM2 > 2500) return 4;
  if (areaM2 > 1500) return 3;
  if (areaM2 > 800) return 2;
  return 1;
}
