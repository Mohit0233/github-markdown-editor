// Prettier Markdown Formatter
// This module provides markdown formatting using Prettier with custom post-processing


// Minimal inline paste + prettier formatting logic (HTML/Markdown/Plain) for paste-box
function setupInlinePasteFormatting(monacoEditor) {
    const box = document.getElementById("paste-box");
    if (!box) return;
    box.addEventListener("paste", (e) => {
        const cd = e.clipboardData;
        if (!cd) return;
        let md = cd.getData("text/markdown");
        let html = cd.getData("text/html");
        let plain = cd.getData("text/plain");
        let chosen = null;
        if (md && md.trim()) {
            chosen = md;
        } else if (html && html.trim()) {
            chosen = convertHtmlToMarkdown(html);
        } else if (plain) {
            chosen = plain;
        }
        if (!chosen) return;
        e.preventDefault();
        formatMarkdownInline(chosen).then((formatted) => {
            const existing = monacoEditor.getValue();
            let spacer =
                existing.length && !/\n\n$/.test(existing)
                    ? /\n$/.test(existing)
                        ? "\n"
                        : "\n\n"
                    : "";
            monacoEditor.setValue(existing + spacer + formatted);
            const model = monacoEditor.getModel();
            monacoEditor.setPosition(
                model.getPositionAt(monacoEditor.getValue().length)
            );
            monacoEditor.focus();
            box.textContent =
                "Paste rich content here (Markdown / HTML) – it will convert & insert into the editor.";
        });
    });
}

function convertHtmlToMarkdown(html) {
    if (typeof TurndownService === "undefined") return html;
    const td = new TurndownService({
        headingStyle: "atx",
        codeBlockStyle: "fenced",
        emDelimiter: "_",
    });
    const normalized = html
        .replace(/<div([^>]*)>/gi, "<p$1>")
        .replace(/<\/div>/gi, "</p>");
    return td.turndown(normalized);
}

async function formatMarkdownInline(md) {
    try {
        if (typeof prettier !== "undefined" && Array.isArray(prettierPlugins)) {
            return await prettier.format(md, {
                parser: "markdown",
                plugins: prettierPlugins,
                tabWidth: 4,
                useTabs: false,
                proseWrap: "preserve",
            });
        }
    } catch (err) {
        console.warn("Inline Prettier failed; using raw markdown.", err);
    }
    return md;
}

/**
 * Format markdown text using Prettier with custom post-processing
 * @param {string} md - The markdown text to format
 * @returns {string} - The formatted markdown text
 */
async function formatMarkdownWithPrettier(md) {
    // Check if Prettier and plugins are available
    if (typeof prettier === "undefined") {
        throw new Error(
            "Prettier is not loaded. Make sure the Prettier scripts are loaded before this function is called."
        );
    }

    if (
        typeof prettierPlugins === "undefined" ||
        !Array.isArray(prettierPlugins)
    ) {
        throw new Error(
            "Prettier plugins are not loaded. Make sure the markdown plugin is loaded."
        );
    }

    // 1) run Prettier to normalize fences, lists, code blocks, tabWidth etc.
    const prettierOptions = {
        parser: "markdown",
        plugins: prettierPlugins, // Array of plugins loaded via ES modules
        tabWidth: 4, // <-- your 4-space "tab"
        useTabs: false,
        proseWrap: "preserve", // or "always" / "never" depending on preference
    };

    // prettier.format may be async in browser when plugins are ESM; await result
    let formatted = await prettier.format(md, prettierOptions);

    if (typeof formatted !== "string") {
        console.warn("Prettier returned a non-string result:", formatted);
        formatted = String(formatted ?? "");
    }

    // 2) collapse >2 blank lines to a single blank line (harmless)
    formatted = formatted.replace(/\n{3,}/g, "\n\n");

    // Rely solely on Prettier output; no additional newline collapsing.
    console.log("Formatted markdown:", formatted);
    return formatted;
}

/**
 * Collapse newlines safely: naive state-machine that avoids fenced code / list lines
 * @param {string} text - The text to process
 * @returns {string} - The processed text with collapsed paragraph newlines
 */

/**
 * Initialize the format button click handler
 * @param {Object} editorInstance - The Monaco editor instance
 */
function initializeFormatButton(editorInstance) {
    const formatButton = document.getElementById("format-button");
    if (!formatButton) {
        return; // will be retried by autoInit logic below
    }
    // Remove any previous listener to avoid duplicates (idempotent init)
    formatButton.onclick = null;
    formatButton.addEventListener("click", async function () {
        try {
            if (!editorInstance) {
                console.warn("[prettier] Editor instance not ready.");
                return;
            }
            const currentContent = editorInstance.getValue();
            const formattedContent = await formatMarkdownWithPrettier(currentContent);
            if (formattedContent !== currentContent) {
                editorInstance.setValue(formattedContent);
            }
            updateFormatButton(true);
        } catch (error) {
            console.error("Failed to format markdown:", error);
            updateFormatButton(false);
        }
    });
}

/**
 * Update format button icon to show success or error
 * @param {boolean} success - Whether the formatting was successful
 */
function updateFormatButton(success) {
    const formatIcon = document.querySelector("#format-button svg");

    if (success) {
        // Temporarily show checkmark
        const originalHTML = formatIcon.innerHTML;
        formatIcon.innerHTML = `<polyline points="20 6 9 17 4 12"></polyline>`;

        // Reset after timeout
        setTimeout(() => {
            formatIcon.innerHTML = originalHTML;
        }, 500);
    }
}

// --- Auto initialization layer ---
(function autoInitPrettierButton(){
    // Attempt to locate global editor and format button without relying on layout position.
    let attempts = 0;
    const MAX_ATTEMPTS = 50; // ~5s @ 100ms
    const timer = setInterval(async () => {
        attempts++;
        const btn = document.getElementById('format-button');
        // Find editor variable: rely on global 'editor' or window.editor
        const ed = (typeof editor !== 'undefined') ? editor : window.editor;
        if (!btn || !ed) {
            if (attempts >= MAX_ATTEMPTS) clearInterval(timer);
            return; // keep waiting
        }
        // Ensure Prettier loaded; if not attempt lazy import
        if (typeof prettier === 'undefined' || !Array.isArray(prettierPlugins)) {
            try {
                const pm = await import('https://unpkg.com/prettier@3.6.2/standalone.mjs');
                const mdp = await import('https://unpkg.com/prettier@3.6.2/plugins/markdown.mjs');
                window.prettier = pm.default || pm;
                window.prettierPlugins = [mdp.default || mdp];
            } catch(e){
                console.warn('[prettier] Lazy load failed', e);
            }
        }
        initializeFormatButton(ed);
        clearInterval(timer);
    }, 100);
})();
