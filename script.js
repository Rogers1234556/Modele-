/* Данные */
const data = [
  { title: "Polices Helper", desc: "Игровой помощник для МВД / ФСБ", price: "250⭐️", img: "img/logo.jpeg", thumb: "img/logo.jpeg" },
  { title: "Leaders Helper", desc: "Игровой помощник для лидеров", price: "250⭐️", img: "img/logo.jpeg", thumb: "img/logo.jpeg" },
  { title: "RADMIR Helper", desc: "Игровой помощник", price: "250⭐️", img: "img/logo.jpeg", thumb: "img/logo.jpeg" }
];

const slidesEl = document.getElementById('slides');
const thumbsEl = document.getElementById('thumbs');
const dotsEl = document.getElementById('dots');
let current = 0;

/* Рендер */
function render(){
  slidesEl.innerHTML = '';
  thumbsEl.innerHTML = '';
  dotsEl.innerHTML = '';
  data.forEach((it,i)=>{
    const s = document.createElement('div');
    s.className = 'slide' + (i===0?' active':'');
    s.innerHTML = `
      <article class="card">
        <div class="bg" style="background-image:url('${it.img}')"></div>
        <div class="overlay"></div>
        <div class="content">
          <div class="title">${it.title}</div>
          <div class="desc">${it.desc}</div>
          <div class="bottom">
            <div class="price">${it.price}</div>
            <button class="btn-order">КУПИТЬ</button>
          </div>
        </div>
      </article>`;
    slidesEl.appendChild(s);

    const t = document.createElement('div');
    t.className = 'thumb' + (i===0?' active':'');
    t.dataset.index = i;
    t.innerHTML = `<div class="thumb-img" style="background-image:url('${it.thumb}')"></div>
                   <div class="t-title">${it.title}</div>
                   <div class="t-price">${it.price}</div>`;
    thumbsEl.appendChild(t);

    const d = document.createElement('div');
    d.className = 'dot' + (i===0?' active':'');
    d.dataset.index = i;
    dotsEl.appendChild(d);
  });
  attachEvents();
}

/* Показ слайда */
function show(index){
  if(index<0) index=data.length-1;
  if(index>=data.length) index=0;
  current=index;
  slidesEl.querySelectorAll('.slide').forEach((s,i)=> s.classList.toggle('active',i===index));
  thumbsEl.querySelectorAll('.thumb').forEach((t,i)=> t.classList.toggle('active',i===index));
  dotsEl.querySelectorAll('.dot').forEach((d,i)=> d.classList.toggle('active',i===index));
}

/* Навигация */
function attachEvents(){
  thumbsEl.querySelectorAll('.thumb').forEach(t=>{
    t.onclick=()=>show(+t.dataset.index);
  });
  dotsEl.querySelectorAll('.dot').forEach(d=>{
    d.onclick=()=>show(+d.dataset.index);
  });
}
render();

/* Переключение вкладок */
/* Переключение вкладок (делегирование) */
document.querySelector(".bottom-nav").addEventListener("click", (e) => {
  const item = e.target.closest(".nav-item");
  if (!item) return;

  document.querySelectorAll(".nav-item").forEach(i => i.classList.remove("active"));
  document.querySelectorAll(".section").forEach(s => s.classList.remove("active"));

  item.classList.add("active");
  document.getElementById(item.dataset.section).classList.add("active");
});

/* Промокод */
const createBtn = document.getElementById("createPromoBtn");
const promoInputBox = document.getElementById("promoInputBox");
const promoText = document.getElementById("promoText");
const promoResultBox = document.getElementById("promoResultBox");
const promoResultText = document.getElementById("promoResultText");
// Скрываем промо-блоки при загрузке
promoInputBox.style.display = "none";
promoResultBox.style.display = "none";

createBtn.onclick = ()=>{
  createBtn.style.display="none";
  promoInputBox.style.display="flex";
};
promoInputBox.querySelector(".confirm").onclick=()=>{
  if(promoText.value.trim()!==""){
    promoInputBox.style.display="none";
    promoResultBox.style.display="flex";
    promoResultText.textContent=promoText.value.trim();
  }
};
promoInputBox.querySelector(".cancel").onclick=()=>{
  promoInputBox.style.display="none";
  createBtn.style.display="block";
};
promoResultBox.querySelector(".cancel").onclick=()=>{
  promoResultBox.style.display="none";
  createBtn.style.display="block";
  promoText.value="";
};

