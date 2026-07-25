import {loadDB,saveDB,uid,nowISO,today,money} from "./local-db.js";
const $=id=>document.getElementById(id);
let db=loadDB();
let lines=[];

if(sessionStorage.getItem("v13PinVerified")!=="1"){
  const target=location.hash==="#calculator"?"calculator":"dashboard";
  sessionStorage.setItem("v14AfterLogin",target);
  location.href="./super-admin.html";
}

const pageTitles={dashboard:"Dashboard",calculator:"Mahsulot kalkulyatori",orders:"Buyurtmalar",inventory:"Ombor",sales:"Sotuvlar",finance:"Kirim-chiqim",customers:"Mijozlar CRM",production:"Ishlab chiqarish",workers:"Ishchilar"};
function esc(v=""){return String(v).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;")}
function toast(m){const t=$("toast");t.textContent=m;t.classList.add("show");clearTimeout(t._);t._=setTimeout(()=>t.classList.remove("show"),2200)}
function number(v){return Number(v||0)}
function nextNumber(){return `IB-${new Date().getFullYear()}-${String(db.orders.length+1).padStart(4,"0")}`}
function save(){saveDB(db);renderAll()}
function go(page){
  document.querySelectorAll("[data-page]").forEach(x=>x.classList.toggle("active",x.dataset.page===page));
  document.querySelectorAll(".erp-page").forEach(x=>x.classList.remove("active"));
  $("page"+page[0].toUpperCase()+page.slice(1)).classList.add("active");
  $("pageTitle").textContent=pageTitles[page];
  $("erpSidebar").classList.remove("open");
}

document.querySelectorAll("[data-page]").forEach(b=>b.onclick=()=>go(b.dataset.page));
document.querySelectorAll("[data-goto]").forEach(b=>b.onclick=()=>go(b.dataset.goto));
$("menuToggle").onclick=()=>$("erpSidebar").classList.toggle("open");
$("themeToggle").onclick=()=>document.documentElement.classList.toggle("dark");
$("logoutButton").onclick=()=>{sessionStorage.removeItem("v13PinVerified");location.href="./super-admin.html"};
$("todayText").textContent=new Date().toLocaleDateString("uz-UZ",{day:"2-digit",month:"long",year:"numeric"});

function renderDashboard(){
  const tf=db.finance.filter(x=>x.date===today()),income=tf.filter(x=>x.type==="income").reduce((s,x)=>s+number(x.amount),0),expense=tf.filter(x=>x.type==="expense").reduce((s,x)=>s+number(x.amount),0);
  $("dashIncome").textContent=money(income);$("dashExpense").textContent=money(expense);$("dashProfit").textContent=money(income-expense);
  $("dashOrders").textContent=db.orders.filter(x=>!["Yetkazildi","Bekor qilindi"].includes(x.status)).length;
  $("dashSheets").textContent=db.laminates.reduce((s,x)=>s+number(x.stock),0).toLocaleString("uz-UZ")+" list";
  $("dashMeters").textContent=db.edges.reduce((s,x)=>s+number(x.stock),0).toLocaleString("uz-UZ")+" m";
  const low=[...db.laminates.map(x=>({...x,unit:"list"})),...db.edges.map(x=>({...x,unit:"m"}))].filter(x=>number(x.stock)<=number(x.minStock||0));
  $("dashboardAlerts").innerHTML=low.length?low.slice(0,8).map(x=>`<div class="list-row"><div><strong>${esc(x.code||"")} ${esc(x.name||"")}</strong><p>Kam qoldiq</p></div><span class="badge low">${x.stock||0} ${x.unit}</span></div>`).join(""):"<p>Kam qolgan mahsulot yo‘q.</p>";
  $("recentOrders").innerHTML=db.orders.slice(0,6).map(x=>`<div class="list-row"><div><strong>${esc(x.number)} — ${esc(x.customer||"Mijoz")}</strong><p>${esc(x.status)} · ${x.date}</p></div><b>${money(x.total)}</b></div>`).join("")||"<p>Buyurtma yo‘q.</p>";
  $("recentFinance").innerHTML=db.finance.slice(0,6).map(x=>`<div class="list-row"><div><strong>${esc(x.category)}</strong><p>${esc(x.note||"")} · ${x.date}</p></div><b style="color:${x.type==="income"?"#087943":"#bd3a2e"}">${x.type==="income"?"+":"-"}${money(x.amount)}</b></div>`).join("")||"<p>Harakat yo‘q.</p>";
}

function populateProducts(){
  const type=$("lineType").value;
  let items=[],unit="dona";
  if(type==="laminate"){items=db.laminates;unit="list"}
  else if(type==="edge"){items=db.edges;unit="metr"}
  const sel=$("lineProduct");
  sel.innerHTML='<option value="">Tanlang</option>'+items.map(x=>`<option value="${x.id}">${esc(x.code||"")} ${esc(x.name||"")}</option>`).join("");
  sel.hidden=!items.length;
  const presets={cutting:["Laminat kesish","list",db.settings.cutPrice||40000],drilling:["Bazis teshish","xizmat",db.settings.drillPrice||0],cnc:["CNC xizmati","xizmat",db.settings.cncPrice||0],design:["Dizayn xizmati","xizmat",0],custom:["","dona",0]};
  if(presets[type]){$("lineName").value=presets[type][0];$("lineName").dataset.unit=presets[type][1];$("linePrice").value=presets[type][2]}
  else{$("lineName").value="";$("lineName").dataset.unit=unit;$("linePrice").value=0}
}
$("lineType").onchange=populateProducts;
$("lineProduct").onchange=()=>{
  const type=$("lineType").value,list=type==="laminate"?db.laminates:db.edges,x=list.find(v=>v.id===$("lineProduct").value);
  if(x){$("lineName").value=`${x.code||""} ${x.name||""}`.trim();$("linePrice").value=x.salePrice||0;$("lineName").dataset.unit=type==="laminate"?"list":"metr";$("lineName").dataset.productId=x.id}
};
function renderLines(){
  $("calculationLines").innerHTML=lines.length?lines.map((x,i)=>`<tr><td>${i+1}</td><td>${esc(x.name)}</td><td>${esc(x.unit)}</td><td><input data-line-qty="${x.id}" type="number" min="0" step="0.01" value="${x.qty}"></td><td><input data-line-price="${x.id}" type="number" min="0" value="${x.price}"></td><td><b>${money(x.qty*x.price)}</b></td><td><button data-line-delete="${x.id}">×</button></td></tr>`).join(""):'<tr><td colspan="7" style="text-align:center;color:#6d7b72">Mahsulot yoki xizmat qo‘shing.</td></tr>';
  calculateTotals()
}
$("addLine").onclick=()=>{
  const name=$("lineName").value.trim();if(!name){toast("Mahsulot yoki xizmat nomini kiriting.");return}
  lines.push({id:uid("line"),type:$("lineType").value,productId:$("lineName").dataset.productId||"",name,unit:$("lineName").dataset.unit||"dona",qty:number($("lineQty").value)||1,price:number($("linePrice").value)});
  $("lineQty").value=1;renderLines()
};
$("calculationLines").oninput=e=>{
  if(e.target.dataset.lineQty){const x=lines.find(v=>v.id===e.target.dataset.lineQty);x.qty=number(e.target.value)}
  if(e.target.dataset.linePrice){const x=lines.find(v=>v.id===e.target.dataset.linePrice);x.price=number(e.target.value)}
  renderLines()
};
$("calculationLines").onclick=e=>{const b=e.target.closest("[data-line-delete]");if(b){lines=lines.filter(x=>x.id!==b.dataset.lineDelete);renderLines()}};
["calcDiscount","discountType","calcDelivery","calcPaid"].forEach(id=>$(id).oninput=calculateTotals);
function totals(){
  const subtotal=lines.reduce((s,x)=>s+x.qty*x.price,0),raw=number($("calcDiscount").value),discount=$("discountType").value==="percent"?subtotal*raw/100:raw,delivery=number($("calcDelivery").value),grand=Math.max(0,subtotal-discount+delivery),paid=number($("calcPaid").value),debt=Math.max(0,grand-paid);
  return{subtotal,discount,delivery,grand,paid,debt}
}
function calculateTotals(){
  const t=totals();$("calcSubtotal").textContent=money(t.subtotal);$("calcDiscountValue").textContent=money(t.discount);$("calcDeliveryValue").textContent=money(t.delivery);$("calcGrandTotal").textContent=money(t.grand);$("calcPaidValue").textContent=money(t.paid);$("calcDebt").textContent=money(t.debt)
}
function resetCalc(){
  lines=[];$("calcCustomer").value="";$("calcPhone").value="";$("calcNumber").value=nextNumber();$("calcDate").value=today();$("calcDiscount").value=0;$("calcDelivery").value=0;$("calcPaid").value=0;$("calcNote").value="";populateProducts();renderLines()
}
$("newCalculation").onclick=resetCalc;
$("printCalculation").onclick=()=>window.print();
function calculationData(status="Yangi"){
  const t=totals();return{id:uid("ord"),number:$("calcNumber").value,date:$("calcDate").value,customer:$("calcCustomer").value.trim(),phone:$("calcPhone").value.trim(),lines:JSON.parse(JSON.stringify(lines)),subtotal:t.subtotal,discount:t.discount,delivery:t.delivery,total:t.grand,paid:t.paid,debt:t.debt,note:$("calcNote").value.trim(),status,createdAt:nowISO()}
}
$("saveAsOrder").onclick=()=>{if(!lines.length){toast("Hisobga mahsulot qo‘shing.");return}db.orders.unshift(calculationData("Yangi"));save();toast("Buyurtma saqlandi");resetCalc()};
$("saveAsSale").onclick=()=>{
  if(!lines.length){toast("Hisobga mahsulot qo‘shing.");return}
  const sale=calculationData("Yetkazildi");db.orders.unshift(sale);db.sales=db.sales||[];db.sales.unshift({...sale,id:uid("sale")});
  for(const line of lines){if(line.type==="laminate"){const x=db.laminates.find(v=>v.id===line.productId);if(x)x.stock=Math.max(0,number(x.stock)-line.qty)}if(line.type==="edge"){const x=db.edges.find(v=>v.id===line.productId);if(x)x.stock=Math.max(0,number(x.stock)-line.qty)}}
  if(sale.paid>0)db.finance.unshift({id:uid("fin"),type:"income",amount:sale.paid,category:"Sotuv",payment:"Naqd",note:`${sale.number} ${sale.customer}`,date:today(),createdAt:nowISO()});
  save();toast("Sotuv yakunlandi va ombor yangilandi");resetCalc()
};
$("sendTelegram").onclick=()=>{
  const t=totals(),text=`BUVAYDA IBRAT MEBEL\nHisob № ${$("calcNumber").value}\nMijoz: ${$("calcCustomer").value}\n\n${lines.map((x,i)=>`${i+1}. ${x.name}: ${x.qty} ${x.unit} × ${money(x.price)} = ${money(x.qty*x.price)}`).join("\n")}\n\nJami: ${money(t.grand)}\nTo‘langan: ${money(t.paid)}\nQarz: ${money(t.debt)}`;
  window.open(`https://t.me/${db.settings.telegram||"ibratmebel8909"}?text=${encodeURIComponent(text)}`,"_blank")
};

function renderOrders(){
  const q=$("orderSearch").value.toLowerCase(),st=$("orderStatusFilter").value,list=db.orders.filter(x=>(!q||`${x.number} ${x.customer} ${x.phone}`.toLowerCase().includes(q))&&(!st||x.status===st));
  $("ordersTable").innerHTML=`<table class="data-table"><thead><tr><th>№</th><th>Mijoz</th><th>Sana</th><th>Jami</th><th>To‘langan</th><th>Qarz</th><th>Holat</th><th></th></tr></thead><tbody>${list.map(x=>`<tr><td><b>${esc(x.number)}</b></td><td>${esc(x.customer||"-")}<br><small>${esc(x.phone||"")}</small></td><td>${x.date}</td><td>${money(x.total)}</td><td>${money(x.paid)}</td><td>${money(x.debt)}</td><td><select data-order-status="${x.id}">${["Yangi","Kesilmoqda","Kromka urilmoqda","Teshilmoqda","Tayyor","Yetkazildi","Bekor qilindi"].map(s=>`<option ${x.status===s?"selected":""}>${s}</option>`).join("")}</select></td><td><button data-order-delete="${x.id}">O‘chirish</button></td></tr>`).join("")}</tbody></table>`
}
$("orderSearch").oninput=renderOrders;$("orderStatusFilter").onchange=renderOrders;$("orderFromCalculator").onclick=()=>go("calculator");
$("ordersTable").onchange=e=>{if(e.target.dataset.orderStatus){db.orders.find(x=>x.id===e.target.dataset.orderStatus).status=e.target.value;save()}};
$("ordersTable").onclick=e=>{const b=e.target.closest("[data-order-delete]");if(b&&confirm("Buyurtma o‘chirilsinmi?")){db.orders=db.orders.filter(x=>x.id!==b.dataset.orderDelete);save()}};

function renderInventory(){
  $("invLamTypes").textContent=db.laminates.length;
  $("invSheets").textContent=db.laminates.reduce((s,x)=>s+number(x.stock),0);
  $("invEdgeTypes").textContent=db.edges.length;
  $("invMeters").textContent=db.edges.reduce((s,x)=>s+number(x.stock),0);

  $("inventoryLaminates").innerHTML=db.laminates.map(x=>`
    <div class="inventory-edit-row">
      <div class="inventory-main">
        <strong>${esc(x.code||"")} ${esc(x.name||"")}</strong>
        <small>${esc(x.brand||"")} · ${esc(x.location||"")}</small>
      </div>
      <label>Qoldiq<input type="number" min="0" step="0.01" value="${number(x.stock)}" data-inv-l-stock="${x.id}"></label>
      <label>Narx<input type="number" min="0" step="1" value="${number(x.salePrice)}" data-inv-l-price="${x.id}"></label>
      <label>Joy<input value="${esc(x.location||"")}" data-inv-l-location="${x.id}"></label>
      <button class="save-btn" data-save-laminate="${x.id}">Save</button>
    </div>`).join("")||"<p>Laminat yo‘q.</p>";

  $("inventoryEdges").innerHTML=db.edges.map(x=>`
    <div class="inventory-edit-row">
      <div class="inventory-main">
        <strong>${esc(x.code||"")} ${esc(x.name||"")}</strong>
        <small>${x.thickness||""}×${x.width||""} mm · ${esc(x.location||"")}</small>
      </div>
      <label>Qoldiq<input type="number" min="0" step="0.01" value="${number(x.stock)}" data-inv-e-stock="${x.id}"></label>
      <label>Narx<input type="number" min="0" step="1" value="${number(x.salePrice)}" data-inv-e-price="${x.id}"></label>
      <label>Joy<input value="${esc(x.location||"")}" data-inv-e-location="${x.id}"></label>
      <button class="save-btn" data-save-edge="${x.id}">Save</button>
    </div>`).join("")||"<p>Kromka yo‘q.</p>";
}

$("inventoryLaminates").onclick=e=>{
  const b=e.target.closest("[data-save-laminate]");
  if(!b)return;
  const id=b.dataset.saveLaminate;
  const x=db.laminates.find(v=>v.id===id);
  if(!x)return;
  x.stock=number(document.querySelector(`[data-inv-l-stock="${id}"]`).value);
  x.salePrice=number(document.querySelector(`[data-inv-l-price="${id}"]`).value);
  x.location=document.querySelector(`[data-inv-l-location="${id}"]`).value.trim();
  save();
  toast("Laminat saqlandi");
};
$("inventoryEdges").onclick=e=>{
  const b=e.target.closest("[data-save-edge]");
  if(!b)return;
  const id=b.dataset.saveEdge;
  const x=db.edges.find(v=>v.id===id);
  if(!x)return;
  x.stock=number(document.querySelector(`[data-inv-e-stock="${id}"]`).value);
  x.salePrice=number(document.querySelector(`[data-inv-e-price="${id}"]`).value);
  x.location=document.querySelector(`[data-inv-e-location="${id}"]`).value.trim();
  save();
  toast("Kromka saqlandi");
};

function renderSales(){
  db.sales=db.sales||[];
  $("salesTable").innerHTML=`<table class="data-table">
    <thead><tr><th>№</th><th>Mijoz</th><th>Sana</th><th>Summa</th><th>To‘langan</th><th>Qarz</th><th>Holat</th><th></th></tr></thead>
    <tbody>${db.sales.map(x=>`
      <tr>
        <td><input data-sale-number="${x.id}" value="${esc(x.number||"")}"></td>
        <td><input data-sale-customer="${x.id}" value="${esc(x.customer||"")}"></td>
        <td><input data-sale-date="${x.id}" type="date" value="${x.date||today()}"></td>
        <td><input data-sale-total="${x.id}" type="number" min="0" value="${number(x.total)}"></td>
        <td><input data-sale-paid="${x.id}" type="number" min="0" value="${number(x.paid)}"></td>
        <td><b data-sale-debt-view="${x.id}">${money(number(x.total)-number(x.paid))}</b></td>
        <td>
          <select data-sale-status="${x.id}">
            ${["Yangi","Jarayonda","Tayyor","Yetkazildi","Bekor qilindi"].map(s=>`<option ${x.status===s?"selected":""}>${s}</option>`).join("")}
          </select>
        </td>
        <td><button class="save-btn" data-save-sale="${x.id}">Save</button></td>
      </tr>`).join("")}
    </tbody>
  </table>`;
}

$("salesTable").oninput=e=>{
  const id=e.target.dataset.saleTotal||e.target.dataset.salePaid;
  if(!id)return;
  const total=number(document.querySelector(`[data-sale-total="${id}"]`).value);
  const paid=number(document.querySelector(`[data-sale-paid="${id}"]`).value);
  const view=document.querySelector(`[data-sale-debt-view="${id}"]`);
  if(view)view.textContent=money(Math.max(0,total-paid));
};
$("salesTable").onclick=e=>{
  const b=e.target.closest("[data-save-sale]");
  if(!b)return;
  const id=b.dataset.saveSale;
  const x=db.sales.find(v=>v.id===id);
  if(!x)return;
  x.number=document.querySelector(`[data-sale-number="${id}"]`).value.trim();
  x.customer=document.querySelector(`[data-sale-customer="${id}"]`).value.trim();
  x.date=document.querySelector(`[data-sale-date="${id}"]`).value;
  x.total=number(document.querySelector(`[data-sale-total="${id}"]`).value);
  x.paid=number(document.querySelector(`[data-sale-paid="${id}"]`).value);
  x.debt=Math.max(0,x.total-x.paid);
  x.status=document.querySelector(`[data-sale-status="${id}"]`).value;
  const order=db.orders.find(o=>o.number===x.number);
  if(order){
    order.customer=x.customer;
    order.date=x.date;
    order.total=x.total;
    order.paid=x.paid;
    order.debt=x.debt;
    order.status=x.status;
  }
  save();
  toast("Sotuv saqlandi");
};

$("financeForm").onsubmit=e=>{e.preventDefault();db.finance.unshift({id:uid("fin"),type:$("financeType").value,amount:number($("financeAmount").value),category:$("financeCategory").value,payment:$("financePayment").value,note:$("financeNote").value.trim(),date:today(),createdAt:nowISO()});e.target.reset();save();toast("Moliyaviy harakat saqlandi")};
function renderFinance(){
  const q=$("financeSearch").value.toLowerCase(),list=db.finance.filter(x=>!q||`${x.category} ${x.note} ${x.payment}`.toLowerCase().includes(q));
  $("financeTable").innerHTML=`<table class="data-table"><thead><tr><th>Sana</th><th>Turi</th><th>Kategoriya</th><th>To‘lov</th><th>Izoh</th><th>Summa</th><th></th></tr></thead><tbody>${list.map(x=>`<tr><td>${x.date}</td><td><span class="badge ${x.type==="expense"?"red":""}">${x.type==="income"?"Kirim":"Chiqim"}</span></td><td>${esc(x.category)}</td><td>${esc(x.payment||"")}</td><td>${esc(x.note||"")}</td><td>${x.type==="income"?"+":"-"}${money(x.amount)}</td><td><button data-fin-delete="${x.id}">×</button></td></tr>`).join("")}</tbody></table>`
}
$("financeSearch").oninput=renderFinance;
$("financeTable").onclick=e=>{
  const b=e.target.closest("[data-fin-delete]");
  if(!b)return;
  const item=db.finance.find(x=>x.id===b.dataset.finDelete);
  const label=item?`${item.category} — ${money(item.amount)}`:"ushbu yozuv";
  if(!confirm(`${label} o‘chirilsinmi? Bu amalni qaytarib bo‘lmaydi.`))return;
  db.finance=db.finance.filter(x=>x.id!==b.dataset.finDelete);
  save();
  toast("Kirim-chiqim yozuvi o‘chirildi");
};

$("customerForm").onsubmit=e=>{e.preventDefault();db.customers.unshift({id:uid("cus"),name:$("customerName").value.trim(),phone:$("customerPhone").value.trim(),telegram:$("customerTelegram").value.trim(),discount:number($("customerDiscount").value),note:$("customerNote").value.trim(),createdAt:nowISO()});e.target.reset();save();toast("Mijoz saqlandi")};
function renderCustomers(){
  const q=$("customerSearch").value.toLowerCase(),list=db.customers.filter(x=>!q||`${x.name} ${x.phone}`.toLowerCase().includes(q));
  $("customersTable").innerHTML=`<table class="data-table"><thead><tr><th>Mijoz</th><th>Telefon</th><th>Telegram</th><th>Chegirma</th><th>Buyurtmalar</th><th>Qarz</th><th></th></tr></thead><tbody>${list.map(x=>{const orders=db.orders.filter(o=>o.phone&&o.phone===x.phone);return`<tr><td><b>${esc(x.name)}</b></td><td>${esc(x.phone)}</td><td>${esc(x.telegram)}</td><td>${x.discount||0}%</td><td>${orders.length}</td><td>${money(orders.reduce((s,o)=>s+number(o.debt),0))}</td><td><button data-cus-delete="${x.id}">×</button></td></tr>`}).join("")}</tbody></table>`
}
$("customerSearch").oninput=renderCustomers;$("customersTable").onclick=e=>{const b=e.target.closest("[data-cus-delete]");if(b){db.customers=db.customers.filter(x=>x.id!==b.dataset.cusDelete);save()}};

function renderProduction(){
  const statuses=["Yangi","Kesilmoqda","Kromka urilmoqda","Teshilmoqda","Tayyor","Yetkazildi"];
  $("productionBoard").innerHTML=statuses.map(s=>`<section class="kanban-column"><h3>${s} (${db.orders.filter(x=>x.status===s).length})</h3>${db.orders.filter(x=>x.status===s).map(x=>`<article class="kanban-card"><strong>${esc(x.number)} — ${esc(x.customer||"Mijoz")}</strong><p>${money(x.total)}</p><select data-prod-status="${x.id}">${statuses.map(t=>`<option ${t===x.status?"selected":""}>${t}</option>`).join("")}</select></article>`).join("")}</section>`).join("")
}
$("productionBoard").onchange=e=>{if(e.target.dataset.prodStatus){db.orders.find(x=>x.id===e.target.dataset.prodStatus).status=e.target.value;save()}};

$("workerForm").onsubmit=e=>{e.preventDefault();db.workers.unshift({id:uid("wrk"),name:$("workerName").value.trim(),role:$("workerRole").value,phone:$("workerPhone").value.trim(),rate:number($("workerRate").value),createdAt:nowISO()});e.target.reset();save();toast("Ishchi saqlandi")};
function renderWorkers(){
  $("workersTable").innerHTML=`<table class="data-table"><thead><tr><th>Ism</th><th>Lavozim</th><th>Telefon</th><th>Kunlik stavka</th><th></th></tr></thead><tbody>${db.workers.map(x=>`<tr><td><b>${esc(x.name)}</b></td><td>${esc(x.role)}</td><td>${esc(x.phone)}</td><td>${money(x.rate)}</td><td><button data-worker-delete="${x.id}">×</button></td></tr>`).join("")}</tbody></table>`
}
$("workersTable").onclick=e=>{const b=e.target.closest("[data-worker-delete]");if(b){db.workers=db.workers.filter(x=>x.id!==b.dataset.workerDelete);save()}};

function renderAll(){
  db=loadDB();renderDashboard();renderOrders();renderInventory();renderSales();renderFinance();renderCustomers();renderProduction();renderWorkers()
}
window.addEventListener("storage",renderAll);
resetCalc();renderAll();

if(location.hash==="#calculator")go("calculator");
