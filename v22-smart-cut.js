import {loadDB,saveDB,uid,nowISO,today,money} from "./local-db.js";
const $=id=>document.getElementById(id);
let db=loadDB(),parts=[],sheets=[],edgeChart=null,periodChart=null,topChart=null,scannerStream=null,scannerTimer=null;
if(sessionStorage.getItem("v13PinVerified")!=="1"){sessionStorage.setItem("v22AfterLogin","1");location.href="./super-admin.html"}
const pageTitles={optimizer:"AI Smart Cut","edge-calc":"Kromka kalkulyatori",material:"Material Finder",warehouse:"Ombor Heat Map",scanner:"QR Scanner 2.0",recommendations:"AI tavsiyalar",crm:"CRM+",analytics:"Premium Dashboard",catalog:"PDF katalog"};
const num=v=>Number(v||0),esc=(v="")=>String(v).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;");
const colors=["#64b5f6","#81c784","#ffb74d","#ba68c8","#4db6ac","#e57373","#7986cb","#aed581","#ffd54f","#4fc3f7","#f06292","#9575cd"];
function toast(m){const t=$("toast");t.textContent=m;t.classList.add("show");clearTimeout(t._);t._=setTimeout(()=>t.classList.remove("show"),2200)}
function persist(){db=saveDB(db);renderAll()}
function go(page){document.querySelectorAll("[data-page]").forEach(x=>x.classList.toggle("active",x.dataset.page===page));document.querySelectorAll(".sc-page").forEach(x=>x.classList.remove("active"));$("page"+page.split("-").map(v=>v[0].toUpperCase()+v.slice(1)).join("")).classList.add("active");$("pageTitle").textContent=pageTitles[page];$("scSidebar").classList.remove("open");if(page==="edge-calc")renderEdgeBreakdown();if(page==="analytics")renderAnalytics();if(page==="catalog")renderCatalog()}
document.querySelectorAll("[data-page]").forEach(b=>b.onclick=()=>go(b.dataset.page));$("menuBtn").onclick=()=>$("scSidebar").classList.toggle("open");$("themeBtn").onclick=()=>document.documentElement.classList.toggle("dark");$("logoutBtn").onclick=()=>{sessionStorage.removeItem("v13PinVerified");location.href="./super-admin.html"};setInterval(()=>$("clock").textContent=new Date().toLocaleTimeString("uz-UZ"),1000);

function productImage(x){return x.imageUrl||x.image||"./product-placeholder.svg"}
function populateSelectors(){
  $("materialSelect").innerHTML='<option value="">Standart laminat</option>'+db.laminates.map(x=>`<option value="${x.id}">${esc(x.code)} ${esc(x.name)}</option>`).join("");
  $("partEdgeCode").innerHTML='<option value="">Kromka kodi</option>'+db.edges.map(x=>`<option value="${esc(x.code)}">${esc(x.code)} — ${esc(x.name)}</option>`).join("")
}
function renderParts(){
  $("partsTable").innerHTML=`<table class="data-table"><thead><tr><th>#</th><th>Nomi</th><th>O‘lcham</th><th>Dona</th><th>Kromka</th><th></th></tr></thead><tbody>${parts.map((p,i)=>`<tr><td>${i+1}</td><td>${esc(p.name)}</td><td>${p.w}×${p.h}</td><td>${p.qty}</td><td>${esc(p.edgeCode||"-")} · ${p.edgeSides} tomon</td><td><button data-remove="${i}">×</button></td></tr>`).join("")||'<tr><td colspan="6">Detal kiritilmagan.</td></tr>'}</tbody></table>`;
  $("resultParts").textContent=parts.reduce((s,p)=>s+p.qty,0)
}
$("addPart").onclick=()=>{const w=num($("partW").value),h=num($("partH").value),qty=Math.max(1,num($("partQty").value));if(!w||!h)return toast("Detal o‘lchamini kiriting.");parts.push({id:uid("part"),name:$("partName").value.trim()||`Detal ${parts.length+1}`,w,h,qty,edgeCode:$("partEdgeCode").value,edgeSides:num($("partEdgeSides").value)});$("partName").value="";$("partW").value="";$("partH").value="";$("partQty").value=1;renderParts()};
$("partsTable").onclick=e=>{const b=e.target.closest("[data-remove]");if(b){parts.splice(Number(b.dataset.remove),1);renderParts()}};
$("clearParts").onclick=()=>{parts=[];sheets=[];renderParts();renderResult();drawSheet(0)};
$("loadExample").onclick=()=>{parts=[{id:uid("p"),name:"Yon panel",w:600,h:450,qty:8,edgeCode:"04.19",edgeSides:2},{id:uid("p"),name:"Tokcha",w:720,h:350,qty:12,edgeCode:"04.19",edgeSides:1},{id:uid("p"),name:"Fasad",w:820,h:400,qty:4,edgeCode:"08.19",edgeSides:4},{id:uid("p"),name:"Stoleshnitsa",w:1200,h:500,qty:2,edgeCode:"2x45",edgeSides:1}];renderParts();toast("Namuna yuklandi")};

