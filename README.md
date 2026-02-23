# Calendar Agent

A Discord-based calendar assistant powered by Groq LLM, Supabase, and Google Calendar.

## Flow

1. **User** pastes text in Discord
2. **Groq** extracts event details and links
3. **Confirmation** prompt (reply with `yes` or `no`)
4. **Save to Supabase** (raw text + event metadata)
5. **Insert to Google Calendar** with description containing original text
6. **Reminder setup** (user replies with minutes, then cron + Google reminders are scheduled)
7. **Web UI** lets user connect Google OAuth and view all stored events

## Setup

1. Copy `.env.example` to `.env` and fill in credentials:
    - `DISCORD_TOKEN` – from your Discord bot
    - `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI` – from Google Cloud Console
    - `SUPABASE_URL`, `SUPABASE_KEY` – from your Supabase project
    - `GROQ_API_KEY` – from Groq dashboard
    - `ENCRYPTION_KEY` – random 32+ char string
    - `SESSION_SECRET` – random secret for session management
    - `APP_BASE_URL` – your deployed URL (or `http://localhost:3000` for local)

2. Run the SQL in `db.sql` in your Supabase SQL editor to create tables.

3. Install dependencies:

    ```bash
    npm install
    ```

4. Start the server & bot:

    ```bash
    npm start
    ```

    Both the web server and Discord bot run together.

## Usage

### Discord

- Type `!connect` to get a Google OAuth link
- Paste any announcement text to trigger event extraction
- Confirm with `yes` or `no`
- Reply with reminder minutes (e.g., `10`)

### Web UI

Visit `http://localhost:3000/dashboard` (or your deployed URL):

- Enter your Discord User ID
- Connect Google Calendar
- Load My Data to see all stored events, links, and original pasted text

## Tech Stack

- **Express** – Web server (auth routes, event routes, dashboard UI)
- **Discord.js** – Discord bot for message handling
- **Groq** – LLM for event extraction
- **Supabase** – PostgreSQL database (users, events, OAuth tokens)
- **Google Calendar API** – Event insertion and reminder management
- **node-cron** – Schedule Discord DM reminders
