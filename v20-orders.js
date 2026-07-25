import {loadDB,saveDB,uid,nowISO,today,money} from "./local-db.js";
const $=id=>document.getElementById(id);
let db=loadDB(),lines=[],chart=null;
if(sessionStorage.getItem("v13PinVerified")!=="1"){sessionStorage.setItem("v20AfterLogin","1");location.href="./super-admin.html"}

const pages={dashboard:"Buyurtmalar boshqaruvi","new-order":"Yangi buyurtma",orders:"Buyurtmalar",production:"Ishlab chiqarish",movements:"Ombor harakati",profit:"Buyurtma foydasi",workers:"Ishchilar hisoboti"};
const num=v=>Number(v||0),esc=(v="")=>String(v).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;");
function toast(m){const t=$("toast");t.textContent=m;t.classList.add("show");clearTimeout(t._);t._=setTimeout(()=>t.classList.remove("show"),2200)}
function persist(){db=saveDB(db);renderAll()}
function statuses(){return db.orderSettings?.statuses||["Kutmoqda","Kesilmoqda","Kromka urilmoqda","Teshilmoqda","Yig‘ilmoqda","Tayyor","Yetkazildi"]}
function go(page){document.querySelectorAll("[data-page]").forEach(x=>x.classList.toggle("active",x.dataset.page===page));document.querySelectorAll(".o-page").forEach(x=>x.classList.remove("active"));$("page"+page.split("-").map(v=>v[0].toUpperCase()+v.slice(1)).join("")).classList.add("active");$("pageTitle").textContent=pages[page];$("sidebar").classList.remove("open");if(page==="dashboard")setTimeout(renderChart,50)}
document.querySelectorAll("[data-page]").forEach(b=>b.onclick=()=>go(b.dataset.page));document.querySelectorAll("[data-go]").forEach(b=>b.onclick=()=>go(b.dataset.go));
$("menuBtn").onclick=()=>$("sidebar").classList.toggle("open");$("themeBtn").onclick=()=>document.documentElement.classList.toggle("dark");$("logoutBtn").onclick=()=>{sessionStorage.removeItem("v13PinVerified");location.href="./super-admin.html"};$("todayLabel").textContent=new Date().toLocaleDateString("uz-UZ",{day:"2-digit",month:"long",year:"numeric"});

