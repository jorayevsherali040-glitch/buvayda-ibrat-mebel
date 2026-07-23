import {loadDB,saveDB,uid,nowISO,money} from "./local-db.js";
const $=id=>document.getElementById(id);
let db=loadDB();
let pendingImport=[];
let deleteTarget=null;
let scannerStream=null;
let scannerTimer=null;
const deleteModal=$("deleteModal");
if(deleteModal){deleteModal.hidden=true;deleteModal.setAttribute("aria-hidden","true")}

if(sessionStorage.getItem("v13PinVerified")!=="1"){
  sessionStorage.setItem("v17AfterLogin","product-manager");
  location.href="./super-admin.html";
}

const pageTitles={dashboard:"Umumiy ko‘rinish","laminate-form":"Laminat qo‘shish","edge-form":"Kromka qo‘shish","furniture-form":"Mebel qo‘shish",laminates:"Laminatlar",edges:"Kromkalar",furniture:"Mebellar","import-export":"Excel import / eksport",qr:"QR kodlar",scanner:"QR skaner"};
function esc(v=""){return String(v).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;")}
function num(v){return Number(v||0)}
function toast(m){const t=$("toast");t.textContent=m;t.classList.add("show");clearTimeout(t._);t._=setTimeout(()=>t.classList.remove("show"),2200)}
function imageOf(x){return x.imageUrl||x.image||"./product-placeholder.svg"}
function save(){db=saveDB(db);renderAll()}
function go(page){
  document.querySelectorAll("[data-page]").forEach(x=>x.classList.toggle("active",x.dataset.page===page));
  document.querySelectorAll(".pm-page").forEach(x=>x.classList.remove("active"));
  $("page"+page.split("-").map(v=>v[0].toUpperCase()+v.slice(1)).join("")).classList.add("active");
  $("pageTitle").textContent=pageTitles[page];
  $("pmSidebar").classList.remove("open");
  if(page==="qr")renderQr();
}
document.querySelectorAll("[data-page]").forEach(b=>b.onclick=()=>go(b.dataset.page));
document.querySelectorAll("[data-go]").forEach(b=>b.onclick=()=>go(b.dataset.go));
$("menuToggle").onclick=()=>$("pmSidebar").classList.toggle("open");
$("themeToggle").onclick=()=>document.documentElement.classList.toggle("dark");
$("logoutButton").onclick=()=>{sessionStorage.removeItem("v13PinVerified");location.href="./super-admin.html"};

async function compressImage(file,maxWidth=1000,quality=.78){
  const bitmap=await createImageBitmap(file);
  const scale=Math.min(1,maxWidth/bitmap.width);
  const canvas=document.createElement("canvas");
  canvas.width=Math.round(bitmap.width*scale);canvas.height=Math.round(bitmap.height*scale);
  canvas.getContext("2d").drawImage(bitmap,0,0,canvas.width,canvas.height);
  return canvas.toDataURL("image/jpeg",quality);
}
async function handleImage(file,preview){
  if(!file)return "";
  if(file.size>12*1024*1024){toast("Rasm 12 MB dan kichik bo‘lsin.");return ""}
  const data=await compressImage(file);
  preview.src=data;return data
}
let laminateImageData="",edgeImageData="",furnitureImageData="";
$("laminateImageFile").onchange=async e=>{laminateImageData=await handleImage(e.target.files[0],$("laminatePreview"))};
$("edgeImageFile").onchange=async e=>{edgeImageData=await handleImage(e.target.files[0],$("edgePreview"))};
$("furnitureImageFile").onchange=async e=>{furnitureImageData=await handleImage(e.target.files[0],$("furniturePreview"))};
$("laminateImageUrl").oninput=e=>{if(e.target.value)$("laminatePreview").src=e.target.value};
$("edgeImageUrl").oninput=e=>{if(e.target.value)$("edgePreview").src=e.target.value};
$("furnitureImageUrl").oninput=e=>{if(e.target.value)$("furniturePreview").src=e.target.value};

function resetLaminate(){
  $("laminateForm").reset();$("laminateId").value="";$("laminateSize").value="2800×2070";$("laminateMinStock").value=5;$("laminatePreview").src="./product-placeholder.svg";laminateImageData="";$("laminateFormTitle").textContent="Yangi laminat"
}
function resetEdge(){
  $("edgeForm").reset();$("edgeId").value="";$("edgeMinStock").value=50;$("edgeRollMeters").value=200;$("edgePreview").src="./product-placeholder.svg";edgeImageData="";$("edgeFormTitle").textContent="Yangi kromka"
}
$("resetLaminateForm").onclick=resetLaminate;$("resetEdgeForm").onclick=resetEdge;

function laminateData(){
  return{
    id:$("laminateId").value||uid("lam"),code:$("laminateCode").value.trim(),name:$("laminateName").value.trim(),color:$("laminateName").value.trim(),
    brand:$("laminateBrand").value.trim(),thickness:$("laminateThickness").value,size:$("laminateSize").value.trim(),
    salePrice:num($("laminateSalePrice").value),oldPrice:num($("laminateOldPrice").value),costPrice:num($("laminateCostPrice").value),
    stock:num($("laminateStock").value),minStock:num($("laminateMinStock").value),location:$("laminateLocation").value.trim(),
    matchingEdges:$("laminateMatchingEdges").value.split(",").map(x=>x.trim()).filter(Boolean),tags:$("laminateTags").value.split(",").map(x=>x.trim()).filter(Boolean),
    note:$("laminateNote").value.trim(),imageUrl:laminateImageData||$("laminateImageUrl").value.trim()||$("laminatePreview").src,
    updatedAt:nowISO()
  }
}
function edgeData(){
  return{
    id:$("edgeId").value||uid("edge"),code:$("edgeCode").value.trim(),name:$("edgeName").value.trim(),brand:$("edgeBrand").value.trim(),
    thickness:$("edgeThickness").value,width:$("edgeWidth").value,salePrice:num($("edgeSalePrice").value),costPrice:num($("edgeCostPrice").value),
    rollMeters:num($("edgeRollMeters").value),stock:num($("edgeStock").value),minStock:num($("edgeMinStock").value),location:$("edgeLocation").value.trim(),
    matchingLaminate:$("edgeMatchingLaminate").value.trim(),tags:$("edgeTags").value.split(",").map(x=>x.trim()).filter(Boolean),note:$("edgeNote").value.trim(),
    imageUrl:edgeImageData||$("edgeImageUrl").value.trim()||$("edgePreview").src,updatedAt:nowISO()
  }
}

function resetFurniture(){
  $("furnitureForm").reset();
  $("furnitureId").value="";
  $("furnitureStock").value=1;
  $("furniturePreview").src="./product-placeholder.svg";
  furnitureImageData="";
  $("furnitureFormTitle").textContent="Yangi mebel qo‘shish";
}
$("resetFurnitureForm").onclick=resetFurniture;
function furnitureData(){
  return{
    id:$("furnitureId").value||uid("furniture"),
    name:$("furnitureName").value.trim(),
    category:$("furnitureCategory").value,
    price:num($("furniturePrice").value),
    oldPrice:num($("furnitureOldPrice").value),
    stock:num($("furnitureStock").value),
    material:$("furnitureMaterial").value.trim(),
    color:$("furnitureColor").value.trim(),
    description:$("furnitureDescription").value.trim(),
    imageUrl:furnitureImageData||$("furnitureImageUrl").value.trim()||$("furniturePreview").src,
    updatedAt:nowISO()
  }
}
function upsert(list,item){
  const i=list.findIndex(x=>x.id===item.id);
  if(i>=0)list[i]={...list[i],...item};else list.unshift({...item,createdAt:nowISO()});
}
$("laminateForm").onsubmit=e=>{e.preventDefault();const item=laminateData();upsert(db.laminates,item);save();toast("Laminat saqlandi");resetLaminate();go("laminates")};
$("edgeForm").onsubmit=e=>{e.preventDefault();const item=edgeData();upsert(db.edges,item);save();toast("Kromka saqlandi");resetEdge();go("edges")};
$("furnitureForm").onsubmit=e=>{e.preventDefault();const item=furnitureData();upsert(db.products,item);save();toast("Mebel saqlandi");resetFurniture();go("furniture")};
$("saveAndNewLaminate").onclick=()=>{if(!$("laminateForm").reportValidity())return;upsert(db.laminates,laminateData());save();resetLaminate();$("laminateCode").focus();toast("Saqlandi. Yangi laminat kiriting.")};
$("saveAndNewEdge").onclick=()=>{if(!$("edgeForm").reportValidity())return;upsert(db.edges,edgeData());save();resetEdge();$("edgeCode").focus();toast("Saqlandi. Yangi kromka kiriting.")};
$("saveAndNewFurniture").onclick=()=>{if(!$("furnitureForm").reportValidity())return;upsert(db.products,furnitureData());save();resetFurniture();$("furnitureName").focus();toast("Saqlandi. Yangi mebel kiriting.")};

function stockBadge(x,unit){
  if(num(x.stock)<=0)return`<span class="pm-badge empty">Tugagan</span>`;
  if(num(x.stock)<=num(x.minStock||0))return`<span class="pm-badge low">${x.stock} ${unit} — kam</span>`;
  return`<span class="pm-badge">${x.stock} ${unit}</span>`
}
function row(x,type){
  const unit=type==="laminate"?"list":"m";
  return`<div class="pm-list-row"><div><strong>${esc(x.code)} — ${esc(x.name)}</strong><p>${esc(x.brand||"")} · ${esc(x.location||"Joy ko‘rsatilmagan")}</p></div>${stockBadge(x,unit)}</div>`
}
function renderDashboard(){
  $("statLamTypes").textContent=db.laminates.length;$("statLamStock").textContent=db.laminates.reduce((s,x)=>s+num(x.stock),0).toLocaleString("uz-UZ")+" list";
  $("statEdgeTypes").textContent=db.edges.length;$("statEdgeStock").textContent=db.edges.reduce((s,x)=>s+num(x.stock),0).toLocaleString("uz-UZ")+" m";
  const low=[...db.laminates.map(x=>({...x,type:"laminate"})),...db.edges.map(x=>({...x,type:"edge"}))].filter(x=>num(x.stock)<=num(x.minStock||0));
  $("statFurniture").textContent=db.products.length;$("statLow").textContent=low.length;$("lowStockList").innerHTML=low.slice(0,10).map(x=>row(x,x.type)).join("")||"<p>Kam qolgan mahsulot yo‘q.</p>";
  $("recentLaminates").innerHTML=db.laminates.slice(0,6).map(x=>row(x,"laminate")).join("")||"<p>Ma’lumot yo‘q.</p>";
  $("recentEdges").innerHTML=db.edges.slice(0,6).map(x=>row(x,"edge")).join("")||"<p>Ma’lumot yo‘q.</p>";
}
function filterStock(x,filter){
  if(!filter)return true;if(filter==="available")return num(x.stock)>0;if(filter==="low")return num(x.stock)>0&&num(x.stock)<=num(x.minStock||0);return num(x.stock)<=0
}
function renderLaminates(){
  const q=$("laminateSearch").value.toLowerCase(),f=$("laminateStockFilter").value;
  const list=db.laminates.filter(x=>(!q||`${x.code} ${x.name} ${x.brand} ${x.location}`.toLowerCase().includes(q))&&filterStock(x,f));
  $("laminateTable").innerHTML=`<div class="pm-table-wrap"><table class="pm-table"><thead><tr><th>Rasm</th><th>Kod / nom</th><th>Brend</th><th>Qalinlik</th><th>Qoldiq</th><th>Narx</th><th>Joy</th><th>Amal</th></tr></thead><tbody>${list.map(x=>`<tr><td><img class="pm-thumb" src="${esc(imageOf(x))}"></td><td><b>${esc(x.code)}</b><br>${esc(x.name)}</td><td>${esc(x.brand||"")}</td><td>${esc(x.thickness||"")} mm</td><td>${stockBadge(x,"list")}</td><td>${money(x.salePrice)}</td><td>${esc(x.location||"")}</td><td><button class="pm-edit" data-edit-l="${x.id}">Edit</button> <button class="pm-qr" data-qr-l="${x.id}">QR</button> <button class="pm-delete" data-delete-l="${x.id}">O‘chirish</button></td></tr>`).join("")}</tbody></table></div>`
}

function renderFurniture(){
  const q=$("furnitureSearch").value.toLowerCase(),cat=$("furnitureCategoryFilter").value;
  const list=db.products.filter(x=>(!q||`${x.name} ${x.category} ${x.material} ${x.color}`.toLowerCase().includes(q))&&(!cat||x.category===cat));
  $("furnitureGrid").innerHTML=list.length?list.map(x=>`<article class="pm-furniture-card"><img src="${esc(imageOf(x))}" alt=""><div><h3>${esc(x.name)}</h3><p>${esc(x.category||"Boshqa")} · ${esc(x.material||"")}</p><p><b>${money(x.price)}</b> · Ombor: ${num(x.stock)}</p><div class="pm-furniture-actions"><button class="pm-edit" data-edit-f="${x.id}">Edit</button><button class="pm-delete" data-delete-f="${x.id}">O‘chirish</button></div></div></article>`).join(""):"<p>Mebellar hali qo‘shilmagan.</p>";
}
function fillFurniture(x){
  $("furnitureId").value=x.id;
  $("furnitureName").value=x.name||"";
  $("furnitureCategory").value=x.category||"Boshqa";
  $("furniturePrice").value=x.price||0;
  $("furnitureOldPrice").value=x.oldPrice||0;
  $("furnitureStock").value=x.stock??1;
  $("furnitureMaterial").value=x.material||"";
  $("furnitureColor").value=x.color||"";
  $("furnitureDescription").value=x.description||"";
  $("furnitureImageUrl").value=x.imageUrl&&x.imageUrl.startsWith("http")?x.imageUrl:"";
  $("furniturePreview").src=imageOf(x);
  furnitureImageData=x.imageUrl||"";
  $("furnitureFormTitle").textContent="Mebelni tahrirlash";
  go("furniture-form");
}
$("furnitureSearch").oninput=renderFurniture;
$("furnitureCategoryFilter").onchange=renderFurniture;
$("furnitureGrid").onclick=e=>{
  const edit=e.target.closest("[data-edit-f]"),del=e.target.closest("[data-delete-f]");
  if(edit)fillFurniture(db.products.find(x=>x.id===edit.dataset.editF));
  if(del)openDelete("products",del.dataset.deleteF);
};

function renderEdges(){
  const q=$("edgeSearch").value.toLowerCase(),f=$("edgeStockFilter").value;
  const list=db.edges.filter(x=>(!q||`${x.code} ${x.name} ${x.brand} ${x.location}`.toLowerCase().includes(q))&&filterStock(x,f));
  $("edgeTable").innerHTML=`<div class="pm-table-wrap"><table class="pm-table"><thead><tr><th>Rasm</th><th>Kod / nom</th><th>O‘lcham</th><th>Mos laminat</th><th>Qoldiq</th><th>Narx</th><th>Joy</th><th>Amal</th></tr></thead><tbody>${list.map(x=>`<tr><td><img class="pm-thumb" src="${esc(imageOf(x))}"></td><td><b>${esc(x.code)}</b><br>${esc(x.name)}</td><td>${esc(x.thickness)}×${esc(x.width)} mm</td><td>${esc(x.matchingLaminate||"")}</td><td>${stockBadge(x,"m")}</td><td>${money(x.salePrice)}</td><td>${esc(x.location||"")}</td><td><button class="pm-edit" data-edit-e="${x.id}">Edit</button> <button class="pm-qr" data-qr-e="${x.id}">QR</button> <button class="pm-delete" data-delete-e="${x.id}">O‘chirish</button></td></tr>`).join("")}</tbody></table></div>`
}
$("laminateSearch").oninput=renderLaminates;$("laminateStockFilter").onchange=renderLaminates;$("edgeSearch").oninput=renderEdges;$("edgeStockFilter").onchange=renderEdges;
function fillLaminate(x){
  $("laminateId").value=x.id;$("laminateCode").value=x.code||"";$("laminateName").value=x.name||"";$("laminateBrand").value=x.brand||"";$("laminateThickness").value=x.thickness||16;$("laminateSize").value=x.size||"2800×2070";$("laminateSalePrice").value=x.salePrice||0;$("laminateOldPrice").value=x.oldPrice||0;$("laminateCostPrice").value=x.costPrice||0;$("laminateStock").value=x.stock||0;$("laminateMinStock").value=x.minStock||5;$("laminateLocation").value=x.location||"";$("laminateMatchingEdges").value=(x.matchingEdges||[]).join(", ");$("laminateTags").value=(x.tags||[]).join(", ");$("laminateNote").value=x.note||"";$("laminateImageUrl").value=x.imageUrl&&x.imageUrl.startsWith("http")?x.imageUrl:"";$("laminatePreview").src=imageOf(x);laminateImageData=x.imageUrl||"";$("laminateFormTitle").textContent="Laminatni tahrirlash";go("laminate-form")
}
function fillEdge(x){
  $("edgeId").value=x.id;$("edgeCode").value=x.code||"";$("edgeName").value=x.name||"";$("edgeBrand").value=x.brand||"";$("edgeThickness").value=x.thickness||.4;$("edgeWidth").value=x.width||19;$("edgeSalePrice").value=x.salePrice||0;$("edgeCostPrice").value=x.costPrice||0;$("edgeRollMeters").value=x.rollMeters||200;$("edgeStock").value=x.stock||0;$("edgeMinStock").value=x.minStock||50;$("edgeLocation").value=x.location||"";$("edgeMatchingLaminate").value=x.matchingLaminate||"";$("edgeTags").value=(x.tags||[]).join(", ");$("edgeNote").value=x.note||"";$("edgeImageUrl").value=x.imageUrl&&x.imageUrl.startsWith("http")?x.imageUrl:"";$("edgePreview").src=imageOf(x);edgeImageData=x.imageUrl||"";$("edgeFormTitle").textContent="Kromkani tahrirlash";go("edge-form")
}
$("laminateTable").onclick=e=>{const edit=e.target.closest("[data-edit-l]"),del=e.target.closest("[data-delete-l]"),qr=e.target.closest("[data-qr-l]");if(edit)fillLaminate(db.laminates.find(x=>x.id===edit.dataset.editL));if(del)openDelete("laminates",del.dataset.deleteL);if(qr)openSingleQr("laminates",qr.dataset.qrL)};
$("edgeTable").onclick=e=>{const edit=e.target.closest("[data-edit-e]"),del=e.target.closest("[data-delete-e]"),qr=e.target.closest("[data-qr-e]");if(edit)fillEdge(db.edges.find(x=>x.id===edit.dataset.editE));if(del)openDelete("edges",del.dataset.deleteE);if(qr)openSingleQr("edges",qr.dataset.qrE)};
function openDelete(type,id){
  const list=db[type];
  const x=Array.isArray(list)?list.find(v=>v.id===id):null;
  if(!x)return;
  deleteTarget={type,id};
  $("deleteModalText").textContent=`${x.code||x.name||"Mahsulot"} — ${x.name||""} butunlay o‘chiriladi.`;
  deleteModal.hidden=false;
  deleteModal.setAttribute("aria-hidden","false");
}
function closeDeleteModal(){deleteModal.hidden=true;deleteModal.setAttribute("aria-hidden","true");deleteTarget=null}
$("cancelDelete").onclick=closeDeleteModal;
deleteModal.addEventListener("click",e=>{if(e.target===deleteModal)closeDeleteModal()});
document.addEventListener("keydown",e=>{if(e.key==="Escape"&&!deleteModal.hidden)closeDeleteModal()});
$("confirmDelete").onclick=()=>{
  if(!deleteTarget)return closeDeleteModal();
  db[deleteTarget.type]=db[deleteTarget.type].filter(x=>x.id!==deleteTarget.id);
  save();
  closeDeleteModal();
  toast("Mahsulot o‘chirildi");
};

function csvEscape(v){const s=Array.isArray(v)?v.join(", "):String(v??"");return`"${s.replaceAll('"','""')}"`}
function downloadBlob(content,name,type="text/csv;charset=utf-8"){
  const blob=new Blob(["\ufeff"+content],{type}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),500)
}
const laminateHeaders=["Kod","Nomi","Brend","Qalinlik","Olcham","Sotuv narxi","Eski narxi","Tannarxi","Qoldiq","Minimal qoldiq","Ombor joyi","Mos kromka","Rasm URL","Izoh"];
const edgeHeaders=["Kod","Nomi","Brend","Qalinlik","Eni","Sotuv narxi","Tannarxi","Rulon metri","Qoldiq","Minimal qoldiq","Ombor joyi","Mos laminat","Rasm URL","Izoh"];
function toRows(type){
  return type==="laminates"?db.laminates.map(x=>[x.code,x.name,x.brand,x.thickness,x.size,x.salePrice,x.oldPrice,x.costPrice,x.stock,x.minStock,x.location,(x.matchingEdges||[]).join(", "),x.imageUrl,x.note]):db.edges.map(x=>[x.code,x.name,x.brand,x.thickness,x.width,x.salePrice,x.costPrice,x.rollMeters,x.stock,x.minStock,x.location,x.matchingLaminate,x.imageUrl,x.note])
}
function exportCsv(type){
  const headers=type==="laminates"?laminateHeaders:edgeHeaders,rows=toRows(type),csv=[headers,...rows].map(r=>r.map(csvEscape).join(",")).join("\n");downloadBlob(csv,`${type}-${new Date().toISOString().slice(0,10)}.csv`)
}
function exportXlsx(type){
  if(!window.XLSX){exportCsv(type);toast("Excel kutubxonasi yuklanmadi. CSV yuklandi.");return}
  const headers=type==="laminates"?laminateHeaders:edgeHeaders,ws=XLSX.utils.aoa_to_sheet([headers,...toRows(type)]),wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,type==="laminates"?"Laminatlar":"Kromkalar");XLSX.writeFile(wb,`${type}-${new Date().toISOString().slice(0,10)}.xlsx`)
}
$("exportLaminateExcel").onclick=()=>exportXlsx("laminates");$("exportEdgeExcel").onclick=()=>exportXlsx("edges");$("exportLaminatesCsv").onclick=()=>exportCsv("laminates");$("exportEdgesCsv").onclick=()=>exportCsv("edges");
$("exportAllExcel").onclick=()=>{if(!window.XLSX){toast("Internet yo‘q. CSV tugmalaridan foydalaning.");return}const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet([laminateHeaders,...toRows("laminates")]),"Laminatlar");XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet([edgeHeaders,...toRows("edges")]),"Kromkalar");XLSX.writeFile(wb,"Buvayda-Ibrat-Mebel-V18.xlsx")};
$("downloadTemplate").onclick=()=>{const type=$("importType").value,headers=type==="laminates"?laminateHeaders:edgeHeaders,sample=type==="laminates"?["A101","Kashmir","Egger",16,"2800×2070",850000,900000,750000,25,5,"A-15","04.19, 08.19","","Namuna"]:["04.19","Oq mat","Rehau",.4,19,2500,1800,200,1200,50,"K-08","A101, W980","","Namuna"];if(window.XLSX){const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet([headers,sample]),"Shablon");XLSX.writeFile(wb,`${type}-shablon.xlsx`)}else downloadBlob([headers,sample].map(r=>r.map(csvEscape).join(",")).join("\n"),`${type}-shablon.csv`)};
$("importFile").onchange=async e=>{
  const file=e.target.files[0];if(!file)return;const ext=file.name.split(".").pop().toLowerCase();
  try{
    let rows=[];
    if(ext==="csv"){const text=await file.text();rows=parseCsv(text)}
    else{if(!window.XLSX)throw new Error("Excel kutubxonasi yuklanmadi");const data=await file.arrayBuffer(),wb=XLSX.read(data),ws=wb.Sheets[wb.SheetNames[0]];rows=XLSX.utils.sheet_to_json(ws,{header:1,defval:""})}
    pendingImport=rows.slice(1).filter(r=>r.some(v=>String(v).trim())).map(r=>mapImported($("importType").value,r));renderImportPreview();$("confirmImport").disabled=!pendingImport.length
  }catch(err){console.error(err);toast("Faylni o‘qib bo‘lmadi. Shablondan foydalaning.")}
};
function parseCsv(text){
  const rows=[];let row=[],cell="",q=false;for(let i=0;i<text.length;i++){const c=text[i],n=text[i+1];if(c==='"'&&q&&n==='"'){cell+='"';i++}else if(c==='"')q=!q;else if(c===","&&!q){row.push(cell);cell=""}else if((c==="\n"||c==="\r")&&!q){if(c==="\r"&&n==="\n")i++;row.push(cell);rows.push(row);row=[];cell=""}else cell+=c}if(cell||row.length){row.push(cell);rows.push(row)}return rows
}
function mapImported(type,r){
  if(type==="laminates")return{id:uid("lam"),code:String(r[0]).trim(),name:String(r[1]).trim(),color:String(r[1]).trim(),brand:String(r[2]).trim(),thickness:String(r[3]||16),size:String(r[4]||"2800×2070"),salePrice:num(r[5]),oldPrice:num(r[6]),costPrice:num(r[7]),stock:num(r[8]),minStock:num(r[9]||5),location:String(r[10]).trim(),matchingEdges:String(r[11]).split(",").map(x=>x.trim()).filter(Boolean),imageUrl:String(r[12]).trim(),note:String(r[13]).trim(),createdAt:nowISO()}
  return{id:uid("edge"),code:String(r[0]).trim(),name:String(r[1]).trim(),brand:String(r[2]).trim(),thickness:String(r[3]||.4),width:String(r[4]||19),salePrice:num(r[5]),costPrice:num(r[6]),rollMeters:num(r[7]||200),stock:num(r[8]),minStock:num(r[9]||50),location:String(r[10]).trim(),matchingLaminate:String(r[11]).trim(),imageUrl:String(r[12]).trim(),note:String(r[13]).trim(),createdAt:nowISO()}
}
function renderImportPreview(){
  $("importPreview").innerHTML=`<div class="pm-preview-table"><table class="pm-table"><thead><tr><th>Kod</th><th>Nomi</th><th>Qoldiq</th><th>Narx</th></tr></thead><tbody>${pendingImport.slice(0,100).map(x=>`<tr><td>${esc(x.code)}</td><td>${esc(x.name)}</td><td>${x.stock}</td><td>${money(x.salePrice)}</td></tr>`).join("")}</tbody></table></div><p>${pendingImport.length} ta mahsulot tayyor.</p>`
}
$("confirmImport").onclick=()=>{const type=$("importType").value;for(const item of pendingImport){const existing=db[type].find(x=>x.code.toLowerCase()===item.code.toLowerCase());if(existing)Object.assign(existing,item,{id:existing.id});else db[type].push(item)}save();toast(`${pendingImport.length} ta mahsulot import qilindi`);pendingImport=[];$("importPreview").innerHTML="";$("confirmImport").disabled=true};

