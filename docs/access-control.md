# V-SID Access Control

Status: ACTIVE

The production dashboard is protected by Vercel Routing Middleware using HTTP Basic Authentication. Unauthorized requests return HTTP 401 and include noindex/noarchive directives. The repository stores only a SHA-256 digest of the password; the plaintext credential is distributed privately to authorized personnel.

Username: `vsi`

Do not publish the plaintext password in repository files, public media, indexed pages, or archive excerpts intended for public release.
