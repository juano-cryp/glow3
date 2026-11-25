// GLOW 3 — catálogo compartido con Cloudflare D1/R2
const API_BASE = "https://glow3-api.juan-rico.workers.dev";
const WHATSAPP_NUMBER = "573202615305";
const TOKEN_KEY = "glow3_admin_token";
const $ = id => document.getElementById(id);
const money = n => new Intl.NumberFormat("es-CO",{style:"currency",currency:"COP",maximumFractionDigits:0}).format(Number(n)||0);
sessionStorage.removeItem(TOKEN_KEY); let products=[], category="Todos", cart={}, adminToken="", selectedVariants={};
const esc = s => String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const normalize = s => String(s||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().trim();
const imageUrl = key => key ? API_BASE+"/api/image?key="+encodeURIComponent(key) : "https://placehold.co/600x600/f8edf0/8f4d60?text=GLOW+3";
function fromApi(p){return {id:p.id,ref:p.reference,name:p.name,cat:p.category||"Otros",tone:p.tone||"",description:p.description||"",price:Number(p.price)||0,stock:Number(p.stock)||0,image_key:p.image_key||"",image_key_2:p.image_key_2||"",img:imageUrl(p.image_key),img2:p.image_key_2?imageUrl(p.image_key_2):""}}
async function api(path, options={}){const headers=new Headers(options.headers||{});if(adminToken)headers.set("Authorization","Bearer "+adminToken);const response=await fetch(API_BASE+path,{...options,headers});let data={};try{data=await response.json()}catch{}if(!response.ok)throw new Error(data.message||data.error||("Error HTTP "+response.status));return data}
async function loadProducts(){const data=await api("/api/products");products=(data.products||[]).map(fromApi);renderCats();renderProducts();renderCart();renderAdminProducts()}
function categories(){return ["Todos",...new Set(products.map(p=>p.cat||"Otros"))]}
function renderCats(){$("cats").innerHTML=categories().map(c=>'<button class="cat '+(c===category?"active":"")+'" data-cat="'+esc(c)+'"><span>'+(c==="Todos"?"✦":"◇")+"</span>"+esc(c)+"</button>").join("");document.querySelectorAll("[data-cat]").forEach(b=>b.onclick=()=>{category=b.dataset.cat;renderCats();renderProducts()})}
function productGroups(){
 const groups=new Map();
 for(const p of products){
  const key=normalize(p.ref);
  if(!groups.has(key))groups.set(key,[]);
  groups.get(key).push(p);
 }
 return [...groups.entries()].map(([key,variants])=>({key,variants}));
}
function selectedVariant(group){
 return group.variants.find(p=>String(p.id)===String(selectedVariants[group.key]))||group.variants[0];
}
function renderProducts(){
 const query=normalize($("search").value);
 let groups=productGroups().filter(group=>
  (category==="Todos"||group.variants.some(p=>p.cat===category)) &&
  (!query||group.variants.some(p=>normalize(p.name+" "+p.ref+" "+p.tone+" "+p.description).includes(query)))
 );
 groups=groups.map(group=>({...group,variants:[...group.variants].sort((a,b)=>a.id-b.id)}));
 if($("sort").value==="asc")groups.sort((a,b)=>selectedVariant(a).price-selectedVariant(b).price);
 if($("sort").value==="desc")groups.sort((a,b)=>selectedVariant(b).price-selectedVariant(a).price);
 $("products").innerHTML=groups.map(group=>{
  const p=selectedVariant(group),hasTones=group.variants.filter(v=>v.tone);
  const toneControls=hasTones.length>1?'<div class="tone-picker" aria-label="Seleccionar tono">'+group.variants.map(v=>v.tone?'<button type="button" class="tone-chip '+(String(v.id)===String(p.id)?"active":"")+'" data-tone="'+esc(group.key)+'" data-variant="'+esc(v.id)+'" title="'+esc(v.tone)+'">'+esc(v.tone)+'</button>':"").join("")+'</div>':"";
  return '<article class="card" data-card-ref="'+esc(group.key)+'"><button class="product-open" type="button" data-detail="'+esc(p.id)+'" aria-label="Ver detalles de '+esc(p.name)+'"><img src="'+esc(p.img)+'" alt="'+esc(p.name)+'" loading="lazy" onerror="this.src=\'https://placehold.co/600x600/f8edf0/8f4d60?text=GLOW+3\'"><span class="detail-hint">Ver producto '+(p.img2?'· 2 fotos':'· Detalles')+' ↗</span></button><div class="info"><small>'+esc(p.cat)+" · "+esc(p.ref)+'</small><h3>'+esc(p.name)+'</h3>'+toneControls+'<p class="variant-description">'+(p.tone?"Tono: "+esc(p.tone):esc(p.description||""))+'</p><div class="row"><b>'+money(p.price)+'</b><button class="add" data-add="'+esc(p.id)+'" '+(p.stock<=0?"disabled":"")+">"+(p.stock>0?"＋":"–")+'</button></div><div class="stock">'+(p.stock>0?"Disponible · "+p.stock:"Agotado")+"</div></div></article>";
 }).join("")||"<p>No hay productos que coincidan con tu búsqueda.</p>";
 document.querySelectorAll("[data-tone]").forEach(button=>button.onclick=()=>{
  selectedVariants[button.dataset.tone]=button.dataset.variant;
  renderProducts();
 });
 document.querySelectorAll("[data-add]").forEach(button=>button.onclick=()=>{
  const p=products.find(x=>String(x.id)===button.dataset.add);
  if(p&&(cart[p.id]||0)<p.stock)cart[p.id]=(cart[p.id]||0)+1;
  renderCart();
  if(p)showToast((p.name+(p.tone?" · "+p.tone:""))+" agregado a tu bolsa");
  $("count").classList.remove("bump");void $("count").offsetWidth;$("count").classList.add("bump");
 });
 const productGrid=$("products");
 if(!productGrid.dataset.detailHandler){
  productGrid.dataset.detailHandler="1";
  productGrid.addEventListener("click",event=>{
   if(event.target.closest("[data-add],[data-tone]"))return;
   const trigger=event.target.closest("[data-detail]");
   const card=event.target.closest(".card");
   const opener=trigger||card?.querySelector("[data-detail]");
   if(opener)openProductDetail(opener.dataset.detail);
  });
 }
}
function ensureProductDetail(){
 let modal=$("productDetail");if(modal)return modal;
 modal=document.createElement("div");modal.id="productDetail";modal.className="product-detail";modal.hidden=true;
 modal.innerHTML='<div class="detail-backdrop" data-detail-close></div><section class="detail-dialog" role="dialog" aria-modal="true" aria-labelledby="detailTitle"><button type="button" class="close detail-close" data-detail-close aria-label="Cerrar">×</button><div class="detail-gallery"><img id="detailMainImage" alt=""><div id="detailThumbs" class="detail-thumbs"></div></div><div class="detail-copy"><small id="detailReference"></small><h2 id="detailTitle"></h2><div id="detailTonePicker" class="detail-tone-picker"></div><p id="detailDescription"></p><b id="detailPrice" class="detail-price"></b><p id="detailStock" class="detail-stock"></p><button type="button" id="detailAdd" class="send">Añadir a mi bolsa</button></div></section>';
 document.body.append(modal);modal.querySelectorAll("[data-detail-close]").forEach(el=>el.onclick=()=>modal.hidden=true);
 document.addEventListener("keydown",e=>{if(e.key==="Escape")modal.hidden=true});return modal;
}
function ensureImageLightbox(){
 let box=$("imageLightbox");if(box)return box;
 box=document.createElement("div");box.id="imageLightbox";box.className="image-lightbox";box.hidden=true;
 box.innerHTML='<button type="button" class="lightbox-close" aria-label="Cerrar imagen">×</button><img id="lightboxImage" alt="">';
 document.body.append(box);
 box.addEventListener("click",e=>{if(e.target===box||e.target.closest(".lightbox-close"))box.hidden=true});
 document.addEventListener("keydown",e=>{if(e.key==="Escape")box.hidden=true});
 return box;
}
function openImageLightbox(src,alt){
 const box=ensureImageLightbox(),img=$("lightboxImage");img.src=src;img.alt=alt||"Imagen ampliada del producto";box.hidden=false;
}
function openProductDetail(id){
 let p=products.find(x=>String(x.id)===String(id));if(!p)return;
 const group=productGroups().find(g=>g.key===normalize(p.ref));
 const modal=ensureProductDetail();
 const tonePicker=$("detailTonePicker");
 const updateDetail=variant=>{
  p=variant;
  const images=[p.img,...(p.img2?[p.img2]:[])];
  $("detailReference").textContent="GLOW 3 · "+p.ref;
  $("detailTitle").textContent=p.name;
  $("detailDescription").textContent=p.description||"Pronto agregaremos más información de este producto.";
  $("detailPrice").textContent=money(p.price);
  $("detailStock").textContent=p.stock>0?"Disponible · "+p.stock+" unidades":"Agotado";
  $("detailAdd").disabled=p.stock<=0;
  $("detailAdd").onclick=()=>{
   if((cart[p.id]||0)<p.stock){cart[p.id]=(cart[p.id]||0)+1;renderCart();showToast(p.name+(p.tone?" · "+p.tone:"")+" agregado a tu bolsa");modal.hidden=true;drawer(true)}
  };
  const main=$("detailMainImage");main.src=images[0];main.alt=p.name;
  main.onclick=()=>openImageLightbox(main.src,main.alt);main.title="Haz clic para ampliar la imagen";
  $("detailThumbs").innerHTML=images.map((src,i)=>'<button type="button" class="detail-thumb '+(i===0?"active":"")+'" data-image-index="'+i+'" aria-label="Ver fotografía '+(i+1)+'"><img src="'+esc(src)+'" alt=""></button>').join("");
  $("detailThumbs").querySelectorAll("[data-image-index]").forEach(btn=>btn.onclick=()=>{main.src=images[Number(btn.dataset.imageIndex)];$("detailThumbs").querySelectorAll(".detail-thumb").forEach(x=>x.classList.toggle("active",x===btn))});
  tonePicker.querySelectorAll("[data-detail-variant]").forEach(btn=>btn.classList.toggle("active",String(btn.dataset.detailVariant)===String(p.id)));
 };
 const variants=group?group.variants.filter(v=>v.tone):[];
 tonePicker.innerHTML=variants.length>1?'<small>Selecciona un tono</small><div class="tone-picker">'+variants.map(v=>'<button type="button" class="tone-chip '+(String(v.id)===String(p.id)?"active":"")+'" data-detail-variant="'+esc(v.id)+'">'+esc(v.tone)+'</button>').join("")+'</div>':"";
 tonePicker.querySelectorAll("[data-detail-variant]").forEach(btn=>btn.onclick=()=>{
  const variant=products.find(x=>String(x.id)===btn.dataset.detailVariant);
  if(variant){selectedVariants[normalize(variant.ref)]=variant.id;updateDetail(variant);renderProducts()}
 });
 updateDetail(p);
 modal.hidden=false;
}
function renderCart(){
 const entries=Object.entries(cart).filter(([id])=>products.some(p=>String(p.id)===id));
 const qty=entries.reduce((s,[,n])=>s+n,0);
 const total=entries.reduce((s,[id,n])=>s+(products.find(p=>String(p.id)===id)?.price||0)*n,0);
 $("count").textContent=qty;if($("countNav"))$("countNav").textContent=qty;
 $("items").innerHTML=entries.length?entries.map(([id,n])=>{
  const p=products.find(x=>String(x.id)===id);
  return '<div class="cartline"><img src="'+esc(p.img)+'"><div><b>'+esc(p.name)+'</b><p>'+(p.tone?"Tono: "+esc(p.tone)+" · ":"")+money(p.price)+'</p><button data-dec="'+esc(id)+'">−</button> '+n+' <button data-inc="'+esc(id)+'">+</button></div><b>'+money(p.price*n)+"</b></div>";
 }).join(""):"<p>Tu bolsa está vacía. Explora los productos y agrega tus favoritos ✦</p>";
 $("total").textContent=money(total);
 document.querySelectorAll("[data-dec]").forEach(b=>b.onclick=()=>{const id=b.dataset.dec;if(--cart[id]<=0)delete cart[id];renderCart()});
 document.querySelectorAll("[data-inc]").forEach(b=>b.onclick=()=>{const id=b.dataset.inc,p=products.find(x=>String(x.id)===id);if(p&&cart[id]<p.stock)cart[id]++;renderCart()});
}
function drawer(open){$("drawer").classList.toggle("open",open);$("shade").classList.toggle("show",open)}
function showLogin(){$("loginShade").hidden=false;$("loginStatus").textContent="";$("adminEmail").focus()}
function closeLogin(){$("loginShade").hidden=true}
function openAdmin(e){if(e)e.preventDefault();$("adminPanel").hidden=true;showLogin()}
function logout(){adminToken="";sessionStorage.removeItem(TOKEN_KEY);$("adminPanel").hidden=true;closeLogin()}
async function login(e){e.preventDefault();$("loginStatus").textContent="Verificando acceso…";const email=$("adminEmail").value.trim(),password=$("adminPassword").value;try{const data=await api("/api/admin/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email,password})});adminToken=data.token;if(!adminToken)throw new Error("El servidor no devolvió un token de acceso.");sessionStorage.setItem(TOKEN_KEY,adminToken);$("adminPassword").value="";closeLogin();$("adminPanel").hidden=false;$("adminPanel").scrollIntoView({behavior:"smooth"});renderAdminProducts()}catch(err){$("loginStatus").textContent=err.message||"No fue posible iniciar sesión."} }
function parseExcel(file){
 if(!window.XLSX)throw new Error("No se pudo cargar el lector de Excel. Recarga la página e inténtalo de nuevo.");
 return new Promise((resolve,reject)=>{
  const reader=new FileReader();reader.onerror=()=>reject(new Error("No se pudo leer el archivo."));
  reader.onload=e=>{try{
   const wb=XLSX.read(e.target.result,{type:"array"}),rowsOut=[],seen=new Set();
   const aliases={
    reference:["referencia","referencia producto","ref","codigo","codigo producto"],
    stock:["stock","existencia","inventario","cantidad"],
    name:["nombre","producto","nombre producto","descripcion","descripción"],
    tone:["tono","color","shade","variante"],
    detail:["detalle","detalle del producto","descripcion detallada","descripción detallada","beneficios","beneficios del producto","caracteristicas","características","uso y beneficios"],
    price:["precio","valor","precio venta","precio unitario"]
   };
   const findColumn=(headers,names)=>headers.findIndex(h=>names.some(n=>h===normalize(n)||h.includes(normalize(n))));
   for(const sheet of wb.SheetNames){
    const rows=XLSX.utils.sheet_to_json(wb.Sheets[sheet],{header:1,defval:""});let columns=null;
    for(const row of rows){
     const cells=row.map(v=>String(v??"").trim());if(cells.every(v=>!v))continue;
     const headers=cells.map(normalize),ri=findColumn(headers,aliases.reference),si=findColumn(headers,aliases.stock),ni=findColumn(headers,aliases.name);
     if(ri>=0&&si>=0&&ni>=0){columns={ri,si,ni,ti:findColumn(headers,aliases.tone),di:findColumn(headers,aliases.detail),pi:findColumn(headers,aliases.price)};continue}
     if(!columns)continue;
     const reference=cells[columns.ri],name=cells[columns.ni],tone=columns.ti>=0?cells[columns.ti]:"";
     if(!reference||!name)continue;
     const stock=Number(cells[columns.si].replace(/[^0-9-]/g,""));
     if(!Number.isInteger(stock)||stock<0)throw new Error("Stock inválido para "+reference+(tone?" / "+tone:"")+". Usa un entero igual o mayor que cero.");
     let price=null;
     if(columns.pi>=0){
      const raw=cells[columns.pi].replace(/[^0-9,.-]/g,"").trim();
      if(raw){const normalizedPrice=raw.includes(",")?raw.replace(/\./g,"").replace(",","."):raw.replace(/\.(?=\d{3}(?:\D|$))/g,"");price=Number(normalizedPrice);if(!Number.isFinite(price)||price<0)throw new Error("Precio inválido para "+reference+".")}
     }
     const key=normalize(reference)+"::"+normalize(tone);
     if(seen.has(key))throw new Error("La combinación referencia/tono está repetida: "+reference+" / "+(tone||"sin tono")+".");
     seen.add(key);
     const detail=columns.di>=0?cells[columns.di]:"";
     rowsOut.push({reference,name,tone,description:detail,stock,price});
    }
   }
   resolve(rowsOut);
  }catch(err){reject(err)}};
  reader.readAsArrayBuffer(file);
 });
}

async function importExcel(file){
 if(!file)return;
 const status=$("importStatus");status.textContent="Leyendo y validando el Excel…";
 try{
  const rows=await parseExcel(file);
  if(!rows.length)throw new Error("No encontré productos. Usa REFERENCIA, NOMBRE, TONO, DETALLE, STOCK y PRECIO.");
  const payload=[],missing=[];
  for(const row of rows){
   const previous=products.find(p=>normalize(p.ref)===normalize(row.reference)&&normalize(p.tone)===normalize(row.tone))
    ||products.find(p=>normalize(p.ref)===normalize(row.reference));
   const price=row.price!==null?row.price:previous?.price;
   if(price===undefined||price===null){missing.push(row.reference+(row.tone?" / "+row.tone:""));continue}
   payload.push({...row,price,category:previous?.cat||"Otros"});
  }
  if(missing.length)throw new Error("Falta PRECIO para estas variantes nuevas: "+missing.slice(0,5).join("; ")+(missing.length>5?"…":""));
  if(payload.length>500)throw new Error("El archivo supera el límite de 500 variantes.");
  const result=await api("/api/admin/import",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({products:payload})});
  await loadProducts();
  status.textContent="Importación completada: "+(result.nuevos??0)+" variantes nuevas y "+(result.actualizados??0)+" actualizadas. Las fotografías existentes se conservaron.";
 }catch(err){status.textContent=err.message||"No se pudo importar el archivo."}
 finally{$("excelFile").value=""}
}

function renderAdminProducts(){
 if(!$("adminProducts"))return;
 $("adminProducts").innerHTML=products.map(p=>'<div class="admin-row"><div><b>'+esc(p.name)+(p.tone?' · '+esc(p.tone):'')+'</b><small>'+esc(p.ref)+" · "+esc(p.cat)+" · Stock "+p.stock+" · "+money(p.price)+'</small><small class="photo-state">Foto 1: '+(p.image_key?"Cargada":"Sin foto")+' · Foto 2: '+(p.image_key_2?"Cargada":"Sin foto")+'</small></div><div class="photo-actions"><label class="photo-btn">Subir foto 1<input type="file" accept="image/jpeg,image/png,image/webp" data-photo="1" data-product="'+esc(p.id)+'" hidden></label><label class="photo-btn photo-secondary">Subir foto 2<input type="file" accept="image/jpeg,image/png,image/webp" data-photo="2" data-product="'+esc(p.id)+'" hidden></label></div></div>').join("");
 document.querySelectorAll("[data-photo]").forEach(input=>input.onchange=async()=>{
  const file=input.files[0],p=products.find(x=>String(x.id)===input.dataset.product),slot=input.dataset.photo;if(!file||!p)return;
  if(file.size>5*1024*1024){alert("La imagen debe pesar máximo 5 MB.");input.value="";return}
  const form=new FormData();form.append("file",file);form.append("productId",String(p.id));form.append("slot",slot);
  const status=$("importStatus");status.textContent="Subiendo fotografía "+slot+" de "+p.name+(p.tone?" · "+p.tone:"")+"…";
  try{await api("/api/admin/upload-image",{method:"POST",body:form});await loadProducts();status.textContent="Fotografía "+slot+" actualizada para "+p.name+(p.tone?" · "+p.tone:"")+"."}
  catch(err){status.textContent=err.message||"No se pudo subir la imagen."}
  finally{input.value=""}
 });
}


$("openCart").onclick=()=>drawer(true);if($("openCartNav"))$("openCartNav").onclick=e=>{e.preventDefault();drawer(true)};$("close").onclick=()=>drawer(false);$("shade").onclick=()=>drawer(false);$("search").oninput=renderProducts;$("sort").onchange=renderProducts;$("adminToggle").onclick=openAdmin;$("adminLogin").onsubmit=login;$("loginClose").onclick=closeLogin;$("loginShade").onclick=e=>{if(e.target===$("loginShade"))closeLogin()};$("importExcelBtn").onclick=()=>$("excelFile").click();$("excelFile").onchange=e=>importExcel(e.target.files[0]);$("refreshAdmin").onclick=()=>{loadProducts().catch(err=>$("importStatus").textContent=err.message)};$("adminLogout").onclick=logout;
$("send").onclick=()=>{const entries=Object.entries(cart);if(!entries.length)return alert("Agrega productos a tu bolsa.");let total=0;const lines=entries.map(([id,n])=>{const p=products.find(x=>String(x.id)===id);if(!p)return "";total+=p.price*n;return "• "+p.name+(p.tone?" — Tono: "+p.tone:"")+" ("+p.ref+") x"+n+" — "+money(p.price*n)}).filter(Boolean);const msg="Hola, quiero hacer este pedido de GLOW 3:\n\n"+lines.join("\n")+"\n\nTotal: "+money(total)+"\n¿Me confirman disponibilidad y entrega?";window.open("https://wa.me/"+WHATSAPP_NUMBER+"?text="+encodeURIComponent(msg),"_blank")};
initGlowEnhancements();loadProducts().catch(err=>{$("products").innerHTML='<p class="load-error">No fue posible cargar el catálogo. Verifica tu conexión e intenta recargar la página.</p>';console.error(err)});


// Animaciones e interacciones GLOW 3
function showToast(message){let el=$("glowToast");if(!el){el=document.createElement("div");el.id="glowToast";el.className="glow-toast";el.setAttribute("role","status");document.body.append(el)}el.textContent=message;el.classList.add("visible");clearTimeout(el._timer);el._timer=setTimeout(()=>el.classList.remove("visible"),2600)}
function animateNumber(el,target){const duration=650,start=performance.now();function tick(now){const progress=Math.min(1,(now-start)/duration);el.textContent=Math.round(target*(1-Math.pow(1-progress,3))).toLocaleString("es-CO");if(progress<1)requestAnimationFrame(tick)}requestAnimationFrame(tick)}
function observeReveal(root=document){const nodes=root.querySelectorAll(".section-heading,.partner-strip,.cat,.card,.tools,.note,.admin-row,.admin-actions,.hero-footnote");if(!("IntersectionObserver" in window)||window.matchMedia("(prefers-reduced-motion: reduce)").matches){nodes.forEach(n=>n.classList.add("revealed"));return}const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add("revealed");observer.unobserve(entry.target)}}),{threshold:.08,rootMargin:"0px 0px -35px 0px"});nodes.forEach((n,i)=>{if(!n.classList.contains("revealed")){n.classList.add("reveal-on-scroll");n.style.transitionDelay=Math.min(i%8,7)*55+"ms";observer.observe(n)}})}
function initGlowEnhancements(){observeReveal();const productsRoot=$("products");if(productsRoot)new MutationObserver(()=>observeReveal(productsRoot)).observe(productsRoot,{childList:true});const catsRoot=$("cats");if(catsRoot)new MutationObserver(()=>observeReveal(catsRoot)).observe(catsRoot,{childList:true});const adminRoot=$("adminProducts");if(adminRoot)new MutationObserver(()=>observeReveal(adminRoot)).observe(adminRoot,{childList:true});const wa=document.createElement("a");wa.className="whatsapp-float";wa.href="https://wa.me/"+WHATSAPP_NUMBER;wa.target="_blank";wa.rel="noopener";wa.setAttribute("aria-label","Contactar por WhatsApp");wa.innerHTML="<span>¿Necesitas ayuda?</span><b>✆</b>";document.body.append(wa)}
