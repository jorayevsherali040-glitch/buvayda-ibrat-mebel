import { db } from "./firebase-config.js";
import {
  collection,
  onSnapshot,
  query,
  orderBy
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

const $ = id => document.getElementById(id);

const menuButton = $("menuButton");
const mainNav = $("mainNav");
const catalogGrid = $("catalogGrid");
const catalogSearch = $("catalogSearch");
const catalogCategory = $("catalogCategory");
const catalogCount = $("catalogCount");
const favoritesCount = $("favoritesCount");
const cartCount = $("cartCount");
const productModal = $("productModal");
const productModalContent = $("productModalContent");
const listModal = $("listModal");
const listModalContent = $("listModalContent");
const cartCheckoutButton = $("cartCheckoutButton");

let products = [];
let favorites = JSON.parse(localStorage.getItem("ibratFavorites") || "[]");
let cart = JSON.parse(localStorage.getItem("ibratCart") || "[]");

menuButton?.addEventListener("click", () => mainNav.classList.toggle("open"));
mainNav?.querySelectorAll("a").forEach(link => {
  link.addEventListener("click", () => mainNav.classList.remove("open"));
});

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function imageUrl(product = {}) {
  if (product.imageName) {
    return `./images/${encodeURIComponent(product.imageName).replaceAll("%2F", "/")}`;
  }
  if (product.image) return product.image;
  return "./logo.png";
}

function activeProducts() {
  return products
    .filter(item => item.status !== "hidden")
    .sort((a, b) => {
      const featuredDifference = Number(Boolean(b.featured)) - Number(Boolean(a.featured));
      if (featuredDifference !== 0) return featuredDifference;

      const sortDifference = Number(a.sortOrder || 0) - Number(b.sortOrder || 0);
      if (sortDifference !== 0) return sortDifference;

      const aSeconds = a.createdAt?.seconds || 0;
      const bSeconds = b.createdAt?.seconds || 0;
      return bSeconds - aSeconds;
    });
}

function syncLocalState() {
  const validIds = new Set(products.map(item => item.id));
  favorites = favorites.filter(id => validIds.has(id));
  cart = cart.filter(id => validIds.has(id));

  localStorage.setItem("ibratFavorites", JSON.stringify(favorites));
  localStorage.setItem("ibratCart", JSON.stringify(cart));

  favoritesCount.textContent = favorites.length;
  cartCount.textContent = cart.length;
}

function renderCategories() {
  const selected = catalogCategory.value;
  const categories = [
    ...new Set(activeProducts().map(item => item.category).filter(Boolean))
  ].sort();

  catalogCategory.innerHTML =
    '<option value="">Barcha kategoriyalar</option>' +
    categories
      .map(category => {
        return `<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`;
      })
      .join("");

  if (categories.includes(selected)) {
    catalogCategory.value = selected;
  }
}

function filteredProducts() {
  const search = catalogSearch.value.trim().toLowerCase();
  const category = catalogCategory.value;

  return activeProducts().filter(product => {
    const text = [
      product.name,
      product.description,
      product.category,
      product.price
    ]
      .join(" ")
      .toLowerCase();

    return (!search || text.includes(search)) &&
      (!category || product.category === category);
  });
}

function renderCatalog() {
  const filtered = filteredProducts();
  catalogCount.textContent = `${filtered.length} ta mahsulot`;

  if (!filtered.length) {
    catalogGrid.innerHTML =
      '<div class="empty-state">Hozircha mos mahsulot topilmadi.</div>';
    return;
  }

  catalogGrid.innerHTML = filtered
    .map(product => {
      const isFavorite = favorites.includes(product.id);
      const isSold = product.soldOut || Number(product.stock) === 0;
      const telegramText = encodeURIComponent(
        `Assalomu alaykum. ${product.name || "Mahsulot"} haqida ma’lumot olmoqchiman.`
      );

      return `
        <article class="product-card ${isSold ? "sold-card" : ""}">
          <div class="product-image-wrap">
            <img loading="lazy"
                 src="${escapeHtml(imageUrl(product))}"
                 alt="${escapeHtml(product.name)}">
            ${product.featured ? '<span class="featured-badge">TOP</span>' : ""}
            ${isSold ? '<span class="sold-badge">SOTILDI</span>' : ""}
            <button class="heart-button ${isFavorite ? "active" : ""}"
                    data-favorite="${product.id}" type="button"
                    aria-label="Sevimlilarga qo‘shish">♥</button>
          </div>

          <div class="product-body">
            <span class="category-badge">${escapeHtml(product.category || "Boshqa")}</span>
            <h3>${escapeHtml(product.name)}</h3>
            <p>${escapeHtml(product.description || "Qo‘shimcha ma’lumot uchun bog‘laning.")}</p>

            <div class="price-row">
              <strong>${escapeHtml(product.price)}</strong>
              ${product.oldPrice ? `<del>${escapeHtml(product.oldPrice)}</del>` : ""}
            </div>

            <div class="stock-line">
              ${isSold ? "Hozir sotuvda yo‘q" : `Omborda: ${Number(product.stock ?? 1)} ta`}
            </div>

            <div class="product-actions">
              <button class="button button-dark"
                      data-detail="${product.id}" type="button">
                Batafsil
              </button>
              <button class="button button-gold"
                      data-cart="${product.id}" type="button"
                      ${isSold ? "disabled" : ""}>
                Savatchaga
              </button>
            </div>

            <a class="text-order" target="_blank" rel="noopener"
               href="https://t.me/ibratmebel8909?text=${telegramText}">
              Telegram orqali buyurtma
            </a>
          </div>
        </article>
      `;
    })
    .join("");
}

function showProduct(product) {
  const isSold = product.soldOut || Number(product.stock) === 0;

  productModalContent.innerHTML = `
    <div class="modal-product-grid">
      <img src="${escapeHtml(imageUrl(product))}" alt="${escapeHtml(product.name)}">
      <div>
        <span class="category-badge">${escapeHtml(product.category || "Boshqa")}</span>
        <h2>${escapeHtml(product.name)}</h2>
        <p>${escapeHtml(product.description || "")}</p>

        <div class="price-row modal-price">
          <strong>${escapeHtml(product.price)}</strong>
          ${product.oldPrice ? `<del>${escapeHtml(product.oldPrice)}</del>` : ""}
        </div>

        <p><b>Holati:</b> ${isSold ? "Sotuvda yo‘q" : `Omborda ${Number(product.stock ?? 1)} ta`}</p>

        <div class="button-row">
          ${product.video
            ? `<a class="button button-dark" target="_blank" rel="noopener"
                  href="${escapeHtml(product.video)}">Videoni ko‘rish</a>`
            : ""}
          <a class="button button-gold" target="_blank" rel="noopener"
             href="https://t.me/ibratmebel8909?text=${encodeURIComponent(
               `Assalomu alaykum. ${product.name} mahsulotiga buyurtma bermoqchiman.`
             )}">
            Buyurtma berish
          </a>
        </div>
      </div>
    </div>
  `;

  productModal.showModal();
}

function showList(type) {
  const ids = type === "favorites" ? favorites : cart;
  const title = type === "favorites" ? "Sevimli mahsulotlar" : "Savatcha";
  const selectedProducts = ids
    .map(id => products.find(product => product.id === id))
    .filter(Boolean);

  listModalContent.innerHTML =
    `<h2>${title}</h2>` +
    (selectedProducts.length
      ? selectedProducts
          .map(item => {
            return `
              <div class="list-product">
                <img src="${escapeHtml(imageUrl(item))}" alt="${escapeHtml(item.name)}">
                <div>
                  <b>${escapeHtml(item.name)}</b>
                  <span>${escapeHtml(item.price)}</span>
                </div>
                <button data-remove-list="${type}" data-id="${item.id}" type="button">
                  Olib tashlash
                </button>
              </div>
            `;
          })
          .join("")
      : "<p>Hozircha bo‘sh.</p>");

  cartCheckoutButton.hidden = type !== "cart" || selectedProducts.length === 0;
  cartCheckoutButton.dataset.items = selectedProducts.map(item => item.id).join(",");
  listModal.showModal();
}

catalogGrid.addEventListener("click", event => {
  const favoriteButton = event.target.closest("[data-favorite]");
  const cartButton = event.target.closest("[data-cart]");
  const detailButton = event.target.closest("[data-detail]");

  if (favoriteButton) {
    const id = favoriteButton.dataset.favorite;
    favorites = favorites.includes(id)
      ? favorites.filter(itemId => itemId !== id)
      : [...favorites, id];

    syncLocalState();
    renderCatalog();
  }

  if (cartButton) {
    const id = cartButton.dataset.cart;
    if (!cart.includes(id)) cart.push(id);
    syncLocalState();
    cartButton.textContent = "Qo‘shildi ✓";
  }

  if (detailButton) {
    const product = products.find(item => item.id === detailButton.dataset.detail);
    if (product) showProduct(product);
  }
});

$("favoritesButton").addEventListener("click", () => showList("favorites"));
$("cartButton").addEventListener("click", () => showList("cart"));
$("modalClose").addEventListener("click", () => productModal.close());
$("listModalClose").addEventListener("click", () => listModal.close());

listModalContent.addEventListener("click", event => {
  const removeButton = event.target.closest("[data-remove-list]");
  if (!removeButton) return;

  const type = removeButton.dataset.removeList;
  const id = removeButton.dataset.id;

  if (type === "favorites") {
    favorites = favorites.filter(itemId => itemId !== id);
  } else {
    cart = cart.filter(itemId => itemId !== id);
  }

  syncLocalState();
  showList(type);
  renderCatalog();
});

cartCheckoutButton.addEventListener("click", () => {
  const selectedProducts = cart
    .map(id => products.find(product => product.id === id))
    .filter(Boolean);

  if (!selectedProducts.length) return;

  const lines = selectedProducts.map((product, index) => {
    return `${index + 1}. ${product.name} — ${product.price}`;
  });

  const message = encodeURIComponent(
    `Assalomu alaykum! Quyidagi mahsulotlarga buyurtma bermoqchiman:\n\n${lines.join("\n")}`
  );

  window.open(
    `https://t.me/ibratmebel8909?text=${message}`,
    "_blank",
    "noopener"
  );
});

catalogSearch.addEventListener("input", renderCatalog);
catalogCategory.addEventListener("change", renderCatalog);

const productsQuery = query(
  collection(db, "products"),
  orderBy("createdAt", "desc")
);

onSnapshot(
  productsQuery,
  snapshot => {
    products = snapshot.docs.map(item => ({
      id: item.id,
      ...item.data()
    }));

    renderCategories();
    syncLocalState();
    renderCatalog();
  },
  error => {
    console.error(error);
    catalogGrid.innerHTML =
      '<div class="empty-state">Mahsulotlarni yuklashda xatolik.</div>';
  }
);

$("buyurtma").addEventListener("submit", event => {
  event.preventDefault();

  const name = $("customerName").value.trim();
  const phone = $("customerPhone").value.trim();
  const service = $("customerService").value;
  const message = $("customerMessage").value.trim();

  const text = encodeURIComponent(
    `Assalomu alaykum!\nIsm: ${name}\nTelefon: ${phone}\nXizmat: ${service}\nIzoh: ${message}`
  );

  window.open(
    `https://t.me/ibratmebel8909?text=${text}`,
    "_blank",
    "noopener"
  );
});
