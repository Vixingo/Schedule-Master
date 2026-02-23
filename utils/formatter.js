export const formatTitle = (event) => {
    const map = {
        quiz: "📝 Quiz",
        assignment: "📌 Assignment",
        exam: "📚 Exam",
    };
    const prefix = map[event.type] || "📅 Event";
    return `${prefix} - ${event.summary}`;
};

export const buildDescription = (event, originalText) => {
    let desc = "";
    if (event.course) desc += `Course: ${event.course}\n\n`;
    if (event.syllabus) desc += `Syllabus:\n${event.syllabus}\n\n`;
    if (event.links?.length)
        desc += "Links:\n" + event.links.join("\n") + "\n\n";
    desc += "--- Full Announcement ---\n" + originalText;
    return desc;
};
