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
const catalogCount = document.getElementById("catalogCount");
const favoritesCount = document.getElementById("favoritesCount");
const cartCount = document.getElementById("cartCount");
const productModal = document.getElementById("productModal");
const productModalContent = document.getElementById("productModalContent");
const listModal = document.getElementById("listModal");
const listModalContent = document.getElementById("listModalContent");

let products = [];
let favorites = JSON.parse(localStorage.getItem("ibratFavorites") || "[]");
let cart = JSON.parse(localStorage.getItem("ibratCart") || "[]");

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;").replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;").replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function saveLocal() {
  localStorage.setItem("ibratFavorites", JSON.stringify(favorites));
  localStorage.setItem("ibratCart", JSON.stringify(cart));
  favoritesCount.textContent = favorites.length;
  cartCount.textContent = cart.length;
}

function renderCategories() {
  const selected = catalogCategory.value;
  const categories = [...new Set(products.map(item => item.category).filter(Boolean))].sort();
  catalogCategory.innerHTML = '<option value="">Barcha kategoriyalar</option>' +
    categories.map(category => `<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`).join("");
  if (categories.includes(selected)) catalogCategory.value = selected;
}

function productImage(product) {
  return product.image || "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=900&q=80";
}

function renderCatalog() {
  const search = catalogSearch.value.trim().toLowerCase();
  const category = catalogCategory.value;

  const filtered = products.filter(product => {
    const matchesSearch = !search ||
      String(product.name || "").toLowerCase().includes(search) ||
      String(product.description || "").toLowerCase().includes(search);
    return matchesSearch && (!category || product.category === category);
  });

  catalogCount.textContent = `${filtered.length} ta mahsulot`;

  if (!filtered.length) {
    catalogGrid.innerHTML = '<div class="empty-state">Hozircha mos mahsulot topilmadi.</div>';
    return;
  }

  catalogGrid.innerHTML = filtered.map(product => {
    const isFav = favorites.includes(product.id);
    const sold = product.soldOut || Number(product.stock) === 0;
    const telegramText = encodeURIComponent(`Assalomu alaykum. ${product.name || "Mahsulot"} haqida ma’lumot olmoqchiman.`);
    return `
      <article class="product-card ${sold ? "sold-card" : ""}">
        <div class="product-image-wrap">
          <img src="${escapeHtml(productImage(product))}" alt="${escapeHtml(product.name)}">
          ${product.featured ? '<span class="featured-badge">TOP</span>' : ''}
          ${sold ? '<span class="sold-badge">SOTILDI</span>' : ''}
          <button class="heart-button ${isFav ? "active" : ""}" data-favorite="${product.id}" type="button">♥</button>
        </div>
        <div class="product-body">
          <span class="category-badge">${escapeHtml(product.category || "Boshqa")}</span>
          <h3>${escapeHtml(product.name)}</h3>
          <p>${escapeHtml(product.description || "Qo‘shimcha ma’lumot uchun bog‘laning.")}</p>
          <div class="price-row">
            <strong>${escapeHtml(product.price)}</strong>
            ${product.oldPrice ? `<del>${escapeHtml(product.oldPrice)}</del>` : ""}
          </div>
          <div class="stock-line">Omborda: ${Number(product.stock ?? 1)} ta</div>
          <div class="product-actions">
            <button class="button button-dark" data-detail="${product.id}" type="button">Batafsil</button>
            <button class="button button-gold" data-cart="${product.id}" type="button" ${sold ? "disabled" : ""}>Savatchaga</button>
          </div>
          <a class="text-order" target="_blank" rel="noopener"
             href="https://t.me/ibratmebel8909?text=${telegramText}">Telegram orqali buyurtma</a>
        </div>
      </article>`;
  }).join("");
}

