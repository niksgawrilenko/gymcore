// frontend/public/js/views/TemplatesView.js
export default class TemplatesView {
    constructor(container, api) {
        this.container = container;
        this.api = api;
        this.render();
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
        
        this.bindEvents();
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

        list.innerHTML = data.map(tpl => `
            <div class="card" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                <a href="#template-edit?id=${tpl.id}" style="text-decoration: none; color: inherit; flex-grow: 1;">
                    <div style="font-weight: 600; font-size: 17px;">${tpl.name}</div>
                    <div style="color: var(--text-secondary); font-size: 13px;">${tpl.description || 'Без описания'}</div>
                </a>
                <button class="delete-tpl-btn" data-id="${tpl.id}" style="background: none; border: none; color: #ff3b30; font-size: 18px; cursor: pointer; padding: 10px;">🗑</button>
            </div>
        `).join('');
    }

    bindEvents() {
        this.container.onclick = async (e) => {
            if (e.target.classList.contains('delete-tpl-btn')) {
                if (confirm('Удалить этот шаблон?')) {
                    await this.api.deleteTemplate(e.target.dataset.id);
                    this.loadTemplates();
                }
            }
        };

        this.container.oninput = (e) => {
            if (e.target.id === 'templateSearch') {
                const query = e.target.value.toLowerCase();
                const filtered = this.templates.filter(t => t.name.toLowerCase().includes(query));
                this.renderList(filtered);
            }
        };
    }
}