function expandParts(){const arr=[];parts.forEach((p,pi)=>{for(let i=0;i<p.qty;i++)arr.push({...p,partIndex:pi,copy:i+1,area:p.w*p.h})});return arr.sort((a,b)=>Math.max(b.w,b.h)-Math.max(a.w,a.h)||b.area-a.area)}
function newSheet(sw,sh,margin){return{w:sw,h:sh,placed:[],spaces:[{x:margin,y:margin,w:sw-2*margin,h:sh-2*margin}]}}
function fitInSpace(item,space,rotate,kerf){
  const options=[{w:item.w,h:item.h,rotated:false}];
  if(rotate&&item.w!==item.h)options.push({w:item.h,h:item.w,rotated:true});
  return options.filter(o=>o.w<=space.w&&o.h<=space.h).sort((a,b)=>(space.w-a.w)*(space.h-a.h)-(space.w-b.w)*(space.h-b.h))[0]||null
}
function placeItem(sheet,item,allowRotate,kerf){
  let best=null;
  sheet.spaces.forEach((s,idx)=>{const fit=fitInSpace(item,s,allowRotate,kerf);if(!fit)return;const score=Math.min(s.w-fit.w,s.h-fit.h)*100000+(s.w*s.h-fit.w*fit.h);if(!best||score<best.score)best={space:s,idx,fit,score}});
  if(!best)return false;
  const {space,idx,fit}=best;sheet.spaces.splice(idx,1);
  sheet.placed.push({...item,x:space.x,y:space.y,pw:fit.w,ph:fit.h,rotated:fit.rotated});
  const rw=space.w-fit.w-kerf,bh=space.h-fit.h-kerf;
  if(rw>20)sheet.spaces.push({x:space.x+fit.w+kerf,y:space.y,w:rw,h:fit.h});
  if(bh>20)sheet.spaces.push({x:space.x,y:space.y+fit.h+kerf,w:space.w,h:bh});
  return true
}
function optimize(){
  if(!parts.length)return toast("Avval detallarni kiriting.");
  const sw=num($("sheetW").value),sh=num($("sheetH").value),kerf=num($("kerf").value),margin=num($("margin").value),rotate=$("allowRotate").value==="yes";
  const items=expandParts();sheets=[];
  for(const item of items){
    let placed=false;
    for(const sheet of sheets){if(placeItem(sheet,item,rotate,kerf)){placed=true;break}}
    if(!placed){const sheet=newSheet(sw,sh,margin);if(!placeItem(sheet,item,rotate,kerf))return toast(`${item.name} listga sig‘maydi.`);sheets.push(sheet)}
  }
  $("sheetPicker").innerHTML=sheets.map((_,i)=>`<option value="${i}">List ${i+1}</option>`).join("");
  renderResult();drawSheet(0);renderEdgeBreakdown();toast(`${sheets.length} ta listga joylashtirildi`)
}
$("optimizeBtn").onclick=optimize;$("sheetPicker").onchange=e=>drawSheet(num(e.target.value));
function edgeTotals(){
  const totals={};for(const p of parts){let mm=0;if(p.edgeSides===1)mm=Math.max(p.w,p.h);if(p.edgeSides===2)mm=p.w+p.h;if(p.edgeSides===4)mm=2*p.w+2*p.h;if(mm&&p.edgeCode)totals[p.edgeCode]=(totals[p.edgeCode]||0)+mm*p.qty}
  return totals
}
function renderResult(){
  const used=parts.reduce((s,p)=>s+p.w*p.h*p.qty,0),sw=num($("sheetW").value),sh=num($("sheetH").value),total=sheets.length*sw*sh,waste=total?Math.max(0,(total-used)/total*100):0,edge=Object.values(edgeTotals()).reduce((s,v)=>s+v,0)/1000;
  $("resultSheets").textContent=sheets.length;$("resultUsed").textContent=(used/1e6).toFixed(2)+" m²";$("resultWaste").textContent=waste.toFixed(1)+"%";$("resultEdge").textContent=edge.toFixed(1)+" m"
}
function drawSheet(index){
  const c=$("cutCanvas"),ctx=c.getContext("2d");ctx.clearRect(0,0,c.width,c.height);const sheet=sheets[index];if(!sheet){ctx.fillStyle="#6c7b72";ctx.font="24px Arial";ctx.fillText("Optimallashtirish natijasi shu yerda ko‘rinadi.",80,100);$("cutLegend").innerHTML="";return}
  const pad=45,scale=Math.min((c.width-2*pad)/sheet.w,(c.height-2*pad)/sheet.h),ox=(c.width-sheet.w*scale)/2,oy=(c.height-sheet.h*scale)/2;ctx.fillStyle="#f4f6f5";ctx.strokeStyle="#26372d";ctx.lineWidth=3;ctx.fillRect(ox,oy,sheet.w*scale,sheet.h*scale);ctx.strokeRect(ox,oy,sheet.w*scale,sheet.h*scale);
  sheet.placed.forEach((p,i)=>{const col=colors[p.partIndex%colors.length];ctx.fillStyle=col;ctx.globalAlpha=.83;ctx.fillRect(ox+p.x*scale,oy+p.y*scale,p.pw*scale,p.ph*scale);ctx.globalAlpha=1;ctx.strokeStyle="#233229";ctx.lineWidth=1.2;ctx.strokeRect(ox+p.x*scale,oy+p.y*scale,p.pw*scale,p.ph*scale);ctx.fillStyle="#122019";ctx.font=`${Math.max(10,Math.min(18,p.pw*scale/7))}px Arial`;ctx.fillText(`${p.name} ${p.w}×${p.h}`,ox+p.x*scale+5,oy+p.y*scale+20)});
  $("cutLegend").innerHTML=parts.map((p,i)=>`<span><i style="background:${colors[i%colors.length]}"></i>${esc(p.name)} ${p.w}×${p.h}</span>`).join("")
}
$("printCutMap").onclick=()=>window.print();
$("saveCutProject").onclick=()=>{db.cutProjects=db.cutProjects||[];db.cutProjects.unshift({id:uid("cut"),date:today(),materialId:$("materialSelect").value,parts:JSON.parse(JSON.stringify(parts)),sheets:JSON.parse(JSON.stringify(sheets)),createdAt:nowISO()});persist();toast("Kesish loyihasi saqlandi")};