function showProduct(product) {
  productModalContent.innerHTML = `
    <div class="modal-product-grid">
      <img src="${escapeHtml(productImage(product))}" alt="${escapeHtml(product.name)}">
      <div>
        <span class="category-badge">${escapeHtml(product.category || "Boshqa")}</span>
        <h2>${escapeHtml(product.name)}</h2>
        <p>${escapeHtml(product.description || "")}</p>
        <div class="price-row modal-price"><strong>${escapeHtml(product.price)}</strong>
          ${product.oldPrice ? `<del>${escapeHtml(product.oldPrice)}</del>` : ""}</div>
        <p><b>Omborda:</b> ${Number(product.stock ?? 1)} ta</p>
        ${product.video ? `<a class="button button-dark" target="_blank" rel="noopener" href="${escapeHtml(product.video)}">Videoni ko‘rish</a>` : ""}
      </div>
    </div>`;
  productModal.showModal();
}

function showList(type) {
  const ids = type === "favorites" ? favorites : cart;
  const title = type === "favorites" ? "Sevimli mahsulotlar" : "Savatcha";
  const selected = ids.map(id => products.find(p => p.id === id)).filter(Boolean);
  listModalContent.innerHTML = `<h2>${title}</h2>` + (selected.length ? selected.map(item => `
    <div class="list-product">
      <img src="${escapeHtml(productImage(item))}" alt="${escapeHtml(item.name)}">
      <div><b>${escapeHtml(item.name)}</b><span>${escapeHtml(item.price)}</span></div>
      <button data-remove-list="${type}" data-id="${item.id}" type="button">Olib tashlash</button>
    </div>`).join("") : "<p>Hozircha bo‘sh.</p>");
  listModal.showModal();
}

catalogGrid.addEventListener("click", event => {
  const favorite = event.target.closest("[data-favorite]");
  const addCart = event.target.closest("[data-cart]");
  const detail = event.target.closest("[data-detail]");

  if (favorite) {
    const id = favorite.dataset.favorite;
    favorites = favorites.includes(id) ? favorites.filter(item => item !== id) : [...favorites, id];
    saveLocal(); renderCatalog();
  }
  if (addCart) {
    const id = addCart.dataset.cart;
    if (!cart.includes(id)) cart.push(id);
    saveLocal(); addCart.textContent = "Qo‘shildi ✓";
  }
  if (detail) {
    const product = products.find(item => item.id === detail.dataset.detail);
    if (product) showProduct(product);
  }
});

document.getElementById("favoritesButton").addEventListener("click", () => showList("favorites"));
document.getElementById("cartButton").addEventListener("click", () => showList("cart"));
document.getElementById("modalClose").addEventListener("click", () => productModal.close());
document.getElementById("listModalClose").addEventListener("click", () => listModal.close());
listModalContent.addEventListener("click", event => {
  const remove = event.target.closest("[data-remove-list]");
  if (!remove) return;
  if (remove.dataset.removeList === "favorites") favorites = favorites.filter(id => id !== remove.dataset.id);
  else cart = cart.filter(id => id !== remove.dataset.id);
  saveLocal();
  showList(remove.dataset.removeList);
  renderCatalog();
});

catalogSearch.addEventListener("input", renderCatalog);
catalogCategory.addEventListener("change", renderCatalog);
saveLocal();

const productsQuery = query(collection(db, "products"), orderBy("createdAt", "desc"));
onSnapshot(productsQuery, snapshot => {
  products = snapshot.docs.map(item => ({ id: item.id, ...item.data() }));
  renderCategories(); renderCatalog(); saveLocal();
}, error => {
  console.error(error);
  catalogGrid.innerHTML = '<div class="empty-state">Mahsulotlarni yuklashda xatolik.</div>';
});

document.getElementById("buyurtma").addEventListener("submit", event => {
  event.preventDefault();
  const name = document.getElementById("customerName").value.trim();
  const phone = document.getElementById("customerPhone").value.trim();
  const service = document.getElementById("customerService").value;
  const message = document.getElementById("customerMessage").value.trim();
  const text = encodeURIComponent(`Assalomu alaykum!\nIsm: ${name}\nTelefon: ${phone}\nXizmat: ${service}\nIzoh: ${message}`);
  window.open(`https://t.me/ibratmebel8909?text=${text}`, "_blank", "noopener");
});
