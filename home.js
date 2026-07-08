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
    document.getElementById('welcomeName').textContent = userData.username;

    if (userData.role === 'admin' || userData.role === 'manager') {
        const navActions = document.getElementById('navActions');
        const adminBtn = document.createElement('a');
        adminBtn.href = "admin.html";
        adminBtn.className = "btn-primary";
        adminBtn.textContent = "لوحة الإدارة";
        navActions.insertBefore(adminBtn, navActions.firstChild);
    }

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
                <div class="empty-state col-span-full">
                    <p class="empty-title">لا توجد عطور بعد</p>
                    <p>هنا هتظهر تشكيلة VORA بمجرد ما يتم إضافتها من لوحة الإدارة.</p>
                </div>`;
            return;
        }

        products.forEach((prod, index) => {
            const rating = parseFloat(prod.rating) || 0;
            const stars = rating > 0 ? "★".repeat(Math.round(rating)) + "☆".repeat(5 - Math.round(rating)) : "☆☆☆☆☆";
            const isNew = index === 0; // أول منتج مُضاف يُعرض كأحدث إصدار

            const card = document.createElement('div');
            card.className = "product-card";
            card.innerHTML = `
                <div class="product-image">
                    ${isNew ? '<span class="product-badge">جديد</span>' : ''}
                    ${BOTTLE_SVG}
                </div>
                <div class="product-body">
                    <span class="product-category">${prod.category || 'VORA'}</span>
                    <h4 class="product-name">${prod.name}</h4>
                    <p class="product-desc">${prod.description || ''}</p>
                    <div class="product-rating">
                        <span>${stars}</span>
                        <span class="text-gray-400 text-xs">(${prod.ratingCount || 0})</span>
                    </div>
                    <div class="product-footer">
                        <span class="product-price">${prod.price} <small>ج.م</small></span>
                        <button onclick="addToCart('${prod.id}', '${prod.name}', ${prod.price})" class="btn-icon-circle" title="أضف للسلة">
                            🛍️
                        </button>
                    </div>
                </div>
            `;
            container.appendChild(card);
        });
    } catch (err) {
        container.innerHTML = `<p class="text-red-500 text-center col-span-full py-12">حدث خطأ أثناء تحميل المنتجات. يرجى إعادة المحاولة.</p>`;
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
    showMessage(`تم إضافة عطر (${name}) إلى سلتك بنجاح!`);
};

function updateCartCount() {
    const cart = JSON.parse(localStorage.getItem('vora_cart')) || [];
    const totalQty = cart.reduce((sum, item) => sum + item.qty, 0);
    document.getElementById('cartCount').textContent = totalQty;
}

window.logout = function() {
    localStorage.removeItem('vora_user');
    localStorage.removeItem('vora_cart');
    window.location.href = "index.html";
};

window.hideMessage = hideMessage;
