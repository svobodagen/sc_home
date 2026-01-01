export const getInitials = (name: string) => {
    if (!name || !name.trim()) return "??";
    return name
        .trim()
        .split(/\s+/)
        .filter(part => part.length > 0)
        .map(part => part[0])
        .join("")
        .toUpperCase()
        .substring(0, 2);
};
