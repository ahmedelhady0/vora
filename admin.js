import { getProducts, getOrders, addProduct, updateProduct, deleteProduct as deleteProductFromService } from "./sheets-service.js";
import { showMessage, hideMessage } from "./firebase-config.js";

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

let editingProductId = null; // سيخزن الآن الـ Firestore ID النصي عند التعديل
let uploadedImageData = "";
let uploadedHeroImage = "";
let uploadedLogo = "";
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

document.addEventListener("DOMContentLoaded", () => {
    loadAdminOrders();
    loadSettings();
    initShippingRates();
    initCodGrid();
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
            tbody.innerHTML = `<tr><td colspan="6" class="p-8 text-center text-stone-400">لا توجد طلبات حتى الآن.</td></tr>`;
            return;
        }
        orders.forEach(order => {
            const row = document.createElement('tr');
            row.className = "border-b border-stone-100 hover:bg-stone-50";
            row.innerHTML = `
                <td class="p-3 text-stone-500 text-xs">${order.date || ''}</td>
                <td class="p-3 font-semibold text-stone-900">${order.customerName}</td>
                <td class="p-3 text-stone-600" dir="ltr">${order.customerPhone}</td>
                <td class="p-3 text-stone-600 text-xs max-w-xs truncate" title="${order.items}">${order.items}</td>
                <td class="p-3 font-bold text-amber-600">${order.total} EGP</td>
                <td class="p-3"><span class="px-2 py-1 text-xs font-bold rounded-full bg-amber-100 text-amber-800">${order.status || 'قيد المراجعة'}</span></td>
            `;
            tbody.appendChild(row);
        });
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="6" class="p-8 text-center text-red-500">حدث خطأ أثناء تحميل الطلبات.</td></tr>`;
    }
}

window.previewImage = function(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
        showMessage("⚠️ الصورة كبيرة جداً. أقصى حجم 5 ميجابايت.");
        return;
    }
    const reader = new FileReader();
    reader.onload = function(ev) {
        uploadedImageData = ev.target.result;
        document.getElementById('previewImg').src = uploadedImageData;
        document.getElementById('imagePreview').classList.remove('hidden');
        document.getElementById('uploadPlaceholder').innerHTML = '📁 تغيير الصورة';
    };
    reader.readAsDataURL(file);
};

window.saveProduct = async function() {
    const name = document.getElementById('prodName').value.trim();
    const brand = document.getElementById('prodBrand').value.trim() || 'VORA';
    const category = document.getElementById('prodCategory').value.trim();
    const size = document.getElementById('prodSize').value;
    const price = parseFloat(document.getElementById('prodPrice').value);
    const stock = parseInt(document.getElementById('prodStock').value) || 0;
    const discountPercent = parseFloat(document.getElementById('prodDiscountPercent').value) || 0;
    const description = document.getElementById('prodDesc').value.trim();
    if (!name || !category || !price) return showMessage("يرجى ملء: الاسم، الفئة، والسعر");

    let originalPrice = null;
    if (discountPercent > 0) {
        originalPrice = Math.round(price / (1 - discountPercent / 100));
    } else {
        const raw = document.getElementById('prodOriginalPrice').value;
        if (raw) originalPrice = parseFloat(raw);
    }

    const prodData = {
        name, brand, category, size, price, stock, description,
        image: uploadedImageData,
        originalPrice: originalPrice || "",
        discount: discountPercent > 0 ? true : false,
        discountPercent: discountPercent,
        rating: 5, ratingCount: 1
    };

    showMessage("جاري الحفظ...");
    try {
        let response;
        if (editingProductId) {
            // 1. هنا يتم التحديث إذا كان هناك معرف تعديل
            response = await updateProduct(editingProductId, prodData);
        } else { 
            // 2. تم إضافة الـ else هنا لضمان عدم الدخول هنا إلا في حالة إضافة منتج جديد تماماً
            response = await addProduct(prodData);
        }
        
        if (response.success) {
            showMessage(editingProductId ? `✅ تم تحديث "${name}" بنجاح!` : `✅ تم إضافة "${name}" بنجاح!`);
            clearForm();
            loadProductList();
        } else showMessage(`خطأ: ${response.error}`);
    } catch (err) { showMessage("فشل الاتصال."); }
};

window.editProduct = async function(id) {
    // جلب المنتجات المحدثة القادمة من الفايرستور مباشرة لضمان العثور على الـ ID الصحيح
    const products = await getProducts();
    const prod = products.find(p => p.id === id);
    if (!prod) return showMessage("المنتج غير موجود");

    editingProductId = id; // تخزين معرّف الفايرستور (مثل: SlAKN1uYA...)
    document.getElementById('prodName').value = prod.name || '';
    document.getElementById('prodBrand').value = prod.brand || 'VORA';
    document.getElementById('prodCategory').value = prod.category || '';
    if (prod.size) document.getElementById('prodSize').value = prod.size;
    document.getElementById('prodPrice').value = prod.price || '';
    document.getElementById('prodOriginalPrice').value = prod.originalPrice || '';
    document.getElementById('prodStock').value = prod.stock ?? 50;
    document.getElementById('prodDiscountPercent').value = prod.discountPercent || '';
    document.getElementById('prodDesc').value = prod.description || '';
    document.getElementById('formTitle').textContent = '✏️ تعديل العطر';

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
    
    // إنشاء نسخة جديدة، وبدون إرسال id قديم ليتولى الفايرستور توليد ID جديد كلياً
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
    ['prodName', 'prodCategory', 'prodPrice', 'prodDesc', 'prodOriginalPrice', 'prodDiscountPercent', 'prodStock', 'prodBrand'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = "";
    });
    document.getElementById('prodStock').value = "50";
    document.getElementById('prodBrand').value = "VORA";
    document.getElementById('prodSize').value = "50ml";
    document.getElementById('formTitle').textContent = '➕ إضافة عطر جديد';
    document.getElementById('saveProductBtn').innerHTML = '💾 حفظ العطر';
    document.getElementById('cancelEditBtn').classList.add('hidden');
    document.getElementById('imagePreview').classList.add('hidden');
    document.getElementById('uploadPlaceholder').innerHTML = '📁 اضغط لرفع صورة';
    document.getElementById('prodImageInput').value = "";
}

async function loadProductList() {
    const container = document.getElementById('productList');
    const products = await getProducts();
    
    // حفظ النسخة المحدثة من الفايرستور محلياً لمزامنة البيانات الاحتياطية تلقائياً
    localStorage.setItem('vora_products', JSON.stringify(products));

    if (products.length === 0) {
        container.innerHTML = `<p class="text-center text-stone-400 py-8 text-sm">لا توجد منتجات بعد. أضف أول عطر!</p>`;
        return;
    }
    container.innerHTML = products.map(prod => {
        const img = prod.image ? `<img src="${prod.image}" class="w-10 h-10 rounded object-cover border border-stone-200">` : `<div class="w-10 h-10 rounded bg-stone-100 flex items-center justify-center text-amber-600 text-xs">🧴</div>`;
        const stock = prod.stock ?? '—';
        const stockClass = stock === 0 ? 'text-red-600' : (stock <= 5 ? 'text-orange-500' : 'text-green-600');
        const discountBadge = prod.discount && prod.discountPercent ? `<span class="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full font-bold">-${prod.discountPercent}%</span>` : '';
        
        // تمرير الـ id النصي الحقيقي والفريد لفايرستور داخل الأقواس في الأزرار
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

function loadSettings() {
    const s = JSON.parse(localStorage.getItem('vora_settings')) || {};
    if (s.instaName) document.getElementById('set_instaName').value = s.instaName;
    if (s.instaNumber) document.getElementById('set_instaNumber').value = s.instaNumber;
    if (s.instaNote) document.getElementById('set_instaNote').value = s.instaNote;
    if (s.whatsapp) document.getElementById('set_whatsapp').value = s.whatsapp;
    if (s.email) document.getElementById('set_email').value = s.email;
    if (s.instagram) document.getElementById('set_instagram').value = s.instagram;
    if (s.loginTitle) document.getElementById('set_loginTitle').value = s.loginTitle;
    // Hero settings
    if (s.heroBadge) document.getElementById('hero_badge').value = s.heroBadge;
    if (s.heroTitle) document.getElementById('hero_title').value = s.heroTitle;
    if (s.heroSubtitle) document.getElementById('hero_subtitle').value = s.heroSubtitle;
    if (s.heroImage) {
        uploadedHeroImage = s.heroImage;
        document.getElementById('heroPreviewImg').src = s.heroImage;
        document.getElementById('heroImagePreview').classList.remove('hidden');
        document.getElementById('heroUploadPlaceholder').innerHTML = '📁 تغيير الصورة';
    }
    // Logo
    if (s.logo) {
        uploadedLogo = s.logo;
        document.getElementById('logoPreviewImg').src = s.logo;
        document.getElementById('logoPreview').classList.remove('hidden');
        document.getElementById('logoUploadPlaceholder').innerHTML = '📁 تغيير الشعار';
    }
    // Slideshow
    if (s.slideshowImages) slideshowImages = s.slideshowImages;
    renderSlideshowAdmin();
    // Banners
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

window.saveSettings = function() {
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
        heroSubtitle: document.getElementById('hero_subtitle').value.trim(),
        heroImage: uploadedHeroImage,
        logo: uploadedLogo,
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

window.addNewProduct = async function(productData) {
    const result = await addProduct(productData);
    if(result.success) {
        showMessage("🔥 تم إضافة المنتج وحفظه في Firestore بنجاح!");
        if (typeof window.renderProducts === 'function') window.renderProducts();
    } else {
        showMessage("❌ فشل حفظ المنتج: " + result.error);
    }
};
