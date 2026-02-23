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
    const date = value ? new Date(value) : null;
    return date && !Number.isNaN(date.getTime()) ? date : null;
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
    const response = await axios.post(
        "https://api.groq.com/openai/v1/chat/completions",
        {
            model: "llama3-8b-8192",
            temperature: 0,
            messages: [
                {
                    role: "system",
                    content: `
Extract all academic events or meeting details from the text.
Return ONLY JSON:
{
 "events": [
   {
     "type": "",
     "title": "",
     "course": "",
     "start_time": "",
     "end_time": "",
     "all_day": false,
     "duration_minutes": null,
     "syllabus": "",
     "links": [],
     "confidence": 0.0
   }
 ]
}`,
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
    const parsed = JSON.parse(extractJsonBlock(rawContent));
    const events = Array.isArray(parsed.events) ? parsed.events : [];

    return events.map((item) => normalizeEvent(item, text)).filter(Boolean);
};
