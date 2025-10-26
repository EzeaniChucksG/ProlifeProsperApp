/**
 * Event Storage - Handles event-related database operations
 */
import {
  events,
  eventTables,
  eventRegistrations,
  eventAttendees,
  type Event,
  type InsertEvent,
  type EventTable,
  type InsertEventTable,
  type EventRegistration,
  type InsertEventRegistration,
  type EventAttendee,
  type InsertEventAttendee,
} from "@shared/schema";
import { db } from "../db";
import { eq } from "drizzle-orm";

export class EventStorage {
  // Event methods
  async getEventsByOrganization(organizationId: number): Promise<Event[]> {
    return await db
      .select()
      .from(events)
      .where(eq(events.organizationId, organizationId));
  }

  async getEventById(id: number): Promise<Event | undefined> {
    const [event] = await db.select().from(events).where(eq(events.id, id));
    return event || undefined;
  }

  async createEvent(event: InsertEvent): Promise<Event> {
    const [newEvent] = await db.insert(events).values(event).returning();
    return newEvent;
  }

  async updateEvent(id: number, updates: Partial<Event>): Promise<Event> {
    const [event] = await db
      .update(events)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(events.id, id))
      .returning();
    return event;
  }

  async deleteEvent(id: number): Promise<void> {
    await db.delete(events).where(eq(events.id, id));
  }

  // Event Table methods
  async getEventTables(eventId: number): Promise<EventTable[]> {
    return await db
      .select()
      .from(eventTables)
      .where(eq(eventTables.eventId, eventId));
  }

  async createEventTable(table: InsertEventTable): Promise<EventTable> {
    const [newTable] = await db.insert(eventTables).values(table).returning();
    return newTable;
  }

  async updateEventTable(
    id: number,
    updates: Partial<EventTable>,
  ): Promise<EventTable> {
    const [table] = await db
      .update(eventTables)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(eventTables.id, id))
      .returning();
    return table;
  }

  async deleteEventTable(id: number): Promise<void> {
    await db.delete(eventTables).where(eq(eventTables.id, id));
  }

  // Event Registration methods
  async getEventRegistrations(eventId: number): Promise<EventRegistration[]> {
    return await db
      .select()
      .from(eventRegistrations)
      .where(eq(eventRegistrations.eventId, eventId));
  }

  async createEventRegistration(
    registration: InsertEventRegistration,
  ): Promise<EventRegistration> {
    const [newRegistration] = await db
      .insert(eventRegistrations)
      .values(registration)
      .returning();
    return newRegistration;
  }

  async updateEventRegistration(
    id: number,
    updates: Partial<EventRegistration>,
  ): Promise<EventRegistration> {
    const [registration] = await db
      .update(eventRegistrations)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(eventRegistrations.id, id))
      .returning();
    return registration;
  }

  async deleteEventRegistration(id: number): Promise<void> {
    await db.delete(eventRegistrations).where(eq(eventRegistrations.id, id));
  }

  // Event Attendee methods
  async getEventAttendees(eventId: number): Promise<EventAttendee[]> {
    return await db
      .select()
      .from(eventAttendees)
      .where(eq(eventAttendees.eventId, eventId));
  }

  async createEventAttendee(attendee: InsertEventAttendee): Promise<EventAttendee> {
    const [newAttendee] = await db
      .insert(eventAttendees)
      .values(attendee)
      .returning();
    return newAttendee;
  }

  async updateEventAttendee(
    id: number,
    updates: Partial<EventAttendee>,
  ): Promise<EventAttendee> {
    const [attendee] = await db
      .update(eventAttendees)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(eventAttendees.id, id))
      .returning();
    return attendee;
  }

  async deleteEventAttendee(id: number): Promise<void> {
    await db.delete(eventAttendees).where(eq(eventAttendees.id, id));
  }
}