// Кнопка поддержки
document.addEventListener("DOMContentLoaded", () => {
  const supportBtn = document.querySelector(".btn-support");
  if (supportBtn) {
    supportBtn.addEventListener("click", () => {
      window.location.href = "https://t.me/your_support_chat"; // твоя ссылка
    });
  }

  const promoBtn = document.querySelector(".btn-main");
  if (promoBtn) {
    promoBtn.addEventListener("click", () => {
      // тут можешь открыть окно ввода промокода или что-то ещё
      alert("Окно активации промокода в разработке 🙂");
    });
  }
});

// Функция расчёта оставшихся дней
function getDaysLeft(startDate, totalDays) {
  const start = new Date(startDate);
  const end = new Date(start);
  end.setDate(start.getDate() + totalDays); // дата окончания подписки
  const today = new Date();

  const diff = Math.ceil((end - today) / (1000 * 60 * 60 * 24));
  return diff > 0 ? diff : 0; // если уже истекло, возвращаем 0
}



// id текущего юзера (например, из Telegram WebApp)
const currentUserId = window.currentUserId;
//const BIN_URL_A = process.env.BIN_URL_A;
const BIN_URL = process.env.BIN_URL;
const API_KEY = process.env.API_KEY;
const BIN_URL_A = process.env.BIN_URL_A; // "https://api.jsonbin.io/v3/b/68910385f7e7a370d1f3c199/latest";

// твой bin URL (проверь, что он публичный или используй API-ключ)
//const BIN_URL = "https://api.jsonbin.io/v3/b/68a9a92043b1c97be9266774/latest";
//const API_KEY = "$2a$10$Dz1aHgMBI1fp1vjHgzv4KuScT5dgtyLfpRCxBszMOg6Zv/xOdJ0K6"; // если bin приватный

fetch(BIN_URL, {
  headers: {
    "X-Master-Key": API_KEY // убери эту строчку, если bin публичный
  }
})
  .then(res => res.json())
  .then(data => {
    const users = data.record.users;
    window.allUsers = users;// в jsonbin данные хранятся в `record`
    const user = users.find(u => u.id === currentUserId);

    if (user) {
      // Подставляем ключ
      // Подставляем ключ с иконкой копирования
      document.querySelector(".menu-item .fa-key").parentNode.innerHTML = `
        <span class="fa-solid fa-key"></span> 
        Ключ: <span id="userKey">${user.key}</span>
        <i id="copyKeyBtn" class="fa-solid fa-copy" style="cursor:pointer; margin-left:8px;"></i>
      `;

      // Считаем сколько осталось
      const buy1Left = getDaysLeft(user.buy1.start, user.buy1.days);
      const buy2Left = getDaysLeft(user.buy2.start, user.buy2.days);

      // Подставляем подписки
      document.querySelector(".fa-basket-shopping").parentNode.innerHTML =
        `<span class="fa-solid fa-basket-shopping"></span> Доступные подписки:<br>
         Polices Helper: ${buy1Left} дн<br>
         Leaders Helper: ${buy2Left} дн`;
    } else {
      console.error("Пользователь не найден");
    }
  })
  .catch(err => console.error("Ошибка загрузки JSON:", err));



// 2. Загружаем админов
fetch(BIN_URL_A, {
  headers: { "X-Master-Key": API_KEY }
})
  .then(res => res.json())
  .then(data => {
    const admins = data.record.admins;
    const admin = admins.find(a => a.id === currentUserId);
    window.currentAdmin = admin;

    if (admin && admin.level >= 3) {
      const bottomNav = document.querySelector(".bottom-nav");

      if (!document.querySelector(".nav-item[data-section='admin']")) {
        const adminTab = document.createElement("div");
        adminTab.className = "nav-item";
        adminTab.dataset.section = "admin";
        adminTab.innerHTML = `
          <i class="fa-solid fa-lock nav-icon"></i>
          <div class="nav-label">ADM</div>
        `;
        bottomNav.appendChild(adminTab);

        const adminSection = document.createElement("div");
        adminSection.id = "admin";
        adminSection.className = "section";
        adminSection.innerHTML = `
          <div class="admin-panel">
            <h2>Админ-панель</h2>
            <div class="admin-menu">
              <button class="admin-tab active" data-tab="users">Пользователи</button>
              <button class="admin-tab" data-tab="buyers">Покупатели</button>
              <button class="admin-tab" data-tab="bans">Блокировки</button>
              <button class="admin-tab" data-tab="logs">Логи</button>
            </div>
            <div id="adminContent" class="admin-content"></div>
          </div>
          
        `;
        bottomNav.insertAdjacentElement("beforebegin", adminSection);

        // вставляем секцию перед .bottom-nav
        bottomNav.insertAdjacentElement("beforebegin", adminSection);
      }
    }
  })
  .catch(err => console.error("Ошибка загрузки ADMINS JSON:", err));


