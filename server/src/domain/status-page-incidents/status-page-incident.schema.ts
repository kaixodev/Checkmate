import { z } from "zod";
import { StatusPageIncidentStyles } from "./status-page-incident.type.js";

export const statusPageIncidentSchema = z
	.object({
		id: z.string().meta({ example: "65f1c2a4d8b9e0123456789d" }),
		statusPageId: z.string().meta({ example: "65f1c2a4d8b9e0123456789b" }),
		teamId: z.string().meta({ example: "65f1c2a4d8b9e01234567890" }),
		title: z.string().meta({ example: "Scheduled database upgrade" }),
		content: z.string().meta({ example: "We are upgrading the database. Expect brief interruptions.", description: "Markdown" }),
		style: z.enum(StatusPageIncidentStyles).meta({ example: "warning" }),
		pinned: z.boolean().meta({ example: true, description: "Shown as the banner at the top of the status page" }),
		active: z.boolean().meta({ example: true, description: "false once the incident is resolved" }),
		createdAt: z.string().meta({ example: "2026-04-15T03:21:00.000Z" }),
		updatedAt: z.string().meta({ example: "2026-04-15T03:34:00.000Z" }),
	})
	.meta({ id: "StatusPageIncident" });

export const publicStatusPageIncidentSchema = statusPageIncidentSchema
	.pick({
		id: true,
		title: true,
		content: true,
		style: true,
		pinned: true,
		active: true,
		createdAt: true,
		updatedAt: true,
	})
	.meta({ id: "PublicStatusPageIncident" });
