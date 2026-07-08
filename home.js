// home.js
import { getProducts } from "./sheets-service.js";
import { showMessage, hideMessage } from "./firebase-config.js";

// أيقونة زجاجة عطر بسيطة (SVG) تُستخدم كصورة افتراضية للمنتج
const BOTTLE_SVG = `
<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="24" y="4" width="16" height="8" rx="1.5" fill="currentColor" opacity="0.7"/>
    <path d="M20 14 Q20 12 22 12 L42 12 Q44 12 44 14 L48 30 Q49 36 49 42 L49 56 Q49 60 45 60 L19 60 Q15 60 15 56 L15 42 Q15 36 16 30 Z"
          stroke="currentColor" stroke-width="2" fill="none"/>
    <line x1="15" y1="34" x2="49" y2="34" stroke="currentColor" stroke-width="1.5" opacity="0.6"/>
</svg>`;

// التحقق من الجلسة والصلاحيات عند فتح الصفحة
const userData = JSON.parse(localStorage.getItem('vora_user'));
if (!userData) {
    window.location.href = "index.html";
}

document.addEventListener("DOMContentLoaded", () => {
    updateCartCount();
    loadProducts();
});

async function loadProducts() {
    const container = document.getElementById('productsContainer');
    try {
        const products = await getProducts();
        container.innerHTML = "";

        if (products.length === 0) {
            container.innerHTML = `
                <div class="col-span-full text-center py-16 space-y-4">
                    <p class="text-4xl">🎁</p>
                    <p class="text-2xl font-bold text-stone-900">لا توجد عطور بعد</p>
                    <p class="text-stone-600">هنا هتظهر تشكيلة VORA بمجرد ما يتم إضافتها من لوحة الإدارة.</p>
                </div>`;
            return;
        }

        products.forEach((prod, index) => {
            const rating = parseFloat(prod.rating) || 0;
            const stars = rating > 0 ? "★".repeat(Math.round(rating)) + "☆".repeat(5 - Math.round(rating)) : "☆☆☆☆☆";
            const isNew = index === 0;
            
            // حساب نسبة الخصم إن وجدت
            const discount = prod.discount ? Math.round((prod.discount / prod.originalPrice) * 100) : 0;

            const card = document.createElement('div');
            card.className = "product-card group";
            card.innerHTML = `
                <div class="relative overflow-hidden rounded-lg bg-gradient-to-br from-amber-50 to-stone-50 p-8 h-64 flex items-center justify-center transform transition-transform duration-300 group-hover:scale-105">
                    ${isNew ? '<span class="absolute top-3 right-3 bg-amber-500 text-white px-3 py-1 rounded-full text-xs font-bold">جديد ✨</span>' : ''}
                    ${discount > 0 ? `<span class="absolute top-3 left-3 bg-red-500 text-white px-3 py-1 rounded-full text-xs font-bold">-${discount}%</span>` : ''}
                    <div class="w-full h-full text-amber-600 opacity-80 hover:opacity-100 transition">
                        ${BOTTLE_SVG}
                    </div>
                    <button class="absolute inset-0 flex items-end justify-center opacity-0 group-hover:opacity-100 transition pb-4" onclick="addToCart('${prod.id}', '${prod.name}', ${prod.price})">
                        <span class="bg-amber-600 text-white px-6 py-2 rounded-full font-semibold shadow-lg">إضافة للسلة +</span>
                    </button>
                </div>
                <div class="pt-6 space-y-3">
                    <span class="inline-block text-xs font-bold text-amber-600 uppercase tracking-widest">${prod.category || 'VORA'}</span>
                    <h3 class="text-lg font-bold text-stone-900 line-clamp-2">${prod.name}</h3>
                    <p class="text-sm text-stone-600 line-clamp-2">${prod.description || 'عطر فاخر من مجموعة VORA'}</p>
                    <div class="flex items-center justify-between pt-2">
                        <div class="text-yellow-500 text-sm">${stars}</div>
                        <span class="text-xs text-stone-500">(${prod.ratingCount || 0})</span>
                    </div>
                    <div class="flex items-center justify-between pt-4 border-t border-stone-200">
                        <div>
                            ${prod.discount ? `
                                <p class="text-xs text-stone-500 line-through">${prod.originalPrice} ج.م</p>
                                <p class="text-xl font-bold text-amber-600">${prod.price} ج.م</p>
                            ` : `
                                <p class="text-xl font-bold text-amber-600">${prod.price} ج.م</p>
                            `}
                        </div>
                        <button onclick="addToCart('${prod.id}', '${prod.name}', ${prod.price})" class="w-10 h-10 bg-amber-100 hover:bg-amber-600 text-amber-600 hover:text-white rounded-full flex items-center justify-center transition text-lg">
                            🛍️
                        </button>
                    </div>
                </div>
            `;
            container.appendChild(card);
        });
    } catch (err) {
        console.error('Error loading products:', err);
        container.innerHTML = `<p class="text-red-500 text-center col-span-full py-12">⚠️ حدث خطأ أثناء تحميل المنتجات</p>`;
    }
}