function renderEdgeBreakdown(){
  const totals=edgeTotals(),entries=Object.entries(totals);$("edgeBreakdown").innerHTML=entries.length?`<table class="data-table"><thead><tr><th>Kromka kodi</th><th>Jami metr</th><th>Ombor qoldig‘i</th><th>Holat</th></tr></thead><tbody>${entries.map(([code,mm])=>{const e=db.edges.find(x=>x.code===code),need=mm/1000,stock=num(e?.stock),status=stock>=need?"Yetarli":"Yetmaydi";return`<tr><td>${esc(code)}</td><td>${need.toFixed(1)} m</td><td>${stock.toFixed(1)} m</td><td><span class="${stock>=need?"":"danger"}">${status}</span></td></tr>`}).join("")}</tbody></table>`:"<p>Kromka kodi kiritilgan detallar yo‘q.</p>";
  if(window.Chart){if(edgeChart)edgeChart.destroy();edgeChart=new Chart($("edgeChart"),{type:"doughnut",data:{labels:entries.map(x=>x[0]),datasets:[{data:entries.map(x=>x[1]/1000)}]},options:{plugins:{legend:{position:"bottom"}}}})}
}

function textureOf(x){const h=`${x.name||""} ${x.color||""} ${(x.tags||[]).join(" ")}`.toLowerCase();for(const t of ["oq","yong‘oq","beton","yog‘och","eman","kashmir"])if(h.includes(t))return t;return""}
function populateFilters(){const all=[...db.laminates,...db.edges];$("filterBrand").innerHTML='<option value="">Barcha brend</option>'+[...new Set(all.map(x=>x.brand).filter(Boolean))].sort().map(x=>`<option>${esc(x)}</option>`).join("")}
function renderMaterials(){
  const q=$("materialSearch").value.toLowerCase(),type=$("filterType").value,brand=$("filterBrand").value,texture=$("filterTexture").value.toLowerCase(),min=num($("filterMinPrice").value),max=num($("filterMaxPrice").value),available=$("filterAvailable").checked;
  const lists=[];if(!type||type==="laminates")lists.push(...db.laminates.map(x=>({...x,_type:"Laminat"})));if(!type||type==="edges")lists.push(...db.edges.map(x=>({...x,_type:"Kromka"})));
  const filtered=lists.filter(x=>{const hay=`${x.code} ${x.name} ${x.color||""} ${x.brand||""} ${(x.tags||[]).join(" ")}`.toLowerCase(),price=num(x.salePrice);return(!q||hay.includes(q))&&(!brand||x.brand===brand)&&(!texture||textureOf(x).includes(texture))&&(!min||price>=min)&&(!max||price<=max)&&(!available||num(x.stock)>0)});
  $("materialGrid").innerHTML=filtered.map(x=>`<article class="material-card"><img src="${esc(productImage(x))}" alt=""><div><h3>${esc(x.code||"")} ${esc(x.name)}</h3><p>${esc(x.brand||"")} · ${money(x.salePrice)}</p><div class="tags"><span>${esc(x._type)}</span><span>Qoldiq: ${x.stock}</span>${x.location?`<span>${esc(x.location)}</span>`:""}</div><p><b>Mos:</b> ${esc((x.matchingEdges||x.matchingLaminate||[]).toString()||"Belgilanmagan")}</p></div></article>`).join("")||"<p>Mahsulot topilmadi.</p>"
}
["materialSearch","filterType","filterBrand","filterTexture","filterMinPrice","filterMaxPrice","filterAvailable"].forEach(id=>$(id).addEventListener(id==="materialSearch"?"input":"change",renderMaterials));

