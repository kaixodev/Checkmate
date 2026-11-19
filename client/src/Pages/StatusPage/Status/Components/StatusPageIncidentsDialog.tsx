import Stack from "@mui/material/Stack";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { Check, Pencil, PinOff, Trash2 } from "lucide-react";
import { useState } from "react";
import { useTheme } from "@mui/material/styles";
import { useTranslation } from "react-i18next";

import {
	Dialog,
	Button,
	IconButton,
	TextField,
	Select,
	MenuItem,
} from "@/Components/inputs";
import { usePost, usePatch, useDelete } from "@/Hooks/UseApi";
import { useStatusPageIncidents } from "@/Hooks/useStatusPageIncidents";
import {
	STATUS_PAGE_INCIDENT_CONTENT_MAX,
	STATUS_PAGE_INCIDENT_STYLES,
	STATUS_PAGE_INCIDENT_TITLE_MAX,
	type StatusPageIncident,
	type StatusPageIncidentFormValues,
	type StatusPageIncidentStyle,
} from "@/Types/StatusPageIncident";
import type { StatusPage } from "@/Types/StatusPage";
import { formatDate } from "@/Utils/TimeUtils";
import { LAYOUT } from "@/Utils/Theme/constants";
import { typographyLevels } from "@/Utils/Theme/Palette";

const EMPTY_FORM: StatusPageIncidentFormValues = {
	title: "",
	content: "",
	style: "warning",
};

interface StatusPageIncidentsDialogProps {
	open: boolean;
	statusPage: StatusPage;
	onClose: () => void;
	onChanged: () => void;
}