window.addToCart = function(id, name, price) {
    let cart = JSON.parse(localStorage.getItem('vora_cart')) || [];
    const itemIndex = cart.findIndex(item => item.id === id);

    if (itemIndex > -1) {
        cart[itemIndex].qty += 1;
    } else {
        cart.push({ id, name, price, qty: 1 });
    }

    localStorage.setItem('vora_cart', JSON.stringify(cart));
    updateCartCount();
    renderCartDrawer();
    showMessage(`✓ تمت إضافة "${name}" إلى السلة!`);
};

function updateCartCount() {
    const cart = JSON.parse(localStorage.getItem('vora_cart')) || [];
    const totalQty = cart.reduce((sum, item) => sum + item.qty, 0);
    document.getElementById('cartCount').textContent = totalQty;
}

// ==================== Cart Drawer ====================
window.openCartDrawer = function() {
    renderCartDrawer();
    document.getElementById('cartDrawer').classList.remove('translate-x-full');
    document.getElementById('cartDrawerOverlay').classList.remove('hidden');
};

window.closeCartDrawer = function() {
    document.getElementById('cartDrawer').classList.add('translate-x-full');
    document.getElementById('cartDrawerOverlay').classList.add('hidden');
};

window.goToCheckout = function() {
    const cart = JSON.parse(localStorage.getItem('vora_cart')) || [];
    if (cart.length === 0) {
        showMessage('⚠️ السلة فارغة. أضف منتجات أولاً');
        return;
    }
    window.location.href = 'checkout.html';
};

function renderCartDrawer() {
    const cart = JSON.parse(localStorage.getItem('vora_cart')) || [];
    const body = document.getElementById('cartDrawerBody');
    const footer = document.getElementById('cartDrawerFooter');

    if (cart.length === 0) {
        body.innerHTML = `
            <div class="text-center py-12 space-y-4">
                <div class="text-4xl">🛍️</div>
                <p class="font-bold text-stone-900 text-lg">سلتك فارغة</p>
                <p class="text-stone-600 text-sm">أضف عطرك المفضل لتبدأ التسوق</p>
            </div>`;
        footer.classList.add('hidden');
        return;
    }

    footer.classList.remove('hidden');
    body.innerHTML = "";

    let total = 0;
    cart.forEach((item, index) => {
        total += item.price * item.qty;
        const row = document.createElement('div');
        row.className = "flex gap-4 pb-4 border-b border-stone-200 last:border-0";
        row.innerHTML = `
            <div class="w-16 h-16 bg-gradient-to-br from-amber-50 to-stone-50 rounded-lg flex items-center justify-center text-amber-600 flex-shrink-0">
                ${BOTTLE_SVG}
            </div>
            <div class="flex-1">
                <p class="font-semibold text-stone-900">${item.name}</p>
                <p class="text-sm text-stone-600">${item.price} ج.م</p>
                <div class="flex items-center gap-2 mt-2">
                    <button onclick="changeDrawerQty(${index}, -1)" class="w-6 h-6 border border-stone-300 rounded hover:bg-stone-100">−</button>
                    <span class="w-6 text-center font-semibold">${item.qty}</span>
                    <button onclick="changeDrawerQty(${index}, 1)" class="w-6 h-6 border border-stone-300 rounded hover:bg-stone-100">+</button>
                </div>
            </div>
            <button class="text-red-500 hover:text-red-700 text-xl" onclick="removeDrawerItem(${index})">🗑️</button>
        `;
        body.appendChild(row);
    });

    document.getElementById('cartDrawerTotal').textContent = `${total} ج.م`;
}

window.changeDrawerQty = function(index, change) {
    let cart = JSON.parse(localStorage.getItem('vora_cart')) || [];
    cart[index].qty += change;
    if (cart[index].qty <= 0) cart.splice(index, 1);
    localStorage.setItem('vora_cart', JSON.stringify(cart));
    updateCartCount();
    renderCartDrawer();
};

window.removeDrawerItem = function(index) {
    let cart = JSON.parse(localStorage.getItem('vora_cart')) || [];
    cart.splice(index, 1);
    localStorage.setItem('vora_cart', JSON.stringify(cart));
    updateCartCount();
    renderCartDrawer();
};

window.logout = function() {
    localStorage.removeItem('vora_user');
    localStorage.removeItem('vora_cart');
    window.location.href = "index.html";
};

window.hideMessage = hideMessage;
