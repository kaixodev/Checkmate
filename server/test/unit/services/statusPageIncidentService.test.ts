import { describe, expect, it, jest } from "@jest/globals";
import { StatusPageIncidentService } from "../../../src/domain/status-page-incidents/status-page-incident.service.ts";
import type { IStatusPageIncidentsRepository } from "../../../src/domain/status-page-incidents/status-page-incident.repository.interface.ts";
import type { IStatusPagesRepository } from "../../../src/domain/status-pages/status-page-repository.interface.ts";
import type { StatusPageIncident } from "../../../src/domain/status-page-incidents/status-page-incident.type.ts";
import { STATUS_PAGE_INCIDENT_PAGE_SIZE } from "../../../src/domain/status-page-incidents/status-page-incident.type.ts";
import { statusPageErrors } from "../../../src/domain/status-pages/status-page.errors.ts";
import { makeStatusPage } from "../../helpers/makeStatusPage.ts";

// ── Helpers ──────────────────────────────────────────────────────────────────

const makeIncident = (overrides?: Partial<StatusPageIncident>): StatusPageIncident => ({
	id: "inc-1",
	statusPageId: "sp-1",
	teamId: "team-1",
	title: "Database upgrade",
	content: "Expect **brief** interruptions.",
	style: "warning",
	pinned: true,
	active: true,
	resolvedAt: null,
	createdAt: "2026-11-19T08:00:00.000Z",
	updatedAt: "2026-11-19T08:00:00.000Z",
	...overrides,
});

const createIncidentsRepo = () =>
	({
		create: jest.fn().mockResolvedValue(makeIncident()),
		findById: jest.fn().mockResolvedValue(makeIncident()),
		findByStatusPageId: jest.fn().mockResolvedValue({ incidents: [makeIncident()], total: 1, nextCursor: null, hasMore: false }),
		findPinnedByStatusPageId: jest.fn().mockResolvedValue(makeIncident()),
		findActiveBetween: jest.fn().mockResolvedValue([makeIncident()]),
		updateById: jest.fn().mockResolvedValue(makeIncident()),
		unpinByStatusPageId: jest.fn().mockResolvedValue(1),
		deleteById: jest.fn().mockResolvedValue(makeIncident()),
		deleteByStatusPageId: jest.fn().mockResolvedValue(1),
	}) as unknown as jest.Mocked<IStatusPageIncidentsRepository>;

const createStatusPagesRepo = () =>
	({
		findById: jest.fn().mockResolvedValue(makeStatusPage()),
		findByUrl: jest.fn().mockResolvedValue(makeStatusPage({ isPublished: true })),
	}) as unknown as jest.Mocked<IStatusPagesRepository>;

const setup = () => {
	const statusPageIncidentsRepository = createIncidentsRepo();
	const statusPagesRepository = createStatusPagesRepo();
	const service = new StatusPageIncidentService({ statusPageIncidentsRepository, statusPagesRepository });
	return { service, statusPageIncidentsRepository, statusPagesRepository };
};

// ── Tests ────────────────────────────────────────────────────────────────────