// 3. Копирование ключа
document.addEventListener("click", (e) => {
  if (e.target && e.target.id === "copyKeyBtn") {
    const keyText = document.getElementById("userKey").textContent;
    navigator.clipboard.writeText(keyText).then(() => {
      e.target.classList.remove("fa-copy");
      e.target.classList.add("fa-check");
      setTimeout(() => {
        e.target.classList.remove("fa-check");
        e.target.classList.add("fa-copy");
      }, 1500);
    }).catch(err => console.error("Ошибка копирования:", err));
  }
});

function renderUsersList(users) {
  if (!users || users.length === 0) {
    return "<h3>Список пользователей</h3><p>Пользователей пока нет.</p>";
  }

  let html = `<h3>Список пользователей</h3>
    <div class="search-bar">
      <input type="text" id="searchInput" placeholder="Поиск..." 
        style="width:40%; padding:5px 8px; font-size:13px; border-radius:4px; 
        border:1px solid #444; background:#2b2b2b; color:#fff; outline:none;">
    </div>
  `;

  users.forEach((u, index) => {
    const buy1Left = getDaysLeft(u.buy1.start, u.buy1.days);
    const buy2Left = getDaysLeft(u.buy2.start, u.buy2.days);

    html += `
      <div class="user-card">
        <div class="user-header">
          ${index + 1} - @${u.login || "нет"}
          <i class="fa-solid fa-cog user-settings" data-id="${u.id}" style="float:right; cursor:pointer;"></i>
        </div>
        <div class="user-info">
          <p><strong>ID:</strong> ${u.id}</p>
          <p><strong>Ключ:</strong> <span class="user-key">${u.key}</span>
             </p>
          <p><strong><span class="fa-solid fa-basket-shopping"></span> Police Helper:</strong> ${buy1Left} дней</p>
          <p><strong><span class="fa-solid fa-basket-shopping"></span> Leader Helper:</strong> ${buy2Left} дней</p>
        </div>
      </div>
    `;
  });

  return html;
}

document.addEventListener("click", (e) => {
  if (e.target.classList.contains("admin-tab")) {
    document.querySelectorAll(".admin-tab").forEach(btn => btn.classList.remove("active"));
    e.target.classList.add("active");

    const tab = e.target.dataset.tab;
    const content = document.getElementById("adminContent");

    

    if (tab === "users") {
      content.innerHTML = renderUsersList(window.allUsers || []);

      const search = document.getElementById("searchInput");
      search.addEventListener("input", () => {
        const query = search.value.trim().toLowerCase();
        const filtered = (window.allUsers || []).filter(u => 
          u.id.toString().includes(query) || 
          (u.login && u.login.toLowerCase().includes(query))
        );
        content.innerHTML = renderUsersList(filtered);
        document.getElementById("searchInput").value = query;
      });

    } else if (tab === "buyers") {
      content.innerHTML = renderBuyersList(window.allUsers || []);

      const search = document.getElementById("searchInput");
      search.addEventListener("input", () => {
        const query = search.value.trim().toLowerCase();
        const filtered = (window.allUsers || []).filter(u => 
          (u.buy1?.days > 0 || u.buy2?.days > 0) &&
          (
            u.id.toString().includes(query) || 
            (u.login && u.login.toLowerCase().includes(query))
          )
        );
        content.innerHTML = renderBuyersList(filtered);
        document.getElementById("searchInput").value = query;
      });

    } else if (tab === "bans") {
      content.innerHTML = renderBansList(window.allUsers || []);

      const search = document.getElementById("searchInput");
      search.addEventListener("input", () => {
        const query = search.value.trim().toLowerCase();
        const filtered = (window.allUsers || []).filter(u => 
          u.ban?.status === true &&
          (
            u.id.toString().includes(query) || 
            (u.login && u.login.toLowerCase().includes(query))
          )
        );
        content.innerHTML = renderBansList(filtered);
        document.getElementById("searchInput").value = query;
      });

    } else if (tab === "logs") {
      content.innerHTML = "<h3>Загрузка логов...</h3>";

      loadLogsFromBin().then(logs => {
        content.innerHTML = renderLogs(logs);

        const search = document.getElementById("searchInput");
        search.addEventListener("input", () => {
          const query = search.value.trim().toLowerCase();
          const filtered = (logs || []).filter(log => 
            log.admin.toLowerCase().includes(query) ||
            log.action.toLowerCase().includes(query) ||
            log.time.toLowerCase().includes(query)
          );
          content.innerHTML = renderLogs(filtered);
          document.getElementById("searchInput").value = query;
        });
      });
    }
  }
});