function warehouseLocations(){const set=new Set(["A1","A2","A3","A4","A5","A6","B1","B2","B3","B4","B5","B6","C1","C2","C3","C4","C5","C6"]);[...db.laminates,...db.edges].forEach(x=>{if(x.location)set.add(x.location.toUpperCase().replace("-",""))});return [...set].sort()}
function renderWarehouse(){
  $("warehouseGrid").innerHTML=warehouseLocations().map(loc=>{const items=[...db.laminates,...db.edges].filter(x=>(x.location||"").toUpperCase().replace("-","")===loc),stock=items.reduce((s,x)=>s+num(x.stock),0),cls=!items.length?"empty":items.some(x=>num(x.stock)<=num(x.minStock||0))?"low":"full";return`<button class="warehouse-cell ${cls}" data-location="${esc(loc)}"><strong>${esc(loc)}</strong><small>${items.length} tur mahsulot</small><small>${stock.toFixed(0)} birlik</small></button>`}).join("")
}
$("warehouseGrid").onclick=e=>{const b=e.target.closest("[data-location]");if(!b)return;const loc=b.dataset.location,items=[...db.laminates.map(x=>({...x,type:"Laminat"})),...db.edges.map(x=>({...x,type:"Kromka"}))].filter(x=>(x.location||"").toUpperCase().replace("-","")===loc);$("warehouseInfo").innerHTML=`<h2>${esc(loc)}</h2>${items.map(x=>`<div class="list-row"><strong>${esc(x.code)} ${esc(x.name)}</strong><p>${esc(x.type)} · Qoldiq ${x.stock}</p></div>`).join("")||"<p>Bu joy bo‘sh.</p>"}`};

