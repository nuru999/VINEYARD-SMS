const TOKEN_KEY = 'vineyard_sms_token';

// Using sessionStorage reduces token persistence (minor hardening vs localStorage).
export const saveToken = (token) => sessionStorage.setItem(TOKEN_KEY, token);
export const getToken = () => sessionStorage.getItem(TOKEN_KEY);
export const clearToken = () => sessionStorage.removeItem(TOKEN_KEY);
