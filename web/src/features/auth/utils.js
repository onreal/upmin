export const isAuthData = (value) => {
    if (!value || typeof value !== "object") {
        return false;
    }
    const record = value;
    if (!Array.isArray(record.users)) {
        return false;
    }
    return record.users.every((user) => user && typeof user === "object");
};
export const isTokenAuth = (value) => {
    return !!value && value.type === "token";
};
