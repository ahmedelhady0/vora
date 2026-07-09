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
                <div class="w-full text-center py-16 space-y-4">
                    <p class="text-4xl">🎁</p>
                    <p class="text-2xl font-bold text-stone-900">لا توجد عطور بعد</p>
                    <p class="text-stone-600">هنا هتظهر تشكيلة VORA بمجرد ما يتم إضافتها من لوحة الإدارة.</p>
                </div>`;
            return;
        }

        // على الصفحة الرئيسية بنعرض معاينة سريعة بس (أول 4 منتجات)، والتشكيلة كاملة موجودة في shop.html
        const bestSellers = products.slice(0, 4);

        bestSellers.forEach((prod, index) => {
            const rating = parseFloat(prod.rating) || 0;
            const stars = rating > 0 ? "★".repeat(Math.round(rating)) + "☆".repeat(5 - Math.round(rating)) : "☆☆☆☆☆";
            const isNew = index === 0;

            // حساب نسبة الخصم إن وجدت
            const discount = prod.discount && prod.originalPrice ? Math.round(((prod.originalPrice - prod.price) / prod.originalPrice) * 100) : 0;

            const card = document.createElement('div');
            card.className = "flex-shrink-0 w-[130px] sm:w-[150px] text-center group";
            card.innerHTML = `
                <div class="relative h-32 sm:h-36 flex items-end justify-center mb-2">
                    ${isNew ? '<span class="absolute top-0 right-0 bg-gradient-to-r from-amber-500 to-orange-500 text-white px-1.5 py-0.5 rounded text-[9px] font-bold shadow z-10">جديد</span>' : ''}
                    ${discount > 0 ? `<span class="absolute top-0 left-0 bg-red-600 text-white px-1.5 py-0.5 rounded text-[9px] font-bold shadow z-10">Sale</span>` : ''}

                    ${prod.image ? `
                        <img src="${prod.image}" alt="${prod.name}" class="relative z-[1] max-h-full max-w-full object-contain transition-transform duration-300 group-hover:scale-105" loading="lazy" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                        <div class="w-full h-full text-amber-600 opacity-80" style="display:none;">${BOTTLE_SVG}</div>
                    ` : `
                        <div class="w-full h-full text-amber-600 opacity-80">${BOTTLE_SVG}</div>
                    `}
                    <div class="absolute bottom-1 left-1/2 -translate-x-1/2 w-1/2 h-2.5" style="background: radial-gradient(ellipse at center, rgba(0,0,0,0.15) 0%, transparent 70%);"></div>
                </div>

                <p class="text-[9px] font-bold italic uppercase tracking-wide text-stone-700">${prod.category || 'VORA'}</p>
                <p class="text-xs italic text-stone-800 line-clamp-1 mt-0.5" style="font-family: 'Playfair Display', serif;">${prod.name}</p>

                <div class="flex items-center justify-center gap-1 mt-0.5">
                    <span class="text-yellow-500 text-[9px]">${stars}</span>
                </div>

                <div class="mt-1">
                    ${prod.discount && prod.originalPrice ? `
                        <p class="text-[9px] text-stone-400 line-through leading-none">${prod.originalPrice} ج.م</p>
                        <p class="text-xs font-bold text-red-600">${prod.price} ج.م</p>
                    ` : `
                        <p class="text-xs font-bold text-stone-900">${prod.price} ج.م</p>
                    `}
                </div>

                <button onclick="addToCart('${prod.id}', '${prod.name}', ${prod.price})" class="mt-1.5 text-[10px] font-semibold text-amber-700 hover:text-amber-900 underline underline-offset-2 transition">
                    + إضافة للسلة
                </button>
            `;
            container.appendChild(card);
        });
    } catch (err) {
        console.error('Error loading products:', err);
        container.innerHTML = `<p class="text-red-500 text-center w-full py-12">⚠️ حدث خطأ أثناء تحميل المنتجات</p>`;
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
    document.body.style.overflow = 'hidden';
};

window.closeCartDrawer = function() {
    document.getElementById('cartDrawer').classList.add('translate-x-full');
    document.getElementById('cartDrawerOverlay').classList.add('hidden');
    document.body.style.overflow = 'auto';
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
            <div class="text-center py-16 space-y-4">
                <div class="text-6xl">🛍️</div>
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
        const subtotal = item.price * item.qty;
        
        const row = document.createElement('div');
        row.className = "flex gap-4 pb-4 border-b border-stone-200 last:border-0 group hover:bg-stone-50/50 rounded-lg p-3 transition";
        row.innerHTML = `
            <div class="relative w-20 h-24 bg-gradient-to-br from-amber-100 to-stone-100 rounded-lg flex items-center justify-center text-amber-600 flex-shrink-0 shadow-md">
                ${BOTTLE_SVG}
                <div class="absolute inset-0 rounded-lg bg-gradient-to-t from-black/10 to-transparent"></div>
            </div>
            <div class="flex-1 space-y-2">
                <div>
                    <p class="font-bold text-stone-900 text-sm">${item.name}</p>
                    <p class="text-xs text-stone-500">${item.price} ج.م</p>
                </div>
                <div class="flex items-center gap-1 bg-stone-100 rounded-lg w-fit">
                    <button onclick="changeDrawerQty(${index}, -1)" class="w-7 h-7 flex items-center justify-center hover:bg-stone-200 rounded transition text-sm font-bold">−</button>
                    <span class="w-8 text-center font-bold text-stone-900 text-sm">${item.qty}</span>
                    <button onclick="changeDrawerQty(${index}, 1)" class="w-7 h-7 flex items-center justify-center hover:bg-stone-200 rounded transition text-sm font-bold">+</button>
                </div>
            </div>
            <div class="flex flex-col items-end justify-between">
                <button class="text-red-500 hover:text-red-700 opacity-0 group-hover:opacity-100 transition text-lg" onclick="removeDrawerItem(${index})">🗑️</button>
                <p class="font-bold text-amber-600 text-sm">${subtotal} ج.م</p>
            </div>
        `;
        body.appendChild(row);
    });

    document.getElementById('cartDrawerTotal').textContent = `${total} ج.م`;
    document.getElementById('cartSubtotal').textContent = `${total} ج.م`;
    document.getElementById('cartShipping').textContent = 'مجاني';
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
