import Icon from './icons.js';
import { getProducts, getOrders, addProduct, updateProduct, uploadImageToStorage, getSettingsFromFirestore, saveSettingsToFirestore, getUserFromFirestore } from "./sheets-service.js";
import { showMessage, hideMessage, db } from "./firebase-config.js";
import { doc, updateDoc, setDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { escapeHTML } from "./security-utils.js";

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

let userData;
try { userData = JSON.parse(localStorage.getItem('vora_user')); } catch (e) { userData = null; }

if (userData && (userData.uid || userData.username)) {
    const lookup = userData.uid || userData.username;
    getUserFromFirestore(lookup).then(liveUser => {
        if (liveUser && liveUser.role !== 'admin' && liveUser.role !== 'manager') {
            localStorage.removeItem('vora_user');
            window.location.href = "home.html";
        } else if (!liveUser && userData.uid) {
            // Auto-create Firestore user doc with admin role for the current user
            setDoc(doc(db, "users", userData.uid), {
                uid: userData.uid,
                username: (userData.username || '').toLowerCase(),
                role: 'admin',
                email: userData.email || '',
                createdAt: new Date().toISOString()
            }).then(() => {
                userData.role = 'admin';
                localStorage.setItem('vora_user', JSON.stringify(userData));
            }).catch(() => {});
        }
    }).catch(() => {});
}

let editingProductId = null; 
let uploadedImageData = ""; // سيحتفظ برابط الصورة الحالي عند التعديل
window.selectedProductFile = null; // سيخزن كائن ملف الصورة المرفوع حالياً

let uploadedHeroImage = "";
let uploadedLogo = "";
let uploadedLoginLogo = "";
let slideshowImages = [];
let uploadedBannerImages = ["", "", ""];

window.previewHeroImage = async function(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { showMessage(t('adminImgTooLarge')); return; }
    const reader = new FileReader();
    reader.onload = function(ev) {
        document.getElementById('heroPreviewImg').src = ev.target.result;
        document.getElementById('heroImagePreview').classList.remove('hidden');
        document.getElementById('heroUploadPlaceholder').innerHTML = '⏳ جاري الرفع...';
    };
    reader.readAsDataURL(file);
    try {
        uploadedHeroImage = await uploadImageToStorage(file);
        document.getElementById('heroUploadPlaceholder').innerHTML = '📁 تغيير الصورة';
    } catch (err) {
        showMessage(t('adminUploadFailed'));
        document.getElementById('heroUploadPlaceholder').innerHTML = '📁 اضغط لرفع صورة الزجاجة';
    }
};

window.previewLogo = async function(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { showMessage(t('adminLogoTooLarge')); return; }
    const reader = new FileReader();
    reader.onload = function(ev) {
        document.getElementById('logoPreviewImg').src = ev.target.result;
        document.getElementById('logoPreview').classList.remove('hidden');
        document.getElementById('logoUploadPlaceholder').innerHTML = '⏳ جاري الرفع...';
    };
    reader.readAsDataURL(file);
    try {
        uploadedLogo = await uploadImageToStorage(file);
        document.getElementById('logoUploadPlaceholder').innerHTML = '📁 تغيير الشعار';
    } catch (err) {
        showMessage(t('adminLogoUploadFailed'));
    }
};

window.previewLoginLogo = async function(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { showMessage(t('adminLogoTooLarge')); return; }
    const reader = new FileReader();
    reader.onload = function(ev) {
        document.getElementById('loginLogoPreviewImg').src = ev.target.result;
        document.getElementById('loginLogoPreview').classList.remove('hidden');
        document.getElementById('loginLogoUploadPlaceholder').innerHTML = '⏳ جاري الرفع...';
    };
    reader.readAsDataURL(file);
    try {
        uploadedLoginLogo = await uploadImageToStorage(file);
        document.getElementById('loginLogoUploadPlaceholder').innerHTML = '📁 تغيير الشعار';
    } catch (err) {
        showMessage(t('adminLogoUploadFailed'));
    }
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
        if (slideshowImages.length >= 5) { showMessage(t('adminMax5Images')); break; }
        if (file.size > 5 * 1024 * 1024) continue;
        const slotIndex = slideshowImages.length;
        slideshowImages.push(null); // placeholder while uploading
        renderSlideshowAdmin();
        const reader = new FileReader();
        reader.onload = function(ev) {
            if (slideshowImages[slotIndex] === null) slideshowImages[slotIndex] = ev.target.result;
            renderSlideshowAdmin();
        };
        reader.readAsDataURL(file);
        uploadImageToStorage(file).then(url => {
            slideshowImages[slotIndex] = url;
            renderSlideshowAdmin();
        }).catch(() => {
            showMessage(t('adminImgUploadFailed'));
        });
    }
    e.target.value = '';
};

