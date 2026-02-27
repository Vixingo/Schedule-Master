import express from "express";
import { getOrCreateUser, getUserTokens } from "../models/user.model.js";
import { parseTextToEvents } from "../services/parser.service.js";
import {
    createEvent,
    updateEventReminders,
} from "../services/calendar.service.js";
import { sendWhatsAppMessage } from "../services/whatsapp.service.js";
import {
    buildReminders,
    scheduleWhatsAppReminder,
} from "../utils/reminder.util.js";
import { extractLinks } from "../utils/linkExtractor.js";
import { formatTitle, buildDescription } from "../utils/formatter.js";
import {
    saveEventRecord,
    updateEventReminderMinutes,
} from "../models/event.model.js";

const router = express.Router();
const userState = new Map();

const isAffirmative = (value) => ["yes", "y", "confirm", "ok"].includes(value);
const isNegative = (value) => ["no", "n", "cancel", "stop"].includes(value);

const appBaseUrl = () => process.env.APP_BASE_URL || "http://localhost:3000";

const createPreview = (events) =>
    events
        .slice(0, 5)
        .map((event, index) => {
            const start = event.start?.dateTime || event.start?.date;
            return `${index + 1}. ${event.summary} @ ${start}`;
        })
        .join("\n");

const sendText = async (to, text) => {
    try {
        await sendWhatsAppMessage(to, text);
    } catch (error) {
        console.error(
            "Failed to send WhatsApp message",
            error?.response?.data || error.message,
        );
    }
};

const handleIncomingText = async (whatsappPhone, text) => {
    const trimmed = (text || "").trim();
    if (!trimmed) return;

    await getOrCreateUser(whatsappPhone);

    if (["connect", "!connect"].includes(trimmed.toLowerCase())) {
        await sendText(
            whatsappPhone,
            `Connect Google Calendar: ${appBaseUrl()}/auth/google?whatsappPhone=${encodeURIComponent(whatsappPhone)}`,
        );
        return;
    }

    const active = userState.get(whatsappPhone);

    if (active?.step === "confirm") {
        const answer = trimmed.toLowerCase();

        if (isNegative(answer)) {
            userState.delete(whatsappPhone);
            await sendText(
                whatsappPhone,
                "Cancelled. Send new text whenever you're ready.",
            );
            return;
        }

        if (!isAffirmative(answer)) {
            await sendText(
                whatsappPhone,
                "Please reply with yes to continue or no to cancel.",
            );
            return;
        }

        const tokens = await getUserTokens(whatsappPhone);
        if (!tokens) {
            userState.delete(whatsappPhone);
            await sendText(
                whatsappPhone,
                `Google Calendar is not connected. Use: ${appBaseUrl()}/auth/google?whatsappPhone=${encodeURIComponent(whatsappPhone)}`,
            );
            return;
        }

        const createdEvents = [];
        let summary = "";

        for (const event of active.events) {
            const mergedLinks = [
                ...new Set([
                    ...(event.links || []),
                    ...extractLinks(active.rawText),
                ]),
            ];

            const title = formatTitle({ ...event, summary: event.summary });
            const description = buildDescription(
                {
                    ...event,
                    summary: title,
                    links: mergedLinks,
                },
                active.rawText,
            );

            try {
                const googleEvent = await createEvent(tokens, {
                    ...event,
                    summary: title,
                    description,
                    links: mergedLinks,
                    reminders: buildReminders(30),
                });

                await saveEventRecord({
                    whatsappPhone,
                    googleEventId: googleEvent.id,
                    title,
                    description,
                    startTime:
                        googleEvent.start?.dateTime || googleEvent.start?.date,
                    endTime: googleEvent.end?.dateTime || googleEvent.end?.date,
                    recurrenceRule: (googleEvent.recurrence || [null])[0],
                    links: mergedLinks,
                    type: event.type,
                    sourceText: active.rawText,
                    reminderMinutes: 30,
                });

                createdEvents.push(googleEvent);
                summary += `✅ ${title} added\n`;
            } catch (error) {
                console.error(error);
                summary += `❌ ${title} failed\n`;
            }
        }

        if (!createdEvents.length) {
            userState.delete(whatsappPhone);
            await sendText(
                whatsappPhone,
                `${summary}\nNo events were created.`,
            );
            return;
        }

        userState.set(whatsappPhone, {
            step: "reminder",
            createdEvents,
            tokens,
        });

        await sendText(
            whatsappPhone,
            `${summary}\nReply with reminder minutes (example: 10) to schedule WhatsApp + Google reminders.`,
        );
        return;
    }

    if (active?.step === "reminder") {
        const minutes = Number.parseInt(trimmed, 10);
        if (Number.isNaN(minutes) || minutes < 0 || minutes > 10080) {
            await sendText(
                whatsappPhone,
                "Send a valid number between 0 and 10080 minutes.",
            );
            return;
        }

        for (const event of active.createdEvents) {
            try {
                await updateEventReminders(
                    active.tokens,
                    event.id,
                    buildReminders(minutes),
                );
                await updateEventReminderMinutes(
                    whatsappPhone,
                    event.id,
                    minutes,
                );
                scheduleWhatsAppReminder(whatsappPhone, event, minutes);
            } catch (error) {
                console.error("Failed to schedule reminder", error);
            }
        }

        userState.delete(whatsappPhone);
        await sendText(
            whatsappPhone,
            `Reminders set for ${minutes} minutes before each event.`,
        );
        return;
    }

    const events = await parseTextToEvents(trimmed);
    if (!events.length) {
        await sendText(whatsappPhone, "No events found.");
        return;
    }

    const preview = createPreview(events);

    userState.set(whatsappPhone, {
        step: "confirm",
        events,
        rawText: trimmed,
    });

    await sendText(
        whatsappPhone,
        `I found ${events.length} event(s):\n${preview}\n\nReply with yes to confirm or no to cancel.`,
    );
};

const extractIncomingMessages = (payload) => {
    const messages = [];
    const entries = payload?.entry || [];

    for (const entry of entries) {
        const changes = entry?.changes || [];
        for (const change of changes) {
            const value = change?.value || {};
            const incoming = value?.messages || [];
            for (const msg of incoming) {
                const from = msg?.from;
                const textBody = msg?.text?.body;
                if (from && textBody) {
                    messages.push({ from, text: textBody });
                }
            }
        }
    }

    return messages;
};

router.get("/webhook", (req, res) => {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    if (
        mode === "subscribe" &&
        token === process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN
    ) {
        return res.status(200).send(challenge);
    }

    return res.sendStatus(403);
});

router.post("/webhook", async (req, res) => {
    const incoming = extractIncomingMessages(req.body);

    for (const message of incoming) {
        await handleIncomingText(message.from, message.text);
    }

    res.sendStatus(200);
});

router.post("/send", async (req, res) => {
    const { to, message } = req.body;
    if (!to || !message) {
        return res.status(400).json({ error: "to and message are required" });
    }

    try {
        const result = await sendWhatsAppMessage(to, message);
        return res.json({ success: true, result });
    } catch (error) {
        console.error(
            "WhatsApp send failed",
            error?.response?.data || error.message,
        );
        return res.status(500).json({
            success: false,
            error: "Failed to send WhatsApp message",
            details: error?.response?.data || error.message,
        });
    }
});

export default router;
