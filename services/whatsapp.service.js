import axios from "axios";

const apiVersion = process.env.WHATSAPP_API_VERSION || "v21.0";

const getApiUrl = () => {
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    if (!phoneNumberId) {
        throw new Error("WHATSAPP_PHONE_NUMBER_ID is not configured");
    }
    return `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`;
};

export const sendWhatsAppMessage = async (to, message) => {
    if (!to || !message) {
        throw new Error("Both 'to' and 'message' are required");
    }

    const token = process.env.WHATSAPP_ACCESS_TOKEN;
    if (!token) {
        throw new Error("WHATSAPP_ACCESS_TOKEN is not configured");
    }

    const payload = {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: String(to),
        type: "text",
        text: {
            body: String(message),
            preview_url: false,
        },
    };

    const response = await axios.post(getApiUrl(), payload, {
        headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
        },
    });

    return response.data;
};