let selectedUserId = null;
let selectedSection = null;

const modal = document.getElementById("modal");
const modalTitle = document.getElementById("modalTitle");
const modalBody = document.getElementById("modalBody");

// рендер кнопок в модалке
function renderModalButtons(section) {
  modalBody.innerHTML = "";

  if (section === "users") {
    modalBody.innerHTML = `
      <button class="modal-btn" id="giveDaysBtn"><span class="fa-solid fa-plus"></span> Выдать дни</button>
      <button class="modal-btn" id="removeDaysBtn"><span class="fa-solid fa-minus"></span> Убрать дни</button>
      <button class="modal-btn" id="copyIdBtn"><span class="fa-solid fa-clone"></span> Скопировать ID</button>
      <button class="modal-btn danger" id="banUserBtn"><span class="fa-solid fa-user-lock"></span> Заблокировать</button>
    `;
  } else if (section === "buyers") {
    modalBody.innerHTML = `
      <button class="modal-btn" id="giveDaysBtn"><span class="fa-solid fa-plus"></span> Выдать дни</button>
      <button class="modal-btn" id="removeDaysBtn"><span class="fa-solid fa-minus"></span> Убрать дни</button>
      <button class="modal-btn" id="copyIdBtn"><span class="fa-solid fa-clone"></span> Скопировать ID</button>
      <button class="modal-btn" id="resetHwidBtn"><span class="fa-solid fa-server"></span> Сбросить HWID</button>
      <button class="modal-btn danger" id="banUserBtn"><span class="fa-solid fa-user-lock"></span> Заблокировать</button>
    `;
  } else if (section === "bans") {
    modalBody.innerHTML = `
      <button class="modal-btn" id="removeDaysBtn"><span class="fa-solid fa-minus"></span> Убрать дни</button>
      <button class="modal-btn" id="copyIdBtn"><span class="fa-solid fa-clone"></span> Скопировать ID</button>
      <button class="modal-btn" id="unbanUserBtn"><span class="fa-solid fa-unlock"></span> Разблокировать</button>
      <button class="modal-btn danger" id="deleteUserBtn"><span class="fa-solid fa-database"></span> Удалить с БД</button>
    `;
  }

  attachModalEvents();
}

// подключаем действия к кнопкам
function attachModalEvents() {
  if (document.getElementById("giveDaysBtn")) {
    document.getElementById("giveDaysBtn").onclick = () => openGiveDaysFlow(selectedUserId);
  }
  if (document.getElementById("removeDaysBtn")) {
    document.getElementById("removeDaysBtn").onclick = () => openRemoveDaysFlow(selectedUserId);
  }
  if (document.getElementById("copyIdBtn")) {
    document.getElementById("copyIdBtn").onclick = () => copyUserId(selectedUserId);
  }
  if (document.getElementById("resetHwidBtn")) {
    document.getElementById("resetHwidBtn").onclick = () => resetUserHwid(selectedUserId);
  }
  if (document.getElementById("banUserBtn")) {
    document.getElementById("banUserBtn").onclick = () => openBanFlow(selectedUserId);
  }
  if (document.getElementById("unbanUserBtn")) {
    document.getElementById("unbanUserBtn").onclick = () => unbanUser(selectedUserId);
  }
  if (document.getElementById("deleteUserBtn")) {
    document.getElementById("deleteUserBtn").onclick = () => alert(`Удалить из БД ID: ${selectedUserId}`);
  }
}

