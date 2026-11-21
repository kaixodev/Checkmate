import { Schema, model, type Types } from "mongoose";
import {
	STATUS_PAGE_INCIDENT_CONTENT_MAX,
	STATUS_PAGE_INCIDENT_TITLE_MAX,
	StatusPageIncidentStyles,
	type StatusPageIncident,
} from "@/domain/status-page-incidents/status-page-incident.type.js";

type StatusPageIncidentDocumentBase = Omit<StatusPageIncident, "id" | "statusPageId" | "teamId" | "resolvedAt" | "createdAt" | "updatedAt"> & {
	resolvedAt?: Date | null;
	statusPageId: Types.ObjectId;
	teamId: Types.ObjectId;
	createdAt: Date;
	updatedAt: Date;
};

interface StatusPageIncidentDocument extends StatusPageIncidentDocumentBase {
	_id: Types.ObjectId;
}

const StatusPageIncidentSchema = new Schema<StatusPageIncidentDocument>(
	{
		statusPageId: {
			type: Schema.Types.ObjectId,
			ref: "StatusPage",
			required: true,
			immutable: true,
		},
		teamId: {
			type: Schema.Types.ObjectId,
			ref: "Team",
			required: true,
			immutable: true,
		},
		title: {
			type: String,
			required: true,
			trim: true,
			maxlength: STATUS_PAGE_INCIDENT_TITLE_MAX,
		},
		content: {
			type: String,
			required: true,
			maxlength: STATUS_PAGE_INCIDENT_CONTENT_MAX,
		},
		style: {
			type: String,
			enum: StatusPageIncidentStyles,
			default: "warning",
		},
		pinned: {
			type: Boolean,
			default: true,
		},
		active: {
			type: Boolean,
			default: true,
		},
		resolvedAt: {
			type: Date,
			default: null,
		},
	},
	{
		timestamps: true,
	}
);

// Newest-first history per page, and the pinned-banner lookup
StatusPageIncidentSchema.index({ statusPageId: 1, createdAt: -1, _id: -1 });
StatusPageIncidentSchema.index({ statusPageId: 1, pinned: 1, active: 1 });

const StatusPageIncidentModel = model<StatusPageIncidentDocument>("StatusPageIncident", StatusPageIncidentSchema);

export type { StatusPageIncidentDocument };
export { StatusPageIncidentModel };
export default StatusPageIncidentModel;
