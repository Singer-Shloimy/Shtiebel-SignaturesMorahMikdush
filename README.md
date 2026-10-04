# Shtiebel-SignaturesMorahMikdush

Hebrew e-signature site for the shtiebel letter. Each person gets a personal link, admins upload the in-person scanned letter, then download one merged PDF with digital signatures on that same page.

## Local run

```bash
npm install
npm run dev
```

- Signer link: `http://localhost:3000/<name-slug>`
- Admin: `http://localhost:3000/admin`
- Default admin password: set `ADMIN_PASSWORD` in `.env.local`

## Railway deploy

1. Create a Railway project and deploy this repo.
2. Set variables:
   - `ADMIN_PASSWORD` = your secret password
   - `DATA_DIR` = `/data`
3. Add a **Volume** mounted at `/data` (keeps signatures after redeploys).
4. Generate a public domain in Railway.

After deploy:
- Admin: `https://YOUR-DOMAIN/admin`
- Signer links: `https://YOUR-DOMAIN/<name-slug>`
