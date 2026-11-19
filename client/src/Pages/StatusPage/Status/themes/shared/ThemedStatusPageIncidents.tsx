import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import type { SxProps, Theme } from "@mui/material/styles";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import type { BaseStyles } from "@/Pages/StatusPage/Status/themes/shared/BaseStatusPage";
import type { StatusPageThemeTokens } from "@/Pages/StatusPage/Status/themes/tokens";
import { useStatusPageTheme } from "@/Pages/StatusPage/Status/themes/StatusPageThemeProvider";
import type {
	PublicStatusPageIncident,
	StatusPageIncidentStyle,
} from "@/Types/StatusPageIncident";
import { formatDate } from "@/Utils/TimeUtils";
import { renderMarkdown } from "@/Utils/markdown";

type FlatSx = Exclude<SxProps<Theme>, readonly unknown[] | ((theme: Theme) => unknown)>;

const extend = (base: SxProps<Theme>, overrides: SxProps<Theme>): SxProps<Theme> => [
	base as FlatSx,
	overrides as FlatSx,
];

type Tone = { accent: string; soft: string };

/**
 * Incident styles are the six Kuma/Bootstrap names; each maps onto the status page
 * theme's own tokens so a post matches whichever theme the page uses.
 */
const incidentTone = (
	style: StatusPageIncidentStyle,
	tokens: StatusPageThemeTokens
): Tone => {
	switch (style) {
		case "danger":
			return { accent: tokens.down, soft: tokens.downSoft };
		case "warning":
			return { accent: tokens.warn, soft: tokens.warnSoft };
		case "primary":
			return { accent: tokens.up, soft: tokens.upSoft };
		case "info":
			return {
				accent: tokens.brand ?? tokens.up,
				soft: tokens.brandSoft ?? tokens.upSoft,
			};
		case "dark":
			return { accent: tokens.text, soft: tokens.border };
		case "light":
		default:
			return { accent: tokens.textMuted, soft: tokens.surface };
	}
};

// Markdown output: keep it readable inside every theme
const markdownSx = (tokens: StatusPageThemeTokens): SxProps<Theme> => ({
	color: tokens.text,
	lineHeight: 1.55,
	overflowWrap: "anywhere",
	"& > :first-of-type": { mt: 0 },
	"& > :last-child": { mb: 0 },
	"& p, & ul, & ol, & blockquote, & pre": { my: "0.5em" },
	"& a": { color: tokens.brandStrong ?? tokens.upStrong },
	"& code": {
		fontFamily: "monospace",
		fontSize: "0.92em",
		background: tokens.border,
		borderRadius: "4px",
		px: "4px",
	},
	"& pre": {
		overflowX: "auto",
		background: tokens.border,
		p: "8px",
		borderRadius: "6px",
	},
	"& pre code": { background: "transparent", p: 0 },
	"& blockquote": {
		m: 0,
		pl: "12px",
		borderLeft: `3px solid ${tokens.border}`,
		color: tokens.textMuted,
	},
	"& img": { maxWidth: "100%" },
});

const useFormatters = (timezone: string) => {
	const { i18n } = useTranslation();
	const locale = i18n.resolvedLanguage ?? "en";
	return {
		dateTime: (value: string) =>
			formatDate(value, "dateTime", { timeZone: timezone, locale, timeFormat: "24h" }),
		day: (value: string) =>
			formatDate(value, "date", { timeZone: timezone, locale, timeFormat: "24h" }),
	};
};

interface IncidentBodyProps {
	incident: PublicStatusPageIncident;
	timezone: string;
	titleSx: SxProps<Theme>;
}

const IncidentBody = ({ incident, timezone, titleSx }: IncidentBodyProps) => {
	const { t } = useTranslation();
	const { tokens } = useStatusPageTheme();
	const format = useFormatters(timezone);
	const html = useMemo(() => renderMarkdown(incident.content), [incident.content]);
	const edited = incident.updatedAt !== incident.createdAt;

	return (
		<Stack gap="6px">
			<Box
				component="h3"
				m={0}
				sx={titleSx}
			>
				{incident.title}
			</Box>
			<Box
				className="incident-content"
				sx={markdownSx(tokens)}
				dangerouslySetInnerHTML={{ __html: html }}
			/>
			<Box
				fontSize={12}
				color={tokens.textMuted}
			>
				{t("pages.statusPages.incidents.postedAt", {
					date: format.dateTime(incident.createdAt),
				})}
				{edited &&
					` · ${t("pages.statusPages.incidents.updatedAt", {
						date: format.dateTime(incident.updatedAt),
					})}`}
			</Box>
		</Stack>
	);
};

