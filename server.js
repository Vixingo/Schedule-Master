import "dotenv/config";
import express from "express";
import session from "express-session";
import authRoutes from "./routes/auth.routes.js";
import eventRoutes from "./routes/event.routes.js";
import { startBot } from "./bot.js";

const app = express();
app.use(express.json());

app.use(
    session({
        secret: process.env.SESSION_SECRET,
        resave: false,
        saveUninitialized: false,
    }),
);

app.use("/auth", authRoutes);
app.use("/events", eventRoutes);

app.get("/", (req, res) => res.redirect("/dashboard"));

app.get("/dashboard", (req, res) => {
    res.type("html").send(`<!doctype html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Calendar Agent</title>
    <style>
        :root { --bg:#f6f7fb; --card:#ffffff; --text:#111827; --muted:#6b7280; --border:#e5e7eb; }
        * { box-sizing: border-box; }
        body { margin:0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background:var(--bg); color:var(--text); }
        .wrap { max-width:720px; margin:0 auto; padding:16px; }
        .card { background:var(--card); border:1px solid var(--border); border-radius:12px; padding:14px; margin-bottom:12px; }
        h1 { margin:0 0 10px; font-size:22px; }
        p { color:var(--muted); margin:8px 0; }
        input, button { width:100%; padding:11px; border-radius:10px; border:1px solid var(--border); font-size:15px; }
        button { cursor:pointer; background:#111827; color:#fff; margin-top:8px; }
        .event { padding:10px 0; border-bottom:1px solid var(--border); }
        .event:last-child { border-bottom:none; }
        .small { font-size:13px; color:var(--muted); }
        .row { display:flex; gap:8px; }
        .row > * { flex:1; }
        @media (max-width:480px){ .wrap { padding:12px; } h1 { font-size:20px; } }
    </style>
</head>
<body>
    <div class="wrap">
        <div class="card">
            <h1>Calendar Agent</h1>
            <p>Connect Google, then paste text in Discord. Events and raw text are saved in Supabase and synced to Google Calendar.</p>
            <input id="discordId" placeholder="Discord User ID" />
            <div class="row">
                <button id="connectBtn">Connect Google</button>
                <button id="loadBtn">Load My Data</button>
            </div>
            <p id="status" class="small"></p>
        </div>

        <div class="card">
            <strong>My Events</strong>
            <div id="events"></div>
        </div>
    </div>

    <script>
        const statusEl = document.getElementById('status');
        const eventsEl = document.getElementById('events');
        const discordInput = document.getElementById('discordId');

        const params = new URLSearchParams(window.location.search);
        if (params.get('discordId')) {
            discordInput.value = params.get('discordId');
        }
        if (params.get('connected') === '1') {
            statusEl.textContent = 'Google Calendar connected.';
        }

        document.getElementById('connectBtn').onclick = () => {
            const discordId = discordInput.value.trim();
            if (!discordId) return statusEl.textContent = 'Enter Discord ID first.';
            window.location.href = '/auth/google?discordId=' + encodeURIComponent(discordId);
        };

        document.getElementById('loadBtn').onclick = async () => {
            const discordId = discordInput.value.trim();
            if (!discordId) return statusEl.textContent = 'Enter Discord ID first.';

            statusEl.textContent = 'Loading...';
            eventsEl.innerHTML = '';
            const res = await fetch('/events/user/' + encodeURIComponent(discordId));
            const payload = await res.json();
            if (!res.ok) {
                statusEl.textContent = payload.error || 'Failed to load';
                return;
            }

            statusEl.textContent = 'Loaded ' + payload.events.length + ' events.';
            if (!payload.events.length) {
                eventsEl.innerHTML = '<p class="small">No events yet.</p>';
                return;
            }

            eventsEl.innerHTML = payload.events.map((event) => {
                const links = (event.links || []).map((link) => '<a href="' + link + '" target="_blank">link</a>').join(' · ');
                return '<div class="event">'
                        + '<div><strong>' + (event.title || 'Untitled') + '</strong></div>'
                        + '<div class="small">Start: ' + (event.start_time || '-') + '</div>'
                        + '<div class="small">Reminder: ' + (event.reminder_minutes ?? '-') + ' min</div>'
                        + '<div class="small">Text: ' + ((event.source_text || '').slice(0, 160) || '-') + '</div>'
                        + '<div class="small">' + links + '</div>'
                        + '</div>';
            }).join('');
        };
    </script>
</body>
</html>`);
});

app.listen(process.env.PORT || 3000, async () => {
    console.log("Server running...");
    await startBot();
});
