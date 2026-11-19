import type { z } from "zod";
import type { publicStatusPageIncidentSchema, statusPageIncidentSchema } from "@/domain/status-page-incidents/status-page-incident.schema.js";

export const StatusPageIncidentStyles = ["info", "warning", "danger", "primary", "light", "dark"] as const;
export type StatusPageIncidentStyle = (typeof StatusPageIncidentStyles)[number];

export const STATUS_PAGE_INCIDENT_PAGE_SIZE = 10;
export const STATUS_PAGE_INCIDENT_TITLE_MAX = 255;
export const STATUS_PAGE_INCIDENT_CONTENT_MAX = 10000;

export type StatusPageIncident = z.infer<typeof statusPageIncidentSchema>;
export type PublicStatusPageIncident = z.infer<typeof publicStatusPageIncidentSchema>;

export type StatusPageIncidentPage<T> = {
	incidents: T[];
	total: number;
	nextCursor: string | null;
	hasMore: boolean;
};
