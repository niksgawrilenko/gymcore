// frontend/public/js/utils/helpers.js

export const escapeHTML = (str) => {
    if (!str) return "";
    return String(str).replace(/[&<>"']/g, (s) => ({
        "&": "&amp;", 
        "<": "&lt;", 
        ">": "&gt;", 
        '"': "&quot;", 
        "'": "&#39;"
    })[s]);
};

// Новая функция: достаем ID текущего пользователя из токена
export const getCurrentUserId = () => {
    const token = localStorage.getItem('gymcore_token');
    if (!token) return null;
    try {
        // JWT токен состоит из 3 частей, разделенных точкой. Данные лежат во 2-й части (payload).
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload.id;
    } catch (e) {
        return null;
    }
};