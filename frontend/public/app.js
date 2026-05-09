// frontend/public/js/app.js

import { checkServerStatus } from './api.js';

document.addEventListener('DOMContentLoaded', () => {
    const fetchBtn = document.getElementById('fetchBtn');
    const resultDiv = document.getElementById('result');

    fetchBtn.addEventListener('click', async () => {
        resultDiv.innerText = "Загрузка...";
        
        try {
            const data = await checkServerStatus();
            if(data.success) {
                resultDiv.innerHTML = `
                    <span style="color: green;">${data.message}</span><br>
                    <small>Время БД: ${data.databaseTime}</small>
                `;
            } else {
                resultDiv.innerText = "Ошибка: " + data.error;
            }
        } catch (error) {
            resultDiv.innerText = "Ошибка соединения: " + error.message;
        }
    });
});