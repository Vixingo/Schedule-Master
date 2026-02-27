import express from "express";
import { parseTextToEvents } from "../services/parser.service.js";
import { createEvent } from "../services/calendar.service.js";
import { getUserTokens } from "../models/user.model.js";
import { buildReminders } from "../utils/reminder.util.js";
import { extractLinks } from "../utils/linkExtractor.js";
import { formatTitle, buildDescription } from "../utils/formatter.js";
import {
    getEventsByWhatsAppPhone,
    saveEventRecord,
} from "../models/event.model.js";

const router = express.Router();

router.post("/process", async (req, res) => {
    const { text, whatsappPhone, reminderMinutes = 30 } = req.body;

    if (!text || !whatsappPhone) {
        return res
            .status(400)
            .json({ error: "text and whatsappPhone are required" });
    }

    const tokens = await getUserTokens(whatsappPhone);
    if (!tokens) return res.status(401).json({ error: "Google not connected" });

    const events = await parseTextToEvents(text);
    if (!events.length) {
        return res.status(200).json({ message: "No events found", events: [] });
    }

    const createdEvents = [];
    for (const event of events) {
        const mergedLinks = [
            ...new Set([...(event.links || []), ...extractLinks(text)]),
        ];
        const title = formatTitle({ ...event, summary: event.summary });
        const description = buildDescription(
            { ...event, summary: title, links: mergedLinks },
            text,
        );

        const created = await createEvent(tokens, {
            ...event,
            summary: title,
            description,
            links: mergedLinks,
            reminders: buildReminders(reminderMinutes),
        });

        await saveEventRecord({
            whatsappPhone,
            googleEventId: created.id,
            title,
            description,
            startTime: created.start?.dateTime || created.start?.date,
            endTime: created.end?.dateTime || created.end?.date,
            recurrenceRule: (created.recurrence || [null])[0],
            links: mergedLinks,
            type: event.type,
            sourceText: text,
            reminderMinutes,
        });

        createdEvents.push(created);
    }

    res.json({ message: "Events created", events: createdEvents });
});

router.get("/user/:whatsappPhone", async (req, res) => {
    const { whatsappPhone } = req.params;
    const events = await getEventsByWhatsAppPhone(whatsappPhone);
    res.json({ events });
});

export default router;
