import { getProducts, getOrders, addProduct, updateProduct, deleteProduct as deleteProductFromService, uploadImageToStorage, getSettingsFromFirestore, saveSettingsToFirestore } from "./sheets-service.js";
import { showMessage, hideMessage, db } from "./firebase-config.js";
import { doc, updateDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const ALL_GOVERNORATES = [
    "القاهرة", "الجيزة", "الإسكندرية", "الدقهلية", "الشرقية", "القليوبية",
    "كفر الشيخ", "الغربية", "المنوفية", "البحيرة", "الإسماعيلية", "السويس",
    "بني سويف", "الفيوم", "المنيا", "أسيوط", "سوهاج", "قنا", "الأقصر",
    "أسوان", "البحر الأحمر", "الوادي الجديد", "مطروح", "شمال سيناء",
    "جنوب سيناء", "دمياط", "بورسعيد"
];

const DEFAULT_SHIPPING = {
    "القاهرة": 50, "الجيزة": 50, "الإسكندرية": 70, "الدقهلية": 80,
    "الشرقية": 80, "القليوبية": 60, "كفر الشيخ": 80, "الغربية": 80,
    "المنوفية": 80, "البحيرة": 80, "الإسماعيلية": 90, "السويس": 90,
    "بني سويف": 100, "الفيوم": 100, "المنيا": 120, "أسيوط": 130,
    "سوهاج": 130, "قنا": 140, "الأقصر": 150, "أسوان": 160,
    "البحر الأحمر": 150, "الوادي الجديد": 200, "مطروح": 150,
    "شمال سيناء": 180, "جنوب سيناء": 180, "دمياط": 80, "بورسعيد": 90
};

const userData = JSON.parse(localStorage.getItem('vora_user'));
if (!userData || (userData.role !== 'admin' && userData.role !== 'manager')) {
    window.location.href = "home.html";
}

let editingProductId = null; 
let uploadedImageData = ""; // سيحتفظ برابط الصورة الحالي عند التعديل
window.selectedProductFile = null; // سيخزن كائن ملف الصورة المرفوع حالياً

let uploadedHeroImage = "";
let uploadedLogo = "";
let uploadedLoginLogo = "";
let slideshowImages = [];
let uploadedBannerImages = ["", "", ""];

window.previewHeroImage = function(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { showMessage("⚠️ الصورة كبيرة جداً"); return; }
    const reader = new FileReader();
    reader.onload = function(ev) {
        uploadedHeroImage = ev.target.result;
        document.getElementById('heroPreviewImg').src = uploadedHeroImage;
        document.getElementById('heroImagePreview').classList.remove('hidden');
        document.getElementById('heroUploadPlaceholder').innerHTML = '📁 تغيير الصورة';
    };
    reader.readAsDataURL(file);
};

window.previewLogo = function(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { showMessage("⚠️ الشعار كبير جداً (أقصى 2MB)"); return; }
    const reader = new FileReader();
    reader.onload = function(ev) {
        uploadedLogo = ev.target.result;
        document.getElementById('logoPreviewImg').src = uploadedLogo;
        document.getElementById('logoPreview').classList.remove('hidden');
        document.getElementById('logoUploadPlaceholder').innerHTML = '📁 تغيير الشعار';
    };
    reader.readAsDataURL(file);
};

window.previewLoginLogo = function(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { showMessage("⚠️ الشعار كبير جداً (أقصى 2MB)"); return; }
    const reader = new FileReader();
    reader.onload = function(ev) {
        uploadedLoginLogo = ev.target.result;
        document.getElementById('loginLogoPreviewImg').src = uploadedLoginLogo;
        document.getElementById('loginLogoPreview').classList.remove('hidden');
        document.getElementById('loginLogoUploadPlaceholder').innerHTML = '📁 تغيير الشعار';
    };
    reader.readAsDataURL(file);
};

window.removeHeroImage = function() {
    uploadedHeroImage = "";
    document.getElementById('heroImagePreview').classList.add('hidden');
    document.getElementById('heroPreviewImg').src = "";
    document.getElementById('heroUploadPlaceholder').innerHTML = '📁 اضغط لرفع صورة الزجاجة';
};

window.addSlideshowImages = function(e) {
    const files = e.target.files;
    for (const file of files) {
        if (slideshowImages.length >= 5) { showMessage("⚠️ أقصى عدد 5 صور"); break; }
        if (file.size > 5 * 1024 * 1024) continue;
        const reader = new FileReader();
        reader.onload = function(ev) {
            slideshowImages.push(ev.target.result);
            renderSlideshowAdmin();
        };
        reader.readAsDataURL(file);
    }
    e.target.value = '';
};

function renderSlideshowAdmin() {
    const container = document.getElementById('slideshowImagesContainer');
    if (!container) return;
    container.innerHTML = slideshowImages.map((img, i) => `
        <div class="relative w-24 h-24 rounded-lg overflow-hidden border border-stone-200 group flex-shrink-0">
            <img src="${img}" class="w-full h-full object-cover">
            <button onclick="removeSlideshowImage(${i})" class="absolute top-1 left-1 w-5 h-5 bg-red-600 text-white rounded-full text-[10px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition hover:bg-red-700">✕</button>
            <span class="absolute bottom-1 right-1 text-[10px] bg-black/60 text-white px-1.5 rounded-full">${i+1}</span>
        </div>
    `).join('');
}

window.removeSlideshowImage = function(index) {
    slideshowImages.splice(index, 1);
    renderSlideshowAdmin();
};

window.previewBannerImage = function(index, e) {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { showMessage("⚠️ الصورة كبيرة جداً"); return; }
    const reader = new FileReader();
    reader.onload = function(ev) {
        uploadedBannerImages[index] = ev.target.result;
        const preview = document.getElementById(`bannerPreview${index}`);
        if (preview) { preview.src = ev.target.result; preview.classList.remove('hidden'); }
        const label = document.getElementById(`bannerUploadLabel${index}`);
        if (label) label.innerHTML = '📁 تغيير الصورة';
    };
    reader.readAsDataURL(file);
};

function renderBannersSettings() {
    const container = document.getElementById('bannersSettingsContainer');
    if (!container) return;
    const s = JSON.parse(localStorage.getItem('vora_settings')) || {};
    const banners = s.banners || [
        { tag: '🧬 جديد', title: 'أحدث العطور', subtitle: 'اكتشف تشكيلتنا الجديدة كلياً', link: 'shop.html', tagStyle: '' },
        { tag: '🔥 تخفيضات', title: 'عروض خاصة', subtitle: 'خصم يصل إلى 50% على تشكيلة محددة', link: 'shop.html', tagStyle: 'background:linear-gradient(135deg,#dc2626,#b91c1c);' },
        { tag: '🎁 هدايا', title: 'مجموعات الهدايا', subtitle: 'هدية فاخرة تناسب كل مناسبة', link: 'shop.html', tagStyle: '' }
    ];
    container.innerHTML = banners.map((b, i) => {
        const hasImg = uploadedBannerImages[i] || b.image;
        return `
        <div class="border border-stone-200 rounded-lg p-4 mb-3">
            <h4 class="font-bold text-stone-800 text-sm mb-3">البانر ${i+1}</h4>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                    <label class="block text-xs font-medium text-stone-600 mb-1">صورة الخلفية</label>
                    <div class="flex items-center gap-3">
                        <label class="flex-1 cursor-pointer">
                            <input type="file" accept="image/*" class="hidden" onchange="previewBannerImage(${i}, event)">
                            <div id="bannerUploadLabel${i}" class="w-full px-3 py-2 border-2 border-dashed border-stone-300 rounded-lg text-center text-xs text-stone-400 hover:border-amber-500 hover:text-amber-600 transition">${hasImg ? '📁 تغيير الصورة' : '📁 رفع صورة'}</div>
                        </label>
                        <img id="bannerPreview${i}" src="${hasImg ? (uploadedBannerImages[i] || b.image) : ''}" class="${hasImg ? '' : 'hidden'} w-14 h-14 rounded-lg object-cover border border-stone-200 flex-shrink-0">
                    </div>
                </div>
                <div>
                    <label class="block text-xs font-medium text-stone-600 mb-1">نص الوسم (Tag)</label>
                    <input type="text" id="bannerTag${i}" value="${b.tag || ''}" class="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm" placeholder="🧬 جديد">
                </div>
                <div>
                    <label class="block text-xs font-medium text-stone-600 mb-1">العنوان</label>
                    <input type="text" id="bannerTitle${i}" value="${b.title || ''}" class="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm" placeholder="أحدث العطور">
                </div>
                <div>
                    <label class="block text-xs font-medium text-stone-600 mb-1">النص الفرعي</label>
                    <input type="text" id="bannerSubtitle${i}" value="${b.subtitle || ''}" class="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm" placeholder="اكتشف تشكيلتنا الجديدة">
                </div>
                <div>
                    <label class="block text-xs font-medium text-stone-600 mb-1">الرابط (عند الضغط)</label>
                    <input type="text" id="bannerLink${i}" value="${b.link || 'shop.html'}" class="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm" placeholder="shop.html">
                </div>
                <div>
                    <label class="block text-xs font-medium text-stone-600 mb-1">نمط الوسم CSS (اختياري)</label>
                    <input type="text" id="bannerTagStyle${i}" value="${b.tagStyle || ''}" class="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm" placeholder="background:linear-gradient(135deg,#dc2626,#b91c1c);">
                </div>
            </div>
        </div>`;
    }).join('');
}

document.addEventListener("DOMContentLoaded", async () => {
    await loadAdminOrders();
    await loadSettings();
    initShippingRates();
    initCodGrid();
    initCoupons();
    initBundles();
    initBrands();
});

window.switchTab = function(tabId) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
    const target = document.getElementById(tabId);
    target.classList.remove('hidden');
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('font-bold', 'text-amber-600', 'border-b-2', 'border-amber-600');
        btn.classList.add('font-medium', 'text-stone-500');
    });
    const activeBtn = document.getElementById(`btn-${tabId}`);
    activeBtn.classList.remove('font-medium', 'text-stone-500');
    activeBtn.classList.add('font-bold', 'text-amber-600', 'border-b-2', 'border-amber-600');
    if (tabId === 'products-tab') loadProductList();
};

