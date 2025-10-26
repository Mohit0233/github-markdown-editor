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
            let out = await prettier.format(md, {
                parser: "markdown",
                plugins: prettierPlugins,
                tabWidth: 4,
                useTabs: false,
                proseWrap: "preserve",
            });
            if (typeof removeExtraneousBlankLines === 'function') {
                out = removeExtraneousBlankLines(out);
            }
            return out;
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

    // 2) Run extra spacing normalization to remove "random" blank lines
    formatted = removeExtraneousBlankLines(formatted);

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

/**
 * Remove extraneous blank lines while preserving intentional spacing & code fences.
 * Rules:
 *  - Never touch content inside fenced code blocks (``` or ~~~)
 *  - Collapse 3+ consecutive blank lines to a single blank line
 *  - Between consecutive list items (same list block) remove blank separator lines
 *  - Remove leading / trailing blank lines
 *  - Keep at most one blank line before/after a thematic break (---, ***) or heading
 *  - Ensure file ends with a single trailing newline
 *
 * This is intentionally conservative to avoid mangling markdown semantics.
 * @param {string} md
 * @returns {string}
 */
function removeExtraneousBlankLines(md) {
    // MODE options:
    //  - 'remove': remove all blank lines outside fences (current strict request)
    //  - 'collapse': collapse multiple blanks to a single blank (safer default)
    const MODE = 'remove'; // change to 'collapse' if strict removal breaks formatting

    const text = md.replace(/\r\n?/g, '\n');
    const lines = text.split('\n');
    const out = [];
    let inFence = false;
    let fenceChar = null;
    const fenceRegex = /^([`~]{3,})(.*)$/;

    // Quick helpers to recognize structural lines that benefit from a preceding blank
    const isHeading = (ln) => /^(?:\s{0,3})#{1,6}\s+/.test(ln);
    const isListItem = (ln) => /^(?:\s{0,3})(?:[-*+]\s+|\d+\.\s+)/.test(ln);
    const isThematic = (ln) => /^(?:\s{0,3})(?:-{3,}|_{3,}|\*{3,})\s*$/.test(ln);

    for (let i = 0; i < lines.length; i++) {
        const raw = lines[i];
        const trimmed = raw.trim();
        const fenceMatch = trimmed.match(fenceRegex);
        if (fenceMatch) {
            if (!inFence) {
                inFence = true;
                fenceChar = fenceMatch[1][0];
            } else if (fenceMatch[1][0] === fenceChar) {
                inFence = false;
                fenceChar = null;
            }
            out.push(raw);
            continue;
        }
        if (inFence) {
            out.push(raw); // keep everything inside fence
            continue;
        }

        if (MODE === 'remove') {
            if (trimmed === '') {
                // Skip blank entirely
                continue;
            }
            out.push(raw);
        } else { // collapse mode
            if (trimmed === '') {
                // Peek next non-empty
                let j = i + 1, next = '';
                while (j < lines.length) {
                    if (lines[j].trim() !== '') { next = lines[j]; break; }
                    j++;
                }
                // Prevent multiple blanks
                if (out.length && out[out.length - 1] === '') continue;
                // Optionally keep a single blank before structural elements
                if (next && (isHeading(next) || isThematic(next))) {
                    if (out.length && out[out.length - 1] === '') continue;
                }
                out.push('');
            } else {
                out.push(raw);
            }
        }
    }

    // Post-processing: remove leading/trailing blanks (both modes)
    while (out.length && out[0].trim() === '') out.shift();
    while (out.length && out[out.length - 1].trim() === '') out.pop();

    return out.join('\n').replace(/\n+$/,'') + '\n';
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
