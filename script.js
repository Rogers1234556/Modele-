// Инициализация Telegram Web App
const tg = window.Telegram.WebApp;
let currentUser = null;
let userData = null;
let currentCurrency = localStorage.getItem('gov_currency') || 'UAH';
let pricingMode = 'new'; // 'new' | 'renew'

// Конфигурация Supabase
const SUPABASE_URL = 'https://wgxkflgdjzqyengrmlsb.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndneGtmbGdkanpxeWVuZ3JtbHNiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc4OTA2MTUsImV4cCI6MjA4MzQ2NjYxNX0.fM7_sOJCZ9SEZt73sABCE4NsXjnfVcs2h3usaFoNpf0';

// Инициализация Supabase клиента
const supabase = window.supabase ?
    window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

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
        features: ['в разработке'],
        status: 'available'
    },
    {
        id: 'fsb',
        name: 'ФСБ',
        fullName: 'Федеральная Служба Безопасности',
        icon: 'fas fa-user-secret',
        color: '#EF4444',
        features: ['в разработке'],
        status: 'available'
    },
    {
        id: 'mz',
        name: 'МЗ',
        fullName: 'Министерство Здравоохранения',
        icon: 'fas fa-heart-pulse',
        color: '#10B981',
        features: ['в разработке'],
        status: 'available'
    },
    {
        id: 'mo',
        name: 'МО',
        fullName: 'Министерство Обороны',
        icon: 'fas fa-jet-fighter',
        color: '#8B5CF6',
        features: ['в разработке'],
        status: 'available'
    },
    {
        id: 'fsin',
        name: 'ФСИН',
        fullName: 'Федеральная Служба Исполнения Наказаний',
        icon: 'fas fa-gavel',
        color: '#F59E0B',
        features: ['в разработке'],
        status: 'available'
    },
    {
        id: 'government',
        name: 'Пра-во',
        fullName: 'Правительство',
        icon: 'fas fa-landmark',
        color: '#6366F1',
        features: ['в разработке'],
        status: 'available'
    },
    {
        id: 'trk',
        name: 'ТРК',
        fullName: 'ТРК "Ритм"',
        icon: 'fas fa-tower-broadcast',
        color: '#EC4899',
        features: ['в разработке'],
        status: 'available'
    }
];

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
        document.querySelectorAll('.tab-btn').forEach(tab => {
            tab.addEventListener('click', (e) => {
                e.preventDefault();

                document.querySelectorAll('.tab-btn').forEach(t => {
                    t.classList.remove('active');
                });

                document.querySelectorAll('.page').forEach(p => {
                    p.classList.remove('active');
                });

                tab.classList.add('active');

                const pageId = tab.dataset.tab;
                const page = document.getElementById(pageId);
                if (page) {
                    page.classList.add('active');

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
        const currencyTabs = document.querySelectorAll('.currency-tab');

        if (currencyTabs.length === 0) return;

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

                currencyTabs.forEach(t => {
                    t.classList.remove('active');
                });

                this.classList.add('active');

                currentCurrency = currency;
                localStorage.setItem('gov_currency', currentCurrency);

                this.updateCurrencyDisplay();
            });
        });

        this.updateCurrencyDisplay();
    }

    static updateCurrencyDisplay() {
        this.updateCurrencyInfo();
        this.updatePrices();
    }

    static updateCurrencyInfo() {
        const el = document.getElementById('currentCurrencyInfo');
        if (!el) return;

        const isRenewal = pricingMode === 'renew';
        const pricingText = isRenewal
            ? 'Для продления подписки'
            : 'Указанные цены действительны только для первого заказа (стартовый пакет) - при последующем продлении стоимость будет выше.';

        el.textContent = `${pricingText}`;
    }

    static updatePrices() {
        const pricingType = pricingMode;

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
            return;
        }

        const userAvatar = document.getElementById('userAvatar');
        const userName = document.getElementById('userName');
        const userTelegram = document.getElementById('userTelegram');
        const userStatusBadge = document.getElementById('userStatusBadge');
        const userKey = document.getElementById('userKey');
        const govDays = document.getElementById('govDays');
        const pricingToggle = document.getElementById('pricingToggle');

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

        // Обновляем бейдж статуса
        const statusText = userData.status === 'banned' ? 'Заблокирован' : 
                          userData.daysgov && Utils.calculateDaysLeft(userData.daysgov) > 0 ? 'Активный покупатель' : 'Пользователь';
        const statusColor = userData.status === 'banned' ? '#EF4444' : 
                           (userData.daysgov && Utils.calculateDaysLeft(userData.daysgov) > 0) ? '#10B981' : '#6B7280';

        if (userStatusBadge) {
            userStatusBadge.innerHTML = `
                <span class="status-dot" style="background: ${statusColor}"></span>
                <span>${statusText}</span>
            `;
        }

        // Обновляем ключ
        if (userKey) {
            userKey.textContent = userData.key || 'Не назначен';
        }

        // Обновляем дни подписки
        if (govDays) {
            if (userData.daysgov) {
                const daysLeft = Utils.calculateDaysLeft(userData.daysgov);
                if (daysLeft > 0) {
                    govDays.textContent = `${daysLeft} ${Utils.getDaysWord(daysLeft)}`;

                    // Показываем тарифы для продления
                    if (pricingToggle) {
                        pricingToggle.checked = true;
                        pricingMode = 'renew';
                        this.togglePricing(true);
                    }
                } else {
                    govDays.textContent = 'Истекла';
                }
            } else {
                govDays.textContent = 'Нет подписки';
            }
        }
    }

    static async processPayment(plan, isRenewal) {
        const pricingType = isRenewal ? 'renew' : 'new';
        const amount = pricingData[pricingType][plan][currentCurrency];
        const currency = currentCurrency;

        if (tg && tg.payments) {
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
            Utils.showToast('Режим разработки: имитация платежа', 'info');

            // Обновляем подписку в Supabase
            if (supabase && userData) {
                try {
                    const currentDate = userData.daysgov ? new Date(userData.daysgov) : new Date();
                    const newDate = new Date(currentDate);
                    newDate.setDate(newDate.getDate() + parseInt(plan));

                    const { error } = await supabase
                        .from('users')
                        .update({
                            daysgov: newDate.toISOString().split('T')[0],
                            status: 'active',
                            subscription_active: true
                        })
                        .eq('idtg', currentUser.id);

                    if (error) throw error;

                    // Обновляем локальные данные
                    userData.daysgov = newDate.toISOString().split('T')[0];
                    userData.status = 'active';

                    // Обновляем UI
                    const pricingToggle = document.getElementById('pricingToggle');
                    if (pricingToggle) {
                        pricingToggle.checked = true;
                        pricingMode = 'renew';
                    }

                    this.togglePricing(true);
                    this.updateCurrencyDisplay();
                    await this.loadUserProfile();

                    Utils.showToast(`${isRenewal ? 'Подписка продлена' : 'Подписка активирована'} на ${plan} дней!`, 'success');
                } catch (error) {
                    console.error('Ошибка обновления подписки:', error);
                    Utils.showToast('Ошибка обновления подписки', 'error');
                }
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
        document.querySelectorAll('.modal-close').forEach(btn => {
            btn.addEventListener('click', () => {
                const modal = btn.closest('.modal');
                this.hideModal(modal);
            });
        });

        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.hideModal(modal);
                }
            });
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                document.querySelectorAll('.modal.active').forEach(modal => {
                    this.hideModal(modal);
                });
            }
        });
    }

    static showSupportPaymentModal(plan, isRenewal) {
        const pricingType = isRenewal ? 'renew' : 'new';
        const amount = pricingData[pricingType][plan][currentCurrency];

        const symbols = {
            UAH: 'грн',
            RUB: 'руб',
            USD: '$'
        };

        const formattedPrice = currentCurrency === 'USD' 
            ? `$${amount.toFixed(2)}`
            : `${amount} ${symbols[currentCurrency]}`;

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

        const supportPaymentModal = document.getElementById('supportPaymentModal');
        if (supportPaymentModal) {
            this.showModal(supportPaymentModal);

            const goToSupportBtn = document.getElementById('goToSupportBtn');
            if (goToSupportBtn) {
                goToSupportBtn.href = `https://t.me/mr_helpers_bot`;
            }
        }

        const pricingToggle = document.getElementById('pricingToggle');
        if (pricingToggle && !pricingToggle.checked) {
            pricingToggle.checked = true;
            this.togglePricing(true);
        }
    }

    static initEventListeners() {
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

        // Кнопка поддержки
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
                    setTimeout(() => {
                        Utils.showToast('Подписка активирована', 'success');
                    }, 1000);
                }
            });
        }
    }
}

