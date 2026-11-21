import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import Typography from "@mui/material/Typography";
import Stack from "@mui/material/Stack";
import { X as XIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useGet } from "@/Hooks/UseApi";
import Box from "@mui/material/Box";
import { useTheme, type Theme } from "@mui/material";
import { useMemo } from "react";
import { SPACING } from "@/Utils/Theme/constants";

import type { Incident } from "@/Types/Incident";
import { formatDate } from "@/Utils/TimeUtils";
import { IconButton } from "@/Components/inputs";
import type {
	PublicStatusPageIncident,
	StatusPageIncidentStyle,
} from "@/Types/StatusPageIncident";
import { renderMarkdown } from "@/Utils/markdown";
import { fontWeights } from "@/Utils/Theme/Palette";

const styleColor = (theme: Theme, style: StatusPageIncidentStyle): string => {
	switch (style) {
		case "info":
			return theme.palette.info.main;
		case "warning":
			return theme.palette.warning.main;
		case "danger":
			return theme.palette.error.main;
		case "primary":
			return theme.palette.primary.main;
		default:
			return theme.palette.divider;
	}
};

// Whether an ISO time falls on the selected YYYY-MM-DD day in the page's timezone
const DAY_FORMAT = { locale: "en", timeFormat: "24h" } as const;
const isOnDay = (value: string, date: string, timeZone: string) =>
	formatDate(value, "date", { ...DAY_FORMAT, timeZone }) ===
	formatDate(`${date}T12:00:00Z`, "date", { ...DAY_FORMAT, timeZone: "UTC" });

interface WrittenIncidentProps {
	incident: PublicStatusPageIncident;
	date: string;
	timezone: string;
	format: (value: string, withDate: boolean) => string;
}

const WrittenIncident = ({ incident, date, timezone, format }: WrittenIncidentProps) => {
	const theme = useTheme();
	const { t } = useTranslation();
	const html = useMemo(() => renderMarkdown(incident.content), [incident.content]);
	// Incidents resolved before resolvedAt was recorded use their last update instead
	const end = incident.resolvedAt ?? (incident.active ? null : incident.updatedAt);
	const label = (value: string) => format(value, !isOnDay(value, date, timezone));

	return (
		<Stack
			className="status-page-day-incident"
			data-style={incident.style}
			p={SPACING.LG}
			border={1}
			borderColor="divider"
			borderLeft={4}
			sx={{ borderLeftColor: styleColor(theme, incident.style) }}
			borderRadius={theme.shape.borderRadius}
		>
			<Typography
				variant="subtitle2"
				fontWeight={fontWeights.semibold}
			>
				{incident.title}
			</Typography>
			<Box
				className="incident-content"
				fontSize={theme.typography.body2.fontSize}
				sx={{
					overflowWrap: "anywhere",
					"& p": { m: 0 },
					"& p + p, & ul, & ol": { mt: 0.5 },
					"& a": { color: "inherit" },
				}}
				dangerouslySetInnerHTML={{ __html: html }}
			/>
			<Typography
				variant="body2"
				color={theme.palette.text.secondary}
				mt={SPACING.XS}
			>
				{label(incident.createdAt)} -{" "}
				{end ? label(end) : t("pages.statusPages.monitorsList.incidents.ongoing")}
			</Typography>
		</Stack>
	);
};
interface IncidentModalProps {
	url: string;
	monitorId: string | null;
	date: string | null;
	timezone: string;
	onClose: () => void;
}

export const IncidentModal = ({
	url,
	monitorId,
	date,
	timezone,
	onClose,
}: IncidentModalProps) => {
	const theme = useTheme();
	const { t, i18n } = useTranslation();
	const formatTime = (value: string) =>
		formatDate(value, "time", {
			timeZone: timezone,
			locale: i18n.resolvedLanguage ?? "en",
			timeFormat: "24h",
		});

	const formatWritten = (value: string, withDate: boolean) =>
		formatDate(value, withDate ? "dateTime" : "time", {
			timeZone: timezone,
			locale: i18n.resolvedLanguage ?? "en",
			timeFormat: "24h",
		});

	const open = Boolean(monitorId && date);

	const { data, isLoading, error } = useGet<{ incidents: Incident[] }>(
		open ? `/status-page/${url}/incidents/${monitorId}?date=${date}` : null,
		{},
		{ revalidateOnFocus: false, keepPreviousData: true }
	);

	// Written incidents are per page, not per monitor; a failure here just hides them
	const { data: written } = useGet<{ incidents: PublicStatusPageIncident[] }>(
		open ? `/status-page-incidents/public/${url}/day?date=${date}` : null,
		{},
		{ revalidateOnFocus: false, keepPreviousData: true }
	);
	const writtenIncidents = written?.incidents ?? [];
	const monitorIncidents = data?.incidents ?? [];

	return (
		<Dialog
			open={open}
			onClose={onClose}
			maxWidth="sm"
			fullWidth
		>
			<DialogTitle
				sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
			>
				{t("pages.statusPages.monitorsList.incidents.modalTitle", { date })} ({timezone})
				<IconButton
					onClick={onClose}
					size="small"
					aria-label="close"
				>
					<XIcon size={20} />
				</IconButton>
			</DialogTitle>
			<DialogContent>
				{writtenIncidents.length > 0 && date && (
					<Stack
						gap={SPACING.LG}
						mt={SPACING.SM}
						mb={SPACING.LG}
					>
						<Typography
							variant="overline"
							color={theme.palette.text.secondary}
						>
							{t("pages.statusPages.monitorsList.incidents.postedUpdates")}
						</Typography>
						{writtenIncidents.map((incident) => (
							<WrittenIncident
								key={incident.id}
								incident={incident}
								date={date}
								timezone={timezone}
								format={formatWritten}
							/>
						))}
					</Stack>
				)}
				{writtenIncidents.length > 0 && (
					<Typography
						variant="overline"
						color={theme.palette.text.secondary}
					>
						{t("pages.statusPages.monitorsList.incidents.monitorIncidents")}
					</Typography>
				)}
				{isLoading ? (
					<Typography mt={SPACING.SM}>
						{t("pages.statusPages.monitorsList.incidents.loading")}
					</Typography>
				) : error ? (
					<Typography
						mt={SPACING.SM}
						color={theme.palette.error.main}
					>
						{t("pages.statusPages.monitorsList.incidents.errorLoading")}
					</Typography>
				) : monitorIncidents.length > 0 ? (
					<Stack
						gap={SPACING.LG}
						mt={SPACING.SM}
					>
						{monitorIncidents.map((incident) => (
							<Stack
								key={incident.id}
								p={SPACING.LG}
								border={1}
								borderColor="divider"
								borderRadius={theme.shape.borderRadius}
							>
								<Typography
									variant="subtitle2"
									fontWeight="bold"
								>
									{incident.message ||
										(incident.statusCode ? `Error ${incident.statusCode}` : "Incident")}
								</Typography>
								<Typography
									variant="body2"
									color={theme.palette.text.secondary}
								>
									{formatTime(incident.startTime)} -{" "}
									{incident.endTime
										? formatTime(incident.endTime)
										: t("pages.statusPages.monitorsList.incidents.ongoing")}
								</Typography>
							</Stack>
						))}
					</Stack>
				) : (
					<Typography mt={SPACING.SM}>
						{writtenIncidents.length > 0
							? t("pages.statusPages.monitorsList.incidents.noMonitorIncidents")
							: t("pages.statusPages.monitorsList.incidents.noIncidents")}
					</Typography>
				)}
			</DialogContent>
		</Dialog>
	);
};
