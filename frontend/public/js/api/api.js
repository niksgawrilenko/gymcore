// frontend/public/js/api.js

export class ApiClient {
    constructor() {
        this.baseURL = 'http://localhost:5000/api';
    }

    // Универсальный метод для всех запросов
    async #request(endpoint, method = 'GET', body = null) {
        const options = {
            method,
            headers: { 'Content-Type': 'application/json' }
        };

        if (body) {
            options.body = JSON.stringify(body);
        }

        try {
            const response = await fetch(`${this.baseURL}${endpoint}`, options);
            if (!response.ok) {
                throw new Error(`Ошибка HTTP: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error(`[API] Ошибка запроса ${method} ${endpoint}:`, error);
            throw error;
        }
    }

    // ==========================================
    // --- УПРАЖНЕНИЯ (EXERCISES) ---
    // ==========================================
    getExercises() { return this.#request('/exercises'); }
    getExerciseById(id) { return this.#request(`/exercises/${id}`); }
    createExercise(data) { return this.#request('/exercises', 'POST', data); }
    updateExercise(id, data) { return this.#request(`/exercises/${id}`, 'PATCH', data); }
    deleteExercise(id) { return this.#request(`/exercises/${id}`, 'DELETE'); }

    // ==========================================
    // --- ШАБЛОНЫ (TEMPLATES) ---
    // ==========================================
    getTemplates() { return this.#request('/templates'); }
    getTemplateById(id) { return this.#request(`/templates/${id}`); }
    createTemplate(data) { return this.#request('/templates', 'POST', data); }
    updateTemplate(id, data) { return this.#request(`/templates/${id}`, 'PATCH', data); }
    deleteTemplate(id) { return this.#request(`/templates/${id}`, 'DELETE'); }

    // ==========================================
    // --- ТРЕНИРОВКИ (WORKOUTS) ---
    // ==========================================
    getWorkouts() { return this.#request('/workouts'); }
    getWorkoutDetail(id) { return this.#request(`/workouts/${id}`); }
    
    // saveWorkout оставлен для обратной совместимости с уже написанным кодом
    saveWorkout(data) { return this.#request('/workouts', 'POST', data); } 
    createWorkout(data) { return this.#request('/workouts', 'POST', data); }
    updateWorkout(id, data) { return this.#request(`/workouts/${id}`, 'PATCH', data); }
    deleteWorkout(id) { return this.#request(`/workouts/${id}`, 'DELETE'); }
}