interface BannerProps {
	incident: PublicStatusPageIncident;
	styles: BaseStyles;
	timezone: string;
}

/** The pinned incident, shown under the hero like Kuma's incident banner. */
export const ThemedIncidentBanner = ({ incident, styles, timezone }: BannerProps) => {
	const { tokens } = useStatusPageTheme();
	const tone = incidentTone(incident.style, tokens);
	return (
		<Box
			component="section"
			className="status-page-incident-banner"
			data-style={incident.style}
			role="status"
			sx={extend(styles.card, {
				background: tone.soft,
				borderColor: tone.accent,
				p: "16px 20px",
				mb: "16px",
				"&:hover": { transform: "none" },
			})}
		>
			<IncidentBody
				incident={incident}
				timezone={timezone}
				titleSx={extend(styles.monitorName, { whiteSpace: "normal", fontSize: 16 })}
			/>
		</Box>
	);
};

interface HistoryProps {
	incidents: PublicStatusPageIncident[];
	pinnedId: string | null;
	styles: BaseStyles;
	timezone: string;
	hasMore: boolean;
	isLoadingMore: boolean;
	onLoadMore: () => void;
}

/** Past incidents grouped by day, newest first, with Load more. */
export const ThemedIncidentHistory = ({
	incidents,
	pinnedId,
	styles,
	timezone,
	hasMore,
	isLoadingMore,
	onLoadMore,
}: HistoryProps) => {
	const { t } = useTranslation();
	const { tokens } = useStatusPageTheme();
	const format = useFormatters(timezone);

	// The pinned incident is already the banner; everything else is history.
	const past = incidents.filter((incident) => incident.id !== pinnedId);
	const byDay = new Map<string, PublicStatusPageIncident[]>();
	for (const incident of past) {
		const key = format.day(incident.createdAt);
		byDay.set(key, [...(byDay.get(key) ?? []), incident]);
	}
	const groups = [...byDay.entries()];

	if (past.length === 0) return null;

	return (
		<Box
			component="section"
			className="status-page-incident-history"
			mt="32px"
		>
			<Box
				component="h2"
				m={0}
				mb="12px"
				sx={extend(styles.monitorName, { fontSize: 18, whiteSpace: "normal" })}
			>
				{t("pages.statusPages.incidents.pastIncidents")}
			</Box>
			<Stack gap="20px">
				{groups.map(([day, items]) => (
					<Box key={day}>
						<Box
							fontSize={13}
							fontWeight={600}
							color={tokens.textMuted}
							mb="8px"
						>
							{day}
						</Box>
						<Stack
							component="ul"
							m={0}
							p={0}
							gap="10px"
							sx={{ listStyle: "none" }}
						>
							{items.map((incident) => {
								const tone = incidentTone(incident.style, tokens);
								return (
									<Box
										component="li"
										key={incident.id}
										className="status-page-incident"
										data-style={incident.style}
										data-active={incident.active}
										sx={extend(styles.card, {
											p: "14px 16px",
											borderTop: `3px solid ${tone.accent}`,
											opacity: incident.active ? 1 : 0.85,
										})}
									>
										<IncidentBody
											incident={incident}
											timezone={timezone}
											titleSx={extend(styles.monitorName, { whiteSpace: "normal" })}
										/>
										{!incident.active && (
											<Box
												component="span"
												mt="8px"
												display="inline-block"
												sx={styles.pill}
											>
												{t("pages.statusPages.incidents.resolved")}
											</Box>
										)}
									</Box>
								);
							})}
						</Stack>
					</Box>
				))}
			</Stack>
			{hasMore && (
				<Box
					display="flex"
					justifyContent="center"
					mt="16px"
				>
					<Box
						component="button"
						type="button"
						onClick={onLoadMore}
						disabled={isLoadingMore}
						sx={extend(styles.chartSwitchButton(false), { cursor: "pointer" })}
					>
						{isLoadingMore
							? t("pages.statusPages.incidents.loading")
							: t("pages.statusPages.incidents.loadMore")}
					</Box>
				</Box>
			)}
		</Box>
	);
};
