// frontend/public/js/views/ProfileView.js
import { escapeHTML } from '../utils/helpers.js';

export default class ProfileView {
    constructor(container, api) {
        this.container = container;
        this.api = api;
        
        this.userData = JSON.parse(localStorage.getItem('gymcore_user') || '{}');
        this.stats = { workouts: '...', exercises: '...', templates: '...' };

        this._onClick = this.handleClick.bind(this);
        this.render();
        this.loadStats(); 
    }

    destroy() {
        this.container.removeEventListener('click', this._onClick);
    }

    async loadStats() {
        try {
            const myId = this.userData.id;
            const [wRes, eRes, tRes] = await Promise.all([
                this.api.getWorkouts(),
                this.api.getExercises(),
                this.api.getTemplates()
            ]);

            if (wRes.success) this.stats.workouts = wRes.data.length;
            if (eRes.success) this.stats.exercises = eRes.data.filter(e => e.user_id === myId).length;
            if (tRes.success) this.stats.templates = tRes.data.filter(t => t.user_id === myId).length;

            this.render(); 
        } catch (e) { console.error("Ошибка загрузки статистики профиля", e); }
    }

    render() {
        const isAdmin = this.userData.role === 'admin';
        const username = escapeHTML(this.userData.username || 'Пользователь');

        this.container.innerHTML = `
            <section style="padding-bottom: 80px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; padding-top: 10px;">
                    <h2 style="font-size: 24px; font-weight: 800; margin: 0;">${username}</h2>
                    <div style="display: flex; gap: 15px;">
                        <button class="icon-btn dev-stub-btn" style="font-size: 20px;">⚙️</button>
                    </div>
                </div>

                <div style="display: flex; align-items: center; gap: 20px; margin-bottom: 30px;">
                    <div style="width: 80px; height: 80px; border-radius: 50%; background: var(--border-color); display: flex; justify-content: center; align-items: center; font-size: 40px; flex-shrink: 0;">
                        👤
                    </div>
                    <div style="flex-grow: 1;">
                        <div style="font-weight: 700; font-size: 18px; margin-bottom: 12px;">${username}</div>
                        <div style="display: flex; gap: 20px; text-align: left;">
                            <div>
                                <div style="font-weight: 800; font-size: 16px;">${this.stats.workouts}</div>
                                <div style="font-size: 12px; color: var(--text-secondary);">Тренировки</div>
                            </div>
                            <div>
                                <div style="font-weight: 800; font-size: 16px;">${this.stats.exercises}</div>
                                <div style="font-size: 12px; color: var(--text-secondary);">Свои упр.</div>
                            </div>
                            <div>
                                <div style="font-weight: 800; font-size: 16px;">${this.stats.templates}</div>
                                <div style="font-size: 12px; color: var(--text-secondary);">Шаблоны</div>
                            </div>
                        </div>
                    </div>
                </div>

                <h3 style="margin-bottom: 15px; font-size: 14px; text-transform: uppercase; color: var(--text-secondary); letter-spacing: 0.5px;">Приборная панель</h3>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 30px;">
                    
                    <div class="card dev-stub-btn" style="margin: 0; padding: 15px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 10px; transition: transform 0.1s;">
                        <span style="font-size: 20px;">📈</span>
                        <span style="font-weight: 600; font-size: 15px;">Статистика</span>
                    </div>
                    
                    <div class="card" onclick="window.location.hash='#measurements'" style="margin: 0; padding: 15px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 10px; transition: transform 0.1s;">
                        <span style="font-size: 20px;">📏</span>
                        <span style="font-weight: 600; font-size: 15px;">Замеры</span>
                    </div>

                </div>

                ${isAdmin ? `
                    <a href="#admin" class="card" style="display: flex; justify-content: center; align-items: center; gap: 10px; background: #5856d6; color: white; text-decoration: none; font-weight: bold; margin-bottom: 20px; padding: 16px;">
                        <span style="font-size: 20px;">🛡️</span> Панель модератора
                    </a>
                ` : ''}

                <button id="logoutBtn" class="card" style="width: 100%; display: flex; justify-content: center; align-items: center; background: var(--surface-color); border: none; padding: 16px; color: #ff3b30; font-weight: bold; font-size: 16px; cursor: pointer;">
                    Выйти из аккаунта
                </button>
            </section>
        `;
        this.container.addEventListener('click', this._onClick);
    }

    handleClick(e) {
        const t = e.target;
        if (t.closest('.dev-stub-btn')) {
            alert('🛠️ Раздел в разработке!');
            return;
        }
        if (t.id === 'logoutBtn' || t.closest('#logoutBtn')) {
            if (confirm('Вы точно хотите выйти?')) this.api.logout();
        }
    }
}