// frontend/public/js/views/MeasurementsView.js
import { escapeHTML } from '../utils/helpers.js';

export default class MeasurementsView {
    constructor(container, api) {
        this.container = container;
        this.api = api;
        this.history = [];
        this.isFormOpen = false; // Переключатель показа формы добавления

        this._onClick = this.handleClick.bind(this);
        this.init();
    }

    async init() {
        try {
            const res = await this.api.getMeasurements();
            if (res.success) {
                this.history = res.data;
            }
            this.render();
        } catch (e) {
            this.container.innerHTML = `<div class="empty-state">Ошибка загрузки замеров</div>`;
        }
    }

    destroy() {
        this.container.removeEventListener('click', this._onClick);
    }

    render() {
        const now = new Date();
        const localISOTime = new Date(now - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);

        this.container.innerHTML = `
            <section style="padding-bottom: 80px;">
                <div class="card" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; padding: 12px; border: 1px solid var(--border-color);">
                    <a href="#profile" style="color: var(--accent-color); text-decoration: none; font-weight: 600;">← В профиль</a>
                    <button id="toggleFormBtn" style="background: var(--bg-color); color: var(--accent-color); border: 1px solid var(--border-color); padding: 8px 16px; border-radius: 8px; font-weight: 600; cursor: pointer;">
                        ${this.isFormOpen ? '✕ Закрыть' : '➕ Добавить запись'}
                    </button>
                </div>

                <div id="measurementFormContainer" style="display: ${this.isFormOpen ? 'block' : 'none'}; margin-bottom: 25px;">
                    <div class="card" style="border: 1px solid var(--border-color); padding: 15px;">
                        <h3 style="margin: 0 0 15px 0; font-size: 18px;">Новые параметры</h3>
                        
                        <div style="margin-bottom: 15px;">
                            <label style="display:block; font-size: 13px; color: var(--text-secondary); margin-bottom: 5px;">📅 Дата и время замера</label>
                            <input type="datetime-local" id="mDate" class="set-input" style="width: 100%; text-align: left;" value="${localISOTime}">
                        </div>

                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 20px;">
                            <div>
                                <label style="font-size: 12px; color: var(--text-secondary);">Вес (кг)</label>
                                <input type="number" id="m_weight" class="set-input" step="0.1" placeholder="75.5" style="width:100%; text-align:left;">
                            </div>
                            <div>
                                <label style="font-size: 12px; color: var(--text-secondary);">Талия (см)</label>
                                <input type="number" id="m_waist" class="set-input" step="0.1" placeholder="80" style="width:100%; text-align:left;">
                            </div>
                            <div>
                                <label style="font-size: 12px; color: var(--text-secondary);">Грудь (см)</label>
                                <input type="number" id="m_chest" class="set-input" step="0.1" placeholder="100" style="width:100%; text-align:left;">
                            </div>
                            <div>
                                <label style="font-size: 12px; color: var(--text-secondary);">Бицепс (см)</label>
                                <input type="number" id="m_biceps" class="set-input" step="0.1" placeholder="38" style="width:100%; text-align:left;">
                            </div>
                            <div>
                                <label style="font-size: 12px; color: var(--text-secondary);">Плечи (см)</label>
                                <input type="number" id="m_shoulders" class="set-input" step="0.1" placeholder="115" style="width:100%; text-align:left;">
                            </div>
                            <div>
                                <label style="font-size: 12px; color: var(--text-secondary);">Бедро (см)</label>
                                <input type="number" id="m_thighs" class="set-input" step="0.1" placeholder="55" style="width:100%; text-align:left;">
                            </div>
                            <div>
                                <label style="font-size: 12px; color: var(--text-secondary);">Икры (см)</label>
                                <input type="number" id="m_calves" class="set-input" step="0.1" placeholder="37" style="width:100%; text-align:left;">
                            </div>
                            <div>
                                <label style="font-size: 12px; color: var(--text-secondary);">Шея (см)</label>
                                <input type="number" id="m_neck" class="set-input" step="0.1" placeholder="39" style="width:100%; text-align:left;">
                            </div>
                        </div>

                        <button id="saveMeasurementBtn" class="primary-btn" style="background: #34c759; margin: 0;">
                            💾 Сохранить параметры
                        </button>
                    </div>
                </div>

                <h3 style="margin-bottom: 15px; font-size: 14px; text-transform: uppercase; color: var(--text-secondary); letter-spacing: 0.5px;">История изменений</h3>
                <div id="measurementsHistoryList">
                    ${this.renderHistoryList()}
                </div>
            </section>
        `;

        this.container.addEventListener('click', this._onClick);
    }

