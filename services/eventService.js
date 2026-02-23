import { supabase } from "../config/supabase.js";
import { getUserAuth } from "./calendarService.js";
import { formatTitle, buildDescription } from "../utils/formatter.js";
import { isDuplicate } from "../utils/duplicate.js";
import { getCalendar } from "../config/google.js";

export async function upsertEvent(event, originalText, user) {
    const auth = await getUserAuth(user.id);
    const calendar = getCalendar(auth);

    const { data: existing } = await supabase
        .from("events")
        .select("*")
        .eq("user_id", user.id);

    const duplicate = existing?.find((e) => isDuplicate(event, e));

    const requestBody = {
        summary: formatTitle(event),
        description: buildDescription(event, originalText),
        start: { dateTime: event.start_time, timeZone: user.timezone },
        end: { dateTime: event.end_time, timeZone: user.timezone },
        reminders: {
            useDefault: false,
            overrides: [{ method: "popup", minutes: 10 }],
        },
    };

    if (duplicate?.google_event_id) {
        await calendar.events.update({
            calendarId: "primary",
            eventId: duplicate.google_event_id,
            requestBody,
        });

        return "updated";
    }

    const created = await calendar.events.insert({
        calendarId: "primary",
        requestBody,
    });

    await supabase.from("events").insert({
        user_id: user.id,
        title: event.title,
        start_time: event.start_time,
        end_time: event.end_time,
        google_event_id: created.data.id,
        original_text: originalText,
        confidence: event.confidence,
    });

    return "created";
}
