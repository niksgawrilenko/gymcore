// frontend/public/js/views/StatsView.js
import { escapeHTML } from '../utils/helpers.js';

export default class StatsView {
    constructor(container, api) {
        this.container = container;
        this.api = api;
        this.init();
    }

    async init() {
        // Показываем лоадер, пока ждем 1 микро-запрос
        this.container.innerHTML = `<div class="empty-state">Сбор аналитики...</div>`;
        try {
            // Мгновенный запрос вместо скачивания истории
            const res = await this.api.getAnalytics();
            
            if (res.success && res.data) {
                this.render(res.data);
            } else {
                this.container.innerHTML = `<div class="empty-state">Нет данных для статистики</div>`;
            }
        } catch (e) {
            console.error("Ошибка загрузки статистики:", e);
            this.container.innerHTML = `<div class="empty-state">Ошибка загрузки статистики</div>`;
        }
    }

    destroy() {}

    render(stats) {
        // Если база еще пустая, показываем нули
        const totalVolume = stats.totalVolume || 0;
        const totalSets = stats.totalSets || 0;

        this.container.innerHTML = `
            <section style="padding-bottom: 80px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                    <h2 class="section-title" style="margin: 0;">Аналитика</h2>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
                    <div class="card" style="padding: 20px; text-align: center; background: linear-gradient(135deg, #34c759 0%, #248a3d 100%); color: white;">
                        <div style="font-size: 28px; font-weight: 800; margin-bottom: 5px;">${totalSets}</div>
                        <div style="font-size: 13px; opacity: 0.9;">Выполнено подходов</div>
                    </div>
                </div>

                <div class="card" style="padding: 20px; margin-bottom: 15px; display: flex; align-items: center; gap: 15px;">
                    <div style="font-size: 35px;">🏋️‍♂️</div>
                    <div>
                        <div style="font-size: 13px; color: var(--text-secondary); margin-bottom: 2px;">Общий поднятый вес (Объем)</div>
                        <div style="font-size: 24px; font-weight: 800;">${totalVolume.toLocaleString('ru-RU')} <span style="font-size: 16px; color: var(--text-secondary);">кг</span></div>
                    </div>
                </div>
            </section>
        `;
    }
}