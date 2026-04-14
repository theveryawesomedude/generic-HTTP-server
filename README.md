# generic-HTTP-server

A small server for hosting tiny websites you have made for fun.
You can learn hosting websites on backends like this.
Built on **Node.js**, **Express**, and **SQLite**.

## How to run?

Go to the folder you extracted it, and navigate all down till you find `bin/`
Then enter `bin/` and run `backend.exe`, This launches a local HTTP server that is not accessible through the internet, but runs on your own personal computer.

## How to connect to the internet?

Use something like `cloudflared`, install it from [The Official Cloudflared Project](https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/downloads/)
And once you have downloaded `cloudflared`, Run this command

```cmd
cloudflared tunnel --url http://localhost:3000
```

To give a temporary URL. Go to the URL that is shown when you run `cloudflared`
Its something like:

`https://trycloudflare.com`

the URL may vary..!

### What else to do?

Replace the contents of the `index.html` placeholder website in `bin/public`

### Any features?
- Tracking things like User-Agent in a database that is created once the database is ran.
- Blocking too many requests at once, the time window is 10, limit 20 requests per window, this is PER-IP.

**ENJOY‼**