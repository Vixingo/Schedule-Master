export function extractLinks(text) {
    const regex = /(https?:\/\/[^\s]+)/g;
    return text.match(regex) || [];
}
