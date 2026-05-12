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

// В будущем сюда можно добавлять другие полезные функции, 
// например, форматирование даты, генерацию случайных ID и т.д.