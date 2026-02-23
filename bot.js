import "dotenv/config";
import { Client, GatewayIntentBits } from "discord.js";
import { getOrCreateUser, getUserTokens } from "./models/user.model.js";
import { parseTextToEvents } from "./services/parser.service.js";
import {
    createEvent,
    updateEventReminders,
} from "./services/calendar.service.js";
import {
    buildReminders,
    scheduleDiscordReminder,
} from "./utils/reminder.util.js";
import { extractLinks } from "./utils/linkExtractor.js";
import { formatTitle, buildDescription } from "./utils/formatter.js";
import {
    saveEventRecord,
    updateEventReminderMinutes,
} from "./models/event.model.js";

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
});

client.on("ready", () => console.log(`Bot logged in as ${client.user.tag}`));

const userState = new Map();

const isAffirmative = (value) => ["yes", "y", "confirm", "ok"].includes(value);
const isNegative = (value) => ["no", "n", "cancel", "stop"].includes(value);

client.on("messageCreate", async (message) => {
    if (message.author.bot) return;

    const discordId = message.author.id;
    await getOrCreateUser(discordId);

    if (message.content.trim() === "!connect") {
        const appBaseUrl = process.env.APP_BASE_URL || "http://localhost:3000";
        return message.reply(
            `Connect Google Calendar: ${appBaseUrl}/auth/google?discordId=${discordId}`,
        );
    }

    const active = userState.get(discordId);

    if (active?.step === "confirm") {
        const answer = message.content.trim().toLowerCase();
        if (isNegative(answer)) {
            userState.delete(discordId);
            return message.reply(
                "Cancelled. Send new text whenever you're ready.",
            );
        }

        if (!isAffirmative(answer)) {
            return message.reply(
                "Please reply with `yes` to continue or `no` to cancel.",
            );
        }

        const tokens = await getUserTokens(discordId);
        if (!tokens) {
            const appBaseUrl =
                process.env.APP_BASE_URL || "http://localhost:3000";
            userState.delete(discordId);
            return message.reply(
                `Google Calendar is not connected. Use: ${appBaseUrl}/auth/google?discordId=${discordId}`,
            );
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
                    discordId,
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
            } catch (err) {
                console.error(err);
                summary += `❌ ${title} failed\n`;
            }
        }

        if (!createdEvents.length) {
            userState.delete(discordId);
            return message.reply(`${summary}\nNo events were created.`);
        }

        userState.set(discordId, {
            step: "reminder",
            createdEvents,
            tokens,
        });

        return message.reply(
            `${summary}\nReply with reminder minutes (example: 10) so I can schedule Discord + Google notifications.`,
        );
    }

    if (active?.step === "reminder") {
        const minutes = Number.parseInt(message.content.trim(), 10);
        if (Number.isNaN(minutes) || minutes < 0 || minutes > 10080) {
            return message.reply(
                "Send a valid number between 0 and 10080 minutes.",
            );
        }

        for (const event of active.createdEvents) {
            try {
                await updateEventReminders(
                    active.tokens,
                    event.id,
                    buildReminders(minutes),
                );
                await updateEventReminderMinutes(discordId, event.id, minutes);
                scheduleDiscordReminder(client, discordId, event, minutes);
            } catch (error) {
                console.error("Failed to schedule reminder", error);
            }
        }

        userState.delete(discordId);
        return message.reply(
            `Reminders set for ${minutes} minutes before each event.`,
        );
    }

    const events = await parseTextToEvents(message.content);
    if (!events.length) return message.reply("No events found.");

    const preview = events
        .slice(0, 5)
        .map((event, index) => {
            const start = event.start?.dateTime || event.start?.date;
            return `${index + 1}. ${event.summary} @ ${start}`;
        })
        .join("\n");

    userState.set(discordId, {
        step: "confirm",
        events,
        rawText: message.content,
    });

    return message.reply(
        `I found ${events.length} event(s):\n${preview}\n\nReply with \`yes\` to confirm or \`no\` to cancel.`,
    );
});

export const startBot = async () => {
    if (!process.env.DISCORD_TOKEN) {
        console.warn("DISCORD_TOKEN missing; bot startup skipped.");
        return;
    }

    await client.login(process.env.DISCORD_TOKEN);
};
