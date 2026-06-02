// frontend/public/js/views/MeasurementsView.js
import { escapeHTML } from '../utils/helpers.js';

export default class MeasurementsView {
    constructor(container, api) {
        this.container = container;
        this.api = api;
        this.history = [];
        this.isFormOpen = false; 
        
        // Переменные для пагинации (ленивой загрузки)
        this.page = 1;
        this.hasMore = true;
        this.isLoading = false;

        this._onClick = this.handleClick.bind(this);
        // Привязываем события сразу, чтобы кнопки работали
        this.container.addEventListener('click', this._onClick); 
        this.loadMeasurements();
    }

    async loadMeasurements() {
        if (this.isLoading || !this.hasMore) return;
        
        this.isLoading = true;
        this.render();

        try {
            // Запрашиваем 20 замеров для текущей страницы
            const res = await this.api.getMeasurements(this.page, 20);
            if (res.success) {
                this.history = [...this.history, ...res.data];
                
                // Если пришло меньше 20 записей, значит это последняя страница
                if (res.data.length < 20) {
                    this.hasMore = false; 
                }
                
                this.page++;
            }
        } catch (e) {
            console.error(e);
            if (this.history.length === 0) {
                this.container.innerHTML = `<div class="empty-state">Ошибка загрузки замеров</div>`;
            }
        } finally {
            this.isLoading = false;
            this.render();
        }
    }

    destroy() {
        this.container.removeEventListener('click', this._onClick);
    }

    async handleSave() {
        const btn = this.container.querySelector('#saveMeasurementBtn');
        btn.innerText = 'Сохранение...';
        btn.disabled = true;

        const data = {
            weight: this.container.querySelector('#m_weight').value,
            chest: this.container.querySelector('#m_chest').value,
            waist: this.container.querySelector('#m_waist').value,
            biceps: this.container.querySelector('#m_biceps').value,
            thighs: this.container.querySelector('#m_thighs').value,
            calves: this.container.querySelector('#m_calves').value,
            shoulders: this.container.querySelector('#m_shoulders').value,
            neck: this.container.querySelector('#m_neck').value
        };

        const hasData = Object.values(data).some(val => val !== null && val !== '');
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
                // Сбрасываем пагинацию и грузим заново, чтобы увидеть свежий замер
                this.history = [];
                this.page = 1;
                this.hasMore = true;
                await this.loadMeasurements();
            }
        } catch (e) {
            alert('Ошибка при сохранении параметров');
        } finally {
            if (btn) {
                btn.innerText = '💾 Сохранить параметры';
                btn.disabled = false;
            }
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

        // Кнопка ленивой загрузки
        if (t.id === 'loadMoreMeasurementsBtn') {
            this.loadMeasurements();
            return;
        }

        const deleteBtn = t.closest('.delete-m-btn');
        if (deleteBtn) {
            if (confirm('Удалить эту запись замеров из истории навсегда?')) {
                const id = deleteBtn.dataset.id;
                await this.api.deleteMeasurement(id);
                // Сбрасываем пагинацию и грузим заново
                this.history = [];
                this.page = 1;
                this.hasMore = true;
                this.loadMeasurements();
            }
        }
    }

    render() {
        const formHTML = this.isFormOpen ? `
            <div class="card" style="margin-bottom: 20px; padding: 15px;">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                    <div><label>Вес (кг)</label><input type="number" id="m_weight" class="form-input" step="0.1"></div>
                    <div><label>Грудь (см)</label><input type="number" id="m_chest" class="form-input" step="0.1"></div>
                    <div><label>Талия (см)</label><input type="number" id="m_waist" class="form-input" step="0.1"></div>
                    <div><label>Бицепс (см)</label><input type="number" id="m_biceps" class="form-input" step="0.1"></div>
                    <div><label>Бедра (см)</label><input type="number" id="m_thighs" class="form-input" step="0.1"></div>
                    <div><label>Голень (см)</label><input type="number" id="m_calves" class="form-input" step="0.1"></div>
                    <div><label>Плечи (см)</label><input type="number" id="m_shoulders" class="form-input" step="0.1"></div>
                    <div><label>Шея (см)</label><input type="number" id="m_neck" class="form-input" step="0.1"></div>
                </div>
                <button id="saveMeasurementBtn" class="primary-btn" style="width: 100%; margin-top: 15px;">💾 Сохранить параметры</button>
            </div>
        ` : '';

        const historyHTML = this.history.length === 0 && !this.isLoading 
            ? `<div class="empty-state">История замеров пуста</div>`
            : this.history.map(m => `
                <div class="card" style="padding: 15px; margin-bottom: 10px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-color); padding-bottom: 8px; margin-bottom: 8px;">
                        <span style="font-weight: bold;">${new Date(m.date).toLocaleDateString('ru-RU')}</span>
                        <button class="icon-btn delete-m-btn" data-id="${m.id}" style="color: #ff3b30; background: none; border: none; font-size: 16px;">🗑️</button>
                    </div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 5px; font-size: 14px;">
                        ${m.weight ? `<div>Вес: <b>${m.weight} кг</b></div>` : ''}
                        ${m.chest ? `<div>Грудь: <b>${m.chest} см</b></div>` : ''}
                        ${m.waist ? `<div>Талия: <b>${m.waist} см</b></div>` : ''}
                        ${m.biceps ? `<div>Бицепс: <b>${m.biceps} см</b></div>` : ''}
                        ${m.thighs ? `<div>Бедра: <b>${m.thighs} см</b></div>` : ''}
                        ${m.calves ? `<div>Голень: <b>${m.calves} см</b></div>` : ''}
                        ${m.shoulders ? `<div>Плечи: <b>${m.shoulders} см</b></div>` : ''}
                        ${m.neck ? `<div>Шея: <b>${m.neck} см</b></div>` : ''}
                    </div>
                </div>
            `).join('');

        this.container.innerHTML = `
            <section style="padding-bottom: 80px;">
                <div class="card" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; padding: 12px; border: 1px solid var(--border-color);">
                    <h2 class="section-title" style="margin: 0;">Замеры тела</h2>
                    <button id="toggleFormBtn" class="primary-btn" style="padding: 6px 12px;">${this.isFormOpen ? 'Отмена' : '+ Добавить'}</button>
                </div>
                
                ${formHTML}
                
                <div id="measurementsList">
                    ${historyHTML}
                </div>

                ${this.hasMore && this.history.length > 0 ? `
                    <button id="loadMoreMeasurementsBtn" class="primary-btn" style="width: 100%; margin-top: 15px;" ${this.isLoading ? 'disabled' : ''}>
                        ${this.isLoading ? 'Загрузка...' : 'Показать более старые'}
                    </button>
                ` : ''}
            </section>
        `;
    }
}