    renderHistoryList() {
        if (this.history.length === 0) {
            return '<div class="empty-state">Вы еще не добавляли замеры тела. Нажмите кнопку выше, чтобы сделать первую запись.</div>';
        }

        return this.history.map(item => {
            const dateObj = new Date(item.date);
            const formattedDate = dateObj.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });

            // Собираем массив только тех параметров, которые юзер заполнил
            const fields = [
                { label: '⚖️ Вес', value: item.weight, unit: 'кг' },
                { label: '📏 Талия', value: item.waist, unit: 'см' },
                { label: '🍈 Грудь', value: item.chest, unit: 'см' },
                { label: '💪 Бицепс', value: item.biceps, unit: 'см' },
                { label: '🦅 Плечи', value: item.shoulders, unit: 'см' },
                { label: '🍗 Бедро', value: item.thighs, unit: 'см' },
                { label: '🦶 Икры', value: item.calves, unit: 'см' },
                { label: '🦒 Шея', value: item.neck, unit: 'см' }
            ].filter(f => f.value !== null && f.value !== undefined);

            return `
                <div class="card" style="margin-bottom: 15px; padding: 15px; position: relative; border-left: 3px solid var(--accent-color);">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                        <span style="font-weight: bold; font-size: 14px; color: var(--text-primary);">📅 ${formattedDate}</span>
                        <button class="delete-m-btn" data-id="${item.id}" style="background: none; border: none; color: #ff3b30; font-size: 16px; cursor: pointer; padding: 5px;">🗑</button>
                    </div>
                    
                    <div style="display: flex; flex-wrap: wrap; gap: 15px;">
                        ${fields.map(f => `
                            <div style="background: var(--bg-color); padding: 6px 12px; border-radius: 8px; font-size: 13px;">
                                <span style="color: var(--text-secondary); margin-right: 4px;">${f.label}:</span>
                                <span style="font-weight: 700;">${f.value} ${f.unit}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }).join('');
    }

    async handleSave() {
        const btn = document.getElementById('saveMeasurementBtn');
        btn.innerText = 'Сохранение...';
        btn.disabled = true;

        const data = {
            date: new Date(document.getElementById('mDate').value).getTime(),
            weight: parseFloat(document.getElementById('m_weight').value) || null,
            waist: parseFloat(document.getElementById('m_waist').value) || null,
            chest: parseFloat(document.getElementById('m_chest').value) || null,
            biceps: parseFloat(document.getElementById('m_biceps').value) || null,
            shoulders: parseFloat(document.getElementById('m_shoulders').value) || null,
            thighs: parseFloat(document.getElementById('m_thighs').value) || null,
            calves: parseFloat(document.getElementById('m_calves').value) || null,
            neck: parseFloat(document.getElementById('m_neck').value) || null
        };

        // Проверяем, ввел ли юзер хоть что-то
        const hasData = Object.values(data).some((val, idx) => idx > 0 && val !== null);
        if (!hasData) {
            alert('Заполните хотя бы один параметр!');
            btn.innerText = '💾 Сохранить параметры';
            btn.disabled = false;
            return;
        }

        try {
            const res = await this.api.createMeasurement(data);
            if (res.success) {
                this.isFormOpen = false;
                await this.init(); // Перезагружаем ленту
            }
        } catch (e) {
            alert('Ошибка при сохранении параметров');
        } finally {
            btn.innerText = '💾 Сохранить параметры';
            btn.disabled = false;
        }
    }

    async handleClick(e) {
        const t = e.target;

        if (t.id === 'toggleFormBtn') {
            this.isFormOpen = !this.isFormOpen;
            this.render();
            return;
        }

        if (t.id === 'saveMeasurementBtn') {
            this.handleSave();
            return;
        }

        const deleteBtn = t.closest('.delete-m-btn');
        if (deleteBtn) {
            if (confirm('Удалить эту запись замеров из истории навсегда?')) {
                const id = deleteBtn.dataset.id;
                const res = await this.api.deleteMeasurement(id);
                if (res.success) {
                    await this.init();
                }
            }
        }
    }
}