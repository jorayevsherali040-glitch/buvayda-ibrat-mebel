import {loadDB,saveDB,uid,nowISO,today,money,exportBackup,importBackup,resetDB} from "./local-db.js";
import {ADMIN_PIN_HASH,PIN_MAX_ATTEMPTS,PIN_LOCK_MINUTES} from "./pin-config.js";
const $=id=>document.getElementById(id);
let db=loadDB();

async function sha256(value){
  const data=new TextEncoder().encode(value);
  const hash=await crypto.subtle.digest("SHA-256",data);
  return [...new Uint8Array(hash)].map(x=>x.toString(16).padStart(2,"0")).join("");
}
function esc(v=""){return String(v).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;")}
function toast(m){const t=$("toast");t.textContent=m;t.classList.add("show");clearTimeout(t._);t._=setTimeout(()=>t.classList.remove("show"),2200)}
function pinState(){try{return JSON.parse(localStorage.getItem("v13PinState")||'{"attempts":0,"lockedUntil":0}')}catch{return{attempts:0,lockedUntil:0}}}
function setPinState(v){localStorage.setItem("v13PinState",JSON.stringify(v))}
function showApp(){
  $("loginView").hidden=true;
  $("appView").hidden=false;
  sessionStorage.setItem("v13PinVerified","1");
  const destination=sessionStorage.getItem("v14AfterLogin");
  if(destination){
    sessionStorage.removeItem("v14AfterLogin");
    location.href=destination==="calculator"?"./korxona.html#calculator":"./korxona.html";
    return;
  }
  render();
}
function showLogin(){
  $("loginView").hidden=false;$("appView").hidden=true;sessionStorage.removeItem("v13PinVerified")
}
if(sessionStorage.getItem("v13PinVerified")==="1")showApp();else showLogin();

$("loginPin").addEventListener("input",e=>{e.target.value=e.target.value.replace(/\D/g,"").slice(0,8);document.querySelectorAll("#pinDots i").forEach((d,i)=>d.classList.toggle("active",i<Math.min(4,e.target.value.length)))});
$("loginForm").onsubmit=async e=>{
  e.preventDefault();const state=pinState(),msg=$("loginMessage");
  if(Date.now()<state.lockedUntil){msg.textContent=`${Math.ceil((state.lockedUntil-Date.now())/60000)} daqiqadan keyin qayta urinib ko‘ring.`;return}
  if(await sha256($("loginPin").value)!==ADMIN_PIN_HASH){
    const attempts=state.attempts+1;
    if(attempts>=PIN_MAX_ATTEMPTS){setPinState({attempts:0,lockedUntil:Date.now()+PIN_LOCK_MINUTES*60000});msg.textContent=`Kirish ${PIN_LOCK_MINUTES} daqiqaga bloklandi.`}
    else{setPinState({attempts,lockedUntil:0});msg.textContent=`PIN noto‘g‘ri. Qolgan urinish: ${PIN_MAX_ATTEMPTS-attempts}.`}
    return
  }
  setPinState({attempts:0,lockedUntil:0});$("loginPin").value="";msg.textContent="";showApp()
};
$("logoutButton").onclick=showLogin;

const titles={overview:"Umumiy ko‘rinish","quick-add":"Tez qo‘shish",laminates:"Laminatlar",edges:"Kromkalar",furniture:"Mebellar","service-prices":"Xizmat narxlari","site-settings":"Sayt sozlamalari"};
document.querySelectorAll("[data-page]").forEach(b=>b.onclick=()=>{document.querySelectorAll("[data-page]").forEach(x=>x.classList.remove("active"));b.classList.add("active");document.querySelectorAll(".sa-page").forEach(x=>x.classList.remove("active"));const key=b.dataset.page;$("page"+key.split("-").map(x=>x[0].toUpperCase()+x.slice(1)).join("")).classList.add("active");$("pageTitle").textContent=titles[key]});
document.querySelectorAll("[data-open-quick]").forEach(b=>b.onclick=()=>{document.querySelector('[data-page="quick-add"]').click();setTimeout(()=>$(b.dataset.openQuick==="laminate"?"qlCode":"qeCode").focus(),50)});
$("sidebarToggle").onclick=()=>document.querySelector(".sa-sidebar").classList.toggle("open");$("themeButton").onclick=()=>document.body.classList.toggle("sa-dark");

$("quickLaminateForm").onsubmit=e=>{
  e.preventDefault();db.laminates.unshift({id:uid("lam"),code:$("qlCode").value.trim(),name:$("qlName").value.trim(),color:$("qlName").value.trim(),brand:$("qlBrand").value.trim(),thickness:$("qlThickness").value,size:"2800×2070",stock:Number($("qlStock").value||0),salePrice:Number($("qlPrice").value||0),costPrice:0,minStock:5,location:$("qlLocation").value.trim(),imageUrl:$("qlImage").value.trim(),createdAt:nowISO()});saveDB(db);e.target.reset();toast("Laminat qo‘shildi");render()
};
$("quickEdgeForm").onsubmit=e=>{
  e.preventDefault();db.edges.unshift({id:uid("edge"),code:$("qeCode").value.trim(),name:$("qeName").value.trim(),brand:$("qeBrand").value.trim(),thickness:$("qeThickness").value,width:$("qeWidth").value,stock:Number($("qeStock").value||0),salePrice:Number($("qePrice").value||0),costPrice:0,minStock:50,matchingLaminate:$("qeMatch").value.trim(),location:$("qeLocation").value.trim(),createdAt:nowISO()});saveDB(db);e.target.reset();toast("Kromka qo‘shildi");render()
};
function row(x,type){return `<div class="sa-list-row"><div><strong>${esc(x.code||"")} ${esc(x.name||"")}</strong><p>${type==="laminate"?`${esc(x.brand||"")} · ${x.stock||0} list`:`${x.thickness||""}×${x.width||""} · ${x.stock||0} metr`}</p></div><div><strong class="price">${money(x.salePrice)}</strong><br><span class="sa-badge ${Number(x.stock)<=Number(x.minStock||0)?"low":""}">${Number(x.stock)<=Number(x.minStock||0)?"Kam qolgan":"Mavjud"}</span></div></div>`}
function render(){
  db=loadDB();
  $("statLaminates").textContent=db.laminates.length;$("statSheets").textContent=db.laminates.reduce((s,x)=>s+Number(x.stock||0),0).toLocaleString("uz-UZ");$("statEdges").textContent=db.edges.length;$("statMeters").textContent=db.edges.reduce((s,x)=>s+Number(x.stock||0),0).toLocaleString("uz-UZ");$("statLow").textContent=db.laminates.filter(x=>Number(x.stock)<=Number(x.minStock||0)).length+db.edges.filter(x=>Number(x.stock)<=Number(x.minStock||0)).length;$("statSales").textContent=money(db.finance.filter(x=>x.type==="income"&&x.date===today()).reduce((s,x)=>s+Number(x.amount||0),0));
  $("recentLaminates").innerHTML=db.laminates.slice(0,6).map(x=>row(x,"laminate")).join("")||"<p>Ma’lumot yo‘q.</p>";$("recentEdges").innerHTML=db.edges.slice(0,6).map(x=>row(x,"edge")).join("")||"<p>Ma’lumot yo‘q.</p>";
  const low=[...db.laminates.map(x=>({...x,type:"Laminat",unit:"list"})),...db.edges.map(x=>({...x,type:"Kromka",unit:"metr"}))].filter(x=>Number(x.stock)<=Number(x.minStock||0));$("lowStockList").innerHTML=low.map(x=>`<div class="sa-list-row"><div><strong>${esc(x.code||"")} ${esc(x.name||"")}</strong><p>${x.type}</p></div><span class="sa-badge low">${x.stock||0} ${x.unit}</span></div>`).join("")||"<p>Kam qolgan mahsulot yo‘q.</p>";
  renderTables()
}
function renderTables(){
  const lq=$("laminateSearch").value.toLowerCase(),eq=$("edgeSearch").value.toLowerCase(),ls=db.laminates.filter(x=>!lq||`${x.code} ${x.name} ${x.brand}`.toLowerCase().includes(lq)),es=db.edges.filter(x=>!eq||`${x.code} ${x.name} ${x.brand}`.toLowerCase().includes(eq));
  $("laminateTable").innerHTML=`<table class="sa-table"><thead><tr><th>Kod</th><th>Nomi</th><th>Brend</th><th>Qoldiq</th><th>Narx</th><th>Joy</th><th></th></tr></thead><tbody>${ls.map(x=>`<tr><td><b>${esc(x.code)}</b></td><td>${esc(x.name)}</td><td>${esc(x.brand||"")}</td><td>${x.stock||0} list</td><td>${money(x.salePrice)}</td><td>${esc(x.location||"")}</td><td><button class="sa-delete" data-del-l="${x.id}">O‘chirish</button></td></tr>`).join("")}</tbody></table>`;
  $("edgeTable").innerHTML=`<table class="sa-table"><thead><tr><th>Kod</th><th>Nomi</th><th>O‘lcham</th><th>Qoldiq</th><th>Narx</th><th>Mos laminat</th><th></th></tr></thead><tbody>${es.map(x=>`<tr><td><b>${esc(x.code)}</b></td><td>${esc(x.name)}</td><td>${x.thickness||""}×${x.width||""}</td><td>${x.stock||0} m</td><td>${money(x.salePrice)}</td><td>${esc(x.matchingLaminate||"")}</td><td><button class="sa-delete" data-del-e="${x.id}">O‘chirish</button></td></tr>`).join("")}</tbody></table>`
}
$("laminateSearch").oninput=renderTables;$("edgeSearch").oninput=renderTables;
$("laminateTable").onclick=e=>{const b=e.target.closest("[data-del-l]");if(b&&confirm("Laminat o‘chirilsinmi?")){db.laminates=db.laminates.filter(x=>x.id!==b.dataset.delL);saveDB(db);render()}};
$("edgeTable").onclick=e=>{const b=e.target.closest("[data-del-e]");if(b&&confirm("Kromka o‘chirilsinmi?")){db.edges=db.edges.filter(x=>x.id!==b.dataset.delE);saveDB(db);render()}};
$("servicePriceForm").onsubmit=e=>{e.preventDefault();db.settings.cutPrice=Number($("settingCutPrice").value||0);db.settings.edgePrice=Number($("settingEdgePrice").value||0);db.settings.drillPrice=Number($("settingDrillPrice").value||0);db.settings.cncPrice=Number($("settingCncPrice").value||0);saveDB(db);toast("Xizmat narxlari saqlandi")};
$("siteSettingsForm").onsubmit=e=>{e.preventDefault();db.settings.slogan=$("settingSlogan").value.trim();db.settings.phone=$("settingPhone").value.trim();db.settings.telegram=$("settingTelegram").value.trim();db.settings.hero=$("settingHero").value.trim();saveDB(db);toast("Sayt sozlamalari saqlandi")};

$("settingCutPrice").value=db.settings.cutPrice||0;$("settingEdgePrice").value=db.settings.edgePrice||0;$("settingDrillPrice").value=db.settings.drillPrice||0;$("settingCncPrice").value=db.settings.cncPrice||0;$("settingSlogan").value=db.settings.slogan||"";$("settingPhone").value=db.settings.phone||"";$("settingTelegram").value=db.settings.telegram||"";
window.addEventListener("storage",render);render();
