import express from "express";
import { oauth2Client } from "../config/google.js";
import { saveUserTokens } from "../models/user.model.js";

const router = express.Router();

router.get("/google", (req, res) => {
    const whatsappPhone = req.query.whatsappPhone || req.query.state;
    if (!whatsappPhone) {
        return res.status(400).send("whatsappPhone is required");
    }

    const url = oauth2Client.generateAuthUrl({
        access_type: "offline",
        prompt: "consent",
        scope: ["https://www.googleapis.com/auth/calendar"],
        state: String(whatsappPhone),
    });
    res.redirect(url);
});

router.get("/google/callback", async (req, res) => {
    const { code, state } = req.query;
    const { tokens } = await oauth2Client.getToken(code);
    await saveUserTokens(state, tokens); // state = WhatsApp phone
    res.redirect(
        `/dashboard?whatsappPhone=${encodeURIComponent(state)}&connected=1`,
    );
});

export default router;
