export function isDuplicate(newEvent, existing) {
    const titleMatch =
        newEvent.title.toLowerCase().includes(existing.title.toLowerCase()) ||
        existing.title.toLowerCase().includes(newEvent.title.toLowerCase());

    const sameDay =
        new Date(newEvent.start_time).toDateString() ===
        new Date(existing.start_time).toDateString();

    return titleMatch && sameDay;
}
