# EGP BB Format Documentation

## Overview

The **EGP BB (BibleBrain) Format** is a legacy text-based markup system used for encoding Bible verses with lexical metadata, formatting, and structural information. This document provides comprehensive documentation of ALL BB format features discovered through analysis of actual export files, comparison with Graphai JSON structures, and serves as the authoritative reference for implementing bidirectional conversion.

---

## BB Format Structure

### Core Components

BB format consists of three primary parts:

```typescript
interface BBVerse {
  text: string; // Main content with BB markup tags
  paragraphs?: number[]; // Character positions where paragraphs begin (0-indexed)
  footnotes?: { text: string; type?: string }[]; // Footnote content (referenced by ° marker)
}
```

### Complete Tag Inventory

BB uses bracket-based tags similar to BBCode. Here is the COMPLETE list of all tag types found in actual data:

#### 1. **Script Tags** (Language/Writing System)

- `[greek]text[/greek]` - Greek text (script: "G")
- `[hebrew]text[/hebrew]` - Hebrew text (script: "H") [rare, mostly implicit via Strong's prefix]

**Critical Pattern for Greek (BYZ version):**

```
[greek]Ἐν[/greek] [strongs id="g1722" m="PREP" /]
[greek]ἀρχῇ[/greek] [strongs id="g746" m="N-DSF" /]
[greek]λόγος,[/greek] [strongs id="g3056" m="N-NSM" /]
```

**Key Observations:**

- Punctuation (commas, periods) are INSIDE the `[/greek]` closing tag
- Space appears AFTER `[/greek]` and BEFORE `[strongs`
- Text and Strong's tag are always separate elements in Greek versions

#### 2. **Formatting Tags** (Text Styling)

- `[i]text[/i]` - Italic text (marks: ["i"])
- `[b]text[/b]` - Bold text (marks: ["b"])
- `[sc]text[/sc]` - Small caps (marks: ["sc"])
- `[red]text[/red]` - Words of Christ, red lettering (marks: ["woc"])

**Example:**

```
[red]What are you looking for?[/red]
```

#### 3. **Lexical Tags** (Strong's & Morphology)

Self-closing tags with attributes - THE MOST COMPLEX PART OF BB FORMAT:

```
[strongs id="gNNNN" /]                           // Greek, no morphology
[strongs id="gNNNN" tvm="code" /]                // Greek with TVM morphology
[strongs id="gNNNN" tvm="code1" tvm2="code2" /]  // Greek with DUAL TVM (rare!)
[strongs id="gNNNN" m="code" /]                  // Greek with Robinson morphology (BYZ)
[strongs id="hNNNN" /]                           // Hebrew, no morphology
[strongs id="hNNNN" tvm="NNNN" /]                // Hebrew with numeric TVM
```

**CRITICAL DISCOVERY - TVM2 Attribute:**

In rare cases (found in exports/BibleDB.bibleVerses-kjv.json), Strong's tags can have BOTH `tvm` AND `tvm2` attributes:

```
[strongs id="g0373" tvm="PresMidInd" tvm2="PresMidImpr" /]
[strongs id="g4100" tvm="PresActInd" tvm2="PresActImpr" /]
[strongs id="g2476" tvm="ImpfActInd" tvm2="PerfActInd" /]
```

This indicates **morphological ambiguity** where a word form could be parsed multiple ways (e.g., Indicative OR Imperative mood).

**Attribute Reference:**

| Attribute | Usage            | Format                              | Example                     |
| --------- | ---------------- | ----------------------------------- | --------------------------- |
| `id`      | Required         | `g` or `h` + 4 digits (zero-padded) | `g1722`, `h3068`, `g0001`   |
| `m`       | Greek only (BYZ) | Robinson morphology code            | `N-DSF`, `V-IAI-3S`, `PREP` |
| `tvm`     | Greek or Hebrew  | Morphology code                     | `ImpfInd`, `8804`           |
| `tvm2`    | Extremely rare   | Secondary morphology                | `PresMidImpr`               |

**Greek TVM Values (sample):**

- Tense: `Pres`, `Impf`, `Aor`, `Aor2`, `Perf`, `Perf2`, `Plupf`, `Fut`
- Voice: `Act`, `Mid`, `Pas`, `MidDep`, `PasDep`, `MidPasDep`
- Mood: `Ind`, `Subj`, `Impr`, `Inf`, `Ptc`, `Opt`
- Combined: `PresActInd`, `Aor2MidDepInd`, `PerfPasPtc`

**Hebrew TVM Values:**

- Numeric codes: `8804`, `8685`, `8802`, `8799`, `8734`, `8765`, `8779`, `8798`, `8787`, `8688`, `8689`, `8801`, `8762`, `8686`

**Robinson Morphology Codes (BYZ - exhaustive list found):**

Person-Number-Gender-Case patterns:

- **Nouns:** `N-NSM`, `N-GSM`, `N-DSM`, `N-ASM`, `N-NSF`, `N-GSF`, `N-DSF`, `N-ASF`, `N-NSN`, `N-GSN`, `N-DSN`, `N-ASN`, `N-NPM`, `N-GPM`, `N-DPM`, `N-APM`, `N-NPF`, `N-GPF`, `N-DPF`, `N-APF`, `N-NPN`, `N-GPN`, `N-DPN`, `N-APN`
- **Verbs:** `V-{tense}-{voice}-{mood}-{person}{number}` (e.g., `V-IAI-3S`, `V-2ADI-3S`, `V-PAI-3P`)
- **Articles:** `T-NSM`, `T-GSM`, `T-DSM`, `T-ASM`, `T-NSF`, `T-GSF`, `T-DSF`, `T-ASF`, etc.
- **Prepositions:** `PREP`
- **Conjunctions:** `CONJ`, `CONJ-N`
- **Adverbs:** `ADV`, `ADV-I`
- **Adjectives:** `A-NSM`, `A-GSM`, `A-DSM`, `A-ASM`, etc.
- **Pronouns:** `P-NSM`, `P-GSM`, `P-DSM`, `P-ASM`, `P-1GS`, `P-1NS`, `P-2NS`, etc.
- **Demonstratives:** `D-NSM`, `D-GSM`, `D-DSM`, `D-ASM`, etc.
- **Relatives:** `R-NSM`, `R-GSM`, `R-ASM`, etc.
- **Particles:** `PRT`, `PRT-N`
- **Foreign:** `HEB`, `ARAM`
- **Other:** `K-NPM`, `F-2GSM`, `F-3ASM`, `I-NSM`, `X-NSM`

**Strong's Tag Placement:**

Strong's tags appear after the word they reference. Spaces are just part of the normal text flow.

KJVS example (English):

```
In [strongs id="g1722" /] the beginning [strongs id="g746" /]
```

This becomes in Graphai:

```javascript
[
  { text: "In", strong: "G1722" },
  { text: " the beginning", strong: "G746" },
];
```

BYZ example (Greek + Strong's):

```
[greek]λόγος,[/greek] [strongs id="g3056" m="N-NSM" /]
```

This becomes in Graphai:

```javascript
{ text: "λόγος,", script: "G", strong: "G3056", morph: "N-NSM" }
```

**Multiple Consecutive Strong's:**

```
the Benjamite [strongs id="h1121" /] [strongs id="h1145" /]
```

In Graphai, both get merged with available text or become separate elements.

#### 4. **Subtitle Markers** (Psalm Inscriptions)

**Format:** `«text»` (guillemet quotation marks U+00AB and U+00BB)

**Usage:** Psalm titles/inscriptions, embedded at the start of verse text

**Example from Psalm 7:1:**

```
«Shiggaion [strongs id="h7692" /] of David [strongs id="h1732" /], which he sang [strongs id="h7891" tvm="8804" /] unto the LORD [strongs id="h3068" /], concerning the words [strongs id="h1697" /] of Cush [strongs id="h3568" /] the Benjamite [strongs id="h1121" /] [strongs id="h1145" /].» O LORD [strongs id="h3068" /] my God...
```

**Key Points:**

- Subtitle can contain Strong's tags (fully inline)
- Ends with `»` followed by space, then verse text continues
- NOT a separate BB tag type - just special characters
- In Graphai: Should be parsed as `{ subtitle: [...] }` structure

#### 5. **Italicized/Supplied Words** (KJVS only)

**Format:** `[word]` - plain square brackets in the text itself (NOT BB markup)

**Purpose:** Words added by KJV translators for English readability, not in original languages

**Examples:**

```
In the beginning [was] the Word
He [was] in the world
Sleep on now, and take [your] rest
Lest he tear my soul like a lion, rending [it] in pieces
```

**CRITICAL:** These look like BB tags but are NOT - they are literal square bracket characters that appear in the English text. They should be preserved AS-IS in conversions.

**In Graphai:** These remain as plain text `"[was]"`, `"[it]"`, etc.

#### 6. **Structural Markers**

**Paragraphs:**

- Encoded as `paragraphs: [0, 51, 156]` array (character indices for paragraph breaks)
- **Position 0** = paragraph starts at beginning of verse
- **Non-zero values** = character index of the SPACE to replace with paragraph break
- Bible verses are arrays of verse objects; `paragraph` marks breaks WITHIN a single verse

**Graphai Mapping:**

```javascript
// BB - 0 = verse starts with paragraph, 51 = space index for break
{
  "text": "Yahweh God said to the woman, “What have you done?” The woman said...",
  "paragraphs": [0, 51]
}

// Graphai - paragraph: true marks where breaks occur within the verse
[
  { "text": "Yahweh God said to the woman, “What have you done?”", "paragraph": true },
  { "text": "The woman said...", "paragraph": true }
]
```

**Line Breaks:**

- Newline character `\n` in text string
- In Graphai: `{ break: true }` on the element

**Footnotes:**

- Marker: `°` (degree symbol U+00B0) in text
- Content stored in separate `footnotes` array
- Multiple `°` markers reference footnotes in sequential order

```json
{
  "text": "word° more text° end",
  "footnotes": [
    { "text": "first note", "type": "trn" },
    { "text": "second note" }
  ]
}
```

**Footnote Types:**

- `"trn"` - Translation note
- `"var"` - Textual variant
- `"xrf"` - Cross-reference
- `"map"` - Map reference (rare)
- `undefined` - General study note (default)

---

## BB Format Variations

### 1. WEBP (World English Bible)

**Attributes:**

- `id` - Strong's number (lowercase g/h prefix + number)
- `m` - Morphology code (Robinson format for Greek)
- `tvm` - Tense/Voice/Mood code (alternate morphology format)

**Example:**

Plain English text with Strong's numbers and optional formatting.

**Features:**

- English text only
- Strong's tags: `[strongs id="gNNNN" /]` (Greek) or `[strongs id="hNNNN" /]` (Hebrew)
- Red letter text: `[red]...[/red]` for Jesus' words
- Footnotes with `°` marker and types (trn, var, xrf)
- NO morphology codes typically

**Sample:**

```json
{
  "text": "In [strongs id=\"g1722\" /] the beginning [strongs id=\"g746\" /] was the Word"
}
```

### 2. KJVS (King James Version with Strong's)

English text with Strong's numbers AND morphology codes (TVM).

**Features:**

- English text only
- Strong's tags with TVM: `[strongs id="gNNNN" tvm="code" /]`
- Italicized/supplied words: `[was]`, `[it]`, etc. (literal square brackets)
- Hebrew TVM codes are numeric: `tvm="8804"`
- Greek TVM codes are abbreviations: `tvm="PresActInd"`
- **TVM2 attribute exists** (rare ambiguous forms)
- Psalm subtitles with guillemets: `«...»`

**Sample:**

```json
{
  "text": "In [strongs id=\"g1722\" /] the beginning [strongs id=\"g746\" /] was [strongs id=\"g2258\" tvm=\"ImpfInd\" /] the Word [strongs id=\"g3056\" /]"
}
```

### 3. BYZ/GRKS (Byzantine Greek with Robinson Morphology)

Greek text with Strong's numbers and detailed Robinson morphology codes.

**Features:**

- Greek text in `[greek]...[/greek]` tags
- Punctuation INSIDE `[/greek]` closing tag
- Space AFTER `[/greek]`, then Strong's tag
- Strong's with Robinson morph: `[strongs id="gNNNN" m="code" /]`
- Detailed morphology codes (see exhaustive list above)
- Footnotes for textual variants (type: "var")

**Sample:**

```json
{
  "text": "[greek]Ἐν[/greek] [strongs id=\"g1722\" m=\"PREP\" /] [greek]ἀρχῇ[/greek] [strongs id=\"g746\" m=\"N-DSF\" /] [greek]ἦν[/greek] [strongs id=\"g1510\" m=\"V-IAI-3S\" /]"
}
```

---

## Graphai Schema Comparison

| Feature                 | BB Format                             | Graphai Format                     | Notes                                     |
| ----------------------- | ------------------------------------- | ---------------------------------- | ----------------------------------------- |
| **Plain Text**          | String in `.text`                     | String or `{ text: "..." }`        | Graphai more flexible                     |
| **Greek Text**          | `[greek]Λόγος[/greek]`                | `{ text: " Λόγος", script: "G" }`  | Note leading space in Graphai!            |
| **Hebrew Text**         | `[hebrew]...[/hebrew]`                | `{ text: "...", script: "H" }`     | Rare in BB                                |
| **Italic**              | `[i]text[/i]`                         | `{ text: "text", marks: ["i"] }`   |                                           |
| **Bold**                | `[b]text[/b]`                         | `{ text: "text", marks: ["b"] }`   |                                           |
| **Small Caps**          | `[sc]text[/sc]`                       | `{ text: "text", marks: ["sc"] }`  |                                           |
| **Words of Christ**     | `[red]text[/red]`                     | `{ text: "text", marks: ["woc"] }` | Color → semantic mark                     |
| **Strong's Number**     | `id="g1234"` (lowercase)              | `strong: "G1234"` (uppercase)      | Case conversion required, no zero-padding |
| **Morphology (Greek)**  | `m="D-NSM"` or `tvm="PresActInd"`     | `morph: "D-NSM"`                   | Graphai uses single morph field           |
| **Morphology (Hebrew)** | `tvm="8804"`                          | `morph: "8804"`                    | Numeric codes preserved                   |
| **Morphology Dual**     | `tvm="..." tvm2="..."`                | `morph: "..."` (tvm only)          | **TVM2 is LOST** in Graphai!              |
| **Paragraphs**          | `paragraphs: [0, 156]` (char offsets) | `paragraph: true` on element       | Position-based → marker-based             |
| **Line Breaks**         | `\n` in text                          | `break: true` on element           | Structural conversion                     |
| **Footnotes**           | `°` + separate array                  | `foot: { content: [...] }` inline  | Externalized → inline                     |
| **Subtitles**           | `«text»` (guillemet chars)            | `{ subtitle: [...] }`              | Character markers → structure             |
| **Headings**            | ❌ Not supported                      | `{ heading: [...] }`               | Graphai-only feature                      |
| **Supplied Words**      | `[was]` literal brackets              | `"[was]"` in text string           | Preserved as-is                           |

**Key Concept: Spaces in Text Elements**

Spaces aren't special - they're just part of the text. Tags wrap their content, and adjacent spaces belong to the plain text elements.

```javascript
// BB
"word [greek]Λόγος[/greek] word"[
  // Graphai - spaces are in the plain text elements
  ("word ", // Ends with space
  { text: "Λόγος", script: "G" }, // No spaces
  " word") // Starts with space
];
```

Same principle for Strong's tags:

```javascript
// BB
"In [strongs id="g1722" /] the beginning"

// Graphai - second element starts with space
[
  { text: "In", strong: "G1722" },
  { text: " the beginning", strong: "G746" }
]
```

---

## BB → Graphai Conversion Logic

### Critical Parsing Rules

1. **Tag Detection:** Use regex `/\[([^\]]+)\]/g` to find all `[...]` tags
2. **Tag Classification:**
   - Ends with `/` → Self-closing (strongs)
   - Starts with `/` → Closing tag
   - Otherwise → Opening tag
3. **Supplied Words:** If tag doesn't match known types, treat as literal text
4. **Footnote Markers:** Process `°` symbols and correlate with footnotes array
5. **Subtitle Markers:** Detect `«` at start, parse until `»`

### Whitespace Handling (CRITICAL!)

**Multi-pass cleanup required:**

1. **Pass 1:** Parse all tags → intermediate element array
2. **Pass 2:** Merge Strong's tags into preceding text elements
3. **Pass 3:** Trim spaces around Greek/Hebrew script tags
4. **Pass 4:** Remove spaces between consecutive Strong's-only elements
5. **Pass 5:** Collapse multiple consecutive spaces to single space
6. **Pass 6:** Handle paragraph position splitting
7. **Pass 7:** Apply paragraph markers

### Greek Text Pattern (BYZ)

### 4. **Structural Markers**

- **Paragraphs:** Encoded as character position array

  ```json
  { "text": "...", "paragraphs": [0, 156, 312] }
  ```

- **Line Breaks:** Newline character `\n` in text

- **Footnotes:** Degree symbol `°` in text, with content in separate array
  ```json
  {
    "text": "some text° more text",
    "footnotes": [{ "text": "footnote content here" }]
  }
  ```

---

## BB → Graphai Conversion Logic

### Critical Parsing Rules

```
[greek]Οὗτος[/greek] [strongs id="g3778" m="D-NSM" /]
```

Converted to Graphai (note the leading space in text!):

```javascript
{ text: " Οὗτος", script: "G", strong: "G3778", morph: "D-NSM" }
```

**Why the leading space?** Because in BB, there's a space AFTER `[/greek]` and before `[strongs`. When we merge them, that space becomes part of the Greek text element.

### Subtitle Handling

Guillemet markers `«...»` should be converted to `{ subtitle: [...] }` structure:

```
// BB
«Shiggaion [strongs id="h7692" /] of David [strongs id="h1732" /]...»

// Graphai
{
  subtitle: [
    { text: "Shiggaion", strong: "H7692" },
    { text: " of David", strong: "H1732" },
    ...
  ]
}
```

The `»` marker indicates end of subtitle, rest is normal verse content.

### Paragraph Position Calculation (BB → Graphai)

**CRITICAL:** Paragraphs array contains indices where paragraph breaks occur in the PLAIN TEXT.

- **Position 0:** Special value meaning "verse starts with a paragraph" (first element gets `paragraph: true`)
- **Non-zero positions:** Character index in the plain text where a paragraph break occurs (always at a space)

Example from actual test:

```json
{
  "text": "Yahweh God said to the woman, “What have you done?” The woman said, “The serpent deceived me, and I ate.”",
  "paragraphs": [0, 51]
}
```

This means:

- `0`: First element gets `paragraph: true`
- `51`: Character at index 51 (the space after "done?") is where the second paragraph break occurs

**When converting BB → Graphai:**

1. Parse text to plain string (ignoring BB tags initially)
2. For position `0`: Mark first element with `paragraph: true`
3. For non-zero positions: Find that character index in plain text, split there, mark next element with `paragraph: true`
4. The split typically happens at a space character between sentences

### TVM2 Handling

TVM2 attributes indicate morphological ambiguity where a word form could be parsed multiple ways. Both codes are preserved by concatenating with "/" separator in the `morph` field.

**Example:**

```javascript
// BB with TVM2
[strongs id="g2476" tvm="ImpfActInd" tvm2="PerfActInd" /]

// Graphai
{ text: "there standeth one", strong: "G2476", morph: "ImpfActInd/PerfActInd" }
```

---

## Graphai → BB Conversion Logic

### Unsupported Features (Must Be Dropped)

When converting Graphai → BB:

- `{ heading: [...] }` - **Dropped** (not supported in BB)
- `{ subtitle: [...] }` - **Convert to guillemets** `«...»` if possible
- Wrapper objects like `{ paragraph: [...] }` - Unwrapped, content processed

**Subtitle Conversion:** Guillemets can only appear at verse start. If subtitle is mid-verse, either:

1. Drop it with warning
2. Prepend to verse start
3. Convert to plain text with brackets

### Strong's Number Normalization

Graphai uses UPPERCASE (e.g., `G1234`), BB uses lowercase (e.g., `g1234`):

```javascript
// Graphai
{ strong: "G1234" }

// BB
[strongs id="g1234" /]
```

**IMPORTANT:** Do NOT zero-pad Strong's numbers. Use them as-is:

- `G1` → `g1`
- `G746` → `g746`
- `G1234` → `g1234`

Some legacy data has zero-padding (e.g., `g0746`), but when generating BB format, do not add padding.

### Morphology Attribute Selection

Critical decision based on version type:

- **Hebrew text** (`script: "H"` or Strong's starts with `H`): Use `tvm` attribute
- **Greek with Robinson codes** (BYZ style): Use `m` attribute
- **Greek with TVM codes** (KJVS style): Use `tvm` attribute

```javascript
// Greek BYZ style
{ script: "G", morph: "D-NSM" } → [strongs id="gXXXX" m="D-NSM" /]

// Greek KJVS style (if morph looks like TVM)
{ morph: "PresActInd" } → [strongs id="gXXXX" tvm="PresActInd" /]

// Hebrew
{ script: "H", morph: "8804" } → [strongs id="hXXXX" tvm="8804" /]
```

**Heuristic to detect TVM vs Robinson:**

- If morph contains `-` (hyphen), it's Robinson: `N-DSF`, `V-IAI-3S`
- If morph is all caps with no hyphens: `PREP`, `CONJ`, `ADV`
- If morph has mixed case: `PresActInd`, `Aor2MidDepInd` - it's TVM
- If morph is 4 digits: `8804` - it's Hebrew TVM

### Text Reconstruction

Building BB text from Graphai is straightforward - concatenate text and wrap tagged content:

For English with Strong's:

```javascript
// Graphai
[
  { text: "In", strong: "G1722" },
  { text: " the beginning", strong: "G746" },
];

// BB - just concatenate, adding Strong's tags after each text
('In [strongs id="g1722" /] the beginning [strongs id="g746" /]');
```

For Greek with Strong's:

```javascript
// Graphai
{ text: "Οὗτος", script: "G", strong: "G3778", morph: "D-NSM" }

// BB - wrap Greek text in script tag, add Strong's tag after
"[greek]Οὗτος[/greek] [strongs id=\"g3778\" m=\"D-NSM\" /]"
```

**Simple rule:** Tags wrap their content. Spaces are just part of the text being concatenated.

### Footnote Externalization

Graphai stores footnotes inline, BB externalizes them:

```javascript
// Graphai
{ text: "word", foot: { type: "trn", content: [...] } }

// BB
{
  text: "word°",
  footnotes: [{ text: "...", type: "trn" }]
}
```

**Algorithm:**

1. Scan content for elements with `foot` property
2. Replace foot with `°` marker in text
3. Recursively convert `foot.content` to BB format
4. Add to footnotes array
5. Maintain footnote order (sequential `°` markers)

### Paragraph Position Calculation (Graphai → BB)

Must calculate character indices for `paragraphs` array based on PLAIN TEXT positions:

```javascript
// Graphai - two paragraph breaks in this verse
[
  { text: "Yahweh God said to the woman, “What have you done?”", paragraph: true },
  { text: "The woman said, “The serpent deceived me, and I ate.”", paragraph: true }
]

// BB - position 0 for first, position 51 is where the space/break occurs
{
  text: "Yahweh God said to the woman, “What have you done?” The woman said, “The serpent deceived me, and I ate.”",
  paragraphs: [0, 51]
}
```

**Algorithm:**

1. Build PLAIN TEXT by concatenating text from all elements (without BB tags)
2. Track character position as you concatenate
3. When encountering `paragraph: true`:
   - If it's the first element: Add `0` to paragraphs array
   - Otherwise: The current position is where this paragraph starts (typically right after a space from previous element)
4. Example: "text1 text2" - if text2 has `paragraph: true`, the break is at position where "text2" starts
5. The paragraph indices reference positions in the PLAIN TEXT, not the final BB tagged text

**Algorithm:**

1. Build BB text string incrementally
2. Track cumulative character count
3. When encountering `paragraph: true`, record current position
4. Continue building string
5. Output `paragraphs` array with recorded positions

**Position 0 handling:** If first element has `paragraph: true`, position 0 is recorded.

---

## Known Quirks & Edge Cases

### 1. **Script Tags Are Just Wrappers**

Script tags (`[greek]...[/greek]`, `[hebrew]...[/hebrew]`) simply wrap the Greek/Hebrew text - nothing more.

**Example BB:**

```
word [greek]Λόγος[/greek] word
```

**In Graphai (3 separate elements):**

```javascript
[
  "word ", // Plain text ending with space
  { text: "Λόγος", script: "G" }, // Greek text (no spaces)
  " word", // Plain text starting with space
];
```

**Key point:** Spaces are part of the surrounding plain text elements, not special spacing rules. The tag wraps exactly what's Greek/Hebrew, nothing more.

### 2. **Strong's Tags Without Preceding Text**

Some verses start with a Strong's tag or have consecutive tags:

```
[strongs id="g1722" /] the beginning
the Benjamite [strongs id="h1121" /] [strongs id="h1145" /]
```

In Graphai:

- First case: Strong's element has empty text or is merged with following text
- Second case: Second Strong's gets space or empty text

### 3. **Nested Formatting Tags**

BB supports nested tags:

```
[i][red]italic red text[/red][/i]
```

Graphai merges: `{ text: "italic red text", marks: ["i", "woc"] }`

**Order doesn't matter in Graphai `marks` array.**

### 4. **Supplied Words in Italics**

KJVS has literal `[was]` in text. Don't confuse with BB tags:

```
He [was] in the world   // Literal brackets, not a BB tag
```

**Detection:** If tag name is a single lowercase word with no attributes, it's likely supplied text, not a BB tag.

### 5. **Punctuation in Greek Tags**

Punctuation is INSIDE the `[/greek]` tag:

```
[greek]λόγος,[/greek]   // Comma inside tag
[greek]θεόν.[/greek]    // Period inside tag
```

Don't strip punctuation thinking it's separate!

### 6. **Empty Paragraphs**

If `paragraphs: [0]`, the first element gets `paragraph: true` marker.

### 7. **Footnote Content Recursion**

Footnote content can itself contain BB markup (Greek text, Strong's tags, formatting):

```json
{
  "footnotes": [
    {
      "text": "The word [greek]κατέλαβεν[/greek] can mean...",
      "type": "trn"
    }
  ]
}
```

Must recursively parse footnote text using same BB parser!

### 8. **Unrecognized Tags**

If a tag doesn't match known patterns, treat as literal text:

```
Some [custom] text     // Not a known BB tag
```

Preserve `[custom]` as plain text in output.

### 9. **Guillemet Subtitles Mid-Verse**

If `«...»` appears mid-verse (unlikely but possible), handle carefully:

- May indicate subtitle at start, rest is verse
- Or could be quoted text (rare)

**Best practice:** Only recognize guillemets at verse start.

### 10. **TVM2 Loss**

When converting BB → Graphai → BB, TVM2 attribute is **LOST** because Graphai has single `morph` field. This is a **known limitation**.

Round-trip: `tvm="X" tvm2="Y"` → `morph: "X"` → `tvm="X"` (Y is lost)

### 11. **Curly Quotes in Bible Text**

**CRITICAL:** Bible text uses curly quotes (U+201C " and U+201D "), NOT straight quotes (U+0022 ").

Examples:

- ✓ Correct: `"What have you done?"` (curly quotes)
- ✗ Wrong: `"What have you done?"` (straight quotes)

When editing this documentation or test files, ensure text editors and tools preserve the correct Unicode quote characters. Some editors may auto-convert quotes - verify the actual bytes are U+201C and U+201D.

---

## Conversion Testing Strategy

### Round-Trip Tests

For each BB variation (WEBP, KJVS, BYZ/GRKS):

1. **Simple cases:**

   - Plain text only
   - Single Strong's tag
   - Single formatting tag
   - Single script tag

2. **Complex cases:**

   - Greek text + Strong's + morphology
   - Multiple formatting marks
   - Footnotes with nested markup
   - Paragraphs with various positions
   - Line breaks

3. **Round-trip validation:**

   ```
   BB → Graphai → BB should produce identical result
   ```

4. **Graphai features:**
   - Headings (should drop on export)
   - Unsupported content (should drop gracefully)

### Test Data Sources

- `BibleDB.bibleVerses-WEBP-John.json` - English examples
- `BibleDB.bibleVerses-KJVS-John.json` - English with TVM
- `BibleDB.bibleVerses-BYZ-John.json` - Greek examples

---

## Implementation Notes

### Parsing Strategy

BB parser must:

1. Use regex to find all `[...]` tags
2. Distinguish between opening, closing, and self-closing tags
3. Handle nested tag structures
4. Track footnote markers (`°`) and correlate with footnote array
5. Apply paragraph markers after text assembly

### Cleanup Phases

The existing `convertBBToGraphai.ts` uses multi-pass cleanup:

1. **Pass 1:** Convert text before Strong's to objects
2. **Pass 2:** Remove whitespace before Strong's-only objects
3. **Pass 3:** Trim spaces around script/Strong's tags
4. **Pass 4:** Merge Strong's into preceding text objects
5. **Pass 5:** Normalize spaces (collapse multiples)
6. **Pass 6:** Remove spaces between consecutive Strong's objects
7. **Pass 7:** Trim spaces after footnotes
8. **Pass 8:** Handle paragraph splitting and marking

This multi-pass approach handles complex interactions between tags, whitespace, and structural markers.

### Export Strategy

`convertGraphaiToBB` must:

1. Recursively process content arrays
2. Track character positions for paragraph array
3. Extract footnotes into separate array
4. Convert marks array to nested BB tags
5. Normalize Strong's numbers to lowercase
6. Choose correct morphology attribute (m vs tvm)

---

## Known Limitations & Edge Cases

### Round-Trip Fidelity Issues

1. **Strong's Number Leading Zeros**

   - **Issue:** BB export strips leading zeros from Strong's numbers (e.g., `g0746` → `g746`)
   - **Impact:** Round-trip `BB → Graphai → BB` will normalize Strong's numbers without leading zeros
   - **Rationale:** Matches target BB format specification for cleaner output
   - **Workaround:** None required - this is intentional normalization

2. **Unsupported Graphai Features**
   - **Issue:** Headings, subtitles, and other Graphai-only features are silently dropped on BB export
   - **Impact:** Information loss when exporting advanced Graphai content to BB
   - **Rationale:** BB format doesn't support these features
   - **Workaround:** Use Graphai format for advanced features

### Edge Cases Handled

1. **Supplied Words as Literal Text**

   - Words in brackets like `[was]`, `[it]` are treated as literal text, not tags
   - Preserves original text appearance in round-trip

2. **Unknown Tags**

   - Unrecognized bracketed content is preserved as literal text
   - Prevents data loss from future BB format extensions

3. **Malformed Tags**
   - Missing closing tags or invalid syntax doesn't crash conversion
   - Content is preserved as plain text

---

## Summary

The BB format is a text-based markup system with:

- **Strengths:** Simple, human-readable, compact storage
- **Weaknesses:** Position-based paragraphs, externalized footnotes, limited feature set

The Graphai schema is more robust with:

- **Strengths:** Inline footnotes, rich structure (headings/subtitles), cleaner paragraph markers
- **Weaknesses:** More verbose JSON representation

**Conversion Goal:** Lossless bidirectional conversion for all BB-supported features, with graceful handling of Graphai-only features (drop on export).
