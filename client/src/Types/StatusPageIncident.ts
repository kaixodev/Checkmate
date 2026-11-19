// Mirrors server/src/domain/status-page-incidents/status-page-incident.type.ts
export const STATUS_PAGE_INCIDENT_STYLES = [
	"info",
	"warning",
	"danger",
	"primary",
	"light",
	"dark",
] as const;
export type StatusPageIncidentStyle = (typeof STATUS_PAGE_INCIDENT_STYLES)[number];

export const STATUS_PAGE_INCIDENT_TITLE_MAX = 255;
export const STATUS_PAGE_INCIDENT_CONTENT_MAX = 10000;

export interface PublicStatusPageIncident {
	id: string;
	title: string;
	content: string;
	style: StatusPageIncidentStyle;
	pinned: boolean;
	active: boolean;
	createdAt: string;
	updatedAt: string;
}

export interface StatusPageIncident extends PublicStatusPageIncident {
	statusPageId: string;
	teamId: string;
}

interface StatusPageIncidentPageFields {
	total: number;
	nextCursor: string | null;
	hasMore: boolean;
}

export interface StatusPageIncidentPage extends StatusPageIncidentPageFields {
	incidents: StatusPageIncident[];
}

export interface PublicStatusPageIncidentHistory extends StatusPageIncidentPageFields {
	pinned: PublicStatusPageIncident | null;
	incidents: PublicStatusPageIncident[];
}

export interface StatusPageIncidentFormValues {
	title: string;
	content: string;
	style: StatusPageIncidentStyle;
}
