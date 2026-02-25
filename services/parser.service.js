import axios from "axios";
import { buildRecurrenceRule } from "./recurrence.service.js";
import { extractLinks } from "../utils/linkExtractor.js";

const extractJsonBlock = (rawContent = "") => {
    const trimmed = rawContent.trim();
    if (trimmed.startsWith("```")) {
        return trimmed
            .replace(/^```(?:json)?/i, "")
            .replace(/```$/, "")
            .trim();
    }

    return trimmed;
};

const toDateSafely = (value) => {
    if (!value) return null;

    const date = new Date(value);

    if (!isNaN(date.getTime())) return date;

    // try fallback parsing
    try {
        const fallback = Date.parse(value);
        return fallback ? new Date(fallback) : null;
    } catch {
        return null;
    }
};

const normalizeEvent = (item, fullText) => {
    const title = item.title || "Untitled Event";
    const type = item.type || "event";
    const startDate = toDateSafely(item.start_time);

    if (!startDate) return null;

    const durationMinutes = Number.isFinite(item.duration_minutes)
        ? Number(item.duration_minutes)
        : 60;
    const explicitEnd = toDateSafely(item.end_time);
    const calculatedEnd = new Date(
        startDate.getTime() + durationMinutes * 60 * 1000,
    );
    const endDate = explicitEnd || calculatedEnd;

    const allDay = Boolean(item.all_day);
    const links = [
        ...new Set([...(item.links || []), ...extractLinks(fullText)]),
    ];
    const recurrence = item.frequency
        ? buildRecurrenceRule(
              String(item.frequency).toUpperCase(),
              item.interval || 1,
          )
        : null;

    if (allDay) {
        const startOnly = startDate.toISOString().slice(0, 10);
        const endPlusOne = new Date(endDate.getTime() + 24 * 60 * 60 * 1000)
            .toISOString()
            .slice(0, 10);

        return {
            summary: title,
            start: { date: startOnly },
            end: { date: endPlusOne },
            type,
            course: item.course || "",
            syllabus: item.syllabus || "",
            links,
            confidence: item.confidence ?? 0,
            recurrence,
        };
    }

    return {
        summary: title,
        start: { dateTime: startDate.toISOString() },
        end: { dateTime: endDate.toISOString() },
        type,
        course: item.course || "",
        syllabus: item.syllabus || "",
        links,
        confidence: item.confidence ?? 0,
        recurrence,
    };
};

export const parseTextToEvents = async (text) => {
    try {
        const response = await axios.post(
            "https://api.groq.com/openai/v1/chat/completions",
            {
                model: "llama-3.1-8b-instant",
                temperature: 0,
                messages: [
                    {
                        role: "system",
                        content: `
You are an event extraction engine.

Extract ALL events, meetings, deadlines, exams, classes, reminders.

Convert ALL dates into ISO 8601 format.

Return ONLY valid JSON:

{
 "events": [
   {
     "type": "",
     "title": "",
     "course": "",
     "start_time": "ISO_STRING",
     "end_time": "ISO_STRING",
     "all_day": false,
     "duration_minutes": null,
     "syllabus": "",
     "links": [],
     "confidence": 0.0
   }
 ]
}

NO markdown.
NO explanation.
JSON ONLY.
`,
                    },
                    { role: "user", content: text },
                ],
            },
            {
                headers: {
                    Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
                    "Content-Type": "application/json",
                },
            },
        );

        const rawContent = response.data.choices?.[0]?.message?.content || "{}";

        console.log("RAW LLM RESPONSE:\n", rawContent);

        let parsed;

        try {
            parsed = JSON.parse(extractJsonBlock(rawContent));
        } catch (err) {
            console.error("JSON PARSE FAILED:", err);
            return [];
        }

        const events = Array.isArray(parsed.events) ? parsed.events : [];

        console.log("PARSED EVENTS:", events);

        return events.map((item) => normalizeEvent(item, text)).filter(Boolean);
    } catch (error) {
        console.error("Groq API Error:", error.message);
        return [];
    }
};
