import { getCalendarClient } from "../config/google.js";

export const createEvent = async (tokens, eventData) => {
    const calendar = getCalendarClient(tokens);
    if (eventData.recurrence) eventData.recurrence = [eventData.recurrence];
    const res = await calendar.events.insert({
        calendarId: "primary",
        requestBody: eventData,
    });
    return res.data;
};

export const updateEventReminders = async (tokens, eventId, reminders) => {
    const calendar = getCalendarClient(tokens);
    const res = await calendar.events.patch({
        calendarId: "primary",
        eventId,
        requestBody: { reminders },
    });
    return res.data;
};
