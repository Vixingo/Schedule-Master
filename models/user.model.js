import { supabase } from "../config/db.js";
import { encrypt, decrypt } from "../utils/crypto.util.js";

export const saveUserTokens = async (discordId, tokens) => {
    const encryptedTokens = encrypt(JSON.stringify(tokens));

    const { data, error } = await supabase
        .from("users")
        .upsert(
            {
                discord_id: discordId,
                google_tokens: encryptedTokens,
            },
            { onConflict: "discord_id" },
        )
        .select();

    if (error) {
        console.error("SUPABASE UPSERT ERROR:", error);
        throw error;
    }

    console.log("Tokens saved for:", discordId, data);
};

export const getUserTokens = async (discordId) => {
    const { data } = await supabase
        .from("users")
        .select("*")
        .eq("discord_id", discordId)
        .maybeSingle();
    if (!data?.google_tokens) return null;
    return JSON.parse(decrypt(data.google_tokens));
};

export const getOrCreateUser = async (discordId) => {
    const { data } = await supabase
        .from("users")
        .select("*")
        .eq("discord_id", discordId)
        .maybeSingle();

    if (data) return data;

    const { data: inserted } = await supabase
        .from("users")
        .insert({ discord_id: discordId })
        .select("*")
        .single();

    return inserted;
};

export const getUserByDiscordId = async (discordId) => {
    const { data } = await supabase
        .from("users")
        .select("*")
        .eq("discord_id", discordId)
        .maybeSingle();
    return data;
};
