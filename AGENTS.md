# Chat commands

If the user message contains any of these commands, consider them part of the user prompt and respond accordingly. There may be multiple commands in a single prompt.

- `:prd` – Use the structured workflow in `./_specs/create-prd.md` to help me create a PRD for a new feature.
- `:tasks` – Please generate tasks from the PRD using `./_specs/generate-tasks.md`. If not explicitly told which PRD to use, generate a list of PRDs under `./_specs/ai-tasks` (e.g., `0001-prd-[name].md`) and **always** ask the user to select/confirm the PRD file name before proceeding. Make sure to provide options in number lists so I can respond easily (if multiple options).
- `:execute` – Please process the task list using `./_specs/process-task-list.md`.
- `:test` – Analyze the attached file, provide a list of important unit tests that should be created for it. Then create Vitest unit tests for it in the same directory as the source file under a `__tests__` subfolder (e.g., `./functions/__tests__/X.test.ts`). Execute the test file afterward to ensure it is working. Optionally look at other tests in that directory for context and design patterns.
- `:think` – Think hard about the request before answering, as it is critical to be thorough and get it correct.
- `:uncertainty` – What parts of this prompt are unclear or ambiguous? What assumptions are you making? What additional information would be most critical for helping you execute this more accurately? Do not make code changes.

# Package Commands (Whitelisted)

Use these instead of underlying commands to avoid approval prompts:

- `npm run validate` - Validate JSON schemas and data integrity.
- `npx vitest --run` – Run unit tests with an optional filename.
- `npm run export` - Export Bible JSON to text/markdown formats.

# Scripts

- `./imports/importBibleVersesBB.ts` - Process raw Bible JSON into structured format with paragraphs, footnotes, and line breaks. Run with `npx ts-node ./imports/importBibleVersesBB.ts` when adding new Bible versions or updating data structure.

# Source File Structure

- `bible-books/` - Book metadata with `bible-book-schema.json` and `bible-books.json`
- `bible-versions/` - Version data with `bible-verses-schema.json`, `bible-versions-schema.json`, `bible-versions.json`, and version directories (e.g., `byz/`)
- `imports/bb/` - Raw Bible JSON files (e.g., `BibleDB.bibleVerses-byz.json`) and import scripts
- `exports/` - Generated output files in text and markdown formats
