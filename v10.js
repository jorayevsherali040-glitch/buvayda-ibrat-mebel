import { auth, db } from "./firebase-config.js";
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, serverTimestamp, query, orderBy, increment } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

const $=id=>document.getElementById(id);
const state={orders:[],customers:[],inventory:[],laminates:[],laminateSales:[],edges:[],edgeSales:[],production:[],workers:[],suppliers:[],purchases:[],finance:[],debts:[]};
let financeChart=null,ordersChart=null;
const statusNames={new:"Yangi",design:"Dizayn",production:"Ishlab chiqarish",ready:"Tayyor",delivered:"Yetkazildi",cancelled:"Bekor",cutting:"Kesish",edge:"Kromka",drilling:"Teshish",assembly:"Yig‘ish"};

function esc(v=""){return String(v).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;")}
function money(n){return Number(n||0).toLocaleString("uz-UZ")+" so‘m"}
function today(){return new Date().toISOString().slice(0,10)}
function dateOf(x){return x?.date||x?.createdAt?.toDate?.().toISOString().slice(0,10)||""}
function toast(m){const t=$("toast");t.textContent=m;t.classList.add("show");clearTimeout(t._);t._=setTimeout(()=>t.classList.remove("show"),2300)}
function openCollection(name,render){onSnapshot(query(collection(db,name),orderBy("createdAt","desc")),s=>{state[name]=s.docs.map(d=>({id:d.id,...d.data()}));renderAll()},console.error)}
function clear(ids){ids.forEach(id=>$(id).value="")}

$("loginForm").onsubmit=async e=>{e.preventDefault();$("loginMessage").textContent="Tekshirilmoqda...";try{await signInWithEmailAndPassword(auth,$("loginEmail").value.trim(),$("loginPassword").value);$("loginMessage").textContent=""}catch(err){console.error(err);$("loginMessage").textContent="Email yoki parol noto‘g‘ri."}};
$("logoutButton").onclick=()=>signOut(auth);
onAuthStateChanged(auth,u=>{$("loginView").hidden=!!u;$("appView").hidden=!u;$("loggedUser").textContent=u?.email||""});

document.querySelectorAll("[data-view]").forEach(b=>b.onclick=()=>{document.querySelectorAll("[data-view]").forEach(x=>x.classList.remove("active"));b.classList.add("active");document.querySelectorAll(".v10-view").forEach(x=>x.classList.remove("active"));$("view"+b.dataset.view[0].toUpperCase()+b.dataset.view.slice(1)).classList.add("active");if(b.dataset.view==="dashboard")setTimeout(renderCharts,40)});
$("themeButton").onclick=()=>{document.body.classList.toggle("v10-dark");$("themeButton").textContent=document.body.classList.contains("v10-dark")?"☀️":"🌙"};

function populateSelects(){
  $("orderCustomer").innerHTML='<option value="">Mijozni tanlang</option>'+state.customers.map(c=>`<option value="${c.id}">${esc(c.name)} — ${esc(c.phone)}</option>`).join("");
  const workerOptions='<option value="">Ishchi tanlang</option>'+state.workers.filter(w=>w.status!=="inactive").map(w=>`<option value="${w.id}">${esc(w.name)} — ${esc(w.role)}</option>`).join("");
  $("orderWorker").innerHTML=workerOptions;$("productionWorker").innerHTML=workerOptions;
  $("productionOrder").innerHTML='<option value="">Buyurtmani tanlang</option>'+state.orders.filter(o=>!["delivered","cancelled"].includes(o.status)).map(o=>`<option value="${o.id}">${esc(o.title)} — ${esc(o.customerName||"")}</option>`).join("");
  $("purchaseSupplier").innerHTML='<option value="">Tanlang</option>'+state.suppliers.map(s=>`<option value="${s.id}">${esc(s.name)}</option>`).join("");
  $("purchaseInventory").innerHTML='<option value="">Tanlang</option>'+state.inventory.map(i=>`<option value="${i.id}">${esc(i.name)} (${i.quantity} ${esc(i.unit)})</option>`).join("");
  $("saleLaminate").innerHTML='<option value="">Laminat tanlang</option>'+state.laminates.filter(x=>Number(x.stock)>0).map(x=>`<option value="${x.id}">${esc(x.code)} — ${esc(x.name)} (${x.stock} list)</option>`).join("");
  $("saleEdge").innerHTML='<option value="">Kromka tanlang</option>'+state.edges.filter(x=>Number(x.stock)>0).map(x=>`<option value="${x.id}">${esc(x.code)} — ${esc(x.name)} (${x.stock} m)</option>`).join("");
  const customerOptions='<option value="">Mijoz tanlang</option>'+state.customers.map(c=>`<option value="${c.id}">${esc(c.name)} — ${esc(c.phone)}</option>`).join("");
  $("saleCustomer").innerHTML=customerOptions;$("saleEdgeCustomer").innerHTML=customerOptions;
}

function updateKpis(){
  const t=today(),fin=state.finance.filter(x=>dateOf(x)===t),ordersToday=state.orders.filter(x=>dateOf(x)===t);
  const income=fin.filter(x=>x.type==="income").reduce((s,x)=>s+Number(x.amount||0),0);
  const expense=fin.filter(x=>x.type==="expense").reduce((s,x)=>s+Number(x.amount||0),0);
  $("kpiTodaySales").textContent=money(income);$("kpiTodayExpense").textContent=money(expense);$("kpiProfit").textContent=money(income-expense);
  $("kpiTodayOrders").textContent=`${ordersToday.length} buyurtma`;
  $("kpiActiveOrders").textContent=state.orders.filter(o=>!["delivered","cancelled"].includes(o.status)).length;
  $("kpiLowStock").textContent=state.inventory.filter(i=>Number(i.quantity)<=Number(i.minQuantity||0)).length;
  $("kpiDebt").textContent=money(state.debts.filter(d=>d.status!=="paid").reduce((s,d)=>s+Number(d.amount||0),0));
}

function row(title,details,right,actions="",badge=""){return `<article class="data-row"><div><h3>${esc(title)}</h3><p>${details}</p>${badge}</div><div>${right}<div class="row-actions">${actions}</div></div></article>`}

function renderOrders(){
  const q=$("orderSearch").value.toLowerCase(),f=$("orderFilter").value;
  const list=state.orders.filter(o=>(!q||`${o.title} ${o.customerName} ${o.phone}`.toLowerCase().includes(q))&&(!f||o.status===f));
  $("ordersList").innerHTML=list.length?list.map(o=>row(o.title,`${esc(o.customerName||"")} · Muddat: ${esc(o.deadline||"yo‘q")}`,`<strong>${money(o.total)}</strong>`,`<button class="action" data-invoice="${o.id}">PDF</button><button class="edit" data-edit-order="${o.id}">Tahrir</button><button class="delete" data-delete-order="${o.id}">O‘chirish</button>`,`<span class="status">${statusNames[o.status]||o.status}</span>`)).join(""):"<p>Buyurtmalar yo‘q.</p>";
  $("recentOrders").innerHTML=state.orders.slice(0,6).map(o=>row(o.title,esc(o.customerName||""),`<strong>${money(o.total)}</strong>`,"",`<span class="status">${statusNames[o.status]||o.status}</span>`)).join("")||"<p>Buyurtmalar yo‘q.</p>";
}
function clearOrder(){clear(["orderId","orderTitle","orderTotal","orderPaid","orderCost","orderDeadline","orderNote"]);$("orderCustomer").value="";$("orderWorker").value="";$("orderStatus").value="new";$("cancelOrderEdit").hidden=true}
$("orderForm").onsubmit=async e=>{e.preventDefault();const c=state.customers.find(x=>x.id===$("orderCustomer").value),w=state.workers.find(x=>x.id===$("orderWorker").value);const data={customerId:c?.id||"",customerName:c?.name||"",phone:c?.phone||"",title:$("orderTitle").value.trim(),total:Number($("orderTotal").value||0),paid:Number($("orderPaid").value||0),cost:Number($("orderCost").value||0),status:$("orderStatus").value,deadline:$("orderDeadline").value,workerId:w?.id||"",workerName:w?.name||"",note:$("orderNote").value.trim(),updatedAt:serverTimestamp()};const id=$("orderId").value;if(id)await updateDoc(doc(db,"orders",id),data);else{await addDoc(collection(db,"orders"),{...data,date:today(),createdAt:serverTimestamp()});if(data.paid>0)await addDoc(collection(db,"finance"),{type:"income",amount:data.paid,category:"Buyurtma oldindan to‘lov",method:"Naqd",date:today(),note:`${data.title} — ${data.customerName}`,createdAt:serverTimestamp()})}clearOrder();toast("Buyurtma saqlandi")};
$("cancelOrderEdit").onclick=clearOrder;$("orderSearch").oninput=renderOrders;$("orderFilter").onchange=renderOrders;
$("ordersList").onclick=async e=>{const edit=e.target.closest("[data-edit-order]"),del=e.target.closest("[data-delete-order]"),inv=e.target.closest("[data-invoice]");if(edit){const o=state.orders.find(x=>x.id===edit.dataset.editOrder);$("orderId").value=o.id;$("orderCustomer").value=o.customerId||"";$("orderTitle").value=o.title||"";$("orderTotal").value=o.total||0;$("orderPaid").value=o.paid||0;$("orderCost").value=o.cost||0;$("orderStatus").value=o.status||"new";$("orderDeadline").value=o.deadline||"";$("orderWorker").value=o.workerId||"";$("orderNote").value=o.note||"";$("cancelOrderEdit").hidden=false}if(del&&confirm("Buyurtma o‘chirilsinmi?"))await deleteDoc(doc(db,"orders",del.dataset.deleteOrder));if(inv)createInvoice(state.orders.find(x=>x.id===inv.dataset.invoice))};

function createInvoice(o){const {jsPDF}=window.jspdf,docu=new jsPDF();docu.setFontSize(18);docu.text("BUVAYDA IBRAT MEBEL",14,18);docu.setFontSize(12);docu.text("BUYURTMA HISOB-FAKTURASI",14,28);docu.setFontSize(10);docu.text(`Mijoz: ${o.customerName||""}`,14,42);docu.text(`Telefon: ${o.phone||""}`,14,50);docu.text(`Buyurtma: ${o.title}`,14,58);docu.text(`Umumiy summa: ${money(o.total)}`,14,70);docu.text(`To'langan: ${money(o.paid)}`,14,78);docu.text(`Qoldiq: ${money(Number(o.total||0)-Number(o.paid||0))}`,14,86);docu.text(`Topshirish sanasi: ${o.deadline||"-"}`,14,98);docu.save(`hisob-${o.title}.pdf`)}

function genericForm(config){
  const {form,idField,collectionName,getData,clearForm,message}=config;
  $(form).onsubmit=async e=>{e.preventDefault();const data=getData(),id=$(idField).value;if(id)await updateDoc(doc(db,collectionName,id),{...data,updatedAt:serverTimestamp()});else await addDoc(collection(db,collectionName),{...data,createdAt:serverTimestamp()});clearForm();toast(message)};
}

function clearCustomer(){clear(["customerId","customerName","customerPhone","customerAddress","customerTelegram","customerNote"]);$("cancelCustomerEdit").hidden=true}
genericForm({form:"customerForm",idField:"customerId",collectionName:"customers",getData:()=>({name:$("customerName").value.trim(),phone:$("customerPhone").value.trim(),address:$("customerAddress").value.trim(),telegram:$("customerTelegram").value.trim(),note:$("customerNote").value.trim()}),clearForm:clearCustomer,message:"Mijoz saqlandi"});$("cancelCustomerEdit").onclick=clearCustomer;
function renderCustomers(){const q=$("customerSearch").value.toLowerCase();const l=state.customers.filter(c=>!q||`${c.name} ${c.phone} ${c.address}`.toLowerCase().includes(q));$("customersList").innerHTML=l.length?l.map(c=>row(c.name,`${esc(c.phone)} · ${esc(c.address||"Manzil yo‘q")}`,"",`<button class="edit" data-edit-customer="${c.id}">Tahrir</button><button class="delete" data-delete-customer="${c.id}">O‘chirish</button>`)).join(""):"<p>Mijozlar yo‘q.</p>"}$("customerSearch").oninput=renderCustomers;$("customersList").onclick=async e=>{const edit=e.target.closest("[data-edit-customer]"),del=e.target.closest("[data-delete-customer]");if(edit){const c=state.customers.find(x=>x.id===edit.dataset.editCustomer);$("customerId").value=c.id;$("customerName").value=c.name||"";$("customerPhone").value=c.phone||"";$("customerAddress").value=c.address||"";$("customerTelegram").value=c.telegram||"";$("customerNote").value=c.note||"";$("cancelCustomerEdit").hidden=false}if(del&&confirm("Mijoz o‘chirilsinmi?"))await deleteDoc(doc(db,"customers",del.dataset.deleteCustomer))};

function clearInventory(){clear(["inventoryId","inventoryName","inventoryQuantity","inventoryCost"]);$("inventoryMinimum").value=5;$("cancelInventoryEdit").hidden=true}
genericForm({form:"inventoryForm",idField:"inventoryId",collectionName:"inventory",getData:()=>({name:$("inventoryName").value.trim(),category:$("inventoryCategory").value,quantity:Number($("inventoryQuantity").value||0),unit:$("inventoryUnit").value,minQuantity:Number($("inventoryMinimum").value||0),cost:Number($("inventoryCost").value||0)}),clearForm:clearInventory,message:"Ombor saqlandi"});$("cancelInventoryEdit").onclick=clearInventory;
function renderInventory(){const q=$("inventorySearch").value.toLowerCase();const l=state.inventory.filter(i=>!q||`${i.name} ${i.category}`.toLowerCase().includes(q));const html=l.length?l.map(i=>row(i.name,`${esc(i.category)} · ${i.quantity} ${esc(i.unit)}`,`<strong>${money(Number(i.quantity||0)*Number(i.cost||0))}</strong>`,`<button class="edit" data-edit-inventory="${i.id}">Tahrir</button><button class="delete" data-delete-inventory="${i.id}">O‘chirish</button>`,`<span class="status ${Number(i.quantity)<=Number(i.minQuantity)?"warning":""}">${Number(i.quantity)<=Number(i.minQuantity)?"Kam qoldi":"Yetarli"}</span>`)).join(""):"<p>Ombor bo‘sh.</p>";$("inventoryList").innerHTML=html;$("dashboardLowStock").innerHTML=state.inventory.filter(i=>Number(i.quantity)<=Number(i.minQuantity)).slice(0,6).map(i=>row(i.name,`${i.quantity} ${esc(i.unit)}`,"", "",'<span class="status warning">Kam</span>')).join("")||"<p>Kam qolgan material yo‘q.</p>"}$("inventorySearch").oninput=renderInventory;$("inventoryList").onclick=async e=>{const edit=e.target.closest("[data-edit-inventory]"),del=e.target.closest("[data-delete-inventory]");if(edit){const i=state.inventory.find(x=>x.id===edit.dataset.editInventory);$("inventoryId").value=i.id;$("inventoryName").value=i.name||"";$("inventoryCategory").value=i.category||"Boshqa";$("inventoryQuantity").value=i.quantity||0;$("inventoryUnit").value=i.unit||"dona";$("inventoryMinimum").value=i.minQuantity||0;$("inventoryCost").value=i.cost||0;$("cancelInventoryEdit").hidden=false}if(del&&confirm("Ombor mahsuloti o‘chirilsinmi?"))await deleteDoc(doc(db,"inventory",del.dataset.deleteInventory))};


function clearLaminate(){
  clear(["laminateId","laminateName","laminateCode","laminateBrand","laminateSize","laminateStock","laminateSalePrice","laminateCostPrice","laminateNote"]);
  $("laminateThickness").value="16";$("laminateMinStock").value=5;$("cancelLaminateEdit").hidden=true;
}
genericForm({
  form:"laminateForm",idField:"laminateId",collectionName:"laminates",
  getData:()=>({
    name:$("laminateName").value.trim(),code:$("laminateCode").value.trim(),
    brand:$("laminateBrand").value.trim(),thickness:$("laminateThickness").value,
    size:$("laminateSize").value.trim(),stock:Number($("laminateStock").value||0),
    salePrice:Number($("laminateSalePrice").value||0),costPrice:Number($("laminateCostPrice").value||0),
    minStock:Number($("laminateMinStock").value||0),note:$("laminateNote").value.trim()
  }),
  clearForm:clearLaminate,message:"Laminat saqlandi"
});
$("cancelLaminateEdit").onclick=clearLaminate;

function renderLaminates(){
  const q=$("laminateSearch").value.toLowerCase(),f=$("laminateStockFilter").value;
  const list=state.laminates.filter(x=>{
    const out=Number(x.stock)<=0,low=!out&&Number(x.stock)<=Number(x.minStock||0);
    return(!q||`${x.code} ${x.name} ${x.brand}`.toLowerCase().includes(q))
      &&(!f||(f==="available"&&!out)||(f==="low"&&low)||(f==="out"&&out));
  });
  $("laminatesList").innerHTML=list.length?list.map(x=>row(
    `${x.code} — ${x.name}`,
    `${esc(x.brand||"Brendsiz")} · ${esc(x.thickness||"")} mm · ${esc(x.size||"O‘lcham yo‘q")} · ${x.stock} list`,
    `<div><strong>${money(x.salePrice)}</strong><br><small>Ombor: ${money(Number(x.stock||0)*Number(x.costPrice||0))}</small></div>`,
    `<button class="edit" data-edit-laminate="${x.id}">Tahrir</button><button class="delete" data-delete-laminate="${x.id}">O‘chirish</button>`,
    `<span class="status ${Number(x.stock)<=0?"danger":Number(x.stock)<=Number(x.minStock||0)?"warning":""}">${Number(x.stock)<=0?"Tugagan":Number(x.stock)<=Number(x.minStock||0)?"Kam qolgan":"Mavjud"}</span>`
  )).join(""):"<p>Laminatlar yo‘q.</p>";
  $("laminateTypeCount").textContent=state.laminates.length;
  $("laminateSheetCount").textContent=state.laminates.reduce((s,x)=>s+Number(x.stock||0),0).toLocaleString("uz-UZ");
  $("laminateStockValue").textContent=money(state.laminates.reduce((s,x)=>s+Number(x.stock||0)*Number(x.costPrice||0),0));
  $("laminateLowCount").textContent=state.laminates.filter(x=>Number(x.stock)<=Number(x.minStock||0)).length;
}
$("laminateSearch").oninput=renderLaminates;$("laminateStockFilter").onchange=renderLaminates;
$("laminatesList").onclick=async e=>{
  const edit=e.target.closest("[data-edit-laminate]"),del=e.target.closest("[data-delete-laminate]");
  if(edit){
    const x=state.laminates.find(v=>v.id===edit.dataset.editLaminate);
    $("laminateId").value=x.id;$("laminateName").value=x.name||"";$("laminateCode").value=x.code||"";
    $("laminateBrand").value=x.brand||"";$("laminateThickness").value=x.thickness||"16";
    $("laminateSize").value=x.size||"";$("laminateStock").value=x.stock||0;
    $("laminateSalePrice").value=x.salePrice||0;$("laminateCostPrice").value=x.costPrice||0;
    $("laminateMinStock").value=x.minStock||0;$("laminateNote").value=x.note||"";
    $("cancelLaminateEdit").hidden=false;
  }
  if(del&&confirm("Laminat o‘chirilsinmi?"))await deleteDoc(doc(db,"laminates",del.dataset.deleteLaminate));
};

$("saleLaminate").onchange=()=>{
  const x=state.laminates.find(v=>v.id===$("saleLaminate").value);
  $("saleLaminateUnitPrice").value=x?.salePrice||0;
};
$("saleLaminateDate").value=today();
$("laminateSaleForm").onsubmit=async e=>{
  e.preventDefault();
  const x=state.laminates.find(v=>v.id===$("saleLaminate").value),c=state.customers.find(v=>v.id===$("saleCustomer").value);
  if(!x)return;
  const qty=Number($("saleLaminateQty").value||0),unitPrice=Number($("saleLaminateUnitPrice").value||0),paid=Number($("saleLaminatePaid").value||0),total=qty*unitPrice;
  if(qty>Number(x.stock||0)){toast("Omborda yetarli laminat yo‘q");return}
  await addDoc(collection(db,"laminateSales"),{
    laminateId:x.id,laminateCode:x.code,laminateName:x.name,customerId:c?.id||"",customerName:c?.name||"",
    qty,unitPrice,total,paid,date:$("saleLaminateDate").value||today(),note:$("saleLaminateNote").value.trim(),createdAt:serverTimestamp()
  });
  await updateDoc(doc(db,"laminates",x.id),{stock:increment(-qty),updatedAt:serverTimestamp()});
  if(paid>0)await addDoc(collection(db,"finance"),{type:"income",amount:paid,category:"Laminat savdosi",method:"Naqd",date:$("saleLaminateDate").value||today(),note:`${x.code} ${x.name} — ${c?.name||"Mijoz"}`,createdAt:serverTimestamp()});
  $("laminateSaleForm").reset();$("saleLaminateDate").value=today();toast("Laminat sotildi va ombor kamaydi");
};
function renderLaminateSales(){
  const q=$("laminateSalesSearch").value.toLowerCase(),list=state.laminateSales.filter(x=>!q||`${x.laminateCode} ${x.laminateName} ${x.customerName}`.toLowerCase().includes(q));
  $("laminateSalesList").innerHTML=list.length?list.map(x=>row(
    `${x.laminateCode} — ${x.laminateName}`,
    `${esc(x.customerName||"Mijoz ko‘rsatilmagan")} · ${x.qty} list · ${esc(x.date||"")}`,
    `<strong>${money(x.total)}</strong>`,
    `<button class="delete" data-delete-laminate-sale="${x.id}">O‘chirish</button>`,
    `<span class="status">${Number(x.paid||0)>=Number(x.total||0)?"To‘langan":"Qoldiq: "+money(Number(x.total||0)-Number(x.paid||0))}</span>`
  )).join(""):"<p>Laminat sotuvlari yo‘q.</p>";
}
$("laminateSalesSearch").oninput=renderLaminateSales;
$("laminateSalesList").onclick=async e=>{const d=e.target.closest("[data-delete-laminate-sale]");if(d&&confirm("Sotuv yozuvi o‘chirilsinmi?"))await deleteDoc(doc(db,"laminateSales",d.dataset.deleteLaminateSale))};

function clearEdge(){
  clear(["edgeId","edgeCode","edgeName","edgeBrand","edgeStock","edgeSalePrice","edgeCostPrice","edgeNote"]);
  $("edgeThickness").value="0.4";$("edgeWidth").value="19";$("edgeMinStock").value=50;$("cancelEdgeEdit").hidden=true;
}
genericForm({
  form:"edgeForm",idField:"edgeId",collectionName:"edges",
  getData:()=>({
    code:$("edgeCode").value.trim(),name:$("edgeName").value.trim(),
    thickness:$("edgeThickness").value,width:$("edgeWidth").value,
    brand:$("edgeBrand").value.trim(),stock:Number($("edgeStock").value||0),
    salePrice:Number($("edgeSalePrice").value||0),costPrice:Number($("edgeCostPrice").value||0),
    minStock:Number($("edgeMinStock").value||0),note:$("edgeNote").value.trim()
  }),
  clearForm:clearEdge,message:"Kromka saqlandi"
});
$("cancelEdgeEdit").onclick=clearEdge;
function renderEdges(){
  const q=$("edgeSearch").value.toLowerCase(),th=$("edgeThicknessFilter").value,f=$("edgeStockFilter").value;
  const list=state.edges.filter(x=>{
    const out=Number(x.stock)<=0,low=!out&&Number(x.stock)<=Number(x.minStock||0);
    return(!q||`${x.code} ${x.name} ${x.brand}`.toLowerCase().includes(q))
      &&(!th||String(x.thickness)===th)
      &&(!f||(f==="available"&&!out)||(f==="low"&&low)||(f==="out"&&out));
  });
  $("edgesList").innerHTML=list.length?list.map(x=>row(
    `${x.code} — ${x.name}`,
    `${esc(x.brand||"Brendsiz")} · ${esc(x.thickness)}×${esc(x.width)} mm · ${x.stock} metr`,
    `<div><strong>${money(x.salePrice)} / m</strong><br><small>Ombor: ${money(Number(x.stock||0)*Number(x.costPrice||0))}</small></div>`,
    `<button class="edit" data-edit-edge="${x.id}">Tahrir</button><button class="delete" data-delete-edge="${x.id}">O‘chirish</button>`,
    `<span class="code-badge">${esc(x.code)}</span> <span class="status ${Number(x.stock)<=0?"danger":Number(x.stock)<=Number(x.minStock||0)?"warning":""}">${Number(x.stock)<=0?"Tugagan":Number(x.stock)<=Number(x.minStock||0)?"Kam":"Mavjud"}</span>`
  )).join(""):"<p>Kromkalar yo‘q.</p>";
  $("edgeTypeCount").textContent=state.edges.length;
  $("edgeMeterCount").textContent=state.edges.reduce((s,x)=>s+Number(x.stock||0),0).toLocaleString("uz-UZ");
  $("edgeStockValue").textContent=money(state.edges.reduce((s,x)=>s+Number(x.stock||0)*Number(x.costPrice||0),0));
  $("edgeLowCount").textContent=state.edges.filter(x=>Number(x.stock)<=Number(x.minStock||0)).length;
}
$("edgeSearch").oninput=renderEdges;$("edgeThicknessFilter").onchange=renderEdges;$("edgeStockFilter").onchange=renderEdges;
$("edgesList").onclick=async e=>{
  const edit=e.target.closest("[data-edit-edge]"),del=e.target.closest("[data-delete-edge]");
  if(edit){
    const x=state.edges.find(v=>v.id===edit.dataset.editEdge);
    $("edgeId").value=x.id;$("edgeCode").value=x.code||"";$("edgeName").value=x.name||"";
    $("edgeThickness").value=x.thickness||"0.4";$("edgeWidth").value=x.width||"19";
    $("edgeBrand").value=x.brand||"";$("edgeStock").value=x.stock||0;
    $("edgeSalePrice").value=x.salePrice||0;$("edgeCostPrice").value=x.costPrice||0;
    $("edgeMinStock").value=x.minStock||0;$("edgeNote").value=x.note||"";
    $("cancelEdgeEdit").hidden=false;
  }
  if(del&&confirm("Kromka o‘chirilsinmi?"))await deleteDoc(doc(db,"edges",del.dataset.deleteEdge));
};
$("saleEdge").onchange=()=>{const x=state.edges.find(v=>v.id===$("saleEdge").value);$("saleEdgeUnitPrice").value=x?.salePrice||0};
$("saleEdgeDate").value=today();
$("edgeSaleForm").onsubmit=async e=>{
  e.preventDefault();
  const x=state.edges.find(v=>v.id===$("saleEdge").value),c=state.customers.find(v=>v.id===$("saleEdgeCustomer").value);
  if(!x)return;
  const qty=Number($("saleEdgeQty").value||0),unitPrice=Number($("saleEdgeUnitPrice").value||0),paid=Number($("saleEdgePaid").value||0),total=qty*unitPrice;
  if(qty>Number(x.stock||0)){toast("Omborda yetarli kromka yo‘q");return}
  await addDoc(collection(db,"edgeSales"),{
    edgeId:x.id,edgeCode:x.code,edgeName:x.name,customerId:c?.id||"",customerName:c?.name||"",
    qty,unitPrice,total,paid,date:$("saleEdgeDate").value||today(),note:$("saleEdgeNote").value.trim(),createdAt:serverTimestamp()
  });
  await updateDoc(doc(db,"edges",x.id),{stock:increment(-qty),updatedAt:serverTimestamp()});
  if(paid>0)await addDoc(collection(db,"finance"),{type:"income",amount:paid,category:"Kromka savdosi",method:"Naqd",date:$("saleEdgeDate").value||today(),note:`${x.code} ${x.name} — ${c?.name||"Mijoz"}`,createdAt:serverTimestamp()});
  $("edgeSaleForm").reset();$("saleEdgeDate").value=today();toast("Kromka sotildi va ombor kamaydi");
};
function renderEdgeSales(){
  const q=$("edgeSalesSearch").value.toLowerCase(),list=state.edgeSales.filter(x=>!q||`${x.edgeCode} ${x.edgeName} ${x.customerName}`.toLowerCase().includes(q));
  $("edgeSalesList").innerHTML=list.length?list.map(x=>row(
    `${x.edgeCode} — ${x.edgeName}`,
    `${esc(x.customerName||"Mijoz ko‘rsatilmagan")} · ${x.qty} metr · ${esc(x.date||"")}`,
    `<strong>${money(x.total)}</strong>`,
    `<button class="delete" data-delete-edge-sale="${x.id}">O‘chirish</button>`,
    `<span class="status">${Number(x.paid||0)>=Number(x.total||0)?"To‘langan":"Qoldiq: "+money(Number(x.total||0)-Number(x.paid||0))}</span>`
  )).join(""):"<p>Kromka sotuvlari yo‘q.</p>";
}
$("edgeSalesSearch").oninput=renderEdgeSales;
$("edgeSalesList").onclick=async e=>{const d=e.target.closest("[data-delete-edge-sale]");if(d&&confirm("Sotuv yozuvi o‘chirilsinmi?"))await deleteDoc(doc(db,"edgeSales",d.dataset.deleteEdgeSale))};

$("productionForm").onsubmit=async e=>{e.preventDefault();const o=state.orders.find(x=>x.id===$("productionOrder").value),w=state.workers.find(x=>x.id===$("productionWorker").value);await addDoc(collection(db,"production"),{orderId:o?.id||"",orderTitle:o?.title||"",title:$("productionTitle").value.trim(),workerId:w?.id||"",workerName:w?.name||"",status:$("productionStage").value,deadline:$("productionDeadline").value,note:$("productionNote").value.trim(),createdAt:serverTimestamp()});clear(["productionTitle","productionDeadline","productionNote"]);toast("Vazifa saqlandi")};
function renderProduction(){const f=$("productionFilter").value,l=state.production.filter(p=>!f||p.status===f);$("productionList").innerHTML=l.length?l.map(p=>row(p.title,`${esc(p.orderTitle||"")} · ${esc(p.workerName||"Ishchi yo‘q")} · ${esc(p.deadline||"Muddat yo‘q")}`,"",`<button class="action" data-next-stage="${p.id}">Keyingi bosqich</button><button class="delete" data-delete-production="${p.id}">O‘chirish</button>`,`<span class="status">${statusNames[p.status]||p.status}</span>`)).join(""):"<p>Vazifalar yo‘q.</p>";$("todayTasks").innerHTML=state.production.filter(p=>p.deadline===today()).slice(0,6).map(p=>row(p.title,esc(p.workerName||""),"","",`<span class="status">${statusNames[p.status]||p.status}</span>`)).join("")||"<p>Bugungi vazifa yo‘q.</p>"}$("productionFilter").onchange=renderProduction;$("productionList").onclick=async e=>{const next=e.target.closest("[data-next-stage]"),del=e.target.closest("[data-delete-production]");if(next){const p=state.production.find(x=>x.id===next.dataset.nextStage),seq=["design","cutting","edge","drilling","assembly","ready"],idx=seq.indexOf(p.status);await updateDoc(doc(db,"production",p.id),{status:seq[Math.min(idx+1,seq.length-1)],updatedAt:serverTimestamp()})}if(del&&confirm("Vazifa o‘chirilsinmi?"))await deleteDoc(doc(db,"production",del.dataset.deleteProduction))};

function clearWorker(){clear(["workerId","workerName","workerPhone","workerSalary","workerAdvance"]);$("workerStatus").value="active";$("cancelWorkerEdit").hidden=true}
genericForm({form:"workerForm",idField:"workerId",collectionName:"workers",getData:()=>({name:$("workerName").value.trim(),phone:$("workerPhone").value.trim(),role:$("workerRole").value,salary:Number($("workerSalary").value||0),advance:Number($("workerAdvance").value||0),status:$("workerStatus").value}),clearForm:clearWorker,message:"Ishchi saqlandi"});$("cancelWorkerEdit").onclick=clearWorker;
function renderWorkers(){const q=$("workerSearch").value.toLowerCase(),l=state.workers.filter(w=>!q||`${w.name} ${w.phone} ${w.role}`.toLowerCase().includes(q));$("workersList").innerHTML=l.length?l.map(w=>row(w.name,`${esc(w.role)} · ${esc(w.phone||"")}`,`<strong>${money(Number(w.salary||0)-Number(w.advance||0))}</strong>`,`<button class="action" data-pay-worker="${w.id}">Oylik to‘lash</button><button class="edit" data-edit-worker="${w.id}">Tahrir</button><button class="delete" data-delete-worker="${w.id}">O‘chirish</button>`,`<span class="status ${w.status==="inactive"?"danger":""}">${w.status==="inactive"?"Ishlamaydi":"Ishlaydi"}</span>`)).join(""):"<p>Ishchilar yo‘q.</p>"}$("workerSearch").oninput=renderWorkers;$("workersList").onclick=async e=>{const edit=e.target.closest("[data-edit-worker]"),del=e.target.closest("[data-delete-worker]"),pay=e.target.closest("[data-pay-worker]");if(edit){const w=state.workers.find(x=>x.id===edit.dataset.editWorker);$("workerId").value=w.id;$("workerName").value=w.name||"";$("workerPhone").value=w.phone||"";$("workerRole").value=w.role||"Usta";$("workerSalary").value=w.salary||0;$("workerAdvance").value=w.advance||0;$("workerStatus").value=w.status||"active";$("cancelWorkerEdit").hidden=false}if(del&&confirm("Ishchi o‘chirilsinmi?"))await deleteDoc(doc(db,"workers",del.dataset.deleteWorker));if(pay){const w=state.workers.find(x=>x.id===pay.dataset.payWorker),amount=Math.max(0,Number(w.salary||0)-Number(w.advance||0));if(confirm(`${w.name} uchun ${money(amount)} chiqim yozilsinmi?`)){await addDoc(collection(db,"finance"),{type:"expense",amount,category:"Ish haqi",method:"Naqd",date:today(),note:w.name,createdAt:serverTimestamp()});await updateDoc(doc(db,"workers",w.id),{advance:0,updatedAt:serverTimestamp()});toast("Oylik kassaga yozildi")}}};

function clearSupplier(){clear(["supplierId","supplierName","supplierPhone","supplierProduct","supplierDebt","supplierNote"]);$("cancelSupplierEdit").hidden=true}
genericForm({form:"supplierForm",idField:"supplierId",collectionName:"suppliers",getData:()=>({name:$("supplierName").value.trim(),phone:$("supplierPhone").value.trim(),product:$("supplierProduct").value.trim(),debt:Number($("supplierDebt").value||0),note:$("supplierNote").value.trim()}),clearForm:clearSupplier,message:"Yetkazib beruvchi saqlandi"});$("cancelSupplierEdit").onclick=clearSupplier;
function renderSuppliers(){const q=$("supplierSearch").value.toLowerCase(),l=state.suppliers.filter(s=>!q||`${s.name} ${s.phone} ${s.product}`.toLowerCase().includes(q));$("suppliersList").innerHTML=l.length?l.map(s=>row(s.name,`${esc(s.product||"")} · ${esc(s.phone||"")}`,`<strong>${money(s.debt)}</strong>`,`<button class="edit" data-edit-supplier="${s.id}">Tahrir</button><button class="delete" data-delete-supplier="${s.id}">O‘chirish</button>`,Number(s.debt)>0?'<span class="status warning">Qarz bor</span>':"")).join(""):"<p>Yetkazib beruvchilar yo‘q.</p>"}$("supplierSearch").oninput=renderSuppliers;$("suppliersList").onclick=async e=>{const edit=e.target.closest("[data-edit-supplier]"),del=e.target.closest("[data-delete-supplier]");if(edit){const s=state.suppliers.find(x=>x.id===edit.dataset.editSupplier);$("supplierId").value=s.id;$("supplierName").value=s.name||"";$("supplierPhone").value=s.phone||"";$("supplierProduct").value=s.product||"";$("supplierDebt").value=s.debt||0;$("supplierNote").value=s.note||"";$("cancelSupplierEdit").hidden=false}if(del&&confirm("Yetkazib beruvchi o‘chirilsinmi?"))await deleteDoc(doc(db,"suppliers",del.dataset.deleteSupplier))};

$("purchaseDate").value=today();$("purchaseForm").onsubmit=async e=>{e.preventDefault();const s=state.suppliers.find(x=>x.id===$("purchaseSupplier").value),i=state.inventory.find(x=>x.id===$("purchaseInventory").value),qty=Number($("purchaseQuantity").value||0),total=Number($("purchaseTotal").value||0),paid=Number($("purchasePaid").value||0);await addDoc(collection(db,"purchases"),{supplierId:s?.id||"",supplierName:s?.name||"",inventoryId:i?.id||"",inventoryName:i?.name||"",quantity:qty,total,paid,date:$("purchaseDate").value||today(),note:$("purchaseNote").value.trim(),createdAt:serverTimestamp()});if(i)await updateDoc(doc(db,"inventory",i.id),{quantity:increment(qty),updatedAt:serverTimestamp()});if(paid>0)await addDoc(collection(db,"finance"),{type:"expense",amount:paid,category:"Material xaridi",method:"Naqd",date:$("purchaseDate").value||today(),note:`${s?.name||""} — ${i?.name||""}`,createdAt:serverTimestamp()});if(s&&total>paid)await updateDoc(doc(db,"suppliers",s.id),{debt:increment(total-paid),updatedAt:serverTimestamp()});$("purchaseForm").reset();$("purchaseDate").value=today();toast("Xarid saqlandi, ombor yangilandi")};
function renderPurchases(){const q=$("purchaseSearch").value.toLowerCase(),l=state.purchases.filter(p=>!q||`${p.supplierName} ${p.inventoryName}`.toLowerCase().includes(q));$("purchasesList").innerHTML=l.length?l.map(p=>row(p.inventoryName,`${esc(p.supplierName)} · ${p.quantity} · ${esc(p.date||"")}`,`<strong>${money(p.total)}</strong>`,`<button class="delete" data-delete-purchase="${p.id}">O‘chirish</button>`,`<span class="status">${Number(p.total||0)>Number(p.paid||0)?"Qisman to‘langan":"To‘langan"}</span>`)).join(""):"<p>Xaridlar yo‘q.</p>"}$("purchaseSearch").oninput=renderPurchases;$("purchasesList").onclick=async e=>{const d=e.target.closest("[data-delete-purchase]");if(d&&confirm("Xarid yozuvi o‘chirilsinmi?"))await deleteDoc(doc(db,"purchases",d.dataset.deletePurchase))};

$("financeDate").value=today();$("financeForm").onsubmit=async e=>{e.preventDefault();await addDoc(collection(db,"finance"),{type:$("financeType").value,amount:Number($("financeAmount").value||0),category:$("financeCategory").value.trim(),method:$("financeMethod").value,date:$("financeDate").value||today(),note:$("financeNote").value.trim(),createdAt:serverTimestamp()});$("financeForm").reset();$("financeDate").value=today();toast("Kassa operatsiyasi saqlandi")};
function renderFinance(){const q=$("financeSearch").value.toLowerCase(),l=state.finance.filter(f=>!q||`${f.category} ${f.note} ${f.method}`.toLowerCase().includes(q));$("financeList").innerHTML=l.length?l.map(f=>row(f.category,`${esc(f.note||"")} · ${esc(f.method||"")} · ${esc(dateOf(f))}`,`<strong class="${f.type==="income"?"money-income":"money-expense"}">${f.type==="income"?"+":"-"} ${money(f.amount)}</strong>`,`<button class="delete" data-delete-finance="${f.id}">O‘chirish</button>`)).join(""):"<p>Kassa yozuvlari yo‘q.</p>"}$("financeSearch").oninput=renderFinance;$("financeList").onclick=async e=>{const d=e.target.closest("[data-delete-finance]");if(d&&confirm("Kassa yozuvi o‘chirilsinmi?"))await deleteDoc(doc(db,"finance",d.dataset.deleteFinance))};

function renderCharts(){if(!window.Chart)return;const days=[...Array(30)].map((_,i)=>{const d=new Date();d.setDate(d.getDate()-(29-i));return d}),income=days.map(d=>state.finance.filter(f=>f.type==="income"&&dateOf(f)===d.toISOString().slice(0,10)).reduce((s,f)=>s+Number(f.amount||0),0)),expense=days.map(d=>state.finance.filter(f=>f.type==="expense"&&dateOf(f)===d.toISOString().slice(0,10)).reduce((s,f)=>s+Number(f.amount||0),0));financeChart?.destroy();financeChart=new Chart($("financeChart"),{type:"line",data:{labels:days.map(d=>d.getDate()),datasets:[{label:"Kirim",data:income,tension:.3},{label:"Chiqim",data:expense,tension:.3}]},options:{responsive:true}});const counts={};state.orders.forEach(o=>counts[statusNames[o.status]||o.status]=(counts[statusNames[o.status]||o.status]||0)+1);ordersChart?.destroy();ordersChart=new Chart($("ordersChart"),{type:"doughnut",data:{labels:Object.keys(counts),datasets:[{data:Object.values(counts)}]},options:{responsive:true}})}

function analysis(){
  const results=[];
  const low=state.inventory.filter(i=>Number(i.quantity)<=Number(i.minQuantity||0));if(low.length)results.push({type:"warning",text:`${low.length} ta material minimal qoldiqdan kamaygan. Eng avval: ${low.slice(0,3).map(x=>x.name).join(", ")}.`});
  const overdue=state.orders.filter(o=>o.deadline&&new Date(o.deadline)<new Date()&&!["delivered","cancelled"].includes(o.status));if(overdue.length)results.push({type:"danger",text:`${overdue.length} ta buyurtmaning muddati o‘tgan. Mijoz bilan bog‘lanish va ishlab chiqarish rejasini yangilash kerak.`});
  const openDebt=state.debts.filter(d=>d.status!=="paid").reduce((s,d)=>s+Number(d.amount||0),0);if(openDebt>0)results.push({type:"warning",text:`Ochiq qarzdorlik ${money(openDebt)}. Undirish rejasini tuzing.`});
  const completed=state.orders.filter(o=>o.status==="delivered"),profit=completed.reduce((s,o)=>s+Number(o.total||0)-Number(o.cost||0),0);if(completed.length)results.push({type:"",text:`Yetkazilgan ${completed.length} ta buyurtmada hisoblangan jami marja ${money(profit)}.`});
  const workerLoad={};state.production.filter(p=>p.status!=="ready").forEach(p=>workerLoad[p.workerName||"Belgilanmagan"]=(workerLoad[p.workerName||"Belgilanmagan"]||0)+1);const busiest=Object.entries(workerLoad).sort((a,b)=>b[1]-a[1])[0];if(busiest)results.push({type:"",text:`Eng band ishchi: ${busiest[0]} — ${busiest[1]} ta faol vazifa. Ish yukini tenglashtirishni ko‘rib chiqing.`});
  if(!results.length)results.push({type:"",text:"Hozircha jiddiy ogohlantirish yo‘q. Ma’lumotlarni muntazam kiritishda davom eting."});
  $("analysisResults").innerHTML=results.map(r=>`<div class="analysis-item ${r.type}">${esc(r.text)}</div>`).join("");
  const t=today(),fin=state.finance.filter(f=>dateOf(f)===t),inc=fin.filter(f=>f.type==="income").reduce((s,f)=>s+Number(f.amount||0),0),exp=fin.filter(f=>f.type==="expense").reduce((s,f)=>s+Number(f.amount||0),0);
  $("telegramReport").value=`BUVAYDA IBRAT MEBEL — ${t}\n\nBugungi kirim: ${money(inc)}\nBugungi chiqim: ${money(exp)}\nSof foyda: ${money(inc-exp)}\nFaol buyurtmalar: ${state.orders.filter(o=>!["delivered","cancelled"].includes(o.status)).length}\nKam qolgan materiallar: ${low.length}\nOchiq qarzdorlik: ${money(openDebt)}`;
}
$("refreshAnalysis").onclick=analysis;$("sendTelegramReport").onclick=()=>window.open(`https://t.me/share/url?url=&text=${encodeURIComponent($("telegramReport").value)}`,"_blank","noopener");
$("downloadDashboardPdf").onclick=()=>{const {jsPDF}=window.jspdf,d=new jsPDF();d.setFontSize(18);d.text("BUVAYDA IBRAT MEBEL",14,18);d.setFontSize(12);d.text("V10 BOSHQARUV HISOBOTI",14,28);d.setFontSize(10);d.text($("telegramReport").value.split("\n"),14,42);d.save(`V10-hisobot-${today()}.pdf`)};

function renderAll(){populateSelects();updateKpis();renderOrders();renderCustomers();renderInventory();renderLaminates();renderLaminateSales();renderEdges();renderEdgeSales();renderProduction();renderWorkers();renderSuppliers();renderPurchases();renderFinance();renderCharts();analysis()}
["orders","customers","inventory","laminates","laminateSales","edges","edgeSales","production","workers","suppliers","purchases","finance","debts"].forEach(name=>openCollection(name));
