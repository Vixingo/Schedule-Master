export const extractLinks = (text) => text.match(/https?:\/\/[^\s]+/g) || [];
