import { db } from "./firebase-config.js";
import { collection, addDoc, onSnapshot, query, orderBy, serverTimestamp, where, limit } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

const $ = id => document.getElementById(id);
let products = [];
let favorites = JSON.parse(localStorage.getItem("ibratFavorites") || "[]");
let cart = JSON.parse(localStorage.getItem("ibratCart") || "[]");
let viewed = JSON.parse(localStorage.getItem("ibratViewed") || "[]");
let currentProduct = null;
let gallery = [];
let galleryIndex = 0;
let visibleCount = 8;
let reviewsUnsubscribe = null;
let drawerMode = "cart";

function esc(v=""){return String(v).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;")}
function imageUrl(name=""){const clean=String(name).replace(/^images\//,"");return clean?`./images/${encodeURIComponent(clean).replaceAll("%2F","/")}`:"./logo.png"}
function images(p={}){if(Array.isArray(p.images)&&p.images.length)return p.images.slice(0,10);if(p.imageName)return[p.imageName];return[]}
function mainImage(p){const list=images(p);return list.length?imageUrl(list[0]):(p.image||"./logo.png")}
function numberPrice(value=""){const n=Number(String(value).replace(/[^\d]/g,""));return Number.isFinite(n)?n:0}
function discount(p){const old=numberPrice(p.oldPrice),now=numberPrice(p.price);return old>now&&now>0?Math.round((old-now)/old*100):0}
function activeProducts(){return products.filter(p=>p.status!=="hidden")}
function toast(message){const t=$("siteToast");t.textContent=message;t.classList.add("show");clearTimeout(t._timer);t._timer=setTimeout(()=>t.classList.remove("show"),2500)}
function saveState(){localStorage.setItem("ibratFavorites",JSON.stringify(favorites));localStorage.setItem("ibratCart",JSON.stringify(cart));localStorage.setItem("ibratViewed",JSON.stringify(viewed));$("favoritesCount").textContent=favorites.length;$("cartCount").textContent=cart.length}
function cleanState(){const ids=new Set(products.map(p=>p.id));favorites=favorites.filter(id=>ids.has(id));cart=cart.filter(id=>ids.has(id));viewed=viewed.filter(id=>ids.has(id));saveState()}
function markViewed(id){viewed=[id,...viewed.filter(x=>x!==id)].slice(0,20);saveState()}
function sorted(list){
  const mode=$("catalogSort").value;
  const copy=[...list];
  if(mode==="newest")return copy.sort((a,b)=>(b.createdAt?.seconds||0)-(a.createdAt?.seconds||0));
  if(mode==="popular")return copy.sort((a,b)=>Number(b.salesCount||0)-Number(a.salesCount||0));
  if(mode==="price-low")return copy.sort((a,b)=>numberPrice(a.price)-numberPrice(b.price));
  if(mode==="price-high")return copy.sort((a,b)=>numberPrice(b.price)-numberPrice(a.price));
  return copy.sort((a,b)=>Number(Boolean(b.featured))-Number(Boolean(a.featured))||Number(a.sortOrder||0)-Number(b.sortOrder||0));
}
function filterProducts(){
  const search=$("catalogSearch").value.trim().toLowerCase();
  const category=$("catalogCategory").value;
  const stock=$("stockFilter").value;
  return activeProducts().filter(p=>{
    const text=`${p.name} ${p.category} ${p.description} ${p.material||""} ${(p.colors||[]).join(" ")}`.toLowerCase();
    const sold=p.soldOut||Number(p.stock)===0;
    return(!search||text.includes(search))&&(!category||p.category===category)&&(!stock||(stock==="available"&&!sold)||(stock==="low"&&!sold&&Number(p.stock)<=3)||(stock==="sold"&&sold));
  });
}
function productCard(p){
  const sold=p.soldOut||Number(p.stock)===0;
  const fav=favorites.includes(p.id);
  const off=discount(p);
  return `<article class="premium-product-card">
    <div class="premium-product-image">
      <img loading="lazy" src="${esc(mainImage(p))}" alt="${esc(p.name)}">
      <div class="product-badges">${p.isNew?'<span>YANGI</span>':""}${p.featured?'<span class="dark-badge">TOP</span>':""}${off?`<span class="sale-badge">-${off}%</span>`:""}</div>
      <button class="favorite-heart ${fav?"active":""}" data-favorite="${p.id}" type="button">♥</button>
      ${images(p).length>1?`<span class="photo-count">${images(p).length} rasm</span>`:""}
    </div>
    <div class="premium-product-info">
      <div class="product-category-line"><span>${esc(p.category||"Boshqa")}</span>${p.sku?`<small>#${esc(p.sku)}</small>`:""}</div>
      <h3>${esc(p.name)}</h3>
      <p>${esc(p.description||"Sifatli va zamonaviy mebel.")}</p>
      <div class="premium-price"><strong>${esc(p.price)}</strong>${p.oldPrice?`<del>${esc(p.oldPrice)}</del>`:""}</div>
      <div class="availability ${sold?"sold":Number(p.stock)<=3?"low":""}">${sold?"Sotuvda yo‘q":Number(p.stock)<=3?`Faqat ${Number(p.stock)} ta qoldi`:"Omborda mavjud"}</div>
      <div class="card-buttons"><button data-detail="${p.id}" type="button">Batafsil</button><button class="green-card-button" data-cart="${p.id}" type="button" ${sold?"disabled":""}>Savatchaga</button></div>
    </div>
  </article>`;
}
function renderCategories(){
  const counts={};
  activeProducts().forEach(p=>counts[p.category||"Boshqa"]=(counts[p.category||"Boshqa"]||0)+1);
  const cats=Object.keys(counts).sort();
  $("catalogCategory").innerHTML='<option value="">Barcha kategoriyalar</option>'+cats.map(c=>`<option value="${esc(c)}">${esc(c)}</option>`).join("");
  $("categoryGrid").innerHTML=cats.length?cats.slice(0,8).map(c=>{
    const sample=activeProducts().find(p=>p.category===c);
    return `<button class="premium-category-card" data-category="${esc(c)}" type="button"><img src="${esc(sample?mainImage(sample):"./logo.png")}" alt="${esc(c)}"><span><strong>${esc(c)}</strong><small>${counts[c]} ta mahsulot</small></span><b>→</b></button>`;
  }).join(""):'<div class="premium-empty">Kategoriya topilmadi.</div>';
}
function renderCatalog(){
  const all=sorted(filterProducts());
  const shown=all.slice(0,visibleCount);
  $("catalogCount").textContent=`${all.length} ta mahsulot`;
  $("catalogGrid").innerHTML=shown.length?shown.map(productCard).join(""):'<div class="premium-empty">Mos mahsulot topilmadi.</div>';
  $("loadMoreButton").hidden=shown.length>=all.length;
  renderActiveFilters();
}
function renderActiveFilters(){
  const tags=[];
  if($("catalogSearch").value)tags.push(`Qidiruv: ${$("catalogSearch").value}`);
  if($("catalogCategory").value)tags.push($("catalogCategory").value);
  if($("stockFilter").value)tags.push($("stockFilter").selectedOptions[0].text);
  $("activeFilters").innerHTML=tags.map(t=>`<span>${esc(t)}</span>`).join("");
}
function renderFeatured(){
  const list=sorted(activeProducts()).filter(p=>p.featured).slice(0,10);
  $("featuredSlider").innerHTML=list.length?list.map(productCard).join(""):'<div class="premium-empty">Top mahsulotlar hali belgilanmagan.</div>';
  const hero=list[0]||activeProducts()[0];
  if(hero){$("heroProductImage").src=mainImage(hero);$("heroProductName").textContent=hero.name;$("heroProductButton").dataset.detail=hero.id}
}
function renderRecommendations(){
  const categoryScore={};
  [...favorites,...viewed].forEach(id=>{const p=products.find(x=>x.id===id);if(p?.category)categoryScore[p.category]=(categoryScore[p.category]||0)+1});
  const list=activeProducts().filter(p=>!favorites.includes(p.id)).map(p=>({p,score:(categoryScore[p.category]||0)*5+Number(p.featured?3:0)+Number(p.salesCount||0)/10})).sort((a,b)=>b.score-a.score).slice(0,8).map(x=>x.p);
  $("recommendationSlider").innerHTML=list.length?list.map(productCard).join(""):'<div class="premium-empty">Mahsulotlarni ko‘rganingizdan so‘ng tavsiyalar paydo bo‘ladi.</div>';
}
function showDrawer(mode){
  drawerMode=mode;
  $("drawerTitle").textContent=mode==="cart"?"Savatcha":"Sevimlilar";
  const ids=mode==="cart"?cart:favorites;
  const list=ids.map(id=>products.find(p=>p.id===id)).filter(Boolean);
  $("drawerContent").innerHTML=list.length?list.map(p=>`<article class="drawer-item"><img src="${esc(mainImage(p))}" alt=""><div><strong>${esc(p.name)}</strong><span>${esc(p.price)}</span></div><button data-drawer-remove="${p.id}" type="button">×</button></article>`).join(""):'<div class="premium-empty">Hozircha bo‘sh.</div>';
  if(mode==="cart"&&list.length){const total=list.reduce((s,p)=>s+numberPrice(p.price),0);$("drawerFooter").innerHTML=`<div class="drawer-total"><span>Jami</span><strong>${total.toLocaleString("uz-UZ")} so‘m</strong></div><button class="drawer-checkout" id="drawerCheckout" type="button">Buyurtma berish</button>`;$("drawerCheckout").onclick=checkout}else{$("drawerFooter").innerHTML=""}
  $("sideDrawer").classList.add("open");$("drawerOverlay").classList.add("show");$("sideDrawer").setAttribute("aria-hidden","false");
}
function closeDrawer(){$("sideDrawer").classList.remove("open");$("drawerOverlay").classList.remove("show");$("sideDrawer").setAttribute("aria-hidden","true")}
async function checkout(){
  const list=cart.map(id=>products.find(p=>p.id===id)).filter(Boolean);if(!list.length)return;
  const name=prompt("Ismingiz:");if(!name)return;const phone=prompt("Telefon raqamingiz:");if(!phone)return;
  const total=list.reduce((s,p)=>s+numberPrice(p.price),0);
  try{await addDoc(collection(db,"orders"),{customerName:name,phone,items:list.map(p=>({id:p.id,name:p.name,price:p.price,image:mainImage(p)})),total,status:"new",createdAt:serverTimestamp()});const message=`Assalomu alaykum!\n\n${list.map((p,i)=>`${i+1}. ${p.name} — ${p.price}`).join("\n")}\n\nJami: ${total.toLocaleString("uz-UZ")} so‘m\nIsm: ${name}\nTelefon: ${phone}`;window.open(`https://t.me/ibratmebel8909?text=${encodeURIComponent(message)}`,"_blank","noopener");cart=[];saveState();closeDrawer();toast("Buyurtma saqlandi")}catch(e){console.error(e);toast("Buyurtma yuborilmadi")}
}
function renderGallery(index=0){galleryIndex=(index+gallery.length)%gallery.length;const main=$("modalMainImage");if(main)main.src=imageUrl(gallery[galleryIndex]);document.querySelectorAll("[data-thumb]").forEach((b,i)=>b.classList.toggle("active",i===galleryIndex))}
function loadReviews(productId){
  reviewsUnsubscribe?.();
  const q=query(collection(db,"reviews"),where("productId","==",productId),where("status","==","approved"),orderBy("createdAt","desc"),limit(20));
  reviewsUnsubscribe=onSnapshot(q,s=>{const rows=s.docs.map(d=>d.data());$("reviewsList").innerHTML=rows.length?rows.map(r=>`<article class="review-item"><div><strong>${esc(r.name)}</strong><span>${"★".repeat(Number(r.rating||0))}</span></div><p>${esc(r.text)}</p></article>`).join(""):'<p class="premium-empty">Hozircha izoh yo‘q.</p>';const avg=rows.length?rows.reduce((a,r)=>a+Number(r.rating||0),0)/rows.length:0;$("reviewsAverage").textContent=`${avg.toFixed(1)} ★`},console.error);
}
function openProduct(p){
  currentProduct=p;markViewed(p.id);renderRecommendations();gallery=images(p);if(!gallery.length)gallery=[""];
  const off=discount(p);
  $("productModalContent").innerHTML=`<div class="premium-modal-grid"><div class="modal-gallery"><img id="modalMainImage" class="modal-main-image" src="${esc(imageUrl(gallery[0]))}" alt="${esc(p.name)}"><div class="modal-thumbs">${gallery.map((n,i)=>`<button data-thumb="${i}" class="${i===0?"active":""}" type="button"><img src="${esc(imageUrl(n))}" alt=""></button>`).join("")}</div></div><div class="modal-details"><span class="modal-category">${esc(p.category||"Boshqa")}</span><h2>${esc(p.name)}</h2><p>${esc(p.description||"")}</p><div class="modal-price"><strong>${esc(p.price)}</strong>${p.oldPrice?`<del>${esc(p.oldPrice)}</del>`:""}${off?`<span>-${off}%</span>`:""}</div>${p.material?`<p><b>Material:</b> ${esc(p.material)}</p>`:""}${p.colors?.length?`<div class="option-block"><b>Ranglar</b><div>${p.colors.map(x=>`<span>${esc(x)}</span>`).join("")}</div></div>`:""}${p.sizes?.length?`<div class="option-block"><b>O‘lchamlar</b><div>${p.sizes.map(x=>`<span>${esc(x)}</span>`).join("")}</div></div>`:""}<div class="modal-actions">${p.video?`<a href="${esc(p.video)}" target="_blank">Videoni ko‘rish</a>`:""}<button data-cart="${p.id}" type="button">Savatchaga qo‘shish</button></div></div></div>`;
  loadReviews(p.id);$("productModal").showModal();
}
document.addEventListener("click",e=>{
  const fav=e.target.closest("[data-favorite]"),cartBtn=e.target.closest("[data-cart]"),detail=e.target.closest("[data-detail]"),category=e.target.closest("[data-category]");
  if(fav){const id=fav.dataset.favorite;favorites=favorites.includes(id)?favorites.filter(x=>x!==id):[...favorites,id];saveState();renderCatalog();renderFeatured();renderRecommendations();toast(favorites.includes(id)?"Sevimlilarga qo‘shildi":"Sevimlilardan olib tashlandi")}
  if(cartBtn){const id=cartBtn.dataset.cart;if(!cart.includes(id))cart.push(id);saveState();cartBtn.textContent="Qo‘shildi ✓";toast("Savatchaga qo‘shildi")}
  if(detail){const p=products.find(x=>x.id===detail.dataset.detail);if(p)openProduct(p)}
  if(category){$("catalogCategory").value=category.dataset.category;visibleCount=8;renderCatalog();document.querySelector("#katalog").scrollIntoView({behavior:"smooth"})}
});
$("menuButton").onclick=()=>$("mainNav").classList.toggle("open");
$("mainNav").querySelectorAll("a").forEach(a=>a.onclick=()=>$("mainNav").classList.remove("open"));
$("favoritesButton").onclick=()=>showDrawer("favorites");
$("cartButton").onclick=()=>showDrawer("cart");
$("drawerClose").onclick=closeDrawer;$("drawerOverlay").onclick=closeDrawer;
$("drawerContent").onclick=e=>{const b=e.target.closest("[data-drawer-remove]");if(!b)return;if(drawerMode==="cart")cart=cart.filter(x=>x!==b.dataset.drawerRemove);else favorites=favorites.filter(x=>x!==b.dataset.drawerRemove);saveState();showDrawer(drawerMode);renderCatalog();renderFeatured()};
$("modalClose").onclick=()=>{$("productModal").close();reviewsUnsubscribe?.()};
$("productModalContent").onclick=e=>{const t=e.target.closest("[data-thumb]");if(t)renderGallery(Number(t.dataset.thumb));const main=e.target.closest(".modal-main-image");if(main){$("imageZoomView").src=main.src;$("imageZoomDialog").showModal()}};
$("imageZoomClose").onclick=()=>$("imageZoomDialog").close();
$("reviewForm").onsubmit=async e=>{e.preventDefault();if(!currentProduct)return;try{await addDoc(collection(db,"reviews"),{productId:currentProduct.id,productName:currentProduct.name,name:$("reviewName").value.trim(),rating:Number($("reviewRating").value),text:$("reviewText").value.trim(),status:"pending",createdAt:serverTimestamp()});$("reviewForm").reset();toast("Izoh yuborildi. Tasdiqlangach ko‘rinadi.")}catch(err){console.error(err);toast("Izoh yuborilmadi")}};
["catalogSearch"].forEach(id=>$(id).oninput=()=>{visibleCount=8;renderCatalog()});
["catalogCategory","catalogSort","stockFilter"].forEach(id=>$(id).onchange=()=>{visibleCount=8;renderCatalog()});
$("loadMoreButton").onclick=()=>{visibleCount+=8;renderCatalog()};
$("featuredPrev").onclick=()=>$("featuredSlider").scrollBy({left:-360,behavior:"smooth"});$("featuredNext").onclick=()=>$("featuredSlider").scrollBy({left:360,behavior:"smooth"});
$("themeToggle").onclick=()=>{const dark=document.documentElement.classList.toggle("premium-dark");localStorage.setItem("ibratTheme",dark?"dark":"light");$("themeToggle").textContent=dark?"☀":"☾"};
if(localStorage.getItem("ibratTheme")==="dark"){document.documentElement.classList.add("premium-dark");$("themeToggle").textContent="☀"}
$("downloadPdfButton").onclick=()=>{const {jsPDF}=window.jspdf;const doc=new jsPDF();doc.setFontSize(18);doc.text("IBRAT MEBEL KATALOGI",14,18);doc.setFontSize(10);let y=30;sorted(filterProducts()).forEach((p,i)=>{if(y>280){doc.addPage();y=20}doc.text(`${i+1}. ${p.name}`,14,y);doc.text(`${p.category||"Boshqa"} | ${p.price}`,14,y+6);y+=18});doc.save("ibrat-mebel-katalog.pdf")};
$("buyurtma").onsubmit=e=>{e.preventDefault();const text=encodeURIComponent(`Assalomu alaykum!\nIsm: ${$("customerName").value.trim()}\nTelefon: ${$("customerPhone").value.trim()}\nXizmat: ${$("customerService").value}\nIzoh: ${$("customerMessage").value.trim()}`);window.open(`https://t.me/ibratmebel8909?text=${text}`,"_blank","noopener")};

onSnapshot(query(collection(db,"products"),orderBy("createdAt","desc")),s=>{products=s.docs.map(d=>({id:d.id,...d.data()}));cleanState();renderCategories();renderFeatured();renderCatalog();renderRecommendations()},e=>{$("catalogGrid").innerHTML='<div class="premium-empty">Mahsulotlarni yuklashda xatolik.</div>';console.error(e)});
