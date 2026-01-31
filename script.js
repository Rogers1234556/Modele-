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
        return date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
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
                this.showSupportPayment(plan, isRenewal);
            });
        });

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

            // Проверяем, не использовал ли пользователь его уже
            const { data: usage } = await supabaseClient
                .from('promo_usages')
                .select('*')
                .eq('user_idtg', tg.initDataUnsafe?.user?.id)
                .eq('promo_id', promo.id)
                .single();

            if (usage) {
                Utils.showToast('Вы уже использовали этот промокод', 'error');
                return;
            }

            // Активируем: добавляем дни пользователю
            const daysToAdd = parseInt(promo.days);
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            let startDate = today;
            if (userData.daysgow) {
                const currentExpiry = new Date(userData.daysgow);
                if (currentExpiry > today) {
                    startDate = currentExpiry;
                }
            }

            const newDate = new Date(startDate);
            newDate.setDate(newDate.getDate() + daysToAdd);

            const newExpiryString = newDate.toISOString().split('T')[0];
            userData.daysgow = newExpiryString;

            // Сохраняем изменения (транзакция имитируется последовательными запросами)
            const { error: updateError } = await supabaseClient
                .from('users')
                .update({ daysgow: userData.daysgow })
                .eq('idtg', tg.initDataUnsafe?.user?.id);

            if (updateError) throw updateError;

            // Записываем использование
            await supabaseClient.from('promo_usages').insert([{
                user_idtg: tg.initDataUnsafe?.user?.id,
                promo_id: promo.id
            }]);

            // Обновляем счетчик использований
            await supabaseClient.rpc('increment_promo_uses', { promo_id: promo.id });

            Utils.showToast(`Промокод активирован! Добавлено ${daysToAdd} ${Utils.getDaysWord(daysToAdd)}`, 'success');
            await this.updateProfileUI();
            this.closeModals();
            document.getElementById('promoCode').value = '';

        } catch (e) {
            console.error('Promo activation error:', e);
            const errorMsg = e.message || 'Ошибка при активации';
            Utils.showToast(errorMsg, 'error');
        }
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
                } else {
                    timerEl.textContent = 'Завершено';
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

    static showSupportPayment(plan, isRenewal) {
        const modal = document.getElementById('supportPaymentModal');
        if (modal) {
            document.getElementById('supportPlanDays').value = plan;
            document.getElementById('supportIsRenewal').value = isRenewal;
            modal.classList.add('active');
        }
    }

    static updatePrices() {
        const pricingType = pricingMode;
        document.querySelectorAll('.pricing-card').forEach(card => {
            const planStr = card.dataset.plan.replace('-renew', '');
            const plan = parseInt(planStr);
            if (pricingData[pricingType]?.[plan]) {
                const priceEl = card.querySelector('.price');
                const currencyEl = card.querySelector('.currency');
                const amount = pricingData[pricingType][plan][currentCurrency];
                priceEl.textContent = currentCurrency === 'USD' ? amount.toFixed(2) : amount;
                currencyEl.textContent = { UAH: 'грн', RUB: 'руб', USD: '$' }[currentCurrency];
            }
        });
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
        
        const daysLeft = Utils.calculateDaysLeft(userData.daysgow);
        const statusText = userData.status === 'banned' ? 'Заблокирован' : (daysLeft > 0 ? 'Активный' : 'Пользователь');
        const statusColor = userData.status === 'banned' ? '#EF4444' : (daysLeft > 0 ? '#10B981' : '#6B7280');

        userStatusBadge.innerHTML = `<span class="status-dot" style="background: ${statusColor}"></span><span>${statusText}</span>`;
        userKey.textContent = userData.key || 'Не назначен';
        govDays.textContent = daysLeft > 0 ? `${daysLeft} ${Utils.getDaysWord(daysLeft)}` : (userData.daysgow ? 'Истекла' : 'Нет подписки');

        if (tg.initDataUnsafe?.user?.photo_url) {
            userAvatar.style.backgroundImage = `url(${tg.initDataUnsafe?.user?.photo_url})`;
            userAvatar.style.backgroundSize = 'cover';
            userAvatar.innerHTML = '';
        }
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
                daysgow: userData.daysgow,
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

document.addEventListener('DOMContentLoaded', initApp);
