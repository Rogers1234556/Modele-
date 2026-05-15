const tg = window.Telegram.WebApp;

// --- PAYMENT SWITCH ---
// false = оплата недоступна (показывает сообщение о разработке)
const paymentOnthebuy = false;

// --- POLLING INTERVALS ---
let profileRefreshInterval = null;
let adminRefreshInterval = null;

function startProfilePolling() {
    stopProfilePolling();
    profileRefreshInterval = setInterval(async () => {
        const user = tg.initDataUnsafe?.user;
        if (!user) return;
        try {
            const { data } = await supabaseClient.from('users').select('*').eq('idtg', user.id).maybeSingle();
            if (data) { userData = data; await UIManager.updateProfileUI(); }
        } catch(e) {}
    }, 30000);
}
function stopProfilePolling() {
    if (profileRefreshInterval) { clearInterval(profileRefreshInterval); profileRefreshInterval = null; }
}
function startAdminPolling() {
    stopAdminPolling();
    adminRefreshInterval = setInterval(() => { loadAdminPanelData(); }, 30000);
}
function stopAdminPolling() {
    if (adminRefreshInterval) { clearInterval(adminRefreshInterval); adminRefreshInterval = null; }
}

// --- GIFT MODE ---
let giftMode = false;
let giftRecipientIdtg = null;
let giftRecipientNameStr = '';
let giftSelectedProduct = 'gov';
let giftSelectedPlan = 30;

// --- ФУНКЦИИ ВРЕМЕНИ МСК ---
function getMSKDate() {
    // Получаем текущую дату и время по Москве
    const mskString = new Date().toLocaleString("en-US", { timeZone: "Europe/Moscow" });
    return new Date(mskString);
}
// Функция для получения вчерашней даты по МСК (в формате YYYY-MM-DD
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

const SUPABASE_URL = 'https://eyzqpngvggmlxozsqekb.supabase.co/';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV5enFwbmd2Z2dtbHhvenNxZWtiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcyMTY3MjYsImV4cCI6MjA5Mjc5MjcyNn0.AFbEmaHG1xaw7PQuxGtg_9uQmiS_gS6eWwenGGBeeeU';
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const API_BASE = "https://normal-meadowlark-funtalingo-5c982800.koyeb.app";

let userData = null;
let currentProduct = 'gov';

function getCuratorNumber(role) {
    if (!role) return null;
    const m = String(role).trim().match(/^CurAdm(\d+)$/i);
    return m ? parseInt(m[1]) : null;
}

// ВАЖНО: GOV Helper использует ветку `new` в TG-боте, а ADM Helper — ветку `renew`.
// Цены здесь должны полностью совпадать со STARS_PRICES / CRYPTO_PRICES в боте.
const pricingData = {
    gov: { // соответствует new в боте
        stars: { 15: 90, 30: 150, 365: 1400 },
        usd:   { 15: 3, 30: 5, 365: 48 }
    },
    admin: { // соответствует renew в боте
        stars: { 15: 120, 30: 160, 365: 1900 },
        usd:   { 15: 4, 30: 6, 365: 65 }
    }
};

