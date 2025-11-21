# Panta - Bible Data Transformation Suite

The `panta` folder extends the original EGP Graphai functionality with comprehensive Bible data transformation and export capabilities. It provides tools to convert structured Bible data back to legacy BB format while maintaining data integrity and performance.

## Overview

This suite transforms the rich, structured JSON Bible data from the main project back into the simpler BibleDB.bibleVerses format used by legacy systems. It includes advanced features like parallel processing, progress tracking, memory optimization, and comprehensive validation.

## Folder Structure

```
panta/
├── functions/           # Core transformation functions
│   ├── convertBBToGraphai.ts    # Converts BB format to Graphai format
│   ├── convertGraphaiToBB.ts    # Converts Graphai format to BB format
```

## Integration with Main Project

The `panta` suite is designed to work alongside the main EGP Graphai project by putting all custom content into the `panta/` folder. This ensures that the main project remains untouched, allowing for easy updates and maintenance.

To pull in the latest changes from the main project, use the following PowerShell command:

```
. "./panta/utils/git-merge-upstream.ps1"
```
