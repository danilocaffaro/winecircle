import type { Club, TastingEvent } from '../types';

const CLUBS_KEY = 'winecircle_clubs';
const EVENTS_KEY = 'winecircle_events';

export function getClubs(): Club[] {
  const data = localStorage.getItem(CLUBS_KEY);
  return data ? JSON.parse(data) : [];
}

export function saveClubs(clubs: Club[]): void {
  localStorage.setItem(CLUBS_KEY, JSON.stringify(clubs));
}

export function getClub(id: string): Club | undefined {
  return getClubs().find(c => c.id === id);
}

export function saveClub(club: Club): void {
  const clubs = getClubs();
  const idx = clubs.findIndex(c => c.id === club.id);
  if (idx >= 0) clubs[idx] = club;
  else clubs.push(club);
  saveClubs(clubs);
}

export function deleteClub(id: string): void {
  saveClubs(getClubs().filter(c => c.id !== id));
}

export function getEvents(): TastingEvent[] {
  const data = localStorage.getItem(EVENTS_KEY);
  return data ? JSON.parse(data) : [];
}

export function saveEvents(events: TastingEvent[]): void {
  localStorage.setItem(EVENTS_KEY, JSON.stringify(events));
}

export function getEvent(id: string): TastingEvent | undefined {
  return getEvents().find(e => e.id === id);
}

export function saveEvent(event: TastingEvent): void {
  const events = getEvents();
  const idx = events.findIndex(e => e.id === event.id);
  if (idx >= 0) events[idx] = event;
  else events.push(event);
  saveEvents(events);
}

export function getEventsByClub(clubId: string): TastingEvent[] {
  return getEvents().filter(e => e.clubId === clubId);
}
