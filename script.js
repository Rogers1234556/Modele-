const data = [
  { title: "Polices Helper", desc: "Игровой помощник для МВД / ФСБ", price: "250⭐️", img: "img/logo.jpeg", thumb: "img/logo.jpeg" },
  { title: "Leaders Helper", desc: "Игровой помощник для лидеров", price: "250⭐️", img: "img/logo.jpeg", thumb: "img/logo.jpeg" },
  { title: "RADMIR Helper", desc: "Игровой помощник", price: "250⭐️", img: "img/logo.jpeg", thumb: "img/logo.jpeg" }
];

const slidesEl = document.getElementById('slides');
const thumbsEl = document.getElementById('thumbs');
const dotsEl = document.getElementById('dots');
let current = 0;

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
            <button class="btn-order" onclick="openBot()">КУПИТЬ</button>
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

function show(index){
  if(index<0) index=data.length-1;
  if(index>=data.length) index=0;
  current=index;
  slidesEl.querySelectorAll('.slide').forEach((s,i)=> s.classList.toggle('active',i===index));
  thumbsEl.querySelectorAll('.thumb').forEach((t,i)=> t.classList.toggle('active',i===index));
  dotsEl.querySelectorAll('.dot').forEach((d,i)=> d.classList.toggle('active',i===index));
}

function attachEvents(){
  thumbsEl.querySelectorAll('.thumb').forEach(t=>{
    t.onclick=()=>show(+t.dataset.index);
  });
  dotsEl.querySelectorAll('.dot').forEach(d=>{
    d.onclick=()=>show(+d.dataset.index);
  });
}
render();

document.querySelector(".bottom-nav").addEventListener("click", (e) => {
  const item = e.target.closest(".nav-item");
  if (!item) return;

  document.querySelectorAll(".nav-item").forEach(i => i.classList.remove("active"));
  document.querySelectorAll(".section").forEach(s => s.classList.remove("active"));

  item.classList.add("active");
  document.getElementById(item.dataset.section).classList.add("active");
});

document.addEventListener("DOMContentLoaded", () => {
  const supportBtn = document.querySelector(".btn-support");
  if (supportBtn) {
    supportBtn.addEventListener("click", () => {
      window.location.href = "https://t.me/SR_Helper_RadmirRP_Bot";
    });
  }

});

function getDaysLeft(startDate, totalDays) {
  const start = new Date(startDate);
  const end = new Date(start);
  end.setDate(start.getDate() + totalDays); 
  const today = new Date();

  const diff = Math.ceil((end - today) / (1000 * 60 * 60 * 24));
  return diff > 0 ? diff : 0; 
}

document.querySelectorAll(".info-tab").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".info-tab").forEach(b => b.classList.remove("active"));
    document.querySelectorAll(".info-box").forEach(box => box.classList.remove("active"));

    btn.classList.add("active");
    document.getElementById(btn.dataset.target).classList.add("active");
  });
});

const currentUserId = 6700728917;//window.currentUserId;

const BIN_URL_A = "https://api.jsonbin.io/v3/b/68910385f7e7a370d1f3c199/latest";

const BIN_URL = "https://api.jsonbin.io/v3/b/68a9a92043b1c97be9266774/latest";
const API_KEY = "$2a$10$Dz1aHgMBI1fp1vjHgzv4KuScT5dgtyLfpRCxBszMOg6Zv/xOdJ0K6"; 

fetch(BIN_URL, {
  headers: {
    "X-Master-Key": API_KEY 
  }
})
  .then(res => res.json())
  .then(data => {
    const users = data.record.users;
    window.allUsers = users;
    const user = users.find(u => u.id === currentUserId);

    if (user) {
      
      document.querySelector(".menu-item .fa-key").parentNode.innerHTML = `
        <span class="fa-solid fa-key"></span> 
        Ключ: <span id="userKey">${user.key}</span>
        <i id="copyKeyBtn" class="fa-solid fa-copy" style="cursor:pointer; margin-left:8px;"></i>
      `;

      const buy1Left = getDaysLeft(user.buy1.start, user.buy1.days);
      const buy2Left = getDaysLeft(user.buy2.start, user.buy2.days);

      
      document.querySelector(".fa-basket-shopping").parentNode.innerHTML =
        `<span class="fa-solid fa-basket-shopping"></span> Доступные подписки:<br>
         Polices Helper: ${buy1Left} дн<br>
         Leaders Helper: ${buy2Left} дн`;
    } else {
      console.error("Пользователь не найден");
    }
  })
  .catch(err => console.error("Ошибка загрузки JSON:", err));