// клик по шестерёнке
document.addEventListener("click", (e) => {
  if (e.target.classList.contains("user-settings")) {
    selectedUserId = e.target.dataset.id;

    const activeTab = document.querySelector(".admin-tab.active");
    selectedSection = activeTab ? activeTab.dataset.tab : "users";

    modalTitle.textContent = `Управление пользователем ID: ${selectedUserId}`;
    renderModalButtons(selectedSection);

    modal.style.display = "flex";
  }
});

// закрытие модалки
document.querySelector(".modal .close").addEventListener("click", () => {
  modal.style.display = "none";
});
window.addEventListener("click", (e) => {
  if (e.target === modal) modal.style.display = "none";
});

function renderBuyersList(users) {
  let html = `<h3>Активные покупатели:</h3>
    <div class="search-bar">
      <input type="text" id="searchInput" placeholder="Поиск..."
        style="width:40%; padding:5px 8px; font-size:13px; border-radius:4px;
        border:1px solid #444; background:#2b2b2b; color:#fff; outline:none;">
    </div>
  `;

  let buyers = users.filter(u => {
    const buy1Left = getDaysLeft(u.buy1.start, u.buy1.days);
    const buy2Left = getDaysLeft(u.buy2.start, u.buy2.days);
    return buy1Left > 0 || buy2Left > 0;
  });

  if (buyers.length === 0) {
    return "<p>Нет активных покупателей.</p>";
  }

  buyers.forEach((u, index) => {
    const buy1Left = getDaysLeft(u.buy1.start, u.buy1.days);
    const buy2Left = getDaysLeft(u.buy2.start, u.buy2.days);

    html += `
      <div class="user-card">
        <div class="user-header">
          ${index + 1} - @${u.login || "нет"}
          <i class="fa-solid fa-cog user-settings" data-id="${u.id}" style="cursor:pointer;"></i>
        </div>
        <div class="user-info">
          <p><strong>ID:</strong> ${u.id}</p>
          <p><strong>Ключ:</strong> <span class="user-key">${u.key}</span>
             </p>
          <p><strong><span class="fa-solid fa-basket-shopping"></span> Police Helper:</strong> ${buy1Left} дней</p>
          <p>INFO: ${u.buy1.start || "-"} | ${u.buy1.issuedBy || "-"}</p>
          <p><strong><span class="fa-solid fa-basket-shopping"></span> Leader Helper:</strong> ${buy2Left} дней</p>
          <p>INFO: ${u.buy2.start || "-"} | ${u.buy2.issuedBy || "-"}</p>
          
          <p><strong>HWID:</strong> ${u.hwid || "-"}</p>
          
        </div>
      </div>
    `;
  });

  return html;
}

function renderBansList(users) {
  let html = `<h3>Заблокированные пользователи:</h3>
  <div class="search-bar">
      <input type="text" id="searchInput" placeholder="Поиск..."
        style="width:40%; padding:5px 8px; font-size:13px; border-radius:4px;
        border:1px solid #444; background:#2b2b2b; color:#fff; outline:none;">
    </div>`;

  const banned = users.filter(u => u.ban && u.ban.status === true);

  if (banned.length === 0) {
    return "<h3>Нет заблокированных пользователей.</h3>";
  }

  banned.forEach(u => {
    let banDuration = "—";

    if (u.ban.until === null) {
      banDuration = "навсегда";
    } else if (!isNaN(u.ban.until)) {
      const endDate = new Date(Number(u.ban.until));
      const today = new Date();
      const diff = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24));
      banDuration = diff > 0 ? `${diff} дн` : "срок истёк";
    }

    let bannedBy = u.ban.by?.nickname 
    ? u.ban.by.nickname 
    : (u.ban.by?.login ? `@${u.ban.by.login}` : "неизвестно");

    html += `
      <div class="user-card" style="border-left: 4px solid #d9534f;">
      <i class="fa-solid fa-cog user-settings" data-id="${u.id}" style="float:right; cursor:pointer;"></i>
        <div class="user-header" style="color:#ff5555;">
           @${u.username || u.login || "нет"}
        </div>
        <div class="user-info">
          <p><strong>ID:</strong> ${u.id}</p>
          <p><strong>Причина:</strong> ${u.ban.reason || "—"}</p>
          <p><strong>Срок:</strong> ${banDuration}</p>
          <p><strong>Забанил:</strong> ${bannedBy}</p>
        </div>
      </div>
    `;
  });

  return html;
}


