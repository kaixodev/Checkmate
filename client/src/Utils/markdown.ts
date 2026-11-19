import { marked } from "marked";
import DOMPurify from "dompurify";

/**
 * Render user-written Markdown (status page incident text) to HTML that is safe to
 * inject. Raw HTML in the source is allowed through marked, then DOMPurify strips
 * scripts, event handlers and javascript: URLs.
 */
export const renderMarkdown = (source: string): string => {
	const html = marked.parse(source, { async: false, gfm: true, breaks: true });
	return DOMPurify.sanitize(html, { USE_PROFILES: { html: true } });
};

// Links in incident text open in a new tab without handing the page a window.opener.
DOMPurify.addHook("afterSanitizeAttributes", (node) => {
	if (node.tagName === "A" && node.getAttribute("href")) {
		node.setAttribute("target", "_blank");
		node.setAttribute("rel", "noopener noreferrer");
	}
});