// Какое значение isRenewal нужно отправить в бота для текущего продукта.
function getBotIsRenewal() {
    return currentProduct === 'admin';
}

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
    static escapeHtml(str) {
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    static showToast(message, type = 'info', title = '') {
        let container = document.getElementById('toastContainer');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toastContainer';
            container.className = 'toast-container';
            document.body.appendChild(container);
        } else if (!container.classList.contains('toast-container')) {
            container.classList.add('toast-container');
        }
        if (container.parentElement !== document.body) {
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
            this.showToast('Ключ скопирован', 'success');
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
                    if (pageId === 'profile') {
                        UIManager.updateProfileUI();
                        startProfilePolling();
                        stopAdminPolling();
                    } else if (pageId === 'admin-panel') {
                        loadAdminPanelData();
                        startAdminPolling();
                        stopProfilePolling();
                    } else {
                        stopProfilePolling();
                        stopAdminPolling();
                    }
                    if (pageId === 'contests') UIManager.loadContests();
                    loadAdminRadmirList();
                }
            });
        });
    }

    static initProductSwitcher() {
        const productTabs = document.querySelectorAll('.product-tab[data-product]');
        productTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const product = tab.dataset.product;
                if (!product) return;
                currentProduct = product;
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

                // Останавливаем все плеера (сбрасываем iframe), когда переключаемся
                document.querySelectorAll('.info-video-card.is-playing').forEach(card => {
                    UIManager.resetVideoCard(card);
                });
            });
        });

        UIManager.initVideoCards();
    }

    static initVideoCards() {
        document.querySelectorAll('.info-video-card').forEach(card => {
            const playBtn = card.querySelector('.info-video-play');
            const thumb = card.querySelector('.info-video-thumb');
            if (!playBtn || !thumb) return;
            const handler = (e) => {
                e.preventDefault();
                const ytId = card.dataset.youtube;
                if (!ytId) return;
                const img = thumb.querySelector('img');
                if (img) img.remove();
                const iframe = document.createElement('iframe');
                iframe.src = `https://www.youtube-nocookie.com/embed/${ytId}?autoplay=1&rel=0&modestbranding=1&playsinline=1`;
                iframe.title = 'YouTube video player';
                iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
                iframe.allowFullscreen = true;
                thumb.appendChild(iframe);
                card.classList.add('is-playing');
            };
            playBtn.addEventListener('click', handler);
            thumb.addEventListener('click', (e) => {
                if (card.classList.contains('is-playing')) return;
                if (e.target.closest('.info-video-link')) return;
                handler(e);
            });
        });
    }

    static resetVideoCard(card) {
        const thumb = card.querySelector('.info-video-thumb');
        if (!thumb) return;
        const iframe = thumb.querySelector('iframe');
        if (iframe) iframe.remove();
        card.classList.remove('is-playing');
        const ytId = card.dataset.youtube;
        if (ytId && !thumb.querySelector('img')) {
            const img = document.createElement('img');
            img.loading = 'lazy';
            img.alt = 'Превью видео';
            img.src = `https://i.ytimg.com/vi/${ytId}/hqdefault.jpg`;
            thumb.insertBefore(img, thumb.firstChild);
        }
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

        // Кнопка копирования ключа использует inline-обработчик copyUserKey()
        // (см. window.copyUserKey ниже), здесь повторный listener не вешаем,
        // иначе всплывают два тоста одновременно.

        document.querySelectorAll('.btn-buy').forEach(btn => {
            btn.addEventListener('click', () => {
                const plan = parseInt(btn.dataset.plan);
                giftMode = false;
                giftRecipientIdtg = null;
                giftRecipientNameStr = '';
                UIManager.showPaymentMethodSelection(plan, getBotIsRenewal());
            });
        });

        document.querySelectorAll('.payment-method-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const method = btn.dataset.method;
                const plan = parseInt(document.getElementById('paymentPlanDays').value);
                const isRenewal = document.getElementById('paymentIsRenewal').value === 'true';

                if (!paymentOnthebuy) {
                    const productKey = giftMode ? giftSelectedProduct : currentProduct;
                    const productName = productKey === 'gov' ? 'GOV Helper' : 'Admin Helper';
                    Utils.showToast(`В данный момент нельзя оплатить подписку на ${productName}, поскольку он находится на стадии разработки`, 'error');
                    return;
                }

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

        const giftBtn = document.getElementById('giftBtn');
        if (giftBtn) {
            giftBtn.addEventListener('click', () => {
                UIManager.openGiftModalFromPayment(giftSelectedPlan || 30);
            });
        }

        const giftRecipientInput = document.getElementById('giftRecipientInput');
        if (giftRecipientInput) {
            giftRecipientInput.addEventListener('input', () => {
                giftMode = false;
                giftRecipientIdtg = null;
                const foundBox = document.getElementById('giftRecipientFound');
                if (foundBox) foundBox.style.display = 'none';
                const confirmBtn = document.getElementById('confirmGiftBtn');
                const val = giftRecipientInput.value.trim();
                if (val.length >= 3) {
                    confirmBtn.style.opacity = '1';
                    confirmBtn.style.pointerEvents = 'auto';
                } else {
                    confirmBtn.style.opacity = '0.5';
                    confirmBtn.style.pointerEvents = 'none';
                }
            });
        }

        document.querySelectorAll('.gift-product-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.gift-product-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                giftSelectedProduct = btn.dataset.gproduct;
            });
        });

        document.querySelectorAll('.gift-plan-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.gift-plan-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                giftSelectedPlan = parseInt(btn.dataset.gplan);
            });
        });

        const confirmGiftBtn = document.getElementById('confirmGiftBtn');
        if (confirmGiftBtn) {
            confirmGiftBtn.addEventListener('click', async () => {
                const val = (document.getElementById('giftRecipientInput').value || '').trim();
                if (!val) return;
                confirmGiftBtn.disabled = true;
                confirmGiftBtn.style.opacity = '0.6';
                document.getElementById('giftBtnIcon').className = 'fas fa-spinner fa-spin';
                document.getElementById('giftBtnText').textContent = 'Поиск...';
                try {
                    const { data: found, error } = await supabaseClient
                        .from('users')
                        .select('idtg, name, user_name_tg')
                        .eq('idtg', val)
                        .maybeSingle();
                    if (error) throw error;
                    if (!found) {
                        Utils.showToast('Пользователь не найден. Проверьте правильность Telegram ID', 'error');
                        document.getElementById('giftBtnIcon').className = 'fas fa-gift';
                        document.getElementById('giftBtnText').textContent = 'Оплатить';
                        confirmGiftBtn.style.opacity = '1';
                        confirmGiftBtn.disabled = false;
                        return;
                    }
                    const myId = String(tg.initDataUnsafe?.user?.id);
                    if (String(found.idtg) === myId) {
                        Utils.showToast('Нельзя подарить подписку самому себе', 'error');
                        document.getElementById('giftBtnIcon').className = 'fas fa-gift';
                        document.getElementById('giftBtnText').textContent = 'Оплатить';
                        confirmGiftBtn.style.opacity = '1';
                        confirmGiftBtn.disabled = false;
                        return;
                    }
                    giftMode = true;
                    giftRecipientIdtg = String(found.idtg);
                    giftRecipientNameStr = found.name || found.user_name_tg || `ID: ${found.idtg}`;
                    document.getElementById('giftModal').classList.remove('active');
                    UIManager.showPaymentMethodSelection(giftSelectedPlan, false);
                    confirmGiftBtn.style.opacity = '1';
                    confirmGiftBtn.disabled = false;
                    document.getElementById('giftBtnIcon').className = 'fas fa-gift';
                    document.getElementById('giftBtnText').textContent = 'Оплатить';
                } catch (e) {
                    console.error('Gift search error:', e);
                    Utils.showToast('Ошибка поиска пользователя', 'error');
                    document.getElementById('giftBtnIcon').className = 'fas fa-gift';
                    document.getElementById('giftBtnText').textContent = 'Оплатить';
                    confirmGiftBtn.style.opacity = '1';
                    confirmGiftBtn.disabled = false;
                }
            });
        }

        const btnAdminProfileMenu = document.getElementById('btnAdminProfileMenu');
        if (btnAdminProfileMenu) {
            btnAdminProfileMenu.addEventListener('click', () => {
                const userId = tg.initDataUnsafe?.user?.id;
                const nickname = userData?.name || tg.initDataUnsafe?.user?.first_name || '';
                openAdminProfile(userId, nickname, null);
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
        const url = 'https://drive.google.com/uc?export=download&id=1yuk0fBtFyAy8hMncdpg6o9CZOi0I4p2a';
        try {
            if (typeof tg !== 'undefined' && tg.openLink) {
                tg.openLink(url);
            } else {
                window.open(url, '_blank');
            }
            Utils.showToast('Загрузка лаунчера началась', 'success');
        } catch (e) {
            console.error('Launcher download error:', e);
            window.open(url, '_blank');
        }
    }

    static async activatePromoCode(code) {
        try {
            const userId = tg.initDataUnsafe?.user?.id;
            if (!userId) {
                Utils.showToast('Не удалось определить пользователя Telegram', 'error');
                return;
            }
            const cleanCode = (code || '').trim().toUpperCase();
            if (!cleanCode) {
                Utils.showToast('Введите промокод', 'error');
                return;
            }

            const { data: promo, error: promoError } = await supabaseClient
                .from('promocodes')
                .select('*')
                .eq('code', cleanCode)
                .maybeSingle();

            if (promoError) {
                console.error('Supabase promo lookup error:', promoError);
                Utils.showToast(`Ошибка базы данных: ${promoError.message || promoError.code || 'неизвестная'}`, 'error');
                return;
            }
            if (!promo) {
                Utils.showToast(`Промокод «${cleanCode}» не существует`, 'error');
                return;
            }
            if (promo.is_active === false) {
                Utils.showToast('Промокод деактивирован администратором', 'error');
                return;
            }
            if (promo.expires_at && new Date(promo.expires_at) < new Date()) {
                const expDate = new Date(promo.expires_at).toLocaleDateString('ru-RU');
                Utils.showToast(`Срок действия промокода истёк ${expDate}`, 'error');
                return;
            }

            // Глобальная проверка лимита активаций по таблице promo_usages
            // (учитываем все аккаунты, а не только локальный счётчик used_count)
            const { count: totalUsages, error: totalUsagesError } = await supabaseClient
                .from('promo_usages')
                .select('id', { count: 'exact', head: true })
                .eq('promo_id', promo.id);
            if (totalUsagesError) {
                console.error('Supabase total usages lookup error:', totalUsagesError);
                Utils.showToast(`Ошибка проверки лимита: ${totalUsagesError.message || totalUsagesError.code}`, 'error');
                return;
            }
            const realUsedCount = totalUsages || 0;
            if (promo.max_uses && realUsedCount >= promo.max_uses) {
                Utils.showToast(`Лимит активаций исчерпан (${realUsedCount}/${promo.max_uses})`, 'error');
                return;
            }

            const { data: usage, error: usageError } = await supabaseClient
                .from('promo_usages')
                .select('*')
                .eq('promo_id', promo.id)
                .eq('user_idtg', String(userId))
                .maybeSingle();
            if (usageError) {
                console.error('Supabase usage lookup error:', usageError);
                Utils.showToast(`Ошибка проверки активации: ${usageError.message || usageError.code}`, 'error');
                return;
            }
            if (usage) {
                Utils.showToast('Вы уже активировали этот промокод ранее', 'error');
                return;
            }
            const hasDays = promo.days && promo.days > 0;
            const hasDiscount = promo.discount_percent && promo.discount_percent > 0;

            if (!hasDays && !hasDiscount) {
                Utils.showToast('Ошибка: промокод не содержит ни дней, ни скидки', 'error');
                return;
            }

            if (hasDiscount) {
                const { error: discountError } = await supabaseClient
                    .from('user_discounts')
                    .insert([{ user_idtg: String(userId), promo_id: promo.id, discount_percent: promo.discount_percent, is_used: false }]);
                if (discountError) throw discountError;
                activeDiscount = { percent: promo.discount_percent, promoId: promo.id, code: promo.code };
            }

            let bonusDaysAdded = 0;
            const promoProduct = (promo.product || 'GOV').toUpperCase();
            if (hasDays) {
                await UIManager.addDaysToUser(userId, promo.days, `Активация промокода ${promo.code} (${promo.type})`, promoProduct);
                bonusDaysAdded = promo.days;
            }

            await supabaseClient.from('promo_usages').insert([{ user_idtg: String(userId), promo_id: promo.id }]);
            await supabaseClient.rpc('increment_promo_uses', { promo_id: promo.id }).then(() => {}).catch(err => {
                console.warn('increment_promo_uses RPC недоступен, обновим напрямую', err);
                supabaseClient.from('promocodes').update({ used_count: (promo.used_count || 0) + 1 }).eq('id', promo.id);
            });

            const productLabel = promoProduct === 'ADM' ? 'ADM Helper' : 'GOV Helper';
            await UIManager.logPromoActivation(bonusDaysAdded, productLabel, hasDiscount ? promo.discount_percent : 0);

            if (hasDiscount && hasDays) {
                Utils.showToast(`Промокод активирован! Скидка ${promo.discount_percent}% + ${promo.days} ${Utils.getDaysWord(promo.days)} (${productLabel})`, 'success');
            } else if (hasDiscount) {
                Utils.showToast(`Скидка ${promo.discount_percent}% активирована!`, 'success');
            } else {
                Utils.showToast(`Промокод активирован! Добавлено ${promo.days} ${Utils.getDaysWord(promo.days)} (${productLabel})`, 'success');
            }

            if (hasDiscount) UIManager.updatePrices();
            UIManager.closeModals();
            document.getElementById('promoCode').value = '';
            await UIManager.updateProfileUI();
        } catch (e) {
            console.error('Promo activation error:', e);
            const reason = e?.message || e?.code || e?.details || 'неизвестная ошибка';
            Utils.showToast(`Ошибка активации: ${reason}`, 'error');
        }
    }

    static async logPromoActivation(days, productLabel, discountPercent = 0) {
        try {
            const userId = tg.initDataUnsafe?.user?.id;
            const nick = userData?.name || tg.initDataUnsafe?.user?.first_name || 'Пользователь';
            const dbId = userData?.id ?? '—';
            let content = `Пользователь ${nick} (ID: ${dbId} | ${userId}) активировал промокод на ${productLabel}`;
            if (days > 0) {
                content += ` на ${days} ${Utils.getDaysWord(days)}.`;
            } else if (discountPercent > 0) {
                content += ` (скидка ${discountPercent}%).`;
            } else {
                content += '.';
            }
            await supabaseClient.from('logs').insert([{
                title: 'Активировал промокод',
                content,
                admin: 'system',
                type: 'promo',
                created_at: new Date().toISOString()
            }]);
        } catch (e) {
            console.error('Ошибка записи лога промокода:', e);
        }
    }

    static async addDaysToUser(userId, days, note = '', product = 'GOV') {
        const isAdm = (product || 'GOV').toUpperCase() === 'ADM';
        const dateField = isAdm ? 'admhelper_days' : 'govhelper_days';
        const issuedField = isAdm ? 'admhelper_issued' : 'govhelper_issued';

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        let startDate = today;
        if (userData && userData[dateField]) {
            const currentExpiry = new Date(userData[dateField]);
            if (currentExpiry > today) startDate = currentExpiry;
        }
        const newDate = new Date(startDate);
        newDate.setDate(newDate.getDate() + days);
        const newExpiryString = newDate.toISOString().split('T')[0];

        if (userData) {
            userData[dateField] = newExpiryString;
            userData[issuedField] = 'Promo';
        }

        const updatePayload = {
            [dateField]: newExpiryString,
            [issuedField]: 'Promo'
        };
        if (note) updatePayload.notes = note;
        await supabaseClient.from('users').update(updatePayload).eq('idtg', userId);
    }

    static updatePrices() {
        document.querySelectorAll('.pricing-card').forEach(card => {
            const planStr = card.dataset.plan.replace('-renew', '');
            const plan = parseInt(planStr);
            const starsAmount = pricingData[currentProduct]?.stars?.[plan];
            if (starsAmount) {
                const priceEl = card.querySelector('.price');
                const currencyEl = card.querySelector('.currency');
                const starIcon = '<i class="fas fa-star price-star-icon"></i>';

                if (activeDiscount && activeDiscount.percent > 0) {
                    const discountedAmount = applyDiscount(starsAmount);
                    priceEl.innerHTML = `<span class="original-price">${starsAmount}</span> ${discountedAmount}`;
                    currencyEl.innerHTML = `${starIcon} <span class="discount-badge">-${activeDiscount.percent}%</span>`;
                } else {
                    priceEl.textContent = starsAmount;
                    currencyEl.innerHTML = starIcon;
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
        const productForPayment = giftMode ? giftSelectedProduct : currentProduct;
        const body = { plan, isRenewal, userId, product: productForPayment };
        if (giftMode && giftRecipientIdtg) {
            body.giftRecipientId = giftRecipientIdtg;
            body.giftRecipientName = giftRecipientNameStr;
        }
        const response = await fetch(`${API_BASE}/api/create-crypto-invoice`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
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
        const container = document.getElementById('contests-container');
        if (!container) return;

        const userId = String(tg.initDataUnsafe?.user?.id || '');
        container.innerHTML = '<div class="contests-loading"><i class="fas fa-spinner fa-spin"></i><span>Загрузка розыгрышей...</span></div>';

        try {
            // Fetch all currently active contests
            const { data: activeContests, error } = await supabaseClient
                .from('contests')
                .select('*')
                .eq('is_active', true)
                .order('created_at', { ascending: false });

            if (error) throw error;

            const now = new Date();

            // Auto-end contests whose ends_at has passed
            for (const c of (activeContests || [])) {
                if (new Date(c.ends_at) <= now && !c.winner_idtg) {
                    await UIManager.determineWinner(c.id);
                }
            }

            // Re-fetch to get updated state after any auto-endings
            const { data: currentContests } = await supabaseClient
                .from('contests')
                .select('*')
                .eq('is_active', true)
                .order('created_at', { ascending: false });

            // Index by type
            const byType = {};
            for (const c of (currentContests || [])) {
                byType[c.type] = c;
            }

            // Check user participation for all active contests
            const participationMap = {};
            if (userId && currentContests && currentContests.length > 0) {
                const ids = currentContests.map(c => c.id);
                const { data: parts } = await supabaseClient
                    .from('contest_participants')
                    .select('contest_id')
                    .eq('user_idtg', userId)
                    .in('contest_id', ids);
                for (const p of (parts || [])) {
                    participationMap[p.contest_id] = true;
                }
            }

            // Render one card per product type
            container.innerHTML =
                UIManager.renderContestCard(byType['gov'], 'gov', participationMap) +
                UIManager.renderContestCard(byType['adm'], 'adm', participationMap);

            // Attach join button listeners (event delegation-safe)
            container.querySelectorAll('.contest-join-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const id = parseInt(btn.dataset.contestId);
                    UIManager.joinContest(id);
                });
            });

            // Set auto-refresh when each active contest expires
            for (const c of (currentContests || [])) {
                const timeLeft = new Date(c.ends_at).getTime() - Date.now();
                if (timeLeft > 0) {
                    setTimeout(() => UIManager.loadContests(), timeLeft + 1500);
                }
            }

        } catch (e) {
            console.error('Contest load error:', e);
            container.innerHTML = '<div class="contests-loading"><i class="fas fa-exclamation-circle" style="color:#ef4444;"></i><span>Ошибка загрузки. Попробуйте позже.</span></div>';
        }
    }

    static renderContestCard(contest, type, participationMap) {
        const isGov = type === 'gov';
        const typeClass = isGov ? 'gov' : 'admin';
        const iconClass = isGov ? 'helper-gov' : 'helper-admin';
        const iconEl = isGov ? 'fas fa-shield-alt' : 'fas fa-user-shield';
        const name = isGov ? 'GOV Helper' : 'ADMIN Helper';

        if (!contest) {
            return `<div class="contest-card premium ${typeClass}">
                <div class="contest-header">
                    <div class="contest-icon ${iconClass}"><i class="${iconEl}"></i></div>
                    <div>
                        <h3>Розыгрыш ${name}</h3>
                        <span class="contest-date"><i class="far fa-calendar-alt"></i> 30 дней подписки</span>
                    </div>
                </div>
                <div class="contest-footer">
                    <button class="btn-primary contest-btn btn-disabled" disabled>
                        <i class="fas fa-flag-checkered"></i><span>Завершён</span>
                    </button>
                </div>
            </div>`;
        }

        const isParticipating = !!participationMap[contest.id];
        const endsAt = new Date(contest.ends_at);
        const dd = String(endsAt.getDate()).padStart(2, '0');
        const mm = String(endsAt.getMonth() + 1).padStart(2, '0');
        const yyyy = endsAt.getFullYear();
        const hh = String(endsAt.getHours()).padStart(2, '0');
        const min = String(endsAt.getMinutes()).padStart(2, '0');
        const deadlineStr = `${dd}.${mm}.${yyyy} ${hh}:${min}`;

        const titleHtml = contest.title
            ? `<span class="contest-title-extra">${Utils.escapeHtml(contest.title)}</span>`
            : '';

        let btnHtml;
        if (isParticipating) {
            btnHtml = `<button class="btn-primary contest-btn btn-disabled" disabled>
                <i class="fas fa-check"></i><span>Вы участвуете</span>
            </button>`;
        } else {
            btnHtml = `<button class="btn-primary contest-btn contest-join-btn" data-contest-id="${contest.id}">
                <i class="fas fa-ticket-alt"></i><span>Участвовать</span>
            </button>`;
        }

        return `<div class="contest-card premium ${typeClass} active">
            <div class="contest-header">
                <div class="contest-icon ${iconClass}"><i class="${iconEl}"></i></div>
                <div>
                    <h3>Розыгрыш ${name}</h3>
                    ${titleHtml}
                    <span class="contest-date"><i class="far fa-calendar-alt"></i> 30 дней подписки</span>
                    <span class="contest-deadline"><i class="far fa-clock"></i> До: ${deadlineStr}</span>
                </div>
            </div>
            <div class="contest-footer">
                ${btnHtml}
            </div>
        </div>`;
    }

    static async joinContest(contestId) {
        const userId = String(tg.initDataUnsafe?.user?.id || '');
        if (!userId) {
            Utils.showToast('Не удалось определить пользователя Telegram', 'error');
            return;
        }

        try {
            // Re-verify contest is still active (server-side check)
            const { data: contest, error: cErr } = await supabaseClient
                .from('contests')
                .select('id, is_active, ends_at')
                .eq('id', contestId)
                .eq('is_active', true)
                .maybeSingle();

            if (cErr || !contest) {
                Utils.showToast('Розыгрыш уже завершён', 'error');
                UIManager.loadContests();
                return;
            }
            if (new Date(contest.ends_at) <= new Date()) {
                Utils.showToast('Розыгрыш уже завершён', 'error');
                UIManager.loadContests();
                return;
            }

            // Check if already participating
            const { data: existing } = await supabaseClient
                .from('contest_participants')
                .select('id')
                .eq('contest_id', contestId)
                .eq('user_idtg', userId)
                .maybeSingle();

            if (existing) {
                Utils.showToast('Вы уже участвуете в этом розыгрыше', 'info');
                UIManager.loadContests();
                return;
            }

            // Register participation
            const { error } = await supabaseClient
                .from('contest_participants')
                .insert([{ contest_id: contestId, user_idtg: userId }]);

            if (error) {
                if (error.code === '23505') {
                    Utils.showToast('Вы уже участвуете в этом розыгрыше', 'info');
                } else {
                    throw error;
                }
            } else {
                Utils.showToast('Вы успешно зарегистрированы в розыгрыше!', 'success');
            }

            UIManager.loadContests();
        } catch (e) {
            console.error('Join contest error:', e);
            Utils.showToast('Ошибка при регистрации', 'error');
        }
    }

    static async determineWinner(contestId) {
        try {
            const { data: participants, error: pError } = await supabaseClient
                .from('contest_participants')
                .select('user_idtg')
                .eq('contest_id', contestId);

            if (pError) throw pError;

            const winnerIdtg = (participants && participants.length > 0)
                ? participants[Math.floor(Math.random() * participants.length)].user_idtg
                : null;

            await supabaseClient
                .from('contests')
                .update({ winner_idtg: winnerIdtg, is_active: false })
                .eq('id', contestId)
                .eq('is_active', true); // Only update if still active (race-condition guard)

            console.log(`Contest ${contestId} ended. Winner: ${winnerIdtg}`);
        } catch (e) {
            console.error('Determine winner error:', e);
        }
    }

    static openGiftModalFromPayment(plan) {
        giftMode = false;
        giftRecipientIdtg = null;
        giftRecipientNameStr = '';
        giftSelectedPlan = plan || 30;
        giftSelectedProduct = 'gov';
        const inp = document.getElementById('giftRecipientInput');
        if (inp) inp.value = '';
        const confirmBtn = document.getElementById('confirmGiftBtn');
        if (confirmBtn) {
            confirmBtn.style.opacity = '0.5';
            confirmBtn.style.pointerEvents = 'none';
            confirmBtn.disabled = false;
            document.getElementById('giftBtnIcon').className = 'fas fa-gift';
            document.getElementById('giftBtnText').textContent = 'Оплатить';
        }
        document.querySelectorAll('.gift-product-btn').forEach(b => b.classList.toggle('active', b.dataset.gproduct === 'gov'));
        document.querySelectorAll('.gift-plan-btn').forEach(b => b.classList.toggle('active', b.dataset.gplan === String(giftSelectedPlan)));
        document.getElementById('giftModal').classList.add('active');
    }

    static showPaymentMethodSelection(plan, isRenewal) {
        const modal = document.getElementById('paymentMethodModal');
        if (modal) {
            document.getElementById('paymentPlanDays').value = plan;
            document.getElementById('paymentIsRenewal').value = isRenewal;
            const planNames = { 15: '15 дней', 30: '30 дней', 365: '365 дней' };
            document.getElementById('selectedPlanInfo').textContent = `${planNames[plan] || plan + ' дней'}`;

            const giftBox = document.getElementById('paymentGiftRecipientBox');
            const giftNameEl = document.getElementById('paymentGiftRecipientName');
            if (giftMode && giftRecipientIdtg) {
                if (giftBox) {
                    giftBox.classList.add('visible');
                    if (giftNameEl) giftNameEl.textContent = giftRecipientNameStr;
                }
            } else {
                if (giftBox) giftBox.classList.remove('visible');
            }

            const productForPrice = giftMode ? giftSelectedProduct : currentProduct;
            const stars = pricingData[productForPrice]?.stars?.[plan];
            const priceEl = document.getElementById('selectedPlanPrice');
            if (priceEl) {
                if (stars) {
                    const finalStars = (!giftMode && activeDiscount?.percent) ? applyDiscount(stars) : stars;
                    priceEl.innerHTML = `${finalStars} <i class="fas fa-star price-star-icon"></i>`;
                } else {
                    priceEl.textContent = '';
                }
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

    static getStarsPrice(plan, _isRenewal) {
        let price = pricingData[currentProduct]?.stars?.[plan] || 100;
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
            const productForPayment = giftMode ? giftSelectedProduct : currentProduct;
            const body = { plan, isRenewal, userId, product: productForPayment };
            if (giftMode && giftRecipientIdtg) {
                body.giftRecipientId = giftRecipientIdtg;
                body.giftRecipientName = giftRecipientNameStr;
            }
            const response = await fetch(`${API_BASE}/api/create-stars-invoice`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
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
            const buyerId = tg.initDataUnsafe.user.id;
            const buyerName = tg.initDataUnsafe.user.first_name || 'User';

            // Gift mode: give subscription to recipient, log the gifter
            const isGift = giftMode && giftRecipientIdtg;
            const targetIdtg = isGift ? giftRecipientIdtg : String(buyerId);
            const targetName = isGift ? giftRecipientNameStr : buyerName;
            const activateProduct = isGift ? giftSelectedProduct : (currentProduct === 'admin' ? 'admin' : 'gov');

            const product = activateProduct === 'admin' ? 'admin' : 'gov';
            const productLabel = product === 'admin' ? 'Admin Helper' : 'GOV Helper';
            const daysField = product === 'admin' ? 'admhelper_days' : 'govhelper_days';
            const issuedField = product === 'admin' ? 'admhelper_issued' : 'govhelper_issued';

            // Fetch current expiry of target user
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            let startDate = today;
            if (isGift) {
                const { data: recipientData } = await supabaseClient
                    .from('users')
                    .select(daysField)
                    .eq('idtg', targetIdtg)
                    .maybeSingle();
                if (recipientData?.[daysField]) {
                    const currentExpiry = new Date(recipientData[daysField]);
                    if (currentExpiry > today) startDate = currentExpiry;
                }
            } else {
                const currentVal = userData?.[daysField];
                if (currentVal) {
                    const currentExpiry = new Date(currentVal);
                    if (currentExpiry > today) startDate = currentExpiry;
                }
            }

            const newDate = new Date(startDate);
            newDate.setDate(newDate.getDate() + parseInt(plan));
            const newExpiryString = newDate.toISOString().split('T')[0];

            const updatePayload = {
                [daysField]: newExpiryString,
                [issuedField]: isGift ? `Gift from ${buyerName}` : method
            };
            if (!isGift) updatePayload.total_purchases = (userData?.total_purchases || 0) + 1;

            const { error: updateError } = await supabaseClient
                .from('users')
                .update(updatePayload)
                .eq('idtg', targetIdtg);
            if (updateError) throw updateError;

            if (!isGift && userData) {
                userData[daysField] = newExpiryString;
                userData[issuedField] = method;
                userData.total_purchases = updatePayload.total_purchases;
            }

            const logContent = isGift
                ? `${buyerName} (ID: ${buyerId}) подарил подписку ${productLabel} на ${plan} дней пользователю ${targetName} (ID: ${targetIdtg}) через ${method}`
                : `Пользователю ${buyerName} (ID: ${buyerId}) выдана подписка ${productLabel} на ${plan} дней через ${method}`;
            await supabaseClient.from('logs').insert([{
                title: isGift ? 'Подарок подписки' : 'Выдача подписки',
                content: logContent,
                admin: 'system',
                created_at: new Date().toISOString()
            }]);

            const fee = paidAmount * 0.05;
            await supabaseClient.from('payments').insert([{
                user_id: buyerId,
                user_name: buyerName,
                amount: paidAmount,
                fee: fee,
                net_amount: paidAmount - fee,
                method: method,
                status: 'completed',
                description: `${isGift ? `Подарок ${targetName} — ` : ''}Подписка на ${plan} дней (${isRenewalForce ? 'Продление' : 'Новая'})`,
                created_at: new Date().toISOString()
            }]);

            if (activeDiscount && !isGift) {
                await supabaseClient.from('user_discounts').update({ is_used: true }).eq('user_idtg', buyerId).eq('promo_id', activeDiscount.promoId);
                activeDiscount = null;
            }

            if (isGift) {
                giftMode = false;
                giftRecipientIdtg = null;
                giftRecipientNameStr = '';
            } else {
                pricingMode = 'renew';
            }
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
        const tgUsername = userData.user_name_tg || tg.initDataUnsafe.user.username;
        document.getElementById('userTelegram').textContent = tgUsername ? `@${tgUsername.replace(/^@/, '')}` : `ID: ${tg.initDataUnsafe.user.id}`;

        const userAvatar = document.getElementById('userAvatar');
        if (tg.initDataUnsafe.user.photo_url) {
            userAvatar.style.backgroundImage = `url(${tg.initDataUnsafe.user.photo_url})`;
            userAvatar.style.backgroundSize = 'cover';
            userAvatar.innerHTML = '';
        }

        const daysGov = Utils.calculateDaysLeft(userData.govhelper_days);
        const daysAdmin = Utils.calculateDaysLeft(userData.admhelper_days);

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
            const isCuratorRole = getCuratorNumber(userData?.role) !== null;
            const shouldShow = daysAdmin > 0 || isCuratorRole;
            adminTabBtn.classList.toggle('tab-hidden', !shouldShow);
            if (!shouldShow) adminTabBtn.style.display = '';
        }

        const adminNormaSection = document.getElementById('adminNormaSection');
        if (adminNormaSection) {
            adminNormaSection.style.display = daysAdmin > 0 ? '' : 'none';
        }

        loadCuratorSection();

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
        await supabaseClient.from('users').upsert({
            idtg: tg.initDataUnsafe.user.id,
            name: userData.name,
            user_name_tg: userData.user_name_tg,
            role: userData.role,
            key: userData.key,
            govhelper_days: userData.govhelper_days,
            admhelper_days: userData.admhelper_days
        }, { onConflict: 'idtg' });
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
                user_name_tg: user.username || '',
                role: 'user',
                total_purchases: 0,
                created_at: new Date().toISOString()
            }]).select().single();

            if (createError) throw createError;
            userData = newUser;
        } else {
            userData = data;
            // Подтянуть @username из Telegram, если ранее не сохранён
            if (!userData.user_name_tg && user.username) {
                await supabaseClient.from('users').update({ user_name_tg: user.username }).eq('idtg', user.id);
                userData.user_name_tg = user.username;
            }
        }

        pricingMode = (userData && userData.govhelper_days) ? 'renew' : 'new';
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

        if (userData && (Utils.calculateDaysLeft(userData.admhelper_days) > 0 || getCuratorNumber(userData?.role) !== null)) {
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
    await loadCuratorSection();
}

async function loadActiveDiscount() {
    try {
        const userId = tg.initDataUnsafe.user.id;
        const { data: discountData, error } = await supabaseClient.from('user_discounts').select('*, promocodes!inner(discount_percent, code)').eq('user_idtg', String(userId)).eq('is_used', false).maybeSingle();
        if (!error && discountData) activeDiscount = { percent: discountData.promocodes.discount_percent, promoId: discountData.promo_id, code: discountData.promocodes.code };
    } catch (e) { console.error('Error loading discount:', e); }
}

function applyDiscount(price) {
    if (!activeDiscount || !activeDiscount.percent) return price;
    return Math.round(price * (1 - activeDiscount.percent / 100));
}

// ================= НАСТРОЙКИ ИЗ admhelper_settings =================
async function openAdminProfile(idtg, nickname, level) {
    const modal = document.getElementById('adminProfileModal');
    const body = document.getElementById('adminProfileBody');
    modal.classList.add('active');

    body.innerHTML = '<div style="text-align:center; padding: 32px 20px; color: var(--gray-400);"><i class="fas fa-spinner fa-spin fa-2x"></i><br><br>Загрузка...</div>';

    try {
        const userKey = userData?.key;
        if (!userKey) {
            body.innerHTML = `<div style="text-align:center; padding: 20px; color: var(--gray-400);">Ключ пользователя не найден.<br>Сначала купите подписку.</div>`;
            return;
        }

        let { data, error } = await supabaseClient
            .from('admhelper_settings')
            .select('min_report, min_online, min_jail, enable_jail')
            .eq('key', userKey)
            .maybeSingle();

        if (error && error.code !== 'PGRST116') throw error;

        if (!data) {
            const defaults = { key: userKey, min_report: 245, min_online: '02:55', min_jail: 10, enable_jail: true };
            const { error: insertError } = await supabaseClient.from('admhelper_settings').insert([defaults]);
            if (insertError) console.warn('Не удалось создать настройки по умолчанию:', insertError);
            data = defaults;
        }

        const repGoal = data.min_report !== null && data.min_report !== undefined ? data.min_report : 245;
        const onlGoal = data.min_online || '02:55';
        const jGoal = data.min_jail !== null && data.min_jail !== undefined ? data.min_jail : 10;
        const jEnabled = data.enable_jail !== false;

        body.innerHTML = `
            <div class="admin-profile-container">

                <div class="admin-info-row">
                    <span class="admin-info-label"><i class="fas fa-flag" style="color:var(--primary); margin-right:8px;"></i>Мин. репортов</span>
                    <div class="edit-group">
                        <span class="admin-info-value" id="val-reports">${repGoal}</span>
                        <button class="edit-btn" onclick="editProfileField('reports')"><i class="fas fa-pen"></i></button>
                    </div>
                </div>

                <div class="admin-info-row">
                    <span class="admin-info-label"><i class="fas fa-clock" style="color:var(--success); margin-right:8px;"></i>Мин. онлайн</span>
                    <div class="edit-group">
                        <span class="admin-info-value" id="val-online">${onlGoal}</span>
                        <button class="edit-btn" onclick="editProfileField('online')"><i class="fas fa-pen"></i></button>
                    </div>
                </div>

                <div class="admin-info-row">
                    <span class="admin-info-label"><i class="fas fa-gavel" style="color:var(--warning); margin-right:8px;"></i>Мин. джаилы</span>
                    <div class="edit-group" style="gap: 12px;">
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
        body.innerHTML = `<div style="text-align:center; padding: 20px; color: var(--danger);">Не удалось загрузить настройки</div>`;
    }
}

// ================= ФУНКЦИЯ РЕДАКТИРОВАНИЯ С ПРОВЕРКОЙ ФОРМАТА =================
window.editProfileField = async function(field) {
    const userKey = userData?.key;
    if (!userKey) {
        Utils.showToast('Ключ пользователя не найден', 'error');
        return;
    }

    const valSpan = document.getElementById(`val-${field}`);
    const currentVal = valSpan.innerText;

    const prompts = {
        'reports': 'Введите цель по репортам (число):',
        'online': 'Введите время в формате ЧЧ:ММ (например, 02:30):',
        'jails': 'Введите цель по джаилам (число):'
    };

    let newVal = prompt(prompts[field], currentVal);
    if (newVal === null || newVal.trim() === "" || newVal === currentVal) return;
    newVal = newVal.trim();

    if (field === 'online') {
        const timeRegex = /^([0-9]{1,2}):([0-5][0-9])$/;
        if (!timeRegex.test(newVal)) {
            Utils.showToast('Ошибка! Формат должен быть ЧЧ:ММ (напр. 03:15)', 'error');
            return;
        }
    }

    let updateData = {};
    if (field === 'reports') updateData.min_report = parseInt(newVal);
    if (field === 'online') updateData.min_online = newVal;
    if (field === 'jails') updateData.min_jail = parseInt(newVal);

    valSpan.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

    try {
        const { error } = await supabaseClient
            .from('admhelper_settings')
            .update(updateData)
            .eq('key', userKey);

        if (error) throw error;

        valSpan.innerText = newVal;
        Utils.showToast('Данные обновлены', 'success');

        if (field === 'reports') {
            const tr = document.getElementById('targetReports');
            if (tr) tr.textContent = `цель: ${parseInt(newVal)}`;
        }
        if (field === 'online') {
            const to = document.getElementById('targetOnline');
            if (to) {
                const parts = newVal.split(':');
                to.textContent = `цель: ${parseInt(parts[0])}ч ${parseInt(parts[1])}м`;
            }
        }
        if (field === 'jails') {
            const tj = document.getElementById('targetJails');
            if (tj) tj.textContent = `цель: ${parseInt(newVal)}`;
        }
    } catch (e) {
        console.error('Ошибка сохранения:', e);
        valSpan.innerText = currentVal;
        Utils.showToast('Ошибка при сохранении', 'error');
    }
}

window.toggleJailsGoal = async function(checkbox) {
    const userKey = userData?.key;
    if (!userKey) return;
    const enabled = checkbox.checked;
    const valSpan = document.getElementById('val-jails');
    const editBtn = document.getElementById('btn-edit-jails');
    if (valSpan) valSpan.style.opacity = enabled ? 1 : 0.4;
    if (editBtn) editBtn.disabled = !enabled;

    try {
        const { error } = await supabaseClient
            .from('admhelper_settings')
            .update({ enable_jail: enabled })
            .eq('key', userKey);
        if (error) throw error;

        const targetJails = document.getElementById('targetJails');
        if (targetJails) {
            if (enabled) {
                targetJails.style.display = 'block';
            } else {
                targetJails.style.display = 'none';
            }
        }
    } catch (e) {
        console.error('Ошибка переключения джаилов:', e);
        checkbox.checked = !enabled;
        if (valSpan) valSpan.style.opacity = !enabled ? 1 : 0.4;
        if (editBtn) editBtn.disabled = enabled;
        Utils.showToast('Не удалось обновить настройку', 'error');
    }
}



function closeAdminProfile() {
    document.getElementById('adminProfileModal').classList.remove('active');
}

async function openAdminOnline(idtg, isDetailed = false) {
    const modal = document.getElementById('adminOnlineModal');
    const body = document.getElementById('adminOnlineBody');
    modal.classList.add('active');
    body.innerHTML = '<div style="text-align:center; padding: 50px 20px; color: var(--gray-400);"><i class="fas fa-spinner fa-spin fa-2x"></i><br><br>Загрузка статистики...</div>';

    try {
        const userKey = userData?.key;
        if (!userKey) {
            body.innerHTML = `<div style="text-align:center; padding: 30px 20px; color: var(--gray-400);">Ключ пользователя не найден.<br>Сначала купите подписку.</div>`;
            return;
        }

        const { data: userSettings } = await supabaseClient
            .from('admhelper_settings')
            .select('min_report, min_online')
            .eq('key', userKey)
            .maybeSingle();

        const repGoal = userSettings?.min_report || 245;
        const onlGoalMins = timeToMinutes(userSettings?.min_online || "02:55") || 1;

        let query = supabaseClient.from('admhelper_norma').select('*').eq('key', userKey);

        const date = getMSKDate();
        const year = date.getFullYear();
        const month = date.getMonth();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const monthNameRaw = date.toLocaleString('ru', { month: 'long' });
        const monthName = monthNameRaw.charAt(0).toUpperCase() + monthNameRaw.slice(1);

        if (!isDetailed) {
            const firstDay = `${year}-${String(month + 1).padStart(2, '0')}-01`;
            const lastDay = `${year}-${String(month + 1).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;
            query = query.gte('date', firstDay).lte('date', lastDay);
        }

        const { data: rawNormaData, error } = await query;
        if (error) throw error;

        const normaData = (rawNormaData || []).map(item => ({
            record_date: item.date,
            online: item.online,
            reports: item.report,
            jails: item.jail,
            mutes: item.mute,
            warns: item.warn,
            bans: item.ban
        }));

        let totalPoints = 0;
        let totalOnlineMins = 0;
        let totalReports = 0;
        let totalJails = 0;
        let normDays = 0;
        let activeDays = 0;
        let tableRows = '';

        const calculatePoints = (reports, onlineTimeStr) => {
            const rMult = (reports || 0) / repGoal;
            const oMult = timeToMinutes(onlineTimeStr) / onlGoalMins;
            const mult = Math.floor(Math.min(rMult, oMult) * 2) / 2;
            return mult * 11;
        };

        const isNormDone = (reports, onlineTimeStr) =>
            (reports || 0) >= repGoal && timeToMinutes(onlineTimeStr) >= onlGoalMins;

        const aggregate = (item) => {
            const pts = calculatePoints(item.reports, item.online);
            totalPoints += pts;
            totalOnlineMins += timeToMinutes(item.online) || 0;
            totalReports += item.reports || 0;
            totalJails += item.jails || 0;
            if ((item.reports || 0) > 0 || timeToMinutes(item.online) > 0) activeDays++;
            if (isNormDone(item.reports, item.online)) normDays++;
        };

        if (isDetailed) {
            const sortedData = (normaData || []).sort((a, b) => new Date(b.record_date) - new Date(a.record_date));
            sortedData.forEach(item => {
                aggregate(item);
                const dateStr = item.record_date.split('-').reverse().join('.');
                const normIcon = isNormDone(item.reports, item.online)
                    ? `<i class="fas fa-circle-check" style="color:var(--success)" title="Норма выполнена"></i>`
                    : `<i class="fas fa-circle-xmark" style="color:var(--gray-600)" title="Норма не выполнена"></i>`;
                tableRows += `
                    <tr>
                        <td class="date-col">${normIcon} ${dateStr}</td>
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
            (normaData || []).forEach(item => {
                aggregate(item);
                const day = parseInt(item.record_date.split('-')[2], 10);
                normaMap[day] = item;
            });

            for (let i = 1; i <= daysInMonth; i++) {
                const dayData = normaMap[i];
                const online = dayData && dayData.online ? formatOnlineFromTime(dayData.online) : `<span class="val-empty">—</span>`;
                const reports = dayData && dayData.reports > 0 ? `<span class="val-num">${dayData.reports}</span>` : `<span class="val-empty">—</span>`;
                const jails = dayData && dayData.jails > 0 ? `<span class="val-num">${dayData.jails}</span>` : `<span class="val-empty">—</span>`;
                const normIcon = dayData && isNormDone(dayData.reports, dayData.online)
                    ? `<i class="fas fa-circle-check" style="color:var(--success); margin-right:4px;" title="Норма выполнена"></i>`
                    : (dayData ? `<i class="fas fa-circle-xmark" style="color:var(--gray-600); margin-right:4px;" title="Норма не выполнена"></i>` : `<i class="far fa-circle" style="color:var(--gray-700); margin-right:4px;"></i>`);

                const isToday = (i === date.getDate()) ? 'class="row-today"' : '';
                const dateStr = `${String(i).padStart(2, '0')}.${String(month + 1).padStart(2, '0')}`;

                tableRows += `
                    <tr ${isToday}>
                        <td class="date-col">${normIcon}${dateStr}</td>
                        <td>${online}</td>
                        <td>${reports}</td>
                        <td>${jails}</td>
                    </tr>
                `;
            }
        }

        const totalOnlineFmt = `${Math.floor(totalOnlineMins / 60)}ч ${totalOnlineMins % 60}м`;
        const periodLabel = isDetailed ? 'За всё время' : `За ${monthName}`;

        body.innerHTML = `
            <div class="online-modal-content">
                <div class="online-tab-switcher">
                    <button class="online-tab ${!isDetailed ? 'active' : ''}" onclick="openAdminOnline('${idtg}', false)">
                        <i class="fas fa-calendar-day"></i> За месяц
                    </button>
                    <button class="online-tab ${isDetailed ? 'active' : ''}" onclick="openAdminOnline('${idtg}', true)">
                        <i class="fas fa-infinity"></i> За всё время
                    </button>
                </div>

                <div class="online-summary-grid">
                    <div class="summary-card primary">
                        <div class="summary-icon"><i class="fas fa-star"></i></div>
                        <div class="summary-info">
                            <span class="summary-num">${totalPoints.toFixed(1)}</span>
                            <span class="summary-lbl">Баллов</span>
                        </div>
                    </div>
                    <div class="summary-card success">
                        <div class="summary-icon"><i class="fas fa-circle-check"></i></div>
                        <div class="summary-info">
                            <span class="summary-num">${normDays}<small>/${activeDays}</small></span>
                            <span class="summary-lbl">Норма дней</span>
                        </div>
                    </div>
                    <div class="summary-card">
                        <div class="summary-icon"><i class="fas fa-clock"></i></div>
                        <div class="summary-info">
                            <span class="summary-num">${totalOnlineFmt}</span>
                            <span class="summary-lbl">Онлайн</span>
                        </div>
                    </div>
                    <div class="summary-card">
                        <div class="summary-icon"><i class="fas fa-flag"></i></div>
                        <div class="summary-info">
                            <span class="summary-num">${totalReports}</span>
                            <span class="summary-lbl">Репортов</span>
                        </div>
                    </div>
                </div>

                <div class="online-section-header">
                    <h4>${periodLabel}</h4>
                    <span class="period-meta">${isDetailed ? activeDays + ' активных дней' : monthName + ' ' + year}</span>
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
                                ${tableRows || `<tr><td colspan="${isDetailed ? 7 : 4}" style="text-align:center; padding:20px; color:var(--gray-500);">Нет данных за период</td></tr>`}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;

    } catch (e) {
        console.error('Ошибка при загрузке онлайна:', e);
        body.innerHTML = `
            <div style="text-align:center; padding: 30px 20px;">
                <i class="fas fa-exclamation-triangle" style="color: var(--danger); font-size: 30px; margin-bottom: 10px;"></i>
                <div style="color: var(--gray-400);">Не удалось загрузить данные</div>
                <div style="color: var(--gray-600); font-size:12px; margin-top:6px;">${e?.message || ''}</div>
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
        const userKey = userData?.key;

        let reportGoal = 245;
        let onlineGoalStr = "02:55";
        let jailsGoal = 10;
        let jailsEnabled = true;

        if (userKey) {
            const { data: adminInfo } = await supabaseClient
                .from('admhelper_settings')
                .select('min_report, min_online, min_jail, enable_jail')
                .eq('key', userKey)
                .maybeSingle();

            if (adminInfo) {
                if (adminInfo.min_report) reportGoal = adminInfo.min_report;
                if (adminInfo.min_online) onlineGoalStr = adminInfo.min_online;
                if (adminInfo.min_jail !== null && adminInfo.min_jail !== undefined) jailsGoal = adminInfo.min_jail;
                if (adminInfo.enable_jail !== null && adminInfo.enable_jail !== undefined) jailsEnabled = adminInfo.enable_jail;
            }
        }

        // Обновляем текст целей в интерфейсе
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

        if (!userKey) { resetAdminStats(); return; }

        const today = getMSKDateString();
        const { data: rawStats } = await supabaseClient
            .from('admhelper_norma')
            .select('*')
            .eq('key', userKey)
            .eq('date', today)
            .maybeSingle();

        const stats = rawStats ? {
            reports: rawStats.report,
            jails: rawStats.jail,
            mutes: rawStats.mute,
            warns: rawStats.warn,
            bans: rawStats.ban,
            online: rawStats.online
        } : null;

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

        await updateStreakUI(userKey, reportGoal, onlineGoalStr);

        const mskNow = getMSKDate();
        document.getElementById('adminStatDate').textContent = `Статистика за ${mskNow.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}`;
        const topDateEl = document.getElementById('adminTopDate');
        if (topDateEl) {
            const d = mskNow;
            const dd = String(d.getDate()).padStart(2,'0');
            const mm = String(d.getMonth()+1).padStart(2,'0');
            const yyyy = d.getFullYear();
            topDateEl.textContent = `${dd}.${mm}.${yyyy}`;
        }

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

async function updateStreakUI(userKey, reportGoal, onlineGoalStr) {
    reportGoal = reportGoal || 245;
    onlineGoalStr = onlineGoalStr || "02:55";

    const completedDates = [];

    if (userKey) {
        const { data: allNormaData } = await supabaseClient
            .from('admhelper_norma')
            .select('date, report, online')
            .eq('key', userKey);

        const onlineGoalMinutes = Math.max(1, timeToMinutes(onlineGoalStr));

        if (allNormaData) {
            allNormaData.forEach(item => {
                const reportMult = (item.report || 0) / reportGoal;
                const onlineMult = timeToMinutes(item.online) / onlineGoalMinutes;
                const normMultiplier = Math.floor(Math.min(reportMult, onlineMult) * 2) / 2;
                if (normMultiplier >= 1) {
                    completedDates.push(item.date);
                }
            });
        }
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


window.openFuncDetail = function(name, desc, imageUrl) {
    document.getElementById('funcDetailTitle').textContent = name;
    document.getElementById('funcDetailDesc').textContent = desc;
    const img = document.getElementById('funcDetailImage');
    if (imageUrl) {
        img.src = imageUrl;
        img.style.display = 'block';
    } else {
        img.src = '';
        img.style.display = 'none';
    }
    document.getElementById('funcDetailModal').classList.add('active');
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

// ==================== КУРАТОР ====================

async function loadCuratorSection() {
    const curatorSection = document.getElementById('curatorSection');
    const listContainer = document.getElementById('curatorAdminList');
    if (!curatorSection || !listContainer) return;

    const curNum = getCuratorNumber(userData?.role);
    if (curNum === null) {
        curatorSection.style.display = 'none';
        return;
    }

    curatorSection.style.display = 'block';

    const badge = document.getElementById('curatorGroupBadge');
    if (badge) badge.textContent = curNum === 0 ? 'Все группы' : `${curNum} serv.`;

    listContainer.innerHTML = '<div class="curator-loading"><i class="fas fa-spinner fa-spin"></i></div>';

    try {
        let query = supabaseClient.from('users').select('idtg, name, user_name_tg, role');

        if (curNum === 0) {
            const roles = Array.from({ length: 20 }, (_, i) => `freeadm${i + 1}`);
            query = query.in('role', roles);
        } else {
            query = query.eq('role', `freeadm${curNum}`);
        }

        const { data, error } = await query.order('name', { ascending: true });
        if (error) throw error;

        if (!data || data.length === 0) {
            listContainer.innerHTML = `<div class="curator-empty"><i class="fas fa-user-slash" style="display:block;font-size:26px;margin-bottom:10px;opacity:0.4;"></i>Нет администраторов в группе</div>`;
            return;
        }

        listContainer.innerHTML = data.map(u => {
            const name = Utils.escapeHtml(u.name || u.user_name_tg || `ID: ${u.idtg}`);
            const sub = u.user_name_tg ? `@${u.user_name_tg.replace(/^@/, '')}` : `ID: ${u.idtg}`;
            const safeIdtg = String(u.idtg);
            const safeName = name.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
            return `
                <div class="curator-admin-card" id="ccard-${safeIdtg}">
                    <div class="curator-admin-info">
                        <span class="curator-admin-name">${name}</span>
                        <span class="curator-admin-sub">${Utils.escapeHtml(sub)}</span>
                    </div>
                    <div class="curator-admin-right">
                        <span class="curator-role-badge">${(() => { const m = String(u.role).match(/freeadm(\d+)/i); return m ? `${m[1]} serv.` : u.role; })()}</span>
                        <button class="curator-del-btn" onclick="curatorDeleteAdmin('${safeIdtg}','${safeName}')">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </div>
                </div>`;
        }).join('');
    } catch (e) {
        console.error('loadCuratorSection error:', e);
        listContainer.innerHTML = `<div class="curator-empty"><i class="fas fa-exclamation-triangle" style="display:block;font-size:26px;margin-bottom:10px;color:var(--warning);opacity:0.7;"></i>Ошибка загрузки</div>`;
    }
}

window.curatorDeleteAdmin = async function(idtg, name) {
    const doDelete = async () => {
        const card = document.getElementById(`ccard-${idtg}`);
        if (card) { card.style.opacity = '0.4'; card.style.pointerEvents = 'none'; }
        try {
            const { error } = await supabaseClient.from('users').update({ role: 'user' }).eq('idtg', String(idtg));
            if (error) throw error;
            Utils.showToast(`${name} убран из группы`, 'success');
            await loadCuratorSection();
        } catch (e) {
            console.error('curatorDeleteAdmin error:', e);
            Utils.showToast('Ошибка при удалении', 'error');
            if (card) { card.style.opacity = ''; card.style.pointerEvents = ''; }
        }
    };

    if (tg && tg.showPopup) {
        tg.showPopup({
            title: 'Удалить администратора?',
            message: `${name} получит роль «user»`,
            buttons: [
                { id: 'del', type: 'destructive', text: 'Удалить' },
                { id: 'cancel', type: 'cancel', text: 'Отмена' }
            ]
        }, (btnId) => { if (btnId === 'del') doDelete(); });
    } else {
        if (confirm(`Убрать ${name} из группы?`)) doDelete();
    }
};

window.openCuratorAddModal = function() {
    const curNum = getCuratorNumber(userData?.role);
    if (curNum === null) return;

    const modal = document.getElementById('curatorAddModal');
    const searchInput = document.getElementById('curatorSearchInput');
    const resultDiv = document.getElementById('curatorAddResult');
    const groupWrapper = document.getElementById('curatorGroupSelectWrapper');
    const groupSelect = document.getElementById('curatorGroupSelect');

    if (searchInput) searchInput.value = '';
    if (resultDiv) resultDiv.innerHTML = '';

    if (curNum === 0 && groupSelect) {
        groupWrapper.style.display = 'block';
        groupSelect.innerHTML = '<option value="">Выберите группу...</option>' +
            Array.from({ length: 20 }, (_, i) =>
                `<option value="freeadm${i + 1}">freeadm${i + 1}</option>`
            ).join('');
    } else if (groupWrapper) {
        groupWrapper.style.display = 'none';
    }

    modal.classList.add('active');
    setTimeout(() => { if (searchInput) searchInput.focus(); }, 300);
};

window.curatorSearchUser = async function() {
    const query = (document.getElementById('curatorSearchInput')?.value || '').trim();
    const resultDiv = document.getElementById('curatorAddResult');
    if (!query) { Utils.showToast('Введите имя, @username или ID', 'info'); return; }

    resultDiv.innerHTML = '<div class="curator-loading"><i class="fas fa-spinner fa-spin"></i></div>';

    try {
        let data = null;

        if (/^\d+$/.test(query)) {
            const { data: d } = await supabaseClient
                .from('users').select('idtg, name, user_name_tg, role')
                .eq('idtg', parseInt(query)).maybeSingle();
            if (d) data = [d];
        }

        if (!data || data.length === 0) {
            const clean = query.replace(/^@/, '');
            const { data: d2 } = await supabaseClient
                .from('users').select('idtg, name, user_name_tg, role')
                .or(`name.ilike.%${clean}%,user_name_tg.ilike.%${clean}%`)
                .limit(6);
            if (d2 && d2.length > 0) data = d2;
        }

        if (!data || data.length === 0) {
            resultDiv.innerHTML = '<div class="curator-empty">Пользователь не найден</div>';
            return;
        }

        const curNum = getCuratorNumber(userData?.role);
        const fixedRole = curNum !== 0 ? `'freeadm${curNum}'` : null;

        resultDiv.innerHTML = data.map(u => {
            const name = Utils.escapeHtml(u.name || u.user_name_tg || `ID: ${u.idtg}`);
            const sub = u.user_name_tg ? `@${u.user_name_tg.replace(/^@/, '')}` : `ID: ${u.idtg}`;
            const safeName = name.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
            const roleArg = fixedRole !== null ? fixedRole : `document.getElementById('curatorGroupSelect').value`;
            return `
                <div class="curator-search-result-card">
                    <div class="curator-admin-info">
                        <span class="curator-admin-name">${name}</span>
                        <span class="curator-admin-sub">${Utils.escapeHtml(sub)}</span>
                    </div>
                    <button class="curator-assign-btn" onclick="curatorAssignRole('${u.idtg}','${safeName}',${roleArg})">
                        Добавить
                    </button>
                </div>`;
        }).join('');
    } catch (e) {
        console.error('curatorSearchUser error:', e);
        resultDiv.innerHTML = '<div class="curator-empty" style="color:var(--warning);">Ошибка поиска</div>';
    }
};

window.curatorAssignRole = async function(idtg, name, role) {
    if (!role) { Utils.showToast('Выберите группу из списка', 'info'); return; }
    try {
        const { error } = await supabaseClient.from('users').update({ role }).eq('idtg', String(idtg));
        if (error) throw error;
        Utils.showToast(`${name} добавлен в ${role}`, 'success');
        UIManager.closeModals();
        await loadCuratorSection();
    } catch (e) {
        console.error('curatorAssignRole error:', e);
        Utils.showToast('Ошибка при добавлении', 'error');
    }
};

document.addEventListener('DOMContentLoaded', initApp);