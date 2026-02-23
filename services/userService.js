import { supabase } from "../config/supabase.js";

export async function getOrCreateUser(discordId) {
    let { data } = await supabase
        .from("users")
        .select("*")
        .eq("discord_id", discordId)
        .single();

    if (!data) {
        const inserted = await supabase
            .from("users")
            .insert({ discord_id: discordId })
            .select()
            .single();
        data = inserted.data;
    }

    return data;
}