function showScanner(data){let p;try{p=JSON.parse(data)}catch{p={code:data}};let x=(p.type&&db[p.type]?.find(v=>v.id===p.id))||db.laminates.find(v=>v.code===p.code)||db.edges.find(v=>v.code===p.code);if(!x)return $("scannerResult").innerHTML="<p>Mahsulot topilmadi.</p>";$("scannerResult").innerHTML=`<div class="material-card"><img src="${esc(productImage(x))}"><div><h3>${esc(x.code)} ${esc(x.name)}</h3><p>Narx: ${money(x.salePrice)}</p><p>Qoldiq: ${x.stock}</p><p>Ombor: ${esc(x.location||"-")}</p><p>Mos kromka: ${esc((x.matchingEdges||x.matchingLaminate||[]).toString()||"-")}</p></div></div>`}
$("startScanner").onclick=async()=>{if(!("BarcodeDetector"in window))return $("scannerStatus").textContent="Bu brauzer QR skanerni qo‘llamaydi.";try{scannerStream=await navigator.mediaDevices.getUserMedia({video:{facingMode:"environment"}});$("scannerVideo").srcObject=scannerStream;const d=new BarcodeDetector({formats:["qr_code"]});scannerTimer=setInterval(async()=>{const c=await d.detect($("scannerVideo"));if(c.length){showScanner(c[0].rawValue);stopScanner()}},500);$("scannerStatus").textContent="QR kodni kameraga tuting..."}catch{$("scannerStatus").textContent="Kamera ochilmadi."}};
function stopScanner(){if(scannerTimer)clearInterval(scannerTimer);scannerTimer=null;if(scannerStream)scannerStream.getTracks().forEach(t=>t.stop());scannerStream=null;$("scannerVideo").srcObject=null}$("stopScanner").onclick=stopScanner;

function renderRecommendations(){
  const cards=[];[...db.laminates.map(x=>({...x,type:"Laminat",unit:"list"})),...db.edges.map(x=>({...x,type:"Kromka",unit:"m"}))].forEach(x=>{if(num(x.stock)<=0)cards.push({cls:"warning",title:`${x.code} tugagan`,text:`${x.name} omborda qolmagan. Xarid rejasiga qo‘shing.`});else if(num(x.stock)<=num(x.minStock||0))cards.push({cls:"warning",title:`${x.code} kam qoldi`,text:`Qoldiq ${x.stock} ${x.unit}. Minimal daraja ${x.minStock||0}.`})});
  const productMap={};for(const o of db.orders||[])for(const l of o.lines||[]){productMap[l.name]=(productMap[l.name]||0)+num(l.qty)}Object.entries(productMap).sort((a,b)=>b[1]-a[1]).slice(0,3).forEach(([name,qty])=>cards.push({cls:"good",title:`${name} — top mahsulot`,text:`Jami ${qty} birlik buyurtmalarda ishlatilgan.`}));
  if(!cards.length)cards.push({cls:"info",title:"Ombor holati yaxshi",text:"Kam qolgan mahsulotlar aniqlanmadi."});
  $("recommendGrid").innerHTML=cards.map(c=>`<article class="recommend-card ${c.cls}"><strong>${esc(c.title)}</strong><p>${esc(c.text)}</p></article>`).join("")
}
function renderCrm(){
  const q=$("crmSearch").value.toLowerCase();const names=new Map();db.customers.forEach(c=>names.set(c.phone||c.name,c));db.orders.forEach(o=>{const k=o.phone||o.customer;if(!names.has(k))names.set(k,{name:o.customer,phone:o.phone,telegram:o.telegram})});
  $("crmGrid").innerHTML=[...names.values()].filter(c=>!q||`${c.name} ${c.phone}`.toLowerCase().includes(q)).map(c=>{const os=db.orders.filter(o=>(c.phone&&o.phone===c.phone)||(!c.phone&&o.customer===c.name)).slice(0,8),total=os.reduce((s,o)=>s+num(o.total),0),debt=os.reduce((s,o)=>s+num(o.debt),0);return`<article class="crm-card"><h3>${esc(c.name||"Mijoz")}</h3><p>☎ ${esc(c.phone||"-")} · Telegram: ${esc(c.telegram||"-")}</p><div class="crm-stats"><span>${os.length} buyurtma</span><span>${money(total)}</span><span>Qarz ${money(debt)}</span></div><p>Bonus: ${num(c.bonus||0)} · Chegirma: ${num(c.discount||0)}%</p><p>${os.map(o=>`${o.number} — ${money(o.total)}`).join("<br>")||"Buyurtma yo‘q"}</p></article>`}).join("")
}$("crmSearch").oninput=renderCrm;

