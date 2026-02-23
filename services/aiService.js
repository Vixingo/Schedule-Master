import axios from "axios";

export async function extractEvents(text) {
    const response = await axios.post(
        "https://api.groq.com/openai/v1/chat/completions",
        {
            model: "llama-3.1-8b-instant",
            temperature: 0,
            messages: [
                {
                    role: "system",
                    content: `
Extract all academic events.
Return ONLY JSON:
{
 "events": [
   {
     "type": "",
     "title": "",
     "course": "",
     "start_time": "",
     "end_time": "",
     "all_day": false,
     "duration_minutes": null,
     "syllabus": "",
     "links": [],
     "confidence": 0.0
   }
 ]
}`,
                },
                { role: "user", content: text },
            ],
        },
        {
            headers: {
                Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
                "Content-Type": "application/json",
            },
        },
    );

    return JSON.parse(response.data.choices[0].message.content);
}