function renderSlideshowAdmin() {
    const container = document.getElementById('slideshowImagesContainer');
    if (!container) return;
    container.innerHTML = slideshowImages.map((img, i) => `
        <div class="relative w-24 h-24 rounded-lg overflow-hidden border border-stone-200 group flex-shrink-0 bg-stone-100 flex items-center justify-center">
            ${img ? `<img src="${img}" class="w-full h-full object-cover">` : `<span class="text-xs text-stone-400">⏳</span>`}
            <button onclick="removeSlideshowImage(${i})" class="absolute top-1 left-1 w-5 h-5 bg-red-600 text-white rounded-full text-[10px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition hover:bg-red-700">${Icon.close()}</button>
            <span class="absolute bottom-1 right-1 text-[10px] bg-black/60 text-white px-1.5 rounded-full">${i+1}</span>
        </div>
    `).join('');
}

window.removeSlideshowImage = function(index) {
    slideshowImages.splice(index, 1);
    renderSlideshowAdmin();
};

window.previewBannerImage = async function(index, e) {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { showMessage(t('adminImgTooLarge')); return; }
    const reader = new FileReader();
    reader.onload = function(ev) {
        const preview = document.getElementById(`bannerPreview${index}`);
        if (preview) { preview.src = ev.target.result; preview.classList.remove('hidden'); }
        const label = document.getElementById(`bannerUploadLabel${index}`);
        if (label) label.innerHTML = '⏳ جاري الرفع...';
    };
    reader.readAsDataURL(file);
    try {
        uploadedBannerImages[index] = await uploadImageToStorage(file);
        const label = document.getElementById(`bannerUploadLabel${index}`);
        if (label) label.innerHTML = '📁 تغيير الصورة';
    } catch (err) {
        showMessage(t('adminUploadFailed'));
    }
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
                    <input type="text" id="bannerTag${i}" value="${b.tag || ''}" class="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm" placeholder="${Icon.hot()} جديد">
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
            tbody.innerHTML = `<tr><td colspan="10" class="p-8 text-center text-stone-400">${t('noOrders')}</td></tr>`;
            return;
        }
        orders.forEach(order => {
            const row = document.createElement('tr');
            row.className = "border-b border-stone-100 hover:bg-stone-50";
            row.innerHTML = `
                <td class="p-3 font-mono text-[10px] text-stone-400">${escapeHTML(order.orderId || '—')}</td>
                <td class="p-3 text-stone-500 text-xs whitespace-nowrap">${escapeHTML(order.date || '')}</td>
                <td class="p-3 font-semibold text-stone-900 text-xs">${escapeHTML(order.customerName)}</td>
                <td class="p-3 text-stone-600 text-xs" dir="ltr">${escapeHTML(order.customerPhone)}</td>
                <td class="p-3 text-stone-600 text-xs max-w-[120px] truncate" title="${escapeHTML(order.items)}">${escapeHTML(order.items)}</td>
                <td class="p-3 font-bold text-amber-600 text-xs">${order.total} EGP</td>
                <td class="p-3">
                    <button onclick="showOrderDetails('${order.orderId}')" class="text-[10px] text-amber-600 hover:text-amber-800 font-semibold">${Icon.pkg()} ${t('orderViewDetails')}</button>
                </td>
                <td class="p-3">
                    <select onchange="updateOrderField('${order.orderId}','status',this.value)" class="text-xs border border-stone-200 rounded px-2 py-1 bg-white">
                        <option value="قيد المراجعة" ${order.status === 'قيد المراجعة' ? 'selected' : ''}>${t('statusPending')}</option>
                        <option value="قيد التجهيز" ${order.status === 'قيد التجهيز' ? 'selected' : ''}>${t('statusProcessing')}</option>
                        <option value="تم الشحن" ${order.status === 'تم الشحن' ? 'selected' : ''}>${t('statusShipped')}</option>
                        <option value="تم التسليم" ${order.status === 'تم التسليم' ? 'selected' : ''}>${t('statusDelivered')}</option>
                        <option value="ملغي" ${order.status === 'ملغي' ? 'selected' : ''}>${t('statusCancelled')}</option>
                    </select>
                </td>
                <td class="p-3">
                    <input type="text" value="${escapeHTML(order.trackingId || '')}" placeholder="${t('orderTracking')}" onchange="updateOrderField('${order.orderId}','trackingId',this.value)" class="text-xs border border-stone-200 rounded px-2 py-1 w-20 bg-white">
                </td>
                <td class="p-3">
                    <button onclick="copyTrackingLink('${order.orderId}')" class="text-[10px] text-blue-600 hover:text-blue-800 font-semibold">${Icon.clip()} ${t('orderCopyLink')}</button>
                </td>
            `;
            tbody.appendChild(row);
        });
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="10" class="p-8 text-center text-red-500">${t('adminOrdersLoadError')}</td></tr>`;
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
        } else {
            // If no Firestore ID, try to find the order by orderId field
            import("./sheets-service.js").then(s => s.findAndUpdateOrder(orderId, field, value)).catch(() => {});
        }
    } catch (e) { console.warn('Firestore sync failed (offline):', e); }
    showMessage(t('adminUpdated'));
};

window.copyTrackingLink = function(orderId) {
    const link = window.location.origin + '/tracking.html?orderId=' + orderId;
    navigator.clipboard.writeText(link).then(() => showMessage(t('adminTrackingCopied')));
};

window.showOrderDetails = function(orderId) {
    const orders = JSON.parse(localStorage.getItem('vora_orders')) || [];
    const order = orders.find(o => o.orderId === orderId);
    if (!order) { showMessage(t('adminOrderNotFound')); return; }
    let itemsHtml = '';
    let items = [];
    try { items = order.itemDetails ? JSON.parse(order.itemDetails) : []; } catch(e) {}
    if (items.length > 0) {
        items.forEach((item, i) => {
            itemsHtml += `<div class="flex justify-between items-center py-2 border-b border-stone-100 last:border-0">
                <div><span class="font-semibold text-stone-900">${escapeHTML(item.name)}</span> <span class="text-stone-500 text-sm">×${item.qty}</span></div>
                <span class="font-bold text-amber-600">${item.price * item.qty} ج.م</span>
            </div>`;
        });
    } else {
        itemsHtml = `<p class="text-stone-500 text-sm">${escapeHTML(order.items || '—')}</p>`;
    }
    document.getElementById('orderDetailsBody').innerHTML = `
        <div class="space-y-2 text-sm">
            <div class="flex justify-between"><span class="text-stone-500">${t('orderId')}:</span><span class="font-mono text-stone-900">${escapeHTML(order.orderId)}</span></div>
            <div class="flex justify-between"><span class="text-stone-500">${t('orderCustomer')}:</span><span class="text-stone-900">${escapeHTML(order.customerName)}</span></div>
            <div class="flex justify-between"><span class="text-stone-500">${t('orderPhone')}:</span><span class="text-stone-900">${escapeHTML(order.customerPhone)}</span></div>
            <div class="flex justify-between"><span class="text-stone-500">${t('orderAddress')}:</span><span class="text-stone-900">${escapeHTML(order.customerAddress)}</span></div>
            <div class="flex justify-between"><span class="text-stone-500">${t('orderGovernorate')}:</span><span class="text-stone-900">${escapeHTML(order.governorate || '—')}</span></div>
            <div class="flex justify-between"><span class="text-stone-500">${t('orderDate')}:</span><span class="text-stone-900">${escapeHTML(order.date || '—')}</span></div>
            <div class="flex justify-between"><span class="text-stone-500">${t('orderPayment')}:</span><span class="text-stone-900">${escapeHTML(order.paymentMethod || '—')}</span></div>
            <div class="flex justify-between"><span class="text-stone-500">${t('orderTracking')}:</span><span class="text-stone-900">${escapeHTML(order.trackingId || '—')}</span></div>
            <div class="flex justify-between"><span class="text-stone-500">${t('orderStatus')}:</span><span class="text-stone-900">${escapeHTML(order.status)}</span></div>
        </div>
        <div class="border-t border-stone-200 pt-4">
            <h4 class="font-bold text-stone-900 mb-2">${t('orderProducts')}</h4>
            ${itemsHtml}
        </div>
        <div class="border-t border-stone-200 pt-4 flex justify-between font-bold text-lg">
            <span>${t('adminTotal')}:</span>
            <span class="text-amber-600">${order.total} ${t('currency')}</span>
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
        showMessage(t('adminImgTooLarge10MB'));
        return;
    }
    window.selectedProductFile = file; // تخزين الملف مؤقتاً لرفعه عند الحفظ
    document.getElementById('previewImg').src = URL.createObjectURL(file);
    document.getElementById('imagePreview').classList.remove('hidden');
    document.getElementById('uploadPlaceholder').innerHTML = '📁 تغيير الصورة';
};