function periodSales(days){const d=new Date();d.setDate(d.getDate()-days+1);const from=d.toISOString().slice(0,10);return db.orders.filter(x=>(x.date||"")>=from).reduce((s,x)=>s+num(x.total),0)}
function renderAnalytics(){
  $("aToday").textContent=money(db.orders.filter(x=>x.date===today()).reduce((s,x)=>s+num(x.total),0));$("aWeek").textContent=money(periodSales(7));$("aMonth").textContent=money(periodSales(30));$("aYear").textContent=money(periodSales(365));
  if(!window.Chart)return;const labels=[],vals=[];for(let i=29;i>=0;i--){const d=new Date();d.setDate(d.getDate()-i);const ds=d.toISOString().slice(0,10);labels.push(ds.slice(5));vals.push(db.orders.filter(x=>x.date===ds).reduce((s,x)=>s+num(x.total),0))}
  if(periodChart)periodChart.destroy();periodChart=new Chart($("periodChart"),{type:"line",data:{labels,datasets:[{label:"30 kun savdo",data:vals,tension:.35,borderWidth:2}]},options:{scales:{y:{beginAtZero:true}}}});
  const map={};for(const o of db.orders)for(const l of o.lines||[])map[l.name]=(map[l.name]||0)+num(l.qty);const top=Object.entries(map).sort((a,b)=>b[1]-a[1]).slice(0,8);if(topChart)topChart.destroy();topChart=new Chart($("topChart"),{type:"bar",data:{labels:top.map(x=>x[0]),datasets:[{label:"Top mahsulot/xizmat",data:top.map(x=>x[1])}]},options:{indexAxis:"y",scales:{x:{beginAtZero:true}}}})
}

function catalogItems(){const type=$("catalogType").value,stockOnly=$("catalogStockOnly").checked;let list=[];if(type==="all"||type==="laminates")list.push(...db.laminates.map(x=>({...x,type:"Laminat",price:x.salePrice})));if(type==="all"||type==="edges")list.push(...db.edges.map(x=>({...x,type:"Kromka",price:x.salePrice})));if(type==="products")list.push(...db.products.map(x=>({...x,type:"Mebel",price:x.price})));return list.filter(x=>!stockOnly||num(x.stock)>0)}
function renderCatalog(){$("catalogPreview").innerHTML=catalogItems().map(x=>`<article class="catalog-card"><img src="${esc(productImage(x))}"><div><h3>${esc(x.code||"")} ${esc(x.name)}</h3><p>${esc(x.type)} · ${esc(x.brand||x.category||"")}</p><p><b>${money(x.price)}</b> · Qoldiq ${x.stock}</p></div></article>`).join("")||"<p>Mahsulot yo‘q.</p>"}
$("catalogType").onchange=renderCatalog;$("catalogStockOnly").onchange=renderCatalog;$("generateCatalog").onclick=()=>{renderCatalog();setTimeout(()=>window.print(),100)};

function renderAll(){db=loadDB();populateSelectors();populateFilters();renderParts();renderMaterials();renderWarehouse();renderRecommendations();renderCrm();renderCatalog();drawSheet(0)}
window.addEventListener("storage",renderAll);window.addEventListener("ibrat-db-change",renderAll);renderAll();
