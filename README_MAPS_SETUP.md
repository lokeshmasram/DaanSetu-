Google Maps JavaScript API — Setup & Local Development
=====================================================

Steps to enable Maps for this project (quick):

1) Create / select a Google Cloud project
   - Open: https://console.cloud.google.com/
   - Select an existing project or create a new one.

2) Enable APIs
   - Go to "APIs & Services" → "Library"
   - Search "Maps JavaScript API" → Click → Enable

3) Enable billing
   - Maps JavaScript API requires a billing account on the project
   - Console → Billing → create/link a billing account

4) Create an API key
   - Console → APIs & Services → Credentials → Create credentials → API key
   - Copy the key (DO NOT commit it to source control)

5) Set application restrictions (recommended)
   - Under the API key settings → Application restrictions → HTTP referrers
   - For local development add these referrers:
       http://localhost:3001/*
       http://localhost:3000/*
       http://127.0.0.1:3001/*
   - Save and wait a minute for propagation

6) Local development options
   - Quick & temporary: In the browser console run:
       localStorage.setItem('G_MAPS_KEY', 'YOUR_API_KEY'); location.reload();
     This instructs `public/load-maps.js` to load Maps using that key.
   - Alternatively, replace the loader in `public/donor-dashboard.html` with a script tag:
       <script src="https://maps.googleapis.com/maps/api/js?key=YOUR_KEY&libraries=places"></script>

7) Production
   - Use a production key restricted to your deployed domain(s).
   - Never store unrestricted keys in client code or commit them to git.

Troubleshooting common console errors
-----------------------------------
- RefererNotAllowedMapError: The key has referrer restrictions that don't match your site. Add the correct referrer in key restrictions.
- ApiNotActivatedMapError: Enable Maps JavaScript API for the project.
- InvalidKeyMapError / MissingKeyMapError: Use a valid key.
- BillingNotEnabledMapError: Enable billing on the project.

If you want, provide me with the exact console error text and I will give the exact remediation steps and patch the repo further.