describe("StatusPageIncidentService", () => {
	describe("createIncident", () => {
		it("checks the status page is on the caller's team before creating", async () => {
			const { service, statusPagesRepository, statusPageIncidentsRepository } = setup();

			await service.createIncident({ teamId: "team-1", statusPageId: "sp-1", title: "T", content: "C", style: "info" });

			expect(statusPagesRepository.findById).toHaveBeenCalledWith("sp-1", "team-1");
			expect(statusPageIncidentsRepository.create).toHaveBeenCalledWith({
				statusPageId: "sp-1",
				teamId: "team-1",
				title: "T",
				content: "C",
				style: "info",
			});
		});

		it("does not create when the status page is not on the caller's team", async () => {
			const { service, statusPagesRepository, statusPageIncidentsRepository } = setup();
			statusPagesRepository.findById.mockRejectedValue(new Error("Status page not found"));

			await expect(service.createIncident({ teamId: "team-2", statusPageId: "sp-1", title: "T", content: "C", style: "info" })).rejects.toThrow(
				"Status page not found"
			);
			expect(statusPageIncidentsRepository.create).not.toHaveBeenCalled();
		});
	});

	describe("getIncidents", () => {
		it("returns a page using the shared page size", async () => {
			const { service, statusPageIncidentsRepository } = setup();

			const result = await service.getIncidents({ teamId: "team-1", statusPageId: "sp-1", cursor: "inc-9" });

			expect(statusPageIncidentsRepository.findByStatusPageId).toHaveBeenCalledWith("sp-1", "inc-9", STATUS_PAGE_INCIDENT_PAGE_SIZE);
			expect(result.incidents).toHaveLength(1);
		});
	});

	describe("resolveIncident", () => {
		it("marks the incident inactive, unpins it and records when", async () => {
			const { service, statusPageIncidentsRepository } = setup();

			await service.resolveIncident({ id: "inc-1", teamId: "team-1" });

			expect(statusPageIncidentsRepository.updateById).toHaveBeenCalledWith("inc-1", "team-1", {
				active: false,
				pinned: false,
				resolvedAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
			});
		});
	});

	describe("editIncident", () => {
		it("passes only the edited fields to the repository", async () => {
			const { service, statusPageIncidentsRepository } = setup();

			await service.editIncident({ id: "inc-1", teamId: "team-1", body: { title: "New title", pinned: false } });

			expect(statusPageIncidentsRepository.updateById).toHaveBeenCalledWith("inc-1", "team-1", { title: "New title", pinned: false });
		});
	});

	describe("unpinIncidents", () => {
		it("unpins every incident on a page the caller owns", async () => {
			const { service, statusPagesRepository, statusPageIncidentsRepository } = setup();

			const unpinned = await service.unpinIncidents({ teamId: "team-1", statusPageId: "sp-1" });

			expect(statusPagesRepository.findById).toHaveBeenCalledWith("sp-1", "team-1");
			expect(statusPageIncidentsRepository.unpinByStatusPageId).toHaveBeenCalledWith("sp-1", "team-1");
			expect(unpinned).toBe(1);
		});
	});

	describe("deleteIncident", () => {
		it("deletes by id within the caller's team", async () => {
			const { service, statusPageIncidentsRepository } = setup();

			await service.deleteIncident({ id: "inc-1", teamId: "team-1" });

			expect(statusPageIncidentsRepository.deleteById).toHaveBeenCalledWith("inc-1", "team-1");
		});
	});

	describe("getPublicIncidentHistory", () => {
		it("returns the pinned incident and the first page without team fields", async () => {
			const { service } = setup();

			const result = await service.getPublicIncidentHistory({ url: "my-status-page" });

			expect(result.pinned).toEqual(expect.objectContaining({ id: "inc-1", title: "Database upgrade" }));
			expect(result.pinned).not.toHaveProperty("teamId");
			expect(result.incidents[0]).not.toHaveProperty("teamId");
			expect(result.incidents[0]).not.toHaveProperty("statusPageId");
		});

		it("skips the pinned lookup on later pages", async () => {
			const { service, statusPageIncidentsRepository } = setup();

			const result = await service.getPublicIncidentHistory({ url: "my-status-page", cursor: "inc-5" });

			expect(statusPageIncidentsRepository.findPinnedByStatusPageId).not.toHaveBeenCalled();
			expect(statusPageIncidentsRepository.findByStatusPageId).toHaveBeenCalledWith("sp-1", "inc-5", STATUS_PAGE_INCIDENT_PAGE_SIZE);
			expect(result.pinned).toBeNull();
		});

		it("throws unpublished for an anonymous caller on an unpublished page", async () => {
			const { service, statusPagesRepository } = setup();
			statusPagesRepository.findByUrl.mockResolvedValue(makeStatusPage({ isPublished: false }));

			await expect(service.getPublicIncidentHistory({ url: "my-status-page" })).rejects.toMatchObject({
				status: statusPageErrors.unpublished.status,
			});
		});

		it("lets the owning team read an unpublished page", async () => {
			const { service, statusPagesRepository } = setup();
			statusPagesRepository.findByUrl.mockResolvedValue(makeStatusPage({ isPublished: false }));

			const result = await service.getPublicIncidentHistory({ url: "my-status-page", requesterTeamId: "team-1" });

			expect(result.incidents).toHaveLength(1);
		});
	});

	describe("getPublicIncidentsForDay", () => {
		it("looks up the whole day in the status page's timezone, without team fields", async () => {
			const { service, statusPagesRepository, statusPageIncidentsRepository } = setup();
			statusPagesRepository.findByUrl.mockResolvedValue(makeStatusPage({ isPublished: true, timezone: "Asia/Tokyo" }));

			const result = await service.getPublicIncidentsForDay({ url: "my-status-page", date: "2026-11-21" });

			expect(statusPageIncidentsRepository.findActiveBetween).toHaveBeenCalledWith(
				"sp-1",
				new Date("2026-11-20T15:00:00.000Z"),
				new Date("2026-11-21T14:59:59.999Z")
			);
			expect(result[0]).toEqual(expect.objectContaining({ id: "inc-1", resolvedAt: null }));
			expect(result[0]).not.toHaveProperty("teamId");
		});

		it("throws unpublished for an anonymous caller on an unpublished page", async () => {
			const { service, statusPagesRepository } = setup();
			statusPagesRepository.findByUrl.mockResolvedValue(makeStatusPage({ isPublished: false }));

			await expect(service.getPublicIncidentsForDay({ url: "my-status-page", date: "2026-11-21" })).rejects.toMatchObject({
				status: statusPageErrors.unpublished.status,
			});
		});
	});
});