function openGiveDaysFlow(userId) {
  modalBody.innerHTML = `
    <h4>Выберите продукт:</h4>
    <button class="modal-btn" id="product1Btn">📦 Police Helper</button>
    <button class="modal-btn" id="product2Btn">📦 Leader Helper</button>
    <button class="modal-btn danger" id="cancelFlow">❌ Отмена</button>
  `;

  // Обработчики выбора
  document.getElementById("product1Btn").onclick = () => askDays(userId, "buy1", "Police Helper");
  document.getElementById("product2Btn").onclick = () => askDays(userId, "buy2", "Leader Helper");
  document.getElementById("cancelFlow").onclick = () => renderModalButtons(selectedSection);
}

function askDays(userId, productKey, productName) {
  modalBody.innerHTML = `
    <h4>Введите количество дней для ${productName}:</h4>
    <div class="promo-input" style="display:flex; align-items:center; justify-content:space-between; gap:10px;">
      <input type="number" id="daysInput" placeholder="Кол-во дней" style="flex:1; padding:6px; border-radius:6px; border:none;">
      <span class="promo-icon confirm" id="confirmDays" style="cursor:pointer;">✔</span>
      <span class="promo-icon cancel" id="cancelDays" style="cursor:pointer;">✖</span>
    </div>
  `;

  document.getElementById("confirmDays").onclick = () => {
    const days = parseInt(document.getElementById("daysInput").value);
    if (isNaN(days) || days <= 0) {
      alert("Введите корректное число дней");
      return;
    }

    const user = (window.allUsers || []).find(u => u.id == userId);
    if (user) {
      const daysLeft = getDaysLeft(user[productKey].start, user[productKey].days);
      const newTotal = daysLeft + days;

      user[productKey].days = newTotal;
      user[productKey].start = new Date().toISOString().split("T")[0];
      user[productKey].issuedBy = window.currentAdmin?.nickname || "unknown";

      alert(`Пользователю ${user.login || user.id} выдано +${days} дней (${productName}). Теперь ${newTotal} дней осталось. Выдал: ${user[productKey].issuedBy}`);
      addLog(`Выдал +${days} дней ${productName} пользователю ${user.login} | ${user.id}`);

      saveUsersToBin(window.allUsers);
    }

  document.getElementById("cancelDays").onclick = () => renderModalButtons(selectedSection);
}}

async function saveUsersToBin(users) {
  try {
    const res = await fetch("https://api.jsonbin.io/v3/b/68a9a92043b1c97be9266774", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "X-Master-Key": API_KEY // убери если bin публичный
      },
      body: JSON.stringify({ users }) // в JSONBin данные обёрнуты в record
    });

    if (!res.ok) {
      throw new Error("Ошибка сохранения: " + res.status);
    }

    const data = await res.json();
    console.log("✅ Данные сохранены:", data);
  } catch (err) {
    console.error("❌ Ошибка сохранения:", err);
  }
}

function openRemoveDaysFlow(userId) {
  modalBody.innerHTML = `
    <h4>Выберите продукт:</h4>
    <button class="modal-btn" id="product1Btn">📦 Police Helper</button>
    <button class="modal-btn" id="product2Btn">📦 Leader Helper</button>
    <button class="modal-btn danger" id="cancelFlow">❌ Отмена</button>
  `;

  document.getElementById("product1Btn").onclick = () => askRemoveDays(userId, "buy1", "Police Helper");
  document.getElementById("product2Btn").onclick = () => askRemoveDays(userId, "buy2", "Leader Helper");
  document.getElementById("cancelFlow").onclick = () => renderModalButtons(selectedSection);
}

