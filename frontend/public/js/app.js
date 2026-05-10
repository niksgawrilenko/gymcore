// frontend/public/js/app.js
import { ApiClient } from './api/api.js'; // Обновили путь, т.к. файл теперь в папке api
import { Router } from './router.js';

class ThemeManager {
    constructor() {
        this.toggleBtn = document.getElementById('themeToggleBtn');
        this.metaThemeColor = document.getElementById('theme-color-meta');
        this.currentTheme = localStorage.getItem('theme') || 
            (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
        
        this.init();
    }

    init() {
        this.applyTheme(this.currentTheme);
        this.toggleBtn.addEventListener('click', () => this.toggleTheme());
    }

    toggleTheme() {
        this.currentTheme = this.currentTheme === 'light' ? 'dark' : 'light';
        this.applyTheme(this.currentTheme);
        localStorage.setItem('theme', this.currentTheme);
    }

    applyTheme(theme) {
        if (theme === 'dark') {
            document.documentElement.setAttribute('data-theme', 'dark');
            if(this.metaThemeColor) this.metaThemeColor.setAttribute('content', '#000000');
        } else {
            document.documentElement.removeAttribute('data-theme');
            if(this.metaThemeColor) this.metaThemeColor.setAttribute('content', '#f2f2f7');
        }
    }
}

class GymCoreApp {
    constructor() {
        this.api = new ApiClient();
        this.themeManager = new ThemeManager();
        
        // Инициализируем роутер, передаем ID контейнера и наш API
        this.router = new Router('app-container', this.api);
        
        this.initPWA();
    }

    initPWA() {
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('/sw.js')
                    .then(registration => console.log('✅ PWA Service Worker зарегистрирован!'))
                    .catch(error => console.error('❌ Ошибка регистрации PWA:', error));
            });
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new GymCoreApp();
});