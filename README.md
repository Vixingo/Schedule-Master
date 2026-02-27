# Calendar Agent

A WhatsApp-based calendar assistant powered by Groq LLM, Supabase, and Google Calendar.

## Flow

1. **User** sends text in WhatsApp
2. **Groq** extracts event details and links
3. **Confirmation** prompt (reply with `yes` or `no`)
4. **Save to Supabase** (raw text + event metadata)
5. **Insert to Google Calendar** with description containing original text
6. **Reminder setup** (user replies with minutes, then WhatsApp + Google reminders are scheduled)
7. **Web UI** lets user connect Google OAuth and view all stored events

## Setup

1. Copy `.env.example` to `.env` and fill in credentials:
    - `WHATSAPP_ACCESS_TOKEN` – from Meta WhatsApp Cloud API
    - `WHATSAPP_PHONE_NUMBER_ID` – from Meta WhatsApp Cloud API
    - `WHATSAPP_WEBHOOK_VERIFY_TOKEN` – token used in webhook verification
    - `WHATSAPP_API_VERSION` – Graph API version (default `v21.0`)
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

4. Start the server:

    ```bash
    npm start
    ```

5. Configure the WhatsApp webhook (Meta dashboard):
    - Verify URL: `https://your-domain.com/whatsapp/webhook`
    - Verify token: same value as `WHATSAPP_WEBHOOK_VERIFY_TOKEN`
    - Subscribe to `messages` events.

## Usage

### WhatsApp

- Send `connect` to get a Google OAuth link
- Send any announcement text to trigger event extraction
- Confirm with `yes` or `no`
- Reply with reminder minutes (e.g., `10`)

### Web UI

Visit `http://localhost:3000/dashboard` (or your deployed URL):

- Enter your WhatsApp phone number
- Connect Google Calendar
- Load My Data to see all stored events, links, and original pasted text

### API Endpoints

- `GET /whatsapp/webhook` – webhook verification endpoint for Meta
- `POST /whatsapp/webhook` – inbound WhatsApp messages
- `POST /whatsapp/send` – send outbound WhatsApp text (`{ "to": "15551234567", "message": "Hello" }`)

## Tech Stack

- **Express** – Web server (auth routes, event routes, dashboard UI)
- **WhatsApp Cloud API** – inbound/outbound messaging
- **Groq** – LLM for event extraction
- **Supabase** – PostgreSQL database (users, events, OAuth tokens)
- **Google Calendar API** – Event insertion and reminder management
- **node-cron** – Schedule WhatsApp reminders
