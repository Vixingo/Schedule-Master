import cron from "node-cron";
import { sendWhatsAppMessage } from "../services/whatsapp.service.js";

export const buildReminders = (minutesBefore = 30) => ({
    useDefault: false,
    overrides: [
        { method: "popup", minutes: minutesBefore },
        { method: "email", minutes: minutesBefore },
    ],
});

export const scheduleWhatsAppReminder = (
    whatsappPhone,
    event,
    minutesBefore,
) => {
    const startValue = event.start?.dateTime || event.start?.date;
    if (!startValue) return null;

    const eventTime = new Date(startValue);
    if (Number.isNaN(eventTime.getTime())) return null;

    const reminderAt = new Date(
        eventTime.getTime() - minutesBefore * 60 * 1000,
    );
    if (reminderAt <= new Date()) return null;

    const cronExpression = `${reminderAt.getUTCMinutes()} ${reminderAt.getUTCHours()} ${reminderAt.getUTCDate()} ${reminderAt.getUTCMonth() + 1} *`;

    const task = cron.schedule(
        cronExpression,
        async () => {
            try {
                const title = event.summary || "Upcoming event";
                await sendWhatsAppMessage(
                    whatsappPhone,
                    `⏰ Reminder: ${title} starts at ${eventTime.toISOString()}`,
                );
            } finally {
                task.stop();
            }
        },
        { timezone: "UTC" },
    );

    return task;
};
