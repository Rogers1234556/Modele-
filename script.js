// Инициализация Telegram Web App
const tg = window.Telegram.WebApp;

function applySafeArea() {
    document.documentElement.style.setProperty(
        '--tg-safe-top',
        `${tg.safeAreaInset?.top || 0}px`
    );
}

applySafeArea();
tg.onEvent('viewportChanged', applySafeArea);

// Настройка темы и кнопок
tg.expand();
tg.setHeaderColor('bg_color'); // Устанавливаем цвет заголовка в цвет фона приложения
tg.setBackgroundColor('bg_color'); // Устанавливаем цвет фона

// Supabase configuration
const SUPABASE_URL = 'https://wgxkflgdjzqyengrmlsb.supabase.co/';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndneGtmbGdkanpxeWVuZ3JtbHNiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc4OTA2MTUsImV4cCI6MjA4MzQ2NjYxNX0.fM7_sOJCZ9SEZt73sABCE4NsXjnfVcs2h3usaFoNpf0';
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let userData = null;
let currentCurrency = localStorage.getItem('gov_currency') || 'USD';
let pricingMode = 'new'; // 'new' | 'renew'
let activeDiscount = null; // { percent: number, promoId: number } - активная скидка до первой оплаты

// Цены в разных валютах
const pricingData = {
    new: {
        15: { UAH: 99, RUB: 188, USD: 2.30 },
        30: { UAH: 249, RUB: 475, USD: 5.90 },
        365: { UAH: 1999, RUB: 3799, USD: 47.30 }
    },
    renew: {
        15: { UAH: 149, RUB: 285, USD: 3.50 },
        30: { UAH: 299, RUB: 570, USD: 7.00 },
        365: { UAH: 2499, RUB: 4750, USD: 59.00 }
    }
};

// Данные фракций
const factionsData = [
    { id: 'mvd', name: 'МВД', fullName: 'Министерство Внутренних Дел', icon: 'fas fa-shield-alt', color: '#3B82F6', features: ['в разработке'], status: 'available' },
    { id: 'fsb', name: 'ФСБ', fullName: 'Федеральная Служба Безопасности', icon: 'fas fa-user-secret', color: '#EF4444', features: ['в разработке'], status: 'available' },
    { id: 'mz', name: 'МЗ', fullName: 'Министерство Здравоохранения', icon: 'fas fa-heart-pulse', color: '#10B981', features: ['в разработке'], status: 'available' },
    { id: 'mo', name: 'МО', fullName: 'Министерство Обороны', icon: 'fas fa-jet-fighter', color: '#8B5CF6', features: ['в разработке'], status: 'available' },
    { id: 'fsin', name: 'ФСИН', fullName: 'Федеральная Служба Исполнения Наказаний', icon: 'fas fa-gavel', color: '#F59E0B', features: ['в разработке'], status: 'available' },
    { id: 'government', name: 'Пра-во', fullName: 'Правительство', icon: 'fas fa-landmark', color: '#6366F1', features: ['в разработке'], status: 'available' },
    { id: 'trk', name: 'ТРК', fullName: 'ТРК "Ритм"', icon: 'fas fa-tower-broadcast', color: '#EC4899', features: ['в разработке'], status: 'available' }
];

