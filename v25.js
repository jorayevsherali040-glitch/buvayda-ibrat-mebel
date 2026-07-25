import {loadDB,saveDB,uid,nowISO,today,money} from "./local-db.js";
const $=id=>document.getElementById(id);
let db=loadDB(),productionChart=null,currentPhotoData="";
if(sessionStorage.getItem("v13PinVerified")!=="1"){sessionStorage.setItem("v25AfterLogin","1");location.href="./super-admin.html"}

const stages=["Yangi buyurtma","Loyiha tayyorlandi","Kesishga yuborildi","Kromka","Teshish","Yig‘ish","Sifat nazorati","Tayyor","Yetkazildi"];
const pageTitles={dashboard:"Umumiy ko‘rinish",production:"Ishlab chiqarish",calendar:"Ishlab chiqarish taqvimi",workers:"Ishchilar paneli",quality:"Sifat nazorati",customers:"Mijoz kuzatuvi"};
const num=v=>Number(v||0),esc=(v="")=>String(v).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;");
function toast(m){const t=$("toast");t.textContent=m;t.classList.add("show");clearTimeout(t._);t._=setTimeout(()=>t.classList.remove("show"),2200)}
function persist(){db=saveDB(db);renderAll()}
function go(page){document.querySelectorAll("[data-page]").forEach(x=>x.classList.toggle("active",x.dataset.page===page));document.querySelectorAll(".v25-page").forEach(x=>x.classList.remove("active"));$("page"+page[0].toUpperCase()+page.slice(1)).classList.add("active");$("pageTitle").textContent=pageTitles[page];$("sidebar").classList.remove("open");if(page==="dashboard")setTimeout(renderChart,40)}
document.querySelectorAll("[data-page]").forEach(b=>b.onclick=()=>go(b.dataset.page));document.querySelectorAll("[data-go]").forEach(b=>b.onclick=()=>go(b.dataset.go));$("menuBtn").onclick=()=>$("sidebar").classList.toggle("open");$("themeBtn").onclick=()=>document.documentElement.classList.toggle("dark");$("logoutBtn").onclick=()=>{sessionStorage.removeItem("v13PinVerified");location.href="./super-admin.html"};setInterval(()=>$("clock").textContent=new Date().toLocaleString("uz-UZ"),1000);

function normalizedStatus(order){if(stages.includes(order.status))return order.status;const map={"Kutmoqda":"Yangi buyurtma","Kesilmoqda":"Kesishga yuborildi","Kromka urilmoqda":"Kromka","Teshilmoqda":"Teshish","Yig‘ilmoqda":"Yig‘ish"};return map[order.status]||order.status||"Yangi buyurtma"}
function workerName(id){return db.workers.find(x=>x.id===id)?.name||""}
function productionMeta(order){return order.production||{}}
function isLate(order){return order.deadline&&order.deadline<today()&&!["Tayyor","Yetkazildi","Bekor qilindi"].includes(normalizedStatus(order))}
function formatDT(v){if(!v)return"-";return new Date(v).toLocaleString("uz-UZ")}

function renderDashboard(){
  const active=db.orders.filter(x=>!["Tayyor","Yetkazildi","Bekor qilindi"].includes(normalizedStatus(x)));
  $("statActive").textContent=active.length;$("statCut").textContent=db.orders.filter(x=>normalizedStatus(x)==="Kesishga yuborildi").length;$("statEdge").textContent=db.orders.filter(x=>normalizedStatus(x)==="Kromka").length;$("statDrill").textContent=db.orders.filter(x=>normalizedStatus(x)==="Teshish").length;$("statReady").textContent=db.orders.filter(x=>normalizedStatus(x)==="Tayyor").length;$("statLate").textContent=db.orders.filter(isLate).length;

  $("activeProcesses").innerHTML=active.slice(0,10).map(x=>{const p=productionMeta(x);return`<div class="list-row"><div><strong>${esc(x.number||"")} — ${esc(x.customer||"Mijoz")}</strong><p>${esc(normalizedStatus(x))} · ${esc(workerName(p.workerId)||"Usta biriktirilmagan")}</p></div><span class="badge ${isLate(x)?"red":""}">${x.deadline||"Muddat yo‘q"}</span></div>`}).join("")||"<p>Faol buyurtma yo‘q.</p>";

  const low=[...db.laminates.map(x=>({...x,unit:"list"})),...db.edges.map(x=>({...x,unit:"m"}))].filter(x=>num(x.stock)<=num(x.minStock||0));
  $("lowMaterials").innerHTML=low.slice(0,8).map(x=>`<div class="list-row"><div><strong>${esc(x.code||"")} ${esc(x.name)}</strong><p>${esc(x.location||"Joy ko‘rsatilmagan")}</p></div><span class="badge low">${x.stock} ${x.unit}</span></div>`).join("")||"<p>Kam qolgan material yo‘q.</p>";

  const deadlines=db.orders.filter(x=>x.deadline&&!["Yetkazildi","Bekor qilindi"].includes(normalizedStatus(x))).sort((a,b)=>a.deadline.localeCompare(b.deadline)).slice(0,8);
  $("deadlineOrders").innerHTML=deadlines.map(x=>`<div class="list-row"><div><strong>${esc(x.number||"")} — ${esc(x.customer||"")}</strong><p>${esc(normalizedStatus(x))}</p></div><span class="badge ${isLate(x)?"red":""}">${x.deadline}</span></div>`).join("")||"<p>Yaqin muddatli buyurtma yo‘q.</p>"
}
function renderChart(){if(!window.Chart)return;const counts=stages.slice(0,-1).map(s=>db.orders.filter(x=>normalizedStatus(x)===s).length);if(productionChart)productionChart.destroy();productionChart=new Chart($("productionChart"),{type:"bar",data:{labels:stages.slice(0,-1),datasets:[{label:"Buyurtmalar",data:counts}]},options:{plugins:{legend:{display:false}},scales:{y:{beginAtZero:true}}}})}

