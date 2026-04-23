const tg = window.Telegram.WebApp;

// --- ФУНКЦИИ ВРЕМЕНИ МСК ---
function getMSKDate() {
    // Получаем текущую дату и время по Москве
    const mskString = new Date().toLocaleString("en-US", { timeZone: "Europe/Moscow" });
    return new Date(mskString);
}
// Функция для получения вчерашней даты по МСК (в формате YYYY-MM-DD)
function getMSKYesterdayString() {
    const d = getMSKDate(); // Используем твою существующую функцию
    d.setDate(d.getDate() - 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

// Функция расчета стрика
function calculateStreak(completedDatesStrArray) {
    // completedDatesStrArray - массив строк дат, когда была выполнена норма, например: ['2026-03-31', '2026-04-01']
    if (!completedDatesStrArray || completedDatesStrArray.length === 0) {
        return { count: 0, isActiveToday: false };
    }

    // Убираем дубликаты и сортируем от старых к новым
    const sortedDates = [...new Set(completedDatesStrArray)].sort();

    let currentStreak = 1;

    // Считаем подряд идущие дни
    for (let i = 1; i < sortedDates.length; i++) {
        const prevDate = new Date(sortedDates[i - 1]);
        const currDate = new Date(sortedDates[i]);

        // Разница в миллисекундах -> переводим в дни
        const diffTime = Math.abs(currDate - prevDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 1) {
            currentStreak++; // Дни идут подряд
        } else if (diffDays > 1) {
            currentStreak = 1; // Был пропуск, стрик сбрасывается
        }
    }

    const todayStr = getMSKDateString();       // Твоя функция
    const yesterdayStr = getMSKYesterdayString(); // Новая функция выше
    const lastCompletedDate = sortedDates[sortedDates.length - 1];

    let finalStreak = 0;
    let isActiveToday = false;

    if (lastCompletedDate === todayStr) {
        // Норма за сегодня ВЫПОЛНЕНА
        finalStreak = currentStreak;
        isActiveToday = true;
    } else if (lastCompletedDate === yesterdayStr) {
        // Норма за сегодня ЕЩЕ НЕТ, но вчера была (сохраняем стрик, но делаем неактивным)
        finalStreak = currentStreak;
        isActiveToday = false; 
    } else {
        // Вчера был пропуск, стрик сгорел
        finalStreak = 0;
        isActiveToday = false;
    }

    return { count: finalStreak, isActiveToday };
}

function getMSKDateString() {
    const d = getMSKDate();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`; // Возвращает YYYY-MM-DD
}

// 1. ПРОВЕРКА ТЕЛЕГРАМ SDK (чтобы не было критической ошибки)
if (!tg || !tg.initDataUnsafe || !tg.initDataUnsafe.user) {
    document.body.innerHTML = `
        <div style="display:flex;justify-content:center;align-items:center;height:100vh;flex-direction:column;gap:20px;padding:20px;text-align:center;background:#0F172A;color:white;font-family:sans-serif;">
            <i class="fas fa-exclamation-triangle" style="font-size:4rem;color:#EF4444;"></i>
            <h1 style="margin:0;font-size:1.5rem;">Критическая ошибка инициализации</h1>
            <p style="margin:0;color:#9CA3AF;">Приложение должно быть открыто через Telegram.</p>
        </div>
    `;
    console.error('Telegram WebApp critical initialization error: tg, tg.initDataUnsafe, or tg.initDataUnsafe.user is undefined.');
    throw new Error('Critical initialization error.');
}

function applySafeArea() {
    document.documentElement.style.setProperty(
        '--tg-safe-top',
        `${tg.safeAreaInset?.top || 0}px`
    );
}

applySafeArea();
tg.onEvent('viewportChanged', applySafeArea);

tg.expand();
tg.setHeaderColor('bg_color'); 
tg.setBackgroundColor('bg_color');

const SUPABASE_URL = 'https://wgxkflgdjzqyengrmlsb.supabase.co/';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndneGtmbGdkanpxeWVuZ3JtbHNiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc4OTA2MTUsImV4cCI6MjA4MzQ2NjYxNX0.fM7_sOJCZ9SEZt73sABCE4NsXjnfVcs2h3usaFoNpf0';
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const API_BASE = "https://normal-meadowlark-funtalingo-5c982800.koyeb.app";

let userData = null;
let currentProduct = 'gov'; 

const pricingData = {
    gov: {
        new: {
            15: 99,
            30: 249,
            365: 1999
        },
        renew: {
            15: 149,
            30: 299,
            365: 2499
        }
    },
    admin: {
        new: {
            15: 250,
            30: 600,
            365: 5000
        },
        renew: {
            15: 350,
            30: 700,
            365: 6000
        }
    }
};

let pricingMode = 'new'; 
let activeDiscount = null; 

const factionsData = [
    { id: 'mvd', name: 'МВД', fullName: 'Министерство Внутренних Дел', icon: 'fas fa-shield-alt', color: '#3B82F6', features: ['в разработке'], status: 'available' },
    { id: 'fsb', name: 'ФСБ', fullName: 'Федеральная Служба Безопасности', icon: 'fas fa-user-secret', color: '#EF4444', features: ['в разработке'], status: 'available' },
    { id: 'mz', name: 'МЗ', fullName: 'Министерство Здравоохранения', icon: 'fas fa-heart-pulse', color: '#10B981', features: ['в разработке'], status: 'available' },
    { id: 'mo', name: 'МО', fullName: 'Министерство Обороны', icon: 'fas fa-jet-fighter', color: '#8B5CF6', features: ['в разработке'], status: 'available' },
    { id: 'fsin', name: 'ФСИН', fullName: 'Федеральная Служба Исполнения Наказаний', icon: 'fas fa-gavel', color: '#F59E0B', features: ['в разработке'], status: 'available' },
    { id: 'government', name: 'Пра-во', fullName: 'Правительство', icon: 'fas fa-landmark', color: '#6366F1', features: ['в разработке'], status: 'available' },
    { id: 'trk', name: 'ТРК', fullName: 'ТРК "Ритм"', icon: 'fas fa-tower-broadcast', color: '#EC4899', features: ['в разработке'], status: 'available' }
];

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
        const target = new Date(targetDate);
        target.setHours(0, 0, 0, 0);
        const diffTime = target - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays >= 0 ? diffDays : 0;
    }

    static getDaysWord(days) {
        if (days % 10 === 1 && days % 100 !== 11) return 'день';
        if (days % 10 >= 2 && days % 10 <= 4 && (days % 100 < 10 || days % 100 >= 20)) return 'дня';
        return 'дней';
    }
}

class UIManager {
    static init() {
        UIManager.initTabNavigation();
        UIManager.initProductSwitcher();
        UIManager.initInfoSwitcher();
        UIManager.initEventListeners();
        UIManager.loadFactions();
        UIManager.updateContestTimer();
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
                    if (pageId === 'profile') UIManager.updateProfileUI();
                    if (pageId === 'contests') UIManager.loadContests();
                    if (pageId === 'admin-panel') loadAdminPanelData();
                    loadAdminRadmirList();
                }
            });
        });
    }

    static initProductSwitcher() {
        const productTabs = document.querySelectorAll('.product-tab');
        productTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                currentProduct = tab.dataset.product;
                productTabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                const heroTitle = document.querySelector('.hero-title .gradient-text');
                if (heroTitle) {
                    heroTitle.textContent = currentProduct === 'gov' ? 'GOV Helper' : 'Admin Helper';
                }
                UIManager.updatePrices();
            });
        });
        UIManager.updatePrices();
    }

    static initInfoSwitcher() {
        const infoTabs = document.querySelectorAll('.info-tab');
        infoTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                infoTabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');

                const target = tab.dataset.info;
                document.getElementById('info-gov-content').style.display = target === 'gov' ? 'block' : 'none';
                document.getElementById('info-admin-content').style.display = target === 'admin' ? 'block' : 'none';
            });
        });
    }


    static loadFactions(filter = '') {
        const container = document.getElementById('factionsList');
        if (!container) return;

        const filteredFactions = factionsData.filter(f => 
            f.name.toLowerCase().includes(filter.toLowerCase()) || 
            f.fullName.toLowerCase().includes(filter.toLowerCase())
        );

        container.innerHTML = filteredFactions.map(faction => `
            <div class="faction-card" onclick="UIManager.showFactionDetails('${faction.id}')">
                <div class="faction-icon" style="background: ${faction.color}20; color: ${faction.color}">
                    <i class="${faction.icon}"></i>
                </div>
                <div class="faction-info">
                    <div class="faction-name">${faction.name}</div>
                    <div class="faction-status">${faction.fullName}</div>
                </div>
                <i class="fas fa-chevron-right text-muted"></i>
            </div>
        `).join('');
    }

    static initEventListeners() {
        const promoBtn = document.getElementById('promoBtn');
        const promoModal = document.getElementById('promoModal');
        const modalCloses = document.querySelectorAll('.modal-close');

        if (promoBtn) promoBtn.addEventListener('click', () => promoModal.classList.add('active'));
        modalCloses.forEach(close => close.addEventListener('click', () => {
            document.querySelectorAll('.modal').forEach(m => m.classList.remove('active'));
        }));

        const copyBtn = document.querySelector('.copy-btn-new');
        if (copyBtn) {
            copyBtn.addEventListener('click', () => {
                const key = document.getElementById('userKey').textContent;
                if (key && key !== 'Загрузка...' && key !== 'Не назначен') {
                    Utils.copyToClipboard(key);
                }
            });
        }

        const factionSearch = document.getElementById('factionSearch');
        if (factionSearch) {
            factionSearch.addEventListener('input', (e) => {
                UIManager.loadFactions(e.target.value);
            });
        }

        document.querySelectorAll('.btn-buy').forEach(btn => {
            btn.addEventListener('click', () => {
                const plan = parseInt(btn.dataset.plan);
                const isRenewal = btn.dataset.for === 'renew';
                UIManager.showPaymentMethodSelection(plan, isRenewal);
            });
        });

        document.querySelectorAll('.payment-method-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const method = btn.dataset.method;
                const plan = parseInt(document.getElementById('paymentPlanDays').value);
                const isRenewal = document.getElementById('paymentIsRenewal').value === 'true';

                document.getElementById('paymentMethodModal').classList.remove('active');

                switch(method) {
                    case 'stars':
                        UIManager.showStarsPayment(plan, isRenewal);
                        break;
                    case 'cryptobot':
                        UIManager.createCryptoInvoice(plan, isRenewal);
                        break;
                    case 'funpay':
                        window.open('https://funpay.com', '_blank');
                        Utils.showToast('Для оплаты через FunPay найдите нас на площадке', 'info');
                        break;
                    case 'other':
                        UIManager.showSupportPayment(plan, isRenewal);
                        break;
                }
            });
        });

        const payWithStarsBtn = document.getElementById('payWithStarsBtn');
        if (payWithStarsBtn) {
            payWithStarsBtn.addEventListener('click', () => {
                UIManager.processStarsPayment();
            });
        }

        const backToMethodsBtn = document.getElementById('backToMethodsBtn');
        if (backToMethodsBtn) {
            backToMethodsBtn.addEventListener('click', () => {
                document.getElementById('starsPaymentModal').classList.remove('active');
                const plan = parseInt(document.getElementById('starsPlanDays').value);
                const isRenewal = document.getElementById('starsIsRenewal').value === 'true';
                UIManager.showPaymentMethodSelection(plan, isRenewal);
            });
        }

        const backToMethodsFromSupport = document.getElementById('backToMethodsFromSupport');
        if (backToMethodsFromSupport) {
            backToMethodsFromSupport.addEventListener('click', () => {
                document.getElementById('supportPaymentModal').classList.remove('active');
                const plan = parseInt(document.getElementById('supportPlanDays').value);
                const isRenewal = document.getElementById('supportIsRenewal').value === 'true';
                UIManager.showPaymentMethodSelection(plan, isRenewal);
            });
        }

        const activatePromoBtn = document.getElementById('activatePromoBtn');
        if (activatePromoBtn) {
            activatePromoBtn.addEventListener('click', () => {
                const code = document.getElementById('promoCode').value.trim();
                if (code) {
                    UIManager.activatePromoCode(code);
                } else {
                    Utils.showToast('Введите промокод', 'error');
                }
            });
        }

        const supportBtn = document.getElementById('supportBtn');
        if (supportBtn) {
            supportBtn.addEventListener('click', () => {
                window.open('https://t.me/mr_helpers_bot', '_blank');
            });
        }

        const launcherBtn = document.getElementById('launcherBtn');
        if (launcherBtn) {
            launcherBtn.addEventListener('click', (e) => {
                e.preventDefault();
                UIManager.downloadLauncher();
            });
        }

        const btnAdminProfileMenu = document.getElementById('btnAdminProfileMenu');
        if (btnAdminProfileMenu) {
            btnAdminProfileMenu.addEventListener('click', () => {
                const userId = tg.initDataUnsafe?.user?.id;
                const nickname = document.getElementById('adminNick').textContent;
                let levelText = document.getElementById('adminLvl').textContent;
                const level = levelText.replace('LVL ', '').replace('Level ', '').trim();

                openAdminProfile(userId, nickname, level);
            });
        }
        const btnAdminOnline = document.getElementById('btnAdminOnline');
        if (btnAdminOnline) {
            btnAdminOnline.addEventListener('click', () => {
                const userId = tg.initDataUnsafe?.user?.id;
                openAdminOnline(userId);
            });
        }
    }

    static downloadLauncher() {
        Utils.showToast('Загрузка лаунчера временно недоступна', 'info');
    }

    static async activatePromoCode(code) {
        try {
            const userId = tg.initDataUnsafe?.user?.id;
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
            if (promo.expires_at && new Date(promo.expires_at) < new Date()) {
                Utils.showToast('Срок действия промокода истек', 'error');
                return;
            }
            if (promo.max_uses && promo.used_count >= promo.max_uses) {
                Utils.showToast('Промокод больше недействителен', 'error');
                return;
            }
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
            if (promo.type === 'Gift' || promo.type === 'FunPay') {
                if (promo.days > 0) {
                    await UIManager.addDaysToUser(userId, promo.days, `Активация промокода ${promo.code} (${promo.type})`);
                    await supabaseClient.from('promo_usages').insert([{ user_idtg: userId, promo_id: promo.id }]);
                    await supabaseClient.rpc('increment_promo_uses', { promo_id: promo.id });
                    Utils.showToast(`Промокод активирован! Добавлено ${promo.days} ${Utils.getDaysWord(promo.days)}`, 'success');
                } else {
                    Utils.showToast('Ошибка: промокод не содержит дней', 'error');
                }
            } else if (promo.type === 'Price') {
                const { error: discountError } = await supabaseClient
                    .from('user_discounts')
                    .insert([{ user_idtg: userId, promo_id: promo.id, discount_percent: promo.discount_percent, promo_type: promo.type, is_used: false }]);
                if (discountError) throw discountError;
                await supabaseClient.from('promo_usages').insert([{ user_idtg: userId, promo_id: promo.id }]);
                await supabaseClient.rpc('increment_promo_uses', { promo_id: promo.id });
                activeDiscount = { percent: promo.discount_percent, promoId: promo.id, code: promo.code };
                const currentDays = Utils.calculateDaysLeft(userData.daysgov);
                if (currentDays <= 0) {
                    let bonusDays = 0;
                    const p = promo.discount_percent;
                    if (p >= 50) bonusDays = 10;
                    else if (p >= 40) bonusDays = 9;
                    else if (p >= 30) bonusDays = 8;
                    else if (p >= 20) bonusDays = 7;
                    else if (p >= 10) bonusDays = 6;
                    else if (p >= 1) bonusDays = 5;
                    if (bonusDays > 0) {
                        await UIManager.addDaysToUser(userId, bonusDays, `Бонус за промокод ${promo.type}`);
                        Utils.showToast(`Скидка ${p}% + ${bonusDays} дней в подарок!`, 'success');
                    } else {
                        Utils.showToast(`Скидка ${p}% активирована!`, 'success');
                    }
                } else {
                    Utils.showToast(`Скидка ${promo.discount_percent}% активирована!`, 'success');
                }
                UIManager.updatePrices();
            }
            UIManager.closeModals();
            document.getElementById('promoCode').value = '';
            await UIManager.updateProfileUI();
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
        await supabaseClient.from('users').update({ daysgov: userData.daysgov, notes: note }).eq('idtg', userId);
    }

    static updatePrices() {
        if (userData && userData.daysgov) {
            const daysLeft = Utils.calculateDaysLeft(userData.daysgov);
            pricingMode = daysLeft > 0 ? 'renew' : 'new';
            document.querySelectorAll('.btn-buy').forEach(btn => {
                btn.dataset.for = pricingMode;
            });
        }
        const pricingType = pricingMode;
        document.querySelectorAll('.pricing-card').forEach(card => {
            const planStr = card.dataset.plan.replace('-renew', '');
            const plan = parseInt(planStr);
            if (pricingData[currentProduct]?.[pricingType]?.[plan]) {
                const priceEl = card.querySelector('.price');
                const currencyEl = card.querySelector('.currency');
                const originalAmount = pricingData[currentProduct][pricingType][plan];
                const finalCurrency = 'грн'; 

                if (activeDiscount && activeDiscount.percent > 0) {
                    const discountedAmount = applyDiscount(originalAmount);
                    priceEl.innerHTML = `<span class="original-price">${originalAmount}</span> ${discountedAmount}`;
                    currencyEl.innerHTML = `${finalCurrency} <span class="discount-badge">-${activeDiscount.percent}%</span>`;
                } else {
                    priceEl.textContent = originalAmount;
                    currencyEl.textContent = finalCurrency;
                }
            }
        });
        UIManager.updateDiscountBanner();
    }

    static updateDiscountBanner() {
        let banner = document.getElementById('discountBanner');
        if (activeDiscount && activeDiscount.percent > 0) {
            if (!banner) {
                banner = document.createElement('div');
                banner.id = 'discountBanner';
                banner.className = 'discount-banner';
                const pricingSection = document.querySelector('.pricing-section');
                if (pricingSection) pricingSection.insertBefore(banner, pricingSection.firstChild);
            }
            banner.innerHTML = `<i class="fas fa-tag"></i><span>Промокод <strong>${activeDiscount.code}</strong> активен: скидка ${activeDiscount.percent}% на первую оплату</span>`;
            banner.style.display = 'flex';
        } else if (banner) {
            banner.style.display = 'none';
        }
    }

    static async createCryptoInvoice(plan, isRenewal) {
      try {
        const userId = tg.initDataUnsafe?.user?.id;
        const response = await fetch(`${API_BASE}/api/create-crypto-invoice`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ plan, isRenewal, userId })
        });
        const data = await response.json();
        if (!data.ok) throw new Error(data.description || 'Ошибка создания счета');
        UIManager.showCryptoWaitModal(data.result, plan, isRenewal, data.result.amount);
      } catch (err) {
        console.error(err);
        Utils.showToast(err.message || 'Ошибка связи с сервером', 'error');
      }
    }

    static showCryptoWaitModal(invoice, plan, isRenewal, amount) {
        const modal = document.getElementById('cryptoPaymentModal');
        if (!modal) return;
        document.getElementById('cryptoPaymentTitle').textContent = 'Ожидание оплаты...';
        document.getElementById('cryptoAmount').textContent = amount;
        document.getElementById('cryptoCurrencyLabel').textContent = invoice.asset || 'USD';
        document.getElementById('openCryptoLinkBtn').href = invoice.pay_url;
        document.getElementById('cryptoInvoiceId').value = invoice.invoice_id;
        document.getElementById('cryptoPlanDays').value = plan;
        document.getElementById('cryptoIsRenewal').value = isRenewal;
        document.getElementById('checkCryptoPaymentBtn').onclick = () => UIManager.checkCryptoStatus();
        const statusText = document.getElementById('cryptoStatusText');
        statusText.textContent = 'Ожидаем оплату...';
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
            const response = await fetch(`${API_BASE}/api/check-crypto-invoice`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ invoiceId })
            });
            const data = await response.json();
            if (data.ok && data.result && data.result.items.length > 0) {
                const invoice = data.result.items[0];
                if (invoice.status === 'paid') {
                    statusText.textContent = 'Оплата прошла успешно!';
                    statusText.className = 'text-center text-success';
                    await UIManager.activateSubscription(plan, isRenewal, 'CryptoBot', parseFloat(invoice.amount));
                    Utils.showToast('Подписка активирована!', 'success');
                    UIManager.closeModals();
                    UIManager.updateProfileUI();
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
                    const timeLeft = end.getTime() - now.getTime();
                    if (timeLeft < 86400000) setTimeout(() => UIManager.loadContests(), timeLeft + 1000);
                } else {
                    timerEl.textContent = 'Завершено';
                    if (!contest.winner_idtg) UIManager.determineWinner(contest.id);
                }
            }
            const { count } = await supabaseClient
                .from('contest_participants')
                .select('*', { count: 'exact', head: true })
                .eq('contest_id', contest.id);
            if (participantsEl) participantsEl.textContent = count || 0;
            if (contestBtn) {
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
                    contestBtn.onclick = () => UIManager.joinContest(contest.id);
                }
            }
        } catch (e) { console.error('Contest load error:', e); }
    }

    static async joinContest(contestId) {
        try {
            const { error } = await supabaseClient.from('contest_participants').insert([{ contest_id: contestId, user_idtg: tg.initDataUnsafe?.user?.id }]);
            if (error) throw error;
            Utils.showToast('Вы успешно зарегистрированы в конкурсе!', 'success');
            UIManager.loadContests();
        } catch (e) {
            console.error('Join contest error:', e);
            Utils.showToast('Ошибка при регистрации', 'error');
        }
    }

    static async determineWinner(contestId) {
        try {
            const { data: participants, error: pError } = await supabaseClient.from('contest_participants').select('user_idtg').eq('contest_id', contestId);
            if (pError || !participants || participants.length === 0) return;
            const winner = participants[Math.floor(Math.random() * participants.length)];
            const { error: uError } = await supabaseClient.from('contests').update({ winner_idtg: winner.user_idtg, is_active: false }).eq('id', contestId);
            if (uError) throw uError;
            console.log('Winner determined:', winner.user_idtg);
            UIManager.loadContests();
        } catch (e) { console.error('Determine winner error:', e); }
    }

    static showPaymentMethodSelection(plan, isRenewal) {
        const modal = document.getElementById('paymentMethodModal');
        if (modal) {
            document.getElementById('paymentPlanDays').value = plan;
            document.getElementById('paymentIsRenewal').value = isRenewal;
            const planNames = { 15: '15 дней', 30: '30 дней', 365: '365 дней' };
            document.getElementById('selectedPlanInfo').textContent = `${planNames[plan] || plan + ' дней'}`;
            let subNotice = modal.querySelector('.active-sub-notice');
            if (!subNotice) {
                subNotice = document.createElement('div');
                subNotice.className = 'active-sub-notice';
                modal.querySelector('.modal-body').prepend(subNotice);
            }
            if (isRenewal) {
                subNotice.style = 'display:block;color:#10B981;font-size:0.9rem;margin-bottom:10px;text-align:center;';
            } else subNotice.style.display = 'none';

            const priceType = isRenewal ? 'renew' : 'new';
            const price = pricingData[currentProduct]?.[priceType]?.[plan];
            if (price) {
                const finalCurrency = 'грн';
                document.getElementById('selectedPlanPrice').textContent = `${price} ${finalCurrency}`;
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
            document.getElementById('starsAmount').textContent = UIManager.getStarsPrice(plan, isRenewal);
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
        if (activeDiscount && activeDiscount.percent > 0) {
            price = Math.round(price * (1 - activeDiscount.percent / 100));
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
            const userId = tg.initDataUnsafe.user.id;
            const response = await fetch(`${API_BASE}/api/create-stars-invoice`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ plan, isRenewal, userId })
            });
            const payload = await response.json();
            const invoiceUrl = payload?.invoiceUrl || payload?.result?.invoiceUrl || payload?.result?.url;
            if (!response.ok || !invoiceUrl) throw new Error(payload?.message || 'Ошибка создания платежа');
            if (typeof tg !== 'undefined' && tg.openInvoice) {
                tg.openInvoice(invoiceUrl, async (status) => {
                    if (status === 'paid') {
                        await UIManager.activateSubscription(plan, isRenewal, 'Telegram Stars'); 
                        Utils.showToast('Оплата прошла успешно! Подписка активирована.', 'success');
                        UIManager.closeModals();
                        UIManager.updateProfileUI();
                    } else if (status === 'cancelled') Utils.showToast('Оплата отменена', 'info');
                    else if (status === 'failed') Utils.showToast('Ошибка оплаты. Попробуйте снова.', 'error');
                    UIManager.resetPayButton();
                });
            } else throw new Error('tg.openInvoice is undefined');
        } catch (error) {
            console.error('Stars payment error:', error);
            Utils.showToast(error.message || 'Ошибка платежа. Попробуйте позже.', 'error');
            UIManager.resetPayButton();
        }
    }

    static resetPayButton() {
        const payBtn = document.getElementById('payWithStarsBtn');
        if (payBtn) {
            payBtn.disabled = false;
            payBtn.innerHTML = '<i class="fas fa-star"></i> <span>Оплатить</span>';
        }
    }

    static async activateSubscription(plan, isRenewalForce, method = 'Unknown', paidAmount = 0) {
        try {
            const userId = tg.initDataUnsafe.user.id;
            const userName = tg.initDataUnsafe.user.first_name || 'User';
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            let startDate = today;
            if (userData?.daysgov) {
                const currentExpiry = new Date(userData.daysgov);
                if (currentExpiry > today) startDate = currentExpiry;
            }
            const newDate = new Date(startDate);
            newDate.setDate(newDate.getDate() + parseInt(plan));
            const newExpiryString = newDate.toISOString().split('T')[0];
            const { error: updateError } = await supabaseClient.from('users').update({ daysgov: newExpiryString, updated_at: new Date().toISOString() }).eq('idtg', userId);
            if (updateError) throw updateError;
            if (userData) userData.daysgov = newExpiryString;
            await supabaseClient.from('logs').insert([{ title: `Выдача подписки`, content: `Пользователю ${userName} (ID: ${userId}) выдана подписка на ${plan} дней через ${method}`, admin: 'system', created_at: new Date().toISOString() }]);
            const fee = paidAmount * 0.05;
            await supabaseClient.from('payments').insert([{ user_id: userId, user_name: userName, amount: paidAmount, fee: fee, net_amount: paidAmount - fee, method: method, status: 'completed', description: `Подписка на ${plan} дней (${isRenewalForce ? 'Продление' : 'Новая'})`, created_at: new Date().toISOString() }]);
            if (activeDiscount) {
                await supabaseClient.from('user_discounts').update({ is_used: true }).eq('user_idtg', userId).eq('promo_id', activeDiscount.promoId);
                activeDiscount = null;
            }
            pricingMode = 'renew';
            return true;
        } catch (error) { console.error('Subscription activation error:', error); throw error; }
    }

    static showSupportPayment(plan, isRenewal) {
        const modal = document.getElementById('supportPaymentModal');
        if (modal) {
            document.getElementById('supportPlanDays').value = plan;
            document.getElementById('supportIsRenewal').value = isRenewal;
            modal.classList.add('active');
        }
    }

    static async updateProfileUI() {
        if (!userData) return;

        document.getElementById('userName').textContent = userData.name || tg.initDataUnsafe.user.first_name || 'Пользователь';
        document.getElementById('userTelegram').textContent = userData.telegram || `@${tg.initDataUnsafe.user.username}` || `ID: ${tg.initDataUnsafe.user.id}`;

        const userAvatar = document.getElementById('userAvatar');
        if (tg.initDataUnsafe.user.photo_url) {
            userAvatar.style.backgroundImage = `url(${tg.initDataUnsafe.user.photo_url})`;
            userAvatar.style.backgroundSize = 'cover';
            userAvatar.innerHTML = '';
        }

        const daysGov = Utils.calculateDaysLeft(userData.daysgov);
        const daysAdmin = Utils.calculateDaysLeft(userData.daysadmin); 

        document.getElementById('userKey').textContent = userData.key || 'Не назначен';

        const govEl = document.getElementById('govDays');
        if (daysGov > 0) {
            govEl.textContent = `${daysGov} ${Utils.getDaysWord(daysGov)}`;
            govEl.style.color = '#3b82f6';
        } else {
            govEl.textContent = 'Не активна';
            govEl.style.color = '#9ca3af';
        }

        const adminTabBtn = document.getElementById('adminTabBtn');
        if (adminTabBtn) {
            if (daysAdmin > 0) {
                adminTabBtn.style.display = 'flex'; 
            } else {
                adminTabBtn.style.display = 'none';  
            }
        }

        const adminEl = document.getElementById('adminDays');
        if (daysAdmin > 0) {
            adminEl.textContent = `${daysAdmin} ${Utils.getDaysWord(daysAdmin)}`;
            adminEl.style.color = '#f59e0b';
        } else {
            adminEl.textContent = 'Не активна';
            adminEl.style.color = '#9ca3af';
        }

        const launcherBtn = document.getElementById('launcherBtn');
        if (launcherBtn) {
            launcherBtn.style.display = (daysGov > 0 || daysAdmin > 0) ? 'flex' : 'none';
        }
    }

    static showFactionDetails(id) {
        const faction = factionsData.find(f => f.id === id);
        if (!faction) return;
        const modal = document.getElementById('factionModal');
        const title = document.getElementById('factionModalTitle');
        const content = document.getElementById('factionModalContent');
        title.textContent = faction.fullName;
        content.innerHTML = `<div class="faction-modal-details"><div class="faction-features-list"><h5>Функционал фракции:</h5><ul>${faction.features.map(feat => `<li><i class="fas fa-check-circle" style="color: ${faction.color}"></i><span>${feat}</span></li>`).join('')}</ul></div></div>`;
        modal.classList.add('active');
    }

    static closeModals() { document.querySelectorAll('.modal').forEach(m => m.classList.remove('active')); }

    static updateContestTimer() {
        const timerEl = document.getElementById('contestTimer');
        if (timerEl) timerEl.textContent = 'Завершено';
    }
}

async function saveUserData() {
    if (!userData || !tg.initDataUnsafe.user.id) return;
    try {
        await supabaseClient.from('users').upsert({ idtg: tg.initDataUnsafe.user.id, name: userData.name, telegram: userData.telegram, status: userData.status, key: userData.key, daysgov: userData.daysgov, updated_at: new Date().toISOString() });
    } catch (error) { console.error('Error saving user data:', error); }
}


async function initApp() {
    try {
        const user = tg.initDataUnsafe.user;
        let { data, error } = await supabaseClient.from('users').select('*').eq('idtg', user.id).single();

        if (error && error.code !== 'PGRST116') throw error;

        if (!data) {
            const { data: newUser, error: createError } = await supabaseClient.from('users').insert([{ 
                idtg: user.id, 
                name: user.first_name || 'User', 
                telegram: user.username || '', 
                status: 'active', 
                created_at: new Date().toISOString() 
            }]).select().single();

            if (createError) throw createError;
            userData = newUser;
        } else {
            userData = data;
        }

        pricingMode = (userData && userData.daysgov) ? 'renew' : 'new';
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

        if (userData && Utils.calculateDaysLeft(userData.daysadmin) > 0) {
            loadAdminPanelData();
        }

    } catch (e) {
        console.error('Init error:', e);

        const errorText = e.message || String(e);
        const errorCode = e.code ? `Код: ${e.code}` : 'Код: неизвестен';

        document.body.innerHTML = `
            <div style="display:flex;justify-content:center;align-items:center;height:100vh;flex-direction:column;gap:20px;padding:20px;text-align:center;background:#0F172A;color:white;font-family:sans-serif;">
                <i class="fas fa-exclamation-circle" style="font-size:4rem;color:#EF4444;"></i>
                <div style="display:flex; flex-direction:column; gap:8px;">
                    <h1 style="margin:0;font-size:1.5rem;">Критическая ошибка инициализации</h1>
                    <p style="margin:0;color:#9CA3AF;">Не удалось загрузить данные. Попробуйте перезапустить приложение.</p>
                </div>

                <div style="margin-top:10px; padding:15px; background:rgba(239, 68, 68, 0.1); border:1px solid rgba(239, 68, 68, 0.3); border-radius:12px; width:100%; max-width:90%; box-sizing:border-box; text-align:left;">
                    <span style="display:block; color:#EF4444; font-size:11px; font-weight:800; margin-bottom:5px; text-transform:uppercase; letter-spacing:0.5px;">Технические подробности:</span>
                    <div style="color:#FCA5A5; font-size:13px; font-family:monospace; word-break:break-all;">
                        <div style="margin-bottom:4px; font-weight:bold;">${errorCode}</div>
                        <div>${errorText}</div>
                    </div>
                </div>

                <button onclick="location.reload()" style="margin-top:10px; padding:12px 24px; background:#2563EB; color:white; border:none; border-radius:8px; font-weight:600;">Повторить попытку</button>
            </div>
        `;
    }
}

async function loadAdminRadmirList() {
    try {
        const { data: admins, error } = await supabaseClient
            .from('administrator_radmir')
            .select('*')
            .order('admin_level', { ascending: false });

        if (error) throw error;

        const listContainer = document.getElementById('adminRadmirList');
        listContainer.innerHTML = ''; 

        if (!admins || admins.length === 0) {
            listContainer.innerHTML = '<div style="text-align:center; color: var(--gray-400);">Состав пуст</div>';
            return;
        }

        admins.forEach(admin => {
            const card = document.createElement('div');
            card.className = 'admin-card';

            const nickname = admin.nickname && admin.nickname !== 'Неизвестно' 
                ? admin.nickname 
                : `User ${admin.idtg}`;

            card.innerHTML = `
                <div class="admin-info">
                    <span class="admin-nickname">${nickname}</span>
                    <span class="admin-id">ID: ${admin.idtg}</span>
                </div>
                <div class="admin-level-badge">
                    ${admin.admin_level} lvl
                </div>
            `;

            listContainer.appendChild(card);
        });

    } catch (e) {
        console.error('Ошибка загрузки админ-состава:', e);
        document.getElementById('adminRadmirList').innerHTML = 
            '<div style="text-align:center; color: var(--danger);">Ошибка загрузки данных</div>';
    }
}

async function loadActiveDiscount() {
    try {
        const userId = tg.initDataUnsafe.user.id;
        const { data: discountData, error } = await supabaseClient.from('user_discounts').select('*, promocodes!inner(discount_percent, code)').eq('user_idtg', userId).eq('is_used', false).single();
        if (!error && discountData) activeDiscount = { percent: discountData.promocodes.discount_percent, promoId: discountData.promo_id, code: discountData.promocodes.code };
    } catch (e) { console.error('Error loading discount:', e); }
}

function applyDiscount(price) {
    if (!activeDiscount || !activeDiscount.percent) return price;
    return Math.round(price * (1 - activeDiscount.percent / 100));
}

// ================= ОБНОВЛЕННЫЙ ПРОФИЛЬ (БЕЗ РЕДАКТИРОВАНИЯ УРОВНЯ) =================
async function openAdminProfile(idtg, nickname, level) {
    const modal = document.getElementById('adminProfileModal');
    const body = document.getElementById('adminProfileBody');
    modal.classList.add('active');

    body.innerHTML = '<div style="text-align:center; padding: 40px; color: var(--gray-400);"><i class="fas fa-spinner fa-spin fa-2x"></i><br><br>Загрузка...</div>';

    try {
        const { data, error } = await supabaseClient
            .from('administrator_radmir')
            .select('nickname, admin_level, reportsGoal, onlineGoal, jailsGoal, jailsEnabled')
            .eq('idtg', idtg)
            .single();

        if (error) throw error;

        const repGoal = data.reportsGoal !== null ? data.reportsGoal : 245;
        const onlGoal = data.onlineGoal || '02:55';
        const jGoal = data.jailsGoal !== null ? data.jailsGoal : 10;
        const jEnabled = data.jailsEnabled !== false; 
        const currentNick = data.nickname || nickname;
        const currentLvl = data.admin_level || level;

        body.innerHTML = `
            <div class="admin-profile-container">
                <div class="admin-info-row">
                    <span class="admin-info-label">N:</span>
                    <div class="edit-group">
                        <span class="admin-info-value" id="val-nickname">${currentNick}</span>
                        <button class="edit-btn" onclick="editProfileField('nickname')"><i class="fas fa-pen"></i></button>
                    </div>
                </div>

                <div class="admin-info-row">
                    <span class="admin-info-label">A-L:</span>
                    <div class="edit-group">
                        <span class="admin-info-value" style="color: var(--primary); margin-right: 10px;">${currentLvl}</span>
                        <i class="fas fa-lock" style="color: var(--gray-600); font-size: 12px;" title="Нельзя изменить"></i>
                    </div>
                </div>

                <div class="admin-info-row" style="background: transparent; border: none; margin-bottom: 5px;">
                    <span class="admin-info-label">ID Telegram</span>
                    <span class="admin-info-value" style="color: var(--gray-400);">${idtg}</span>
                </div>

                <div class="settings-divider">
                    <i class="fas fa-sliders-h"></i> Настройки нормы
                </div>

                <div class="admin-info-row">
                    <span class="admin-info-label">Мин. Репортов</span>
                    <div class="edit-group">
                        <span class="admin-info-value" id="val-reports">${repGoal}</span>
                        <button class="edit-btn" onclick="editProfileField('reports')"><i class="fas fa-pen"></i></button>
                    </div>
                </div>
                <div class="admin-info-row">
                    <span class="admin-info-label">Мин. Онлайн</span>
                    <div class="edit-group">
                        <span class="admin-info-value" id="val-online">${onlGoal}</span>
                        <button class="edit-btn" onclick="editProfileField('online')"><i class="fas fa-pen"></i></button>
                    </div>
                </div>
                <div class="admin-info-row">
                    <span class="admin-info-label">Мин. Джаилы</span>
                    <div class="edit-group" style="gap: 15px;">
                        <label class="switch">
                            <input type="checkbox" id="jails-toggle" ${jEnabled ? 'checked' : ''} onchange="toggleJailsGoal(this)">
                            <span class="slider round"></span>
                        </label>
                        <span class="admin-info-value" id="val-jails" style="opacity: ${jEnabled ? 1 : 0.4}; min-width: 25px; text-align: center;">${jGoal}</span>
                        <button class="edit-btn" onclick="editProfileField('jails')" ${jEnabled ? '' : 'disabled'} id="btn-edit-jails"><i class="fas fa-pen"></i></button>
                    </div>
                </div>
            </div>
        `;
    } catch (e) {
        console.error('Ошибка профиля:', e);
        body.innerHTML = `<div style="text-align:center; padding: 20px; color: var(--danger);">Ошибка данных</div>`;
    }
}

// ================= ФУНКЦИЯ РЕДАКТИРОВАНИЯ С ПРОВЕРКОЙ ФОРМАТА =================
window.editProfileField = async function(field) {
    const userId = tg.initDataUnsafe?.user?.id;
    if (!userId) return;

    const valSpan = document.getElementById(`val-${field}`);
    const currentVal = valSpan.innerText;

    const prompts = {
        'nickname': 'Введите новый никнейм:',
        'reports': 'Введите цель по репортам (число):',
        'online': 'Введите время в формате ЧЧ:ММ (например, 02:30):',
        'jails': 'Введите цель по джаилам (число):'
    };

    let newVal = prompt(prompts[field], currentVal);

    // Если нажали "Отмена" или ничего не ввели
    if (newVal === null || newVal.trim() === "" || newVal === currentVal) return;

    newVal = newVal.trim();

    // --- ПРОВЕРКА ФОРМАТА ВРЕМЕНИ ДЛЯ ОНЛАЙНА ---
    if (field === 'online') {
        // Регулярное выражение: от 1 до 2 цифр часов : ровно 2 цифры минут (00-59)
        const timeRegex = /^([0-9]{1,2}):([0-5][0-9])$/;

        if (!timeRegex.test(newVal)) {
            Utils.showToast('Ошибка! Формат должен быть ЧЧ:ММ (напр. 03:15)', 'error');
            return; // Прекращаем выполнение
        }
    }

    // Подготовка данных
    let updateData = {};
    if (field === 'nickname') updateData.nickname = newVal;
    if (field === 'reports') updateData.reportsGoal = parseInt(newVal);
    if (field === 'online') updateData.onlineGoal = newVal;
    if (field === 'jails') updateData.jailsGoal = parseInt(newVal);

    valSpan.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

    try {
        const { error } = await supabaseClient
            .from('administrator_radmir')
            .update(updateData)
            .eq('idtg', userId);

        if (error) throw error;

        valSpan.innerText = newVal;
        if (field === 'nickname') document.getElementById('adminNick').textContent = newVal;
        Utils.showToast('Данные обновлены', 'success');
    } catch (e) {
        console.error('Ошибка сохранения:', e);
        valSpan.innerText = currentVal;
        Utils.showToast('Ошибка при сохранении', 'error');
    }
}



function closeAdminProfile() {
    document.getElementById('adminProfileModal').classList.remove('active');
}

async function openAdminOnline(idtg, isDetailed = false) {
    const modal = document.getElementById('adminOnlineModal');
    const body = document.getElementById('adminOnlineBody');
    modal.classList.add('active');
    body.innerHTML = '<div style="text-align:center; padding: 40px; color: var(--gray-400);"><i class="fas fa-spinner fa-spin fa-2x"></i><br><br>Загрузка статистики...</div>';

    try {
        // Подгружаем цели пользователя для точного подсчета баллов за всё время
        const { data: userSettings } = await supabaseClient
            .from('administrator_radmir')
            .select('reportsGoal, onlineGoal')
            .eq('idtg', idtg)
            .single();

        const repGoal = userSettings?.reportsGoal || 245;
        const onlGoalMins = timeToMinutes(userSettings?.onlineGoal || "02:55") || 1;

        let query = supabaseClient.from('administration_radmir_norma').select('*').eq('idtg', idtg);

        const date = getMSKDate();
        const year = date.getFullYear();
        const month = date.getMonth();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const monthNameRaw = date.toLocaleString('ru', { month: 'long' });
        const monthName = monthNameRaw.charAt(0).toUpperCase() + monthNameRaw.slice(1);

        if (!isDetailed) {
            const firstDay = `${year}-${String(month + 1).padStart(2, '0')}-01`;
            const lastDay = `${year}-${String(month + 1).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;
            query = query.gte('record_date', firstDay).lte('record_date', lastDay);
        }

        const { data: normaData, error } = await query;
        if (error) throw error;

        let totalPoints = 0;
        let tableRows = '';

        // Вспомогательная функция подсчета баллов по новой системе (х1 = 11)
        const calculatePoints = (reports, onlineTimeStr) => {
            const rMult = (reports || 0) / repGoal;
            const oMult = timeToMinutes(onlineTimeStr) / onlGoalMins;
            const mult = Math.floor(Math.min(rMult, oMult) * 2) / 2;
            return mult * 11;
        };

        if (isDetailed) {
            const sortedData = (normaData || []).sort((a, b) => new Date(b.record_date) - new Date(a.record_date));

            sortedData.forEach(item => {
                totalPoints += calculatePoints(item.reports, item.online);
                const dateStr = item.record_date.split('-').reverse().join('.');

                tableRows += `
                    <tr>
                        <td class="date-col">${dateStr}</td>
                        <td>${formatOnlineFromTime(item.online)}</td>
                        <td><span class="val-num">${item.reports || 0}</span></td>
                        <td><span class="val-num">${item.jails || 0}</span></td>
                        <td><span class="val-num" style="color:var(--gray-400)">${item.mutes || 0}</span></td>
                        <td><span class="val-num" style="color:var(--warning)">${item.warns || 0}</span></td>
                        <td><span class="val-num" style="color:var(--danger)">${item.bans || 0}</span></td>
                    </tr>
                `;
            });
        } else {
            const normaMap = {};
            if (normaData) {
                normaData.forEach(item => {
                    totalPoints += calculatePoints(item.reports, item.online);
                    const day = parseInt(item.record_date.split('-')[2], 10);
                    normaMap[day] = item;
                });
            }

            for (let i = 1; i <= daysInMonth; i++) {
                const dayData = normaMap[i];
                const online = dayData && dayData.online ? formatOnlineFromTime(dayData.online) : `<span class="val-empty">-</span>`;
                const reports = dayData && dayData.reports > 0 ? `<span class="val-num">${dayData.reports}</span>` : `<span class="val-empty">-</span>`;
                const jails = dayData && dayData.jails > 0 ? `<span class="val-num">${dayData.jails}</span>` : `<span class="val-empty">-</span>`;

                const isToday = (i === date.getDate()) ? 'background: rgba(37, 99, 235, 0.1); border-left: 2px solid var(--primary);' : '';
                const dateStr = `${String(i).padStart(2, '0')}.${String(month + 1).padStart(2, '0')}.${String(year).slice(-2)}`;

                tableRows += `
                    <tr style="${isToday}">
                        <td class="date-col">${dateStr}</td>
                        <td>${online}</td>
                        <td>${reports}</td>
                        <td>${jails}</td>
                    </tr>
                `;
            }
        }

        body.innerHTML = `
            <div class="points-banner">
                <i class="fas fa-star"></i>
                <div>
                    <span>Заработано баллов:</span>
                    <strong>${totalPoints.toFixed(1)}</strong>
                </div>
            </div>

            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
                <h4 style="margin:0; color:white; font-size:15px; font-weight: 600;">
                    ${isDetailed ? 'Норма за все время' : `Норма за ${monthName}`}
                </h4>
                <button class="btn-secondary-new" style="padding: 8px 16px; font-size:13px; height:auto; flex:none; border-radius:10px;" onclick="openAdminOnline('${idtg}', ${!isDetailed})">
                    <i class="fas ${isDetailed ? 'fa-calendar-day' : 'fa-list-ul'}"></i>
                    <span>${isDetailed ? 'За месяц' : 'За все время'}</span>
                </button>
            </div>

            <div class="norma-container">
                <div class="norma-table-wrapper">
                    <table class="norma-table ${isDetailed ? 'detailed-view' : ''}">
                        <thead>
                            <tr>
                                <th class="date-col">Дата</th>
                                <th>Online</th>
                                <th>Report</th>
                                <th>Jail</th>
                                ${isDetailed ? '<th>Mute</th><th>Warn</th><th>Ban</th>' : ''}
                            </tr>
                        </thead>
                        <tbody>
                            ${tableRows || '<tr><td colspan="7">Нет данных</td></tr>'}
                        </tbody>
                    </table>
                </div>
            </div>
        `;

    } catch (e) {
        console.error('Ошибка при загрузке онлайна:', e);
        body.innerHTML = `
            <div style="text-align:center; padding: 20px;">
                <i class="fas fa-exclamation-triangle" style="color: var(--danger); font-size: 30px; margin-bottom: 10px;"></i>
                <div style="color: var(--gray-400);">Не удалось загрузить данные</div>
            </div>
        `;
    }
}


function closeAdminOnline() {
    document.getElementById('adminOnlineModal').classList.remove('active');
}

async function loadAdminPanelData() {
    try {
        const userId = tg.initDataUnsafe?.user?.id;
        if (!userId) return;

        // 1. Загружаем профиль вместе с индивидуальными целями
        const { data: adminInfo, error: infoError } = await supabaseClient
            .from('administrator_radmir')
            .select('nickname, admin_level, reportsGoal, onlineGoal, jailsGoal, jailsEnabled')
            .eq('idtg', userId)
            .single();

        let reportGoal = 245;
        let onlineGoalStr = "02:55";
        let jailsGoal = 10;
        let jailsEnabled = true;

        if (adminInfo) {
            document.getElementById('adminNick').textContent = adminInfo.nickname || "Без ника";
            document.getElementById('adminLvl').textContent = `Level ${adminInfo.admin_level || 1}`;

            if (adminInfo.reportsGoal) reportGoal = adminInfo.reportsGoal;
            if (adminInfo.onlineGoal) onlineGoalStr = adminInfo.onlineGoal;
            if (adminInfo.jailsGoal !== null) jailsGoal = adminInfo.jailsGoal;
            if (adminInfo.jailsEnabled !== null) jailsEnabled = adminInfo.jailsEnabled;
        }

        // 2. Обновляем текст целей в интерфейсе
        const targetReports = document.getElementById('targetReports');
        const targetOnline = document.getElementById('targetOnline');
        const targetJails = document.getElementById('targetJails');

        if (targetReports) targetReports.textContent = `цель: ${reportGoal}`;
        if (targetOnline) {
            const parts = onlineGoalStr.split(':');
            targetOnline.textContent = `цель: ${parseInt(parts[0])}ч ${parseInt(parts[1])}м`;
        }
        if (targetJails) {
            if (jailsEnabled) {
                targetJails.style.display = 'block';
                targetJails.textContent = `цель: ${jailsGoal}`;
            } else {
                targetJails.style.display = 'none';
            }
        }

        const today = getMSKDateString();
        const { data: stats } = await supabaseClient
            .from('administration_radmir_norma')
            .select('*')
            .eq('idtg', userId)
            .eq('record_date', today)
            .single();

        if (stats) {
            document.getElementById('statReports').textContent = stats.reports || 0;
            document.getElementById('statJails').textContent = stats.jails || 0;
            document.getElementById('statBans').textContent = stats.bans || 0;
            document.getElementById('statWarns').textContent = stats.warns || 0;
            document.getElementById('statMutes').textContent = stats.mutes || 0;
            document.getElementById('statOnline').textContent = formatOnlineFromTime(stats.online);

            // 3. Расчет множителя нормы (х1, х1.5, х2...)
            const onlineMinutes = timeToMinutes(stats.online); 
            const onlineGoalMinutes = Math.max(1, timeToMinutes(onlineGoalStr));

            // Считаем прогресс по репортам и онлайну
            const reportMult = (stats.reports || 0) / reportGoal;
            const onlineMult = onlineMinutes / onlineGoalMinutes;

            // Чтобы получить перенорму (х2), нужно сделать и репортов х2, и онлайна х2, поэтому берем минимальное
            const rawMultiplier = Math.min(reportMult, onlineMult);

            // Округляем до ближайших 0.5 (например: 1, 1.5, 2, 2.5)
            const normMultiplier = Math.floor(rawMultiplier * 2) / 2;

            const statusElem = document.getElementById('normaStatus');

            // 4. Красивый вывод с бейджиками
            if (normMultiplier >= 1) {
                statusElem.innerHTML = `ВЫПОЛНЕНА <span class="norma-badge">x${normMultiplier}</span>`;
                statusElem.className = "status-value success";
            } else if (normMultiplier > 0) {
                statusElem.innerHTML = `В ПРОЦЕССЕ <span class="norma-badge partial">x${normMultiplier}</span>`;
                statusElem.className = "status-value warning";
            } else {
                statusElem.textContent = "Не выполнена";
                statusElem.className = "status-value warning";
            }

            // 5. Вычисление баллов (Норма x1 = 11 баллов)
            const points = normMultiplier * 11;
            document.getElementById('adminPoints').textContent = `~${points.toFixed(1)}`;
        } else {
            resetAdminStats();
        }

        await updateStreakUI(userId, reportGoal, onlineGoalStr);

        const mskNow = getMSKDate();
        document.getElementById('adminStatDate').textContent = `Статистика за ${mskNow.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}`;

    } catch (e) {
        console.error('Ошибка loadAdminPanelData:', e);
    }
}


function formatOnlineFromTime(timeStr) {
    if (!timeStr) return "0ч 0м";
    const parts = timeStr.split(':');
    const hours = parseInt(parts[0]) || 0;
    const minutes = parseInt(parts[1]) || 0;
    return `${hours}ч ${minutes}м`;
}

function timeToMinutes(timeStr) {
    if (!timeStr) return 0;
    const parts = timeStr.split(':');
    return (parseInt(parts[0]) * 60) + parseInt(parts[1]);
}

async function updateStreakUI(userId, reportGoal, onlineGoalStr) {
    reportGoal = reportGoal || 245;
    onlineGoalStr = onlineGoalStr || "02:55";

    const { data: allNormaData } = await supabaseClient
        .from('administration_radmir_norma')
        .select('record_date, reports, online')
        .eq('idtg', userId);

    const onlineGoalMinutes = Math.max(1, timeToMinutes(onlineGoalStr));
    const completedDates = [];

    if (allNormaData) {
        allNormaData.forEach(item => {
            const reportMult = (item.reports || 0) / reportGoal;
            const onlineMult = timeToMinutes(item.online) / onlineGoalMinutes;
            const normMultiplier = Math.floor(Math.min(reportMult, onlineMult) * 2) / 2;
            if (normMultiplier >= 1) {
                completedDates.push(item.record_date);
            }
        });
    }

    const streakResult = calculateStreak(completedDates);
    const streakCount = streakResult.count;
    const isActiveToday = streakResult.isActiveToday;

    const streakSpan = document.getElementById('adminStreak');
    const fireIcon = document.getElementById('adminStreakIcon');

    if (streakSpan) {
        streakSpan.textContent = streakCount;
    }

    const allTierClasses = [
        'streak-tier-0', 'streak-tier-1', 'streak-tier-3', 'streak-tier-10',
        'streak-tier-30', 'streak-tier-60', 'streak-tier-100', 'streak-tier-200',
        'streak-tier-1000', 'streak-dimmed'
    ];

    function getTierClass(count) {
        if (count === 0) return 'streak-tier-0';
        if (count < 3) return 'streak-tier-1';
        if (count < 10) return 'streak-tier-3';
        if (count < 30) return 'streak-tier-10';
        if (count < 60) return 'streak-tier-30';
        if (count < 100) return 'streak-tier-60';
        if (count < 200) return 'streak-tier-100';
        if (count < 1000) return 'streak-tier-200';
        return 'streak-tier-1000';
    }

    if (fireIcon) {
        allTierClasses.forEach(c => fireIcon.classList.remove(c));
        fireIcon.style.color = '';

        if (streakCount >= 1000) {
            fireIcon.className = 'streak-tier-1000';
            fireIcon.textContent = '∞';
        } else {
            if (fireIcon.textContent === '∞') fireIcon.textContent = '';
            fireIcon.className = 'fas fa-fire';
            fireIcon.classList.add(getTierClass(streakCount));
            if (streakCount > 0 && !isActiveToday) {
                fireIcon.classList.add('streak-dimmed');
            }
        }
    }

    const badge = document.querySelector('.admin-streak-badge');
    if (badge) {
        badge.classList.remove(
            'streak-0', 'streak-1-5', 'streak-6-10', 'streak-11-30', 'streak-31-90', 'streak-91plus',
            ...allTierClasses
        );
        badge.classList.add(getTierClass(streakCount));
    }
}

window.copyUserKey = function() {
    // Получаем текст ключа
    const keyElement = document.getElementById('userKey');
    const keyText = keyElement.innerText;
    const icon = document.getElementById('copyIcon');

    // Если ключ еще не загрузился, ничего не делаем
    if (keyText === "Загрузка..." || !keyText) {
        Utils.showToast('Ключ еще не загружен', 'error');
        return;
    }

    // Вызываем универсальную функцию копирования (которую мы обсуждали ранее)
    // Если её еще нет, вот её сокращенный надежный вариант:
    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(keyText).then(onSuccess).catch(onError);
    } else {
        // Fallback для старых телефонов
        const textArea = document.createElement("textarea");
        textArea.value = keyText;
        textArea.style.position = "fixed";
        textArea.style.left = "-9999px";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        try {
            document.execCommand('copy') ? onSuccess() : onError();
        } catch (err) {
            onError();
        }
        document.body.removeChild(textArea);
    }

    function onSuccess() {
        Utils.showToast('Ключ скопирован!', 'success');

        // Визуальный эффект: меняем иконку на галочку на 2 секунды
        if (icon) {
            icon.classList.remove('fa-copy');
            icon.classList.add('fa-check');
            icon.style.color = 'var(--success)';

            setTimeout(() => {
                icon.classList.remove('fa-check');
                icon.classList.add('fa-copy');
                icon.style.color = '';
            }, 2000);
        }
    }

    function onError() {
        Utils.showToast('Ошибка копирования', 'error');
    }
};


function resetAdminStats() {
    ['statReports', 'statJails', 'statBans', 'statWarns', 'statMutes'].forEach(id => {    
        document.getElementById(id).textContent = "0";
    });
    document.getElementById('statOnline').textContent = "0ч 0м";
    document.getElementById('adminPoints').textContent = "0.0";
    document.getElementById('normaStatus').textContent = "НЕТ ДАННЫХ";
    document.getElementById('normaStatus').className = "status-value warning";
}

document.addEventListener('DOMContentLoaded', initApp);