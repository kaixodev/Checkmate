import { describe, expect, it, beforeAll, afterAll, beforeEach } from "@jest/globals";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import MongoStatusPageIncidentsRepository from "../../src/domain/status-page-incidents/status-page-incident.repository.mongo.ts";
import { StatusPageIncidentModel } from "../../src/domain/status-page-incidents/status-page-incident.model.ts";

// ── Real-Mongo harness ─────────────────────────────────────────────────────────
// Cursor pagination, the pinned-banner lookup and the team scoping are all query
// semantics, so they are exercised against a live engine rather than mocks.

let mongod: MongoMemoryServer;

beforeAll(async () => {
	mongod = await MongoMemoryServer.create();
	await mongoose.connect(mongod.getUri());
	await StatusPageIncidentModel.init();
}, 120_000);

afterAll(async () => {
	await mongoose.disconnect();
	await mongod.stop();
});

beforeEach(async () => {
	await StatusPageIncidentModel.deleteMany({});
});

const makeId = () => new mongoose.Types.ObjectId();

const seed = async (statusPageId: mongoose.Types.ObjectId, teamId: mongoose.Types.ObjectId, count: number, createdAt?: Date) => {
	const docs = [];
	for (let i = 0; i < count; i++) {
		docs.push({
			statusPageId,
			teamId,
			title: `Incident ${i}`,
			content: "Content",
			style: "warning",
			pinned: false,
			active: false,
			// Same timestamp on purpose when createdAt is given, to exercise the _id tiebreak
			createdAt: createdAt ?? new Date(Date.UTC(2026, 10, 1, 0, i)),
		});
	}
	await StatusPageIncidentModel.insertMany(docs);
};

