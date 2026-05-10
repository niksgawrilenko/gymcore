const API_URL = 'http://localhost:5000/api';

// Старая функция (оставим для истории)
export async function checkServerStatus() {
    try {
        const response = await fetch(`${API_URL}/status`);
        if (!response.ok) throw new Error(`Ошибка HTTP: ${response.status}`);
        return await response.json();
    } catch (error) {
        throw error;
    }
}

// НОВАЯ ФУНКЦИЯ: Получить список упражнений
export async function getExercises() {
    try {
        const response = await fetch(`${API_URL}/exercises`);
        if (!response.ok) throw new Error(`Ошибка HTTP: ${response.status}`);
        return await response.json();
    } catch (error) {
        throw error;
    }
}