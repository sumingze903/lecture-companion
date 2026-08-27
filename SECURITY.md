# Security Policy

Please do not report sensitive issues in public GitHub issues.

Lecture Companion does not intentionally store recordings or transcripts on a server. The frontend records locally in the browser, and the API server only receives finalized text sent for translation.

If you deploy this project publicly:

- Keep `OPENAI_API_KEY` on the server only.
- Restrict CORS to trusted origins.
- Add rate limiting before sharing the API publicly.
- Avoid uploading real classroom recordings without permission.