function askRemoveDays(userId, productKey, productName) {
  modalBody.innerHTML = `
    <h4>Сколько дней убрать у ${productName}:</h4>
    <div class="promo-input" style="display:flex; align-items:center; justify-content:space-between; gap:10px;">
      <input type="number" id="daysInput" placeholder="Кол-во дней" style="flex:1; padding:6px; border-radius:6px; border:none;">
      <span class="promo-icon confirm" id="confirmDays" style="cursor:pointer;">✔</span>
      <span class="promo-icon cancel" id="cancelDays" style="cursor:pointer;">✖</span>
    </div>
  `;

  document.getElementById("confirmDays").onclick = () => {
    const days = parseInt(document.getElementById("daysInput").value);
    if (isNaN(days) || days <= 0) {
      alert("Введите корректное число дней");
      return;
    }

    const user = (window.allUsers || []).find(u => u.id == userId);
    if (user) {
      // сколько осталось прямо сейчас
      const daysLeft = getDaysLeft(user[productKey].start, user[productKey].days);

      // новые дни = остаток - убираемое
      let newTotal = daysLeft - days;
      if (newTotal < 0) newTotal = 0;

      // обновляем объект
      user[productKey].days = newTotal;
      user[productKey].start = new Date().toISOString().split("T")[0];
      user[productKey].issuedBy = window.currentAdmin?.nickname || "unknown";

      alert(`У пользователя ${user.login || user.id} убрано ${days} дней (${productName}). Теперь осталось ${newTotal} дней.`);
      addLog(`Убрал ${days} дней ${productName} у пользователя ${user.login} | ${user.id}`);

      saveUsersToBin(window.allUsers);
    }
    modal.style.display = "none";
  };

  document.getElementById("cancelDays").onclick = () => renderModalButtons(selectedSection);
}

function copyUserId(userId) {
  navigator.clipboard.writeText(userId.toString())
    .then(() => {
      // красивое уведомление
      alert(`ID ${userId} скопирован в буфер обмена ✅`);
    })
    .catch(err => {
      console.error("Ошибка копирования ID:", err);
      alert("Не удалось скопировать ID ❌");
    });
}

function resetUserHwid(userId) {
  const user = (window.allUsers || []).find(u => u.id == userId);
  if (!user) {
    alert("Пользователь не найден ❌");
    return;
  }

  // обнуляем HWID
  user.hwid = null;

  // сохраняем изменения
  saveUsersToBin(window.allUsers);

  alert(`HWID у пользователя ${user.login || user.id} успешно сброшен ✅`);
  addLog(`Сбросил HWID у пользователя ${user.login} | ${user.id}`);
}

function openBanFlow(userId) {
  modalBody.innerHTML = `
    <h4>Введите срок наказания (в днях, -1 = навсегда):</h4>
    <div class="promo-input" style="display:flex; gap:10px;">
      <input type="number" id="banDaysInput" placeholder="Кол-во дней" style="flex:1; padding:6px; border-radius:6px; border:none;">
      <span class="promo-icon confirm" id="confirmBanDays" style="cursor:pointer;">✔</span>
      <span class="promo-icon cancel" id="cancelBanDays" style="cursor:pointer;">✖</span>
    </div>
  `;

  document.getElementById("confirmBanDays").onclick = () => {
    const days = parseInt(document.getElementById("banDaysInput").value);
    if (isNaN(days)) {
      alert("Введите корректный срок (-1 = навсегда)");
      return;
    }
    askBanReason(userId, days);
  };

  document.getElementById("cancelBanDays").onclick = () => renderModalButtons(selectedSection);
}

function askBanReason(userId, days) {
  modalBody.innerHTML = `
    <h4>Укажите причину блокировки:</h4>
    <div class="promo-input" style="display:flex; gap:10px;">
      <input type="text" id="banReasonInput" placeholder="Причина" style="flex:1; padding:6px; border-radius:6px; border:none;">
      <span class="promo-icon confirm" id="confirmBanReason" style="cursor:pointer;">✔</span>
      <span class="promo-icon cancel" id="cancelBanReason" style="cursor:pointer;">✖</span>
    </div>
  `;

  document.getElementById("confirmBanReason").onclick = () => {
    const reason = document.getElementById("banReasonInput").value.trim();
    if (!reason) {
      alert("Укажите причину блокировки");
      return;
    }
    confirmBan(userId, days, reason);
  };

  document.getElementById("cancelBanReason").onclick = () => renderModalButtons(selectedSection);
}