window.previewVariantImage = function(input) {
    const row = input.closest('.variant-row');
    const preview = row.querySelector('.variant-image-preview');
    const file = input.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            preview.src = e.target.result;
            preview.classList.remove('hidden');
            row._variantFile = file;
            row.querySelector('.variant-image-input').value = '';
        };
        reader.readAsDataURL(file);
    }
};

window.addVariantRow = function(name, nameEn, price, stock, image) {
    const container = document.getElementById('variantsContainer');
    const row = document.createElement('div');
    row.className = 'variant-row border border-stone-200 rounded-lg p-3 space-y-2';
    row.innerHTML = `
        <div class="flex gap-2 items-start">
            <input type="text" class="variant-name flex-1 min-w-0 px-3 py-1.5 border border-stone-300 rounded-lg text-xs" placeholder="الاسم (عربي)" value="${name || ''}">
            <input type="text" class="variant-name-en flex-1 min-w-0 px-3 py-1.5 border border-stone-300 rounded-lg text-xs" placeholder="Name (English)" value="${nameEn || ''}">
            <button type="button" onclick="this.closest('.variant-row').remove()" class="text-red-500 hover:text-red-700 flex-shrink-0 text-lg leading-none px-1">&times;</button>
        </div>
        <div class="flex gap-2 items-center">
            <div class="w-20">
                <label class="text-[10px] text-stone-400 block leading-tight">السعر</label>
                <input type="number" class="variant-price w-full px-2 py-1 border border-stone-300 rounded text-xs" placeholder="0" value="${price || ''}">
            </div>
            <div class="w-20">
                <label class="text-[10px] text-stone-400 block leading-tight">المخزون</label>
                <input type="number" class="variant-stock w-full px-2 py-1 border border-stone-300 rounded text-xs" value="${stock ?? 50}">
            </div>
            <div class="flex-1 flex items-center gap-1.5">
                <input type="file" accept="image/*" class="hidden variant-image-input" onchange="previewVariantImage(this)">
                <button type="button" onclick="this.closest('.variant-row').querySelector('.variant-image-input').click()" class="px-2.5 py-1 text-[10px] border border-dashed border-stone-300 rounded hover:border-amber-500 hover:text-amber-600 transition flex-shrink-0">${image ? 'تغيير' : 'صورة'}</button>
                <img class="variant-image-preview ${image ? '' : 'hidden'} w-8 h-8 rounded object-cover border border-stone-200 flex-shrink-0" src="${image || ''}">
            </div>
        </div>
    `;
    container.appendChild(row);
};

