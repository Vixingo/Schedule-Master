export const isDuplicate = (newEvent, existing) => {
    const titleMatch =
        newEvent.summary.toLowerCase().includes(existing.title.toLowerCase()) ||
        existing.title.toLowerCase().includes(newEvent.summary.toLowerCase());
    const sameDay =
        new Date(newEvent.start.dateTime).toDateString() ===
        new Date(existing.start_time).toDateString();
    return titleMatch && sameDay;
};
