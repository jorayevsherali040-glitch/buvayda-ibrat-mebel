import { auth, db } from "./firebase-config.js";
import { signInAnonymously, signOut, onAuthStateChanged, setPersistence, browserSessionPersistence } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";
import { ADMIN_PIN_HASH, PIN_MAX_ATTEMPTS, PIN_LOCK_MINUTES } from "./pin-config.js";
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, orderBy, serverTimestamp, setDoc } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

const $=id=>document.getElementById(id);
let laminates=[],edges=[],finance=[];
function esc(v=""){return String(v).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;")}
function money(v){return Number(v||0).toLocaleString("uz-UZ")+" so‘m"}
function toast(m){const t=$("toast");t.textContent=m;t.classList.add("show");clearTimeout(t._);t._=setTimeout(()=>t.classList.remove("show"),2200)}
function today(){return new Date().toISOString().slice(0,10)}

async function sha256(value){
  const data=new TextEncoder().encode(value);
  const hash=await crypto.subtle.digest("SHA-256",data);
  return [...new Uint8Array(hash)].map(x=>x.toString(16).padStart(2,"0")).join("");
}
function getPinState(){
  try{return JSON.parse(localStorage.getItem("v12PinState")||'{"attempts":0,"lockedUntil":0}')}
  catch{return {attempts:0,lockedUntil:0}}
}
function setPinState(value){localStorage.setItem("v12PinState",JSON.stringify(value))}
function updatePinDots(){
  const length=$("loginPin").value.length;
  document.querySelectorAll("#pinDots i").forEach((dot,index)=>dot.classList.toggle("active",index<Math.min(length,4)));
}
$("loginPin").addEventListener("input",e=>{
  e.target.value=e.target.value.replace(/\D/g,"").slice(0,8);
  updatePinDots();
});
$("loginForm").onsubmit=async e=>{
  e.preventDefault();
  const message=$("loginMessage");
  const state=getPinState();
  if(Date.now()<state.lockedUntil){
    const minutes=Math.ceil((state.lockedUntil-Date.now())/60000);
    message.textContent=`Ko‘p xato urinish. ${minutes} daqiqadan keyin qayta urinib ko‘ring.`;
    return;
  }
  message.textContent="PIN tekshirilmoqda...";
  const pin=$("loginPin").value.trim();
  if(await sha256(pin)!==ADMIN_PIN_HASH){
    const attempts=state.attempts+1;
    if(attempts>=PIN_MAX_ATTEMPTS){
      setPinState({attempts:0,lockedUntil:Date.now()+PIN_LOCK_MINUTES*60000});
      message.textContent=`PIN noto‘g‘ri. Kirish ${PIN_LOCK_MINUTES} daqiqaga bloklandi.`;
    }else{
      setPinState({attempts,lockedUntil:0});
      message.textContent=`PIN noto‘g‘ri. Qolgan urinish: ${PIN_MAX_ATTEMPTS-attempts}.`;
    }
    $("loginPin").value="";
    updatePinDots();
    return;
  }
  try{
    setPinState({attempts:0,lockedUntil:0});
    await setPersistence(auth,browserSessionPersistence);
    await signInAnonymously(auth);
    sessionStorage.setItem("v12PinVerified","1");
    message.textContent="";
    $("loginPin").value="";
    updatePinDots();
  }catch(err){
    console.error(err);
    message.textContent=err?.code==="auth/operation-not-allowed"
      ?"Firebase’da Anonymous kirishni yoqing: Authentication → Sign-in method → Anonymous → Enable."
      :"Firebase bilan ulanishda xatolik yuz berdi.";
  }
};
$("logoutButton").onclick=async()=>{
  sessionStorage.removeItem("v12PinVerified");
  await signOut(auth);
};
onAuthStateChanged(auth,u=>{
  const verified=sessionStorage.getItem("v12PinVerified")==="1";
  const allowed=Boolean(u&&verified);
  $("loginView").hidden=allowed;
  $("appView").hidden=!allowed;
  $("userEmail").textContent=allowed?"PIN orqali kirildi":"PIN sessiyasi";
  if(u&&!verified)signOut(auth).catch(console.error);
});

const titles={overview:"Umumiy ko‘rinish","quick-add":"Tez qo‘shish",laminates:"Laminatlar",edges:"Kromkalar",furniture:"Mebellar","service-prices":"Xizmat narxlari","site-settings":"Sayt sozlamalari"};
document.querySelectorAll("[data-page]").forEach(b=>b.onclick=()=>{document.querySelectorAll("[data-page]").forEach(x=>x.classList.remove("active"));b.classList.add("active");document.querySelectorAll(".sa-page").forEach(x=>x.classList.remove("active"));const key=b.dataset.page;$("page"+key.split("-").map(x=>x[0].toUpperCase()+x.slice(1)).join("")).classList.add("active");$("pageTitle").textContent=titles[key];document.querySelector(".sa-sidebar").classList.remove("open")});
$("sidebarToggle").onclick=()=>document.querySelector(".sa-sidebar").classList.toggle("open");
$("themeButton").onclick=()=>document.body.classList.toggle("sa-dark");
document.querySelectorAll("[data-open-quick]").forEach(b=>b.onclick=()=>{document.querySelector('[data-page="quick-add"]').click();setTimeout(()=>$(b.dataset.openQuick==="laminate"?"qlCode":"qeCode").focus(),50)});

$("quickLaminateForm").onsubmit=async e=>{e.preventDefault();await addDoc(collection(db,"laminates"),{code:$("qlCode").value.trim(),name:$("qlName").value.trim(),color:$("qlName").value.trim(),brand:$("qlBrand").value.trim(),thickness:$("qlThickness").value,size:"2800×2070",stock:Number($("qlStock").value||0),salePrice:Number($("qlPrice").value||0),costPrice:0,minStock:5,location:$("qlLocation").value.trim(),imageUrl:$("qlImage").value.trim(),createdAt:serverTimestamp()});e.target.reset();toast("Laminat qo‘shildi")};
$("quickEdgeForm").onsubmit=async e=>{e.preventDefault();await addDoc(collection(db,"edges"),{code:$("qeCode").value.trim(),name:$("qeName").value.trim(),brand:$("qeBrand").value.trim(),thickness:$("qeThickness").value,width:$("qeWidth").value,stock:Number($("qeStock").value||0),salePrice:Number($("qePrice").value||0),costPrice:0,minStock:50,matchingLaminate:$("qeMatch").value.trim(),location:$("qeLocation").value.trim(),createdAt:serverTimestamp()});e.target.reset();toast("Kromka qo‘shildi")};

function row(x,type){return `<div class="sa-list-row"><div><strong>${esc(x.code||"")} ${esc(x.name||"")}</strong><p>${type==="laminate"?`${esc(x.brand||"")} · ${x.stock||0} list`:`${x.thickness||""}×${x.width||""} · ${x.stock||0} metr`}</p></div><div><strong class="price">${money(x.salePrice)}</strong><br><span class="sa-badge ${Number(x.stock)<=Number(x.minStock||0)?"low":""}">${Number(x.stock)<=Number(x.minStock||0)?"Kam qolgan":"Mavjud"}</span></div></div>`}
function render(){
  $("statLaminates").textContent=laminates.length;$("statSheets").textContent=laminates.reduce((s,x)=>s+Number(x.stock||0),0).toLocaleString("uz-UZ");$("statEdges").textContent=edges.length;$("statMeters").textContent=edges.reduce((s,x)=>s+Number(x.stock||0),0).toLocaleString("uz-UZ");$("statLow").textContent=laminates.filter(x=>Number(x.stock)<=Number(x.minStock||0)).length+edges.filter(x=>Number(x.stock)<=Number(x.minStock||0)).length;$("statSales").textContent=money(finance.filter(x=>x.type==="income"&&(x.date||"")===today()).reduce((s,x)=>s+Number(x.amount||0),0));
  $("recentLaminates").innerHTML=laminates.slice(0,6).map(x=>row(x,"laminate")).join("")||"<p>Ma’lumot yo‘q.</p>";$("recentEdges").innerHTML=edges.slice(0,6).map(x=>row(x,"edge")).join("")||"<p>Ma’lumot yo‘q.</p>";
  const low=[...laminates.map(x=>({...x,type:"Laminat",unit:"list"})),...edges.map(x=>({...x,type:"Kromka",unit:"metr"}))].filter(x=>Number(x.stock)<=Number(x.minStock||0));$("lowStockList").innerHTML=low.slice(0,8).map(x=>`<div class="sa-list-row"><div><strong>${esc(x.code||"")} ${esc(x.name||"")}</strong><p>${x.type}</p></div><span class="sa-badge low">${x.stock||0} ${x.unit}</span></div>`).join("")||"<p>Kam qolgan mahsulot yo‘q.</p>";
  renderTables();
}
function renderTables(){
  const lq=$("laminateSearch").value.toLowerCase(),eq=$("edgeSearch").value.toLowerCase();
  const ls=laminates.filter(x=>!lq||`${x.code} ${x.name} ${x.brand}`.toLowerCase().includes(lq));const es=edges.filter(x=>!eq||`${x.code} ${x.name} ${x.brand}`.toLowerCase().includes(eq));
  $("laminateTable").innerHTML=`<table class="sa-table"><thead><tr><th>Kod</th><th>Nomi</th><th>Brend</th><th>Qoldiq</th><th>Narx</th><th>Joy</th><th></th></tr></thead><tbody>${ls.map(x=>`<tr><td><b>${esc(x.code)}</b></td><td>${esc(x.name)}</td><td>${esc(x.brand||"")}</td><td>${x.stock||0} list</td><td>${money(x.salePrice)}</td><td>${esc(x.location||"")}</td><td><button class="sa-delete" data-delete-l="${x.id}">O‘chirish</button></td></tr>`).join("")}</tbody></table>`;
  $("edgeTable").innerHTML=`<table class="sa-table"><thead><tr><th>Kod</th><th>Nomi</th><th>O‘lcham</th><th>Qoldiq</th><th>Narx</th><th>Mos laminat</th><th></th></tr></thead><tbody>${es.map(x=>`<tr><td><b>${esc(x.code)}</b></td><td>${esc(x.name)}</td><td>${x.thickness||""}×${x.width||""}</td><td>${x.stock||0} m</td><td>${money(x.salePrice)}</td><td>${esc(x.matchingLaminate||"")}</td><td><button class="sa-delete" data-delete-e="${x.id}">O‘chirish</button></td></tr>`).join("")}</tbody></table>`;
}
$("laminateSearch").oninput=renderTables;$("edgeSearch").oninput=renderTables;
$("laminateTable").onclick=async e=>{const b=e.target.closest("[data-delete-l]");if(b&&confirm("Laminat o‘chirilsinmi?"))await deleteDoc(doc(db,"laminates",b.dataset.deleteL))};
$("edgeTable").onclick=async e=>{const b=e.target.closest("[data-delete-e]");if(b&&confirm("Kromka o‘chirilsinmi?"))await deleteDoc(doc(db,"edges",b.dataset.deleteE))};

$("servicePriceForm").onsubmit=async e=>{e.preventDefault();await setDoc(doc(db,"settings","servicePrices"),{cutPrice:Number($("settingCutPrice").value||0),edgePrice:Number($("settingEdgePrice").value||0),drillPrice:Number($("settingDrillPrice").value||0),cncPrice:Number($("settingCncPrice").value||0),updatedAt:serverTimestamp()},{merge:true});toast("Xizmat narxlari saqlandi")};
$("siteSettingsForm").onsubmit=async e=>{e.preventDefault();await setDoc(doc(db,"settings","site"),{slogan:$("settingSlogan").value.trim(),phone:$("settingPhone").value.trim(),telegram:$("settingTelegram").value.trim(),hero:$("settingHero").value.trim(),updatedAt:serverTimestamp()},{merge:true});toast("Sayt sozlamalari saqlandi")};

onSnapshot(query(collection(db,"laminates"),orderBy("createdAt","desc")),s=>{laminates=s.docs.map(d=>({id:d.id,...d.data()}));render()},console.error);
onSnapshot(query(collection(db,"edges"),orderBy("createdAt","desc")),s=>{edges=s.docs.map(d=>({id:d.id,...d.data()}));render()},console.error);
onSnapshot(query(collection(db,"finance"),orderBy("createdAt","desc")),s=>{finance=s.docs.map(d=>({id:d.id,...d.data()}));render()},console.error);