window.saveVariantData = function() {
    const rows = document.querySelectorAll('#variantsContainer .variant-row');
    const variants = [];
    rows.forEach(row => {
        const name = row.querySelector('.variant-name').value.trim();
        const nameEn = row.querySelector('.variant-name-en').value.trim();
        const price = parseFloat(row.querySelector('.variant-price').value);
        const stock = parseInt(row.querySelector('.variant-stock').value) || 0;
        const preview = row.querySelector('.variant-image-preview');
        const image = preview?.src && preview.src.startsWith('blob:') ? '' : (preview?.src || '');
        if (name && price) variants.push({ name, nameEn, price, stock, image, _file: row._variantFile || null });
    });
    return variants.length > 0 ? variants : null;
};

window.loadVariantData = function(variants) {
    const container = document.getElementById('variantsContainer');
    container.innerHTML = '';
    if (!variants || variants.length === 0) return;
    variants.forEach(v => addVariantRow(v.name, v.nameEn, v.price, v.stock, v.image));
};

window.clearVariants = function() {
    document.getElementById('variantsContainer').innerHTML = '';
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
    const variants = saveVariantData();
    
    const sections = [];
    if (document.getElementById('sct_bestSellers').checked) sections.push('best-sellers');
    if (document.getElementById('sct_forHim').checked) sections.push('for-him');
    if (document.getElementById('sct_forHer').checked) sections.push('for-her');
    if (document.getElementById('sct_unisex').checked) sections.push('unisex');
    if (document.getElementById('sct_newArrivals').checked) sections.push('new-arrivals');
    
    if (!name || !price) return showMessage(t('adminFillNamePrice'));

    let originalPrice = null;
    if (discountPercent > 0 && discountPercent < 100) {
        originalPrice = Math.round(price / (1 - discountPercent / 100));
    } else {
        const raw = document.getElementById('prodOriginalPrice').value;
        if (raw) originalPrice = parseFloat(raw);
    }

    showMessage(t('adminUploadingSaving'));
    
    try {
        let finalImageUrl = uploadedImageData;

        if (window.selectedProductFile) {
            finalImageUrl = await uploadImageToStorage(window.selectedProductFile);
        }

        if (variants) {
            for (const v of variants) {
                if (v._file) {
                    try { v.image = await uploadImageToStorage(v._file); } catch (e) { console.error("Variant upload:", e); }
                    delete v._file;
                }
            }
        }

        const prodData = {
            name, size, price, stock, description,
            image: finalImageUrl,
            originalPrice: originalPrice ?? "",
            discount: !!(originalPrice || discountPercent > 0),
            discountPercent: discountPercent,
            sections: sections,
            rating: 5, ratingCount: 1,
            vendor, gender, additionalInfo,
            variants
        };

        let response;
        if (editingProductId) {
            response = await updateProduct(editingProductId, prodData);
        } else { 
            response = await addProduct(prodData);
        }
        
        if (response.success) {
            if (editingProductId) {
                showMessage(`${Icon.check()} ${t('adminUpdatedProduct').replace('{name}', name)}`);
            } else {
                showMessage(`${Icon.check()} ${t('adminAddedProduct').replace('{name}', name)}`);
            }
            clearForm();
            loadProductList();
        } else showMessage(`${t('error')}: ${response.error}`);
    } catch (err) { 
        showMessage(t('adminSaveFailed')); 
    }
};

