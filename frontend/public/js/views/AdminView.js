import { escapeHTML } from '../utils/helpers.js';

export default class AdminView {
    constructor(container, api) {
        this.container = container;
        this.api = api;
        this.render();
    }

    async render() {
        this.container.innerHTML = `
            <section>
                <div style="margin-bottom: 20px;">
                    <a href="#" style="color: var(--accent-color); text-decoration: none;">← Назад</a>
                </div>
                <h2 style="margin-bottom: 20px;">🛡️ Панель модератора</h2>
                <div id="pendingList">Загрузка заявок...</div>
            </section>
        `;

        this.loadPending();
    }

    async loadPending() {
        const res = await this.api.getAdminPending();
        const list = this.container.querySelector('#pendingList');
        
        if (!res.success || (!res.data.exercises.length && !res.data.templates.length)) {
            list.innerHTML = '<div class="empty-state">Новых заявок пока нет. Отдыхай, кэп! ☕</div>';
            return;
        }

        let html = '';
        
        // Рендерим упражнения
        if (res.data.exercises.length) {
            html += `<h3>Упражнения (${res.data.exercises.length})</h3>`;
            html += res.data.exercises.map(ex => this.getItemHTML(ex, 'exercise')).join('');
        }

        // Рендерим шаблоны
        if (res.data.templates.length) {
            html += `<h3 style="margin-top: 20px;">Шаблоны (${res.data.templates.length})</h3>`;
            html += res.data.templates.map(tpl => this.getItemHTML(tpl, 'template')).join('');
        }

        list.innerHTML = html;
        this.initButtons();
    }

    getItemHTML(item, type) {
        return `
            <div class="card" style="margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <strong>${escapeHTML(item.name || item.title)}</strong>
                    <div style="font-size: 12px; color: var(--text-secondary);">от ID пользователя: ${item.user_id}</div>
                </div>
                <div style="display: flex; gap: 10px;">
                    <button class="approve-btn" data-type="${type}" data-id="${item.id}" style="background: #34c759; color: white; border: none; padding: 8px 12px; border-radius: 8px; cursor: pointer;">Одобрить</button>
                    <button class="reject-btn" data-type="${type}" data-id="${item.id}" style="background: #ff3b30; color: white; border: none; padding: 8px 12px; border-radius: 8px; cursor: pointer;">Отклонить</button>
                </div>
            </div>
        `;
    }

    initButtons() {
        this.container.querySelectorAll('.approve-btn').forEach(btn => {
            btn.onclick = async () => {
                await this.api.approveItem(btn.dataset.type, btn.dataset.id);
                this.loadPending();
            };
        });

        this.container.querySelectorAll('.reject-btn').forEach(btn => {
            btn.onclick = async () => {
                await this.api.rejectItem(btn.dataset.type, btn.dataset.id);
                this.loadPending();
            };
        });
    }
}