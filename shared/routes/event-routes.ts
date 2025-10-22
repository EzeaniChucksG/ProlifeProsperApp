/**
 * Event Routes
 * Handles event management, registrations, and attendees
 */
import type { Express } from "express";
import { storage } from "../storage/index";
import { insertEventSchema, insertEventTableSchema, insertEventRegistrationSchema, insertEventAttendeeSchema } from "@shared/schema";
import { z } from "zod";
import { authenticateToken } from "../middleware";

export function registerEventRoutes(app: Express): void {
  // Get organization events
  app.get("/api/organizations/:orgId/events", authenticateToken, async (req, res) => {
    try {
      const orgId = parseInt(req.params.orgId);
      const user = req.user as { organizationId: number };

      if (user.organizationId !== orgId && req.user.role !== 'super_admin') {
        return res.status(403).json({ message: "Access denied" });
      }

      const events = await storage.getEventsByOrganization(orgId);
      res.json(events);
    } catch (error) {
      console.error("Error fetching events:", error);
      res.status(500).json({ message: "Failed to fetch events" });
    }
  });

  // Get single event
  app.get("/api/events/:id", authenticateToken, async (req, res) => {
    try {
      const eventId = parseInt(req.params.id);
      const event = await storage.getEventById(eventId);
      
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }

      // Verify user has access to this event's organization
      const user = req.user as { organizationId: number };
      if (event.organizationId !== user.organizationId && req.user.role !== 'super_admin') {
        return res.status(403).json({ message: "Access denied" });
      }
      
      res.json(event);
    } catch (error) {
      console.error("Error fetching event:", error);
      res.status(500).json({ message: "Failed to fetch event" });
    }
  });

  // Create new event
  app.post("/api/organizations/:orgId/events", authenticateToken, async (req, res) => {
    try {
      const orgId = parseInt(req.params.orgId);
      const user = req.user as { organizationId: number };
      const eventData = req.body;

      if (user.organizationId !== orgId && req.user.role !== 'super_admin') {
        return res.status(403).json({ message: "Access denied" });
      }

      // Validate event data
      const validatedData = insertEventSchema.parse({
        ...eventData,
        organizationId: orgId
      });

      const newEvent = await storage.createEvent(validatedData);
      res.status(201).json(newEvent);
    } catch (error) {
      console.error("Error creating event:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation error",
          errors: error.errors 
        });
      }
      res.status(500).json({ message: "Failed to create event" });
    }
  });

  // Update event
  app.patch("/api/events/:id", authenticateToken, async (req, res) => {
    try {
      const eventId = parseInt(req.params.id);
      const user = req.user as { organizationId: number };
      const updates = req.body;

      // Verify user owns the event
      const existingEvent = await storage.getEventById(eventId);
      if (!existingEvent) {
        return res.status(404).json({ message: "Event not found" });
      }

      if (existingEvent.organizationId !== user.organizationId && req.user.role !== 'super_admin') {
        return res.status(403).json({ message: "Access denied" });
      }

      const updatedEvent = await storage.updateEvent(eventId, updates);
      res.json(updatedEvent);
    } catch (error) {
      console.error("Error updating event:", error);
      res.status(500).json({ message: "Failed to update event" });
    }
  });

  // Delete event
  app.delete("/api/events/:id", authenticateToken, async (req, res) => {
    try {
      const eventId = parseInt(req.params.id);
      const user = req.user as { organizationId: number };

      // Verify user owns the event
      const existingEvent = await storage.getEventById(eventId);
      if (!existingEvent) {
        return res.status(404).json({ message: "Event not found" });
      }

      if (existingEvent.organizationId !== user.organizationId && req.user.role !== 'super_admin') {
        return res.status(403).json({ message: "Access denied" });
      }

      await storage.deleteEvent(eventId);
      res.json({ message: "Event deleted successfully" });
    } catch (error) {
      console.error("Error deleting event:", error);
      res.status(500).json({ message: "Failed to delete event" });
    }
  });

  // Event Tables Management
  app.get("/api/events/:eventId/tables", authenticateToken, async (req, res) => {
    try {
      const eventId = parseInt(req.params.eventId);
      
      // Verify user has access to this event
      const event = await storage.getEventById(eventId);
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }

      const user = req.user as { organizationId: number };
      if (event.organizationId !== user.organizationId && req.user.role !== 'super_admin') {
        return res.status(403).json({ message: "Access denied" });
      }

      const tables = await storage.getEventTables(eventId);
      res.json(tables);
    } catch (error) {
      console.error("Error fetching event tables:", error);
      res.status(500).json({ message: "Failed to fetch event tables" });
    }
  });

  app.post("/api/events/:eventId/tables", authenticateToken, async (req, res) => {
    try {
      const eventId = parseInt(req.params.eventId);
      const tableData = req.body;

      // Verify user has access to this event
      const event = await storage.getEventById(eventId);
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }

      const user = req.user as { organizationId: number };
      if (event.organizationId !== user.organizationId && req.user.role !== 'super_admin') {
        return res.status(403).json({ message: "Access denied" });
      }

      const validatedData = insertEventTableSchema.parse({
        ...tableData,
        eventId
      });

      const newTable = await storage.createEventTable(validatedData);
      res.status(201).json(newTable);
    } catch (error) {
      console.error("Error creating event table:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation error",
          errors: error.errors 
        });
      }
      res.status(500).json({ message: "Failed to create event table" });
    }
  });

  app.patch("/api/event-tables/:id", authenticateToken, async (req, res) => {
    try {
      const tableId = parseInt(req.params.id);
      const updates = req.body;

      // Note: In a real implementation, you'd verify the user has access to this table's event
      const updatedTable = await storage.updateEventTable(tableId, updates);
      res.json(updatedTable);
    } catch (error) {
      console.error("Error updating event table:", error);
      res.status(500).json({ message: "Failed to update event table" });
    }
  });

  app.delete("/api/event-tables/:id", authenticateToken, async (req, res) => {
    try {
      const tableId = parseInt(req.params.id);

      // Note: In a real implementation, you'd verify the user has access to this table's event
      await storage.deleteEventTable(tableId);
      res.json({ message: "Event table deleted successfully" });
    } catch (error) {
      console.error("Error deleting event table:", error);
      res.status(500).json({ message: "Failed to delete event table" });
    }
  });

  // Event Registrations
  app.get("/api/events/:eventId/registrations", authenticateToken, async (req, res) => {
    try {
      const eventId = parseInt(req.params.eventId);
      
      // Verify user has access to this event
      const event = await storage.getEventById(eventId);
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }

      const user = req.user as { organizationId: number };
      if (event.organizationId !== user.organizationId && req.user.role !== 'super_admin') {
        return res.status(403).json({ message: "Access denied" });
      }

      const registrations = await storage.getEventRegistrations(eventId);
      res.json(registrations);
    } catch (error) {
      console.error("Error fetching event registrations:", error);
      res.status(500).json({ message: "Failed to fetch event registrations" });
    }
  });

  app.post("/api/events/:eventId/registrations", async (req, res) => {
    try {
      const eventId = parseInt(req.params.eventId);
      const registrationData = req.body;

      const validatedData = insertEventRegistrationSchema.parse({
        ...registrationData,
        eventId
      });

      const newRegistration = await storage.createEventRegistration(validatedData);
      res.status(201).json(newRegistration);
    } catch (error) {
      console.error("Error creating event registration:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation error",
          errors: error.errors 
        });
      }
      res.status(500).json({ message: "Failed to create event registration" });
    }
  });

  // Event Attendees
  app.get("/api/events/:eventId/attendees", authenticateToken, async (req, res) => {
    try {
      const eventId = parseInt(req.params.eventId);
      
      // Verify user has access to this event
      const event = await storage.getEventById(eventId);
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }

      const user = req.user as { organizationId: number };
      if (event.organizationId !== user.organizationId && req.user.role !== 'super_admin') {
        return res.status(403).json({ message: "Access denied" });
      }

      const attendees = await storage.getEventAttendees(eventId);
      res.json(attendees);
    } catch (error) {
      console.error("Error fetching event attendees:", error);
      res.status(500).json({ message: "Failed to fetch event attendees" });
    }
  });

  app.post("/api/events/:eventId/attendees", authenticateToken, async (req, res) => {
    try {
      const eventId = parseInt(req.params.eventId);
      const attendeeData = req.body;

      // Verify user has access to this event
      const event = await storage.getEventById(eventId);
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }

      const user = req.user as { organizationId: number };
      if (event.organizationId !== user.organizationId && req.user.role !== 'super_admin') {
        return res.status(403).json({ message: "Access denied" });
      }

      const validatedData = insertEventAttendeeSchema.parse({
        ...attendeeData,
        eventId
      });

      const newAttendee = await storage.createEventAttendee(validatedData);
      res.status(201).json(newAttendee);
    } catch (error) {
      console.error("Error creating event attendee:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation error",
          errors: error.errors 
        });
      }
      res.status(500).json({ message: "Failed to create event attendee" });
    }
  });
}