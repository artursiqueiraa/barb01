export interface TimeRange {
  startAt: Date;
  endAt: Date;
}

/**
 * Conflito real de intervalo: início e fim se sobrepõem, mesmo que
 * parcialmente. Horários apenas encostados (fim de um == início do outro)
 * não são conflito. Não depender só de um índice único de `startAt` — isso
 * não pegaria uma sobreposição parcial (ex.: existente 15:00–15:30, novo
 * 15:15–15:45).
 */
export function hasOverlap(a: TimeRange, b: TimeRange): boolean {
  return a.startAt < b.endAt && a.endAt > b.startAt;
}