async function loadAdminOrders() {
    const tbody = document.getElementById('adminOrdersTable');
    try {
        const orders = await getOrders();
        tbody.innerHTML = "";
        if (orders.length === 0) {
            tbody.innerHTML = `<tr><td colspan="10" class="p-8 text-center text-stone-400">لا توجد طلبات حتى الآن.</td></tr>`;
            return;
        }
        orders.forEach(order => {
            const row = document.createElement('tr');
            row.className = "border-b border-stone-100 hover:bg-stone-50";
            row.innerHTML = `
                <td class="p-3 font-mono text-[10px] text-stone-400">${order.orderId || '—'}</td>
                <td class="p-3 text-stone-500 text-xs whitespace-nowrap">${order.date || ''}</td>
                <td class="p-3 font-semibold text-stone-900 text-xs">${order.customerName}</td>
                <td class="p-3 text-stone-600 text-xs" dir="ltr">${order.customerPhone}</td>
                <td class="p-3 text-stone-600 text-xs max-w-[120px] truncate" title="${order.items}">${order.items}</td>
                <td class="p-3 font-bold text-amber-600 text-xs">${order.total} EGP</td>
                <td class="p-3">
                    <button onclick="showOrderDetails('${order.orderId}')" class="text-[10px] text-amber-600 hover:text-amber-800 font-semibold">📦 تفاصيل</button>
                </td>
                <td class="p-3">
                    <select onchange="updateOrderField('${order.orderId}','status',this.value)" class="text-xs border border-stone-200 rounded px-2 py-1 bg-white">
                        <option value="قيد المراجعة" ${order.status === 'قيد المراجعة' ? 'selected' : ''}>قيد المراجعة</option>
                        <option value="قيد التجهيز" ${order.status === 'قيد التجهيز' ? 'selected' : ''}>قيد التجهيز</option>
                        <option value="تم الشحن" ${order.status === 'تم الشحن' ? 'selected' : ''}>تم الشحن</option>
                        <option value="تم التسليم" ${order.status === 'تم التسليم' ? 'selected' : ''}>تم التسليم</option>
                        <option value="ملغي" ${order.status === 'ملغي' ? 'selected' : ''}>ملغي</option>
                    </select>
                </td>
                <td class="p-3">
                    <input type="text" value="${order.trackingId || ''}" placeholder="رقم التتبع" onchange="updateOrderField('${order.orderId}','trackingId',this.value)" class="text-xs border border-stone-200 rounded px-2 py-1 w-20 bg-white">
                </td>
                <td class="p-3">
                    <button onclick="copyTrackingLink('${order.orderId}')" class="text-[10px] text-blue-600 hover:text-blue-800 font-semibold">📋 نسخ</button>
                </td>
            `;
            tbody.appendChild(row);
        });
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="10" class="p-8 text-center text-red-500">حدث خطأ أثناء تحميل الطلبات.</td></tr>`;
    }
}

window.updateOrderField = function(orderId, field, value) {
    let orders = JSON.parse(localStorage.getItem('vora_orders')) || [];
    const idx = orders.findIndex(o => o.orderId === orderId);
    if (idx === -1) return;
    orders[idx][field] = value;
    localStorage.setItem('vora_orders', JSON.stringify(orders));
    // Sync to Firestore so tracking page gets the update
    try {
        const id = orders[idx].id;
        if (id) {
            const orderRef = doc(db, "orders", id);
            updateDoc(orderRef, { [field]: value });
        }
    } catch (e) { console.warn('Firestore sync failed (offline):', e); }
    showMessage('✅ تم التحديث');
};

window.copyTrackingLink = function(orderId) {
    const link = window.location.origin + '/tracking.html?orderId=' + orderId;
    navigator.clipboard.writeText(link).then(() => showMessage('✅ تم نسخ رابط التتبع'));
};

window.showOrderDetails = function(orderId) {
    const orders = JSON.parse(localStorage.getItem('vora_orders')) || [];
    const order = orders.find(o => o.orderId === orderId);
    if (!order) { showMessage('⚠️ الطلب غير موجود'); return; }
    let itemsHtml = '';
    let items = [];
    try { items = order.itemDetails ? JSON.parse(order.itemDetails) : []; } catch(e) {}
    if (items.length > 0) {
        items.forEach((item, i) => {
            itemsHtml += `<div class="flex justify-between items-center py-2 border-b border-stone-100 last:border-0">
                <div><span class="font-semibold text-stone-900">${item.name}</span> <span class="text-stone-500 text-sm">×${item.qty}</span></div>
                <span class="font-bold text-amber-600">${item.price * item.qty} ج.م</span>
            </div>`;
        });
    } else {
        itemsHtml = `<p class="text-stone-500 text-sm">${order.items || '—'}</p>`;
    }
    document.getElementById('orderDetailsBody').innerHTML = `
        <div class="space-y-2 text-sm">
            <div class="flex justify-between"><span class="text-stone-500">رقم الطلب:</span><span class="font-mono text-stone-900">${order.orderId}</span></div>
            <div class="flex justify-between"><span class="text-stone-500">العميل:</span><span class="text-stone-900">${order.customerName}</span></div>
            <div class="flex justify-between"><span class="text-stone-500">الهاتف:</span><span class="text-stone-900">${order.customerPhone}</span></div>
            <div class="flex justify-between"><span class="text-stone-500">العنوان:</span><span class="text-stone-900">${order.customerAddress}</span></div>
            <div class="flex justify-between"><span class="text-stone-500">المحافظة:</span><span class="text-stone-900">${order.governorate || '—'}</span></div>
            <div class="flex justify-between"><span class="text-stone-500">تاريخ الطلب:</span><span class="text-stone-900">${order.date || '—'}</span></div>
            <div class="flex justify-between"><span class="text-stone-500">الحالة:</span><span class="text-stone-900">${order.status}</span></div>
        </div>
        <div class="border-t border-stone-200 pt-4">
            <h4 class="font-bold text-stone-900 mb-2">المنتجات</h4>
            ${itemsHtml}
        </div>
        <div class="border-t border-stone-200 pt-4 flex justify-between font-bold text-lg">
            <span>الإجمالي:</span>
            <span class="text-amber-600">${order.total} ج.م</span>
        </div>`;
    document.getElementById('orderDetailsModal').classList.remove('hidden');
};
window.closeOrderDetails = function() {
    document.getElementById('orderDetailsModal').classList.add('hidden');
};

// معاينة محلية ذكية وسريعة للصورة المحددة للمنتج
window.previewImage = function(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
        showMessage("⚠️ الصورة كبيرة جداً. أقصى حجم 10 ميجابايت.");
        return;
    }
    window.selectedProductFile = file; // تخزين الملف مؤقتاً لرفعه عند الحفظ
    document.getElementById('previewImg').src = URL.createObjectURL(file);
    document.getElementById('imagePreview').classList.remove('hidden');
    document.getElementById('uploadPlaceholder').innerHTML = '📁 تغيير الصورة';
};

window.saveProduct = async function() {
    const name = document.getElementById('prodName').value.trim();
    const size = document.getElementById('prodSize').value;
    const price = parseFloat(document.getElementById('prodPrice').value);
    const stock = parseInt(document.getElementById('prodStock').value) || 0;
    const discountPercent = parseFloat(document.getElementById('prodDiscountPercent').value) || 0;
    const description = document.getElementById('prodDesc').value.trim();
    const vendor = document.getElementById('prodVendor').value.trim();
    const gender = document.getElementById('prodGender').value;
    const additionalInfo = document.getElementById('prodAdditionalInfo').value.trim();
    
    const sections = [];
    if (document.getElementById('sct_bestSellers').checked) sections.push('best-sellers');
    if (document.getElementById('sct_forHim').checked) sections.push('for-him');
    if (document.getElementById('sct_forHer').checked) sections.push('for-her');
    if (document.getElementById('sct_unisex').checked) sections.push('unisex');
    if (document.getElementById('sct_newArrivals').checked) sections.push('new-arrivals');
    
    if (!name || !price) return showMessage("يرجى ملء الاسم والسعر");

    let originalPrice = null;
    if (discountPercent > 0) {
        originalPrice = Math.round(price / (1 - discountPercent / 100));
    } else {
        const raw = document.getElementById('prodOriginalPrice').value;
        if (raw) originalPrice = parseFloat(raw);
    }

    showMessage("جاري رفع الصورة للمخزن السحابي وحفظ البيانات...");
    
    try {
        let finalImageUrl = uploadedImageData;

        // إذا كان هناك ملف صورة جديد تم اختياره، نرفعه سحابياً أولاً
        if (window.selectedProductFile) {
            finalImageUrl = await uploadImageToStorage(window.selectedProductFile);
        }

        const prodData = {
            name, size, price, stock, description,
            image: finalImageUrl,
            originalPrice: originalPrice || "",
            discount: !!(originalPrice || discountPercent > 0),
            discountPercent: discountPercent,
            sections: sections,
            rating: 5, ratingCount: 1,
            vendor, gender, additionalInfo
        };

        let response;
        if (editingProductId) {
            response = await updateProduct(editingProductId, prodData);
        } else { 
            response = await addProduct(prodData);
        }
        
        if (response.success) {
            showMessage(editingProductId ? `✅ تم تحديث "${name}" بنجاح!` : `✅ تم إضافة "${name}" بنجاح!`);
            clearForm();
            loadProductList();
        } else showMessage(`خطأ: ${response.error}`);
    } catch (err) { 
        showMessage("❌ فشل رفع وحفظ المنتج السحابي."); 
    }
};

window.editProduct = async function(id) {
    const products = await getProducts();
    const prod = products.find(p => p.id === id);
    if (!prod) return showMessage("المنتج غير موجود");

    editingProductId = id; 
    document.getElementById('prodName').value = prod.name || '';
    if (prod.size) document.getElementById('prodSize').value = prod.size;
    document.getElementById('prodPrice').value = prod.price || '';
    document.getElementById('prodOriginalPrice').value = prod.originalPrice || '';
    document.getElementById('prodStock').value = prod.stock ?? 50;
    document.getElementById('prodDiscountPercent').value = prod.discountPercent || '';
    document.getElementById('prodDesc').value = prod.description || '';
    document.getElementById('prodVendor').value = prod.vendor || '';
    if (prod.gender) document.getElementById('prodGender').value = prod.gender;
    document.getElementById('prodAdditionalInfo').value = prod.additionalInfo || '';
    
    // Populate section checkboxes
    const prodSections = prod.sections || [];
    document.getElementById('sct_bestSellers').checked = prodSections.includes('best-sellers');
    document.getElementById('sct_forHim').checked = prodSections.includes('for-him');
    document.getElementById('sct_forHer').checked = prodSections.includes('for-her');
    document.getElementById('sct_unisex').checked = prodSections.includes('unisex');
    document.getElementById('sct_newArrivals').checked = prodSections.includes('new-arrivals');
    
    document.getElementById('formTitle').textContent = '✏️ تعديل العطر';

    window.selectedProductFile = null;
    if (prod.image) {
        uploadedImageData = prod.image;
        document.getElementById('previewImg').src = prod.image;
        document.getElementById('imagePreview').classList.remove('hidden');
        document.getElementById('uploadPlaceholder').innerHTML = '📁 تغيير الصورة';
    }

    document.getElementById('saveProductBtn').innerHTML = '💾 تحديث العطر';
    document.getElementById('cancelEditBtn').classList.remove('hidden');
    document.getElementById('prodName').scrollIntoView({ behavior: 'smooth', block: 'center' });
};

window.cancelEdit = function() {
    clearForm();
};

window.duplicateProduct = async function(id) {
    const products = await getProducts();
    const prod = products.find(p => p.id === id);
    if (!prod) return showMessage("المنتج غير موجود");
    
    const copy = { 
        ...prod, 
        name: prod.name + " (نسخة)" 
    };
    delete copy.id; 

    try {
        const response = await addProduct(copy);
        if (response.success) {
            showMessage(`✅ تم نسخ "${prod.name}" بنجاح`);
            loadProductList();
        } else showMessage(`خطأ: ${response.error}`);
    } catch (err) { showMessage("فشل الاتصال."); }
};

window.deleteProduct = async function(id) {
    if (!confirm("هل أنت متأكد من حذف هذا العطر؟")) return;
    const products = await getProducts();
    const prod = products.find(p => p.id === id);
    showMessage("جاري الحذف...");
    try {
        const response = await deleteProductFromService(id);
        if (response.success) {
            showMessage(`✅ تم حذف "${prod?.name || id}" بنجاح`);
            loadProductList();
            if (editingProductId === id) clearForm();
        } else showMessage(`خطأ: ${response.error}`);
    } catch (err) { showMessage("فشل الاتصال."); }
};

function clearForm() {
    editingProductId = null;
    uploadedImageData = "";
    window.selectedProductFile = null;
    ['prodName', 'prodPrice', 'prodDesc', 'prodOriginalPrice', 'prodDiscountPercent', 'prodStock', 'prodVendor', 'prodAdditionalInfo'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = "";
    });
    document.getElementById('prodStock').value = "50";
    document.getElementById('prodSize').value = "50ml";
    document.getElementById('prodGender').value = "";
    document.getElementById('formTitle').textContent = '➕ إضافة عطر جديد';
    document.getElementById('saveProductBtn').innerHTML = '💾 حفظ العطر';
    document.getElementById('cancelEditBtn').classList.add('hidden');
    document.getElementById('imagePreview').classList.add('hidden');
    document.getElementById('uploadPlaceholder').innerHTML = '📁 اضغط لرفع صورة';
    document.getElementById('prodImageInput').value = "";
    document.getElementById('sct_bestSellers').checked = true;
    document.getElementById('sct_forHim').checked = false;
    document.getElementById('sct_forHer').checked = false;
    document.getElementById('sct_unisex').checked = false;
    document.getElementById('sct_newArrivals').checked = false;
}

async function loadProductList() {
    const container = document.getElementById('productList');
    const products = await getProducts();
    
    if (products.length === 0) {
        container.innerHTML = `<p class="text-center text-stone-400 py-8 text-sm">لا توجد منتجات بعد. أضف أول عطر!</p>`;
        return;
    }
    container.innerHTML = products.map(prod => {
        const img = prod.image ? `<img src="${prod.image}" class="w-10 h-10 rounded object-cover border border-stone-200">` : `<div class="w-10 h-10 rounded bg-stone-100 flex items-center justify-center text-amber-600 text-xs">🧴</div>`;
        const stock = prod.stock ?? '—';
        const stockClass = stock === 0 ? 'text-red-600' : (stock <= 5 ? 'text-orange-500' : 'text-green-600');
        const discountBadge = prod.discount && prod.discountPercent ? `<span class="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full font-bold">-${prod.discountPercent}%</span>` : '';
        
        return `
        <div class="flex items-center gap-3 p-3 rounded-lg border border-stone-100 hover:border-amber-200 hover:bg-amber-50/30 transition group">
            ${img}
            <div class="flex-1 min-w-0">
                <p class="text-sm font-bold text-stone-900 truncate">${prod.name} ${discountBadge}</p>
                <p class="text-xs text-stone-400">${prod.category || '—'} • ${prod.price} EGP • <span class="${stockClass} font-semibold">${stock === 0 ? 'نفد' : stock + ' قطع'}</span></p>
            </div>
            <div class="flex gap-1 opacity-0 group-hover:opacity-100 transition">
                <button onclick="editProduct('${prod.id}')" class="px-2.5 py-1.5 text-xs font-bold text-amber-600 hover:bg-amber-100 rounded transition" title="تعديل">✏️</button>
                <button onclick="duplicateProduct('${prod.id}')" class="px-2.5 py-1.5 text-xs font-bold text-blue-600 hover:bg-blue-50 rounded transition" title="نسخ">📋</button>
                <button onclick="deleteProduct('${prod.id}')" class="px-2.5 py-1.5 text-xs font-bold text-red-600 hover:bg-red-50 rounded transition" title="حذف">🗑️</button>
            </div>
        </div>`;
    }).join("");
}

async function loadSettings() {
    try {
        const cloud = await getSettingsFromFirestore();
        if (cloud) {
            localStorage.setItem('vora_settings', JSON.stringify(cloud));
            if (cloud.shipping) localStorage.setItem('vora_shipping', JSON.stringify(cloud.shipping));
            if (cloud.codGovernorates) localStorage.setItem('vora_cod_governorates', JSON.stringify(cloud.codGovernorates));
        }
    } catch (e) {
        console.warn("Could not load settings from Firestore:", e);
    }
    const s = JSON.parse(localStorage.getItem('vora_settings')) || {};
    if (s.instaName) document.getElementById('set_instaName').value = s.instaName;
    if (s.instaNumber) document.getElementById('set_instaNumber').value = s.instaNumber;
    if (s.instaNote) document.getElementById('set_instaNote').value = s.instaNote;
    if (s.whatsapp) document.getElementById('set_whatsapp').value = s.whatsapp;
    if (s.email) document.getElementById('set_email').value = s.email;
    if (s.instagram) document.getElementById('set_instagram').value = s.instagram;
    if (s.loginTitle) document.getElementById('set_loginTitle').value = s.loginTitle;
    
    if (s.heroBadge) document.getElementById('hero_badge').value = s.heroBadge;
    if (s.heroTitle) document.getElementById('hero_title').value = s.heroTitle;
    if (s.heroSubtitleAr) document.getElementById('hero_subtitle_ar').value = s.heroSubtitleAr;
    if (s.heroSubtitleEn) document.getElementById('hero_subtitle_en').value = s.heroSubtitleEn;
    if (s.returnPolicyAr) document.getElementById('set_returnPolicyAr').value = s.returnPolicyAr;
    if (s.returnPolicyEn) document.getElementById('set_returnPolicyEn').value = s.returnPolicyEn;
    if (s.heroImage) {
        uploadedHeroImage = s.heroImage;
        document.getElementById('heroPreviewImg').src = s.heroImage;
        document.getElementById('heroImagePreview').classList.remove('hidden');
        document.getElementById('heroUploadPlaceholder').innerHTML = '📁 تغيير الصورة';
    }
    
    if (s.logo) {
        uploadedLogo = s.logo;
        document.getElementById('logoPreviewImg').src = s.logo;
        document.getElementById('logoPreview').classList.remove('hidden');
        document.getElementById('logoUploadPlaceholder').innerHTML = '📁 تغيير الشعار';
    }

    if (s.loginLogo) {
        uploadedLoginLogo = s.loginLogo;
        document.getElementById('loginLogoPreviewImg').src = s.loginLogo;
        document.getElementById('loginLogoPreview').classList.remove('hidden');
        document.getElementById('loginLogoUploadPlaceholder').innerHTML = '📁 تغيير الشعار';
    }
    
    if (s.slideshowImages) slideshowImages = s.slideshowImages;
    renderSlideshowAdmin();
    
    if (s.banners) {
        s.banners.forEach((b, i) => {
            if (b.image) uploadedBannerImages[i] = b.image;
        });
    }
    renderBannersSettings();
}

function initShippingRates() {
    const grid = document.getElementById('shippingRatesGrid');
    const rates = JSON.parse(localStorage.getItem('vora_shipping')) || DEFAULT_SHIPPING;
    grid.innerHTML = ALL_GOVERNORATES.map(gov => `
        <div class="flex items-center gap-2 bg-stone-50 rounded-lg p-2">
            <span class="text-xs text-stone-600 w-20 truncate">${gov}</span>
            <input type="number" id="ship_${gov}" value="${rates[gov] || 0}" min="0" class="w-full px-2 py-1 border border-stone-300 rounded text-xs text-center">
        </div>
    `).join("");
}

function initCodGrid() {
    const grid = document.getElementById('codGrid');
    const codGovs = JSON.parse(localStorage.getItem('vora_cod_governorates')) || ["القاهرة", "الجيزة", "الإسكندرية"];
    grid.innerHTML = ALL_GOVERNORATES.map(gov => `
        <label class="flex items-center gap-2 p-2 bg-stone-50 rounded-lg cursor-pointer hover:bg-amber-50 transition">
            <input type="checkbox" id="cod_${gov}" value="${gov}" ${codGovs.includes(gov) ? 'checked' : ''} class="w-4 h-4 text-amber-600">
            <span class="text-xs text-stone-600">${gov}</span>
        </label>
    `).join("");
}

function initCoupons() {
    const s = JSON.parse(localStorage.getItem('vora_settings')) || {};
    window._couponData = s.coupons || {};
    renderCoupons();
}

function renderCoupons() {
    const container = document.getElementById('couponsContainer');
    if (!container) return;
    const coupons = window._couponData || {};
    const entries = Object.entries(coupons);
    if (entries.length === 0) {
        container.innerHTML = '<p class="text-xs text-stone-400 text-center py-4">لا توجد أكواد خصم مضافة</p>';
        return;
    }
    container.innerHTML = entries.map(([code, discount], i) => `
        <div class="flex items-center gap-2">
            <input type="text" value="${code}" id="coupon_code_${i}" class="flex-1 px-3 py-2 border border-stone-300 rounded-lg text-sm text-center font-bold uppercase" placeholder="الكود" dir="ltr">
            <input type="number" value="${discount}" id="coupon_discount_${i}" class="w-20 px-3 py-2 border border-stone-300 rounded-lg text-sm text-center" placeholder="%" min="0" max="100">
            <span class="text-xs text-stone-400">%</span>
            <button onclick="removeCoupon(${i})" class="text-red-500 hover:text-red-700 px-2">✕</button>
        </div>
    `).join('');
}

window.addCouponField = function() {
    const coupons = window._couponData || {};
    const key = 'NEWCODE' + (Object.keys(coupons).length + 1);
    coupons[key] = 10;
    window._couponData = coupons;
    renderCoupons();
};

window.removeCoupon = function(index) {
    const coupons = window._couponData || {};
    const entries = Object.entries(coupons);
    if (entries[index]) delete coupons[entries[index][0]];
    window._couponData = coupons;
    renderCoupons();
};

function initBundles() {
    const s = JSON.parse(localStorage.getItem('vora_settings')) || {};
    window._bundleData = s.bundles || [];
    renderBundles();
}

function renderBundles() {
    const container = document.getElementById('bundlesContainer');
    if (!container) return;
    const bundles = window._bundleData || [];
    if (bundles.length === 0) {
        container.innerHTML = '<p class="text-xs text-stone-400 text-center py-4">لا توجد عروض حزم مضافة</p>';
        return;
    }
    container.innerHTML = bundles.map((b, i) => `
        <div class="border border-stone-200 rounded-lg p-3 space-y-2">
            <div class="flex items-center justify-between">
                <span class="text-xs font-bold text-stone-700">عرض ${i + 1}</span>
                <button onclick="removeBundle(${i})" class="text-red-500 hover:text-red-700 text-xs px-2">✕ حذف</button>
            </div>
            <div class="grid grid-cols-2 gap-2">
                <input type="text" value="${b.name || ''}" id="bundle_name_${i}" class="px-3 py-2 border border-stone-300 rounded-lg text-sm" placeholder="اسم العرض">
                <input type="number" value="${b.price || ''}" id="bundle_price_${i}" class="px-3 py-2 border border-stone-300 rounded-lg text-sm" placeholder="السعر">
            </div>
            <input type="text" value="${(b.products || []).join(',')}" id="bundle_products_${i}" class="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm" placeholder="معرفات المنتجات (مفصولة بفواصل)">
            <textarea id="bundle_desc_${i}" class="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm h-16 resize-none" placeholder="وصف العرض">${b.description || ''}</textarea>
        </div>
    `).join('');
}

window.addBundleField = function() {
    const bundles = window._bundleData || [];
    bundles.push({ name: '', price: '', products: [], description: '' });
    window._bundleData = bundles;
    renderBundles();
};

window.removeBundle = function(index) {
    const bundles = window._bundleData || [];
    bundles.splice(index, 1);
    window._bundleData = bundles;
    renderBundles();
};

// Brand Images Management
function initBrands() {
    const s = JSON.parse(localStorage.getItem('vora_settings')) || {};
    window._brandData = s.brands || [];
    renderBrands();
}

function renderBrands() {
    const container = document.getElementById('brandsContainer');
    if (!container) return;
    const brands = window._brandData || [];
    if (brands.length === 0) {
        container.innerHTML = '<p class="text-xs text-stone-400 text-center py-4">لا توجد براندات مضافة</p>';
        return;
    }
    container.innerHTML = brands.map((b, i) => `
        <div class="border border-stone-200 rounded-lg p-3 space-y-2">
            <div class="flex items-center justify-between">
                <span class="text-xs font-bold text-stone-700">براند ${i + 1}</span>
                <button onclick="removeBrand(${i})" class="text-red-500 hover:text-red-700 text-xs px-2">✕ حذف</button>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input type="text" value="${b.name || ''}" id="brand_name_${i}" class="px-3 py-2 border border-stone-300 rounded-lg text-sm" placeholder="اسم البراند (مثال: Dior)">
                <div class="flex items-center gap-2">
                    <input type="file" accept="image/*" class="hidden" id="brand_file_${i}" onchange="previewBrandImage(${i}, this)">
                    <button onclick="document.getElementById('brand_file_${i}').click()" class="px-3 py-2 border border-stone-300 rounded-lg text-sm text-stone-500 hover:text-amber-600 hover:border-amber-500 transition">📷 اختيار صورة</button>
                    ${b.image ? `<img src="${b.image}" class="w-10 h-10 rounded object-cover border">` : ''}
                    <input type="hidden" id="brand_image_${i}" value="${b.image || ''}">
                </div>
            </div>
        </div>
    `).join('');
}

window.previewBrandImage = function(index, input) {
    const file = input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        const dataUrl = e.target.result;
        document.getElementById('brand_image_' + index).value = dataUrl;
        const brands = window._brandData || [];
        while (brands.length <= index) brands.push({ name: '', image: '' });
        brands[index].image = dataUrl;
        window._brandData = brands;
        renderBrands();
    };
    reader.readAsDataURL(file);
};

window.addBrandField = function() {
    const brands = window._brandData || [];
    brands.push({ name: '', image: '' });
    window._brandData = brands;
    renderBrands();
};

window.removeBrand = function(index) {
    const brands = window._brandData || [];
    brands.splice(index, 1);
    window._brandData = brands;
    renderBrands();
};

window.saveSettings = async function() {
    const settings = {
        instaName: document.getElementById('set_instaName').value.trim(),
        instaNumber: document.getElementById('set_instaNumber').value.trim(),
        instaNote: document.getElementById('set_instaNote').value.trim(),
        whatsapp: document.getElementById('set_whatsapp').value.trim(),
        email: document.getElementById('set_email').value.trim(),
        instagram: document.getElementById('set_instagram').value.trim(),
        loginTitle: document.getElementById('set_loginTitle').value.trim(),
        heroBadge: document.getElementById('hero_badge').value.trim(),
        heroTitle: document.getElementById('hero_title').value.trim(),
        heroSubtitleAr: document.getElementById('hero_subtitle_ar').value.trim(),
        heroSubtitleEn: document.getElementById('hero_subtitle_en').value.trim(),
        heroImage: uploadedHeroImage,
        logo: uploadedLogo,
        loginLogo: uploadedLoginLogo,
        returnPolicyAr: document.getElementById('set_returnPolicyAr').value.trim(),
        returnPolicyEn: document.getElementById('set_returnPolicyEn').value.trim(),
        slideshowImages: slideshowImages,
        banners: [0,1,2].map(i => ({
            image: uploadedBannerImages[i] || '',
            tag: document.getElementById(`bannerTag${i}`)?.value.trim() || '',
            title: document.getElementById(`bannerTitle${i}`)?.value.trim() || '',
            subtitle: document.getElementById(`bannerSubtitle${i}`)?.value.trim() || '',
            link: document.getElementById(`bannerLink${i}`)?.value.trim() || 'shop.html',
            tagStyle: document.getElementById(`bannerTagStyle${i}`)?.value.trim() || ''
        }))
    };

    // Collect coupons
    const couponInputs = document.querySelectorAll('#couponsContainer input');
    const coupons = {};
    for (let i = 0; i < couponInputs.length; i += 2) {
        const code = couponInputs[i].value.trim().toUpperCase();
        const disc = parseFloat(couponInputs[i+1].value) || 0;
        if (code && disc > 0) coupons[code] = disc;
    }
    settings.coupons = coupons;

    // Collect bundles
    const bundleNames = document.querySelectorAll('[id^="bundle_name_"]');
    const bundles = [];
    bundleNames.forEach((el, i) => {
        const name = el.value.trim();
        const price = parseFloat(document.getElementById(`bundle_price_${i}`)?.value) || 0;
        const productsStr = document.getElementById(`bundle_products_${i}`)?.value || '';
        const products = productsStr.split(',').map(s => s.trim()).filter(Boolean);
        const description = document.getElementById(`bundle_desc_${i}`)?.value.trim() || '';
        if (name && price > 0 && products.length > 0) {
            bundles.push({ name, price, products, description });
        }
    });
    settings.bundles = bundles;

    // Collect brands
    const brandNames = document.querySelectorAll('[id^="brand_name_"]');
    const brands = [];
    brandNames.forEach((el, i) => {
        const name = el.value.trim();
        const image = document.getElementById(`brand_image_${i}`)?.value || '';
        if (name) {
            brands.push({ name, image });
        }
    });
    settings.brands = brands;

    localStorage.setItem('vora_settings', JSON.stringify(settings));
    const shipping = {};
    ALL_GOVERNORATES.forEach(gov => {
        const val = parseInt(document.getElementById(`ship_${gov}`).value);
        if (!isNaN(val) && val > 0) shipping[gov] = val;
    });
    localStorage.setItem('vora_shipping', JSON.stringify(Object.keys(shipping).length > 0 ? shipping : DEFAULT_SHIPPING));
    const codGovs = [];
    ALL_GOVERNORATES.forEach(gov => {
        const cb = document.getElementById(`cod_${gov}`);
        if (cb && cb.checked) codGovs.push(gov);
    });
    localStorage.setItem('vora_cod_governorates', JSON.stringify(codGovs));

    try {
        await saveSettingsToFirestore({
            ...settings,
            shipping,
            codGovernorates: codGovs,
            updatedAt: new Date().toISOString()
        });
    } catch (e) {
        console.warn("Could not save settings to Firestore:", e);
    }

    showMessage("✅ تم حفظ جميع الإعدادات بنجاح!");
};

window.downloadBackup = function() {
    const products = JSON.parse(localStorage.getItem('vora_products')) || [];
    const settings = JSON.parse(localStorage.getItem('vora_settings')) || {};
    const data = {
        products: products,
        settings: settings
    };
    const jsContent = `// VORA Fallback Data - تم التصدير في ${new Date().toLocaleDateString('ar-EG')}
window.__FALLBACK_PRODUCTS = ${JSON.stringify(products, null, 2)};

window.__FALLBACK_SETTINGS = ${JSON.stringify(settings, null, 2)};
`;
    const blob = new Blob([jsContent], { type: 'application/javascript' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'fallback-data.js';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showMessage('✅ تم تحميل ملف النسخة الاحتياطية! ارفعه على GitHub مع الموقع.');
};

window.hideMessage = hideMessage;
