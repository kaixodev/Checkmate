import { Schema, model, type Types } from "mongoose";
import type { StatusPage } from "@/domain/status-pages/status-page.type.js";
import {
	DEFAULT_STATUS_PAGE_THEME,
	DEFAULT_STATUS_PAGE_THEME_MODE,
	DEFAULT_STATUS_PAGE_TIMEZONE,
	STATUS_PAGE_SECTION_NAME_MAX_LENGTH,
	StatusPageThemeModes,
	StatusPageThemes,
	StatusPageTypes,
} from "@/domain/status-pages/status-page.type.js";

interface StatusPageSectionDocument {
	name: string;
	monitors: Types.ObjectId[];
}

interface StatusPageLogoDocument {
	data: Buffer;
	contentType: string;
}

type StatusPageDocumentBase = Omit<
	StatusPage,
	"id" | "userId" | "teamId" | "monitors" | "subMonitors" | "originalMonitors" | "sections" | "logo" | "createdAt" | "updatedAt"
> & {
	monitors: Types.ObjectId[];
	subMonitors: Types.ObjectId[];
	originalMonitors?: Types.ObjectId[];
	sections?: StatusPageSectionDocument[];
	logo?: StatusPageLogoDocument | null;
};

interface StatusPageDocument extends StatusPageDocumentBase {
	_id: Types.ObjectId;
	userId: Types.ObjectId;
	teamId: Types.ObjectId;
	createdAt: Date;
	updatedAt: Date;
}

const logoSchema = new Schema<StatusPageLogoDocument>(
	{
		data: { type: Buffer },
		contentType: { type: String },
	},
	{ _id: false }
);

const sectionSchema = new Schema<StatusPageSectionDocument>(
	{
		name: { type: String, required: true, trim: true, maxlength: STATUS_PAGE_SECTION_NAME_MAX_LENGTH },
		monitors: [{ type: Schema.Types.ObjectId, ref: "Monitor" }],
	},
	{ _id: false }
);

const StatusPageSchema = new Schema<StatusPageDocument>(
	{
		userId: {
			type: Schema.Types.ObjectId,
			ref: "User",
			immutable: true,
			required: true,
		},
		teamId: {
			type: Schema.Types.ObjectId,
			ref: "Team",
			immutable: true,
			required: true,
		},
		type: {
			type: [String],
			required: true,
			default: ["uptime"],
			enum: StatusPageTypes,
		},
		companyName: {
			type: String,
			required: true,
			default: "",
		},
		url: {
			type: String,
			unique: true,
			required: true,
			default: "",
		},
		customDomain: {
			type: String,
			lowercase: true,
			trim: true,
		},
		timezone: {
			type: String,
			required: true,
			default: DEFAULT_STATUS_PAGE_TIMEZONE,
		},
		color: {
			type: String,
			default: "#4169E1",
		},
		monitors: [
			{
				type: Schema.Types.ObjectId,
				ref: "Monitor",
				required: true,
			},
		],
		subMonitors: [
			{
				type: Schema.Types.ObjectId,
				ref: "Monitor",
				required: true,
			},
		],
		sections: {
			type: [sectionSchema],
			default: [],
		},
		logo: {
			type: logoSchema,
			default: null,
		},
		isPublished: {
			type: Boolean,
			default: false,
		},
		showCharts: {
			type: Boolean,
			default: true,
		},
		showUptimePercentage: {
			type: Boolean,
			default: true,
		},
		showAdminLoginLink: {
			type: Boolean,
			default: false,
		},
		showInfrastructure: {
			type: Boolean,
			default: false,
		},
		customCSS: {
			type: String,
			default: "",
		},
		theme: {
			type: String,
			enum: StatusPageThemes,
			default: DEFAULT_STATUS_PAGE_THEME,
		},
		themeMode: {
			type: String,
			enum: StatusPageThemeModes,
			default: DEFAULT_STATUS_PAGE_THEME_MODE,
		},
	},
	{ timestamps: true }
);

StatusPageSchema.index(
	{ customDomain: 1 },
	{
		unique: true,
		partialFilterExpression: { customDomain: { $type: "string" } },
	}
);

const StatusPageModel = model<StatusPageDocument>("StatusPage", StatusPageSchema);

export type { StatusPageDocument, StatusPageLogoDocument, StatusPageSectionDocument };
export { StatusPageModel };
export default StatusPageModel;
