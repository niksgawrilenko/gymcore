// frontend/public/js/views/AuthView.js

export default class AuthView {
    constructor(container, api) {
        this.container = container;
        this.api = api;
        this.isLoginMode = true; // true = Вход, false = Регистрация
        
        this._onClick = this.handleClick.bind(this);
        this.render();
    }

    destroy() {
        this.container.removeEventListener('click', this._onClick);
    }

    render() {
        this.container.innerHTML = `
            <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 80vh; padding: 20px;">
                <h1 style="margin-bottom: 30px; font-size: 36px; font-weight: 800; text-align: center;">
                    Gym<span style="color: var(--accent-color);">Core</span>
                </h1>
                
                <div class="card" style="width: 100%; max-width: 400px; padding: 25px;">
                    <h2 style="text-align: center; margin-bottom: 20px;">${this.isLoginMode ? 'Вход в аккаунт' : 'Новый аккаунт'}</h2>

                    <div style="margin-bottom: 15px;">
                        <label style="font-size: 12px; color: var(--text-secondary); text-transform: uppercase;">Логин</label>
                        <input type="text" id="authUsername" class="set-input" style="text-align: left; margin-top: 5px;" placeholder="Введите логин">
                    </div>

                    <div style="margin-bottom: 25px;">
                        <label style="font-size: 12px; color: var(--text-secondary); text-transform: uppercase;">Пароль</label>
                        <input type="password" id="authPassword" class="set-input" style="text-align: left; margin-top: 5px;" placeholder="Введите пароль">
                    </div>

                    <button id="authSubmitBtn" class="primary-btn" style="margin-bottom: 15px;">
                        ${this.isLoginMode ? 'Войти' : 'Зарегистрироваться'}
                    </button>

                    <div style="text-align: center; font-size: 14px; color: var(--text-secondary);">
                        ${this.isLoginMode ? 'Нет аккаунта?' : 'Уже есть аккаунт?'}
                        <span id="toggleAuthModeBtn" style="color: var(--accent-color); cursor: pointer; font-weight: bold; margin-left: 5px;">
                            ${this.isLoginMode ? 'Создать' : 'Войти'}
                        </span>
                    </div>
                </div>
            </div>
        `;
        this.container.addEventListener('click', this._onClick);
    }

    async handleClick(e) {
        const t = e.target;

        // Переключение между Входом и Регистрацией
        if (t.id === 'toggleAuthModeBtn') {
            this.isLoginMode = !this.isLoginMode;
            this.render();
        }

        // Отправка формы
        if (t.id === 'authSubmitBtn') {
            const username = this.container.querySelector('#authUsername').value.trim();
            const password = this.container.querySelector('#authPassword').value.trim();

            if (!username || !password) return alert('Введите логин и пароль');

            t.innerText = 'Ожидание...';
            t.disabled = true;

            try {
                // Если логин успешен, токен сохранится внутри api.js
                if (this.isLoginMode) {
                    await this.api.login(username, password);
                } else {
                    await this.api.register(username, password);
                }
                
                // Перенаправляем на главную
                window.location.hash = ''; 
            } catch (err) {
                alert(err.message || 'Ошибка авторизации. Проверьте данные.');
                t.innerText = this.isLoginMode ? 'Войти' : 'Зарегистрироваться';
                t.disabled = false;
            }
        }
    }
}