// Утилитарные функции
class Utils {
    static showToast(message, type = 'info', title = '') {
        let container = document.getElementById('toastContainer');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toastContainer';
            container.className = 'toast-container';
            document.body.appendChild(container);
        }
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <div class="toast-icon">
                <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
            </div>
            <div class="toast-content">
                ${title ? `<div class="toast-title">${title}</div>` : ''}
                <div class="toast-message">${message}</div>
            </div>
        `;
        container.appendChild(toast);
        setTimeout(() => {
            toast.classList.add('hiding');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    static formatDate(dateString) {
        if (!dateString) return '--.--.----';
        const date = new Date(dateString);
        return date.toLocaleString('ru-RU', { 
            day: '2-digit', 
            month: '2-digit', 
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    }

    static formatCurrency(amount, currency) {
        const symbols = { UAH: 'грн', RUB: 'руб', USD: '$' };
        if (currency === 'USD') return `$${parseFloat(amount).toFixed(2)}`;
        return `${amount} ${symbols[currency] || currency}`;
    }

    static async copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            this.showToast('Скопировано в буфер обмена', 'success');
            return true;
        } catch (err) {
            this.showToast('Ошибка копирования', 'error');
            return false;
        }
    }

    static calculateDaysLeft(dateString) {
        if (!dateString) return 0;
        const targetDate = new Date(dateString);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        // Устанавливаем целевую дату тоже на начало дня для чистого сравнения
        const target = new Date(targetDate);
        target.setHours(0, 0, 0, 0);

        const diffTime = target - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        // Если дата сегодня, это считается как 1 день (день истечения)
        // Но для отображения "Активный" нам нужно чтобы дней было > 0
        return diffDays >= 0 ? diffDays : 0;
    }

    static getDaysWord(days) {
        if (days % 10 === 1 && days % 100 !== 11) return 'день';
        if (days % 10 >= 2 && days % 10 <= 4 && (days % 100 < 10 || days % 100 >= 20)) return 'дня';
        return 'дней';
    }
}

// Класс управления UI
class UIManager {
    static init() {
        this.initTabNavigation();
        this.initCurrencySwitcher();
        this.initEventListeners();
        this.loadFactions();
        this.updateContestTimer();
        this.initRoulette();
    }

    // Настройка рулетки (укажите false, чтобы полностью скрыть)
    static ROULETTE_ENABLED = true;
    
    // ТЕКУЩИЙ СТИЛЬ РУЛЕТКИ: 'summer' | 'winter' | 'new-year'
    static ROULETTE_STYLE = 'winter'; 

    static ROULETTE_THEMES = {
        summer: [
            { id: 'nothing_2', name: '+10 дней', icon: 'fa-calendar-day', color: 'rgba(255, 159, 10, 0.8)', weight: 3 },
            { id: 'extra_spin', name: '+1 попытка', icon: 'fa-rotate-right', color: 'rgba(255, 55, 95, 0.8)', weight: 5 },
            { id: 'discount_5', name: 'Скидка 10%', icon: 'fa-percent', color: 'rgba(0, 122, 255, 0.8)', weight: 4 },
            { id: 'sub_1', name: '+5 дней', icon: 'fa-calendar-day', color: 'rgba(88, 86, 214, 0.8)', weight: 4 },
            { id: 'nothing', name: 'Ничего', icon: 'fa-face-frown', color: 'rgba(142, 142, 147, 0.8)', weight: 5 },
            { id: 'discount_10', name: 'Скидка 15%', icon: 'fa-tags', color: 'rgba(52, 199, 89, 0.8)', weight: 3 }
        ],
        winter: [
            { id: 'nothing_2', name: '+10 дней', icon: 'fa-snowflake', color: 'rgba(0, 199, 255, 0.8)', weight: 3 },
            { id: 'extra_spin', name: '+1 попытка', icon: 'fa-rotate-right', color: 'rgba(173, 216, 230, 0.8)', weight: 5 },
            { id: 'discount_5', name: 'Скидка 10%', icon: 'fa-percent', color: 'rgba(70, 130, 180, 0.8)', weight: 4 },
            { id: 'sub_1', name: '+5 дней', icon: 'fa-snowflake', color: 'rgba(0, 122, 255, 0.8)', weight: 4 },
            { id: 'nothing', name: 'Ничего', icon: 'fa-face-frown', color: 'rgba(112, 128, 144, 0.8)', weight: 5 },
            { id: 'discount_10', name: 'Скидка 15%', icon: 'fa-tags', color: 'rgba(176, 224, 230, 0.8)', weight: 3 }
        ],
        'new-year': [
            { id: 'gift_1', name: 'Подарок VIP', icon: 'fa-gift', color: 'rgba(255, 0, 0, 0.8)', weight: 2 },
            { id: 'extra_spin', name: '+1 попытка', icon: 'fa-rotate-right', color: 'rgba(0, 255, 0, 0.8)', weight: 5 },
            { id: 'discount_20', name: 'Скидка 20%', icon: 'fa-star', color: 'rgba(255, 215, 0, 0.8)', weight: 3 },
            { id: 'sub_30', name: '30 дней саба', icon: 'fa-crown', color: 'rgba(75, 0, 130, 0.8)', weight: 1 },
            { id: 'nothing', name: 'Ничего', icon: 'fa-snowflake', color: 'rgba(255, 255, 255, 0.3)', weight: 6 },
            { id: 'discount_50', name: 'Скидка 50%', icon: 'fa-candy-cane', color: 'rgba(255, 20, 147, 0.8)', weight: 1 }
        ]
    };

    static get ROULETTE_PRIZES() {
        return this.ROULETTE_THEMES[this.ROULETTE_STYLE] || this.ROULETTE_THEMES.summer;
    }

    static async initRoulette() {
        const container = document.getElementById('rouletteContainer');
        const section = document.querySelector('.roulette-section');
        
        if (!this.ROULETTE_ENABLED) {
            if (container) container.style.display = 'none';
            return;
        }
        if (container) container.style.display = 'block';

        // Применяем класс стиля к секции
        if (section) {
            // Удаляем старые стили
            section.className = section.className.replace(/\bstyle-\S+/g, '');
            section.classList.add(`style-${this.ROULETTE_STYLE}`);
        }

        const wheel = document.getElementById('rouletteWheel');
        if (!wheel) return;

        wheel.innerHTML = '';
        const prizeCount = this.ROULETTE_PRIZES.length;
        const angleStep = 360 / prizeCount;

        // Генерация снежинок для фона
        const snowContainer = section.querySelector('.snowflakes-container');
        if (snowContainer && this.ROULETTE_STYLE === 'new-year') {
            snowContainer.innerHTML = '';
            for (let i = 0; i < 20; i++) {
                const snow = document.createElement('div');
                snow.style.position = 'absolute';
                snow.style.left = Math.random() * 100 + '%';
                snow.style.top = '-20px';
                snow.style.opacity = Math.random();
                snow.style.fontSize = (Math.random() * 10 + 10) + 'px';
                snow.style.color = 'white';
                snow.innerHTML = '❄';
                snow.style.animation = `snowFall ${Math.random() * 5 + 3}s linear infinite`;
                snow.style.animationDelay = Math.random() * 10 + 's';
                snow.style.filter = 'blur(1px)';
                snowContainer.appendChild(snow);
            }
        }

        this.ROULETTE_PRIZES.forEach((prize, i) => {
            const sector = document.createElement('div');
            sector.className = 'wheel-sector';
            
            sector.style.transform = `rotate(${i * angleStep}deg)`;
            sector.style.backgroundColor = prize.color;
            sector.style.width = '100%';
            sector.style.height = '100%';
            sector.style.position = 'absolute';
            sector.style.left = '0';
            sector.style.top = '0';
            sector.style.transformOrigin = '50% 50%';
            
            // Precise sector geometry
            sector.style.clipPath = `polygon(50% 50%, 50% 0%, ${50 + 50 * Math.tan((angleStep * Math.PI) / 180)}% 0%)`;
            
            const content = document.createElement('div');
            content.className = 'sector-content';
            content.style.position = 'absolute';
            content.style.top = '10%'; 
            content.style.left = '50%';
            content.style.transform = `translateX(-50%) rotate(${angleStep / 2}deg)`;
            content.style.transformOrigin = 'center 120px'; 
            content.innerHTML = `<i class="fas ${prize.icon}"></i><span>${prize.name}</span>`;
            
            sector.appendChild(content);
            wheel.appendChild(sector);
        });

        const spinBtn = document.getElementById('spinBtn');
        if (spinBtn) {
            const userId = tg.initDataUnsafe?.user?.id;
            const { data: usage } = await supabaseClient
                .from('roulette_usage')
                .select('*')
                .eq('user_idtg', userId)
                .single();

            if (usage && usage.spins_left > 0) {
                spinBtn.disabled = false;
                spinBtn.querySelector('span').textContent = 'Испытать удачу';
            } else {
                spinBtn.disabled = true;
                spinBtn.querySelector('span').textContent = 'Попытки закончились';
            }
            spinBtn.onclick = () => this.spinRoulette();
        }
    }

    static async spinRoulette() {
        const userId = tg.initDataUnsafe?.user?.id;
        const spinBtn = document.getElementById('spinBtn');
        const wheel = document.getElementById('rouletteWheel');

        try {
            spinBtn.disabled = true;

            // Проверка попыток (код опущен для краткости, берем из существующего)
            let { data: usage } = await supabaseClient
                .from('roulette_usage')
                .select('*')
                .eq('user_idtg', userId)
                .single();

            if (!usage) {
                const { data: newUsage, error } = await supabaseClient
                    .from('roulette_usage')
                    .insert([{ user_idtg: userId, spins_left: 1, total_spins: 0 }])
                    .select()
                    .single();
                if (error) throw error;
                usage = newUsage;
            }

            if (usage.spins_left <= 0) {
                Utils.showToast('У вас нет попыток', 'error');
                return;
            }

            // Логика взвешенного рандома
            const totalWeight = this.ROULETTE_PRIZES.reduce((acc, p) => acc + (p.weight || 1), 0);
            let random = Math.random() * totalWeight;
            let prizeIndex = 0;
            
            for (let i = 0; i < this.ROULETTE_PRIZES.length; i++) {
                random -= (this.ROULETTE_PRIZES[i].weight || 1);
                if (random <= 0) {
                    prizeIndex = i;
                    break;
                }
            }

            const prize = this.ROULETTE_PRIZES[prizeIndex];
            
            // Анимация
            const prizeCount = this.ROULETTE_PRIZES.length;
            const extraSpins = 5; 
            const anglePerPrize = 360 / prizeCount;
            const finalAngle = (extraSpins * 360) + (360 - (prizeIndex * anglePerPrize)) - (anglePerPrize / 2);

            wheel.style.transform = `rotate(${finalAngle}deg)`;

            setTimeout(async () => {
                // Логика выигрыша
                let nextSpins = usage.spins_left - 1;
                let message = `Вы выиграли: ${prize.name}`;

                if (prize.id === 'extra_spin') {
                    nextSpins += 1;
                    message = 'Выпала еще одна попытка!';
                } else if (prize.id === 'sub_1') {
                    await this.addDaysToUser(userId, 1, 'Приз из рулетки');
                }

                // Обновляем состояние в базе
                await supabaseClient
                    .from('roulette_usage')
                    .update({ 
                        spins_left: nextSpins,
                        total_spins: usage.total_spins + 1,
                        last_prize: prize.name
                    })
                    .eq('user_idtg', userId);

                // Логирование
                await supabaseClient.from('logs').insert([{
                    title: 'Рулетка',
                    content: `Пользователь ${userId} выбил: ${prize.name}. Всего круток: ${usage.total_spins + 1}`,
                    admin: 'System'
                }]);

                Utils.showToast(message, prize.id === 'nothing' ? 'info' : 'success');
                
                // Обновляем кнопку сразу после анимации
                if (nextSpins > 0) {
                    spinBtn.disabled = false;
                    spinBtn.querySelector('span').textContent = 'Испытать удачу';
                } else {
                    spinBtn.disabled = true;
                    spinBtn.querySelector('span').textContent = 'Попытки закончились';
                }

                // Сброс колеса для следующего раза (без анимации)
                setTimeout(() => {
                    wheel.style.transition = 'none';
                    wheel.style.transform = `rotate(${finalAngle % 360}deg)`;
                    setTimeout(() => wheel.style.transition = '', 50);
                }, 1000);

            }, 5000);

        } catch (e) {
            console.error('Spin error:', e);
            spinBtn.disabled = false;
        }
    }

    static initTabNavigation() {
        document.querySelectorAll('.tab-btn').forEach(tab => {
            tab.addEventListener('click', (e) => {
                e.preventDefault();
                document.querySelectorAll('.tab-btn').forEach(t => t.classList.remove('active'));
                document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
                tab.classList.add('active');
                const pageId = tab.dataset.tab;
                const page = document.getElementById(pageId);
                if (page) {
                    page.classList.add('active');
                    if (pageId === 'profile') this.updateProfileUI();
                    if (pageId === 'contests') this.loadContests();
                }
            });
        });
    }

    static initCurrencySwitcher() {
        const currencyTabs = document.querySelectorAll('.currency-tab');

        currencyTabs.forEach(tab => {
            tab.classList.remove('active');

            if (tab.dataset.currency === currentCurrency) {
                tab.classList.add('active');
            }

            tab.addEventListener('click', () => {
                currentCurrency = tab.dataset.currency;
                localStorage.setItem('gov_currency', currentCurrency);

                currencyTabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');

                this.updatePrices();
            });
        });

        this.updatePrices();
    }

    static initEventListeners() {
        // Промокод
        const promoBtn = document.getElementById('promoBtn');
        const promoModal = document.getElementById('promoModal');
        const modalCloses = document.querySelectorAll('.modal-close');
        
        if (promoBtn) promoBtn.addEventListener('click', () => promoModal.classList.add('active'));
        modalCloses.forEach(close => close.addEventListener('click', () => {
            document.querySelectorAll('.modal').forEach(m => m.classList.remove('active'));
        }));

        // Копирование ключа
        const copyBtn = document.querySelector('.copy-btn');
        if (copyBtn) {
            copyBtn.addEventListener('click', () => {
                const key = document.getElementById('userKey').textContent;
                if (key && key !== 'Загрузка...' && key !== 'Не назначен') {
                    Utils.copyToClipboard(key);
                }
            });
        }

        // Поиск фракций
        const factionSearch = document.getElementById('factionSearch');
        if (factionSearch) {
            factionSearch.addEventListener('input', (e) => {
                this.loadFactions(e.target.value);
            });
        }

        // Обработка покупки
        document.querySelectorAll('.btn-buy').forEach(btn => {
            btn.addEventListener('click', () => {
                const plan = parseInt(btn.dataset.plan);
                const isRenewal = btn.dataset.for === 'renew';
                this.showPaymentMethodSelection(plan, isRenewal);
            });
        });

        // Обработка выбора способа оплаты
        document.querySelectorAll('.payment-method-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const method = btn.dataset.method;
                const plan = parseInt(document.getElementById('paymentPlanDays').value);
                const isRenewal = document.getElementById('paymentIsRenewal').value === 'true';
                
                document.getElementById('paymentMethodModal').classList.remove('active');
                
                switch(method) {
                    case 'stars':
                        this.showStarsPayment(plan, isRenewal);
                        break;
                        case 'cryptobot':
                        this.createCryptoInvoice(plan, isRenewal);
                        break;

                    case 'funpay':
                        window.open('https://funpay.com', '_blank');
                        Utils.showToast('Для оплаты через FunPay найдите нас на площадке', 'info');
                        break;
                    case 'other':
                        this.showSupportPayment(plan, isRenewal);
                        break;
                }
            });
        });

        // Кнопка оплаты звездами
        const payWithStarsBtn = document.getElementById('payWithStarsBtn');
        if (payWithStarsBtn) {
            payWithStarsBtn.addEventListener('click', () => {
                this.processStarsPayment();
            });
        }

        // Кнопка назад к способам оплаты (из звезд)
        const backToMethodsBtn = document.getElementById('backToMethodsBtn');
        if (backToMethodsBtn) {
            backToMethodsBtn.addEventListener('click', () => {
                document.getElementById('starsPaymentModal').classList.remove('active');
                const plan = parseInt(document.getElementById('starsPlanDays').value);
                const isRenewal = document.getElementById('starsIsRenewal').value === 'true';
                this.showPaymentMethodSelection(plan, isRenewal);
            });
        }

        // Кнопка назад к способам оплаты (из поддержки)
        const backToMethodsFromSupport = document.getElementById('backToMethodsFromSupport');
        if (backToMethodsFromSupport) {
            backToMethodsFromSupport.addEventListener('click', () => {
                document.getElementById('supportPaymentModal').classList.remove('active');
                const plan = parseInt(document.getElementById('supportPlanDays').value);
                const isRenewal = document.getElementById('supportIsRenewal').value === 'true';
                this.showPaymentMethodSelection(plan, isRenewal);
            });
        }

        // Активация промокода
        const activatePromoBtn = document.getElementById('activatePromoBtn');
        if (activatePromoBtn) {
            activatePromoBtn.addEventListener('click', () => {
                const code = document.getElementById('promoCode').value.trim();
                if (code) {
                    this.activatePromoCode(code);
                } else {
                    Utils.showToast('Введите промокод', 'error');
                }
            });
        }

        // Кнопка техподдержки
        const supportBtn = document.getElementById('supportBtn');
        if (supportBtn) {
            supportBtn.addEventListener('click', () => {
                window.open('https://t.me/mr_helpers_bot', '_blank');
            });
        }
    }

    static async activatePromoCode(code) {
        try {
            const userId = tg.initDataUnsafe?.user?.id;
            
            // Ищем промокод в базе
            const { data: promo, error } = await supabaseClient
                .from('promocodes')
                .select('*')
                .eq('code', code.toUpperCase())
                .eq('is_active', true)
                .single();

            if (error || !promo) {
                Utils.showToast('Промокод не найден или неактивен', 'error');
                return;
            }

            // Проверяем срок действия
            if (promo.expires_at && new Date(promo.expires_at) < new Date()) {
                Utils.showToast('Срок действия промокода истек', 'error');
                return;
            }

            // Проверяем лимит использований
            if (promo.max_uses && promo.used_count >= promo.max_uses) {
                Utils.showToast('Промокод больше недействителен', 'error');
                return;
            }

            // Проверяем, не использовал ли пользователь ЭТОТ промокод ранее
            const { data: usage } = await supabaseClient
                .from('promo_usages')
                .select('*')
                .eq('promo_id', promo.id)
                .eq('user_idtg', userId)
                .single();

            if (usage) {
                Utils.showToast('Вы уже активировали этот промокод', 'error');
                return;
            }

            // Обработка разных типов промокодов
            if (promo.type === 'Gift' || promo.type === 'FunPay') {
                // Эти типы дают дни сразу
                if (promo.days > 0) {
                    await this.addDaysToUser(userId, promo.days, `Активация промокода ${promo.code} (${promo.type})`);
                    
                    // Записываем использование
                    await supabaseClient.from('promo_usages').insert([{ user_idtg: userId, promo_id: promo.id }]);
                    await supabaseClient.rpc('increment_promo_uses', { promo_id: promo.id });
                    
                    Utils.showToast(`Промокод активирован! Добавлено ${promo.days} ${Utils.getDaysWord(promo.days)}`, 'success');
                } else {
                    Utils.showToast('Ошибка: промокод не содержит дней', 'error');
                }
            } else if (promo.type === 'Price') {
                // Скидочный промокод
                if (activeDiscount) {
                    Utils.showToast('У вас уже есть активная скидка', 'error');
                    return;
                }

                // Сохраняем скидку в базу
                const { error: discountError } = await supabaseClient
                    .from('user_discounts')
                    .insert([{
                        user_idtg: userId,
                        promo_id: promo.id,
                        discount_percent: promo.discount_percent,
                        promo_type: promo.type,
                        is_used: false
                    }]);

                if (discountError) throw discountError;

                // Записываем использование
                await supabaseClient.from('promo_usages').insert([{ user_idtg: userId, promo_id: promo.id }]);
                await supabaseClient.rpc('increment_promo_uses', { promo_id: promo.id });

                activeDiscount = {
                    percent: promo.discount_percent,
                    promoId: promo.id,
                    code: promo.code
                };

                // Если у пользователя нет хелпера (0 дней), начисляем бонусные дни сразу
                const currentDays = Utils.calculateDaysLeft(userData.daysgov);
                if (currentDays <= 0) {
                    let bonusDays = 0;
                    const p = promo.discount_percent;
                    
                    // Логика бонусов: 50-60% -> 10д, 40-49% -> 9д, 30-39% -> 8д, 20-29% -> 7д, 10-19% -> 6д, 1-9% -> 5д
                    if (p >= 50) bonusDays = 10;
                    else if (p >= 40) bonusDays = 9;
                    else if (p >= 30) bonusDays = 8;
                    else if (p >= 20) bonusDays = 7;
                    else if (p >= 10) bonusDays = 6;
                    else if (p >= 1) bonusDays = 5;

                    if (bonusDays > 0) {
                        await this.addDaysToUser(userId, bonusDays, `Бонус за промокод ${promo.type}`);
                        Utils.showToast(`Скидка ${p}% + ${bonusDays} дней в подарок!`, 'success');
                    } else {
                        Utils.showToast(`Скидка ${p}% активирована!`, 'success');
                    }
                } else {
                    Utils.showToast(`Скидка ${promo.discount_percent}% активирована!`, 'success');
                }

                this.updatePrices();
            }

            this.closeModals();
            document.getElementById('promoCode').value = '';
            await this.updateProfileUI();

        } catch (e) {
            console.error('Promo activation error:', e);
            Utils.showToast('Ошибка активации', 'error');
        }
    }

    static async addDaysToUser(userId, days, note = '') {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        let startDate = today;
        if (userData.daysgov) {
            const currentExpiry = new Date(userData.daysgov);
            if (currentExpiry > today) startDate = currentExpiry;
        }

        const newDate = new Date(startDate);
        newDate.setDate(newDate.getDate() + days);
        const newExpiryString = newDate.toISOString().split('T')[0];

        userData.daysgov = newExpiryString;
        await supabaseClient.from('users').update({ 
            daysgov: userData.daysgov,
            notes: note
        }).eq('idtg', userId);
    }

    static updatePrices() {
        const discount = activeDiscount ? activeDiscount.percent : 0;
        
        document.querySelectorAll('.pricing-card').forEach(card => {
            const priceElements = card.querySelectorAll('.price');
            priceElements.forEach(el => {
                const baseUah = parseFloat(el.dataset.uah);
                const baseRub = parseFloat(el.dataset.rub);
                const baseUsd = parseFloat(el.dataset.usd);

                const finalUah = (baseUah * (1 - discount / 100)).toFixed(0);
                const finalRub = (baseRub * (1 - discount / 100)).toFixed(0);
                const finalUsd = (baseUsd * (1 - discount / 100)).toFixed(2);

                if (currentCurrency === 'UAH') el.textContent = finalUah;
                if (currentCurrency === 'RUB') el.textContent = finalRub;
                if (currentCurrency === 'USD') el.textContent = finalUsd;
            });
        });
    }

    static async markDiscountAsUsed() {
        if (!activeDiscount) return;
        const userId = tg.initDataUnsafe?.user?.id;
        await supabaseClient
            .from('user_discounts')
            .update({ is_used: true })
            .eq('user_idtg', userId)
            .eq('promo_id', activeDiscount.promoId);
        
        activeDiscount = null;
        this.updatePrices();
    }

    static async loadContests() {
        try {
            const { data: contest, error } = await supabaseClient
                .from('contests')
                .select('*')
                .eq('is_active', true)
                .order('created_at', { ascending: false })
                .limit(1)
                .single();

            if (error || !contest) return;

            const timerEl = document.getElementById('contestTimer');
            const participantsEl = document.getElementById('contestParticipants');
            const contestBtn = document.querySelector('.contests-section .btn-secondary');

            if (timerEl) {
                const end = new Date(contest.ends_at);
                const now = new Date();
                if (end > now) {
                    timerEl.textContent = Utils.formatDate(contest.ends_at);
                    
                    // Установка таймера для автоматического завершения
                    const timeLeft = end.getTime() - now.getTime();
                    if (timeLeft < 86400000) { // Если осталось меньше суток, запускаем проверку
                        setTimeout(() => {
                            this.loadContests();
                        }, timeLeft + 1000);
                    }
                } else {
                    timerEl.textContent = 'Завершено';
                    if (!contest.winner_idtg) {
                        this.determineWinner(contest.id);
                    }
                }
            }

            // Считаем участников
            const { count } = await supabaseClient
                .from('contest_participants')
                .select('*', { count: 'exact', head: true })
                .eq('contest_id', contest.id);

            if (participantsEl) participantsEl.textContent = count || 0;

            if (contestBtn) {
                // Проверяем участие текущего пользователя
                const { data: participation } = await supabaseClient
                    .from('contest_participants')
                    .select('*')
                    .eq('contest_id', contest.id)
                    .eq('user_idtg', tg.initDataUnsafe?.user?.id)
                    .single();

                if (participation) {
                    contestBtn.innerHTML = '<i class="fas fa-check"></i><span>Вы участвуете</span>';
                    contestBtn.classList.add('btn-disabled');
                    contestBtn.disabled = true;
                } else if (new Date(contest.ends_at) > new Date()) {
                    contestBtn.innerHTML = '<i class="fas fa-plus"></i><span>Участвовать</span>';
                    contestBtn.classList.remove('btn-disabled');
                    contestBtn.disabled = false;
                    contestBtn.onclick = () => this.joinContest(contest.id);
                }
            }

        } catch (e) {
            console.error('Contest load error:', e);
        }
    }

    static async joinContest(contestId) {
        try {
            const { error } = await supabaseClient
                .from('contest_participants')
                .insert([{
                    contest_id: contestId,
                    user_idtg: tg.initDataUnsafe?.user?.id
                }]);

            if (error) throw error;

            Utils.showToast('Вы успешно зарегистрированы в конкурсе!', 'success');
            this.loadContests();

        } catch (e) {
            console.error('Join contest error:', e);
            Utils.showToast('Ошибка при регистрации', 'error');
        }
    }

    static async determineWinner(contestId) {
        try {
            // Получаем всех участников
            const { data: participants, error: pError } = await supabaseClient
                .from('contest_participants')
                .select('user_idtg')
                .eq('contest_id', contestId);
            
            if (pError || !participants || participants.length === 0) return;

            // Выбираем случайного победителя
            const winner = participants[Math.floor(Math.random() * participants.length)];
            
            // Обновляем таблицу конкурсов
            const { error: uError } = await supabaseClient
                .from('contests')
                .update({ 
                    winner_idtg: winner.user_idtg,
                    is_active: false 
                })
                .eq('id', contestId);

            if (uError) throw uError;
            
            console.log('Winner determined:', winner.user_idtg);
            this.loadContests();

        } catch (e) {
            console.error('Determine winner error:', e);
        }
    }

    static showPaymentMethodSelection(plan, isRenewal) {
        const modal = document.getElementById('paymentMethodModal');
        if (modal) {
            document.getElementById('paymentPlanDays').value = plan;
            document.getElementById('paymentIsRenewal').value = isRenewal;
            
            const planNames = { 15: '15 дней', 30: '30 дней', 365: '365 дней' };
            document.getElementById('selectedPlanInfo').textContent = `Тариф: ${planNames[plan] || plan + ' дней'}`;
            
            // Добавляем уведомление об активной подписке
            let subNotice = modal.querySelector('.active-sub-notice');
            if (!subNotice) {
                subNotice = document.createElement('div');
                subNotice.className = 'active-sub-notice';
                modal.querySelector('.modal-body').prepend(subNotice);
            }

            if (isRenewal) {
                subNotice.style.display = 'block';
                subNotice.style.color = '#10B981';
                subNotice.style.fontSize = '0.9rem';
                subNotice.style.marginBottom = '10px';
                subNotice.style.textAlign = 'center';
                subNotice.innerHTML = '<i class="fas fa-check-circle"></i> У вас есть активная подписка (Продление)';
            } else {
                subNotice.style.display = 'none';
            }

            const priceType = isRenewal ? 'renew' : 'new';
            const price = pricingData[priceType]?.[plan]?.[currentCurrency];
            if (price) {
                const currencySymbols = { UAH: 'грн', RUB: 'руб', USD: '$' };
                const priceText = currentCurrency === 'USD' ? `$${price.toFixed(2)}` : `${price} ${currencySymbols[currentCurrency]}`;
                document.getElementById('selectedPlanPrice').textContent = `К оплате: ${priceText}`;
            }
            
            modal.classList.add('active');
        }
    }

    static showStarsPayment(plan, isRenewal) {
        const modal = document.getElementById('starsPaymentModal');
        if (modal) {
            document.getElementById('starsPlanDays').value = plan;
            document.getElementById('starsIsRenewal').value = isRenewal;
            
            const planNames = { 15: '15 дней', 30: '30 дней', 365: '365 дней' };
            document.getElementById('starsPaymentTitle').textContent = `Подписка на ${planNames[plan] || plan + ' дней'}`;
            
            const starsPrice = this.getStarsPrice(plan, isRenewal);
            document.getElementById('starsAmount').textContent = starsPrice;
            
            modal.classList.add('active');
        }
    }

    static getStarsPrice(plan, isRenewal) {
        const starsPrices = {
            new: { 15: 117, 30: 294, 365: 2358 },
            renew: { 15: 176, 30: 352, 365: 2948 }
        };
        const priceType = isRenewal ? 'renew' : 'new';
        let price = starsPrices[priceType]?.[plan] || 100;

        // Применяем скидку, если она активна
        if (activeDiscount && activeDiscount.percent > 0) {
            const discountAmount = price * (activeDiscount.percent / 100);
            price = Math.round(price - discountAmount);
        }

        return price;
    }


    static async processStarsPayment() {
        const plan = parseInt(document.getElementById('starsPlanDays').value);
        const isRenewal = document.getElementById('starsIsRenewal').value === 'true';
        
        const payBtn = document.getElementById('payWithStarsBtn');
        if (payBtn) {
            payBtn.disabled = true;
            payBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> <span>Создание платежа...</span>';
        }

        try {
            const userId = tg.initDataUnsafe?.user?.id;
            
            const SERVER_URL = 'web-production-3ad44.up.railway.app'; 

            const response = await fetch(`https://${SERVER_URL}/api/create-stars-invoice`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ plan, isRenewal, userId })
            });
            
            const data = await response.json();
            
            if (data.success && data.invoiceUrl) {
                if (typeof tg !== 'undefined' && tg.openInvoice) {
                    tg.openInvoice(data.invoiceUrl, async (status) => {
                        if (status === 'paid') {
                            await this.activateSubscription(plan, isRenewal);
                            Utils.showToast('Оплата прошла успешно! Подписка активирована.', 'success');
                            this.closeModals();
                            this.updateProfileUI();
                        } else if (status === 'cancelled') {
                            Utils.showToast('Оплата отменена', 'info');
                        } else if (status === 'failed') {
                            Utils.showToast('Ошибка оплаты. Попробуйте снова.', 'error');
                        }
                        this.resetPayButton();
                    });
                } else {
                    window.open(data.invoiceUrl, '_blank');
                    Utils.showToast('Откройте ссылку для оплаты', 'info');
                    this.resetPayButton();
                }
            } else {
                throw new Error(data.message || 'Не удалось создать платеж');
            }
        } catch (error) {
            console.error('Stars payment error:', error);
            Utils.showToast(error);
            this.resetPayButton();
        }
    }

    static resetPayButton() {
        const payBtn = document.getElementById('payWithStarsBtn');
        if (payBtn) {
            payBtn.disabled = false;
            payBtn.innerHTML = '<i class="fas fa-star"></i> <span>Оплатить звездами</span>';
        }
    }

    static async activateSubscription(plan, isRenewalForce = null, method = 'Starstg', paidAmount = 0) {
        try {
            const userId = tg.initDataUnsafe?.user?.id;
            const userName = tg.initDataUnsafe?.user?.first_name || 'User';

            const today = new Date();
            today.setHours(0, 0, 0, 0);

            let startDate = today;
            // Проверяем текущую подписку
            if (userData?.daysgov) {
                const currentExpiry = new Date(userData.daysgov);
                if (currentExpiry > today) {
                    startDate = currentExpiry;
                }
            }

            const newDate = new Date(startDate);
            newDate.setDate(newDate.getDate() + parseInt(plan));
            const newExpiryString = newDate.toISOString().split('T')[0];

            // 1. Обновляем пользователя
            const { error: updateError } = await supabaseClient
                .from('users')
                .update({ 
                    daysgov: newExpiryString,
                    updated_at: new Date().toISOString()
                })
                .eq('idtg', userId);

            if (updateError) throw updateError;

            // Обновляем локальные данные
            if (userData) {
                userData.daysgov = newExpiryString;
            }

            // 2. Добавляем лог
            const logTitle = `Выдача подписки`;
            const logContent = `Пользователю ${userData?.name || userName} (ID: ${userId}) выдана подписка на ${plan} дней. Оплата через ${method}`;

            await supabaseClient.from('logs').insert([{
                title: logTitle,
                content: logContent, // Добавлено поле content согласно схеме
                admin: 'system',
                created_at: new Date().toISOString()
            }]);


            // 3. Добавляем запись о платеже (Payments Table)
            const fee = paidAmount * 0.05;
            const netAmount = paidAmount - fee;

            await supabaseClient.from('payments').insert([{
                user_id: userId,          // В схеме user_id, а не user_idtg
                user_name: userName,      // Требуется по схеме
                amount: paidAmount,
                fee: fee,
                net_amount: netAmount,
                method: method,
                status: 'completed',
                description: `Подписка на ${plan} дней (${isRenewalForce ? 'Продление' : 'Новая'})`, // В схеме description, а не details
                created_at: new Date().toISOString()
                // admin_id и admin_name можно оставить пустыми или добавить, если они обязательны (null)
            }]);

            // 4. Помечаем скидку как использованную (если была)
            if (activeDiscount) {
                await supabaseClient
                    .from('user_discounts')
                    .update({ is_used: true })
                    .eq('user_idtg', userId)
                    .eq('promo_id', activeDiscount.promoId);

                activeDiscount = null;
            }

            // Обновляем режим цен
            pricingMode = 'renew';

            return true;
        } catch (error) {
            console.error('Subscription activation error:', error);
            throw error;
        }
    }


    static showSupportPayment(plan, isRenewal) {
        const modal = document.getElementById('supportPaymentModal');
        if (modal) {
            document.getElementById('supportPlanDays').value = plan;
            document.getElementById('supportIsRenewal').value = isRenewal;
            modal.classList.add('active');
        }
    }

    static updatePrices() {
        // Автоматически определяем режим цен на основе подписки пользователя
        if (userData && userData.daysgov) {
            const daysLeft = Utils.calculateDaysLeft(userData.daysgov);
            pricingMode = daysLeft > 0 ? 'renew' : 'new';
            
            // Если подписка активна, принудительно устанавливаем флаг у всех кнопок покупки
            document.querySelectorAll('.btn-buy').forEach(btn => {
                btn.dataset.for = pricingMode;
            });
        }

        const pricingType = pricingMode;
        document.querySelectorAll('.pricing-card').forEach(card => {
            const planStr = card.dataset.plan.replace('-renew', '');
            const plan = parseInt(planStr);
            if (pricingData[pricingType]?.[plan]) {
                const priceEl = card.querySelector('.price');
                const currencyEl = card.querySelector('.currency');
                const originalAmount = pricingData[pricingType][plan][currentCurrency];
                const currencySymbols = { UAH: 'грн', RUB: 'руб', USD: '$' };
                
                // Применяем скидку если есть
                if (activeDiscount && activeDiscount.percent > 0) {
                    const discountedAmount = applyDiscount(originalAmount);
                    const formattedOriginal = currentCurrency === 'USD' ? originalAmount.toFixed(2) : originalAmount;
                    const formattedDiscounted = currentCurrency === 'USD' ? discountedAmount.toFixed(2) : discountedAmount;
                    
                    priceEl.innerHTML = `<span class="original-price">${formattedOriginal}</span> ${formattedDiscounted}`;
                    currencyEl.innerHTML = `${currencySymbols[currentCurrency]} <span class="discount-badge">-${activeDiscount.percent}%</span>`;
                } else {
                    priceEl.textContent = currentCurrency === 'USD' ? originalAmount.toFixed(2) : originalAmount;
                    currencyEl.textContent = currencySymbols[currentCurrency];
                }
            }
        });
        
        // Показываем баннер скидки если есть
        this.updateDiscountBanner();
    }
    
    static updateDiscountBanner() {
        let banner = document.getElementById('discountBanner');
        
        if (activeDiscount && activeDiscount.percent > 0) {
            if (!banner) {
                banner = document.createElement('div');
                banner.id = 'discountBanner';
                banner.className = 'discount-banner';
                const pricingSection = document.querySelector('.pricing-section');
                if (pricingSection) {
                    pricingSection.insertBefore(banner, pricingSection.firstChild);
                }
            }
            banner.innerHTML = `
                <i class="fas fa-tag"></i>
                <span>Промокод <strong>${activeDiscount.code}</strong> активен: скидка ${activeDiscount.percent}% на первую оплату</span>
            `;
            banner.style.display = 'flex';
        } else if (banner) {
            banner.style.display = 'none';
        }
    }
    // === CRYPTO BOT LOGIC ===

    // Обновленный метод создания инвойса
    static async createCryptoInvoice(plan, isRenewal) {
      try {
        const userId = tg.initDataUnsafe?.user?.id;
        const SERVER_URLL = 'https://web-production-3ad44.up.railway.app'; // Убедитесь, что URL верный

        const response = await fetch(`${SERVER_URLL}/api/create-crypto-invoice`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ plan, isRenewal, userId })
        });

        const data = await response.json();

        if (!data.ok) {
          // Теперь мы увидим реальную причину ошибки
          throw new Error(data.description || 'Ошибка создания счета');
        }

        this.showCryptoWaitModal(
          data.result,
          plan,
          isRenewal,
          data.result.amount
        );

      } catch (err) {
        console.error(err);
        Utils.showToast(err.message || 'Ошибка связи с сервером', 'error');
      }
    }

    static showCryptoWaitModal(invoice, plan, isRenewal, amount) {
        const modal = document.getElementById('cryptoPaymentModal');
        if (!modal) {
            console.error('cryptoPaymentModal not found');
            return;
        }

        // Заголовок
        const title = document.getElementById('cryptoPaymentTitle');
        if (title) {
            title.textContent = 'Ожидание оплаты...';
        }

        // Сумма
        const amountEl = document.getElementById('cryptoAmount');
        if (amountEl) {
            amountEl.textContent = amount;
        }

        // Валюта
        const currencyLabel = document.getElementById('cryptoCurrencyLabel');
        if (currencyLabel) {
            currencyLabel.textContent = invoice.asset || 'USD';
        }

        // Ссылка на оплату
        const payBtn = document.getElementById('openCryptoLinkBtn');
        if (payBtn) {
            payBtn.href = invoice.pay_url;
        }

        // Скрытые поля (для проверки)
        document.getElementById('cryptoInvoiceId').value = invoice.invoice_id;
        document.getElementById('cryptoPlanDays').value = plan;
        document.getElementById('cryptoIsRenewal').value = isRenewal;

        // Кнопка "Я оплатил"
        const checkBtn = document.getElementById('checkCryptoPaymentBtn');
        if (checkBtn) {
            checkBtn.onclick = () => this.checkCryptoStatus();
        }

        // Статус
        const statusText = document.getElementById('cryptoStatusText');
        if (statusText) {
            statusText.textContent = 'Ожидаем оплату...';
            statusText.className = 'text-center text-muted';
        }

        // Показываем модалку
        modal.classList.add('active');
    }

    // Обновленный метод проверки статуса (через ваш сервер)
    static async checkCryptoStatus() {
        const invoiceId = document.getElementById('cryptoInvoiceId').value;
        const plan = parseInt(document.getElementById('cryptoPlanDays').value);
        const isRenewal = document.getElementById('cryptoIsRenewal').value === 'true';
        const checkBtn = document.getElementById('checkCryptoPaymentBtn');
        const statusText = document.getElementById('cryptoStatusText');
        const SERVER_URLL = 'https://web-production-3ad44.up.railway.app';

        if (!invoiceId) return;

        checkBtn.disabled = true;
        checkBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i><span>Проверка...</span>';

        try {
            // ЗАПРОС ИДЕТ НА ВАШ СЕРВЕР, А НЕ НА CRYPTOBOT
            const response = await fetch(`${SERVER_URLL}/api/check-crypto-status`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    invoiceId: invoiceId
                })
            });

            const data = await response.json();

            if (data.ok && data.result && data.result.items.length > 0) {
                const invoice = data.result.items[0];

                if (invoice.status === 'paid') {
                    // УСПЕШНАЯ ОПЛАТА
                    statusText.textContent = 'Оплата прошла успешно!';
                    statusText.className = 'text-center text-success';

                    // Выдаем подписку
                    await this.activateSubscription(plan, isRenewal, 'CryptoBot', parseFloat(invoice.amount));

                    Utils.showToast('Подписка активирована!', 'success');
                    this.closeModals();
                    this.updateProfileUI();

                } else if (invoice.status === 'active') {
                    statusText.textContent = 'Оплата еще не поступила. Попробуйте через минуту.';
                    statusText.className = 'text-center text-warning';
                    Utils.showToast('Платеж не найден', 'warning');
                } else {
                    statusText.textContent = `Статус платежа: ${invoice.status}`;
                    statusText.className = 'text-center text-danger';
                }
            } else {
                 Utils.showToast('Не удалось получить статус', 'error');
            }
        } catch (error) {
            console.error(error);
            Utils.showToast('Ошибка проверки', 'error');
        } finally {
            if (statusText.className.indexOf('success') === -1) {
                checkBtn.disabled = false;
                checkBtn.innerHTML = '<i class="fas fa-check"></i><span>Я оплатил</span>';
            }
        }
    }



    static async updateProfileUI() {
        if (!userData) return;

        const userName = document.getElementById('userName');
        const userTelegram = document.getElementById('userTelegram');
        const userStatusBadge = document.getElementById('userStatusBadge');
        const userKey = document.getElementById('userKey');
        const govDays = document.getElementById('govDays');
        const userAvatar = document.getElementById('userAvatar');

        userName.textContent = userData.name || tg.initDataUnsafe?.user?.first_name || 'Пользователь';
        userTelegram.textContent = userData.telegram || (tg.initDataUnsafe?.user?.username ? `@${tg.initDataUnsafe?.user?.username}` : `ID: ${tg.initDataUnsafe?.user?.id}`);
        
        const daysLeft = Utils.calculateDaysLeft(userData.daysgov);
        const statusText = userData.status === 'banned' ? 'Заблокирован' : (daysLeft > 0 ? 'Активный' : 'Пользователь');
        const statusColor = userData.status === 'banned' ? '#EF4444' : (daysLeft > 0 ? '#10B981' : '#6B7280');

        userStatusBadge.innerHTML = `<span class="status-dot" style="background: ${statusColor}"></span><span>${statusText}</span>`;
        userKey.textContent = userData.key || 'Не назначен';
        govDays.textContent = daysLeft > 0 ? `${daysLeft} ${Utils.getDaysWord(daysLeft)}` : (userData.daysgov ? 'Истекла' : 'Нет подписки');

        if (tg.initDataUnsafe?.user?.photo_url) {
            userAvatar.style.backgroundImage = `url(${tg.initDataUnsafe?.user?.photo_url})`;
            userAvatar.style.backgroundSize = 'cover';
            userAvatar.innerHTML = '';
        }

        // Принудительно обновляем цены после обновления UI профиля
        this.updatePrices();
    }

    static loadFactions(search = '') {
        const factionsList = document.getElementById('factionsList');
        if (!factionsList) return;

        const filtered = factionsData.filter(f => 
            f.name.toLowerCase().includes(search.toLowerCase()) || 
            f.fullName.toLowerCase().includes(search.toLowerCase())
        );

        factionsList.innerHTML = filtered.map(f => `
            <div class="faction-card" onclick="UIManager.showFactionDetails('${f.id}')">
                <div class="faction-icon" style="background: ${f.color}20; color: ${f.color}">
                    <i class="${f.icon}"></i>
                </div>
                <div class="faction-title">${f.name}</div>
                <div class="faction-subtitle">${f.fullName}</div>
            </div>
        `).join('');
    }

    static showFactionDetails(id) {
        const faction = factionsData.find(f => f.id === id);
        if (!faction) return;

        const modal = document.getElementById('factionModal');
        const title = document.getElementById('factionModalTitle');
        const content = document.getElementById('factionModalContent');

        title.textContent = faction.fullName;
        content.innerHTML = `
            <div class="faction-modal-details">
                
                <div class="faction-features-list">
                    <h5>Функционал фракции:</h5>
                    <ul>
                        ${faction.features.map(feat => `
                            <li>
                                <i class="fas fa-check-circle" style="color: ${faction.color}"></i>
                                <span>${feat}</span>
                            </li>
                        `).join('')}
                    </ul>
                </div>
                
            </div>
        `;
        modal.classList.add('active');
    }

    static closeModals() {
        document.querySelectorAll('.modal').forEach(m => m.classList.remove('active'));
    }

    static updateContestTimer() {
        const timerEl = document.getElementById('contestTimer');
        if (!timerEl) return;
        timerEl.textContent = 'Завершено';
    }
}

