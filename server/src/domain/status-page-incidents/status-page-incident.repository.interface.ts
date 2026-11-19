import type { StatusPageIncident, StatusPageIncidentPage } from "@/domain/status-page-incidents/status-page-incident.type.js";

export interface IStatusPageIncidentsRepository {
	// create
	create(data: Pick<StatusPageIncident, "statusPageId" | "teamId" | "title" | "content" | "style">): Promise<StatusPageIncident>;
	// fetch
	findById(id: string, teamId: string): Promise<StatusPageIncident>;
	findByStatusPageId(statusPageId: string, cursor: string | undefined, limit: number): Promise<StatusPageIncidentPage<StatusPageIncident>>;
	findPinnedByStatusPageId(statusPageId: string): Promise<StatusPageIncident | null>;
	// update
	updateById(
		id: string,
		teamId: string,
		data: Partial<Pick<StatusPageIncident, "title" | "content" | "style" | "pinned" | "active">>
	): Promise<StatusPageIncident>;
	unpinByStatusPageId(statusPageId: string, teamId: string): Promise<number>;
	// delete
	deleteById(id: string, teamId: string): Promise<StatusPageIncident>;
	deleteByStatusPageId(statusPageId: string, teamId: string): Promise<number>;
}