function confirmBan(userId, days, reason) {
  modalBody.innerHTML = `
    <h4>Подтверждение блокировки</h4>
    <p><strong>ID:</strong> ${userId}</p>
    <p><strong>Срок:</strong> ${days === -1 ? "навсегда" : days + " дн."}</p>
    <p><strong>Причина:</strong> ${reason}</p>
    <button class="modal-btn danger" id="applyBanBtn">🚫 Выдать наказание</button>
    <button class="modal-btn" id="cancelFinalBan">❌ Отмена</button>
  `;

  document.getElementById("applyBanBtn").onclick = () => {
    const user = (window.allUsers || []).find(u => u.id == userId);
    if (!user) {
      alert("Пользователь не найден ❌");
      return;
    }

    // рассчитываем дату окончания
    let until = null;
    if (days > 0) {
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + days);
      until = endDate.getTime();
    }

    user.ban = {
      status: true,
      reason: reason,
      until: until, // null = навсегда
      by: {
        id: window.currentAdmin?.id || 0,
        nickname: window.currentAdmin?.nickname || "Неизвестный админ"
      }
    };

    saveUsersToBin(window.allUsers);

    alert(`Пользователь ${user.login || user.id} заблокирован (${days === 0 ? "навсегда" : days + " дн."}).`);
    addLog(`Заблокировал пользователя ${user.login} | ${user.id} на ${days === -1 ? "навсегда" : days + " дн."}. Причина: ${reason}`);

    modal.style.display = "none";
  };

  document.getElementById("cancelFinalBan").onclick = () => renderModalButtons(selectedSection);
}

function unbanUser(userId) {
  const user = (window.allUsers || []).find(u => u.id == userId);
  if (!user) {
    alert("Пользователь не найден ❌");
    return;
  }

  // подтверждение
  if (!confirm(`Вы уверены, что хотите разблокировать ${user.login || user.id}?`)) {
    return;
  }

  // вариант 1: полностью удаляем ban
  delete user.ban;

  // вариант 2: если хочешь оставить объект, но снять блокировку:
  // user.ban = { status: false };

  saveUsersToBin(window.allUsers);

  alert(`✅ Пользователь ${user.login || user.id} успешно разблокирован`);
  addLog(`Разблокировал пользователя ${user.login} | ${user.id}`);
  modal.style.display = "none";
}

function addLog(action) {
  const now = new Date();
  const time = now.toLocaleString("ru-RU", { hour12: false });

  const logEntry = {
    time,
    admin: window.currentAdmin?.nickname || "Неизвестный админ",
    action
  };

  if (!window.allLogs) window.allLogs = [];
  window.allLogs.unshift(logEntry); // новые сверху

  saveLogsToBin(window.allLogs);
}
async function loadLogsFromBin() {
  try {
    const res = await fetch("https://api.jsonbin.io/v3/b/68821839ae596e708fbafe08/latest", {
      method: "GET",
      headers: { "X-Master-Key": API_KEY }
    });

    if (!res.ok) throw new Error("Ошибка загрузки: " + res.status);

    const data = await res.json();
    console.log("Ответ JSONBin:", data);

    window.allLogs = data.record.logs || []; // ⬅ достаем из объекта
    return window.allLogs;
  } catch (err) {
    console.error("❌ Ошибка загрузки логов:", err);
    return [];
  }
}

async function saveLogsToBin(logs) {
  try {
    const res = await fetch(`https://api.jsonbin.io/v3/b/68821839ae596e708fbafe08`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "X-Master-Key": API_KEY
      },
      body: JSON.stringify({ logs }) // ⬅ оборачиваем в объект
    });

    if (!res.ok) {
      throw new Error("Ошибка сохранения: " + res.status);
    }

    const data = await res.json();
    console.log("✅ Логи сохранены:", data);
  } catch (err) {
    console.error("❌ Ошибка сохранения логов:", err);
  }
}

function renderLogs(logs) {
  if (!Array.isArray(logs) || logs.length === 0) {
    return "<h3>Логов пока нет.</h3>";
  }

  let html = `<h3>История действий:</h3>
    <div class="search-bar">
      <input type="text" id="searchInput" placeholder="Поиск..." 
        style="width:40%; padding:5px 8px; font-size:13px; border-radius:4px; 
        border:1px solid #444; background:#2b2b2b; color:#fff; outline:none;">
    </div>
  `;

  logs.forEach(log => {
    html += `
      <div class="user-card" style="border-left:4px solid #2196f3;">
        <div class="user-header" style="color:#4cafef;">${log.admin}</div>
        <div class="user-info">
          <p><strong>Время:</strong> ${log.time}</p>
          <p><strong>Действие:</strong> ${log.action}</p>
        </div>
      </div>
    `;
  });
  return html;
}