// Сохранение данных пользователя в Supabase
async function saveUserData() {
    if (!userData || !tg.initDataUnsafe?.user?.id) return;
    try {
        const { error } = await supabaseClient
            .from('users')
            .upsert({
                idtg: tg.initDataUnsafe.user.id,
                name: userData.name,
                telegram: userData.telegram,
                status: userData.status,
                key: userData.key,
                daysgov: userData.daysgov,
                updated_at: new Date().toISOString()
            });
        if (error) console.error('Error saving user data:', error);
    } catch (error) {
        console.error('Error in saveUserData:', error);
    }
}

// Загрузка данных из Supabase
async function initApp() {
    try {
        const user = tg.initDataUnsafe?.user;
        if (!user || !user.id) {
            Utils.showToast('Ошибка авторизации Telegram', 'error');
            return;
        }

        let { data, error } = await supabaseClient
            .from('users')
            .select('*')
            .eq('idtg', user.id)
            .single();

        if (error && error.code !== 'PGRST116') {
            console.error('Supabase error:', error);
            Utils.showToast('Ошибка загрузки данных', 'error');
            return;
        }

        if (!data) {
            const { data: newUser, error: createError } = await supabaseClient
                .from('users')
                .insert([{
                    idtg: user.id,
                    name: user.first_name || 'User',
                    telegram: user.username || '',
                    status: 'active',
                    key: null,
                    daysgow: null,
                    created_at: new Date().toISOString()
                }])
                .select()
                .single();

            if (createError) {
                console.error('Create error:', createError);
            } else {
                userData = newUser;
            }
        } else {
            userData = data;
        }

        // Устанавливаем режим цен в зависимости от наличия подписки
        if (userData && userData.daysgov !== null) {
            pricingMode = 'renew';
        } else {
            pricingMode = 'new';
        }

        // Загружаем активную скидку пользователя (если есть)
        await loadActiveDiscount();

        UIManager.init();
        await UIManager.updateProfileUI();

        if (userData && !userData.key) {
            const prefix = 'GOV';
            const timestamp = Date.now().toString(36);
            const random = Math.random().toString(36).substr(2, 5);
            userData.key = `${prefix}-${timestamp}-${random}`.toUpperCase();
            await saveUserData();
            UIManager.updateProfileUI();
        }

    } catch (e) {
        console.error('Init error:', e);
        Utils.showToast('Критическая ошибка инициализации', 'error');
    }
}

// Загрузка активной скидки пользователя
async function loadActiveDiscount() {
    try {
        const userId = tg.initDataUnsafe?.user?.id;
        if (!userId) return;

        // Проверяем есть ли у пользователя неиспользованная скидка
        const { data: discountData, error } = await supabaseClient
            .from('user_discounts')
            .select('*, promocodes!inner(discount_percent, code)')
            .eq('user_idtg', userId)
            .eq('is_used', false)
            .single();

        if (!error && discountData) {
            activeDiscount = {
                percent: discountData.promocodes.discount_percent,
                promoId: discountData.promo_id,
                code: discountData.promocodes.code
            };
        }
    } catch (e) {
        console.error('Error loading discount:', e);
    }
}

// Применение скидки к цене
function applyDiscount(price) {
    if (!activeDiscount || !activeDiscount.percent) return price;
    const discountAmount = price * (activeDiscount.percent / 100);
    return Math.round(price - discountAmount);
}

document.addEventListener('DOMContentLoaded', initApp);