function qrPayload(type,x){return JSON.stringify({app:"BIM-V18",type,id:x.id,code:x.code})}
function renderQr(){
  const type=$("qrType").value,q=$("qrSearch").value.toLowerCase(),list=db[type].filter(x=>!q||`${x.code} ${x.name}`.toLowerCase().includes(q));
  $("qrGrid").innerHTML=list.map(x=>`<article class="pm-qr-card"><strong>${esc(x.code)}</strong><small>${esc(x.name)}</small><div class="pm-qr-code" id="qr-${x.id}"></div><small>${type==="laminates"?x.stock+" list":x.stock+" m"}</small><button data-print-qr="${type}:${x.id}">Chop etish</button></article>`).join("");
  if(window.QRCode)for(const x of list)new QRCode(document.getElementById(`qr-${x.id}`),{text:qrPayload(type,x),width:128,height:128,correctLevel:QRCode.CorrectLevel.M})
}
$("qrType").onchange=renderQr;$("qrSearch").oninput=renderQr;$("printQrPage").onclick=()=>window.print();
$("qrGrid").onclick=e=>{const b=e.target.closest("[data-print-qr]");if(!b)return;const [type,id]=b.dataset.printQr.split(":"),x=db[type].find(v=>v.id===id);printSingleQr(type,x)};
function openSingleQr(type,id){go("qr");$("qrType").value=type;$("qrSearch").value=db[type].find(x=>x.id===id)?.code||"";renderQr()}
function printSingleQr(type,x){
  const div=document.createElement("div"),qr=document.createElement("div");div.style.cssText="padding:25px;text-align:center;font-family:Arial";div.innerHTML=`<h2>BUVAYDA IBRAT MEBEL</h2><h1>${esc(x.code)}</h1><p>${esc(x.name)}</p>`;div.appendChild(qr);document.body.appendChild(div);new QRCode(qr,{text:qrPayload(type,x),width:220,height:220});const w=window.open("","_blank");setTimeout(()=>{w.document.write(`<html><body>${div.outerHTML}</body></html>`);w.document.close();w.print();div.remove()},150)
}