function nextNumber(){const n=db.orderSettings?.nextNumber||1;return`BIM-${new Date().getFullYear()}-${String(n).padStart(5,"0")}`}
function resetOrder(){
  $("orderForm").reset();$("orderId").value="";$("orderNumber").value=nextNumber();$("orderDate").value=today();$("orderStatus").innerHTML=statuses().map(s=>`<option>${s}</option>`).join("");lines=[];renderLines();populateProducts()
}
$("resetOrder").onclick=resetOrder;
function populateProducts(){
  const type=$("lineType").value;let list=[],unit="dona";
  if(type==="laminates"){list=db.laminates;unit="list"}else if(type==="edges"){list=db.edges;unit="metr"}else if(type==="products"){list=db.products;unit="dona"}
  $("lineProduct").innerHTML='<option value="">Tanlang</option>'+list.map(x=>`<option value="${x.id}">${esc(x.code||"")} ${esc(x.name)}</option>`).join("");$("lineProduct").hidden=!list.length;$("lineName").dataset.unit=unit;
  if(type==="service"){$("lineName").value="Kesish / kromka / teshish xizmati";$("lineName").dataset.unit="xizmat"}else if(type==="custom"){$("lineName").value="";$("lineName").dataset.unit="dona"}else $("lineName").value=""
}
$("lineType").onchange=populateProducts;$("lineProduct").onchange=()=>{const type=$("lineType").value,x=(db[type]||[]).find(v=>v.id===$("lineProduct").value);if(!x)return;$("lineName").value=`${x.code||""} ${x.name}`.trim();$("linePrice").value=x.salePrice??x.price??0;$("lineCost").value=x.costPrice??0;$("lineName").dataset.productId=x.id};
$("addLine").onclick=()=>{const name=$("lineName").value.trim();if(!name)return toast("Mahsulot yoki xizmat nomini kiriting.");lines.push({id:uid("line"),type:$("lineType").value,productId:$("lineName").dataset.productId||"",name,unit:$("lineName").dataset.unit||"dona",qty:num($("lineQty").value)||1,price:num($("linePrice").value),cost:num($("lineCost").value)});$("lineQty").value=1;renderLines()};
function totals(){const sales=lines.reduce((s,x)=>s+x.qty*x.price,0),cost=lines.reduce((s,x)=>s+x.qty*x.cost,0),paid=num($("orderPaid").value);return{sales,cost,profit:sales-cost,paid,debt:Math.max(0,sales-paid)}}
function renderLines(){
  $("orderLines").innerHTML=lines.length?lines.map((x,i)=>`<tr><td>${i+1}</td><td>${esc(x.name)}</td><td>${esc(x.unit)}</td><td><input data-q="${x.id}" type="number" min="0" step="0.01" value="${x.qty}"></td><td><input data-p="${x.id}" type="number" min="0" value="${x.price}"></td><td><input data-c="${x.id}" type="number" min="0" value="${x.cost}"></td><td><b>${money(x.qty*x.price)}</b></td><td><button data-d="${x.id}">×</button></td></tr>`).join(""):'<tr><td colspan="8" style="text-align:center;color:#6c7b72">Mahsulot yoki xizmat qo‘shing.</td></tr>';renderSummary()
}
$("orderLines").oninput=e=>{const id=e.target.dataset.q||e.target.dataset.p||e.target.dataset.c;if(!id)return;const x=lines.find(v=>v.id===id);if(e.target.dataset.q)x.qty=num(e.target.value);if(e.target.dataset.p)x.price=num(e.target.value);if(e.target.dataset.c)x.cost=num(e.target.value);renderLines()};
$("orderLines").onclick=e=>{const b=e.target.closest("[data-d]");if(b){lines=lines.filter(x=>x.id!==b.dataset.d);renderLines()}};
$("orderPaid").oninput=renderSummary;
function renderSummary(){const t=totals();$("sumSales").textContent=money(t.sales);$("sumCost").textContent=money(t.cost);$("sumProfit").textContent=money(t.profit);$("sumPaid").textContent=money(t.paid);$("sumDebt").textContent=money(t.debt)}
function orderData(){const t=totals();return{id:$("orderId").value||uid("ord"),number:$("orderNumber").value,date:$("orderDate").value,deadline:$("orderDeadline").value,status:$("orderStatus").value,customer:$("orderCustomer").value.trim(),phone:$("orderPhone").value.trim(),telegram:$("orderTelegram").value.trim(),address:$("orderAddress").value.trim(),designer:$("orderDesigner").value.trim(),worker:$("orderWorker").value.trim(),lines:JSON.parse(JSON.stringify(lines)),total:t.sales,cost:t.cost,profit:t.profit,paid:t.paid,debt:t.debt,note:$("orderNote").value.trim(),updatedAt:nowISO()}}
function saveOrder(deduct=false){
  if(!$("orderForm").reportValidity()||!lines.length)return toast("Buyurtma va mahsulotlarni to‘liq kiriting.");
  const item=orderData(),i=db.orders.findIndex(x=>x.id===item.id),isNew=i<0;if(isNew){db.orders.unshift({...item,createdAt:nowISO()});db.orderSettings.nextNumber=(db.orderSettings.nextNumber||1)+1}else db.orders[i]={...db.orders[i],...item};
  if(deduct&&!item.stockDeducted){
    for(const line of item.lines){
      if(!["laminates","edges","products"].includes(line.type))continue;const product=db[line.type].find(x=>x.id===line.productId);if(!product)continue;
      product.stock=Math.max(0,num(product.stock)-num(line.qty));db.inventoryMovements.unshift({id:uid("mov"),type:"out",productType:line.type,productId:product.id,product:line.name,qty:line.qty,unit:line.unit,orderId:item.id,orderNumber:item.number,note:"Buyurtmaga ishlatildi",date:today(),createdAt:nowISO()})
    }
    const saved=db.orders.find(x=>x.id===item.id);if(saved)saved.stockDeducted=true
  }
  if(item.paid>0&&isNew)db.finance.unshift({id:uid("fin"),type:"income",amount:item.paid,category:"Buyurtma to‘lovi",payment:"Naqd",note:`${item.number} ${item.customer}`,date:today(),createdAt:nowISO()});
  persist();toast(deduct?"Buyurtma saqlandi va ombor yangilandi":"Buyurtma saqlandi");resetOrder();go("orders")
}
$("orderForm").onsubmit=e=>{e.preventDefault();saveOrder(false)};$("saveAndDeduct").onclick=()=>saveOrder(true);

