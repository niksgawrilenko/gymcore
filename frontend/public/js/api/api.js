// frontend/public/js/api/api.js

export class ApiClient {
    constructor() {
        const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        
        if (isLocal) {
            this.baseURL = 'http://localhost:5000/api';
        } else {
            // Указываем конкретный адрес твоего бэкенда на Render
            this.baseURL = 'https://gymcore-backend.onrender.com/api';
        }

        console.log(`[API] Соединение установлено: ${this.baseURL}`);
    }

    getToken() {
        return localStorage.getItem('gymcore_token');
    }

    // Универсальный метод для всех запросов
    async #request(endpoint, method = 'GET', body = null) {
        const options = {
            method,
            headers: { 'Content-Type': 'application/json' }
        };

        // Если у нас есть токен, прикрепляем его как пропуск (паспорт)
        const token = this.getToken();
        if (token) {
            options.headers['Authorization'] = `Bearer ${token}`;
        }

        if (body) {
            options.body = JSON.stringify(body);
        }

        try {
            const response = await fetch(`${this.baseURL}${endpoint}`, options);
            const data = await response.json();
            
            if (!response.ok) {
                // Если сервер вернул ошибку, пробрасываем её дальше
                throw new Error(data.error || `Ошибка HTTP: ${response.status}`);
            }
            return data;
        } catch (error) {
            console.error(`[API] Ошибка запроса ${method} ${endpoint}:`, error);
            throw error;
        }
    }

    // ==========================================
    // --- АВТОРИЗАЦИЯ (AUTH) ---
    // ==========================================
    async login(username, password) {
        const res = await this.#request('/auth/login', 'POST', { username, password });
        if (res.success) {
            localStorage.setItem('gymcore_token', res.token);
            // СОХРАНЯЕМ ВЕСЬ ОБЪЕКТ ПОЛЬЗОВАТЕЛЯ (включая роль)
            localStorage.setItem('gymcore_user', JSON.stringify(res.user));
        }
        return res;
    }

    async register(username, password) {
        const res = await this.#request('/auth/register', 'POST', { username, password });
        if (res.success) {
            localStorage.setItem('gymcore_token', res.token);
            // СОХРАНЯЕМ ВЕСЬ ОБЪЕКТ ПОЛЬЗОВАТЕЛЯ
            localStorage.setItem('gymcore_user', JSON.stringify(res.user));
        }
        return res;
    }

    async uploadFile(formData) {
        const response = await fetch(`${this.baseURL}/upload`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.getToken()}`
            },
            body: formData
        });

        const text = await response.text(); // Читаем сырой ответ сервера

        try {
            const data = JSON.parse(text); // Пытаемся превратить в JSON
            if (!response.ok) throw new Error(data.error || data.message || `Ошибка сервера: ${response.status}`);
            return data;
        } catch (e) {
            // Если сервер упал и вернул кусок HTML
            console.error("Сырой ответ сервера:", text);
            throw new Error(`Сбой на сервере (см. консоль F12): ${text.slice(0, 50)}...`);
        }
    }
    logout() {
        localStorage.removeItem('gymcore_token');
        window.location.hash = '#auth';
    }

    // ==========================================
    // Остальные методы остаются без изменений, 
    // они автоматически начнут использовать токен из #request
    // ==========================================
    getExercises() { return this.#request('/exercises'); }
    getExerciseById(id) { return this.#request(`/exercises/${id}`); }
    createExercise(data) { return this.#request('/exercises', 'POST', data); }
    updateExercise(id, data) { return this.#request(`/exercises/${id}`, 'PATCH', data); }
    deleteExercise(id) { return this.#request(`/exercises/${id}`, 'DELETE'); }

    getTemplates() { return this.#request('/templates'); }
    getTemplateById(id) { return this.#request(`/templates/${id}`); }
    createTemplate(data) { return this.#request('/templates', 'POST', data); }
    updateTemplate(id, data) { return this.#request(`/templates/${id}`, 'PATCH', data); }
    deleteTemplate(id) { return this.#request(`/templates/${id}`, 'DELETE'); }

    getWorkouts() { return this.#request('/workouts'); }
    getWorkoutDetail(id) { return this.#request(`/workouts/${id}`); }
    createWorkout(data) { return this.#request('/workouts', 'POST', data); }
    updateWorkout(id, data) { return this.#request(`/workouts/${id}`, 'PATCH', data); }
    deleteWorkout(id) { return this.#request(`/workouts/${id}`, 'DELETE'); }

    // ==========================================
    // --- ЗАМЕРЫ ТЕЛА ---
    // ==========================================
    getMeasurements() { 
        return this.#request('/measurements'); 
    }
    createMeasurement(data) { 
        return this.#request('/measurements', 'POST', data); 
    }
    deleteMeasurement(id) { 
        return this.#request(`/measurements/${id}`, 'DELETE'); 
    }
    
    // --- Модерация и шеринг ---
    async sendExerciseToModeration(id) {
        // Используем #request и указываем метод POST
        return this.#request(`/exercises/${id}/moderate`, 'POST');
    }

    async sendTemplateToModeration(id) {
        return this.#request(`/templates/${id}/moderate`, 'POST');
    }

    async getAdminPending() {
        // Для получения данных по умолчанию используется GET
        return this.#request('/admin/pending');
    }

    async approveItem(type, id) {
        return this.#request(`/admin/approve/${type}/${id}`, 'POST');
    }

    async rejectItem(type, id) {
        // Добавляем /admin/ в путь, как мы прописали на бэкенде
        return this.#request(`/admin/reject/${type}/${id}`, 'POST');
    }
    // Метод для получения роли пользователя (чтобы знать, показывать ли кнопку админки)
    getUserRole() {
        const user = JSON.parse(localStorage.getItem('gymcore_user') || '{}');
        return user.role || 'user';
    }
    async getSharedExercise(shareId) {
        return this.#request(`/shared/exercises/${shareId}`);
    }

    async getSharedTemplate(shareId) {
        return this.#request(`/shared/templates/${shareId}`);
    }
}