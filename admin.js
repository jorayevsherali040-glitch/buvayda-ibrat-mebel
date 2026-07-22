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

const loginCard = document.getElementById("loginCard");
const dashboard = document.getElementById("dashboard");
const loginForm = document.getElementById("loginForm");
const loginMessage = document.getElementById("loginMessage");
const logoutButton = document.getElementById("logoutButton");
const loggedInEmail = document.getElementById("loggedInEmail");
const adminStatus = document.getElementById("adminStatus");

const editingProductId = document.getElementById("editingProductId");
const productName = document.getElementById("productName");
const productPrice = document.getElementById("productPrice");
const productCategory = document.getElementById("productCategory");
const productImage = document.getElementById("productImage");
const productDescription = document.getElementById("productDescription");
const saveProductButton = document.getElementById("saveProductButton");
const cancelEditButton = document.getElementById("cancelEditButton");
const formTitle = document.getElementById("formTitle");
const adminProducts = document.getElementById("adminProducts");
const adminSearch = document.getElementById("adminSearch");

const productsCollection = collection(db, "products");
let products = [];

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
    adminStatus.textContent = "";
  }, 3500);
}

function clearForm() {
  editingProductId.value = "";
  productName.value = "";
  productPrice.value = "";
  productCategory.value = "Spalniy";
  productImage.value = "";
  productDescription.value = "";
  formTitle.textContent = "Yangi mahsulot";
  saveProductButton.textContent = "Mahsulotni saqlash";
  cancelEditButton.hidden = true;
}

loginForm.addEventListener("submit", async event => {
  event.preventDefault();
  loginMessage.style.color = "#555";
  loginMessage.textContent = "Tekshirilmoqda...";

  try {
    await signInWithEmailAndPassword(
      auth,
      document.getElementById("adminEmail").value.trim(),
      document.getElementById("adminPassword").value
    );
    loginMessage.style.color = "green";
    loginMessage.textContent = "Muvaffaqiyatli kirdingiz.";
  } catch (error) {
    console.error(error);
    loginMessage.style.color = "red";
    loginMessage.textContent = "Email yoki parol noto‘g‘ri.";
  }
});

logoutButton.addEventListener("click", () => signOut(auth));
cancelEditButton.addEventListener("click", clearForm);

onAuthStateChanged(auth, user => {
  loginCard.hidden = Boolean(user);
  dashboard.hidden = !user;
  loggedInEmail.textContent = user ? `Kirish: ${user.email}` : "";
});

saveProductButton.addEventListener("click", async () => {
  if (!auth.currentUser) return showStatus("Avval admin sifatida kiring.", "error");

  const name = productName.value.trim();
  const price = productPrice.value.trim();
  if (!name || !price) return showStatus("Mahsulot nomi va narxini kiriting.", "error");

  const productId = editingProductId.value;
  const data = {
    name,
    price,
    category: productCategory.value,
    image: productImage.value.trim(),
    description: productDescription.value.trim(),
    updatedAt: serverTimestamp()
  };

  saveProductButton.disabled = true;
  try {
    if (productId) {
      await updateDoc(doc(db, "products", productId), data);
      showStatus("Mahsulot yangilandi.");
    } else {
      await addDoc(productsCollection, { ...data, createdAt: serverTimestamp() });
      showStatus("Mahsulot qo‘shildi.");
    }
    clearForm();
  } catch (error) {
    console.error(error);
    showStatus("Saqlashda xatolik. Firestore Rules sozlamasini tekshiring.", "error");
  } finally {
    saveProductButton.disabled = false;
  }
});

function renderProducts() {
  const search = adminSearch.value.trim().toLowerCase();
  const filtered = products.filter(item =>
    !search ||
    String(item.name || "").toLowerCase().includes(search) ||
    String(item.category || "").toLowerCase().includes(search)
  );

  if (!filtered.length) {
    adminProducts.innerHTML = "<p>Hozircha mahsulot yo‘q.</p>";
    return;
  }

  adminProducts.innerHTML = filtered.map(item => {
    const image = item.image || "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=500&q=70";
    return `
      <article class="admin-item">
        <img src="${escapeHtml(image)}" alt="${escapeHtml(item.name)}">
        <div>
          <h3>${escapeHtml(item.name)}</h3>
          <p>${escapeHtml(item.category || "Boshqa")}</p>
          <div class="admin-item-price">${escapeHtml(item.price)}</div>
        </div>
        <div class="admin-actions">
          <button class="edit-button" data-edit="${item.id}">Tahrirlash</button>
          <button class="delete-button" data-delete="${item.id}">O‘chirish</button>
        </div>
      </article>`;
  }).join("");
}

adminSearch.addEventListener("input", renderProducts);

adminProducts.addEventListener("click", async event => {
  const editButton = event.target.closest("[data-edit]");
  const deleteButton = event.target.closest("[data-delete]");

  if (editButton) {
    const item = products.find(product => product.id === editButton.dataset.edit);
    if (!item) return;
    editingProductId.value = item.id;
    productName.value = item.name || "";
    productPrice.value = item.price || "";
    productCategory.value = item.category || "Boshqa";
    productImage.value = item.image || "";
    productDescription.value = item.description || "";
    formTitle.textContent = "Mahsulotni tahrirlash";
    saveProductButton.textContent = "O‘zgarishlarni saqlash";
    cancelEditButton.hidden = false;
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (deleteButton) {
    if (!auth.currentUser) return showStatus("Avval admin sifatida kiring.", "error");
    if (!window.confirm("Mahsulotni o‘chirmoqchimisiz?")) return;
    try {
      await deleteDoc(doc(db, "products", deleteButton.dataset.delete));
      showStatus("Mahsulot o‘chirildi.");
      if (editingProductId.value === deleteButton.dataset.delete) clearForm();
    } catch (error) {
      console.error(error);
      showStatus("Mahsulotni o‘chirishda xatolik.", "error");
    }
  }
});

const productsQuery = query(productsCollection, orderBy("createdAt", "desc"));
onSnapshot(productsQuery, snapshot => {
  products = snapshot.docs.map(item => ({ id: item.id, ...item.data() }));
  renderProducts();
}, error => {
  console.error(error);
  adminProducts.innerHTML = "<p>Mahsulotlarni yuklashda xatolik.</p>";
});
