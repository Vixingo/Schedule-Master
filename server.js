import "dotenv/config";
import { Client, GatewayIntentBits } from "discord.js";
import axios from "axios";
import cron from "node-cron";
import { createClient } from "@supabase/supabase-js";

// ================== ENV ==================
const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

// ================== INIT ==================
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
});

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Temporary memory (MVP only)
const pendingEvents = {};

// ================== GROQ CALL ==================
async function extractEvent(text) {
    const response = await axios.post(
        "https://api.groq.com/openai/v1/chat/completions",
        {
            model: "llama3-8b-8192",
            temperature: 0,
            messages: [
                {
                    role: "system",
                    content: `
Extract one event.
Return ONLY valid JSON:
{
 "title": "",
 "event_time": "ISO format",
 "confidence": 0.0
}
`,
                },
                { role: "user", content: text },
            ],
        },
        {
            headers: {
                Authorization: `Bearer ${GROQ_API_KEY}`,
                "Content-Type": "application/json",
            },
        },
    );

    const content = response.data.choices[0].message.content;
    return JSON.parse(content);
}

// ================== DISCORD BOT ==================
client.on("messageCreate", async (message) => {
    if (message.author.bot) return;

    const userId = message.author.id;

    // If waiting for confirmation
    if (pendingEvents[userId]) {
        const pending = pendingEvents[userId];

        if (message.content.toLowerCase().startsWith("yes")) {
            const reminderMatch = message.content.match(/\d+/);
            const reminderMinutes = reminderMatch
                ? parseInt(reminderMatch[0])
                : 10;

            await supabase.from("events").insert([
                {
                    user_id: userId,
                    title: pending.title,
                    event_time: pending.event_time,
                    reminder_minutes: reminderMinutes,
                    reminded: false,
                },
            ]);

            delete pendingEvents[userId];

            return message.reply(
                `✅ Event saved. I will remind you ${reminderMinutes} minutes before.`,
            );
        } else {
            delete pendingEvents[userId];
            return message.reply("❌ Cancelled.");
        }
    }

    // Normal message → extract event
    try {
        const event = await extractEvent(message.content);

        if (!event.title || !event.event_time) {
            return message.reply("⚠️ Could not understand event.");
        }

        pendingEvents[userId] = event;

        return message.reply(
            `I understood:\n📌 ${event.title}\n🕒 ${event.event_time}\n\nIs this correct?\nReply: "Yes 15" (for 15 min reminder)`,
        );
    } catch (err) {
        console.error(err);
        return message.reply("Error processing event.");
    }
});

// ================== REMINDER CRON ==================
cron.schedule("* * * * *", async () => {
    const now = new Date();

    const { data: events } = await supabase
        .from("events")
        .select("*")
        .eq("reminded", false);

    if (!events) return;

    for (const event of events) {
        const eventTime = new Date(event.event_time);
        const reminderTime = new Date(
            eventTime.getTime() - event.reminder_minutes * 60000,
        );

        if (now >= reminderTime) {
            try {
                const user = await client.users.fetch(event.user_id);
                await user.send(`⏰ Reminder: ${event.title}`);

                await supabase
                    .from("events")
                    .update({ reminded: true })
                    .eq("id", event.id);
            } catch (err) {
                console.error("Reminder error:", err);
            }
        }
    }
});

// ================== START ==================
client.login(DISCORD_TOKEN);