window.editProduct = function(id) {
    const allProducts = window.__productsCache || [];
    const prod = allProducts.find(p => p.id === id);
    if (!prod) {
        showMessage(t('adminProductNotFound'));
        return;
    }
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
    
    loadVariantData(prod.variants || null);
    document.getElementById('formTitle').textContent = t('adminEditProduct');

    window.selectedProductFile = null;
    if (prod.image) {
        uploadedImageData = prod.image;
        document.getElementById('previewImg').src = prod.image;
        document.getElementById('imagePreview').classList.remove('hidden');
        document.getElementById('uploadPlaceholder').innerHTML = t('adminClickUpload');
    }

    document.getElementById('saveProductBtn').innerHTML = t('adminUpdateProductBtn');
    document.getElementById('cancelEditBtn').classList.remove('hidden');
    document.getElementById('prodName').scrollIntoView({ behavior: 'smooth', block: 'center' });
};

window.cancelEdit = function() {
    clearForm();
};

window.duplicateProduct = async function(id) {
    const products = await getProducts();
    const prod = products.find(p => p.id === id);
    if (!prod) return showMessage(t('adminProductNotFound'));
    
    const copy = { 
        ...prod, 
        name: prod.name + ` ${t('adminCopySuffix')}` 
    };
    delete copy.id; 

    try {
        const response = await addProduct(copy);
        if (response.success) {
            showMessage(`${Icon.check()} ${t('adminProductCopied').replace('{name}', prod.name)}`);
            loadProductList();
        } else showMessage(`${t('error')}: ${response.error}`);
    } catch (err) { showMessage(t('adminConnectionFailed')); }
};

