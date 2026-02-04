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


const CRYPTO_BOT_TOKEN = '526462:AA8QrbhRpcuPyJ9s9L6ZozzTTdMqT7YyYZ9'; // Ваш токен


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

            // Проверяем, не использовал ли пользователь его уже
            const { data: usage } = await supabaseClient
                .from('promo_usages')
                .select('*')
                .eq('user_idtg', userId)
                .eq('promo_id', promo.id)
                .single();

            if (usage) {
                Utils.showToast('Вы уже использовали этот промокод', 'error');
                return;
            }

            // Обработка в зависимости от типа промокода
            if (promo.type === 'discount' && promo.discount_percent > 0) {
                // Промокод со скидкой - сохраняем до первой оплаты
                // Проверяем нет ли уже активной скидки
                if (activeDiscount) {
                    Utils.showToast('У вас уже есть активная скидка', 'error');
                    return;
                }

                // Создаем запись о скидке пользователя
                const { error: discountError } = await supabaseClient
                    .from('user_discounts')
                    .insert([{
                        user_idtg: userId,
                        promo_id: promo.id,
                        discount_percent: promo.discount_percent,
                        is_used: false
                    }]);

                if (discountError) throw discountError;

                // Записываем использование промокода
                await supabaseClient.from('promo_usages').insert([{
                    user_idtg: userId,
                    promo_id: promo.id
                }]);

                // Обновляем счетчик использований
                await supabaseClient.rpc('increment_promo_uses', { promo_id: promo.id });

                // Обновляем локальное состояние
                activeDiscount = {
                    percent: promo.discount_percent,
                    promoId: promo.id,
                    code: promo.code
                };

                Utils.showToast(`Скидка ${promo.discount_percent}% активирована! Действует до первой оплаты`, 'success');
                this.updatePrices();
                
            } else {
                // Промокод с днями подписки
                const daysToAdd = parseInt(promo.days) || 0;
                const promoType = promo.type; // YouTuber, Promotion, Gift, FanPay
                
                if (daysToAdd > 0) {
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);

                    let startDate = today;
                    if (userData.daysgov) {
                        const currentExpiry = new Date(userData.daysgov);
                        if (currentExpiry > today) {
                            startDate = currentExpiry;
                        }
                    }

                    const newDate = new Date(startDate);
                    newDate.setDate(newDate.getDate() + daysToAdd);

                    const newExpiryString = newDate.toISOString().split('T')[0];
                    userData.daysgov = newExpiryString;

                    // Сохраняем изменения
                    const { error: updateError } = await supabaseClient
                        .from('users')
                        .update({ 
                            daysgov: userData.daysgov,
                            notes: `Промо: ${promoType || 'Days'} (${code})`
                        })
                        .eq('idtg', userId);

                    if (updateError) throw updateError;

                    // Обновляем режим цен
                    pricingMode = 'renew';
                    this.updatePrices();

                    Utils.showToast(`Промокод активирован! Добавлено ${daysToAdd} ${Utils.getDaysWord(daysToAdd)}`, 'success');
                } else {
                    Utils.showToast('Промокод активирован!', 'success');
                }

                // Записываем использование
                await supabaseClient.from('promo_usages').insert([{
                    user_idtg: userId,
                    promo_id: promo.id
                }]);

                // Обновляем счетчик использований
                await supabaseClient.rpc('increment_promo_uses', { promo_id: promo.id });

                await this.updateProfileUI();
            }

            this.closeModals();
            document.getElementById('promoCode').value = '';

        } catch (e) {
            console.error('Promo activation error:', e);
            Utils.showToast('Профиль не найден', 'error');
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
        return starsPrices[priceType]?.[plan] || 100;
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

            // 2. Добавляем лог (Logs Table)
            // Формируем красивое сообщение для логов
            const logTitle = `Выдача подписки | Пользователю ${userData?.name || userName} (ID: ${userId}) выдана подписка на ${plan} дней. Оплата через ${method}`;

            await supabaseClient.from('logs').insert([{
                title: logTitle,
                admin: 'system', // или 'CryptoBot'
                created_at: new Date().toISOString()
            }]);

            // 3. Добавляем запись о платеже (Payments Table)
            // Расчет комиссии (условно 5% для примера)
            const fee = paidAmount * 0.05; 
            const netAmount = paidAmount - fee;

            await supabaseClient.from('payments').insert([{
                user_idtg: userId,
                amount: paidAmount, // Сколько заплатил клиент
                fee: fee,
                net_amount: netAmount,
                method: method, // 'CryptoBot' или 'Starstg'
                status: 'completed',
                details: `Подписка на ${plan} дней (${isRenewalForce ? 'Продление' : 'Новая'})`,
                created_at: new Date().toISOString()
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

    static async createCryptoInvoice(plan, isRenewal) {
        const modal = document.getElementById('paymentMethodModal');
        if(modal) modal.classList.remove('active');

        Utils.showToast('Создание счета...', 'info');

        try {
            const userId = tg.initDataUnsafe?.user?.id;
            const SERVER_URL = 'web-production-3ad44.up.railway.app'; 
            // Отправляем запрос на СВОЙ сервер, а не в CryptoBot напрямую
            const response = await fetch(`https://${SERVER_URL}/api/create-crypto-invoice`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ plan, isRenewal, userId })
            });

            const data = await response.json();
            if (data.ok && data.result) {
                this.showCryptoWaitModal(data.result, plan, isRenewal, data.result.amount);
            } else {
                throw new Error('Ошибка сервера при создании счета');
            }
        } catch (error) {
            console.error(error);
            Utils.showToast('Ошибка: ' + error.message, 'error');
        }
    }


    static showCryptoWaitModal(invoice, plan, isRenewal, amount) {
        const modal = document.getElementById('cryptoPaymentModal');
        const title = document.getElementById('cryptoPaymentTitle');
        const amountEl = document.getElementById('cryptoAmount');
        const linkBtn = document.getElementById('openCryptoLinkBtn');
        const checkBtn = document.getElementById('checkCryptoPaymentBtn');
        const statusText = document.getElementById('cryptoStatusText');

        // Сохраняем данные для проверки
        document.getElementById('cryptoInvoiceId').value = invoice.invoice_id;
        document.getElementById('cryptoPlanDays').value = plan;
        document.getElementById('cryptoIsRenewal').value = isRenewal;

        title.textContent = `Подписка на ${plan} дней`;
        amountEl.textContent = amount;

        // Настраиваем кнопку ссылки
        linkBtn.href = invoice.mini_app_invoice_url; // Или invoice.pay_url
        linkBtn.onclick = (e) => {
            e.preventDefault();
            // Пытаемся открыть внутри Telegram
            if (tg.openTelegramLink) {
                tg.openTelegramLink(invoice.mini_app_invoice_url);
            } else {
                window.open(invoice.mini_app_invoice_url, '_blank');
            }
        };

        // Настраиваем кнопку проверки
        checkBtn.onclick = () => this.checkCryptoStatus();
        checkBtn.disabled = false;
        checkBtn.innerHTML = '<i class="fas fa-check"></i><span>Я оплатил</span>';

        statusText.textContent = 'Ожидание оплаты...';
        statusText.className = 'text-center text-muted';

        modal.classList.add('active');
    }

    static async checkCryptoStatus() {
        const invoiceId = document.getElementById('cryptoInvoiceId').value;
        const plan = parseInt(document.getElementById('cryptoPlanDays').value);
        const isRenewal = document.getElementById('cryptoIsRenewal').value === 'true';
        const checkBtn = document.getElementById('checkCryptoPaymentBtn');
        const statusText = document.getElementById('cryptoStatusText');

        if (!invoiceId) return;

        checkBtn.disabled = true;
        checkBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i><span>Проверка...</span>';

        try {
            const response = await fetch('https://pay.crypt.bot/api/getInvoices', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Crypto-Pay-API-Token': CRYPTO_BOT_TOKEN
                },
                body: JSON.stringify({
                    invoice_ids: invoiceId
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
                    await this.activateSubscription(plan, isRenewal, 'CryptoBot', parseFloat(invoice.amount)); // Передаем сумму и метод

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
            }
        } catch (error) {
            console.error(error);
            Utils.showToast('Ошибка проверки', 'error');
        } finally {
            // Возвращаем кнопку, если не оплачено
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
