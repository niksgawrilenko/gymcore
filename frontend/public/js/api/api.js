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
    
    async saveWorkout(workoutData) {
        try {
            const response = await fetch(`${this.baseURL}/workouts`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(workoutData) // Превращаем наш State в строку
            });
            if (!response.ok) throw new Error(`Ошибка HTTP: ${response.status}`);
            return await response.json();
        } catch (error) {
            console.error("Ошибка при сохранении:", error);
            throw error;
        }
    }
}