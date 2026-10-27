# Forward Living — Author & Book Announcement Site

A responsive static website for the Forward Living brand and Abhishek Yadav's upcoming book, **A Steadier Way Out of Debt**.

## Deploy to Vercel

1. Extract this ZIP.
2. Create a new GitHub repository and upload all files/folders from this project (keep `index.html`, `styles.css`, and `assets/` at the repository root).
3. In Vercel, choose **Add New → Project**, import the repository, and deploy.
4. Framework preset: **Other**. Build command: leave empty. Output directory: `.` (the repository root).
5. If you want to replace the current live site, attach `forwardliving.in` to this new project only after checking the deployment preview and confirming you're ready to switch.

## Preview locally

Open `index.html` in a browser, or run a local static server from this directory, for example:

```bash
python3 -m http.server 8080
```

Then open `http://localhost:8080`.

## Before launch

- Confirm the author bio and all wording are accurate.
- Replace the monogram block with an author portrait if desired.
- Add a real email signup/payment flow only when you are ready; this version does not collect personal information or accept payments.
- The book is described as “coming soon”; no launch date is promised.
- `assets/book-cover.png` is cropped from the uploaded full-wrap cover PDF.
- Google Fonts are loaded from Google Fonts; system serif/sans-serif fallbacks are included.
