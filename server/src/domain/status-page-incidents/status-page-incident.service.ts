import type { IStatusPageIncidentsRepository } from "@/domain/status-page-incidents/status-page-incident.repository.interface.js";
import type { IStatusPagesRepository } from "@/domain/status-pages/status-page-repository.interface.js";
import {
	STATUS_PAGE_INCIDENT_PAGE_SIZE,
	type PublicStatusPageIncident,
	type StatusPageIncident,
	type StatusPageIncidentPage,
	type StatusPageIncidentStyle,
} from "@/domain/status-page-incidents/status-page-incident.type.js";
import { AppError } from "@/utils/AppError.js";
import { statusPageErrors } from "@/domain/status-pages/status-page.errors.js";

const SERVICE_NAME = "StatusPageIncidentService";

export type PublicStatusPageIncidentHistory = StatusPageIncidentPage<PublicStatusPageIncident> & {
	pinned: PublicStatusPageIncident | null;
};

export interface IStatusPageIncidentService {
	createIncident(params: {
		teamId: string;
		statusPageId: string;
		title: string;
		content: string;
		style: StatusPageIncidentStyle;
	}): Promise<StatusPageIncident>;
	getIncidents(params: { teamId: string; statusPageId: string; cursor?: string }): Promise<StatusPageIncidentPage<StatusPageIncident>>;
	editIncident(params: {
		id: string;
		teamId: string;
		body: Partial<Pick<StatusPageIncident, "title" | "content" | "style" | "pinned">>;
	}): Promise<StatusPageIncident>;
	resolveIncident(params: { id: string; teamId: string }): Promise<StatusPageIncident>;
	unpinIncidents(params: { teamId: string; statusPageId: string }): Promise<number>;
	deleteIncident(params: { id: string; teamId: string }): Promise<StatusPageIncident>;
	getPublicIncidentHistory(params: { url: string; cursor?: string; requesterTeamId?: string }): Promise<PublicStatusPageIncidentHistory>;
}

export class StatusPageIncidentService implements IStatusPageIncidentService {
	static SERVICE_NAME = SERVICE_NAME;
	private statusPageIncidentsRepository: IStatusPageIncidentsRepository;
	private statusPagesRepository: IStatusPagesRepository;

	constructor({
		statusPageIncidentsRepository,
		statusPagesRepository,
	}: {
		statusPageIncidentsRepository: IStatusPageIncidentsRepository;
		statusPagesRepository: IStatusPagesRepository;
	}) {
		this.statusPageIncidentsRepository = statusPageIncidentsRepository;
		this.statusPagesRepository = statusPagesRepository;
	}

	private toPublicIncident = (incident: StatusPageIncident): PublicStatusPageIncident => ({
		id: incident.id,
		title: incident.title,
		content: incident.content,
		style: incident.style,
		pinned: incident.pinned,
		active: incident.active,
		createdAt: incident.createdAt,
		updatedAt: incident.updatedAt,
	});

	createIncident = async ({
		teamId,
		statusPageId,
		title,
		content,
		style,
	}: {
		teamId: string;
		statusPageId: string;
		title: string;
		content: string;
		style: StatusPageIncidentStyle;
	}): Promise<StatusPageIncident> => {
		// Throws notFound if the page is not on the caller's team
		await this.statusPagesRepository.findById(statusPageId, teamId);
		return await this.statusPageIncidentsRepository.create({ statusPageId, teamId, title, content, style });
	};

	getIncidents = async ({
		teamId,
		statusPageId,
		cursor,
	}: {
		teamId: string;
		statusPageId: string;
		cursor?: string;
	}): Promise<StatusPageIncidentPage<StatusPageIncident>> => {
		await this.statusPagesRepository.findById(statusPageId, teamId);
		return await this.statusPageIncidentsRepository.findByStatusPageId(statusPageId, cursor, STATUS_PAGE_INCIDENT_PAGE_SIZE);
	};

	editIncident = async ({
		id,
		teamId,
		body,
	}: {
		id: string;
		teamId: string;
		body: Partial<Pick<StatusPageIncident, "title" | "content" | "style" | "pinned">>;
	}): Promise<StatusPageIncident> => {
		return await this.statusPageIncidentsRepository.updateById(id, teamId, body);
	};

	// Resolving ends the incident and takes it off the banner; it stays in the history.
	resolveIncident = async ({ id, teamId }: { id: string; teamId: string }): Promise<StatusPageIncident> => {
		return await this.statusPageIncidentsRepository.updateById(id, teamId, { active: false, pinned: false });
	};

	// Unpinning only hides the banner; the incident stays active in the history.
	unpinIncidents = async ({ teamId, statusPageId }: { teamId: string; statusPageId: string }): Promise<number> => {
		await this.statusPagesRepository.findById(statusPageId, teamId);
		return await this.statusPageIncidentsRepository.unpinByStatusPageId(statusPageId, teamId);
	};

	deleteIncident = async ({ id, teamId }: { id: string; teamId: string }): Promise<StatusPageIncident> => {
		return await this.statusPageIncidentsRepository.deleteById(id, teamId);
	};

	getPublicIncidentHistory = async ({
		url,
		cursor,
		requesterTeamId,
	}: {
		url: string;
		cursor?: string;
		requesterTeamId?: string;
	}): Promise<PublicStatusPageIncidentHistory> => {
		const statusPage = await this.statusPagesRepository.findByUrl(url);

		// Ensure the status page is public or the requester is the owner
		if (!statusPage.isPublished) {
			if (!requesterTeamId || statusPage.teamId !== requesterTeamId) {
				throw new AppError(statusPageErrors.unpublished, { service: SERVICE_NAME });
			}
		}

		const page = await this.statusPageIncidentsRepository.findByStatusPageId(statusPage.id, cursor, STATUS_PAGE_INCIDENT_PAGE_SIZE);
		// The banner only matters on the first page
		const pinned = cursor ? null : await this.statusPageIncidentsRepository.findPinnedByStatusPageId(statusPage.id);

		return {
			...page,
			incidents: page.incidents.map(this.toPublicIncident),
			pinned: pinned ? this.toPublicIncident(pinned) : null,
		};
	};
}
