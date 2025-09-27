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
const navItems = document.querySelectorAll('.nav-item[data-section]');
const sections = document.querySelectorAll('.section');
navItems.forEach(item=>{
  item.addEventListener('click',()=>{
    navItems.forEach(i=>i.classList.remove('active'));
    sections.forEach(s=>s.classList.remove('active'));
    item.classList.add('active');
    document.getElementById(item.dataset.section).classList.add('active');
  });
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