// frontend/public/js/views/ProfileView.js

export default class ProfileView {
    constructor(container, api) {
        this.container = container;
        this.api = api;
        this._onClick = this.handleClick.bind(this);
        this.render();
    }

    destroy() {
        this.container.removeEventListener('click', this._onClick);
    }

    render() {
        const isAdmin = this.api.getUserRole() === 'admin';

        this.container.innerHTML = `
            <section>
                <h2 class="section-title" style="margin-top: 5px; text-align: center;">Профиль</h2>
                
                <div class="card" style="text-align: center; padding: 30px 15px; margin-bottom: 25px;">
                    <div style="font-size: 60px; margin-bottom: 10px;">👤</div>
                    <h3 style="margin-bottom: 5px;">Пользователь GymCore</h3>
                    <p style="color: var(--text-secondary); font-size: 14px;">Статистика появится в будущих обновлениях</p>
                </div>

                ${isAdmin ? `
                    <a href="#admin" class="card" style="display: block; text-align: center; background: #5856d6; color: white; text-decoration: none; font-weight: bold; margin-bottom: 20px;">
                        🛡️ Панель модератора
                    </a>
                ` : ''}

                <div class="card" style="padding: 5px;">
                    <button id="logoutBtn" style="width: 100%; background: none; border: none; padding: 15px; color: #ff3b30; font-weight: bold; font-size: 16px; cursor: pointer;">
                        Выйти из аккаунта
                    </button>
                </div>
            </section>
        `;
        
        this.container.addEventListener('click', this._onClick);
    }

    handleClick(e) {
        if (e.target.id === 'logoutBtn') {
            if (confirm('Вы точно хотите выйти?')) {
                this.api.logout();
            }
        }
    }
}