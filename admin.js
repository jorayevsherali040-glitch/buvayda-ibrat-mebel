import { auth, db, storage } from "./firebase-config.js";
import {
  signInWithEmailAndPassword, signOut, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";
import {
  collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot,
  serverTimestamp, query, orderBy
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";
import {
  ref, uploadBytesResumable, getDownloadURL
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-storage.js";

const $ = id => document.getElementById(id);
const loginCard = $("loginCard"), dashboard = $("dashboard"), loginForm = $("loginForm");
const loginMessage = $("loginMessage"), logoutButton = $("logoutButton"), loggedInEmail = $("loggedInEmail");
const adminStatus = $("adminStatus"), adminProducts = $("adminProducts"), adminSearch = $("adminSearch");
const saveProductButton = $("saveProductButton"), cancelEditButton = $("cancelEditButton");
const productsCollection = collection(db, "products");
let products = [], currentImageUrl = "";

function escapeHtml(value = "") {
  return String(value).replaceAll("&","&amp;").replaceAll("<","&lt;")
    .replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");
}
function showStatus(message, type="success") {
  adminStatus.textContent = message;
  adminStatus.className = `admin-status show ${type}`;
  setTimeout(() => adminStatus.className = "admin-status", 4000);
}
function updateStats() {
  $("statTotal").textContent = products.length;
  $("statFeatured").textContent = products.filter(p => p.featured).length;
  $("statSold").textContent = products.filter(p => p.soldOut || Number(p.stock) === 0).length;
  $("statStock").textContent = products.reduce((sum,p) => sum + Number(p.stock || 0), 0);
}
function clearForm() {
  $("editingProductId").value = ""; $("productName").value = ""; $("productPrice").value = "";
  $("productOldPrice").value = ""; $("productCategory").value = "Spalniy";
  $("productImage").value = ""; $("productImageFile").value = ""; $("productVideo").value = "";
  $("productStock").value = "1"; $("productFeatured").checked = false; $("productSoldOut").checked = false;
  $("productDescription").value = ""; $("formTitle").textContent = "Yangi mahsulot";
  saveProductButton.textContent = "Mahsulotni saqlash"; cancelEditButton.hidden = true;
  currentImageUrl = ""; $("imagePreview").hidden = true;
}
loginForm.addEventListener("submit", async e => {
  e.preventDefault(); loginMessage.textContent = "Tekshirilmoqda...";
  try {
    await signInWithEmailAndPassword(auth, $("adminEmail").value.trim(), $("adminPassword").value);
    loginMessage.textContent = "Muvaffaqiyatli kirdingiz.";
  } catch (error) {
    console.error(error); loginMessage.textContent = "Email yoki parol noto‘g‘ri.";
  }
});
logoutButton.addEventListener("click", () => signOut(auth));
cancelEditButton.addEventListener("click", clearForm);
onAuthStateChanged(auth, user => {
  loginCard.hidden = Boolean(user); dashboard.hidden = !user;
  loggedInEmail.textContent = user ? `Kirish: ${user.email}` : "";
});

$("productImageFile").addEventListener("change", () => {
  const file = $("productImageFile").files[0];
  if (!file) return;
  if (!file.type.startsWith("image/")) return showStatus("Faqat rasm faylini tanlang.", "error");
  if (file.size > 8 * 1024 * 1024) return showStatus("Rasm 8 MB dan katta bo‘lmasin.", "error");
  const preview = $("imagePreview");
  preview.src = URL.createObjectURL(file); preview.hidden = false;
});

async function uploadSelectedImage() {
  const file = $("productImageFile").files[0];
  if (!file) return $("productImage").value.trim() || currentImageUrl;
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const storageRef = ref(storage, `products/${Date.now()}_${safeName}`);
  const task = uploadBytesResumable(storageRef, file, { contentType: file.type });
  $("uploadProgress").hidden = false;
  return new Promise((resolve, reject) => {
    task.on("state_changed", snap => {
      $("uploadProgressBar").style.width = `${Math.round(snap.bytesTransferred / snap.totalBytes * 100)}%`;
    }, reject, async () => resolve(await getDownloadURL(task.snapshot.ref)));
  });
}

saveProductButton.addEventListener("click", async () => {
  if (!auth.currentUser) return showStatus("Avval admin sifatida kiring.", "error");
  const name = $("productName").value.trim(), price = $("productPrice").value.trim();
  if (!name || !price) return showStatus("Mahsulot nomi va narxini kiriting.", "error");
  saveProductButton.disabled = true; saveProductButton.textContent = "Saqlanmoqda...";
  try {
    const image = await uploadSelectedImage();
    const data = {
      name, price, oldPrice: $("productOldPrice").value.trim(),
      category: $("productCategory").value, image,
      video: $("productVideo").value.trim(),
      stock: Number($("productStock").value || 0),
      featured: $("productFeatured").checked,
      soldOut: $("productSoldOut").checked,
      description: $("productDescription").value.trim(),
      updatedAt: serverTimestamp()
    };
    const id = $("editingProductId").value;
    if (id) await updateDoc(doc(db, "products", id), data);
    else await addDoc(productsCollection, {...data, createdAt: serverTimestamp()});
    showStatus(id ? "Mahsulot yangilandi." : "Mahsulot qo‘shildi.");
    clearForm();
  } catch (error) {
    console.error(error);
    showStatus("Saqlash yoki rasm yuklashda xatolik. Storage Rules ni tekshiring.", "error");
  } finally {
    saveProductButton.disabled = false; saveProductButton.textContent = "Mahsulotni saqlash";
    $("uploadProgress").hidden = true; $("uploadProgressBar").style.width = "0";
  }
});

function renderProducts() {
  const search = adminSearch.value.trim().toLowerCase();
  const filtered = products.filter(p => !search ||
    String(p.name||"").toLowerCase().includes(search) ||
    String(p.category||"").toLowerCase().includes(search));
  adminProducts.innerHTML = filtered.length ? filtered.map(item => `
    <article class="admin-item">
      <img src="${escapeHtml(item.image || "logo.png")}" alt="${escapeHtml(item.name)}">
      <div><h3>${escapeHtml(item.name)}</h3>
        <p>${escapeHtml(item.category || "Boshqa")} · Ombor: ${Number(item.stock ?? 1)}</p>
        <div class="admin-item-price">${escapeHtml(item.price)}</div>
        <div class="admin-badges">${item.featured ? "<span>TOP</span>" : ""}${item.soldOut ? "<span>SOTILDI</span>" : ""}</div>
      </div>
      <div class="admin-actions">
        <button class="edit-button" data-edit="${item.id}">Tahrirlash</button>
        <button class="delete-button" data-delete="${item.id}">O‘chirish</button>
      </div>
    </article>`).join("") : "<p>Hozircha mahsulot yo‘q.</p>";
}
adminSearch.addEventListener("input", renderProducts);
adminProducts.addEventListener("click", async event => {
  const edit = event.target.closest("[data-edit]"), del = event.target.closest("[data-delete]");
  if (edit) {
    const item = products.find(p => p.id === edit.dataset.edit); if (!item) return;
    $("editingProductId").value=item.id; $("productName").value=item.name||"";
    $("productPrice").value=item.price||""; $("productOldPrice").value=item.oldPrice||"";
    $("productCategory").value=item.category||"Boshqa"; $("productImage").value=item.image||"";
    $("productVideo").value=item.video||""; $("productStock").value=Number(item.stock??1);
    $("productFeatured").checked=Boolean(item.featured); $("productSoldOut").checked=Boolean(item.soldOut);
    $("productDescription").value=item.description||""; currentImageUrl=item.image||"";
    if (currentImageUrl) { $("imagePreview").src=currentImageUrl; $("imagePreview").hidden=false; }
    $("formTitle").textContent="Mahsulotni tahrirlash";
    saveProductButton.textContent="O‘zgarishlarni saqlash"; cancelEditButton.hidden=false;
    scrollTo({top:0,behavior:"smooth"});
  }
  if (del) {
    if (!confirm("Mahsulotni o‘chirmoqchimisiz?")) return;
    try { await deleteDoc(doc(db,"products",del.dataset.delete)); showStatus("Mahsulot o‘chirildi."); }
    catch(error){ console.error(error); showStatus("O‘chirishda xatolik.","error"); }
  }
});
const productsQuery = query(productsCollection, orderBy("createdAt","desc"));
onSnapshot(productsQuery, snap => {
  products = snap.docs.map(d => ({id:d.id,...d.data()})); renderProducts(); updateStats();
}, error => { console.error(error); adminProducts.innerHTML="<p>Yuklashda xatolik.</p>"; });
