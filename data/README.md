# Team database

Every record the site saves is one JSON file here: `data/<collection>/<id>.json`.

- Run the site with `node server.js` (or double-click `start.bat`) and open http://localhost:3000. Saving only goes into this folder when the site is opened that way. A double-clicked HTML file saves to that browser only.
- Commit and push this folder to share data. After `git pull`, refresh the page to see your teammates' records.
- One file per record means two people adding records at the same time never get a merge conflict.

Collections in use:

| Collection | Page | What it holds |
|---|---|---|
| `verify-reports` | verify.html | Reported scam listings (phone, photo fingerprints, pattern) |
| `protect-evidence` | protect.html | Evidence locker entries (photos stored inside the file) |
| `protect-complaints` | protect.html | Complaint letters and their status |

New feature? Use `TNDB` from `db.js` with a collection named after your feature, e.g. `choose-reviews`, `live-vacancies`.
