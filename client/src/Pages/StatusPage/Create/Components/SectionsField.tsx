import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useTheme } from "@mui/material/styles";
import { Plus, Trash2 } from "lucide-react";
import { useMemo } from "react";
import { useFieldArray, useFormContext, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";

import { Button, IconButton } from "@/Components/inputs";
import { FormMultiSelectField } from "@/Components/inputs/forms/FormMultiSelectField";
import { FormTextField } from "@/Components/inputs/forms/FormTextField";
import { MonitorSelectedRow } from "@/Components/monitors/MonitorSelectedRow";
import type { Monitor } from "@/Types/Monitor";
import { LAYOUT } from "@/Utils/Theme/constants";
import type { StatusPageFormData } from "@/Validation/statusPage";

interface SectionsFieldProps {
	monitors: Monitor[];
}

/**
 * Named groups of the page's monitors. Each section can only offer monitors that are
 * on the page and not already in another section.
 */
export const SectionsField = ({ monitors }: SectionsFieldProps) => {
	const theme = useTheme();
	const { t } = useTranslation();
	const { control } = useFormContext<StatusPageFormData>();
	const { fields, append, remove } = useFieldArray({ control, name: "sections" });
	const pageMonitorIds = useWatch({ control, name: "monitors" });
	const sections = useWatch({ control, name: "sections" });

	const pageMonitors = useMemo(
		() =>
			(pageMonitorIds ?? [])
				.map((id) => monitors.find((monitor) => monitor.id === id))
				.filter((monitor): monitor is Monitor => monitor !== undefined),
		[pageMonitorIds, monitors]
	);

	const optionsFor = (index: number) => {
		const taken = new Set(
			(sections ?? []).flatMap((section, i) => (i === index ? [] : section.monitors))
		);
		return pageMonitors.filter((monitor) => !taken.has(monitor.id));
	};

	return (
		<Stack spacing={theme.spacing(LAYOUT.MD)}>
			{fields.length === 0 && (
				<Typography color={theme.palette.text.secondary}>
					{t("pages.statusPages.form.sections.empty")}
				</Typography>
			)}
			{fields.map((field, index) => (
				<Stack
					key={field.id}
					spacing={theme.spacing(LAYOUT.SM)}
					p={theme.spacing(LAYOUT.MD)}
					border={1}
					borderColor={theme.palette.divider}
					borderRadius={`${theme.shape.borderRadius}px`}
				>
					<Stack
						direction="row"
						alignItems="flex-end"
						gap={theme.spacing(LAYOUT.XS)}
					>
						<Box flex={1}>
							<FormTextField
								name={`sections.${index}.name`}
								fieldLabel={t("pages.statusPages.form.sections.option.name.label")}
								placeholder={t("pages.statusPages.form.sections.option.name.placeholder")}
							/>
						</Box>
						<IconButton
							aria-label={t("pages.statusPages.form.sections.remove")}
							title={t("pages.statusPages.form.sections.remove")}
							onClick={() => remove(index)}
						>
							<Trash2 size={16} />
						</IconButton>
					</Stack>
					<FormMultiSelectField
						sortable
						name={`sections.${index}.monitors`}
						fieldLabel={t("pages.statusPages.form.sections.option.monitors.label")}
						placeholder={t("pages.statusPages.form.sections.option.monitors.placeholder")}
						options={optionsFor(index)}
						renderRow={(monitor) => <MonitorSelectedRow monitor={monitor} />}
					/>
				</Stack>
			))}
			<Stack alignItems="flex-start">
				<Button
					variant="outlined"
					startIcon={<Plus size={16} />}
					onClick={() => append({ name: "", monitors: [] })}
				>
					{t("pages.statusPages.form.sections.add")}
				</Button>
			</Stack>
		</Stack>
	);
};
