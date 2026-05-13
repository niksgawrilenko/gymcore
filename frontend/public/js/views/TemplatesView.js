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
            <section style="padding-bottom: 80px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; background: var(--surface-color); padding: 12px; border-radius: 12px; border: 1px solid var(--border-color);">
                    <a href="#" style="color: var(--accent-color); text-decoration: none; font-weight: 600;">← Назад</a>
                    <a href="#template-create" style="background: none; border: none; color: var(--accent-color); font-weight: bold; font-size: 28px; cursor: pointer; text-decoration: none; padding: 0 10px;">+</a>
                </div>
                
                <h2 style="margin-bottom: 15px; font-size: 24px;">Мои шаблоны</h2>
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
                    <a href="#template-edit?id=${tpl.id}" style="text-decoration: none; color: inherit; flex-grow: 1;">
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <div style="font-weight: 600; font-size: 17px;">${escapeHTML(tpl.name)}</div>
                            ${!isPersonal ? '<span style="font-size: 11px; background: var(--bg-color); padding: 2px 6px; border-radius: 4px; color: var(--text-secondary);">🌍</span>' : ''}
                        </div>
                        <div style="color: var(--text-secondary); font-size: 13px; margin-top: 4px;">${escapeHTML(tpl.description || (isPersonal ? 'Без описания' : 'Системный шаблон'))}</div>
                    </a>
                    
                    ${isPersonal ? `
                        <button class="delete-tpl-btn" data-id="${tpl.id}" style="background: none; border: none; color: #ff3b30; font-size: 18px; cursor: pointer; padding: 10px;">🗑</button>
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
        const deleteBtn = e.target.closest('.delete-tpl-btn');
        if (deleteBtn) {
            if (confirm('Удалить этот шаблон?')) {
                await this.api.deleteTemplate(deleteBtn.dataset.id);
                this.loadTemplates();
            }
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