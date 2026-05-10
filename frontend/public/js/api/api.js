// frontend/public/js/api.js

export class ApiClient {
    constructor() {
        this.baseURL = 'http://localhost:5000/api';
    }

    async getExercises() {
        try {
            const response = await fetch(`${this.baseURL}/exercises`);
            if (!response.ok) throw new Error(`Ошибка HTTP: ${response.status}`);
            return await response.json();
        } catch (error) {
            console.error("API Error:", error);
            throw error;
        }
    }
    
    // В будущем сюда легко добавятся методы:
    // async createWorkout(data) { ... }
    // async saveSets(data) { ... }
}