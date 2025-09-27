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

const BIN_URL_A = "https://api.jsonbin.io/v3/b/68910385f7e7a370d1f3c199/latest";

// твой bin URL (проверь, что он публичный или используй API-ключ)
const BIN_URL = "https://api.jsonbin.io/v3/b/68a9a92043b1c97be9266774/latest";
const API_KEY = "$2a$10$Dz1aHgMBI1fp1vjHgzv4KuScT5dgtyLfpRCxBszMOg6Zv/xOdJ0K6"; // если bin приватный

fetch(BIN_URL, {
  headers: {
    "X-Master-Key": API_KEY // убери эту строчку, если bin публичный
  }
})
  .then(res => res.json())
  .then(data => {
    const users = data.record.users; // в jsonbin данные хранятся в `record`
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
            <p>Добро пожаловать, ${admin.nickname} (уровень: ${admin.level})</p>
          </div>
        `;

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