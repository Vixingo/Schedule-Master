import cron from "node-cron";

export const buildReminders = (minutesBefore = 30) => ({
    useDefault: false,
    overrides: [
        { method: "popup", minutes: minutesBefore },
        { method: "email", minutes: minutesBefore },
    ],
});

export const scheduleDiscordReminder = (
    client,
    discordId,
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
                const user = await client.users.fetch(discordId);
                const title = event.summary || "Upcoming event";
                await user.send(
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
