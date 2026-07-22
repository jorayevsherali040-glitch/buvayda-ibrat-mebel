import { auth, db } from "./firebase-config.js";
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  query,
  orderBy
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

const GITHUB_OWNER = "jorayevsherali040-glitch";
const GITHUB_REPO = "buvayda-ibrat-mebel";
const GITHUB_BRANCH = "main";
const IMAGE_FOLDER = "images";
const GITHUB_API_URL =
  `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${IMAGE_FOLDER}?ref=${GITHUB_BRANCH}`;

const $ = id => document.getElementById(id);

const loginCard = $("loginCard");
const dashboard = $("dashboard");
const loginForm = $("loginForm");
const loginMessage = $("loginMessage");
const logoutButton = $("logoutButton");
const loggedInEmail = $("loggedInEmail");
const adminStatus = $("adminStatus");
const adminProducts = $("adminProducts");
const adminSearch = $("adminSearch");
const saveProductButton = $("saveProductButton");
const cancelEditButton = $("cancelEditButton");
const productImageSelect = $("productImageSelect");
const productImageName = $("productImageName");
const imagePreview = $("imagePreview");
const refreshImagesButton = $("refreshImagesButton");
const productsCollection = collection(db, "products");

let products = [];
let githubImages = [];

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function showStatus(message, type = "success") {
  adminStatus.textContent = message;
  adminStatus.className = `admin-status show ${type}`;
  window.setTimeout(() => {
    adminStatus.className = "admin-status";
  }, 4500);
}