export const StatusPageIncidentsDialog = ({
	open,
	statusPage,
	onClose,
	onChanged,
}: StatusPageIncidentsDialogProps) => {
	const theme = useTheme();
	const { t, i18n } = useTranslation();
	const { incidents, total, hasMore, isLoadingMore, loadMore, mutate } =
		useStatusPageIncidents(open ? statusPage.id : undefined);
	const { post, loading: posting } = usePost();
	const { patch, loading: patching } = usePatch();
	const { deleteFn, loading: deleting } = useDelete();

	const [form, setForm] = useState<StatusPageIncidentFormValues>(EMPTY_FORM);
	const [editingId, setEditingId] = useState<string | null>(null);
	const [armedDeleteId, setArmedDeleteId] = useState<string | null>(null);
	const [touched, setTouched] = useState(false);

	const titleError = touched && form.title.trim() === "";
	const contentError = touched && form.content.trim() === "";
	const busy = posting || patching || deleting;

	const formatTime = (value: string) =>
		formatDate(value, "dateTime", {
			timeZone: statusPage.timezone,
			locale: i18n.resolvedLanguage ?? "en",
			timeFormat: "24h",
		});

	const refresh = async () => {
		await mutate();
		onChanged();
	};

	const resetForm = () => {
		setForm(EMPTY_FORM);
		setEditingId(null);
		setTouched(false);
	};

	const submit = async () => {
		setTouched(true);
		if (form.title.trim() === "" || form.content.trim() === "") return;
		const res = editingId
			? await patch(`/status-page-incidents/${editingId}`, form)
			: await post(`/status-page-incidents/status-page/${statusPage.id}`, form);
		if (res) {
			resetForm();
			await refresh();
		}
	};

	const startEdit = (incident: StatusPageIncident) => {
		setEditingId(incident.id);
		setForm({ title: incident.title, content: incident.content, style: incident.style });
		setTouched(false);
	};

	const resolve = async (incident: StatusPageIncident) => {
		if (await post(`/status-page-incidents/${incident.id}/resolve`, {})) await refresh();
	};

	const unpin = async () => {
		if (await post(`/status-page-incidents/status-page/${statusPage.id}/unpin`, {}))
			await refresh();
	};

	// Delete takes two clicks instead of a second dialog
	const remove = async (incident: StatusPageIncident) => {
		if (armedDeleteId !== incident.id) {
			setArmedDeleteId(incident.id);
			return;
		}
		setArmedDeleteId(null);
		if (await deleteFn(`/status-page-incidents/${incident.id}`)) {
			if (editingId === incident.id) resetForm();
			await refresh();
		}
	};

	const statusLabel = (incident: StatusPageIncident) => {
		if (incident.pinned && incident.active)
			return t("pages.statusPages.incidents.manage.pinned");
		if (incident.active) return t("pages.statusPages.incidents.manage.active");
		return t("pages.statusPages.incidents.resolved");
	};

	const hasPinned = incidents.some((incident) => incident.pinned && incident.active);

	return (
		<Dialog
			open={open}
			title={t("pages.statusPages.incidents.manage.title")}
			content={t("pages.statusPages.incidents.manage.description")}
			onCancel={() => {
				resetForm();
				setArmedDeleteId(null);
				onClose();
			}}
			cancelText={t("common.buttons.close")}
			maxWidth="md"
			fullWidth
			framed={false}
		>
			<Stack gap={theme.spacing(LAYOUT.XL)}>
				<Stack
					gap={theme.spacing(LAYOUT.MD)}
					p={theme.spacing(LAYOUT.LG)}
					bgcolor={theme.palette.background.paper}
					border={`1px solid ${theme.palette.neutral.hairline}`}
					borderRadius={theme.shape.borderRadius}
				>
					<Typography variant="h2">
						{editingId
							? t("pages.statusPages.incidents.manage.editTitle")
							: t("pages.statusPages.incidents.manage.createTitle")}
					</Typography>
					<TextField
						fieldLabel={t("pages.statusPages.incidents.manage.fields.title")}
						required
						value={form.title}
						error={titleError}
						helperText={
							titleError
								? t("pages.statusPages.incidents.manage.errors.title")
								: undefined
						}
						slotProps={{ htmlInput: { maxLength: STATUS_PAGE_INCIDENT_TITLE_MAX } }}
						onChange={(e) => setForm({ ...form, title: e.target.value })}
					/>
					<TextField
						fieldLabel={t("pages.statusPages.incidents.manage.fields.content")}
						required
						multiline
						minRows={4}
						value={form.content}
						error={contentError}
						helperText={
							contentError
								? t("pages.statusPages.incidents.manage.errors.content")
								: t("pages.statusPages.incidents.manage.fields.contentHelp")
						}
						slotProps={{ htmlInput: { maxLength: STATUS_PAGE_INCIDENT_CONTENT_MAX } }}
						onChange={(e) => setForm({ ...form, content: e.target.value })}
					/>
					<Select
						fieldLabel={t("pages.statusPages.incidents.manage.fields.style")}
						value={form.style}
						onChange={(e) =>
							setForm({ ...form, style: e.target.value as StatusPageIncidentStyle })
						}
					>
						{STATUS_PAGE_INCIDENT_STYLES.map((style) => (
							<MenuItem
								key={style}
								value={style}
							>
								{t(`pages.statusPages.incidents.styles.${style}`)}
							</MenuItem>
						))}
					</Select>
					<Stack
						direction="row"
						gap={theme.spacing(LAYOUT.XS)}
						justifyContent="flex-end"
					>
						{editingId && (
							<Button
								variant="outlined"
								onClick={resetForm}
								disabled={busy}
							>
								{t("common.buttons.cancel")}
							</Button>
						)}
						<Button
							variant="contained"
							color="primary"
							loading={posting || patching}
							onClick={submit}
						>
							{editingId
								? t("common.buttons.save")
								: t("pages.statusPages.incidents.manage.post")}
						</Button>
					</Stack>
				</Stack>

				<Stack gap={theme.spacing(LAYOUT.MD)}>
					<Stack
						direction="row"
						justifyContent="space-between"
						alignItems="center"
					>
						<Typography variant="h2">
							{t("pages.statusPages.incidents.manage.listTitle", { count: total })}
						</Typography>
						{hasPinned && (
							<Button
								variant="outlined"
								startIcon={<PinOff size={16} />}
								onClick={unpin}
								disabled={busy}
							>
								{t("pages.statusPages.incidents.manage.unpin")}
							</Button>
						)}
					</Stack>
					{incidents.length === 0 && (
						<Typography color={theme.palette.text.secondary}>
							{t("pages.statusPages.incidents.manage.empty")}
						</Typography>
					)}
					{incidents.map((incident) => (
						<Stack
							key={incident.id}
							direction="row"
							alignItems="flex-start"
							justifyContent="space-between"
							gap={theme.spacing(LAYOUT.MD)}
							p={theme.spacing(LAYOUT.MD)}
							bgcolor={theme.palette.background.paper}
							border={`1px solid ${theme.palette.neutral.hairline}`}
							borderRadius={theme.shape.borderRadius}
						>
							<Box minWidth={0}>
								<Typography
									fontWeight={600}
									sx={{ overflowWrap: "anywhere" }}
								>
									{incident.title}
								</Typography>
								<Typography
									fontSize={typographyLevels.s}
									color={theme.palette.text.secondary}
								>
									{statusLabel(incident)} ·{" "}
									{t(`pages.statusPages.incidents.styles.${incident.style}`)} ·{" "}
									{formatTime(incident.createdAt)}
								</Typography>
							</Box>
							<Stack
								direction="row"
								gap={theme.spacing(LAYOUT.XXS)}
								flexShrink={0}
							>
								{incident.active && (
									<IconButton
										aria-label={t("pages.statusPages.incidents.manage.resolve")}
										title={t("pages.statusPages.incidents.manage.resolve")}
										onClick={() => resolve(incident)}
										disabled={busy}
									>
										<Check size={16} />
									</IconButton>
								)}
								<IconButton
									aria-label={t("pages.statusPages.incidents.manage.edit")}
									title={t("pages.statusPages.incidents.manage.edit")}
									onClick={() => startEdit(incident)}
									disabled={busy}
								>
									<Pencil size={16} />
								</IconButton>
								{armedDeleteId === incident.id ? (
									<Button
										variant="contained"
										color="error"
										onClick={() => remove(incident)}
										disabled={busy}
										onBlur={() => setArmedDeleteId(null)}
										autoFocus
									>
										{t("pages.statusPages.incidents.manage.confirmDelete")}
									</Button>
								) : (
									<IconButton
										aria-label={t("common.buttons.delete")}
										title={t("common.buttons.delete")}
										onClick={() => remove(incident)}
										disabled={busy}
									>
										<Trash2 size={16} />
									</IconButton>
								)}
							</Stack>
						</Stack>
					))}
					{hasMore && (
						<Box alignSelf="center">
							<Button
								variant="outlined"
								loading={isLoadingMore}
								onClick={loadMore}
							>
								{t("pages.statusPages.incidents.loadMore")}
							</Button>
						</Box>
					)}
				</Stack>
			</Stack>
		</Dialog>
	);
};
