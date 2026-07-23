import { db } from "./firebase-config.js";
import { collection, onSnapshot, query, orderBy } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

const $=id=>document.getElementById(id);
let laminates=[],edges=[],products=[],orders=[];
let cart=JSON.parse(localStorage.getItem("v11Cart")||"[]");
let favorites=JSON.parse(localStorage.getItem("v11Favorites")||"[]");

function esc(v=""){return String(v).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;")}
function money(v){return Number(v||0).toLocaleString("uz-UZ")+" so‘m"}
function img(x){return x.image||x.imageUrl||(x.imageName?`./images/${encodeURIComponent(x.imageName)}`:"./logo.png")}
function toast(m){const t=$("toast");t.textContent=m;t.classList.add("show");clearTimeout(t._);t._=setTimeout(()=>t.classList.remove("show"),2300)}
function save(){localStorage.setItem("v11Cart",JSON.stringify(cart));localStorage.setItem("v11Favorites",JSON.stringify(favorites));$("cartCount").textContent=cart.length;$("favoriteCount").textContent=favorites.length}
function itemKey(type,id){return `${type}:${id}`}
function getItem(key){const [type,id]=key.split(":");const list=type==="laminate"?laminates:type==="edge"?edges:products;const x=list.find(v=>v.id===id);return x?{...x,type}:null}
function toggleFavorite(type,id){const key=itemKey(type,id);favorites=favorites.includes(key)?favorites.filter(x=>x!==key):[...favorites,key];save();renderAll();toast(favorites.includes(key)?"Sevimlilarga qo‘shildi":"Sevimlilardan olindi")}
function addCart(type,id){const key=itemKey(type,id);if(!cart.includes(key))cart.push(key);save();toast("Savatchaga qo‘shildi")}
function stockClass(x){return Number(x.stock)<=Number(x.minStock||0)?"low":""}

function laminateCard(x){return `<article class="v11-market-card">
  <div class="v11-market-image"><img loading="lazy" src="${esc(img(x))}" alt="${esc(x.name)}"><span class="code">${esc(x.code||"KODSIZ")}</span><button class="fav ${favorites.includes(itemKey("laminate",x.id))?"active":""}" data-fav-type="laminate" data-fav-id="${x.id}" type="button">♥</button></div>
  <div class="v11-market-body"><small>${esc(x.brand||"Brend ko‘rsatilmagan")}</small><h3>${esc(x.name||"Laminat")}</h3>
  <div class="v11-market-meta"><span>Rang: ${esc(x.color||x.name||"-")}</span><span>Qalinlik: ${esc(x.thickness||"-")} mm</span><span>O‘lcham: ${esc(x.size||"-")}</span><span>Joy: ${esc(x.location||"-")}</span></div>
  <div class="v11-market-price"><strong>${money(x.salePrice)}</strong><span class="v11-stock ${stockClass(x)}">${Number(x.stock||0)} list</span></div>
  <div class="v11-card-actions"><button data-telegram-type="laminate" data-telegram-id="${x.id}" type="button">Telegram</button><button data-cart-type="laminate" data-cart-id="${x.id}" type="button">Savatchaga</button></div></div>
</article>`}

function edgeCard(x){return `<article class="v11-market-card">
  <div class="v11-market-image"><img loading="lazy" src="${esc(img(x))}" alt="${esc(x.name)}"><span class="code">${esc(x.code||"KODSIZ")}</span><button class="fav ${favorites.includes(itemKey("edge",x.id))?"active":""}" data-fav-type="edge" data-fav-id="${x.id}" type="button">♥</button></div>
  <div class="v11-market-body"><small>${esc(x.brand||"Brend ko‘rsatilmagan")}</small><h3>${esc(x.name||"Kromka")}</h3>
  <div class="v11-market-meta"><span>Qalinlik: ${esc(x.thickness||"-")} mm</span><span>Eni: ${esc(x.width||"-")} mm</span><span>Mos laminat: ${esc(x.matchingLaminate||"-")}</span><span>Joy: ${esc(x.location||"-")}</span></div>
  <div class="v11-market-price"><strong>${money(x.salePrice)} / m</strong><span class="v11-stock ${stockClass(x)}">${Number(x.stock||0)} m</span></div>
  <div class="v11-card-actions"><button data-telegram-type="edge" data-telegram-id="${x.id}" type="button">Telegram</button><button data-cart-type="edge" data-cart-id="${x.id}" type="button">Savatchaga</button></div></div>
</article>`}

function renderLaminates(){
  const s=$("laminateSearch").value.toLowerCase(),brand=$("laminateBrandFilter").value,th=$("laminateThicknessFilter").value,stock=$("laminateStockFilter").value;
  const list=laminates.filter(x=>{
    const low=Number(x.stock)<=Number(x.minStock||0),available=Number(x.stock)>0;
    return(!s||`${x.code} ${x.name} ${x.brand} ${x.color}`.toLowerCase().includes(s))&&(!brand||x.brand===brand)&&(!th||String(x.thickness)===th)&&(!stock||(stock==="available"&&available)||(stock==="low"&&low));
  });
  $("laminateGrid").innerHTML=list.length?list.map(laminateCard).join(""):'<div class="v11-empty">Laminat topilmadi.</div>';
  const brands=[...new Set(laminates.map(x=>x.brand).filter(Boolean))].sort();const current=$("laminateBrandFilter").value;$("laminateBrandFilter").innerHTML='<option value="">Barcha brendlar</option>'+brands.map(x=>`<option value="${esc(x)}">${esc(x)}</option>`).join("");$("laminateBrandFilter").value=current;
}
function renderEdges(){
  const s=$("edgeSearch").value.toLowerCase(),th=$("edgeThicknessFilter").value,w=$("edgeWidthFilter").value,stock=$("edgeStockFilter").value;
  const list=edges.filter(x=>{const low=Number(x.stock)<=Number(x.minStock||0),available=Number(x.stock)>0;return(!s||`${x.code} ${x.name} ${x.brand}`.toLowerCase().includes(s))&&(!th||String(x.thickness)===th)&&(!w||String(x.width)===w)&&(!stock||(stock==="available"&&available)||(stock==="low"&&low))});
  $("edgeGrid").innerHTML=list.length?list.map(edgeCard).join(""):'<div class="v11-empty">Kromka topilmadi.</div>';
}
function renderFurniture(){
  $("furnitureGrid").innerHTML=products.length?products.filter(x=>x.status!=="hidden").slice(0,8).map(x=>`<article class="v11-furniture-card"><img loading="lazy" src="${esc(img(x))}" alt="${esc(x.name)}"><div><h3>${esc(x.name)}</h3><strong>${esc(x.price||"Narx kelishiladi")}</strong></div></article>`).join(""):'<div class="v11-empty">Mebellar hali qo‘shilmagan.</div>';
}
function renderStats(){$("heroLaminateCount").textContent=laminates.length;$("heroEdgeCount").textContent=edges.length;const t=new Date().toISOString().slice(0,10);$("heroOrderCount").textContent=orders.filter(x=>(x.date||"")===t).length}
function renderAll(){renderLaminates();renderEdges();renderFurniture();renderStats();save()}

function openDrawer(mode){
  const keys=mode==="favorites"?favorites:cart;$("drawerTitle").textContent=mode==="favorites"?"Sevimlilar":"Savatcha";
  const list=keys.map(getItem).filter(Boolean);
  $("drawerContent").innerHTML=list.length?list.map(x=>`<article class="v11-drawer-item"><div><strong>${esc(x.code||"")} ${esc(x.name||"")}</strong><span>${money(x.salePrice||x.price)}</span></div><button data-remove-key="${itemKey(x.type,x.id)}" data-mode="${mode}" type="button">×</button></article>`).join(""):'<div class="v11-empty">Hozircha bo‘sh.</div>';
  if(mode==="cart"&&list.length){$("drawerFooter").innerHTML='<button class="v11-primary" id="cartCheckout" type="button">Telegram orqali buyurtma</button>';$("cartCheckout").onclick=()=>{const text=`Assalomu alaykum!\n\n${list.map((x,i)=>`${i+1}. ${x.code||""} ${x.name||""} — ${money(x.salePrice||x.price)}`).join("\n")}`;window.open(`https://t.me/ibratmebel8909?text=${encodeURIComponent(text)}`,"_blank","noopener")}}else $("drawerFooter").innerHTML="";
  $("drawer").classList.add("open");$("drawerOverlay").classList.add("show");
}
function closeDrawer(){$("drawer").classList.remove("open");$("drawerOverlay").classList.remove("show")}

document.addEventListener("click",e=>{
  const f=e.target.closest("[data-fav-type]"),c=e.target.closest("[data-cart-type]"),t=e.target.closest("[data-telegram-type]"),s=e.target.closest("[data-service]");
  if(f)toggleFavorite(f.dataset.favType,f.dataset.favId);
  if(c)addCart(c.dataset.cartType,c.dataset.cartId);
  if(t){const x=(t.dataset.telegramType==="laminate"?laminates:edges).find(v=>v.id===t.dataset.telegramId);if(x){const unit=t.dataset.telegramType==="laminate"?"list":"metr";const text=`Assalomu alaykum!\n${t.dataset.telegramType==="laminate"?"Laminat":"Kromka"} buyurtma qilmoqchiman.\nKod: ${x.code||""}\nNomi: ${x.name||""}\nNarxi: ${money(x.salePrice)} / ${unit}\nQoldiq: ${x.stock||0} ${unit}`;window.open(`https://t.me/ibratmebel8909?text=${encodeURIComponent(text)}`,"_blank","noopener")}}
  if(s){$("contactDirection").value=s.dataset.service==="Kesish"?"Laminat kesish":s.dataset.service==="Kromka"?"Kromka yopishtirish":s.dataset.service==="Teshish"?"Bazis teshish":s.dataset.service;document.querySelector("#aloqa").scrollIntoView({behavior:"smooth"})}
});
$("cartButton").onclick=()=>openDrawer("cart");$("favoriteButton").onclick=()=>openDrawer("favorites");$("drawerClose").onclick=closeDrawer;$("drawerOverlay").onclick=closeDrawer;
$("drawerContent").onclick=e=>{const b=e.target.closest("[data-remove-key]");if(!b)return;if(b.dataset.mode==="cart")cart=cart.filter(x=>x!==b.dataset.removeKey);else favorites=favorites.filter(x=>x!==b.dataset.removeKey);save();openDrawer(b.dataset.mode)};
$("menuButton").onclick=()=>$("mainNav").classList.toggle("open");
$("themeToggle").onclick=()=>{document.documentElement.classList.toggle("v11-night");localStorage.setItem("v11Theme",document.documentElement.classList.contains("v11-night")?"dark":"light");$("themeToggle").textContent=document.documentElement.classList.contains("v11-night")?"☀":"☾"};
if(localStorage.getItem("v11Theme")==="dark"){document.documentElement.classList.add("v11-night");$("themeToggle").textContent="☀"}

["laminateSearch"].forEach(id=>$(id).oninput=renderLaminates);["laminateBrandFilter","laminateThicknessFilter","laminateStockFilter"].forEach(id=>$(id).onchange=renderLaminates);
$("edgeSearch").oninput=renderEdges;["edgeThicknessFilter","edgeWidthFilter","edgeStockFilter"].forEach(id=>$(id).onchange=renderEdges);

function calc(){
  const sheets=Number($("calcSheets").value||0),cut=Number($("calcCutPrice").value||0),m=Number($("calcEdgeMeters").value||0),ep=Number($("calcEdgePrice").value||0),d=Number($("calcDrilling").value||0),extra=Number($("calcExtra").value||0),total=sheets*cut+m*ep+d+extra;
  $("calcTotal").textContent=money(total);
  if(sheets>=10||m>=100){$("serviceAdvice").textContent="Ulgurji buyurtma";$("serviceAdviceText").textContent="Buyurtma hajmi katta. Menejer bilan maxsus narxni kelishish foydali bo‘ladi."}
  else if(sheets||m||d){$("serviceAdvice").textContent="Standart servis buyurtmasi";$("serviceAdviceText").textContent="Hisob-kitob tayyor. Fayllarni oldindan yuborsangiz, ish tezroq boshlanadi."}
  else{$("serviceAdvice").textContent="Ma’lumot kiriting";$("serviceAdviceText").textContent="List, kromka va teshish miqdorini kiritsangiz, tizim amaliy tavsiya beradi."}
  return total;
}
["calcSheets","calcCutPrice","calcEdgeMeters","calcEdgePrice","calcDrilling","calcExtra"].forEach(id=>$(id).oninput=calc);
$("calcPdfButton").onclick=()=>{const {jsPDF}=window.jspdf,d=new jsPDF();d.setFontSize(17);d.text("BUVAYDA IBRAT MEBEL",14,18);d.setFontSize(11);d.text("SERVIS HISOB-KITOBI",14,28);d.text(`List: ${$("calcSheets").value}`,14,42);d.text(`Kromka metri: ${$("calcEdgeMeters").value}`,14,50);d.text(`Teshish: ${money($("calcDrilling").value)}`,14,58);d.text(`Jami: ${money(calc())}`,14,72);d.save("ibrat-servis-hisob.pdf")};
$("calcTelegramButton").onclick=()=>{const text=`Assalomu alaykum!\nServis hisob-kitobi:\nList: ${$("calcSheets").value}\nKromka: ${$("calcEdgeMeters").value} m\nTeshish: ${money($("calcDrilling").value)}\nJami: ${money(calc())}`;window.open(`https://t.me/ibratmebel8909?text=${encodeURIComponent(text)}`,"_blank","noopener")};
$("laminatePdfButton").onclick=()=>{const {jsPDF}=window.jspdf,d=new jsPDF();d.setFontSize(17);d.text("BUVAYDA IBRAT MEBEL — LAMINAT KATALOGI",14,18);d.setFontSize(9);let y=30;laminates.forEach((x,i)=>{if(y>280){d.addPage();y=20}d.text(`${i+1}. ${x.code||""} ${x.name||""} | ${x.brand||""} | ${money(x.salePrice)} | ${x.stock||0} list`,14,y);y+=8});d.save("laminat-katalog.pdf")};
$("contactForm").onsubmit=e=>{e.preventDefault();const text=`Assalomu alaykum!\nIsm: ${$("contactName").value}\nTelefon: ${$("contactPhone").value}\nYo‘nalish: ${$("contactDirection").value}\nIzoh: ${$("contactMessage").value}`;window.open(`https://t.me/ibratmebel8909?text=${encodeURIComponent(text)}`,"_blank","noopener")};
$("projectFile").onchange=e=>{const file=e.target.files[0];if(file)toast(`${file.name} tanlandi. Telegram chatida faylni biriktiring.`)};

onSnapshot(query(collection(db,"laminates"),orderBy("createdAt","desc")),s=>{laminates=s.docs.map(d=>({id:d.id,...d.data()}));renderAll()},console.error);
onSnapshot(query(collection(db,"edges"),orderBy("createdAt","desc")),s=>{edges=s.docs.map(d=>({id:d.id,...d.data()}));renderAll()},console.error);
onSnapshot(query(collection(db,"products"),orderBy("createdAt","desc")),s=>{products=s.docs.map(d=>({id:d.id,...d.data()}));renderAll()},console.error);
onSnapshot(query(collection(db,"orders"),orderBy("createdAt","desc")),s=>{orders=s.docs.map(d=>({id:d.id,...d.data()}));renderStats()},console.error);
save();
