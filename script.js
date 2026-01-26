// Инициализация Telegram Web App
const tg = window.Telegram.WebApp;
let currentUser = null;
let userData = null;
let currentCurrency = localStorage.getItem('gov_currency') || 'UAH';
let pricingMode = 'new'; // 'new' | 'renew'

// Временное хранилище пользователей
const userStorage = {
    users: {},
    payments: {},

    getUser(userId) {
        return this.users[userId] || null;
    },

    createUser(userData) {
        this.users[userData.id] = userData;
        return userData;
    },

    updateUser(userId, updates) {
        if (this.users[userId]) {
            this.users[userId] = { ...this.users[userId], ...updates };
            return this.users[userId];
        }
        return null;
    },

    addPayment(userId, paymentData) {
        if (!this.payments[userId]) {
            this.payments[userId] = [];
        }
        paymentData.id = Date.now();
        paymentData.date = new Date().toISOString();
        this.payments[userId].unshift(paymentData);
        return paymentData;
    },

    getPayments(userId) {
        return this.payments[userId] || [];
    },

    getTotalUsers() {
        return Object.keys(this.users).length;
    },

    getActiveSubscriptions() {
        return Object.values(this.users).filter(user => 
            user.daysgow && new Date(user.daysgow) > new Date()
        ).length;
    }
};

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
    {
        id: 'mvd',
        name: 'МВД',
        fullName: 'Министерство Внутренних Дел',
        icon: 'fas fa-shield-alt',
        color: '#3B82F6',
        features: [
            'в разработке'
        ],
        status: 'available'
    },
    {
        id: 'fsb',
        name: 'ФСБ',
        fullName: 'Федеральная Служба Безопасности',
        icon: 'fas fa-user-secret',
        color: '#EF4444',
        features: [
            'в разработке'
        ],
        status: 'available'
    },
    {
        id: 'mz',
        name: 'МЗ',
        fullName: 'Министерство Здравоохранения',
        icon: 'fas fa-heart-pulse',
        color: '#10B981',
        features: [
            'в разработке'
        ],
        status: 'available'
    },
    {
        id: 'mo',
        name: 'МО',
        fullName: 'Министерство Обороны',
        icon: 'fas fa-jet-fighter',
        color: '#8B5CF6',
        features: [
            'в разработке'
        ],
        status: 'available'
    },
    {
        id: 'fsin',
        name: 'ФСИН',
        fullName: 'Федеральная Служба Исполнения Наказаний',
        icon: 'fas fa-gavel',
        color: '#F59E0B',
        features: [
            'в разработке'
        ],
        status: 'available'
    },
    {
        id: 'government',
        name: 'Пра-во',
        fullName: 'Правительство',
        icon: 'fas fa-landmark',
        color: '#6366F1',
        features: [
            'в разработке'
        ],
        status: 'available'
    },
    {
        id: 'trk',
        name: 'ТРК',
        fullName: 'ТРК "Ритм"',
        icon: 'fas fa-tower-broadcast',
        color: '#EC4899',
        features: [
            'в разработке'
        ],
        status: 'available'
    }
];

// Промокоды
const promoCodes = {
    'WELCOME2024': { days: 7, used: false },
    'GOVHELPER': { days: 15, used: false },
    'TEST123': { days: 30, used: false },
    'PREMIUM': { days: 365, used: false }
};

