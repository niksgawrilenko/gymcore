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
export const debounce = (func, delay) => {
    let timeout;
    return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), delay);
    };
};

export const showExerciseInfoModal = (ex) => {
    // Удаляем старую модалку, если она есть
    const existing = document.getElementById('exInfoModal');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'exInfoModal';
    overlay.className = 'modal-overlay active';
    
    // Форматируем данные (защита от пустых значений)
    const primary = ex.primary_groups && ex.primary_groups.length ? ex.primary_groups.join(', ') : (ex.category || 'Не указано');
    const secondary = ex.secondary_muscles && ex.secondary_muscles.length ? ex.secondary_muscles.join(', ') : 'Нет';
    const equip = ex.equipment || 'Собственный вес / Без оборудования';
    const type = ex.exercise_type === 'cardio' ? 'Кардио' : 'Силовое';

    overlay.innerHTML = `
        <div class="modal-content" style="max-height: 80vh; overflow-y: auto;">
            <div class="modal-header">
                <h3>${escapeHTML(ex.name)}</h3>
                <button class="close-info-btn close-btn" style="font-size: 20px; line-height: 1;">✕</button>
            </div>
            <div style="padding: 10px 0; font-size: 15px; line-height: 1.5;">
                <p style="margin-bottom: 12px; border-bottom: 1px solid var(--border-color); padding-bottom: 8px;">
                    <span style="color: var(--text-secondary);">Тип:</span><br><b>${type}</b>
                </p>
                <p style="margin-bottom: 12px; border-bottom: 1px solid var(--border-color); padding-bottom: 8px;">
                    <span style="color: var(--text-secondary);">Оборудование:</span><br><b>${escapeHTML(equip)}</b>
                </p>
                <p style="margin-bottom: 12px; border-bottom: 1px solid var(--border-color); padding-bottom: 8px;">
                    <span style="color: var(--text-secondary);">Основные мышцы:</span><br>
                    <span style="color: var(--accent-color); font-weight: bold;">${escapeHTML(primary)}</span>
                </p>
                <p style="margin-bottom: 8px;">
                    <span style="color: var(--text-secondary);">Дополнительные мышцы:</span><br>
                    <b>${escapeHTML(secondary)}</b>
                </p>
            </div>
            <button class="primary-btn close-info-btn" style="width: 100%; margin-top: 15px;">Закрыть</button>
        </div>
    `;

    document.body.appendChild(overlay);
    document.body.classList.add('modal-open');

    // Закрытие модалки
    const close = () => {
        overlay.remove();
        document.body.classList.remove('modal-open');
    };

    overlay.querySelectorAll('.close-info-btn').forEach(btn => btn.onclick = close);
    overlay.onclick = (e) => { if (e.target === overlay) close(); }; // Закрытие по клику на фон
};