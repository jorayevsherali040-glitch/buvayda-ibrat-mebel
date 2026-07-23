import { db } from "./firebase-config.js";
import {
  collection, addDoc, onSnapshot, query, orderBy, serverTimestamp,
  where, limit
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

const $ = id => document.getElementById(id);

let products = [];
let favorites = JSON.parse(localStorage.getItem("ibratFavorites") || "[]");
let cart = JSON.parse(localStorage.getItem("ibratCart") || "[]");
let viewed = JSON.parse(localStorage.getItem("ibratViewed") || "[]");
let gallery = [];
let galleryIndex = 0;
let sliderTimer = null;
let currentProduct = null;
let reviewsUnsubscribe = null;

$("menuButton")?.addEventListener("click", () => $("mainNav").classList.toggle("open"));
$("mainNav")?.querySelectorAll("a").forEach(a => a.onclick = () => $("mainNav").classList.remove("open"));

function esc(v=""){
  return String(v).replaceAll("&","&amp;").replaceAll("<","&lt;")
    .replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");
}
function img(name=""){
  const clean = String(name).replace(/^images\//,"");
  return clean ? `./images/${encodeURIComponent(clean).replaceAll("%2F","/")}` : "./logo.png";
}
function images(p={}){
  if(Array.isArray(p.images) && p.images.length) return p.images.slice(0,10);
  if(p.imageName) return [p.imageName];
  return [];
}
function mainImage(p){
  const list = images(p);
  return list.length ? img(list[0]) : (p.image || "./logo.png");
}
function numericPrice(value=""){
  const n = Number(String(value).replace(/[^\d]/g,""));
  return Number.isFinite(n) ? n : 0;
}
function discount(p){
  const old = numericPrice(p.oldPrice), current = numericPrice(p.price);
  return old > current && current > 0 ? Math.round((old-current)/old*100) : 0;
}
function active(){
  return products.filter(p => p.status !== "hidden");
}
function recommended(){
  return active().sort((a,b)=>
    Number(Boolean(b.featured))-Number(Boolean(a.featured)) ||
    Number(a.sortOrder||0)-Number(b.sortOrder||0) ||
    (b.createdAt?.seconds||0)-(a.createdAt?.seconds||0)
  );
}
function showToast(message){
  const t = $("siteToast");
  t.textContent = message;
  t.classList.add("show");
  clearTimeout(t._timer);
  t._timer = setTimeout(()=>t.classList.remove("show"),2500);
}
function saveViewed(id){
  viewed = [id, ...viewed.filter(x=>x!==id)].slice(0,20);
  localStorage.setItem("ibratViewed", JSON.stringify(viewed));
}
function sync(){
  const valid = new Set(products.map(p=>p.id));
  favorites = favorites.filter(id=>valid.has(id));
  cart = cart.filter(id=>valid.has(id));
  viewed = viewed.filter(id=>valid.has(id));
  localStorage.setItem("ibratFavorites",JSON.stringify(favorites));
  localStorage.setItem("ibratCart",JSON.stringify(cart));
  localStorage.setItem("ibratViewed",JSON.stringify(viewed));
  $("favoritesCount").textContent = favorites.length;
  $("cartCount").textContent = cart.length;
}
function chips(items=[],className="option-chip"){
  return items.map(item=>`<span class="${className}">${esc(item)}</span>`).join("");
}
function renderCategories(){
  const selected = $("catalogCategory").value;
  const counts = {};
  active().forEach(p => counts[p.category||"Boshqa"] = (counts[p.category||"Boshqa"]||0)+1);
  const cats = Object.keys(counts).sort();
  $("catalogCategory").innerHTML = '<option value="">Barcha kategoriyalar</option>' +
    cats.map(c=>`<option value="${esc(c)}">${esc(c)}</option>`).join("");
  if(cats.includes(selected)) $("catalogCategory").value = selected;
  $("categoryGrid").innerHTML = cats.length ? cats.map(c=>{
    const sample = active().find(p=>p.category===c);
    return `<button class="category-card" data-category-card="${esc(c)}" type="button">
      <img src="${esc(sample?mainImage(sample):"./logo.png")}" alt="${esc(c)}">
      <div><strong>${esc(c)}</strong><span>${counts[c]} ta mahsulot</span></div>
    </button>`;
  }).join("") : '<div class="empty-state">Kategoriya topilmadi.</div>';
}
function sortedProducts(list){
  const sort = $("catalogSort").value;
  const copy = [...list];
  if(sort==="newest") return copy.sort((a,b)=>(b.createdAt?.seconds||0)-(a.createdAt?.seconds||0));
  if(sort==="price-low") return copy.sort((a,b)=>numericPrice(a.price)-numericPrice(b.price));
  if(sort==="price-high") return copy.sort((a,b)=>numericPrice(b.price)-numericPrice(a.price));
  if(sort==="popular") return copy.sort((a,b)=>Number(b.salesCount||0)-Number(a.salesCount||0));
  return copy.sort((a,b)=>
    Number(Boolean(b.featured))-Number(Boolean(a.featured)) ||
    Number(a.sortOrder||0)-Number(b.sortOrder||0)
  );
}
function card(p){
  const sold = p.soldOut || Number(p.stock)===0;
  const fav = favorites.includes(p.id);
  const gallery = images(p);
  const off = discount(p);
  return `<article class="product-card instagram-card ${sold?"sold-card":""}">
    <div class="product-image-wrap">
      <img loading="lazy" src="${esc(mainImage(p))}" alt="${esc(p.name)}">
      ${p.featured?'<span class="featured-badge">TOP</span>':""}
      ${p.isNew?'<span class="new-badge">YANGI</span>':""}
      ${sold?'<span class="sold-badge">SOTILDI</span>':""}
      ${off?`<span class="discount-badge">-${off}%</span>`:""}
      <button class="heart-button ${fav?"active":""}" data-favorite="${p.id}" type="button">♥</button>
      ${gallery.length>1?`<span class="image-count">📷 ${gallery.length}</span>`:""}
    </div>
    <div class="product-body">
      <div class="card-meta"><span class="category-badge">${esc(p.category||"Boshqa")}</span>${p.sku?`<span class="sku">#${esc(p.sku)}</span>`:""}</div>
      <h3>${esc(p.name)}</h3>
      <p>${esc(p.description||"Qo‘shimcha ma’lumot uchun bog‘laning.")}</p>
      ${p.material?`<div class="material-line">${esc(p.material)}</div>`:""}
      <div class="price-row"><strong>${esc(p.price)}</strong>${p.oldPrice?`<del>${esc(p.oldPrice)}</del>`:""}</div>
      <div class="stock-line">${sold?"Hozir sotuvda yo‘q":Number(p.stock)<=3?`Faqat ${Number(p.stock)} ta qoldi`:`Omborda: ${Number(p.stock??1)} ta`}</div>
      <div class="product-actions">
        <button class="button button-dark" data-detail="${p.id}" type="button">Batafsil</button>
        <button class="button button-gold" data-cart="${p.id}" type="button" ${sold?"disabled":""}>Savatchaga</button>
      </div>
    </div>
  </article>`;
}
function filteredProducts(){
  const search = $("catalogSearch").value.trim().toLowerCase();
  const category = $("catalogCategory").value;
  const min = Number($("minPrice").value||0);
  const max = Number($("maxPrice").value||0);
  const stock = $("stockFilter").value;
  return active().filter(p=>{
    const text = `${p.name} ${p.category} ${p.description} ${p.price} ${p.material||""} ${(p.colors||[]).join(" ")}`.toLowerCase();
    const price = numericPrice(p.price);
    const sold = p.soldOut || Number(p.stock)===0;
    return (!search || text.includes(search))
      && (!category || p.category===category)
      && (!min || price>=min)
      && (!max || price<=max)
      && (!stock
        || (stock==="available" && !sold)
        || (stock==="low" && !sold && Number(p.stock)<=3)
        || (stock==="sold" && sold));
  });
}
function renderCatalog(){
  const list = sortedProducts(filteredProducts());
  $("catalogCount").textContent = `${list.length} ta mahsulot`;
  $("catalogGrid").innerHTML = list.length ? list.map(card).join("") :
    '<div class="empty-state">Hozircha mos mahsulot topilmadi.</div>';
}
function renderFeatured(){
  const list = recommended().filter(p=>p.featured).slice(0,12);
  $("featuredSlider").innerHTML = list.length ? list.map(card).join("") :
    '<div class="empty-state">Top mahsulotlar hali belgilanmagan.</div>';
}
function renderBestsellers(){
  const list = active().filter(p=>Number(p.salesCount||0)>0)
    .sort((a,b)=>Number(b.salesCount||0)-Number(a.salesCount||0)).slice(0,12);
  $("bestsellerSlider").innerHTML = list.length ? list.map(card).join("") :
    '<div class="empty-state">Sotuv ma’lumotlari hali kiritilmagan.</div>';
  startAutoSlider();
}
function renderRecommendations(){
  const favoriteProducts = favorites.map(id=>products.find(p=>p.id===id)).filter(Boolean);
  const viewedProducts = viewed.map(id=>products.find(p=>p.id===id)).filter(Boolean);
  const preferredCategories = [...favoriteProducts,...viewedProducts].map(p=>p.category).filter(Boolean);
  const scores = active().filter(p=>!favorites.includes(p.id)).map(p=>{
    let score = Number(p.featured?3:0) + Number(p.salesCount||0)/10;
    score += preferredCategories.filter(c=>c===p.category).length*5;
    if(viewed.includes(p.id)) score += 2;
    return {p,score};
  }).sort((a,b)=>b.score-a.score).slice(0,10).map(x=>x.p);
  $("recommendationSlider").innerHTML = scores.length ? scores.map(card).join("") :
    '<div class="empty-state">Tavsiyalar uchun mahsulotlarni ko‘ring.</div>';
}
function startAutoSlider(){
  clearInterval(sliderTimer);
  const slider = $("bestsellerSlider");
  if(!slider || slider.children.length<2) return;
  sliderTimer = setInterval(()=>{
    const amount = Math.min(330,slider.clientWidth*.8);
    if(slider.scrollLeft+slider.clientWidth>=slider.scrollWidth-10)
      slider.scrollTo({left:0,behavior:"smooth"});
    else slider.scrollBy({left:amount,behavior:"smooth"});
  },4500);
}
function galleryRender(index=0){
  galleryIndex = (index+gallery.length)%gallery.length;
  const main = $("modalMainImage");
  if(main) main.src = img(gallery[galleryIndex]);
  document.querySelectorAll(".gallery-thumb").forEach((thumb,i)=>thumb.classList.toggle("active",i===galleryIndex));
}
function loadReviews(productId){
  reviewsUnsubscribe?.();
  const q = query(
    collection(db,"reviews"),
    where("productId","==",productId),
    where("status","==","approved"),
    orderBy("createdAt","desc"),
    limit(20)
  );
  reviewsUnsubscribe = onSnapshot(q,snapshot=>{
    const reviews = snapshot.docs.map(d=>({id:d.id,...d.data()}));
    $("reviewsList").innerHTML = reviews.length ? reviews.map(r=>`
      <article class="review-item">
        <div><strong>${esc(r.name)}</strong><span>${"★".repeat(Number(r.rating||0))}</span></div>
        <p>${esc(r.text)}</p>
      </article>`).join("") : '<p class="muted-text">Hozircha izoh yo‘q.</p>';
    const avg = reviews.length ? reviews.reduce((s,r)=>s+Number(r.rating||0),0)/reviews.length : 0;
    $("reviewsAverage").textContent = `${avg.toFixed(1)} ★`;
  },error=>{
    console.error(error);
    $("reviewsList").innerHTML = '<p class="muted-text">Izohlarni yuklashda xatolik.</p>';
  });
}
function detail(p){
  currentProduct = p;
  saveViewed(p.id);
  renderRecommendations();
  gallery = images(p);
  if(!gallery.length) gallery = [""];
  const off = discount(p);
  $("productModalContent").innerHTML = `<div class="modal-product-grid">
    <div class="product-gallery">
      <img id="modalMainImage" class="modal-main-image zoomable-image" src="${esc(img(gallery[0]))}" alt="${esc(p.name)}">
      <div class="gallery-thumbs">${gallery.map((name,i)=>`<button class="gallery-thumb ${i===0?"active":""}" data-gallery-index="${i}" type="button"><img src="${esc(img(name))}" alt=""></button>`).join("")}</div>
    </div>
    <div>
      <span class="category-badge">${esc(p.category||"Boshqa")}</span>
      ${p.isNew?'<span class="inline-new-badge">YANGI</span>':""}
      ${off?`<span class="inline-discount">-${off}%</span>`:""}
      <h2>${esc(p.name)}</h2>
      ${p.sku?`<p class="sku-detail">Mahsulot kodi: ${esc(p.sku)}</p>`:""}
      <p>${esc(p.description||"")}</p>
      <div class="price-row modal-price"><strong>${esc(p.price)}</strong>${p.oldPrice?`<del>${esc(p.oldPrice)}</del>`:""}</div>
      ${p.material?`<p><b>Material:</b> ${esc(p.material)}</p>`:""}
      ${p.colors?.length?`<div class="option-group"><b>Ranglar:</b><div>${chips(p.colors,"color-chip")}</div></div>`:""}
      ${p.sizes?.length?`<div class="option-group"><b>O‘lchamlar:</b><div>${chips(p.sizes)}</div></div>`:""}
      <p><b>Holati:</b> ${p.soldOut||Number(p.stock)===0?"Sotuvda yo‘q":`Omborda ${Number(p.stock??1)} ta`}</p>
      <div class="button-row">
        ${p.video?`<a class="button button-dark" target="_blank" rel="noopener" href="${esc(p.video)}">Videoni ko‘rish</a>`:""}
        <button class="button button-gold" data-cart="${p.id}" type="button">Savatchaga qo‘shish</button>
      </div>
    </div>
  </div>`;
  loadReviews(p.id);
  $("productModal").showModal();
}
$("reviewForm").onsubmit = async event=>{
  event.preventDefault();
  if(!currentProduct) return;
  try{
    await addDoc(collection(db,"reviews"),{
      productId:currentProduct.id,
      productName:currentProduct.name,
      name:$("reviewName").value.trim(),
      rating:Number($("reviewRating").value),
      text:$("reviewText").value.trim(),
      status:"pending",
      createdAt:serverTimestamp()
    });
    $("reviewForm").reset();
    showToast("Izoh yuborildi. Tasdiqlangach ko‘rinadi.");
  }catch(error){
    console.error(error);
    showToast("Izoh yuborilmadi.");
  }
};
$("productModalContent").onclick = event=>{
  const thumb = event.target.closest("[data-gallery-index]");
  if(thumb) galleryRender(Number(thumb.dataset.galleryIndex));
  const zoom = event.target.closest(".zoomable-image");
  if(zoom){$("imageZoomView").src=zoom.src;$("imageZoomDialog").showModal()}
};
$("lightboxPrev").onclick=()=>galleryRender(galleryIndex-1);
$("lightboxNext").onclick=()=>galleryRender(galleryIndex+1);
$("imageZoomClose").onclick=()=>$("imageZoomDialog").close();

function showList(type){
  const ids = type==="favorites" ? favorites : cart;
  const list = ids.map(id=>products.find(p=>p.id===id)).filter(Boolean);
  $("listModalContent").innerHTML = `<h2>${type==="favorites"?"Sevimli mahsulotlar":"Savatcha"}</h2>` +
    (list.length ? list.map(p=>`<div class="list-product">
      <img src="${esc(mainImage(p))}" alt="">
      <div><b>${esc(p.name)}</b><span>${esc(p.price)}</span></div>
      <button data-remove-list="${type}" data-id="${p.id}" type="button">Olib tashlash</button>
    </div>`).join("") : "<p>Hozircha bo‘sh.</p>");
  $("cartCheckoutButton").hidden = type!=="cart" || !list.length;
  if(type==="cart" && list.length){
    const total = list.reduce((sum,p)=>sum+numericPrice(p.price),0);
    $("cartSummary").hidden=false;
    $("cartSummary").innerHTML=`<strong>Jami:</strong><span>${total.toLocaleString("uz-UZ")} so‘m</span>`;
  }else{
    $("cartSummary").hidden=true;
  }
  $("listModal").showModal();
}
async function createOrder(){
  const list = cart.map(id=>products.find(p=>p.id===id)).filter(Boolean);
  if(!list.length) return;
  const name = prompt("Ismingiz:");
  if(!name) return;
  const phone = prompt("Telefon raqamingiz:");
  if(!phone) return;
  const total = list.reduce((sum,p)=>sum+numericPrice(p.price),0);
  try{
    await addDoc(collection(db,"orders"),{
      customerName:name,
      phone,
      items:list.map(p=>({id:p.id,name:p.name,price:p.price,image:mainImage(p)})),
      total,
      status:"new",
      createdAt:serverTimestamp()
    });
    const message = `Assalomu alaykum! Buyurtma:\n\n${list.map((p,i)=>`${i+1}. ${p.name} — ${p.price}`).join("\n")}\n\nJami: ${total.toLocaleString("uz-UZ")} so‘m\nIsm: ${name}\nTelefon: ${phone}`;
    window.open(`https://t.me/ibratmebel8909?text=${encodeURIComponent(message)}`,"_blank","noopener");
    cart=[];sync();showToast("Buyurtma saqlandi");
    $("listModal").close();
  }catch(error){
    console.error(error);
    showToast("Buyurtma yuborilmadi");
  }
}
document.addEventListener("click",event=>{
  const favorite = event.target.closest("[data-favorite]");
  const add = event.target.closest("[data-cart]");
  const details = event.target.closest("[data-detail]");
  const categoryCard = event.target.closest("[data-category-card]");
  if(favorite){
    const id=favorite.dataset.favorite;
    favorites=favorites.includes(id)?favorites.filter(x=>x!==id):[...favorites,id];
    sync();renderCatalog();renderFeatured();renderBestsellers();renderRecommendations();
    showToast(favorites.includes(id)?"Sevimlilarga qo‘shildi":"Sevimlilardan olib tashlandi");
  }
  if(add){
    const id=add.dataset.cart;
    if(!cart.includes(id)) cart.push(id);
    sync();add.textContent="Qo‘shildi ✓";showToast("Savatchaga qo‘shildi");
  }
  if(details){
    const p=products.find(x=>x.id===details.dataset.detail);
    if(p) detail(p);
  }
  if(categoryCard){
    $("catalogCategory").value = categoryCard.dataset.categoryCard;
    renderCatalog();
    document.querySelector("#katalog")?.scrollIntoView({behavior:"smooth"});
  }
});
$("favoritesButton").onclick=()=>showList("favorites");
$("cartButton").onclick=()=>showList("cart");
$("modalClose").onclick=()=>{$("productModal").close();reviewsUnsubscribe?.()};
$("listModalClose").onclick=()=>$("listModal").close();
$("listModalContent").onclick=event=>{
  const button=event.target.closest("[data-remove-list]");
  if(!button)return;
  if(button.dataset.removeList==="favorites") favorites=favorites.filter(x=>x!==button.dataset.id);
  else cart=cart.filter(x=>x!==button.dataset.id);
  sync();showList(button.dataset.removeList);renderCatalog();renderFeatured();renderRecommendations();
};
$("cartCheckoutButton").onclick=createOrder;

["catalogSearch","minPrice","maxPrice"].forEach(id=>$(id).oninput=renderCatalog);
["catalogCategory","catalogSort","stockFilter"].forEach(id=>$(id).onchange=renderCatalog);

$("themeToggle").onclick=()=>{
  const dark = document.documentElement.classList.toggle("dark-theme");
  localStorage.setItem("ibratTheme", dark?"dark":"light");
  $("themeToggle").textContent = dark?"☀️":"🌙";
};
if(localStorage.getItem("ibratTheme")==="dark"){
  document.documentElement.classList.add("dark-theme");
  $("themeToggle").textContent="☀️";
}

$("downloadPdfButton").onclick=()=>{
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  doc.setFontSize(18);
  doc.text("IBRAT MEBEL KATALOGI",14,18);
  doc.setFontSize(10);
  let y=30;
  sortedProducts(filteredProducts()).forEach((p,i)=>{
    if(y>280){doc.addPage();y=20}
    doc.text(`${i+1}. ${p.name}`,14,y);
    doc.text(`${p.category||"Boshqa"} | ${p.price}`,14,y+6);
    if(p.description) doc.text(doc.splitTextToSize(p.description,175),14,y+12);
    y += 28;
  });
  doc.save("ibrat-mebel-katalog.pdf");
};

onSnapshot(query(collection(db,"products"),orderBy("createdAt","desc")),snapshot=>{
  products=snapshot.docs.map(d=>({id:d.id,...d.data()}));
  renderCategories();sync();renderCatalog();renderFeatured();renderBestsellers();renderRecommendations();
},error=>{
  console.error(error);
  $("catalogGrid").innerHTML='<div class="empty-state">Mahsulotlarni yuklashda xatolik.</div>';
});

$("buyurtma").onsubmit=event=>{
  event.preventDefault();
  const text=encodeURIComponent(`Assalomu alaykum!\nIsm: ${$("customerName").value.trim()}\nTelefon: ${$("customerPhone").value.trim()}\nXizmat: ${$("customerService").value}\nIzoh: ${$("customerMessage").value.trim()}`);
  window.open(`https://t.me/ibratmebel8909?text=${text}`,"_blank","noopener");
};
