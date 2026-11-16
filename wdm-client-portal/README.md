# WD Morgan Client Portal

A simple, secure WordPress client portal. Clients sign in, drag and drop files to your team, download what you share with them, and see exactly what you need from them.

## Install
1. Upload `wdm-client-portal.zip` in **Plugins → Add New → Upload**, then activate.
2. A **Client Portal** page (`/client-portal/`) is created automatically.
3. Go to **Client Portal → Settings**: add your logo, colors, notification emails, and quick links.
4. **Client Portal → Add Client**: the client gets a branded welcome email with a "Set my password" link.

## For clients
- **Branded sign-in page** with show/hide password, "keep me signed in", and forgot-password.
- **What we need from you**: a to-do list of file requests with due dates. Uploading against one marks it "Sent".
- **Drag-and-drop uploads** (or tap on mobile) with per-file progress, an optional note, and instant checks for file type and size. You can also **paste screenshots** straight from the clipboard.
- **Your uploads**: status for every file (Received → In review → Done). Clients can remove an upload until your team opens it.
- **Shared with you**: files from your team, with a "New" badge.
- **Your contact** card, **quick links** (book a call, pay an invoice, email, phone), a **pinned note**, a site-wide **announcement**, and **recent activity**.
- **Account**: change name or password, and turn email updates on or off.
- Never sees wp-admin or the admin bar.

## For your team
- **Clients list** with new-upload counts, open requests, last activity, last sign-in, and search.
- **Client page**: change file status, download, delete, share files (with email), file requests, pinned note, assigned contact, activity log, and "Send sign-in link".
- Files move to **In review** automatically when staff download them.
- You can see when a client **opened** a file you shared.
- Menu badge and dashboard widget for new uploads.
- **One email per upload batch** (not one per file), including the client's note.

## Security
- Files are stored in `uploads/wdm-client-portal/<client>/` with random names that have no real extension. `.htaccess`, `web.config` and `index.php` block direct access.
- Downloads go through a nonce-checked handler that only allows the owning client or staff.
- File types come from an allow-list; executable and script types (PHP, HTML, SVG, EXE…) are always blocked.
- Sign-in errors are deliberately vague. Every action is nonce- and capability-checked.
- **Nginx:** add `location ^~ /wp-content/uploads/wdm-client-portal/ { deny all; }` (the Settings page reminds you).

## Notes
- Upload size is capped by your host's `upload_max_filesize` / `post_max_size`; Settings shows the effective limit.
- Emails use `wp_mail()`. Use an SMTP plugin (e.g. WP Mail SMTP) for reliable delivery.
- Deleting the plugin keeps your data unless "delete all portal data" is checked in Settings.