window.deleteProduct = async function(id) {
    if (!confirm(t('adminConfirmDeleteProduct'))) return;
    const cache = window.__productsCache;
    const prod = cache ? cache.find(p => p.id === id) : null;
    // Remove from localStorage immediately for instant feedback
    const local = JSON.parse(localStorage.getItem('vora_products')) || [];
    const updated = local.filter(p => p.id !== id);
    localStorage.setItem('vora_products', JSON.stringify(updated));
    // Update cache and re-render immediately
    if (cache) {
        window.__productsCache = cache.filter(p => p.id !== id);
        loadProductList();
    }
    if (editingProductId === id) clearForm();
    showMessage(`${Icon.check()} ${t('adminDeleted').replace('{name}', prod?.name || id)}`);
    // Try Firestore delete in background
    try {
        await deleteDoc(doc(db, "products", id));
    } catch (e) { console.warn("Firestore delete:", e); }
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
    document.getElementById('formTitle').textContent = t('adminAddProduct');
    document.getElementById('saveProductBtn').innerHTML = t('adminSaveProductBtn');
    document.getElementById('cancelEditBtn').classList.add('hidden');
    document.getElementById('imagePreview').classList.add('hidden');
    document.getElementById('uploadPlaceholder').innerHTML = t('adminClickUpload');
    document.getElementById('prodImageInput').value = "";
    document.getElementById('sct_bestSellers').checked = true;
    document.getElementById('sct_forHim').checked = false;
    document.getElementById('sct_forHer').checked = false;
    document.getElementById('sct_unisex').checked = false;
    document.getElementById('sct_newArrivals').checked = false;
    clearVariants();
}