function renderProduction(){
  const q=$("productionSearch").value.toLowerCase(),wf=$("productionWorkerFilter").value;
  $("productionWorkerFilter").innerHTML='<option value="">Barcha ustalar</option>'+db.workers.map(x=>`<option value="${x.id}" ${x.id===wf?"selected":""}>${esc(x.name)}</option>`).join("");
  $("productionBoard").innerHTML=stages.map(stage=>{const list=db.orders.filter(x=>normalizedStatus(x)===stage).filter(x=>{const p=productionMeta(x);const hay=`${x.number} ${x.customer} ${x.phone}`.toLowerCase();return(!q||hay.includes(q))&&(!wf||p.workerId===wf)});return`<section class="kanban-col" data-stage="${esc(stage)}"><h3>${esc(stage)} (${list.length})</h3>${list.map(x=>{const p=productionMeta(x);return`<article class="order-card" draggable="true" data-order-id="${x.id}"><strong>${esc(x.number||"")} — ${esc(x.customer||"Mijoz")}</strong><p>${esc(x.phone||"")}<br>Muddat: ${x.deadline||"-"}${isLate(x)?" · KECHIKDI":""}</p><footer><span class="worker-pill">${esc(workerName(p.workerId)||"Usta yo‘q")}</span><span class="badge">${money(x.total)}</span></footer></article>`}).join("")}</section>`}).join("")
}
$("productionSearch").oninput=renderProduction;$("productionWorkerFilter").onchange=renderProduction;
let draggedOrder="";
$("productionBoard").addEventListener("dragstart",e=>{const card=e.target.closest("[data-order-id]");if(card)draggedOrder=card.dataset.orderId});
$("productionBoard").addEventListener("dragover",e=>{const col=e.target.closest("[data-stage]");if(col){e.preventDefault();col.classList.add("drag-over")}});
$("productionBoard").addEventListener("dragleave",e=>e.target.closest("[data-stage]")?.classList.remove("drag-over"));
$("productionBoard").addEventListener("drop",e=>{const col=e.target.closest("[data-stage]");if(!col||!draggedOrder)return;e.preventDefault();col.classList.remove("drag-over");const order=db.orders.find(x=>x.id===draggedOrder);if(order){const old=normalizedStatus(order),status=col.dataset.stage;order.status=status;order.production=order.production||{};order.production.startedAt=order.production.startedAt||nowISO();if(["Tayyor","Yetkazildi"].includes(status))order.production.finishedAt=nowISO();db.productionLogs.unshift({id:uid("prod"),orderId:order.id,from:old,to:status,workerId:order.production.workerId||"",note:"Drag & drop orqali o‘zgartirildi",date:nowISO()});persist();toast(`Holat: ${status}`)}draggedOrder=""});
$("productionBoard").onclick=e=>{const card=e.target.closest("[data-order-id]");if(card)openProcess(card.dataset.orderId)};

