import {loadDB,saveDB,uid,money,today} from "./local-db.js";
const $=id=>document.getElementById(id);
let db=loadDB();
let cart=JSON.parse(localStorage.getItem("v13Cart")||"[]");
let favorites=JSON.parse(localStorage.getItem("v13Favorites")||"[]");

function esc(v=""){return String(v).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;")}
function img(x){return x.image||x.imageUrl||"./logo.png"}
function key(type,id){return `${type}:${id}`}
function saveUser(){localStorage.setItem("v13Cart",JSON.stringify(cart));localStorage.setItem("v13Favorites",JSON.stringify(favorites));$("cartCount").textContent=cart.length;$("favoriteCount").textContent=favorites.length}
function toast(m){const t=$("toast");t.textContent=m;t.classList.add("show");clearTimeout(t._);t._=setTimeout(()=>t.classList.remove("show"),2200)}
function stockClass(x){return Number(x.stock)<=Number(x.minStock||0)?"low":""}
function findItem(k){const [type,id]=k.split(":");const list=type==="laminate"?db.laminates:type==="edge"?db.edges:db.products;const x=list.find(v=>v.id===id);return x?{...x,type}:null}

function laminateCard(x){return `<article class="v11-market-card">
<div class="v11-market-image"><img src="${esc(img(x))}" alt="${esc(x.name)}"><span class="code">${esc(x.code||"KODSIZ")}</span><button class="fav ${favorites.includes(key("laminate",x.id))?"active":""}" data-fav="laminate:${x.id}">♥</button></div>
<div class="v11-market-body"><small>${esc(x.brand||"Brend ko‘rsatilmagan")}</small><h3>${esc(x.name||"Laminat")}</h3>
<div class="v11-market-meta"><span>Rang: ${esc(x.color||x.name||"-")}</span><span>Qalinlik: ${esc(x.thickness||"-")} mm</span><span>O‘lcham: ${esc(x.size||"-")}</span><span>Joy: ${esc(x.location||"-")}</span></div>
<div class="v11-market-price"><strong>${money(x.salePrice)}</strong><span class="v11-stock ${stockClass(x)}">${Number(x.stock||0)} list</span></div>
<div class="v11-card-actions"><button data-telegram="laminate:${x.id}">Telegram</button><button data-cart="laminate:${x.id}">Savatchaga</button></div></div></article>`}
function edgeCard(x){return `<article class="v11-market-card">
<div class="v11-market-image"><img src="${esc(img(x))}" alt="${esc(x.name)}"><span class="code">${esc(x.code||"KODSIZ")}</span><button class="fav ${favorites.includes(key("edge",x.id))?"active":""}" data-fav="edge:${x.id}">♥</button></div>
<div class="v11-market-body"><small>${esc(x.brand||"Brend ko‘rsatilmagan")}</small><h3>${esc(x.name||"Kromka")}</h3>
<div class="v11-market-meta"><span>Qalinlik: ${esc(x.thickness||"-")} mm</span><span>Eni: ${esc(x.width||"-")} mm</span><span>Mos laminat: ${esc(x.matchingLaminate||"-")}</span><span>Joy: ${esc(x.location||"-")}</span></div>
<div class="v11-market-price"><strong>${money(x.salePrice)} / m</strong><span class="v11-stock ${stockClass(x)}">${Number(x.stock||0)} m</span></div>
<div class="v11-card-actions"><button data-telegram="edge:${x.id}">Telegram</button><button data-cart="edge:${x.id}">Savatchaga</button></div></div></article>`}

function renderLaminates(){
  const s=$("laminateSearch").value.toLowerCase(),brand=$("laminateBrandFilter").value,th=$("laminateThicknessFilter").value,stock=$("laminateStockFilter").value;
  const list=db.laminates.filter(x=>{const low=Number(x.stock)<=Number(x.minStock||0),available=Number(x.stock)>0;return(!s||`${x.code} ${x.name} ${x.brand} ${x.color}`.toLowerCase().includes(s))&&(!brand||x.brand===brand)&&(!th||String(x.thickness)===th)&&(!stock||(stock==="available"&&available)||(stock==="low"&&low))});
  $("laminateGrid").innerHTML=list.length?list.map(laminateCard).join(""):'<div class="v11-empty">Laminatlar hali kiritilmagan.</div>';
  const brands=[...new Set(db.laminates.map(x=>x.brand).filter(Boolean))].sort(),cur=$("laminateBrandFilter").value;
  $("laminateBrandFilter").innerHTML='<option value="">Barcha brendlar</option>'+brands.map(x=>`<option value="${esc(x)}">${esc(x)}</option>`).join("");$("laminateBrandFilter").value=cur;
}
function renderEdges(){
  const s=$("edgeSearch").value.toLowerCase(),th=$("edgeThicknessFilter").value,w=$("edgeWidthFilter").value,stock=$("edgeStockFilter").value;
  const list=db.edges.filter(x=>{const low=Number(x.stock)<=Number(x.minStock||0),available=Number(x.stock)>0;return(!s||`${x.code} ${x.name} ${x.brand}`.toLowerCase().includes(s))&&(!th||String(x.thickness)===th)&&(!w||String(x.width)===w)&&(!stock||(stock==="available"&&available)||(stock==="low"&&low))});
  $("edgeGrid").innerHTML=list.length?list.map(edgeCard).join(""):'<div class="v11-empty">Kromkalar hali kiritilmagan.</div>';
}
function renderFurniture(){
  $("furnitureGrid").innerHTML=db.products.length?db.products.slice(0,8).map(x=>`<article class="v11-furniture-card"><img src="${esc(img(x))}" alt="${esc(x.name)}"><div><h3>${esc(x.name)}</h3><strong>${esc(x.price||"Narx kelishiladi")}</strong></div></article>`).join(""):'<div class="v11-empty">Mebellar hali qo‘shilmagan.</div>';
}
function renderStats(){
  $("heroLaminateCount").textContent=db.laminates.length;
  $("heroEdgeCount").textContent=db.edges.length;
  $("heroOrderCount").textContent=db.orders.filter(x=>x.date===today()).length;
}
function renderAll(){renderLaminates();renderEdges();renderFurniture();renderStats();saveUser()}

function toggleFav(k){favorites=favorites.includes(k)?favorites.filter(x=>x!==k):[...favorites,k];saveUser();renderAll();toast(favorites.includes(k)?"Sevimlilarga qo‘shildi":"Sevimlilardan olib tashlandi")}
function addCart(k){if(!cart.includes(k))cart.push(k);saveUser();toast("Savatchaga qo‘shildi")}
function openDrawer(mode){
  const keys=mode==="favorites"?favorites:cart,list=keys.map(findItem).filter(Boolean);
  $("drawerTitle").textContent=mode==="favorites"?"Sevimlilar":"Savatcha";
  $("drawerContent").innerHTML=list.length?list.map(x=>`<article class="v11-drawer-item"><div><strong>${esc(x.code||"")} ${esc(x.name||"")}</strong><span>${money(x.salePrice||x.price)}</span></div><button data-remove="${key(x.type,x.id)}" data-mode="${mode}">×</button></article>`).join(""):'<div class="v11-empty">Hozircha bo‘sh.</div>';
  $("drawerFooter").innerHTML=mode==="cart"&&list.length?'<button class="v11-primary" id="cartCheckout">Telegram orqali buyurtma</button>':"";
  if($("cartCheckout"))$("cartCheckout").onclick=()=>sendTelegram(list);
  $("drawer").classList.add("open");$("drawerOverlay").classList.add("show")
}
function sendTelegram(list){
  const username=db.settings.telegram||"ibratmebel8909";
  const text=`Assalomu alaykum!\n\n${list.map((x,i)=>`${i+1}. ${x.code||""} ${x.name||""} — ${money(x.salePrice||x.price)}`).join("\n")}`;
  window.open(`https://t.me/${username}?text=${encodeURIComponent(text)}`,"_blank","noopener")
}
function closeDrawer(){$("drawer").classList.remove("open");$("drawerOverlay").classList.remove("show")}

document.addEventListener("click",e=>{
  const f=e.target.closest("[data-fav]"),c=e.target.closest("[data-cart]"),t=e.target.closest("[data-telegram]");
  if(f)toggleFav(f.dataset.fav);
  if(c)addCart(c.dataset.cart);
  if(t){const x=findItem(t.dataset.telegram);if(x)sendTelegram([x])}
});
$("cartButton").onclick=()=>openDrawer("cart");$("favoriteButton").onclick=()=>openDrawer("favorites");$("drawerClose").onclick=closeDrawer;$("drawerOverlay").onclick=closeDrawer;
$("drawerContent").onclick=e=>{const b=e.target.closest("[data-remove]");if(!b)return;if(b.dataset.mode==="cart")cart=cart.filter(x=>x!==b.dataset.remove);else favorites=favorites.filter(x=>x!==b.dataset.remove);saveUser();openDrawer(b.dataset.mode)};
$("menuButton").onclick=()=>$("mainNav").classList.toggle("open");
$("themeToggle").onclick=()=>{document.documentElement.classList.toggle("v11-night");localStorage.setItem("v13Theme",document.documentElement.classList.contains("v11-night")?"dark":"light")};
if(localStorage.getItem("v13Theme")==="dark")document.documentElement.classList.add("v11-night");
["laminateSearch"].forEach(id=>$(id).oninput=renderLaminates);["laminateBrandFilter","laminateThicknessFilter","laminateStockFilter"].forEach(id=>$(id).onchange=renderLaminates);
$("edgeSearch").oninput=renderEdges;["edgeThicknessFilter","edgeWidthFilter","edgeStockFilter"].forEach(id=>$(id).onchange=renderEdges);

function calc(){
  const sheets=Number($("calcSheets").value||0),cut=Number($("calcCutPrice").value||0),m=Number($("calcEdgeMeters").value||0),ep=Number($("calcEdgePrice").value||0),d=Number($("calcDrilling").value||0),extra=Number($("calcExtra").value||0),total=sheets*cut+m*ep+d+extra;
  $("calcTotal").textContent=money(total);return total
}
$("calcCutPrice").value=db.settings.cutPrice||40000;$("calcEdgePrice").value=db.settings.edgePrice||0;$("calcDrilling").value=db.settings.drillPrice||0;
["calcSheets","calcCutPrice","calcEdgeMeters","calcEdgePrice","calcDrilling","calcExtra"].forEach(id=>$(id).oninput=calc);
$("calcTelegramButton").onclick=()=>{const username=db.settings.telegram||"ibratmebel8909";const text=`Assalomu alaykum!\nServis hisob-kitobi:\nList: ${$("calcSheets").value}\nKromka: ${$("calcEdgeMeters").value} m\nJami: ${money(calc())}`;window.open(`https://t.me/${username}?text=${encodeURIComponent(text)}`,"_blank","noopener")};
$("contactForm").onsubmit=e=>{e.preventDefault();const username=db.settings.telegram||"ibratmebel8909";const text=`Assalomu alaykum!\nIsm: ${$("contactName").value}\nTelefon: ${$("contactPhone").value}\nYo‘nalish: ${$("contactDirection").value}\nIzoh: ${$("contactMessage").value}`;window.open(`https://t.me/${username}?text=${encodeURIComponent(text)}`,"_blank","noopener")};
window.addEventListener("storage",()=>{db=loadDB();renderAll()});
window.addEventListener("ibrat-db-change",e=>{db=e.detail;renderAll()});
renderAll();
