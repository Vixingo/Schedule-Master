import { oauth2Client, getCalendar } from "../config/google.js";
import { supabase } from "../config/supabase.js";

export async function getUserAuth(userId) {
    const { data } = await supabase
        .from("google_accounts")
        .select("*")
        .eq("user_id", userId)
        .single();

    oauth2Client.setCredentials({
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        expiry_date: data.expiry_date,
    });

    if (oauth2Client.isTokenExpiring()) {
        const refreshed = await oauth2Client.refreshAccessToken();
        const creds = refreshed.credentials;

        await supabase
            .from("google_accounts")
            .update({
                access_token: creds.access_token,
                expiry_date: creds.expiry_date,
            })
            .eq("user_id", userId);

        oauth2Client.setCredentials(creds);
    }

    return oauth2Client;
}
