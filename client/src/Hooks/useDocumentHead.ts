import { useEffect } from "react";

const ICON_SELECTOR = "link[rel~='icon']";

/**
 * Set the tab title and favicon while a component is mounted, then put back what
 * was there before. Undefined or empty values leave that part untouched.
 */
export const useDocumentHead = ({
	title,
	iconHref,
}: {
	title?: string | null;
	iconHref?: string | null;
}) => {
	useEffect(() => {
		if (!title) return;
		const previous = document.title;
		document.title = title;
		return () => {
			document.title = previous;
		};
	}, [title]);

	useEffect(() => {
		if (!iconHref) return;
		const existing = Array.from(
			document.querySelectorAll<HTMLLinkElement>(ICON_SELECTOR)
		);
		const saved = existing.map((link) => ({
			link,
			href: link.getAttribute("href"),
			type: link.getAttribute("type"),
		}));

		let created: HTMLLinkElement | null = null;
		if (existing.length === 0) {
			created = document.createElement("link");
			created.rel = "icon";
			document.head.appendChild(created);
		}

		for (const link of created ? [created] : existing) {
			link.href = iconHref;
			// A stale type (e.g. image/svg+xml) would make the browser skip a PNG icon
			link.removeAttribute("type");
		}

		return () => {
			created?.remove();
			for (const { link, href, type } of saved) {
				if (href === null) link.removeAttribute("href");
				else link.setAttribute("href", href);
				if (type !== null) link.setAttribute("type", type);
			}
		};
	}, [iconHref]);
};