// Утилитарные функции
class Utils {
    static showToast(message, type = 'info', title = '') {
        const container = document.getElementById('toastContainer');
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
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }, 3000);
    }

    static formatDate(dateString) {
        if (!dateString) return '--.--.----';
        const date = new Date(dateString);
        return date.toLocaleDateString('ru-RU', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    }

    static formatDateTime(dateString) {
        if (!dateString) return '--.--.---- --:--';
        const date = new Date(dateString);
        return date.toLocaleString('ru-RU', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    static formatCurrency(amount, currency) {
        const symbols = {
            UAH: 'грн',
            RUB: 'руб',
            USD: '$'
        };

        if (currency === 'USD') {
            return `$${parseFloat(amount).toFixed(2)}`;
        }
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

    static debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    static generateKey(length = 16) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let key = '';
        for (let i = 0; i < length; i++) {
            key += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return key;
    }

    static getDaysWord(days) {
        if (days % 10 === 1 && days % 100 !== 11) return 'день';
        if (days % 10 >= 2 && days % 10 <= 4 && (days % 100 < 10 || days % 100 >= 20)) return 'дня';
        return 'дней';
    }

    static calculateDaysLeft(dateString) {
        if (!dateString) return 0;
        const targetDate = new Date(dateString);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const diffTime = targetDate - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays > 0 ? diffDays : 0;
    }
}

// Класс управления UI
class UIManager {
    static initTabNavigation() {
        console.log('Инициализация навигации...');

        document.querySelectorAll('.tab-btn').forEach(tab => {
            tab.addEventListener('click', (e) => {
                e.preventDefault();

                // Убираем активный класс у всех табов
                document.querySelectorAll('.tab-btn').forEach(t => {
                    t.classList.remove('active');
                });

                // Убираем активный класс у всех страниц
                document.querySelectorAll('.page').forEach(p => {
                    p.classList.remove('active');
                });

                // Добавляем активный класс текущему табу
                tab.classList.add('active');

                // Показываем соответствующую страницу
                const pageId = tab.dataset.tab;
                const page = document.getElementById(pageId);
                if (page) {
                    page.classList.add('active');

                    // Загружаем данные для страницы если нужно
                    if (pageId === 'factions') {
                        this.loadFactions();
                    } else if (pageId === 'contests') {
                        this.updateContestTimer();
                    } else if (pageId === 'profile') {
                        this.loadUserProfile();
                    } else if (pageId === 'main') {
                        this.updateCurrencyDisplay();
                    }
                }
            });
        });
    }

    static initCurrencySwitcher() {
        console.log('Инициализация переключателя валюты...');

        const currencyTabs = document.querySelectorAll('.currency-tab');
        console.log('Найдено кнопок валюты:', currencyTabs.length);

        if (currencyTabs.length === 0) {
            console.error('Кнопки валюты не найдены!');
            return;
        }

        // Восстанавливаем сохраненную валюту
        if (currentCurrency) {
            currencyTabs.forEach(tab => {
                if (tab.dataset.currency === currentCurrency) {
                    tab.classList.add('active');
                } else {
                    tab.classList.remove('active');
                }
            });
        }

        currencyTabs.forEach(tab => {
            tab.addEventListener('click', function() {
                const currency = this.dataset.currency;
                console.log('Клик по валюте:', currency);

                // Убираем активный класс у всех валют
                currencyTabs.forEach(t => {
                    t.classList.remove('active');
                });

                // Добавляем активный класс текущей валюте
                this.classList.add('active');

                // Обновляем текущую валюту
                currentCurrency = currency;

                // Сохраняем выбор
                localStorage.setItem('gov_currency', currentCurrency);
                console.log('Текущая валюта установлена:', currentCurrency);

                // Обновляем UI
                UIManager.updateCurrencyDisplay();
                UIManager.showAutoPaymentInfo();
            });
        });

        // Инициализируем отображение
        this.updateCurrencyDisplay();
    }

    static updateCurrencyDisplay() {
        console.log('Обновление отображения валюты:', currentCurrency);

        // Обновляем информацию о валюте
        this.updateCurrencyInfo();

        // Обновляем цены
        this.updatePrices();
    }

    static updateCurrencyInfo() {
        const el = document.getElementById('currentCurrencyInfo');
        if (!el) return;

        const currencyNames = {
            UAH: 'Украинская гривна (UAH)',
            RUB: 'Российский рубль (RUB)',
            USD: 'Доллар США (USD)'
        };

        const isRenewal = pricingMode === 'renew';
        const pricingText = isRenewal
            ? 'Для продления подписки'
            : 'Указанные цены действительны только для первого заказа (стартовый пакет) - при последующем продлении стоимость будет выше.';

        el.textContent = `${pricingText}`;
    }

    static updatePrices() {
        const pricingType = pricingMode; // ← ВАЖНО

        document.querySelectorAll('.pricing-card').forEach(card => {
            const plan = parseInt(card.dataset.plan.replace('-renew', ''));

            if (pricingData[pricingType]?.[plan]) {
                const priceEl = card.querySelector('.price');
                const currencyEl = card.querySelector('.currency');

                const amount = pricingData[pricingType][plan][currentCurrency];

                priceEl.textContent =
                    currentCurrency === 'USD' ? amount.toFixed(2) : amount;

                currencyEl.textContent = {
                    UAH: 'грн',
                    RUB: 'руб',
                    USD: '$'
                }[currentCurrency];
            }
        });
    }

    static togglePricing(isRenewal) {
        pricingMode = isRenewal ? 'renew' : 'new';

        document.getElementById('newUserPricing')?.classList.toggle('hidden', isRenewal);
        document.getElementById('renewalPricing')?.classList.toggle('hidden', !isRenewal);

        this.updateCurrencyDisplay();
    }

    static async loadUserProfile() {
        if (!currentUser || !userData) {
            console.log('Нет данных пользователя для загрузки профиля');
            return;
        }

        const userAvatar = document.getElementById('userAvatar');
        const userName = document.getElementById('userName');
        const userTelegram = document.getElementById('userTelegram');
        
        const userStatusBadge = document.getElementById('userStatusBadge');
        const userKey = document.getElementById('userKey');
        const govDays = document.getElementById('govDays');
        const launcherBtn = document.getElementById('launcherBtn');
        const pricingToggle = document.getElementById('pricingToggle');
        const autoPaymentToggle = document.getElementById('autoPaymentToggle');
        const autoPaymentStatus = document.getElementById('autoPaymentStatus');
        const autoPaymentStatusText = document.getElementById('autoPaymentStatusText');

        // Обновляем аватар
        if (currentUser.photo_url) {
            userAvatar.style.backgroundImage = `url(${currentUser.photo_url})`;
            userAvatar.innerHTML = '';
        } else {
            const initials = currentUser.first_name ? currentUser.first_name[0] : 'U';
            userAvatar.innerHTML = `<span style="font-size: 24px;">${initials}</span>`;
        }

        // Обновляем имя
        const name = userData.name || currentUser.first_name || 'Пользователь';
        userName.textContent = name;

        // Обновляем Telegram
        const telegram = currentUser.username ? `@${currentUser.username}` : `ID: ${currentUser.id}`;
        userTelegram.textContent = telegram;

        // Обновляем статус в хедере
        

        // Обновляем бейдж статуса
        const statusText = userData.status === 'banned' ? 'Заблокирован' : 
                          userData.daysgow && Utils.calculateDaysLeft(userData.daysgow) > 0 ? 'Активный покупатель' : 'Пользователь';
        const statusColor = userData.status === 'banned' ? '#EF4444' : 
                           (userData.daysgow && Utils.calculateDaysLeft(userData.daysgow) > 0) ? '#10B981' : '#6B7280';

        userStatusBadge.innerHTML = `
            <span class="status-dot" style="background: ${statusColor}"></span>
            <span>${statusText}</span>
        `;

        // Обновляем ключ
        userKey.textContent = userData.key || 'Не назначен';

        // Обновляем дни подписки
        if (userData.daysgow) {
            const daysLeft = Utils.calculateDaysLeft(userData.daysgow);
            if (daysLeft > 0) {
                govDays.textContent = `${daysLeft} ${Utils.getDaysWord(daysLeft)}`;
                if (launcherBtn) {
                    launcherBtn.style.display = 'flex';
                    launcherBtn.href = userData.launcherUrl || '#';
                }

                // Показываем тарифы для продления
                if (pricingToggle) {
                    pricingToggle.checked = true;
                    pricingMode = 'renew';
                    this.togglePricing(true);
                }
            } else {
                govDays.textContent = 'Истекла';
                if (launcherBtn) launcherBtn.style.display = 'none';
            }
        } else {
            govDays.textContent = 'Нет подписки';
            if (launcherBtn) launcherBtn.style.display = 'none';
        }

        // Обновляем статус автоплатежа
        if (userData.autoPayment) {
            if (autoPaymentToggle) autoPaymentToggle.checked = true;
            if (autoPaymentStatus) autoPaymentStatus.style.display = 'flex';
            if (autoPaymentStatusText) {
                autoPaymentStatusText.textContent = 'Активен';
                autoPaymentStatusText.style.color = '#10B981';
            }
            this.showAutoPaymentInfo();
        } else {
            if (autoPaymentStatus) autoPaymentStatus.style.display = 'flex';
            if (autoPaymentStatusText) {
                autoPaymentStatusText.textContent = 'Не активен';
                autoPaymentStatusText.style.color = '#6B7280';
            }
        }
    }

    static showAutoPaymentInfo() {
        if (!userData || !userData.autoPayment) return;

        const autoPaymentInfo = document.getElementById('autoPaymentInfo');
        const nextPaymentDate = document.getElementById('nextPaymentDate');
        const autoPaymentAmount = document.getElementById('autoPaymentAmount');

        if (!autoPaymentInfo) return;

        const nextDate = new Date();
        nextDate.setDate(nextDate.getDate() + 30);

        if (nextPaymentDate) {
            nextPaymentDate.textContent = Utils.formatDate(nextDate);
        }

        if (autoPaymentAmount && pricingData.renew[30]) {
            const amount = pricingData.renew[30][currentCurrency];
            autoPaymentAmount.textContent = Utils.formatCurrency(amount, currentCurrency);
        }

        autoPaymentInfo.classList.remove('hidden');
    }

    static loadPaymentHistory() {
        if (!currentUser) return;

        const paymentHistoryList = document.getElementById('paymentHistoryList');
        if (!paymentHistoryList) return;

        const payments = userStorage.getPayments(currentUser.id);

        if (payments.length === 0) {
            paymentHistoryList.innerHTML = `
                <div class="no-payments" style="text-align: center; padding: 40px 20px;">
                    <i class="fas fa-receipt" style="font-size: 48px; color: var(--gray-500); margin-bottom: 16px;"></i>
                    <p style="color: var(--gray-400);">Пока нет платежей</p>
                </div>
            `;
            return;
        }

        paymentHistoryList.innerHTML = payments.map(payment => `
            <div class="payment-item ${payment.status === 'failed' ? 'failed' : 'success'}">
                <div class="payment-header">
                    <div class="payment-title">${payment.description}</div>
                    <div class="payment-amount">${Utils.formatCurrency(payment.amount, payment.currency)}</div>
                </div>
                <div class="payment-details">
                    <div class="payment-detail">
                        <i class="fas fa-calendar"></i>
                        <span>${Utils.formatDateTime(payment.date)}</span>
                    </div>
                    <div class="payment-detail">
                        <i class="fas fa-shield-alt"></i>
                        <span>${payment.status === 'success' ? 'Успешно' : 'Ошибка'}</span>
                    </div>
                </div>
            </div>
        `).join('');
    }

    static async processPayment(plan, isRenewal) {
        const pricingType = isRenewal ? 'renew' : 'new';
        const amount = pricingData[pricingType][plan][currentCurrency];
        const currency = currentCurrency;

        if (tg && tg.payments) {
            // Используем Telegram Payments
            tg.payments.openInvoice({
                title: `GOV Helper — ${plan} дней`,
                description: isRenewal ? 'Продление подписки' : 'Новая подписка',
                currency: currency,
                prices: [{ 
                    label: `${plan} дней`, 
                    amount: currency === 'USD' ? Math.round(amount * 100) : amount
                }],
                payload: `subscription_${plan}_${isRenewal ? 'renew' : 'new'}`
            });
        } else {
            // В режиме разработки - имитируем платеж
            Utils.showToast('Режим разработки: имитация платежа', 'info');

            // Добавляем запись о платеже
            userStorage.addPayment(currentUser.id, {
                amount: amount,
                currency: currency,
                description: `${isRenewal ? 'Продление' : 'Подписка'} на ${plan} дней`,
                status: 'success',
                plan: plan,
                type: isRenewal ? 'renewal' : 'new'
            });

            // Обновляем подписку пользователя
            // После активации подписки
            const pricingToggle = document.getElementById('pricingToggle');
            if (pricingToggle) {
                pricingToggle.checked = true;
                pricingMode = 'renew';
            }

            UIManager.togglePricing(true);
            UIManager.updateCurrencyDisplay();
            const currentDate = userData.daysgow ? new Date(userData.daysgow) : new Date();
            const newDate = new Date(currentDate);
            newDate.setDate(newDate.getDate() + parseInt(plan));

            userData.daysgow = newDate.toISOString().split('T')[0];
            userData.status = 'active';
            userData.hasSubscription = true;

            userStorage.updateUser(currentUser.id, userData);

            // Обновляем UI
            await this.loadUserProfile();
            Utils.showToast(`${isRenewal ? 'Подписка продлена' : 'Подписка активирована'} на ${plan} дней!`, 'success');

            // Если включен автоплатеж, устанавливаем следующий платеж
            const autoPaymentToggle = document.getElementById('autoPaymentToggle');
            if (autoPaymentToggle && autoPaymentToggle.checked && plan === 30) {
                userData.autoPayment = true;
                userStorage.updateUser(currentUser.id, userData);
                this.showAutoPaymentInfo();
            }
        }
    }

    static loadFactions() {
        const factionSearch = document.getElementById('factionSearch');
        const factionsList = document.getElementById('factionsList');

        if (!factionsList) return;

        const searchTerm = factionSearch ? factionSearch.value.toLowerCase() : '';
        const filteredFactions = factionsData.filter(faction =>
            faction.name.toLowerCase().includes(searchTerm) ||
            faction.fullName.toLowerCase().includes(searchTerm)
        );

        factionsList.innerHTML = filteredFactions.map(faction => `
            <div class="faction-card" data-faction="${faction.id}">
                <div class="faction-icon" style="background: ${faction.color}20; color: ${faction.color}">
                    <i class="${faction.icon}"></i>
                </div>
                <h3 class="faction-title">${faction.name}</h3>
                <p class="faction-subtitle">${faction.fullName}</p>
                <div class="faction-status">
                    
                </div>
            </div>
        `).join('');

        // Добавляем обработчики кликов
        document.querySelectorAll('.faction-card').forEach(card => {
            card.addEventListener('click', () => {
                const factionId = card.dataset.faction;
                this.showFactionDetails(factionId);
            });
        });
    }

    static showFactionDetails(factionId) {
        const faction = factionsData.find(f => f.id === factionId);
        
        if (!faction) return;

        const factionModal = document.getElementById('factionModal');
        const factionModalTitle = document.getElementById('factionModalTitle');
        const factionModalContent = document.getElementById('factionModalContent');

        if (!factionModal || !factionModalTitle || !factionModalContent) return;

        factionModalTitle.textContent = faction.fullName;
        factionModalContent.innerHTML = `
            <div class="faction-header">
                <div class="faction-icon-large" style="background: ${faction.color}20; color: ${faction.color}">
                    
                </div>
                
            </div>

            <div class="faction-features">
                <h4>Доступные функции:</h4>
                ${faction.features.map(feature => `
                    <div class="feature-item">
                        <i class="fas fa-check-circle"></i>
                        <span>${feature}</span>
                    </div>
                `).join('')}
            </div>

            <div class="faction-requirements">
                
            </div>
        `;

        this.showModal(factionModal);
    }

    static updateContestTimer() {
        const contestTimer = document.getElementById('contestTimer');
        if (!contestTimer) return;

        const endDate = new Date();
        endDate.setDate(endDate.getDate() + 7);

        function updateTimer() {
            const now = new Date();
            const diff = endDate - now;

            if (diff <= 0) {
                contestTimer.textContent = '00:00:00';
                return;
            }

            const days = Math.floor(diff / (1000 * 60 * 60 * 24));
            const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((diff % (1000 * 60)) / 1000);

            contestTimer.textContent = 
                `${days.toString().padStart(2, '0')}:${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }

        updateTimer();
        setInterval(updateTimer, 1000);
    }

    static showModal(modal) {
        if (!modal) return;
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    static hideModal(modal) {
        if (!modal) return;
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }

    static setupModalCloseHandlers() {
        // Закрытие по кнопке
        document.querySelectorAll('.modal-close').forEach(btn => {
            btn.addEventListener('click', () => {
                const modal = btn.closest('.modal');
                this.hideModal(modal);
            });
        });

        // Закрытие по клику на фон
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.hideModal(modal);
                }
            });
        });

        // Закрытие по Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                document.querySelectorAll('.modal.active').forEach(modal => {
                    this.hideModal(modal);
                });
            }
        });
    }

    static showSupportPaymentModal(plan, isRenewal) {
        // Получаем цену в текущей валюте
        const pricingType = isRenewal ? 'renew' : 'new';
        const amount = pricingData[pricingType][plan][currentCurrency];

        // Форматируем валюту
        const symbols = {
            UAH: 'грн',
            RUB: 'руб',
            USD: '$'
        };

        const formattedPrice = currentCurrency === 'USD' 
            ? `$${amount.toFixed(2)}`
            : `${amount} ${symbols[currentCurrency]}`;

        // Обновляем данные в модальном окне
        const productName = document.getElementById('supportProductName');
        const priceElement = document.getElementById('supportPrice');
        const userIdElement = document.getElementById('supportUserId');
        const planDaysElement = document.getElementById('supportPlanDays');
        const isRenewalElement = document.getElementById('supportIsRenewal');

        if (productName) {
            productName.textContent = `${isRenewal ? 'Продление' : 'Подписка'} на ${plan} дней`;
        }

        if (priceElement) {
            priceElement.textContent = formattedPrice;
        }

        if (userIdElement && currentUser) {
            userIdElement.textContent = currentUser.id;
        }

        if (planDaysElement) {
            planDaysElement.value = plan;
        }

        if (isRenewalElement) {
            isRenewalElement.value = isRenewal;
        }

        // Показываем модальное окно
        const supportPaymentModal = document.getElementById('supportPaymentModal');
        if (supportPaymentModal) {
            this.showModal(supportPaymentModal);

            // Добавляем обработчик для кнопки "Перейти в поддержку"
            const goToSupportBtn = document.getElementById('goToSupportBtn');
            if (goToSupportBtn) {
                goToSupportBtn.href = `https://t.me/mr_helpers_bot`;
            }
        }

        // Обновляем глобальные переменные для отслеживания
        currentPaymentPlan = plan;
        currentPaymentIsRenewal = isRenewal;

        // Автоматически переключаем на тарифы для продления
        const pricingToggle = document.getElementById('pricingToggle');
        if (pricingToggle && !pricingToggle.checked) {
            pricingToggle.checked = true;
            this.togglePricing(true);
        }
    }

    static initEventListeners() {
        console.log('Инициализация обработчиков событий...');

        // Инициализируем переключатель валюты
        this.initCurrencySwitcher();

        // Переключение тарифов (новый/продление)
        const pricingToggle = document.getElementById('pricingToggle');
        if (pricingToggle) {
            pricingToggle.addEventListener('change', (e) => {
                this.togglePricing(e.target.checked);
            });
        }

        // Кнопки покупки
        document.querySelectorAll('.btn-buy').forEach(btn => {
            btn.addEventListener('click', () => {
                const plan = parseInt(btn.dataset.plan);
                const isRenewal = btn.dataset.for === 'renew';
                this.showSupportPaymentModal(plan, isRenewal);
            });
        });


        // Кнопка промокода
        const promoBtn = document.getElementById('promoBtn');
        if (promoBtn) {
            promoBtn.addEventListener('click', () => {
                const promoModal = document.getElementById('promoModal');
                const promoCode = document.getElementById('promoCode');
                if (promoModal) {
                    this.showModal(promoModal);
                    if (promoCode) promoCode.focus();
                }
            });
        }

        // Активация промокода
        const activatePromoBtn = document.getElementById('activatePromoBtn');
        if (activatePromoBtn) {
            activatePromoBtn.addEventListener('click', async () => {
                const promoCodeInput = document.getElementById('promoCode');
                const code = promoCodeInput ? promoCodeInput.value.trim().toUpperCase() : '';

                if (!code) {
                    Utils.showToast('Введите промокод', 'error');
                    return;
                }

                // Показываем индикатор загрузки
                activatePromoBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i><span>Проверка...</span>';
                activatePromoBtn.disabled = true;

                try {
                    // Проверяем промокод
                    const promoData = promoCodes[code];

                    if (!promoData) {
                        Utils.showToast('Промокод не найден', 'error');
                        return;
                    }

                    if (promoData.used) {
                        Utils.showToast('Промокод уже использован', 'error');
                        return;
                    }

                    // Используем промокод
                    promoCodes[code].used = true;

                    // Обновляем подписку пользователя
                    if (userData) {
                        const currentDate = userData.daysgow ? new Date(userData.daysgow) : new Date();
                        const newDate = new Date(currentDate);
                        newDate.setDate(newDate.getDate() + promoData.days);

                        userData.daysgow = newDate.toISOString().split('T')[0];
                        userData.status = 'active';

                        // Сохраняем в хранилище
                        userStorage.updateUser(currentUser.id, userData);

                        // Добавляем запись о платеже
                        userStorage.addPayment(currentUser.id, {
                            amount: 0,
                            currency: 'USD',
                            description: `Промокод: ${code} (${promoData.days} дней)`,
                            status: 'success',
                            type: 'promo'
                        });

                        // Обновляем UI
                        await this.loadUserProfile();
                        Utils.showToast(`Промокод активирован! +${promoData.days} дней`, 'success');

                        const promoModal = document.getElementById('promoModal');
                        if (promoModal) this.hideModal(promoModal);
                        if (promoCodeInput) promoCodeInput.value = '';
                    }
                } catch (error) {
                    console.error('Ошибка активации промокода:', error);
                    Utils.showToast('Ошибка активации промокода', 'error');
                } finally {
                    // Восстанавливаем кнопку
                    activatePromoBtn.innerHTML = '<i class="fas fa-check"></i><span>Активировать</span>';
                    activatePromoBtn.disabled = false;
                }
            });
        }

        // Кнопка уведомлений
        const notificationsBtn = document.getElementById('notificationsBtn');
        if (notificationsBtn) {
            notificationsBtn.addEventListener('click', () => {
                const notificationsModal = document.getElementById('notificationsModal');
                if (notificationsModal) {
                    this.showModal(notificationsModal);
                }
            });
        }

        // Кнопка техподдержки
        const supportBtn = document.getElementById('supportBtn');
        if (supportBtn) {
            supportBtn.addEventListener('click', () => {
                if (tg && tg.openTelegramLink) {
                    tg.openTelegramLink('https://t.me/mr_helpers_bot');
                } else {
                    window.open('https://t.me/mr_helpers_bot', '_blank');
                }
            });
        }

        // Кнопка выхода
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                if (tg && tg.close) {
                    tg.close();
                } else {
                    Utils.showToast('Для выхода закройте приложение', 'info');
                }
            });
        }

        // Поиск фракций
        const factionSearch = document.getElementById('factionSearch');
        if (factionSearch) {
            factionSearch.addEventListener('input', 
                Utils.debounce(() => this.loadFactions(), 300)
            );
        }

        // Копирование ключа
        const copyBtn = document.querySelector('.copy-btn[data-copy="key"]');
        if (copyBtn) {
            copyBtn.addEventListener('click', () => {
                const userKey = document.getElementById('userKey');
                if (userKey) {
                    Utils.copyToClipboard(userKey.textContent);
                }
            });
        }

        // Обработка реальных платежей Telegram
        if (tg && tg.onEvent) {
            tg.onEvent('invoiceClosed', (event) => {
                if (event.status === 'paid') {
                    Utils.showToast('Платеж успешно обработан!', 'success');

                    // Здесь можно добавить логику обработки реального платежа
                    setTimeout(() => {
                        Utils.showToast('Подписка активирована', 'success');
                    }, 1000);
                }
            });
        }
    }
}

