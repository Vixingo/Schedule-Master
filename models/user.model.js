import { supabase } from "../config/db.js";
import { encrypt, decrypt } from "../utils/crypto.util.js";

export const saveUserTokens = async (whatsappPhone, tokens) => {
    const encryptedTokens = encrypt(JSON.stringify(tokens));

    const { data, error } = await supabase
        .from("users")
        .upsert(
            {
                whatsapp_phone: whatsappPhone,
                google_tokens: encryptedTokens,
            },
            { onConflict: "whatsapp_phone" },
        )
        .select();

    if (error) {
        console.error("SUPABASE UPSERT ERROR:", error);
        throw error;
    }

    console.log("Tokens saved for:", whatsappPhone, data);
};

export const getUserTokens = async (whatsappPhone) => {
    const { data } = await supabase
        .from("users")
        .select("*")
        .eq("whatsapp_phone", whatsappPhone)
        .maybeSingle();
    if (!data?.google_tokens) return null;
    return JSON.parse(decrypt(data.google_tokens));
};

export const getOrCreateUser = async (whatsappPhone) => {
    const { data } = await supabase
        .from("users")
        .select("*")
        .eq("whatsapp_phone", whatsappPhone)
        .maybeSingle();

    if (data) return data;

    const { data: inserted } = await supabase
        .from("users")
        .insert({ whatsapp_phone: whatsappPhone })
        .select("*")
        .single();

    return inserted;
};

export const getUserByWhatsAppPhone = async (whatsappPhone) => {
    const { data } = await supabase
        .from("users")
        .select("*")
        .eq("whatsapp_phone", whatsappPhone)
        .maybeSingle();
    return data;
};
