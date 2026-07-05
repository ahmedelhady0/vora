// home.js
import { getProducts } from "./sheets-service.js";
import { showMessage, hideMessage } from "./firebase-config.js";

// التحقق من الجلسة والصلاحيات عند فتح الصفحة
const userData = JSON.parse(localStorage.getItem('vora_user'));
if (!userData) {
    window.location.href = "index.html";
}

document.addEventListener("DOMContentLoaded", () => {
    // عرض اسم المستخدم في الترحيب
    document.getElementById('welcomeName').textContent = userData.username;

    // إذا كان الأدمن، إظهار زر لوحة التحكم في الهيدر
    if (userData.role === 'admin' || userData.role === 'manager') {
        const navActions = document.getElementById('navActions');
        const adminBtn = document.createElement('a');
        adminBtn.href = "admin.html";
        adminBtn.className = "bg-rose-600 text-white px-5 py-2.5 rounded-xl font-medium hover:bg-rose-700 transition-all";
        adminBtn.textContent = "💼 لوحة الإدارة";
        navActions.insertBefore(adminBtn, navActions.firstChild);
    }

    updateCartCount();
    loadProducts();
});

// جلب المنتجات من شيت الاكسيل وعرضها
async function loadProducts() {
    const container = document.getElementById('productsContainer');
    try {
        const products = await getProducts();
        container.innerHTML = ""; // تنظيف رسالة التحميل

        if (products.length === 0) {
            container.innerHTML = `<p class="text-gray-500 text-center col-span-full py-12">لا توجد عطور متوفرة حالياً في المخزن.</p>`;
            return;
        }

        products.forEach(prod => {
            // حساب نجوم التقييم بناءً على القيمة القادمة من الشيت
            const rating = parseFloat(prod.rating) || 0;
            const stars = "⭐".repeat(Math.round(rating)) || "لا توجد تقييمات";

            const card = document.createElement('div');
            card.className = "bg-white p-5 rounded-2xl border border-pink-100 shadow-sm hover:shadow-md transition-all flex flex-col justify-between";
            card.innerHTML = `
                <div>
                    <div class="h-48 bg-pink-50 rounded-xl mb-4 flex items-center justify-center text-pink-300 font-bold text-lg">
                        📸 صورة العطر (${prod.category || 'Vora'})
                    </div>
                    <h4 class="text-xl font-bold text-gray-800 mb-1">${prod.name}</h4>
                    <p class="text-sm text-gray-500 mb-2">${prod.description || ''}</p>
                    <div class="flex items-center gap-1 text-sm text-amber-500 mb-4">
                        <span>${stars}</span>
                        <span class="text-gray-400 text-xs">(${prod.ratingCount || 0})</span>
                    </div>
                </div>
                <div class="flex items-center justify-between mt-4">
                    <span class="text-xl font-bold text-pink-700">${prod.price} ج.م</span>
                    <button onclick="addToCart('${prod.id}', '${prod.name}', ${prod.price})" class="bg-pink-600 text-white text-sm px-4 py-2 rounded-xl font-medium hover:bg-pink-700 transition-all">
                        🛒 أضف للسلة
                    </button>
                </div>
            `;
            container.appendChild(card);
        });
    } catch (err) {
        container.innerHTML = `<p class="text-red-500 text-center col-span-full py-12">حدث خطأ أثناء تحميل المنتجات. يرجى إعادة المحاولة.</p>`;
    }
}

// دالة إضافة المنتجات للسلة المؤقتة
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
