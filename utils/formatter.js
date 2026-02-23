export function formatTitle(event) {
    const map = {
        quiz: "📝 Quiz",
        assignment: "📌 Assignment",
        exam: "📚 Exam",
    };
    const prefix = map[event.type] || "📅 Event";
    return `${prefix} - ${event.title}`;
}

export function buildDescription(event, originalText) {
    let desc = "";

    if (event.course) desc += `Course: ${event.course}\n\n`;
    if (event.syllabus) desc += `Syllabus:\n${event.syllabus}\n\n`;

    if (event.links?.length) {
        desc += "Links:\n";
        event.links.forEach((l) => (desc += `${l}\n`));
        desc += "\n";
    }

    desc += "--- Full Announcement ---\n";
    desc += originalText;

    return desc;
}
