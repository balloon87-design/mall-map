# Copy/Paste correction

- Adds `newBoxId()` with a fallback for browser contexts where `crypto.randomUUID()` is missing.
- Replaces ID generation for both Add Box and Paste.
- Paste clones the source box, preserving its rotation, dimensions, colors, typography and text.
- Paste places the copy 34 px lower and to the right, selects it, and displays `Pasted: ...`.
- If something still fails, a detailed `Paste error: ...` message appears and the browser console logs the error.
- The map image, box seed data, and localStorage key have not been changed.

Run from this folder: `npm install` then `npm run dev`.