function openProcess(id){
  const o=db.orders.find(x=>x.id===id);if(!o)return;const p=productionMeta(o);$("processOrderId").value=id;$("processTitle").textContent=`${o.number||""} — ${o.customer||"Mijoz"}`;$("processStatus").innerHTML=stages.map(s=>`<option ${s===normalizedStatus(o)?"selected":""}>${esc(s)}</option>`).join("");$("processWorker").innerHTML='<option value="">Usta tanlang</option>'+db.workers.map(w=>`<option value="${w.id}" ${w.id===p.workerId?"selected":""}>${esc(w.name)} — ${esc(w.role||"")}</option>`).join("");$("processStartedAt").value=toLocalInput(p.startedAt);$("processFinishedAt").value=toLocalInput(p.finishedAt);$("processNote").value=p.note||"";currentPhotoData=p.photo||"";renderPhoto();renderHistory(id);$("processModal").hidden=false
}
function toLocalInput(v){if(!v)return"";const d=new Date(v);d.setMinutes(d.getMinutes()-d.getTimezoneOffset());return d.toISOString().slice(0,16)}
$("processModalClose").onclick=()=>$("processModal").hidden=true;$("processModal").onclick=e=>{if(e.target===$("processModal"))$("processModal").hidden=true};
$("processPhoto").onchange=e=>{const f=e.target.files[0];if(!f)return;if(f.size>1800000)return toast("Rasm 1.8 MB dan kichik bo‘lsin.");const r=new FileReader();r.onload=()=>{currentPhotoData=r.result;renderPhoto()};r.readAsDataURL(f)};
function renderPhoto(){$("processPhotoPreview").innerHTML=currentPhotoData?`<img src="${currentPhotoData}" alt="Jarayon rasmi">`:""}
function renderHistory(id){const logs=db.productionLogs.filter(x=>x.orderId===id).slice(0,20);$("processHistory").innerHTML='<h3>Jarayon tarixi</h3>'+logs.map(x=>`<div class="history-item"><strong>${esc(x.from||"")} → ${esc(x.to||"")}</strong><p>${formatDT(x.date)} · ${esc(workerName(x.workerId)||"Usta ko‘rsatilmagan")}<br>${esc(x.note||"")}</p></div>`).join("")}
$("saveProcess").onclick=()=>{const id=$("processOrderId").value,o=db.orders.find(x=>x.id===id);if(!o)return;const old=normalizedStatus(o),status=$("processStatus").value,workerId=$("processWorker").value;o.status=status;o.production={...(o.production||{}),workerId,startedAt:$("processStartedAt").value?new Date($("processStartedAt").value).toISOString():"",finishedAt:$("processFinishedAt").value?new Date($("processFinishedAt").value).toISOString():"",note:$("processNote").value.trim(),photo:currentPhotoData,updatedAt:nowISO()};db.productionLogs.unshift({id:uid("prod"),orderId:id,from:old,to:status,workerId,note:$("processNote").value.trim(),date:nowISO()});persist();$("processModal").hidden=true;toast("Jarayon saqlandi")};
$("sendTelegram").onclick=()=>{const id=$("processOrderId").value,o=db.orders.find(x=>x.id===id);if(!o)return;const text=`BUVAYDA IBRAT MEBEL\nBuyurtma: ${o.number||""}\nMijoz: ${o.customer||""}\nHolati: ${$("processStatus").value}\nKeyingi ma’lumot uchun biz bilan bog‘laning.`;window.open(`https://t.me/share/url?url=${encodeURIComponent(location.origin+location.pathname)}&text=${encodeURIComponent(text)}`,"_blank")};

function renderCalendar(){
  const arr=[];for(let i=0;i<30;i++){const d=new Date();d.setDate(d.getDate()+i);const ds=d.toISOString().slice(0,10),orders=db.orders.filter(x=>x.deadline===ds),load=orders.reduce((s,o)=>s+(o.lines||[]).reduce((a,l)=>a+num(l.qty),0),0),cls=load>=30?"high":load>=12?"medium":"low";arr.push(`<button class="calendar-day ${cls}" data-date="${ds}"><strong>${d.toLocaleDateString("uz-UZ",{day:"2-digit",month:"short"})}</strong><span>${orders.length} buyurtma</span><span>${load} birlik yuklama</span></button>`)}$("productionCalendar").innerHTML=arr.join("")
}
$("productionCalendar").onclick=e=>{const b=e.target.closest("[data-date]");if(!b)return;const list=db.orders.filter(x=>x.deadline===b.dataset.date);$("calendarDetails").innerHTML=`<h3>${b.dataset.date}</h3>${list.map(x=>`<div class="list-row"><div><strong>${esc(x.number||"")} — ${esc(x.customer||"")}</strong><p>${esc(normalizedStatus(x))} · ${esc(workerName(productionMeta(x).workerId)||"Usta yo‘q")}</p></div><span class="badge">${money(x.total)}</span></div>`).join("")||"<p>Buyurtma yo‘q.</p>"}`};

