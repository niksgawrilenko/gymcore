// frontend/public/js/views/SettingsView.js
import { escapeHTML } from '../utils/helpers.js';

export default class SettingsView {
    constructor(container, api) {
        this.container = container;
        this.api = api;
        this.userData = JSON.parse(localStorage.getItem('gymcore_user') || '{}');
        
        this._onClick = this.handleClick.bind(this);
        this.render();
    }

    destroy() {
        this.container.removeEventListener('click', this._onClick);
    }

    render() {
        this.container.innerHTML = `
            <section style="padding-bottom: 80px;">
                <div class="card" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; padding: 12px; border: 1px solid var(--border-color);">
                    <a href="#profile" style="color: var(--accent-color); text-decoration: none; font-weight: 600;">← В профиль</a>
                    <h2 style="font-size: 16px; margin: 0;">Настройки</h2>
                    <div style="width: 60px;"></div>
                </div>

                <h3 style="font-size: 14px; text-transform: uppercase; color: var(--text-secondary); margin-bottom: 10px; margin-left: 5px;">Аккаунт</h3>
                <div class="card" style="padding: 15px; margin-bottom: 25px;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 15px; border-bottom: 1px solid var(--border-color); padding-bottom: 15px;">
                        <span style="font-weight: 500;">Имя пользователя</span>
                        <span style="color: var(--text-secondary);">${escapeHTML(this.userData.username || '—')}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; margin-bottom: 15px; border-bottom: 1px solid var(--border-color); padding-bottom: 15px;">
                        <span style="font-weight: 500;">Email</span>
                        <span style="color: var(--text-secondary);">${escapeHTML(this.userData.email || '—')}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between;">
                        <span style="font-weight: 500;">Роль</span>
                        <span style="background: var(--accent-color); color: white; padding: 2px 8px; border-radius: 6px; font-size: 12px; font-weight: bold;">
                            ${this.userData.role === 'admin' ? 'Администратор' : 'Пользователь'}
                        </span>
                    </div>
                </div>

                <h3 style="font-size: 14px; text-transform: uppercase; color: var(--text-secondary); margin-bottom: 10px; margin-left: 5px;">Данные</h3>
                <div class="card" style="padding: 0; overflow: hidden; margin-bottom: 25px;">
                    <button id="exportDataBtn" style="width: 100%; text-align: left; background: none; border: none; padding: 15px; font-size: 16px; cursor: pointer; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center;">
                        <span>📥 Скачать резервную копию (JSON)</span>
                        <span style="color: var(--text-secondary);">→</span>
                    </button>
                    <button id="clearCacheBtn" style="width: 100%; text-align: left; background: none; border: none; padding: 15px; font-size: 16px; cursor: pointer; display: flex; justify-content: space-between; align-items: center;">
                        <span>🧹 Очистить локальный кэш</span>
                        <span style="color: var(--text-secondary);">→</span>
                    </button>
                </div>
            </section>
        `;

        this.container.addEventListener('click', this._onClick);
    }

    async handleClick(e) {
        const t = e.target;

        if (t.id === 'exportDataBtn' || t.closest('#exportDataBtn')) {
            try {
                // Скачиваем данные с сервера
                const [wRes, mRes] = await Promise.all([
                    this.api.getWorkouts(),
                    this.api.getMeasurements()
                ]);
                
                const exportData = {
                    exportDate: new Date().toISOString(),
                    workouts: wRes.success ? wRes.data : [],
                    measurements: mRes.success ? mRes.data : []
                };

                // Создаем файл и вызываем скачивание
                const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportData, null, 2));
                const downloadAnchorNode = document.createElement('a');
                downloadAnchorNode.setAttribute("href", dataStr);
                downloadAnchorNode.setAttribute("download", `GymCore_Backup_${new Date().toISOString().slice(0,10)}.json`);
                document.body.appendChild(downloadAnchorNode); // required for firefox
                downloadAnchorNode.click();
                downloadAnchorNode.remove();
            } catch (err) {
                alert('Ошибка при экспорте данных.');
            }
            return;
        }

        if (t.id === 'clearCacheBtn' || t.closest('#clearCacheBtn')) {
            if (confirm('Очистить кэш приложения? Это удалит черновик активной тренировки.')) {
                localStorage.removeItem('gymcore_active_workout');
                window.gymcorePendingMedia = [];
                alert('Кэш успешно очищен!');
            }
        }
    }
}