function githubImageUrl(filename = "") {
  const cleanName = String(filename).trim().replace(/^images\//, "");
  if (!cleanName) return "";
  return `./images/${encodeURIComponent(cleanName).replaceAll("%2F", "/")}`;
}

function imageFilenameFromProduct(product = {}) {
  if (product.imageName) return product.imageName;
  const image = String(product.image || "");
  const marker = "/images/";
  const markerIndex = image.lastIndexOf(marker);
  if (markerIndex >= 0) {
    return decodeURIComponent(image.slice(markerIndex + marker.length));
  }
  if (image.startsWith("./images/")) {
    return decodeURIComponent(image.slice("./images/".length));
  }
  return "";
}

function setImagePreview(filename = "") {
  const imageUrl = githubImageUrl(filename);
  if (!imageUrl) {
    imagePreview.hidden = true;
    imagePreview.removeAttribute("src");
    return;
  }
  imagePreview.src = imageUrl;
  imagePreview.hidden = false;
  imagePreview.onerror = () => {
    imagePreview.hidden = true;
    showStatus("Rasm topilmadi. Fayl nomini tekshiring.", "error");
  };
}

async function loadGithubImages(showMessage = false) {
  refreshImagesButton.disabled = true;
  refreshImagesButton.textContent = "Yuklanmoqda...";

  try {
    const response = await fetch(GITHUB_API_URL, {
      headers: { Accept: "application/vnd.github+json" },
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error(`GitHub API: ${response.status}`);
    }

    const items = await response.json();
    githubImages = items
      .filter(item => item.type === "file")
      .map(item => item.name)
      .filter(name => /\.(jpe?g|png|webp|gif|avif)$/i.test(name))
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

    const selected = productImageName.value.trim();
    productImageSelect.innerHTML =
      '<option value="">Rasm tanlang...</option>' +
      githubImages
        .map(name => `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`)
        .join("");

    if (selected && githubImages.includes(selected)) {
      productImageSelect.value = selected;
    }

    if (showMessage) {
      showStatus(`${githubImages.length} ta rasm topildi.`);
    }
  } catch (error) {
    console.error(error);
    showStatus(
      "GitHub rasmlar ro‘yxatini yuklab bo‘lmadi. Rasm nomini qo‘lda yozishingiz mumkin.",
      "error"
    );
  } finally {
    refreshImagesButton.disabled = false;
    refreshImagesButton.textContent = "Rasmlarni yangilash";
  }
}

function updateStats() {
  $("statTotal").textContent = products.length;
  $("statFeatured").textContent = products.filter(item => item.featured).length;
  $("statSold").textContent = products.filter(
    item => item.soldOut || Number(item.stock) === 0
  ).length;
  $("statStock").textContent = products.reduce(
    (sum, item) => sum + Number(item.stock || 0),
    0
  );
}

function clearForm() {
  $("editingProductId").value = "";
  $("productName").value = "";
  $("productPrice").value = "";
  $("productOldPrice").value = "";
  $("productCategory").value = "Spalniy";
  productImageSelect.value = "";
  productImageName.value = "";
  $("productVideo").value = "";
  $("productStock").value = "1";
  $("productFeatured").checked = false;
  $("productSoldOut").checked = false;
  $("productSort").value = "0";
  $("productStatus").value = "active";
  $("productDescription").value = "";
  $("formTitle").textContent = "Yangi mahsulot";
  saveProductButton.textContent = "Mahsulotni saqlash";
  cancelEditButton.hidden = true;
  setImagePreview("");
}

loginForm.addEventListener("submit", async event => {
  event.preventDefault();
  loginMessage.textContent = "Tekshirilmoqda...";

  try {
    await signInWithEmailAndPassword(
      auth,
      $("adminEmail").value.trim(),
      $("adminPassword").value
    );
    loginMessage.textContent = "Muvaffaqiyatli kirdingiz.";
  } catch (error) {
    console.error(error);
    loginMessage.textContent = "Email yoki parol noto‘g‘ri.";
  }
});

logoutButton.addEventListener("click", () => signOut(auth));
cancelEditButton.addEventListener("click", clearForm);
refreshImagesButton.addEventListener("click", () => loadGithubImages(true));

productImageSelect.addEventListener("change", () => {
  productImageName.value = productImageSelect.value;
  setImagePreview(productImageSelect.value);
});

productImageName.addEventListener("input", () => {
  const filename = productImageName.value.trim();
  productImageSelect.value = githubImages.includes(filename) ? filename : "";
  setImagePreview(filename);
});

onAuthStateChanged(auth, user => {
  loginCard.hidden = Boolean(user);
  dashboard.hidden = !user;
  loggedInEmail.textContent = user ? `Kirish: ${user.email}` : "";

  if (user) {
    loadGithubImages();
  }
});

saveProductButton.addEventListener("click", async () => {
  if (!auth.currentUser) {
    showStatus("Avval admin sifatida kiring.", "error");
    return;
  }

  const name = $("productName").value.trim();
  const price = $("productPrice").value.trim();
  const imageName = productImageName.value.trim();

  if (!name || !price) {
    showStatus("Mahsulot nomi va narxini kiriting.", "error");
    return;
  }

  if (!imageName) {
    showStatus("Mahsulot rasmini tanlang yoki rasm nomini yozing.", "error");
    return;
  }

  saveProductButton.disabled = true;
  saveProductButton.textContent = "Saqlanmoqda...";

  try {
    const data = {
      name,
      price,
      oldPrice: $("productOldPrice").value.trim(),
      category: $("productCategory").value,
      imageName,
      image: githubImageUrl(imageName),
      video: $("productVideo").value.trim(),
      stock: Math.max(0, Number($("productStock").value || 0)),
      featured: $("productFeatured").checked,
      soldOut: $("productSoldOut").checked,
      sortOrder: Number($("productSort").value || 0),
      status: $("productStatus").value,
      description: $("productDescription").value.trim(),
      updatedAt: serverTimestamp()
    };

    const editingId = $("editingProductId").value;

    if (editingId) {
      await updateDoc(doc(db, "products", editingId), data);
      showStatus("Mahsulot yangilandi.");
    } else {
      await addDoc(productsCollection, {
        ...data,
        createdAt: serverTimestamp()
      });
      showStatus("Mahsulot qo‘shildi.");
    }

    clearForm();
  } catch (error) {
    console.error(error);
    showStatus("Mahsulotni saqlashda xatolik yuz berdi.", "error");
  } finally {
    saveProductButton.disabled = false;
    saveProductButton.textContent = "Mahsulotni saqlash";
  }
});

function renderProducts() {
  const search = adminSearch.value.trim().toLowerCase();

  const filtered = products.filter(item => {
    if (!search) return true;
    return (
      String(item.name || "").toLowerCase().includes(search) ||
      String(item.category || "").toLowerCase().includes(search) ||
      String(item.price || "").toLowerCase().includes(search)
    );
  });

  adminProducts.innerHTML = filtered.length
    ? filtered
        .map(item => {
          const filename = imageFilenameFromProduct(item);
          const imageUrl = filename ? githubImageUrl(filename) : item.image || "./logo.png";
          return `
            <article class="admin-item">
              <img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(item.name)}">
              <div>
                <h3>${escapeHtml(item.name)}</h3>
                <p>
                  ${escapeHtml(item.category || "Boshqa")}
                  · Ombor: ${Number(item.stock ?? 1)}
                  · Rasm: ${escapeHtml(filename || "URL")}
                </p>
                <div class="admin-item-price">${escapeHtml(item.price)}</div>
                <div class="admin-badges">
                  ${item.featured ? "<span>TOP</span>" : ""}
                  ${item.soldOut ? "<span>SOTILDI</span>" : ""}
                  ${item.status === "hidden" ? "<span>YASHIRIN</span>" : ""}
                </div>
              </div>
              <div class="admin-actions">
                <button class="edit-button" data-edit="${item.id}">Tahrirlash</button>
                <button class="delete-button" data-delete="${item.id}">O‘chirish</button>
              </div>
            </article>
          `;
        })
        .join("")
    : "<p>Hozircha mahsulot yo‘q.</p>";
}

adminSearch.addEventListener("input", renderProducts);

adminProducts.addEventListener("click", async event => {
  const editButton = event.target.closest("[data-edit]");
  const deleteButton = event.target.closest("[data-delete]");

  if (editButton) {
    const item = products.find(product => product.id === editButton.dataset.edit);
    if (!item) return;

    const filename = imageFilenameFromProduct(item);

    $("editingProductId").value = item.id;
    $("productName").value = item.name || "";
    $("productPrice").value = item.price || "";
    $("productOldPrice").value = item.oldPrice || "";
    $("productCategory").value = item.category || "Boshqa";
    productImageName.value = filename;
    productImageSelect.value = githubImages.includes(filename) ? filename : "";
    $("productVideo").value = item.video || "";
    $("productStock").value = Number(item.stock ?? 1);
    $("productFeatured").checked = Boolean(item.featured);
    $("productSoldOut").checked = Boolean(item.soldOut);
    $("productSort").value = Number(item.sortOrder || 0);
    $("productStatus").value = item.status || "active";
    $("productDescription").value = item.description || "";

    setImagePreview(filename);
    $("formTitle").textContent = "Mahsulotni tahrirlash";
    saveProductButton.textContent = "O‘zgarishlarni saqlash";
    cancelEditButton.hidden = false;
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (deleteButton) {
    const accepted = window.confirm("Mahsulotni o‘chirmoqchimisiz?");
    if (!accepted) return;

    try {
      await deleteDoc(doc(db, "products", deleteButton.dataset.delete));
      showStatus("Mahsulot o‘chirildi.");
    } catch (error) {
      console.error(error);
      showStatus("Mahsulotni o‘chirishda xatolik.", "error");
    }
  }
});

const productsQuery = query(productsCollection, orderBy("createdAt", "desc"));

onSnapshot(
  productsQuery,
  snapshot => {
    products = snapshot.docs.map(productDoc => ({
      id: productDoc.id,
      ...productDoc.data()
    }));

    renderProducts();
    updateStats();
  },
  error => {
    console.error(error);
    adminProducts.innerHTML = "<p>Mahsulotlarni yuklashda xatolik.</p>";
  }
);
