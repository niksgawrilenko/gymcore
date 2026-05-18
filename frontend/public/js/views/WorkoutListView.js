// frontend/public/js/views/TemplatesView.js

import { escapeHTML, getCurrentUserId } from '../utils/helpers.js';

export default class TemplatesView {
    constructor(container, api) {
        this.container = container;
        this.api = api;
        this.templates = [];
        
        this._onClick = this.handleClick.bind(this);
        this._onInput = this.handleInput.bind(this);
        
        this.render();
    }

    destroy() {
        this.container.removeEventListener('click', this._onClick);
        this.container.removeEventListener('input', this._onInput);
    }

    async render() {
        this.container.innerHTML = `
            <section style="padding-bottom: 20px;">
                <h2 class="section-title" style="margin-top: 5px; margin-bottom: 15px;">Начать тренировку</h2>
                
                <button id="startEmptyWorkoutBtn" class="primary-btn" style="margin-bottom: 25px; box-shadow: none; border: 2px solid var(--accent-color); background: var(--surface-color); color: var(--accent-color);">
                    + Свободная тренировка
                </button>

                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                    <h2 style="font-size: 20px; font-weight: 600;">Мои программы</h2>
                    <a href="#template-create" style="background: none; border: none; color: var(--accent-color); font-weight: bold; font-size: 28px; cursor: pointer; text-decoration: none; padding: 0 10px;">+</a>
                </div>
                
                <input type="text" id="templateSearch" class="set-input" placeholder="🔍 Поиск шаблона..." style="width: 100%; margin-bottom: 20px; text-align: left;">
                
                <div id="templatesList"><div class="empty-state">Загрузка...</div></div>
            </section>
        `;
        
        this.container.addEventListener('click', this._onClick);
        this.container.addEventListener('input', this._onInput);
        this.loadTemplates();
    }

    async loadTemplates() {
        const list = this.container.querySelector('#templatesList');
        try {
            const res = await this.api.getTemplates();
            this.templates = res.data;
            this.renderList(this.templates);
        } catch (e) {
            list.innerHTML = '<div class="empty-state">Ошибка загрузки</div>';
        }
    }

    renderList(data) {
        const list = this.container.querySelector('#templatesList');
        if (data.length === 0) {
            list.innerHTML = '<div class="empty-state">У вас пока нет шаблонов</div>';
            return;
        }

        const myId = getCurrentUserId();
        const myTemplates = data.filter(tpl => tpl.user_id === myId);
        const globalTemplates = data.filter(tpl => tpl.user_id !== myId);

        const generateHTML = (tplList, isPersonal) => {
            return tplList.map(tpl => `
                <div class="card" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; opacity: ${isPersonal ? '1' : '0.85'};">
                    
                    <a href="#" class="start-template-link" data-id="${tpl.id}" data-name="${escapeHTML(tpl.name)}" style="text-decoration: none; color: inherit; flex-grow: 1;">
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <div style="font-weight: 600; font-size: 17px;">${escapeHTML(tpl.name)}</div>
                            ${!isPersonal ? '<span style="font-size: 11px; background: var(--bg-color); padding: 2px 6px; border-radius: 4px; color: var(--text-secondary);">🌍</span>' : ''}
                        </div>
                        <div style="color: var(--text-secondary); font-size: 13px; margin-top: 4px;">${escapeHTML(tpl.description || (isPersonal ? 'Без описания' : 'Системный шаблон'))}</div>
                    </a>
                    
                    ${isPersonal ? `
                        <div style="display: flex; gap: 8px; align-items: center;">
                            <span class="status-badge status-${tpl.moderation_status || 'none'}">${tpl.moderation_status || 'none'}</span>
                            
                            <a href="#template-edit?id=${tpl.id}" title="Редактировать" style="background:none; border:none; color:var(--accent-color); font-size: 18px; text-decoration:none; padding: 5px;">✎</a>
                            
                            <button class="moderate-tpl-btn" data-id="${tpl.id}" title="На модерацию" style="background:none; border:none; cursor:pointer; font-size: 16px;">🌐</button>
                            <button class="share-tpl-btn" data-id="${tpl.share_id}" title="Поделиться" style="background:none; border:none; cursor:pointer; font-size: 16px;">🔗</button>
                            
                            <button class="delete-tpl-btn" data-id="${tpl.id}" style="background: none; border: none; color: #ff3b30; font-size: 18px; cursor: pointer; padding: 5px;">🗑</button>
                        </div>
                    ` : `
                        <div style="padding: 10px; color: var(--text-secondary); font-size: 14px;">👁️ Чтение</div>
                    `}
                </div>
            `).join('');
        };

        list.innerHTML = `
            ${myTemplates.length > 0 ? `
                <h3 style="margin-bottom: 15px; font-size: 16px; color: var(--accent-color);">👤 Мои программы</h3>
                ${generateHTML(myTemplates, true)}
            ` : ''}

            ${globalTemplates.length > 0 ? `
                <h3 style="margin-top: 25px; margin-bottom: 15px; font-size: 16px; color: var(--text-secondary);">🌍 Глобальные шаблоны</h3>
                ${generateHTML(globalTemplates, false)}
            ` : ''}
        `;
    }

