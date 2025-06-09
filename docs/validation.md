# Input Validation & Sanitization Documentation

This document describes the validation and sanitization rules for all user input in the application.

## General Principles
- All user input is validated using zod schemas on both client and server.
- All string input is trimmed and sanitized to remove dangerous characters.
- File uploads are validated for type and size.

---

## Endpoints & Validation Rules

### /api/register
- **email**: valid email address, required
- **password**: minimum 8 characters, required
- **name**: 1-100 characters, required

### /api/apply
- **userId**: UUID, required
- **grantId**: string, required
- **projectTitle**: 3-200 characters, required
- **projectSummary**: 10-2000 characters, required
- **requestedAmount**: number > 0, required
- **attachmentUrl**: valid URL, optional

### (Add more endpoints as needed)

---

## Sanitization Logic
- All string fields are trimmed and have <, >, ", ', and ` removed.
- HTML content is sanitized with dompurify before rendering or storing.
- File uploads are checked for allowed MIME types and size limits.

---

## File Upload Restrictions
- Allowed types: PDF, images (jpg, png, gif, etc.)
- Max size: 10MB (adjust as needed)
- Files are stored in the `attachments` bucket in Supabase Storage.

---

## Notes
- Validation is performed on both client and server for best UX and security.
- All validation schemas are located in `lib/validation/`.
- Update this document as new endpoints or fields are added. 