import { supabase } from "../config/db.js";
import { getOrCreateUser } from "./user.model.js";

export const saveEventRecord = async ({
    whatsappPhone,
    googleEventId,
    title,
    description,
    startTime,
    endTime,
    recurrenceRule,
    links,
    type,
    sourceText,
    reminderMinutes,
}) => {
    const user = await getOrCreateUser(whatsappPhone);

    const { data, error } = await supabase
        .from("events")
        .insert({
            user_id: user.id,
            google_event_id: googleEventId,
            title,
            description,
            start_time: startTime,
            end_time: endTime,
            recurrence_rule: recurrenceRule,
            links: links || [],
            type,
            source_text: sourceText,
            reminder_minutes: reminderMinutes,
        })
        .select("*")
        .single();

    if (error) throw error;
    return data;
};

export const getEventsByWhatsAppPhone = async (whatsappPhone) => {
    const user = await getOrCreateUser(whatsappPhone);
    const { data, error } = await supabase
        .from("events")
        .select("*")
        .eq("user_id", user.id)
        .order("start_time", { ascending: true });

    if (error) throw error;
    return data || [];
};

export const updateEventReminderMinutes = async (
    whatsappPhone,
    googleEventId,
    reminderMinutes,
) => {
    const user = await getOrCreateUser(whatsappPhone);
    const { error } = await supabase
        .from("events")
        .update({ reminder_minutes: reminderMinutes })
        .eq("user_id", user.id)
        .eq("google_event_id", googleEventId);

    if (error) throw error;
};
