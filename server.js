import "dotenv/config";
import express from "express";
import { Client, GatewayIntentBits } from "discord.js";
import { oauth2Client } from "./config/google.js";
import { supabase } from "./config/supabase.js";
import { extractEvents } from "./services/aiService.js";
import { getOrCreateUser } from "./services/userService.js";
import { upsertEvent } from "./services/eventService.js";
import { extractLinks } from "./utils/linkExtractor.js";

const app = express();
const PORT = process.env.PORT || 3000;

// Discord Bot
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
});

client.on("messageCreate", async (message) => {
    if (message.author.bot) return;

    const user = await getOrCreateUser(message.author.id);

    const result = await extractEvents(message.content);
    if (!result.events?.length) {
        return message.reply("No valid events found.");
    }

    let summary = "";

    for (const event of result.events) {
        if (event.confidence < 0.65) continue;

        event.links = [
            ...new Set([
                ...(event.links || []),
                ...extractLinks(message.content),
            ]),
        ];

        const status = await upsertEvent(event, message.content, user);
        summary += `${event.title} → ${status}\n`;
    }

    message.reply(`Processed:\n${summary}`);
});

client.login(process.env.DISCORD_TOKEN);

// OAuth routes
app.get("/auth", (req, res) => {
    const { discord_id } = req.query;
    const state = Buffer.from(discord_id).toString("base64");

    const url = oauth2Client.generateAuthUrl({
        access_type: "offline",
        scope: ["https://www.googleapis.com/auth/calendar"],
        state,
    });

    res.redirect(url);
});

app.get("/oauth2callback", async (req, res) => {
    const { code, state } = req.query;
    const discordId = Buffer.from(state, "base64").toString();

    const { tokens } = await oauth2Client.getToken(code);

    const user = await getOrCreateUser(discordId);

    await supabase.from("google_accounts").upsert({
        user_id: user.id,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expiry_date: tokens.expiry_date,
    });

    res.send("Google connected successfully.");
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
