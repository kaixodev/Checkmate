import { z } from "zod";
import {
	STATUS_PAGE_INCIDENT_CONTENT_MAX,
	STATUS_PAGE_INCIDENT_TITLE_MAX,
	StatusPageIncidentStyles,
} from "@/domain/status-page-incidents/status-page-incident.type.js";
import { publicStatusPageIncidentSchema, statusPageIncidentSchema } from "@/domain/status-page-incidents/status-page-incident.schema.js";

//****************************************
// Status Page Incident Validations
//****************************************

const objectIdValidation = (label: string) => z.string().regex(/^[0-9a-fA-F]{24}$/, `Must be a valid ${label}`);

const titleValidation = z.string().trim().min(1, "Title is required").max(STATUS_PAGE_INCIDENT_TITLE_MAX);
const contentValidation = z.string().trim().min(1, "Content is required").max(STATUS_PAGE_INCIDENT_CONTENT_MAX);

export const statusPageIncidentStatusPageIdParamValidation = z.object({
	statusPageId: objectIdValidation("status page ID"),
});

export const statusPageIncidentIdParamValidation = z.object({
	id: objectIdValidation("incident ID"),
});

export const statusPageIncidentCursorQueryValidation = z.object({
	cursor: objectIdValidation("cursor").optional(),
});

export const publicStatusPageIncidentParamValidation = z.object({
	url: z.string().min(1, "URL is required"),
});

export const publicStatusPageIncidentDayQueryValidation = z.object({
	date: z.string().date("Date must be a valid calendar date in YYYY-MM-DD format"),
});

export const createStatusPageIncidentBodyValidation = z
	.object({
		title: titleValidation,
		content: contentValidation,
		style: z.enum(StatusPageIncidentStyles).default("warning"),
	})
	.strict();

export const editStatusPageIncidentBodyValidation = z
	.object({
		title: titleValidation.optional(),
		content: contentValidation.optional(),
		style: z.enum(StatusPageIncidentStyles).optional(),
		pinned: z.boolean().optional(),
	})
	.strict();

const pageShape = {
	total: z.number().meta({ example: 12 }),
	nextCursor: z.string().nullable().meta({ example: "65f1c2a4d8b9e0123456789d" }),
	hasMore: z.boolean().meta({ example: true }),
};

export const statusPageIncidentPageResponseSchema = z.object({
	incidents: z.array(statusPageIncidentSchema),
	...pageShape,
});

export const publicStatusPageIncidentHistoryResponseSchema = z.object({
	pinned: publicStatusPageIncidentSchema.nullable(),
	incidents: z.array(publicStatusPageIncidentSchema),
	...pageShape,
});

export const publicStatusPageIncidentDayResponseSchema = z.object({
	incidents: z.array(publicStatusPageIncidentSchema),
});

export const unpinStatusPageIncidentsResponseSchema = z.object({
	unpinned: z.number().meta({ example: 1 }),
});