// Основная функция инициализации
async function initApp() {
    try {
        console.log('Инициализация приложения...');

        // Инициализируем Telegram Web App если доступен
        if (tg) {
            tg.expand();
            tg.enableClosingConfirmation();
            tg.setHeaderColor('#0F172A');
            tg.setBackgroundColor('#0F172A');

            console.log('Telegram Web App инициализирован');
        }

        // Получаем данные пользователя
        let tgUser = null;
        if (tg && tg.initDataUnsafe && tg.initDataUnsafe.user) {
            tgUser = tg.initDataUnsafe.user;
        } else {
            // Тестовые данные
            console.warn('Telegram пользователь не найден, используем тестовые данные');
            tgUser = {
                id: 0,
                first_name: '.',
                username: 'null',
                photo_url: null
            };
        }

        currentUser = tgUser;
        console.log('Текущий пользователь:', currentUser);

        // Загружаем или создаем пользователя
        userData = userStorage.getUser(currentUser.id);

        if (!userData) {
            console.log('Создание нового пользователя...');
            const newUserData = {
                id: currentUser.id,
                name: currentUser.first_name || 'Пользователь',
                telegram: currentUser.username || null,
                idtg: currentUser.id,
                status: 'active',
                key: Utils.generateKey(),
                daysgow: null,
                hasSubscription: false,
                autoPayment: false,
                launcherUrl: 'https://github.com/galebxkwn/Jdskvehv/raw/refs/heads/main/SR%20Launcher_setup.exe',
                registration_date: new Date().toISOString().split('T')[0]
            };

            userData = userStorage.createUser(newUserData);

            // Добавляем тестовые платежи
            userStorage.addPayment(currentUser.id, {
                amount: 249,
                currency: 'UAH',
                description: 'Подписка на 30 дней',
                status: 'success',
                plan: 30,
                type: 'new'
            });

            setTimeout(() => {
                // Utils.showToast('Добро пожаловать в GOV Helper!', 'success', '🎉 Приветствие');
                // Utils.showToast('Используйте промокод WELCOME2024', 'info', '🎁 Бонус');
            }, 500);
        } else {
            // Обновляем лаунчер ссылку если ее нет
            if (!userData.launcherUrl) {
                userData.launcherUrl = 'https://github.com/galebxkwn/Jdskvehv/raw/refs/heads/main/SR%20Launcher_setup.exe';
                userStorage.updateUser(currentUser.id, userData);
            }
        }

        console.log('Данные пользователя:', userData);

        // Инициализируем UI
        UIManager.initTabNavigation();
        UIManager.setupModalCloseHandlers();
        UIManager.initEventListeners();

        // Загружаем данные
        await UIManager.loadUserProfile();
        UIManager.loadFactions();
        UIManager.updateContestTimer();

        console.log('Приложение успешно инициализировано!');

    } catch (error) {
        console.error('Ошибка инициализации приложения:', error);
        Utils.showToast("Ошибка загрузки приложения");
    }
}

// Запускаем приложение
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}

// Экспортируем объекты для отладки
window.app = {
    currentUser,
    userData,
    userStorage,
    Utils,
    UIManager,
    pricingData,
    factionsData,
    promoCodes,
    currentCurrency
};