// Работа с Supabase
class SupabaseManager {
    static async getUserByIdtg(idtg) {
        if (!supabase) return null;

        try {
            const { data, error } = await supabase
                .from('users')
                .select('*')
                .eq('idtg', idtg)
                .single();

            if (error && error.code !== 'PGRST116') {
                throw error;
            }

            return data;
        } catch (error) {
            console.error('Ошибка загрузки пользователя:', error);
            return null;
        }
    }

    static async createUser(userData) {
        if (!supabase) return null;

        try {
            const { data, error } = await supabase
                .from('users')
                .insert([userData])
                .select()
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Ошибка создания пользователя:', error);
            return null;
        }
    }

    static async updateUser(idtg, updates) {
        if (!supabase) return null;

        try {
            const { data, error } = await supabase
                .from('users')
                .update(updates)
                .eq('idtg', idtg)
                .select()
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Ошибка обновления пользователя:', error);
            return null;
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

        // Получаем данные пользователя из Telegram
        let tgUser = null;
        if (tg && tg.initDataUnsafe && tg.initDataUnsafe.user) {
            tgUser = tg.initDataUnsafe.user;
        } else {
            // Только для разработки - показываем ошибку
            console.error('Telegram пользователь не найден');
            Utils.showToast('Приложение должно быть запущено через Telegram', 'error');
            return;
        }

        currentUser = tgUser;
        console.log('Текущий пользователь:', currentUser);

        // Загружаем пользователя из Supabase
        userData = await SupabaseManager.getUserByIdtg(currentUser.id);

        if (!userData) {
            console.log('Создание нового пользователя в Supabase...');
            const newUserData = {
                idtg: currentUser.id,
                name: currentUser.first_name || 'Пользователь',
                telegram: currentUser.username || null,
                status: 'active',
                key: null, // Ключ будет сгенерирован администратором
                daysgov: null,
                subscription_active: false,
                registration_date: new Date().toISOString().split('T')[0]
            };

            userData = await SupabaseManager.createUser(newUserData);

            if (userData) {
                Utils.showToast('Добро пожаловать в GOV Helper!', 'success', '🎉 Приветствие');
            }
        }

        if (!userData) {
            throw new Error('Не удалось загрузить или создать пользователя');
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
        Utils.showToast("Ошибка загрузки приложения", 'error');
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
    Utils,
    UIManager,
    SupabaseManager,
    pricingData,
    factionsData,
    currentCurrency
};