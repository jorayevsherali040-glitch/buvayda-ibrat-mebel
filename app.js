import { db } from "./firebase-config.js";
import {
  collection,
  onSnapshot,
  query,
  orderBy
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

const menuButton = document.getElementById("menuButton");
const mainNav = document.getElementById("mainNav");
menuButton?.addEventListener("click", () => mainNav.classList.toggle("open"));
mainNav?.querySelectorAll("a").forEach(link => link.addEventListener("click", () => mainNav.classList.remove("open")));

const catalogGrid = document.getElementById("catalogGrid");
const catalogSearch = document.getElementById("catalogSearch");
const catalogCategory = document.getElementById("catalogCategory");
let products = [];

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function renderCategories() {
  const selected = catalogCategory.value;
  const categories = [...new Set(products.map(item => item.category).filter(Boolean))].sort();
  catalogCategory.innerHTML =
    '<option value="">Barcha kategoriyalar</option>' +
    categories.map(category => `<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`).join("");
  if (categories.includes(selected)) catalogCategory.value = selected;
}

function renderCatalog() {
  const search = catalogSearch.value.trim().toLowerCase();
  const category = catalogCategory.value;

  const filtered = products.filter(product => {
    const matchesSearch =
      !search ||
      String(product.name || "").toLowerCase().includes(search) ||
      String(product.description || "").toLowerCase().includes(search);
    const matchesCategory = !category || product.category === category;
    return matchesSearch && matchesCategory;
  });

  if (!filtered.length) {
    catalogGrid.innerHTML = '<div class="empty-state">Hozircha mos mahsulot topilmadi.</div>';
    return;
  }

  catalogGrid.innerHTML = filtered.map(product => {
    const image = product.image || "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=900&q=80";
    const telegramText = encodeURIComponent(`Assalomu alaykum. ${product.name || "Mahsulot"} haqida ma’lumot olmoqchiman.`);
    return `
      <article class="product-card">
        <img src="${escapeHtml(image)}" alt="${escapeHtml(product.name)}"
             onerror="this.src='https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=900&q=80'">
        <div class="product-body">
          <span class="category-badge">${escapeHtml(product.category || "Boshqa")}</span>
          <h3>${escapeHtml(product.name)}</h3>
          <p>${escapeHtml(product.description || "Mahsulot haqida qo‘shimcha ma’lumot olish uchun Telegram orqali yozing.")}</p>
          <div class="product-price">${escapeHtml(product.price)}</div>
          <a class="button button-gold" target="_blank" rel="noopener"
             href="https://t.me/ibratmebel8909?text=${telegramText}">Buyurtma berish</a>
        </div>
      </article>`;
  }).join("");
}

catalogSearch.addEventListener("input", renderCatalog);
catalogCategory.addEventListener("change", renderCatalog);

const productsQuery = query(collection(db, "products"), orderBy("createdAt", "desc"));
onSnapshot(productsQuery, snapshot => {
  products = snapshot.docs.map(item => ({ id: item.id, ...item.data() }));
  renderCategories();
  renderCatalog();
}, error => {
  console.error(error);
  catalogGrid.innerHTML = '<div class="empty-state">Mahsulotlarni yuklashda xatolik. Firestore Rules sozlamasini tekshiring.</div>';
});

document.getElementById("buyurtma").addEventListener("submit", event => {
  event.preventDefault();
  const name = document.getElementById("customerName").value.trim();
  const phone = document.getElementById("customerPhone").value.trim();
  const service = document.getElementById("customerService").value;
  const message = document.getElementById("customerMessage").value.trim();

  const text = encodeURIComponent(
    `Assalomu alaykum, BUVAYDA IBRAT MEBEL!\n\nIsm: ${name}\nTelefon: ${phone}\nXizmat: ${service}\nIzoh: ${message}`
  );
  window.open(`https://t.me/ibratmebel8909?text=${text}`, "_blank", "noopener");
});