fetch(BIN_URL_A, {
  headers: { "X-Master-Key": API_KEY }
})
  .then(res => res.json())
  .then(data => {
    const admins = data.record.admins;
    window.currentAdminList = admins; 
    const admin = admins.find(a => a.id === currentUserId);
    window.currentAdmin = admin;
    showAdminButtons();

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
              <button class="admin-tab" data-tab="admins">Админы</button>
            </div>
            <div id="adminContent" class="admin-content"></div>
          </div>
          
        `;
        bottomNav.insertAdjacentElement("beforebegin", adminSection);
        bottomNav.insertAdjacentElement("beforebegin", adminSection);
      }
    }
  })
  .catch(err => console.error("Ошибка загрузки ADMINS JSON:", err));



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

    } else if (tab === "admins") {
      content.innerHTML = renderAdminsList(window.currentAdminList || []);

      const search = document.getElementById("searchInput");
      search.addEventListener("input", () => {
        const query = search.value.trim().toLowerCase();
        const filtered = (window.currentAdminList || []).filter(a =>
          a.id.toString().includes(query) ||
          (a.username && a.username.toLowerCase().includes(query)) ||
          (a.nickname && a.nickname.toLowerCase().includes(query)) ||
          (a.level && a.level.toString().includes(query))
        );
        content.innerHTML = renderAdminsList(filtered);
        document.getElementById("searchInput").value = query;
      });
    }
  }
});

let selectedUserId = null;
let selectedSection = null;

const modal = document.getElementById("modal");
const modalTitle = document.getElementById("modalTitle");
const modalBody = document.getElementById("modalBody");

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
      <button class="modal-btn" id="giveAdminBtn"><span class="fa-solid fa-user-shield"></span> Выдать админку</button>
      <button class="modal-btn danger" id="banUserBtn"><span class="fa-solid fa-user-lock"></span> Заблокировать</button>
    `;
  } else if (section === "bans") {
    modalBody.innerHTML = `
      <button class="modal-btn" id="removeDaysBtn"><span class="fa-solid fa-minus"></span> Убрать дни</button>
      <button class="modal-btn" id="copyIdBtn"><span class="fa-solid fa-clone"></span> Скопировать ID</button>
      <button class="modal-btn" id="unbanUserBtn"><span class="fa-solid fa-unlock"></span> Разблокировать</button>
      <button class="modal-btn danger" id="deleteUserBtn"><span class="fa-solid fa-database"></span> Удалить с БД</button>
    `;
    } else if (section === "admins") {
      modalBody.innerHTML = `
        <button class="modal-btn" id="copyIdBtn"><span class="fa-solid fa-clone"></span> Скопировать ID</button>
        <button class="modal-btn" id="editLevelBtn"><span class="fa-solid fa-arrow-up"></span> Изменить уровень</button>
        <button class="modal-btn danger" id="removeAdminBtn"><span class="fa-solid fa-user-xmark"></span> Забрать админку</button>
      `;
  }

  attachModalEvents();
}

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
  if (document.getElementById("giveAdminBtn")) {
    document.getElementById("giveAdminBtn").onclick = () => startGiveAdminFlow(selectedUserId);
  }
  if (document.getElementById("removeAdminBtn")) {
    document.getElementById("removeAdminBtn").onclick = () => removeAdmin(selectedUserId);
  }
  if (document.getElementById("editLevelBtn")) {
    document.getElementById("editLevelBtn").onclick = () => changeAdminLevel(selectedUserId);
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
    <button class="modal-btn" id="product1Btn">Police Helper</button>
    <button class="modal-btn" id="product2Btn">Leader Helper</button>
    <button class="modal-btn danger" id="cancelFlow">Отмена</button>
  `;
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
        "X-Master-Key": API_KEY 
      },
      body: JSON.stringify({ users })
    });

    if (!res.ok) {
      throw new Error("Ошибка сохранения: " + res.status);
    }

    const data = await res.json();
    console.log("Данные сохранены:", data);
  } catch (err) {
    console.error("Ошибка сохранения:", err);
  }
}

function openRemoveDaysFlow(userId) {
  modalBody.innerHTML = `
    <h4>Выберите продукт:</h4>
    <button class="modal-btn" id="product1Btn">Police Helper</button>
    <button class="modal-btn" id="product2Btn">Leader Helper</button>
    <button class="modal-btn danger" id="cancelFlow">Отмена</button>
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
      
      const daysLeft = getDaysLeft(user[productKey].start, user[productKey].days);

      
      let newTotal = daysLeft - days;
      if (newTotal < 0) newTotal = 0;

      
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
      
      alert(`ID ${userId} скопирован в буфер обмена`);
    })
    .catch(err => {
      console.error("Ошибка копирования ID:", err);
      alert("Не удалось скопировать ID ");
    });
}

