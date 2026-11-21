import {
	STATUS_PAGE_INCIDENT_DAY_LIMIT,
	type StatusPageIncident,
	type StatusPageIncidentPage,
} from "@/domain/status-page-incidents/status-page-incident.type.js";
import { type StatusPageIncidentDocument, StatusPageIncidentModel } from "@/domain/status-page-incidents/status-page-incident.model.js";
import { IStatusPageIncidentsRepository } from "./status-page-incident.repository.interface.js";
import mongoose from "mongoose";
import { AppError } from "@/utils/AppError.js";
import { toStringId, toDateString } from "@/utils/mongoMappers.js";
import { statusPageIncidentErrors } from "@/domain/status-page-incidents/status-page-incident.errors.js";

const SERVICE_NAME = "StatusPageIncidentsRepository";

class MongoStatusPageIncidentsRepository implements IStatusPageIncidentsRepository {
	static SERVICE_NAME = SERVICE_NAME;

	private mapDocuments = (documents: StatusPageIncidentDocument[]): StatusPageIncident[] => {
		if (!documents?.length) {
			return [];
		}
		return documents.map((doc) => this.toEntity(doc));
	};

	private toEntity = (doc: StatusPageIncidentDocument): StatusPageIncident => {
		return {
			id: toStringId(doc._id),
			statusPageId: toStringId(doc.statusPageId),
			teamId: toStringId(doc.teamId),
			title: doc.title,
			content: doc.content,
			style: doc.style,
			pinned: doc.pinned,
			active: doc.active,
			resolvedAt: doc.resolvedAt ? toDateString(doc.resolvedAt) : null,
			createdAt: toDateString(doc.createdAt),
			updatedAt: toDateString(doc.updatedAt),
		};
	};

	create = async (data: Pick<StatusPageIncident, "statusPageId" | "teamId" | "title" | "content" | "style">): Promise<StatusPageIncident> => {
		const incident = new StatusPageIncidentModel({ ...data, pinned: true, active: true });
		const result = await incident.save();
		return this.toEntity(result);
	};

	findById = async (id: string, teamId: string): Promise<StatusPageIncident> => {
		const incident = await StatusPageIncidentModel.findOne({ _id: id, teamId });
		if (!incident) {
			throw new AppError(statusPageIncidentErrors.notFound, { service: SERVICE_NAME });
		}
		return this.toEntity(incident);
	};

	// Newest first. The cursor is the id of the last incident on the previous page, so ties on createdAt are broken by _id.
	findByStatusPageId = async (
		statusPageId: string,
		cursor: string | undefined,
		limit: number
	): Promise<StatusPageIncidentPage<StatusPageIncident>> => {
		const pageId = new mongoose.Types.ObjectId(statusPageId);
		const total = await StatusPageIncidentModel.countDocuments({ statusPageId: pageId });
		const query: Record<string, unknown> = { statusPageId: pageId };

		if (cursor) {
			const after = await StatusPageIncidentModel.findOne({ _id: cursor, statusPageId: pageId }, { createdAt: 1 });
			if (!after) {
				return { incidents: [], total, nextCursor: null, hasMore: false };
			}
			query.$or = [{ createdAt: { $lt: after.createdAt } }, { createdAt: after.createdAt, _id: { $lt: after._id } }];
		}

		const documents = await StatusPageIncidentModel.find(query)
			.sort({ createdAt: -1, _id: -1 })
			.limit(limit + 1);
		const hasMore = documents.length > limit;
		const incidents = this.mapDocuments(documents.slice(0, limit));
		const last = incidents[incidents.length - 1];
		return { incidents, total, nextCursor: hasMore && last ? last.id : null, hasMore };
	};

	findPinnedByStatusPageId = async (statusPageId: string): Promise<StatusPageIncident | null> => {
		const incident = await StatusPageIncidentModel.findOne({ statusPageId, pinned: true, active: true }).sort({ createdAt: -1, _id: -1 });
		return incident ? this.toEntity(incident) : null;
	};

	// Incidents that were active at some point in [start, end]: posted before the end and not resolved before the start.
	// Incidents resolved before resolvedAt existed fall back to updatedAt, which resolving also set.
	findActiveBetween = async (statusPageId: string, start: Date, end: Date): Promise<StatusPageIncident[]> => {
		const documents = await StatusPageIncidentModel.find({
			statusPageId: new mongoose.Types.ObjectId(statusPageId),
			createdAt: { $lte: end },
			$or: [{ active: true }, { resolvedAt: { $gte: start } }, { active: false, resolvedAt: null, updatedAt: { $gte: start } }],
		})
			.sort({ createdAt: -1, _id: -1 })
			.limit(STATUS_PAGE_INCIDENT_DAY_LIMIT);
		return this.mapDocuments(documents);
	};

	updateById = async (
		id: string,
		teamId: string,
		data: Partial<Pick<StatusPageIncident, "title" | "content" | "style" | "pinned" | "active" | "resolvedAt">>
	): Promise<StatusPageIncident> => {
		const updated = await StatusPageIncidentModel.findOneAndUpdate(
			{
				_id: new mongoose.Types.ObjectId(id),
				teamId: new mongoose.Types.ObjectId(teamId),
			},
			{ $set: data },
			{ new: true, runValidators: true }
		);
		if (!updated) {
			throw new AppError(statusPageIncidentErrors.notFound, { service: SERVICE_NAME });
		}
		return this.toEntity(updated);
	};

	unpinByStatusPageId = async (statusPageId: string, teamId: string): Promise<number> => {
		const result = await StatusPageIncidentModel.updateMany(
			{
				statusPageId: new mongoose.Types.ObjectId(statusPageId),
				teamId: new mongoose.Types.ObjectId(teamId),
				pinned: true,
			},
			{ $set: { pinned: false } },
			// Hiding the banner is not an edit, so the incident keeps its "updated" time
			{ timestamps: false }
		);
		return result.modifiedCount;
	};

	deleteById = async (id: string, teamId: string): Promise<StatusPageIncident> => {
		const deleted = await StatusPageIncidentModel.findOneAndDelete({
			_id: new mongoose.Types.ObjectId(id),
			teamId: new mongoose.Types.ObjectId(teamId),
		});
		if (!deleted) {
			throw new AppError(statusPageIncidentErrors.notFound, { service: SERVICE_NAME });
		}
		return this.toEntity(deleted);
	};

	deleteByStatusPageId = async (statusPageId: string, teamId: string): Promise<number> => {
		const result = await StatusPageIncidentModel.deleteMany({
			statusPageId: new mongoose.Types.ObjectId(statusPageId),
			teamId: new mongoose.Types.ObjectId(teamId),
		});
		return result.deletedCount;
	};
}

export default MongoStatusPageIncidentsRepository;
