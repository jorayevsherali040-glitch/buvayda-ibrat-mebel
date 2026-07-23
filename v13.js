import {loadDB,saveDB,uid,money,today} from "./local-db.js";
const $=id=>document.getElementById(id);
let db=loadDB();
let cart=JSON.parse(localStorage.getItem("v13Cart")||"[]");
let favorites=JSON.parse(localStorage.getItem("v13Favorites")||"[]");

function esc(v=""){return String(v).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;")}
function img(x){return x.image||x.imageUrl||"./product-placeholder.svg"}
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


// V20 smart laminate and edge finder
let v20FinderType="laminates";
const v20FinderSearch=document.getElementById("v20FinderSearch");
const v20FinderBrand=document.getElementById("v20FinderBrand");
const v20FinderThickness=document.getElementById("v20FinderThickness");
const v20FinderStock=document.getElementById("v20FinderStock");
const v20FinderGrid=document.getElementById("v20FinderGrid");
const v20FinderCount=document.getElementById("v20FinderCount");
function v20StockMatch(x,f){
  const stock=Number(x.stock||0),min=Number(x.minStock||0);
  if(!f)return true;
  if(f==="available")return stock>0;
  if(f==="low")return stock>0&&stock<=min;
  return stock<=0;
}
function v20FinderImage(x){return x.imageUrl||x.image||"./product-placeholder.svg"}
function v20PopulateFilters(){
  if(!v20FinderBrand)return;
  const list=v20FinderType==="laminates"?db.laminates:db.edges;
  const brands=[...new Set(list.map(x=>x.brand).filter(Boolean))].sort();
  v20FinderBrand.innerHTML='<option value="">Barcha brendlar</option>'+brands.map(x=>`<option>${esc(x)}</option>`).join("");
  const thickness=[...new Set(list.map(x=>String(x.thickness||"")).filter(Boolean))].sort((a,b)=>Number(a)-Number(b));
  v20FinderThickness.innerHTML='<option value="">Barcha qalinlik</option>'+thickness.map(x=>`<option value="${esc(x)}">${esc(x)} mm</option>`).join("");
}
function v20RenderFinder(){
  if(!v20FinderGrid)return;
  const list=v20FinderType==="laminates"?db.laminates:db.edges;
  const q=(v20FinderSearch.value||"").trim().toLowerCase(),brand=v20FinderBrand.value,th=v20FinderThickness.value,stock=v20FinderStock.value;
  const filtered=list.filter(x=>{
    const hay=`${x.code||""} ${x.name||""} ${x.color||""} ${x.brand||""} ${x.location||""} ${(x.tags||[]).join(" ")} ${x.matchingLaminate||""} ${(x.matchingEdges||[]).join(" ")}`.toLowerCase();
    return(!q||hay.includes(q))&&(!brand||x.brand===brand)&&(!th||String(x.thickness)===th)&&v20StockMatch(x,stock)
  });
  v20FinderCount.textContent=`${filtered.length} ta mahsulot`;
  v20FinderGrid.innerHTML=filtered.map(x=>{
    const unit=v20FinderType==="laminates"?"list":"metr",stockNum=Number(x.stock||0),stockClass=stockNum<=0?"empty":stockNum<=Number(x.minStock||0)?"low":"";
    const dims=v20FinderType==="laminates"?(x.size||"2800×2070"):`${x.thickness||""}×${x.width||""} mm`;
    return`<article class="v20-finder-card"><img src="${esc(v20FinderImage(x))}" alt="${esc(x.name||"Mahsulot")}"><div><h3>${esc(x.code||"")} ${esc(x.name||"")}</h3><p>${esc(x.brand||"")} · ${esc(dims)}</p><div class="v20-meta"><span>${esc(v20FinderType==="laminates"?"Laminat":"Kromka")}</span>${x.location?`<span>Joy: ${esc(x.location)}</span>`:""}</div><div class="v20-bottom"><span class="v20-price">${money(x.salePrice||x.price||0)}</span><span class="v20-stock ${stockClass}">${stockNum} ${unit}</span></div></div></article>`
  }).join("")||'<p>Qidiruv bo‘yicha mahsulot topilmadi.</p>';
}
document.querySelectorAll("[data-finder-type]").forEach(b=>b.addEventListener("click",()=>{
  document.querySelectorAll("[data-finder-type]").forEach(x=>x.classList.remove("active"));b.classList.add("active");v20FinderType=b.dataset.finderType;v20PopulateFilters();v20RenderFinder()
}));
[v20FinderSearch,v20FinderBrand,v20FinderThickness,v20FinderStock].filter(Boolean).forEach(el=>el.addEventListener(el.tagName==="INPUT"?"input":"change",v20RenderFinder));
document.getElementById("v20FinderClear")?.addEventListener("click",()=>{v20FinderSearch.value="";v20FinderBrand.value="";v20FinderThickness.value="";v20FinderStock.value="";v20RenderFinder()});
setTimeout(()=>{v20PopulateFilters();v20RenderFinder()},100);


// ============================================================
// V21 PREMIUM: global search and quick cutting estimator
// ============================================================
const v21Overlay=document.getElementById("v21SearchOverlay");
const v21SearchInput=document.getElementById("v21GlobalSearch");
const v21SearchResults=document.getElementById("v21SearchResults");
document.getElementById("v21GlobalSearchButton")?.addEventListener("click",()=>{
  v21Overlay.hidden=false;
  setTimeout(()=>v21SearchInput.focus(),50);
  v21RenderGlobalSearch("");
});
document.getElementById("v21SearchClose")?.addEventListener("click",()=>v21Overlay.hidden=true);
v21Overlay?.addEventListener("click",e=>{if(e.target===v21Overlay)v21Overlay.hidden=true});
document.addEventListener("keydown",e=>{if(e.key==="Escape"&&v21Overlay&&!v21Overlay.hidden)v21Overlay.hidden=true});

function v21GlobalItems(){
  const material=[
    ...(db.laminates||[]).map(x=>({...x,v21Type:"Laminat",v21Price:x.salePrice||0})),
    ...(db.edges||[]).map(x=>({...x,v21Type:"Kromka",v21Price:x.salePrice||0})),
    ...(db.products||[]).map(x=>({...x,v21Type:"Mebel",v21Price:x.price||0}))
  ];
  const services=[
    {id:"service-cut",name:"Laminat kesish",code:"KESISH",v21Type:"Xizmat",v21Price:0,imageUrl:(window.V21_HD_IMAGES?.laminate||"./v22-assets/laminate-sheets.svg"),tags:["kesish","list","laminat"]},
    {id:"service-edge",name:"Kromka yopishtirish",code:"KROMKA",v21Type:"Xizmat",v21Price:0,imageUrl:(window.V21_HD_IMAGES?.edge||"./v22-assets/edge-rolls.svg"),tags:["kromka","yopishtirish"]},
    {id:"service-drill",name:"Bazis teshish",code:"TESHISH",v21Type:"Xizmat",v21Price:0,imageUrl:(window.V21_HD_IMAGES?.drill||"./v22-assets/cnc-drilling.svg"),tags:["bazis","teshish","cnc"]},
    {id:"service-design",name:"3D dizayn",code:"DIZAYN",v21Type:"Xizmat",v21Price:0,imageUrl:(window.V21_HD_IMAGES?.design||"./v22-assets/furniture-design.svg"),tags:["dizayn","loyiha"]}
  ];
  return [...material,...services]
}
function v21RenderGlobalSearch(query){
  if(!v21SearchResults)return;
  const q=(query||"").trim().toLowerCase();
  const items=v21GlobalItems().filter(x=>{
    const hay=`${x.code||""} ${x.name||""} ${x.color||""} ${x.brand||""} ${x.v21Type||""} ${(x.tags||[]).join(" ")} ${x.matchingLaminate||""} ${(x.matchingEdges||[]).join(" ")}`.toLowerCase();
    return !q||hay.includes(q)
  }).slice(0,30);
  v21SearchResults.innerHTML=items.map(x=>`<article class="v21-search-item"><img src="${esc(x.imageUrl||x.image||"./product-placeholder.svg")}" alt=""><div><strong>${esc(x.code||"")} ${esc(x.name||"")}</strong><small>${esc(x.v21Type)}${x.brand?` · ${esc(x.brand)}`:""}${x.stock!==undefined?` · Qoldiq: ${x.stock}`:""}</small></div><span>${x.v21Price?money(x.v21Price):"Batafsil"}</span></article>`).join("")||"<p>Mahsulot topilmadi.</p>";
}
v21SearchInput?.addEventListener("input",e=>v21RenderGlobalSearch(e.target.value));

let v21Parts=[];
const v21PartsList=document.getElementById("v21PartsList");
function v21RenderParts(){
  if(!v21PartsList)return;
  v21PartsList.innerHTML=v21Parts.map((p,i)=>`<div class="v21-part-row"><div><strong>${p.width}×${p.height} mm — ${p.qty} dona</strong><small>${p.edgeSides?`${p.edgeSides} tomon kromka`:"Kromkasiz"}</small></div><span>${((p.width*p.height*p.qty)/1000000).toFixed(2)} m²</span><button data-v21-remove="${i}">×</button></div>`).join("")||"<p style='color:#9fb4a7'>Hali detal kiritilmagan.</p>";
  const totalQty=v21Parts.reduce((s,p)=>s+p.qty,0);
  const totalArea=v21Parts.reduce((s,p)=>s+p.width*p.height*p.qty,0)/1000000;
  const sheetW=Number(document.getElementById("v21SheetWidth")?.value||2800);
  const sheetH=Number(document.getElementById("v21SheetHeight")?.value||2070);
  const waste=Number(document.getElementById("v21Waste")?.value||10)/100;
  const sheetArea=(sheetW*sheetH)/1000000;
  const sheets=totalArea?Math.ceil(totalArea*(1+waste)/sheetArea):0;
  let edgeMm=0;
  for(const p of v21Parts){
    if(p.edgeSides===1)edgeMm+=Math.max(p.width,p.height)*p.qty;
    if(p.edgeSides===2)edgeMm+=(p.width+p.height)*p.qty;
    if(p.edgeSides===4)edgeMm+=(2*p.width+2*p.height)*p.qty;
  }
  document.getElementById("v21TotalParts").textContent=`${totalQty} dona`;
  document.getElementById("v21TotalArea").textContent=`${totalArea.toFixed(2)} m²`;
  document.getElementById("v21SheetCount").textContent=`${sheets} list`;
  document.getElementById("v21EdgeMeters").textContent=`${(edgeMm/1000).toFixed(1)} m`;
}
document.getElementById("v21AddPart")?.addEventListener("click",()=>{
  const widthInput=document.getElementById("v21PartWidth");
  const heightInput=document.getElementById("v21PartHeight");
  const qtyInput=document.getElementById("v21PartQty");
  const width=Number(widthInput?.value||0);
  const height=Number(heightInput?.value||0);
  const qty=Number(qtyInput?.value||1);
  const edgeSides=Number(document.getElementById("v21EdgeSides")?.value||0);

  if(width<=0){
    widthInput?.focus();
    toast("Detal enini kiriting.");
    return;
  }
  if(height<=0){
    heightInput?.focus();
    toast("Detal bo‘yini kiriting.");
    return;
  }
  if(qty<=0){
    qtyInput?.focus();
    toast("Detal sonini kiriting.");
    return;
  }

  v21Parts.push({width,height,qty,edgeSides});
  widthInput.value="";
  heightInput.value="";
  qtyInput.value=1;
  v21RenderParts();
  toast("Detal qo‘shildi.");
});
v21PartsList?.addEventListener("click",e=>{
  const b=e.target.closest("[data-v21-remove]");
  if(!b)return;
  v21Parts.splice(Number(b.dataset.v21Remove),1);
  v21RenderParts();
});
["v21SheetWidth","v21SheetHeight","v21Waste"].forEach(id=>document.getElementById(id)?.addEventListener("input",v21RenderParts));
document.getElementById("v21ClearParts")?.addEventListener("click",()=>{v21Parts=[];v21RenderParts()});
v21RenderParts();