describe("MongoStatusPageIncidentsRepository", () => {
	describe("findByStatusPageId", () => {
		it("pages newest first without gaps or repeats", async () => {
			const repo = new MongoStatusPageIncidentsRepository();
			const statusPageId = makeId();
			const teamId = makeId();
			await seed(statusPageId, teamId, 7);

			const first = await repo.findByStatusPageId(statusPageId.toString(), undefined, 3);
			const second = await repo.findByStatusPageId(statusPageId.toString(), first.nextCursor ?? undefined, 3);
			const third = await repo.findByStatusPageId(statusPageId.toString(), second.nextCursor ?? undefined, 3);

			const titles = [...first.incidents, ...second.incidents, ...third.incidents].map((incident) => incident.title);
			expect(titles).toEqual(["Incident 6", "Incident 5", "Incident 4", "Incident 3", "Incident 2", "Incident 1", "Incident 0"]);
			expect(first.total).toBe(7);
			expect(first.hasMore).toBe(true);
			expect(third.hasMore).toBe(false);
			expect(third.nextCursor).toBeNull();
		});

		it("breaks createdAt ties by id so no incident is skipped", async () => {
			const repo = new MongoStatusPageIncidentsRepository();
			const statusPageId = makeId();
			await seed(statusPageId, makeId(), 5, new Date("2026-11-01T00:00:00Z"));

			const first = await repo.findByStatusPageId(statusPageId.toString(), undefined, 2);
			const second = await repo.findByStatusPageId(statusPageId.toString(), first.nextCursor ?? undefined, 2);
			const third = await repo.findByStatusPageId(statusPageId.toString(), second.nextCursor ?? undefined, 2);

			const ids = [...first.incidents, ...second.incidents, ...third.incidents].map((incident) => incident.id);
			expect(new Set(ids).size).toBe(5);
		});

		it("only returns incidents from the requested page", async () => {
			const repo = new MongoStatusPageIncidentsRepository();
			const statusPageId = makeId();
			await seed(statusPageId, makeId(), 2);
			await seed(makeId(), makeId(), 3);

			const page = await repo.findByStatusPageId(statusPageId.toString(), undefined, 10);

			expect(page.incidents).toHaveLength(2);
			expect(page.total).toBe(2);
		});

		it("returns an empty page for a cursor from another page", async () => {
			const repo = new MongoStatusPageIncidentsRepository();
			const statusPageId = makeId();
			const otherPageId = makeId();
			await seed(statusPageId, makeId(), 2);
			await seed(otherPageId, makeId(), 2);
			const foreign = await repo.findByStatusPageId(otherPageId.toString(), undefined, 1);

			const page = await repo.findByStatusPageId(statusPageId.toString(), foreign.incidents[0]?.id, 10);

			expect(page.incidents).toEqual([]);
			expect(page.hasMore).toBe(false);
		});
	});

	describe("create and findPinnedByStatusPageId", () => {
		it("creates incidents pinned and active, and returns the newest pinned one", async () => {
			const repo = new MongoStatusPageIncidentsRepository();
			const statusPageId = makeId().toString();
			const teamId = makeId().toString();

			const older = await repo.create({ statusPageId, teamId, title: "Older", content: "C", style: "info" });
			const newer = await repo.create({ statusPageId, teamId, title: "Newer", content: "C", style: "danger" });

			expect(older.pinned).toBe(true);
			expect(older.active).toBe(true);
			expect((await repo.findPinnedByStatusPageId(statusPageId))?.id).toBe(newer.id);
		});

		it("ignores pinned incidents that are resolved", async () => {
			const repo = new MongoStatusPageIncidentsRepository();
			const statusPageId = makeId().toString();
			const teamId = makeId().toString();
			const incident = await repo.create({ statusPageId, teamId, title: "T", content: "C", style: "info" });

			await repo.updateById(incident.id, teamId, { active: false });

			expect(await repo.findPinnedByStatusPageId(statusPageId)).toBeNull();
		});
	});

	describe("team scoping", () => {
		it("does not update, unpin or delete another team's incidents", async () => {
			const repo = new MongoStatusPageIncidentsRepository();
			const statusPageId = makeId().toString();
			const teamId = makeId().toString();
			const otherTeamId = makeId().toString();
			const incident = await repo.create({ statusPageId, teamId, title: "T", content: "C", style: "info" });

			await expect(repo.updateById(incident.id, otherTeamId, { title: "Hijacked" })).rejects.toThrow("Status page incident not found");
			await expect(repo.deleteById(incident.id, otherTeamId)).rejects.toThrow("Status page incident not found");
			expect(await repo.unpinByStatusPageId(statusPageId, otherTeamId)).toBe(0);
			expect(await repo.deleteByStatusPageId(statusPageId, otherTeamId)).toBe(0);

			const unchanged = await repo.findById(incident.id, teamId);
			expect(unchanged.title).toBe("T");
			expect(unchanged.pinned).toBe(true);
		});
	});

	describe("unpinByStatusPageId and deleteByStatusPageId", () => {
		it("unpins without resolving, then deletes everything on the page", async () => {
			const repo = new MongoStatusPageIncidentsRepository();
			const statusPageId = makeId().toString();
			const teamId = makeId().toString();
			await repo.create({ statusPageId, teamId, title: "A", content: "C", style: "info" });
			await repo.create({ statusPageId, teamId, title: "B", content: "C", style: "info" });

			expect(await repo.unpinByStatusPageId(statusPageId, teamId)).toBe(2);
			const page = await repo.findByStatusPageId(statusPageId, undefined, 10);
			expect(page.incidents.every((incident) => !incident.pinned && incident.active)).toBe(true);
			// Unpinning is not an edit, so updatedAt stays at createdAt
			expect(page.incidents.every((incident) => incident.updatedAt === incident.createdAt)).toBe(true);

			expect(await repo.deleteByStatusPageId(statusPageId, teamId)).toBe(2);
			expect((await repo.findByStatusPageId(statusPageId, undefined, 10)).total).toBe(0);
		});
	});

	describe("validation", () => {
		it("rejects a style outside the allowed set", async () => {
			const repo = new MongoStatusPageIncidentsRepository();
			const statusPageId = makeId().toString();
			const teamId = makeId().toString();
			const incident = await repo.create({ statusPageId, teamId, title: "T", content: "C", style: "info" });

			// @ts-expect-error - deliberately invalid to check the schema enum
			await expect(repo.updateById(incident.id, teamId, { style: "rainbow" })).rejects.toThrow();
		});
	});
});