function resetUserHwid(userId) {
  const user = (window.allUsers || []).find(u => u.id == userId);
  if (!user) {
    alert("Пользователь не найден ");
    return;
  }

  
  user.hwid = null;

  
  saveUsersToBin(window.allUsers);

  alert(`HWID у пользователя ${user.login || user.id} успешно сброшен`);
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
    <button class="modal-btn danger" id="applyBanBtn">Выдать наказание</button>
    <button class="modal-btn" id="cancelFinalBan">Отмена</button>
  `;

  document.getElementById("applyBanBtn").onclick = () => {
    const user = (window.allUsers || []).find(u => u.id == userId);
    if (!user) {
      alert("Пользователь не найден ");
      return;
    }

    
    let until = null;
    if (days > 0) {
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + days);
      until = endDate.getTime();
    }

    user.ban = {
      status: true,
      reason: reason,
      until: until, 
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
    alert("Пользователь не найден");
    return;
  }

  
  if (!confirm(`Вы уверены, что хотите разблокировать ${user.login || user.id}?`)) {
    return;
  }

  
  delete user.ban;


  saveUsersToBin(window.allUsers);

  alert(` Пользователь ${user.login || user.id} успешно разблокирован`);
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
  window.allLogs.unshift(logEntry); 

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

    window.allLogs = data.record.logs || []; 
    return window.allLogs;
  } catch (err) {
    console.error(" Ошибка загрузки логов:", err);
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
      body: JSON.stringify({ logs }) 
    });

    if (!res.ok) {
      throw new Error("Ошибка сохранения: " + res.status);
    }

    const data = await res.json();
    console.log(" Логи сохранены:", data);
  } catch (err) {
    console.error(" Ошибка сохранения логов:", err);
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

function renderAdminsList(admins) {
  if (!admins || admins.length === 0) {
    return "<p>Список админов пуст.</p>";
  }

  const sorted = admins.slice().sort((a, b) => b.level - a.level);

  let html = `<h3>Администраторы:</h3>
    <div class="search-bar">
      <input type="text" id="searchInput" placeholder="Поиск..."
        style="width:40%; padding:5px 8px; font-size:13px; border-radius:4px;
        border:1px solid #444; background:#2b2b2b; color:#fff; outline:none;">
    </div>
  `;

  sorted.forEach((a, index) => {
    html += `
      <div class="user-card">
        <div class="user-header">
          ${index + 1} - ${a.nickname || "Без имени"}
          <i class="fa-solid fa-cog user-settings" data-id="${a.id}" style="cursor:pointer;"></i>
        </div>
        <div class="user-info">
          <p><strong>ID:</strong> ${a.id}</p>
          <p><strong>LEVEL:</strong> ${a.level}</p>
        </div>
      </div>
    `;
  });

  return html;
}




// === Онлайн Radmir RP ===

const onlineBtn = document.getElementById('radmirOnlineBtn');
const onlineModal = document.getElementById('onlineModal');
const closeOnline = document.getElementById('closeOnlineModal');
const serversList = document.getElementById('serversList');

if (onlineBtn) {
  

  onlineBtn.addEventListener('click', async () => {
    onlineModal.style.display = 'flex';
    serversList.innerHTML = '<p>🔄 Загружаем данные...</p>';

    try {
      // Используем прокси, чтобы обойти CORS
      const proxyUrl = 'https://api.allorigins.win/get?url=';
      const targetUrl = 'http://launcher.hassle-games.com:3000/online.json';
      const res = await fetch(proxyUrl + encodeURIComponent(targetUrl));
      if (!res.ok) throw new Error('Ошибка соединения с сервером');

      const raw = await res.json();
      const data = JSON.parse(raw.contents);
      const crmp = data.crmp_new;

      if (!crmp) {
        serversList.innerHTML = `
          <div class="error-message">❌ Не удалось получить данные CRMP.</div>`;
        return;
      }

      let html = `<div class="server-item total-online">Суммарный онлайн: `;
      let total = 0;
      let serversHtml = '';

      for (const [id, srv] of Object.entries(crmp)) {
        const players = srv.players || 0;
        const max = srv.maxPlayers || 0;
        const bonus = srv.bonus || 1;
        total += players;

        serversHtml += `
          <div class="server-item">
            <div class="server-name">Сервер ${id}</div>
            <div class="server-online">${players} / ${max}</div>
            <div class="server-bonus">Бонус: x${bonus}</div>
          </div>`;
      }

      html += `<b>${total}</b></div>${serversHtml}`;
      serversList.innerHTML = html;
    } catch (e) {
      console.error(e);
      serversList.innerHTML = `
        <div class="error-message">
          ⚠️ Ошибка загрузки данных.<br>
          Проверьте подключение к интернету или попробуйте позже.
        </div>`;
    }
  });

  closeOnline.addEventListener('click', () => {
    onlineModal.style.display = 'none';
  });

  window.addEventListener('click', (e) => {
    if (e.target === onlineModal) {
      onlineModal.style.display = 'none';
    }
  });
}

function showAdminButtons() {
  const launcherBtn = document.querySelector(".btn-launcher");
  const onlineBtn = document.querySelector(".btn-online");

  // Сначала скрываем обе кнопки
  if (launcherBtn) launcherBtn.style.display = "none";
  if (onlineBtn) onlineBtn.style.display = "none";

  // Показываем только если админ и уровень >= 1
  if (window.currentAdmin && window.currentAdmin.level >= 1) {
    if (launcherBtn) launcherBtn.style.display = "block";
    if (onlineBtn) onlineBtn.style.display = "block";
  }
}

// === ВЫДАТЬ АДМИНКУ ===
function startGiveAdminFlow(userId) {
  modalBody.innerHTML = `
    <h4>Укажите уровень админки (1–5):</h4>
    <input type="number" id="adminLevelInput" min="1" max="5" placeholder="1-5" style="width:100%;padding:6px;border:none;border-radius:5px;margin-bottom:10px;">
    <button class="modal-btn" id="nextStepAdmin">Далее</button>
    <button class="modal-btn danger" id="cancelAdminFlow">Отмена</button>
  `;
  document.getElementById("nextStepAdmin").onclick = () => {
    const level = parseInt(document.getElementById("adminLevelInput").value);
    if (isNaN(level) || level < 1 || level > 5) {
      alert("Введите корректный уровень (1–5)");
      return;
    }
    askAdminNickname(userId, level);
  };
  document.getElementById("cancelAdminFlow").onclick = () => renderModalButtons(selectedSection);
}

function askAdminNickname(userId, level) {
  modalBody.innerHTML = `
    <h4>Введите ник для нового админа:</h4>
    <input type="text" id="adminNickInput" placeholder="Никнейм" style="width:100%;padding:6px;border:none;border-radius:5px;margin-bottom:10px;">
    <button class="modal-btn" id="confirmAdminBtn">Подтвердить</button>
    <button class="modal-btn danger" id="cancelAdminFlow">Отмена</button>
  `;

  document.getElementById("confirmAdminBtn").onclick = () => {
    const nickname = document.getElementById("adminNickInput").value.trim();
    if (!nickname) {
      alert("Введите никнейм");
      return;
    }
    confirmGiveAdmin(userId, level, nickname);
  };
  document.getElementById("cancelAdminFlow").onclick = () => renderModalButtons(selectedSection);
}

function confirmGiveAdmin(userId, level, nickname) {
  modalBody.innerHTML = `
    <h4>Подтверждение</h4>
    <p>ID: ${userId}</p>
    <p>Уровень: ${level}</p>
    <p>Ник: ${nickname}</p>
    <button class="modal-btn" id="applyGiveAdmin">✅ Выдать админку</button>
    <button class="modal-btn danger" id="cancelAdminFlow">Отмена</button>
  `;

  document.getElementById("applyGiveAdmin").onclick = async () => {
    const newAdmin = { id: Number(userId), level, nickname };
    const admins = window.currentAdminList || [];
    if (admins.some(a => a.id === newAdmin.id)) {
      alert("Этот пользователь уже является админом.");
      return;
    }
    admins.push(newAdmin);
    await saveAdminsToBin(admins);
    addLog(`Выдал админку (уровень ${level}) пользователю ${nickname} | ${userId}`);
    alert("Админ успешно добавлен.");
    modal.style.display = "none";
  };
  document.getElementById("cancelAdminFlow").onclick = () => renderModalButtons(selectedSection);
}

// === ИЗМЕНИТЬ УРОВЕНЬ ===
function changeAdminLevel(adminId) {
  modalBody.innerHTML = `
    <h4>Введите новый уровень (1–5):</h4>
    <input type="number" id="newAdminLevel" min="1" max="5" placeholder="1-5" style="width:100%;padding:6px;border:none;border-radius:5px;margin-bottom:10px;">
    <button class="modal-btn" id="applyLevelChange">Сохранить</button>
    <button class="modal-btn danger" id="cancelLevelChange">Отмена</button>
  `;
  document.getElementById("applyLevelChange").onclick = async () => {
    const newLevel = parseInt(document.getElementById("newAdminLevel").value);
    if (isNaN(newLevel) || newLevel < 1 || newLevel > 5) {
      alert("Укажите корректный уровень (1–5)");
      return;
    }
    const admins = window.currentAdminList || [];
    const admin = admins.find(a => a.id == adminId);
    if (!admin) return alert("Админ не найден.");
    admin.level = newLevel;
    await saveAdminsToBin(admins);
    addLog(`Изменил уровень админа ${admin.nickname} | ${adminId} на ${newLevel}`);
    alert("Уровень успешно изменён.");
    modal.style.display = "none";
  };
  document.getElementById("cancelLevelChange").onclick = () => renderModalButtons(selectedSection);
}

// === УДАЛИТЬ АДМИНА ===
function removeAdmin(adminId) {
  if (!confirm("Точно забрать админку?")) return;
  const admins = window.currentAdminList || [];
  const index = admins.findIndex(a => a.id == adminId);
  if (index === -1) return alert("Админ не найден.");
  const removed = admins.splice(index, 1)[0];
  saveAdminsToBin(admins);
  addLog(`Забрал админку у ${removed.nickname} | ${adminId}`);
  alert("Админка успешно забрана.");
  modal.style.display = "none";
}

// === СОХРАНЕНИЕ СПИСКА АДМИНОВ ===
async function saveAdminsToBin(admins) {
  try {
    // 1️⃣ Загружаем текущее содержимое JSONBin
    const getRes = await fetch("https://api.jsonbin.io/v3/b/68910385f7e7a370d1f3c199/latest", {
      headers: {
        "X-Master-Key": API_KEY
      }
    });
    if (!getRes.ok) throw new Error("Ошибка загрузки bin: " + getRes.status);
    const currentData = await getRes.json();

    // 2️⃣ Берем старые данные, чтобы не стереть logs, users и т.п.
    const old = currentData.record || {};

    // 3️⃣ Обновляем только раздел admins
    const updated = {
      ...old,
      admins: admins
    };

    // 4️⃣ Сохраняем обратно
    const putRes = await fetch("https://api.jsonbin.io/v3/b/68910385f7e7a370d1f3c199", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "X-Master-Key": API_KEY
      },
      body: JSON.stringify(updated)
    });

    if (!putRes.ok) throw new Error("Ошибка сохранения: " + putRes.status);

    const data = await putRes.json();
    console.log("✅ Админы сохранены (данные не затирались):", data);
    window.currentAdminList = admins;

  } catch (err) {
    console.error("Ошибка сохранения админов:", err);
    alert("Ошибка при сохранении админов.");
  }
}

function openBot() {
  const botUrl = "https://t.me/SR_Helper_RadmirRP_Bot"; // 👈 замени на своего бота

  if (window.Telegram && Telegram.WebApp) {
    Telegram.WebApp.openTelegramLink(botUrl);
  } else {
    window.open(botUrl, "_blank");
  }
}


async function initUser() {
  try {
    // 🧠 Получаем Telegram-пользователя
    const tg = window.Telegram.WebApp;
    const user = tg.initDataUnsafe.user;

    if (!user) return;

    const userId = user.id;
    const username = user.username || "unknown";

    // 1️⃣ Загружаем текущее содержимое JSONBin
    const res = await fetch(`${BIN_URL}/latest`);
    const json = await res.json();
    const record = json.record || {};

    if (!record.users) record.users = [];

    // 2️⃣ Проверяем — есть ли пользователь с таким ID
    const existingUser = record.users.find(u => u.id === userId);

    if (existingUser) {
      console.log("✅ Пользователь уже есть:", existingUser.login);
      return;
    }

    // 3️⃣ Если нет — создаём новую запись
    const newUser = {
      id: userId,
      login: username,
      key: generateKey(12), // создадим ниже
      hwid: null,
      buy1: { days: 0, start: null, issuedBy: null },
      buy2: { days: 0, start: null },
      ban: { status: false, reason: "", until: null }
    };

    record.users.push(newUser);

    // 4️⃣ Сохраняем обновлённый список
    await fetch(BIN_URL, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...(API_KEY ? { "X-Master-Key": API_KEY } : {})
      },
      body: JSON.stringify(record)
    });

    console.log("🆕 Новый пользователь добавлен:", newUser);

  } catch (err) {
    console.error("Ошибка инициализации пользователя:", err);
  }
}

// Генератор ключа (как у тебя в примерах)
function generateKey(length = 10) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let key = "";
  for (let i = 0; i < length; i++) {
    key += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return key;
}

// Запускаем после загрузки
window.addEventListener("DOMContentLoaded", initUser);