function renderDashboard(){
  const t=today(),todayOrders=db.orders.filter(x=>x.date===t),active=db.orders.filter(x=>!["Tayyor","Yetkazildi","Bekor qilindi"].includes(x.status)),ready=db.orders.filter(x=>x.status==="Tayyor");
  $("dToday").textContent=todayOrders.length;$("dActive").textContent=active.length;$("dReady").textContent=ready.length;$("dDebt").textContent=money(db.orders.reduce((s,x)=>s+num(x.debt),0));$("dProfit").textContent=money(db.orders.reduce((s,x)=>s+num(x.profit),0));
  $("recentOrders").innerHTML=db.orders.slice(0,8).map(x=>`<div class="list-row"><div><strong>${esc(x.number)} — ${esc(x.customer||"Mijoz")}</strong><p>${esc(x.status)} · ${x.deadline||x.date}</p></div><span class="badge">${money(x.total)}</span></div>`).join("")||"<p>Buyurtma yo‘q.</p>"
}
function renderChart(){if(!window.Chart)return;if(chart)chart.destroy();const s=statuses();chart=new Chart($("orderChart"),{type:"doughnut",data:{labels:s,datasets:[{data:s.map(st=>db.orders.filter(x=>x.status===st).length)}]},options:{plugins:{legend:{position:"bottom"}}}})}
function renderOrders(){
  $("orderFilter").innerHTML='<option value="">Barcha holat</option>'+statuses().map(s=>`<option>${s}</option>`).join("");const q=$("orderSearch").value.toLowerCase(),f=$("orderFilter").value,list=db.orders.filter(x=>(!q||`${x.number} ${x.customer} ${x.phone}`.toLowerCase().includes(q))&&(!f||x.status===f));
  $("ordersTable").innerHTML=`<div class="table-wrap"><table class="data-table"><thead><tr><th>№</th><th>Mijoz</th><th>Sana</th><th>Tugash</th><th>Jami</th><th>Qarz</th><th>Holat</th><th></th></tr></thead><tbody>${list.map(x=>`<tr><td>${esc(x.number)}</td><td>${esc(x.customer||"-")}<br><small>${esc(x.phone||"")}</small></td><td>${x.date||""}</td><td>${x.deadline||""}</td><td>${money(x.total)}</td><td>${money(x.debt)}</td><td><select data-status="${x.id}">${statuses().map(s=>`<option ${s===x.status?"selected":""}>${s}</option>`).join("")}</select></td><td><button data-edit="${x.id}">Edit</button></td></tr>`).join("")}</tbody></table></div>`
}
$("orderSearch").oninput=renderOrders;$("orderFilter").onchange=renderOrders;$("ordersTable").onchange=e=>{if(e.target.dataset.status){db.orders.find(x=>x.id===e.target.dataset.status).status=e.target.value;persist()}};
$("ordersTable").onclick=e=>{const b=e.target.closest("[data-edit]");if(!b)return;const x=db.orders.find(v=>v.id===b.dataset.edit);$("orderId").value=x.id;$("orderNumber").value=x.number;$("orderDate").value=x.date||today();$("orderDeadline").value=x.deadline||"";$("orderStatus").innerHTML=statuses().map(s=>`<option ${s===x.status?"selected":""}>${s}</option>`).join("");$("orderCustomer").value=x.customer||"";$("orderPhone").value=x.phone||"";$("orderTelegram").value=x.telegram||"";$("orderAddress").value=x.address||"";$("orderDesigner").value=x.designer||"";$("orderWorker").value=x.worker||"";$("orderPaid").value=x.paid||0;$("orderNote").value=x.note||"";lines=JSON.parse(JSON.stringify(x.lines||[]));renderLines();go("new-order")};
function renderProduction(){const s=statuses();$("productionBoard").innerHTML=s.map(st=>`<section class="kanban-col"><h3>${st} (${db.orders.filter(x=>x.status===st).length})</h3>${db.orders.filter(x=>x.status===st).map(x=>`<article class="kanban-card" draggable="true" data-order-drag="${x.id}"><strong>${esc(x.number)} — ${esc(x.customer||"Mijoz")}</strong><p>${money(x.total)} · ${x.deadline||""}</p><select data-prod="${x.id}">${s.map(a=>`<option ${a===x.status?"selected":""}>${a}</option>`).join("")}</select></article>`).join("")}</section>`).join("")}
$("productionBoard").onchange=e=>{if(e.target.dataset.prod){db.orders.find(x=>x.id===e.target.dataset.prod).status=e.target.value;persist()}};
function renderMovements(){const q=$("movementSearch").value.toLowerCase(),f=$("movementType").value,list=db.inventoryMovements.filter(x=>(!q||`${x.product} ${x.orderNumber} ${x.note}`.toLowerCase().includes(q))&&(!f||x.type===f));$("movementTable").innerHTML=`<table class="data-table"><thead><tr><th>Sana</th><th>Turi</th><th>Mahsulot</th><th>Miqdor</th><th>Buyurtma</th><th>Izoh</th></tr></thead><tbody>${list.map(x=>`<tr><td>${x.date}</td><td><span class="badge ${x.type==="out"?"red":""}">${x.type==="in"?"Kirim":"Chiqim"}</span></td><td>${esc(x.product)}</td><td>${x.qty} ${esc(x.unit||"")}</td><td>${esc(x.orderNumber||"-")}</td><td>${esc(x.note||"")}</td></tr>`).join("")}</tbody></table>`}
$("movementSearch").oninput=renderMovements;$("movementType").onchange=renderMovements;
function renderProfit(){const sales=db.orders.reduce((s,x)=>s+num(x.total),0),cost=db.orders.reduce((s,x)=>s+num(x.cost),0),profit=sales-cost;$("pSales").textContent=money(sales);$("pCost").textContent=money(cost);$("pProfit").textContent=money(profit);$("pMargin").textContent=(sales?profit/sales*100:0).toFixed(1)+"%";$("profitTable").innerHTML=`<table class="data-table"><thead><tr><th>№</th><th>Mijoz</th><th>Sotuv</th><th>Tannarx</th><th>Foyda</th><th>Marja</th></tr></thead><tbody>${db.orders.map(x=>`<tr><td>${esc(x.number)}</td><td>${esc(x.customer||"-")}</td><td>${money(x.total)}</td><td>${money(x.cost)}</td><td>${money(x.profit)}</td><td>${(x.total?x.profit/x.total*100:0).toFixed(1)}%</td></tr>`).join("")}</tbody></table>`}
$("workerLogForm").onsubmit=e=>{e.preventDefault();db.workerLogs.unshift({id:uid("log"),workerId:$("logWorker").value,date:$("logDate").value,sheets:num($("logSheets").value),edgeMeters:num($("logEdge").value),drilled:num($("logDrill").value),note:$("logNote").value.trim(),createdAt:nowISO()});e.target.reset();$("logDate").value=today();persist();toast("Ish yozuvi saqlandi")};
function renderWorkers(){$("logWorker").innerHTML=db.workers.map(x=>`<option value="${x.id}">${esc(x.name)} — ${esc(x.role||"")}</option>`).join("");$("workerLogTable").innerHTML=`<table class="data-table"><thead><tr><th>Sana</th><th>Ishchi</th><th>List</th><th>Kromka</th><th>Teshik</th><th>Izoh</th></tr></thead><tbody>${db.workerLogs.map(x=>{const w=db.workers.find(a=>a.id===x.workerId);return`<tr><td>${x.date}</td><td>${esc(w?.name||"")}</td><td>${x.sheets}</td><td>${x.edgeMeters} m</td><td>${x.drilled}</td><td>${esc(x.note||"")}</td></tr>`}).join("")}</tbody></table>`}
function renderAll(){db=loadDB();renderDashboard();renderOrders();renderProduction();renderMovements();renderProfit();renderWorkers();setTimeout(renderChart,50)}
window.addEventListener("storage",renderAll);window.addEventListener("ibrat-db-change",renderAll);resetOrder();$("logDate").value=today();renderAll();

// V22 drag & drop order status
let draggedOrderId="";
document.addEventListener("dragstart",e=>{const card=e.target.closest("[data-order-drag]");if(card)draggedOrderId=card.dataset.orderDrag});
document.addEventListener("dragover",e=>{if(e.target.closest(".kanban-col"))e.preventDefault()});
document.addEventListener("drop",e=>{const col=e.target.closest(".kanban-col");if(!col||!draggedOrderId)return;e.preventDefault();const heading=col.querySelector("h3")?.textContent||"";const status=heading.replace(/\s*\(\d+\)\s*$/,"").trim();const order=db.orders.find(x=>x.id===draggedOrderId);if(order&&status){order.status=status;persist();toast(`Buyurtma: ${status}`)}draggedOrderId=""});
