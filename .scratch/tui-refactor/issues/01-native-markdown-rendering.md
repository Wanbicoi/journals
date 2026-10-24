# 01: Native OpenTUI Markdown Rendering for Projects and Reflections

**What to build:**
Rich terminal markdown rendering across the TUI using OpenTUI's native markdown engine instead of manual string manipulation or raw unformatted text dumps. In the Projects preview pane, full markdown formatting (headers, lists, inline formatting, code blocks) is rendered seamlessly when browsing project notes. In the Reflections cadence review pane, written reflection entries are rendered with full markdown styling rather than unparsed raw text.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] Project preview pane renders project notes using OpenTUI `<markdown />` component instead of line-by-line manual string splitting.
- [ ] Reflections review pane renders reflection content inside OpenTUI `<markdown />` component.
- [ ] Headings, lists, code spans, and blockquotes render with theme palette styles.
- [ ] Preserves text search highlighting compatibility where applicable.