function showScannerProduct(data){
  let payload;try{payload=typeof data==="string"?JSON.parse(data):data}catch{payload={code:data}}
  let x,type;if(payload.id&&payload.type){type=payload.type;x=db[type]?.find(v=>v.id===payload.id)}if(!x){x=db.laminates.find(v=>v.code===payload.code);type="laminates"}if(!x){x=db.edges.find(v=>v.code===payload.code);type="edges"}
  if(!x){$("scannerResult").innerHTML=`<p>Mahsulot topilmadi: ${esc(payload.code||data)}</p>`;return}
  $("scannerResult").innerHTML=`<div class="pm-found"><img src="${esc(imageOf(x))}"><div><h2>${esc(x.code)} — ${esc(x.name)}</h2><p>${type==="laminates"?"Laminat":"Kromka"}</p><p><b>Qoldiq:</b> ${x.stock} ${type==="laminates"?"list":"m"}</p><p><b>Narx:</b> ${money(x.salePrice)}</p><p><b>Joy:</b> ${esc(x.location||"-")}</p><button class="pm-edit" id="scannerEdit">Tahrirlash</button></div></div>`;$("scannerEdit").onclick=()=>type==="laminates"?fillLaminate(x):fillEdge(x)
}
$("startScanner").onclick=async()=>{
  if(!("BarcodeDetector"in window)){$("scannerMessage").textContent="Bu brauzer QR skanerni qo‘llamaydi. Android Chrome’dan foydalaning.";return}
  try{
    scannerStream=await navigator.mediaDevices.getUserMedia({video:{facingMode:"environment"}});
    $("scannerVideo").srcObject=scannerStream;const detector=new BarcodeDetector({formats:["qr_code"]});$("scannerMessage").textContent="QR kodni kameraga tuting...";
    scannerTimer=setInterval(async()=>{try{const codes=await detector.detect($("scannerVideo"));if(codes.length){showScannerProduct(codes[0].rawValue);stopScanner()}}catch{}},500)
  }catch(err){$("scannerMessage").textContent="Kamera ochilmadi. Brauzer ruxsatini tekshiring."}
};
function stopScanner(){if(scannerTimer)clearInterval(scannerTimer);scannerTimer=null;if(scannerStream)scannerStream.getTracks().forEach(t=>t.stop());scannerStream=null;$("scannerVideo").srcObject=null}
$("stopScanner").onclick=stopScanner;

function renderAll(){db=loadDB();renderDashboard();renderLaminates();renderEdges();renderFurniture()}
window.addEventListener("storage",renderAll);window.addEventListener("ibrat-db-change",renderAll);
renderAll();resetLaminate();resetEdge();resetFurniture();
const hashPage=location.hash.replace("#","");
if(pageTitles[hashPage])go(hashPage);
