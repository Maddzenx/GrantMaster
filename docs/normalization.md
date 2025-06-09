# Vinnova Data Normalization Documentation

## Overview

This document describes the transformation logic used to normalize Vinnova API responses into the internal application data model. It covers mapping rules, error handling, edge cases, and performance considerations for each entity type.

---

## Table of Contents

- [Grants Normalization](#grants-normalization)
- [Applications Normalization](#applications-normalization)
- [Activities Normalization](#activities-normalization)
- [Error Handling Strategy](#error-handling-strategy)
- [Edge Cases & Special Logic](#edge-cases--special-logic)
- [Performance Considerations](#performance-considerations)
- [Examples](#examples)
- [Changelog](#changelog)

---

## Grants Normalization

### Field Mapping

| Vinnova API Field(s)         | Internal Field   | Notes / Fallbacks                |
|------------------------------|------------------|----------------------------------|
| `Diarienummer`, `id`         | `id`             | Accepts either variant           |
| `Titel`, `title`             | `title`          |                                  |
| `Beskrivning`, `description` | `description`    |                                  |
| `Beslutsdatum`, `deadline`   | `deadline`       | Date string, may be null         |
| `Sektor`, `sector`           | `sector`         | Optional                         |
| `Stage`, `stage`             | `stage`          | Optional                         |

### Validation & Fallbacks

- If `id` is missing or invalid, the record is skipped and a warning is logged.
- Optional fields default to `null` if missing.

---

## Applications Normalization

### Field Mapping

| Vinnova API Field(s)         | Internal Field   | Notes / Fallbacks                |
|------------------------------|------------------|----------------------------------|
| `Diarienummer`, `id`         | `id`             | Accepts either variant           |
| `Titel`, `title`             | `title`          |                                  |
| `Status`, `status`           | `status`         |                                  |
| `Beslutsdatum`, `decisionDate` | `decisionDate` | Date string, may be null         |

### Validation & Fallbacks

- If `id` is missing or invalid, the record is skipped and a warning is logged.
- Optional fields default to `null` if missing.

---

## Activities Normalization

### Field Mapping

| Vinnova API Field(s)         | Internal Field   | Notes / Fallbacks                |
|------------------------------|------------------|----------------------------------|
| `AktivitetsID`, `aktivitetsid`, `id` | `id`      | Accepts any variant              |
| `Aktivitetsnamn`, `Namn`, `name`     | `name`    | Accepts any variant              |
| `Beskrivning`, `description`         | `description` | Optional                    |
| `Startdatum`, `startDate`            | `startDate`  | Date string, may be null         |
| `Slutdatum`, `endDate`               | `endDate`    | Date string, may be null         |

### Validation & Fallbacks

- If `id` is missing or invalid, the record is skipped and a warning is logged.
- Optional fields default to `null` if missing.

---

## Error Handling Strategy

- All transformation errors are logged with the source data for debugging.
- Missing required fields (e.g., `id`) result in the record being skipped.
- Fallback values (`null`) are used for missing optional fields.
- Consider implementing a circuit breaker if repeated critical failures occur.

---

## Edge Cases & Special Logic

- Handles multiple field name variants for each entity type.
- Type conversions (e.g., date strings) are performed as needed.
- Nulls and empty strings are normalized to `null`.
- Any additional logic (e.g., mapping enums, handling nested structures) should be documented here.

---

## Performance Considerations

- Transformation functions are optimized for batch processing.
- For large datasets, consider streaming or chunked processing.
- Error logging is lightweight to avoid performance bottlenecks.

---

## Examples

### Before/After Transformation

**Input (Vinnova API):**
```json
{
  "Diarienummer": "123",
  "Titel": "Grant A",
  "Beskrivning": "Description",
  "Beslutsdatum": "2025-12-31"
}
```

**Output (Normalized):**
```json
{
  "id": "123",
  "title": "Grant A",
  "description": "Description",
  "deadline": "2025-12-31",
  "sector": null,
  "stage": null
}
```

---

## Changelog

- 2024-06-02: Initial documentation created.
- [Add future updates here] 