$("addWorkerBtn").onclick=()=>$("workerModal").hidden=false;$("workerModalClose").onclick=()=>$("workerModal").hidden=true;$("workerModal").onclick=e=>{if(e.target===$("workerModal"))$("workerModal").hidden=true};
$("workerForm").onsubmit=e=>{e.preventDefault();db.workers.unshift({id:uid("worker"),name:$("workerName").value.trim(),phone:$("workerPhone").value.trim(),role:$("workerRole").value,dailyRate:num($("workerDailyRate").value),createdAt:nowISO()});e.target.reset();persist();$("workerModal").hidden=true;toast("Ishchi qo‘shildi")};
function renderWorkers(){
  $("workerCards").innerHTML=db.workers.map(w=>{const assigned=db.orders.filter(x=>productionMeta(x).workerId===w.id&&!["Yetkazildi","Bekor qilindi"].includes(normalizedStatus(x))),logs=db.workerLogs.filter(x=>x.workerId===w.id&&x.date===today());return`<article class="worker-card"><div class="worker-avatar">${esc((w.name||"U")[0])}</div><h3>${esc(w.name)}</h3><p>${esc(w.role||"")} · ${esc(w.phone||"")}</p><div class="worker-stats"><span>${assigned.length} faol ish</span><span>${logs.reduce((s,x)=>s+num(x.sheets),0)} list</span><span>${logs.reduce((s,x)=>s+num(x.edgeMeters),0)} m</span></div></article>`}).join("")||"<p>Ishchi kiritilmagan.</p>";
  $("workerLogs").innerHTML=`<table style="width:100%;border-collapse:collapse"><thead><tr><th>Sana</th><th>Ishchi</th><th>List</th><th>Kromka</th><th>Teshik</th><th>Izoh</th></tr></thead><tbody>${db.workerLogs.slice(0,30).map(x=>`<tr><td>${x.date}</td><td>${esc(workerName(x.workerId))}</td><td>${x.sheets||0}</td><td>${x.edgeMeters||0} m</td><td>${x.drilled||0}</td><td>${esc(x.note||"")}</td></tr>`).join("")}</tbody></table>`
}

function renderQuality(){
  const list=db.orders.filter(x=>["Sifat nazorati","Tayyor"].includes(normalizedStatus(x)));
  $("qualityGrid").innerHTML=list.map(o=>{const q=o.quality||{},photo=productionMeta(o).photo;return`<article class="quality-card" data-quality-id="${o.id}">${photo?`<img src="${photo}" alt="">`:""}<h3>${esc(o.number||"")} — ${esc(o.customer||"")}</h3><p>${esc(o.note||"")}</p><div class="quality-checks"><label><input type="checkbox" data-check="dimensions" ${q.dimensions?"checked":""}> O‘lcham</label><label><input type="checkbox" data-check="edge" ${q.edge?"checked":""}> Kromka</label><label><input type="checkbox" data-check="drilling" ${q.drilling?"checked":""}> Teshish</label><label><input type="checkbox" data-check="surface" ${q.surface?"checked":""}> Sirt sifati</label></div><button data-approve="${o.id}">${normalizedStatus(o)==="Tayyor"?"Tasdiqlangan":"Sifatni tasdiqlash"}</button></article>`}).join("")||"<p>Sifat nazoratidagi buyurtma yo‘q.</p>"
}
$("qualityGrid").onchange=e=>{const card=e.target.closest("[data-quality-id]");if(!card)return;const o=db.orders.find(x=>x.id===card.dataset.qualityId);o.quality=o.quality||{};o.quality[e.target.dataset.check]=e.target.checked;saveDB(db)};
$("qualityGrid").onclick=e=>{const b=e.target.closest("[data-approve]");if(!b)return;const o=db.orders.find(x=>x.id===b.dataset.approve),q=o.quality||{};if(!["dimensions","edge","drilling","surface"].every(k=>q[k]))return toast("Barcha sifat bandlarini belgilang.");o.status="Tayyor";o.quality.approvedAt=nowISO();persist();toast("Sifat tasdiqlandi")};

function renderCustomerTrack(){
  const q=$("customerTrackSearch").value.trim().toLowerCase();if(!q){$("customerTrackResult").innerHTML="";return}const o=db.orders.find(x=>`${x.number} ${x.phone}`.toLowerCase().includes(q));if(!o){$("customerTrackResult").innerHTML='<div class="track-card"><p>Buyurtma topilmadi.</p></div>';return}const status=normalizedStatus(o),idx=stages.indexOf(status);$("customerTrackResult").innerHTML=`<article class="track-card"><h2>${esc(o.number||"")} — ${esc(o.customer||"Mijoz")}</h2><p>Telefon: ${esc(o.phone||"-")} · Muddat: ${o.deadline||"-"}</p><div class="track-steps">${stages.slice(0,-1).map((s,i)=>`<div class="track-step ${i<idx?"done":i===idx?"current":""}">${esc(s)}</div>`).join("")}</div></article>`
}
$("customerTrackSearch").oninput=renderCustomerTrack;

function renderAll(){db=loadDB();renderDashboard();renderProduction();renderCalendar();renderWorkers();renderQuality();renderCustomerTrack();setTimeout(renderChart,40)}
window.addEventListener("storage",renderAll);window.addEventListener("ibrat-db-change",renderAll);renderAll();