async function loadProductList() {
    const container = document.getElementById('productList');
    const products = await getProducts();
    window.__productsCache = products;
    
    if (products.length === 0) {
        container.innerHTML = `<p class="text-center text-stone-400 py-8 text-sm">${t('noProducts')}</p>`;
        return;
    }
    container.innerHTML = products.map(prod => {
        const img = prod.image ? `<img src="${escapeHTML(prod.image)}" class="w-10 h-10 rounded object-cover border border-stone-200">` : `<div class="w-10 h-10 rounded bg-stone-100 flex items-center justify-center text-amber-600 text-xs">${Icon.pkg()}</div>`;
        const stock = prod.stock ?? '—';
        const stockClass = stock === 0 ? 'text-red-600' : (stock <= 5 ? 'text-orange-500' : 'text-green-600');
        const discountBadge = prod.discount && prod.discountPercent ? `<span class="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full font-bold">-${prod.discountPercent}%</span>` : '';
        
        return `
        <div class="flex items-center gap-3 p-3 rounded-lg border border-stone-100 hover:border-amber-200 hover:bg-amber-50/30 transition group">
            ${img}
            <div class="flex-1 min-w-0">
                <p class="text-sm font-bold text-stone-900 truncate">${escapeHTML(prod.name)} ${discountBadge}</p>
                <p class="text-xs text-stone-400">${escapeHTML(prod.category || prod.vendor || '—')} • ${prod.price} EGP • <span class="${stockClass} font-semibold">${stock === 0 ? t('adminOutOfStockLabel') : stock + ' ' + t('adminPiecesLabel')}</span></p>
            </div>
            <div class="flex gap-1 opacity-0 group-hover:opacity-100 transition">
                <button onclick="editProduct('${prod.id}')" class="px-2.5 py-1.5 text-xs font-bold text-amber-600 hover:bg-amber-100 rounded transition" title="تعديل">${Icon.edit()}</button>
                <button onclick="duplicateProduct('${prod.id}')" class="px-2.5 py-1.5 text-xs font-bold text-blue-600 hover:bg-blue-50 rounded transition" title="نسخ">${Icon.clip()}</button>
                <button onclick="deleteProduct('${prod.id}')" class="px-2.5 py-1.5 text-xs font-bold text-red-600 hover:bg-red-50 rounded transition" title="حذف">${Icon.trash()}</button>
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
        container.innerHTML = '<p class="text-xs text-stone-400 text-center py-4">' + t('noCoupons') + '</p>';
        return;
    }
    container.innerHTML = entries.map(([code, discount], i) => `
        <div class="flex items-center gap-2">
            <input type="text" value="${code}" id="coupon_code_${i}" class="flex-1 px-3 py-2 border border-stone-300 rounded-lg text-sm text-center font-bold uppercase" placeholder="الكود" dir="ltr">
            <input type="number" value="${discount}" id="coupon_discount_${i}" class="w-20 px-3 py-2 border border-stone-300 rounded-lg text-sm text-center" placeholder="%" min="0" max="100">
            <span class="text-xs text-stone-400">%</span>
            <button onclick="removeCoupon(${i})" class="text-red-500 hover:text-red-700 px-2">${Icon.close()}</button>
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
        container.innerHTML = '<p class="text-xs text-stone-400 text-center py-4">' + t('noBundles') + '</p>';
        return;
    }
    container.innerHTML = bundles.map((b, i) => `
        <div class="border border-stone-200 rounded-lg p-3 space-y-2">
            <div class="flex items-center justify-between">
                <span class="text-xs font-bold text-stone-700">${t('adminOfferLabel')} ${i + 1}</span>
                <button onclick="removeBundle(${i})" class="text-red-500 hover:text-red-700 text-xs px-2">${Icon.close()} ${t('adminDeleteLabel')}</button>
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
        container.innerHTML = '<p class="text-xs text-stone-400 text-center py-4">' + t('noBrands') + '</p>';
        return;
    }
    container.innerHTML = brands.map((b, i) => `
        <div class="border border-stone-200 rounded-lg p-3 space-y-2">
            <div class="flex items-center justify-between">
                <span class="text-xs font-bold text-stone-700">${t('adminBrandLabel')} ${i + 1}</span>
                <button onclick="removeBrand(${i})" class="text-red-500 hover:text-red-700 text-xs px-2">${Icon.close()} ${t('adminDeleteLabel')}</button>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input type="text" value="${b.name || ''}" id="brand_name_${i}" class="px-3 py-2 border border-stone-300 rounded-lg text-sm" placeholder="اسم البراند (مثال: Dior)">
                <div class="flex items-center gap-2">
                    <input type="file" accept="image/*" class="hidden" id="brand_file_${i}" onchange="previewBrandImage(${i}, this)">
                    <button onclick="document.getElementById('brand_file_${i}').click()" class="px-3 py-2 border border-stone-300 rounded-lg text-sm text-stone-500 hover:text-amber-600 hover:border-amber-500 transition">${Icon.image()} اختيار صورة</button>
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
        const brands = window._brandData || [];
        while (brands.length <= index) brands.push({ name: '', image: '' });
        brands[index].image = dataUrl;
        window._brandData = brands;
        renderBrands();
    };
    reader.readAsDataURL(file);
    uploadImageToStorage(file).then(url => {
        document.getElementById('brand_image_' + index).value = url;
        const brands = window._brandData || [];
        if (brands[index]) brands[index].image = url;
        window._brandData = brands;
        renderBrands();
    }).catch(() => {
        showMessage(t('adminBrandUploadFailed'));
    });
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
        heroImage: (uploadedHeroImage && uploadedHeroImage.startsWith('data:')) ? '' : uploadedHeroImage,
        logo: (uploadedLogo && uploadedLogo.startsWith('data:')) ? '' : uploadedLogo,
        loginLogo: (uploadedLoginLogo && uploadedLoginLogo.startsWith('data:')) ? '' : uploadedLoginLogo,
        returnPolicyAr: document.getElementById('set_returnPolicyAr').value.trim(),
        returnPolicyEn: document.getElementById('set_returnPolicyEn').value.trim(),
        slideshowImages: slideshowImages.filter(img => img && img.startsWith && !img.startsWith('data:')),
        banners: [0,1,2].map(i => ({
            image: (uploadedBannerImages[i] && uploadedBannerImages[i].startsWith('data:')) ? '' : (uploadedBannerImages[i] || ''),
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
    settings.brands = brands.map(b => ({ ...b, image: (b.image && b.image.startsWith('data:')) ? '' : b.image }));

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

    showMessage(t('adminSettingsSaved'));
};

window.downloadBackup = function() {
    const products = JSON.parse(localStorage.getItem('vora_products')) || [];
    const settings = JSON.parse(localStorage.getItem('vora_settings')) || {};
    const data = {
        products: products,
        settings: settings
    };
    const jsContent = `// VORA Fallback Data - Exported on ${new Date().toLocaleDateString('en-US')}
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
    showMessage(t('adminBackupDownloaded'));
};

window.hideMessage = hideMessage;
