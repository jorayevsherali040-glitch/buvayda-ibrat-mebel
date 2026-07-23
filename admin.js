import { auth, db } from "./firebase-config.js";
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, serverTimestamp, query, orderBy } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

const OWNER="jorayevsherali040-glitch", REPO="buvayda-ibrat-mebel", BRANCH="main", FOLDER="images";
const API=`https://api.github.com/repos/${OWNER}/${REPO}/contents/${FOLDER}?ref=${BRANCH}`;
const $=id=>document.getElementById(id);
const productsCollection=collection(db,"products");

let products=[], githubImages=[], selectedImages=[];

function esc(v=""){return String(v).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;")}
function status(msg,type="success"){const b=$("adminStatus");b.textContent=msg;b.className=`admin-status show ${type}`;setTimeout(()=>b.className="admin-status",4500)}
function img(name=""){const clean=String(name).trim().replace(/^images\//,"");return clean?`./images/${encodeURIComponent(clean).replaceAll("%2F","/")}`:"./logo.png"}
function getImages(p={}){if(Array.isArray(p.images)&&p.images.length)return p.images;if(p.imageName)return[p.imageName];return[]}
function csv(value=""){return String(value).split(",").map(x=>x.trim()).filter(Boolean)}

async function loadImages(show=false){
  $("refreshImagesButton").disabled=true;
  $("refreshImagesButton").textContent="Yuklanmoqda...";
  try{
    const response=await fetch(API,{headers:{Accept:"application/vnd.github+json"},cache:"no-store"});
    if(!response.ok)throw new Error(response.status);
    githubImages=(await response.json()).filter(x=>x.type==="file").map(x=>x.name).filter(n=>/\.(jpe?g|png|webp|gif|avif)$/i.test(n)).sort((a,b)=>a.localeCompare(b,undefined,{numeric:true}));
    $("productImageSelect").innerHTML='<option value="">Rasm tanlang...</option>'+githubImages.map(n=>`<option value="${esc(n)}">${esc(n)}</option>`).join("");
    if(show)status(`${githubImages.length} ta rasm topildi.`);
  }catch(error){
    console.error(error);
    status("Rasmlar ro‘yxati yuklanmadi. Nomini qo‘lda yozing.","error");
  }finally{
    $("refreshImagesButton").disabled=false;
    $("refreshImagesButton").textContent="Rasmlarni yangilash";
  }
}

function renderSelected(){
  $("selectedImages").innerHTML=selectedImages.length
    ?selectedImages.map((name,index)=>`
      <article class="selected-image-card">
        <img src="${esc(img(name))}" alt="">
        <div>
          <strong>${index+1}. ${esc(name)}</strong>
          ${index===0?'<span class="main-image-label">Asosiy rasm</span>':""}
        </div>
        <div class="selected-image-actions">
          ${index>0?`<button data-up="${index}" type="button">↑</button>`:""}
          ${index<selectedImages.length-1?`<button data-down="${index}" type="button">↓</button>`:""}
          <button class="remove-image" data-remove="${index}" type="button">×</button>
        </div>
      </article>`).join("")
    :'<p class="muted-text">Hozircha rasm tanlanmagan.</p>';
}

function addImage(name){
  const clean=String(name||"").trim().replace(/^images\//,"");
  if(!clean)return status("Rasm tanlang yoki nomini yozing.","error");
  if(!/\.(jpe?g|png|webp|gif|avif)$/i.test(clean))return status("Rasm formati noto‘g‘ri.","error");
  if(selectedImages.includes(clean))return status("Bu rasm qo‘shilgan.","error");
  if(selectedImages.length>=5)return status("Ko‘pi bilan 5 ta rasm qo‘shiladi.","error");
  selectedImages.push(clean);
  renderSelected();
  $("productImageSelect").value="";
  $("productImageName").value="";
}

$("addImageButton").onclick=()=>addImage($("productImageSelect").value);
$("addManualImageButton").onclick=()=>addImage($("productImageName").value);
$("refreshImagesButton").onclick=()=>loadImages(true);
$("selectedImages").onclick=event=>{
  const remove=event.target.closest("[data-remove]");
  const up=event.target.closest("[data-up]");
  const down=event.target.closest("[data-down]");
  if(remove)selectedImages.splice(Number(remove.dataset.remove),1);
  if(up){const i=Number(up.dataset.up);[selectedImages[i-1],selectedImages[i]]=[selectedImages[i],selectedImages[i-1]]}
  if(down){const i=Number(down.dataset.down);[selectedImages[i+1],selectedImages[i]]=[selectedImages[i],selectedImages[i+1]]}
  renderSelected();
};

function updateStats(){
  $("statTotal").textContent=products.length;
  $("statFeatured").textContent=products.filter(p=>p.featured).length;
  $("statSold").textContent=products.filter(p=>p.soldOut||Number(p.stock)===0).length;
  $("statStock").textContent=products.reduce((sum,p)=>sum+Number(p.stock||0),0);
  $("statCategories").textContent=new Set(products.map(p=>p.category).filter(Boolean)).size;
  $("statSales").textContent=products.reduce((sum,p)=>sum+Number(p.salesCount||0),0);
}

function clearForm(){
  ["editingProductId","productName","productPrice","productOldPrice","productVideo","productDescription","productSku","productColors","productSizes","productMaterial"].forEach(id=>$(id).value="");
  $("productCategory").value="Spalniy";
  $("productStock").value="1";
  $("productSales").value="0";
  $("productFeatured").checked=false;
  $("productNew").checked=false;
  $("productSoldOut").checked=false;
  $("productSort").value="0";
  $("productStatus").value="active";
  $("formTitle").textContent="Yangi mahsulot";
  $("saveProductButton").textContent="Mahsulotni saqlash";
  $("cancelEditButton").hidden=true;
  selectedImages=[];
  renderSelected();
}

$("loginForm").onsubmit=async event=>{
  event.preventDefault();
  $("loginMessage").textContent="Tekshirilmoqda...";
  try{
    await signInWithEmailAndPassword(auth,$("adminEmail").value.trim(),$("adminPassword").value);
    $("loginMessage").textContent="Muvaffaqiyatli kirdingiz.";
  }catch(error){
    console.error(error);
    $("loginMessage").textContent="Email yoki parol noto‘g‘ri.";
  }
};
$("logoutButton").onclick=()=>signOut(auth);
$("cancelEditButton").onclick=clearForm;

onAuthStateChanged(auth,user=>{
  $("loginCard").hidden=Boolean(user);
  $("dashboard").hidden=!user;
  $("loggedInEmail").textContent=user?`Kirish: ${user.email}`:"";
  if(user)loadImages();
});

$("saveProductButton").onclick=async()=>{
  if(!auth.currentUser)return status("Avval admin sifatida kiring.","error");
  const name=$("productName").value.trim();
  const price=$("productPrice").value.trim();
  if(!name||!price)return status("Mahsulot nomi va narxini kiriting.","error");
  if(!selectedImages.length)return status("Kamida bitta rasm qo‘shing.","error");

  $("saveProductButton").disabled=true;
  $("saveProductButton").textContent="Saqlanmoqda...";

  try{
    const data={
      name,
      price,
      oldPrice:$("productOldPrice").value.trim(),
      category:$("productCategory").value,
      images:[...selectedImages],
      imageName:selectedImages[0],
      image:img(selectedImages[0]),
      video:$("productVideo").value.trim(),
      stock:Math.max(0,Number($("productStock").value||0)),
      salesCount:Math.max(0,Number($("productSales").value||0)),
      sku:$("productSku").value.trim(),
      colors:csv($("productColors").value),
      sizes:csv($("productSizes").value),
      material:$("productMaterial").value.trim(),
      featured:$("productFeatured").checked,
      isNew:$("productNew").checked,
      soldOut:$("productSoldOut").checked,
      sortOrder:Number($("productSort").value||0),
      status:$("productStatus").value,
      description:$("productDescription").value.trim(),
      updatedAt:serverTimestamp()
    };
    const id=$("editingProductId").value;
    if(id){
      await updateDoc(doc(db,"products",id),data);
      status("Mahsulot yangilandi.");
    }else{
      await addDoc(productsCollection,{...data,createdAt:serverTimestamp()});
      status("Mahsulot qo‘shildi.");
    }
    clearForm();
  }catch(error){
    console.error(error);
    status("Mahsulotni saqlashda xatolik.","error");
  }finally{
    $("saveProductButton").disabled=false;
    $("saveProductButton").textContent="Mahsulotni saqlash";
  }
};

function renderProducts(){
  const search=$("adminSearch").value.trim().toLowerCase();
  const list=products.filter(p=>!search||`${p.name} ${p.category} ${p.price} ${p.sku||""}`.toLowerCase().includes(search));
  $("adminProducts").innerHTML=list.length?list.map(p=>{
    const images=getImages(p);
    return `<article class="admin-item">
      <img src="${esc(img(images[0]||""))}" alt="">
      <div>
        <h3>${esc(p.name)}</h3>
        <p>${esc(p.category||"Boshqa")} · Ombor: ${Number(p.stock??1)} · Sotilgan: ${Number(p.salesCount||0)} · ${images.length} ta rasm</p>
        <div class="admin-item-price">${esc(p.price)}</div>
        <div class="admin-badges">
          ${p.featured?"<span>TOP</span>":""}
          ${p.isNew?"<span>YANGI</span>":""}
          ${p.soldOut?"<span>SOTILDI</span>":""}
          ${p.status==="hidden"?"<span>YASHIRIN</span>":""}
        </div>
      </div>
      <div class="admin-actions">
        <button class="edit-button" data-edit="${p.id}">Tahrirlash</button>
        <button class="delete-button" data-delete="${p.id}">O‘chirish</button>
      </div>
    </article>`;
  }).join(""):"<p>Hozircha mahsulot yo‘q.</p>";
}

$("adminSearch").oninput=renderProducts;
$("adminProducts").onclick=async event=>{
  const edit=event.target.closest("[data-edit]");
  const remove=event.target.closest("[data-delete]");
  if(edit){
    const p=products.find(x=>x.id===edit.dataset.edit);
    if(!p)return;
    $("editingProductId").value=p.id;
    $("productName").value=p.name||"";
    $("productPrice").value=p.price||"";
    $("productOldPrice").value=p.oldPrice||"";
    $("productCategory").value=p.category||"Boshqa";
    $("productVideo").value=p.video||"";
    $("productStock").value=Number(p.stock??1);
    $("productSales").value=Number(p.salesCount||0);
    $("productSku").value=p.sku||"";
    $("productColors").value=Array.isArray(p.colors)?p.colors.join(", "):"";
    $("productSizes").value=Array.isArray(p.sizes)?p.sizes.join(", "):"";
    $("productMaterial").value=p.material||"";
    $("productFeatured").checked=Boolean(p.featured);
    $("productNew").checked=Boolean(p.isNew);
    $("productSoldOut").checked=Boolean(p.soldOut);
    $("productSort").value=Number(p.sortOrder||0);
    $("productStatus").value=p.status||"active";
    $("productDescription").value=p.description||"";
    selectedImages=getImages(p).slice(0,5);
    renderSelected();
    $("formTitle").textContent="Mahsulotni tahrirlash";
    $("saveProductButton").textContent="O‘zgarishlarni saqlash";
    $("cancelEditButton").hidden=false;
    scrollTo({top:0,behavior:"smooth"});
  }
  if(remove&&confirm("Mahsulotni o‘chirmoqchimisiz?")){
    try{
      await deleteDoc(doc(db,"products",remove.dataset.delete));
      status("Mahsulot o‘chirildi.");
    }catch(error){
      console.error(error);
      status("O‘chirishda xatolik.","error");
    }
  }
};

onSnapshot(query(productsCollection,orderBy("createdAt","desc")),snapshot=>{
  products=snapshot.docs.map(d=>({id:d.id,...d.data()}));
  renderProducts();
  updateStats();
},error=>{
  console.error(error);
  $("adminProducts").innerHTML="<p>Mahsulotlarni yuklashda xatolik.</p>";
});
