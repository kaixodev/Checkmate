import useSWRInfinite from "swr/infinite";
import { get } from "@/Utils/ApiClient";
import type { ApiResponse } from "@/Hooks/UseApi";
import type {
	PublicStatusPageIncidentHistory,
	StatusPageIncidentPage,
} from "@/Types/StatusPageIncident";

const fetchPage = async <T>(url: string): Promise<T> => {
	const res = await get<ApiResponse<T>>(url);
	return res.data.data;
};

const withCursor = (base: string, cursor: string | null) =>
	cursor ? `${base}?cursor=${encodeURIComponent(cursor)}` : base;

interface CursorPage {
	nextCursor: string | null;
	hasMore: boolean;
}

const usePagedIncidents = <P extends CursorPage>(
	base: string | null,
	refreshInterval: number
) => {
	const { data, error, isLoading, isValidating, size, setSize, mutate } =
		useSWRInfinite<P>(
			(index, previous) => {
				if (!base) return null;
				if (index === 0) return withCursor(base, null);
				if (!previous?.hasMore || !previous.nextCursor) return null;
				return withCursor(base, previous.nextCursor);
			},
			(url: string) => fetchPage<P>(url),
			{ refreshInterval, revalidateFirstPage: true, keepPreviousData: true }
		);

	const pages = data ?? [];
	const last = pages[pages.length - 1];
	return {
		pages,
		error,
		isLoading,
		isLoadingMore: isValidating && size > pages.length,
		hasMore: Boolean(last?.hasMore),
		loadMore: () => setSize(size + 1),
		mutate,
	};
};

/** Pinned incident and incident history of a status page, as shown publicly. */
export const usePublicStatusPageIncidents = (url: string | undefined) => {
	const result = usePagedIncidents<PublicStatusPageIncidentHistory>(
		url ? `/status-page-incidents/public/${encodeURIComponent(url)}` : null,
		60000
	);
	return {
		...result,
		pinned: result.pages[0]?.pinned ?? null,
		incidents: result.pages.flatMap((page) => page.incidents),
	};
};

/** Every incident posted on a status page, for the admin view. */
export const useStatusPageIncidents = (statusPageId: string | undefined) => {
	const result = usePagedIncidents<StatusPageIncidentPage>(
		statusPageId ? `/status-page-incidents/status-page/${statusPageId}` : null,
		0
	);
	return {
		...result,
		incidents: result.pages.flatMap((page) => page.incidents),
		total: result.pages[0]?.total ?? 0,
	};
};
