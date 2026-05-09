// frontend/public/js/api.js

const API_URL = 'http://localhost:5000/api';

export async function checkServerStatus() {
    try {
        const response = await fetch(`${API_URL}/status`);
        if (!response.ok) throw new Error(`Ошибка HTTP: ${response.status}`);
        return await response.json();
    } catch (error) {
        throw error;
    }
}