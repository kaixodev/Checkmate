import { RequestHandler } from "express";
import {
	createStatusPageIncidentBodyValidation,
	editStatusPageIncidentBodyValidation,
	publicStatusPageIncidentDayQueryValidation,
	publicStatusPageIncidentParamValidation,
	statusPageIncidentCursorQueryValidation,
	statusPageIncidentIdParamValidation,
	statusPageIncidentStatusPageIdParamValidation,
} from "@/api/validation/statusPageIncidentValidation.js";
import { Handler, requireTeamId } from "@/api/controllers/controllerUtils.js";
import { IStatusPageIncidentService } from "@/domain/status-page-incidents/status-page-incident.service.js";

export interface IStatusPageIncidentController {
	getIncidents: RequestHandler;
	createIncident: RequestHandler;
	unpinIncidents: RequestHandler;
	editIncident: RequestHandler;
	resolveIncident: RequestHandler;
	deleteIncident: RequestHandler;
	getPublicIncidentHistory: RequestHandler;
	getPublicIncidentsForDay: RequestHandler;
}

class StatusPageIncidentController implements IStatusPageIncidentController {
	private statusPageIncidentService: IStatusPageIncidentService;
	constructor(statusPageIncidentService: IStatusPageIncidentService) {
		this.statusPageIncidentService = statusPageIncidentService;
	}

	getIncidents: Handler = async (req, res) => {
		const { statusPageId } = statusPageIncidentStatusPageIdParamValidation.parse(req.params);
		const { cursor } = statusPageIncidentCursorQueryValidation.parse(req.query);
		const teamId = requireTeamId(req.user?.teamId);
		const data = await this.statusPageIncidentService.getIncidents({ teamId, statusPageId, cursor });
		res.json({ success: true, msg: "Status page incidents fetched successfully", data });
	};

	createIncident: Handler = async (req, res) => {
		const { statusPageId } = statusPageIncidentStatusPageIdParamValidation.parse(req.params);
		const { title, content, style } = createStatusPageIncidentBodyValidation.parse(req.body);
		const teamId = requireTeamId(req.user?.teamId);
		const data = await this.statusPageIncidentService.createIncident({ teamId, statusPageId, title, content, style });
		res.json({ success: true, msg: "Status page incident posted successfully", data });
	};

	unpinIncidents: Handler = async (req, res) => {
		const { statusPageId } = statusPageIncidentStatusPageIdParamValidation.parse(req.params);
		const teamId = requireTeamId(req.user?.teamId);
		const unpinned = await this.statusPageIncidentService.unpinIncidents({ teamId, statusPageId });
		res.json({ success: true, msg: "Status page incidents unpinned successfully", data: { unpinned } });
	};

	editIncident: Handler = async (req, res) => {
		const { id } = statusPageIncidentIdParamValidation.parse(req.params);
		const body = editStatusPageIncidentBodyValidation.parse(req.body);
		const teamId = requireTeamId(req.user?.teamId);
		const data = await this.statusPageIncidentService.editIncident({ id, teamId, body });
		res.json({ success: true, msg: "Status page incident edited successfully", data });
	};

	resolveIncident: Handler = async (req, res) => {
		const { id } = statusPageIncidentIdParamValidation.parse(req.params);
		const teamId = requireTeamId(req.user?.teamId);
		const data = await this.statusPageIncidentService.resolveIncident({ id, teamId });
		res.json({ success: true, msg: "Status page incident resolved successfully", data });
	};

	deleteIncident: Handler = async (req, res) => {
		const { id } = statusPageIncidentIdParamValidation.parse(req.params);
		const teamId = requireTeamId(req.user?.teamId);
		await this.statusPageIncidentService.deleteIncident({ id, teamId });
		res.json({ success: true, msg: "Status page incident deleted successfully" });
	};

	getPublicIncidentHistory: Handler = async (req, res) => {
		const { url } = publicStatusPageIncidentParamValidation.parse(req.params);
		const { cursor } = statusPageIncidentCursorQueryValidation.parse(req.query);
		const data = await this.statusPageIncidentService.getPublicIncidentHistory({ url, cursor, requesterTeamId: req.user?.teamId });
		res.json({ success: true, msg: "Status page incidents retrieved successfully", data });
	};

	getPublicIncidentsForDay: Handler = async (req, res) => {
		const { url } = publicStatusPageIncidentParamValidation.parse(req.params);
		const { date } = publicStatusPageIncidentDayQueryValidation.parse(req.query);
		const incidents = await this.statusPageIncidentService.getPublicIncidentsForDay({ url, date, requesterTeamId: req.user?.teamId });
		res.json({ success: true, msg: "Status page incidents retrieved successfully", data: { incidents } });
	};
}

export default StatusPageIncidentController;
