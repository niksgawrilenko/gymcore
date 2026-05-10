// Импортируем НОВУЮ функцию
import { getExercises } from './api.js';

document.addEventListener('DOMContentLoaded', () => {
    const fetchBtn = document.getElementById('fetchBtn');
    const resultDiv = document.getElementById('result');

    fetchBtn.addEventListener('click', async () => {
        resultDiv.innerText = "Загрузка упражнений...";
        
        try {
            const response = await getExercises();
            
            if(response.success) {
                const exercises = response.data;
                
                const listHTML = exercises.map(ex => 
                    `<div style="padding: 10px; border-bottom: 1px solid #ddd;">
                        <strong>${ex.name}</strong> 
                        <span style="color: gray; font-size: 0.9em;">(${ex.category})</span>
                    </div>`
                ).join('');

                resultDiv.innerHTML = `
                    <h3 style="margin-top: 0; color: #007aff;">База упражнений:</h3>
                    <div style="border: 1px solid #eee; border-radius: 8px;">
                        ${listHTML}
                    </div>
                `;
            } else {
                resultDiv.innerText = "Ошибка: " + response.error;
            }
        } catch (error) {
            resultDiv.innerText = "Ошибка соединения: " + error.message;
        }
    });
});