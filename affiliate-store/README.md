# Affiliate Store

## Run it
1. Install Node.js (https://nodejs.org)
2. In this folder run:  `npm install`
3. Start:  `ADMIN_PASSWORD=yourSecretPassword npm start`
   (Windows PowerShell: `$env:ADMIN_PASSWORD="yourSecretPassword"; npm start`)
4. Store:  http://localhost:3000    Admin:  http://localhost:3000/admin.html

## Put it online
Deploy this folder to a Node host (Render, Railway, a VPS). Set the ADMIN_PASSWORD environment variable.
Keep `uploads/` and `products.json` on persistent storage, or products disappear on redeploy.
