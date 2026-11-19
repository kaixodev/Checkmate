import type { ErrorDefinition } from "@/utils/AppError.js";

export const statusPageIncidentErrors = {
	notFound: { status: 404, description: "Status page incident not found" },
} satisfies Record<string, ErrorDefinition>;