    async handleClick(e) {
        const t = e.target;

        // Удаление шаблона
        const deleteBtn = t.closest('.delete-tpl-btn');
        if (deleteBtn) {
            if (confirm('Удалить этот шаблон?')) {
                await this.api.deleteTemplate(deleteBtn.dataset.id);
                this.loadTemplates();
            }
        }

        // Отправка на модерацию
        const moderateBtn = t.closest('.moderate-tpl-btn');
        if (moderateBtn) {
            const id = moderateBtn.dataset.id;
            if (confirm('Отправить этот шаблон на модерацию, чтобы он стал общим для всех?')) {
                try {
                    await this.api.sendTemplateToModeration(id);
                    alert('Шаблон отправлен на проверку!');
                    this.loadTemplates();
                } catch (err) {
                    alert('Ошибка: ' + err.message);
                }
            }
        }

        // Кнопка Поделиться
        const shareBtn = t.closest('.share-tpl-btn');
        if (shareBtn) {
            const shareId = shareBtn.dataset.id;
            // Создаем ссылку для будущего роута shared-template
            const url = `${window.location.origin}/#shared-template?id=${shareId}`;
            navigator.clipboard.writeText(url);
            alert('Ссылка на шаблон скопирована!');
        }
        // Начать пустую тренировку
        if (t.closest('#startEmptyWorkoutBtn')) {
            if (localStorage.getItem('gymcore_active_workout')) {
                if (!confirm('У вас есть активная тренировка. Начать новую (текущая будет удалена)?')) return;
            }
            localStorage.removeItem('gymcore_active_workout');
            sessionStorage.removeItem('currentWorkoutTitle');
            sessionStorage.removeItem('currentTemplateId');
            window.location.hash = '#workout';
            return;
        }

        // Клик по самому шаблону (начать тренировку по шаблону)
        const templateCardLink = t.closest('.start-template-link');
        if (templateCardLink) {
            e.preventDefault();
            if (localStorage.getItem('gymcore_active_workout')) {
                if (!confirm('У вас есть активная тренировка. Сбросить её и начать по этому шаблону?')) return;
            }
            localStorage.removeItem('gymcore_active_workout');
            sessionStorage.setItem('currentWorkoutTitle', templateCardLink.dataset.name);
            sessionStorage.setItem('currentTemplateId', templateCardLink.dataset.id);
            window.location.hash = '#workout';
            return;
        }
    }

    handleInput(e) {
        if (e.target.id === 'templateSearch') {
            const query = e.target.value.toLowerCase();
            const filtered = this.templates.filter(t => t.name.toLowerCase().includes(query));
            this.renderList(filtered);
        }
    }
}