import express from "express";
import { oauth2Client } from "../config/google.js";
import { saveUserTokens } from "../models/user.model.js";

const router = express.Router();

router.get("/google", (req, res) => {
    const discordId = req.query.discordId || req.query.state;
    if (!discordId) {
        return res.status(400).send("discordId is required");
    }

    const url = oauth2Client.generateAuthUrl({
        access_type: "offline",
        prompt: "consent",
        scope: ["https://www.googleapis.com/auth/calendar"],
        state: String(discordId),
    });
    res.redirect(url);
});

router.get("/google/callback", async (req, res) => {
    const { code, state } = req.query;
    const { tokens } = await oauth2Client.getToken(code);
    await saveUserTokens(state, tokens); // state = Discord ID
    res.redirect(
        `/dashboard?discordId=${encodeURIComponent(state)}&connected=1`,
    );
});

export default router;
