Standalone HTTPS camera page for the worker export apps.

Contains no account tokens, spreadsheet IDs, image storage or upload endpoints.
Photos stay in browser memory and return only to the originating Apps Script frame through a checked postMessage channel.
Requires HTTPS hosting and opening as a top-level popup from the export app.
