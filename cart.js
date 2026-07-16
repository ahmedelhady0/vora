// cart.js
import { placeOrder } from "./sheets-service.js";
import { showMessage, hideMessage } from "./firebase-config.js";
import { escapeHTML } from "./security-utils.js";

// التحقق من تسجيل الدخول
document.addEventListener("DOMContentLoaded", () => {
    renderCart();
});

// عرض محتويات السلة وتحديث الإجماليات
function renderCart() {
    const cart = JSON.parse(localStorage.getItem('vora_cart')) || [];
    const content = document.getElementById('cartContent');
    const form = document.getElementById('checkoutForm');

    if (cart.length === 0) {
        content.innerHTML = `<p class="text-gray-500 text-center py-12">${t('cartEmptyMsg')}</p>`;
        form.classList.add('hidden');
        return;
    }

    form.classList.remove('hidden');
    content.innerHTML = "";

    cart.forEach((item, index) => {
        const row = document.createElement('div');
        row.className = "bg-white p-4 rounded border flex flex-col sm:flex-row justify-between items-center gap-4";
        row.style.borderColor = "var(--border)";
        
        // التحقق من وجود رابط الصورة السحابي للمنتج، وإذا لم يوجد نضع أيقونة زجاجة كاحتياط
        const itemImage = item.image ? item.image : 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="%23d6d3d1"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M19.5 21a3 3 0 003-3v-4.5a3 3 0 00-3-3h-15a3 3 0 00-3 3V18a3 3 0 003 3h15zM12 3v7.5M9 6h6"/></svg>';

        row.innerHTML = `
            <!-- إضافة حاوية الصورة والاسم معاً لتنسيق احترافي -->
            <div class="flex items-center gap-4 flex-1 w-full sm:w-auto text-right">
                <!-- 👈 عنصر الصورة المحدث والرابط السحابي -->
                <img src="${escapeHTML(itemImage)}" loading="lazy" class="w-16 h-16 rounded-lg object-cover border border-stone-200 flex-shrink-0" alt="${escapeHTML(item.name)}">
                
                <div class="min-w-0 flex-1">
                    <h4 class="text-base font-bold truncate" style="font-family: 'Playfair Display', serif; color: var(--text-primary);">${escapeHTML(item.name)}</h4>
                    <p class="text-sm font-medium" style="color: var(--primary);">${item.price} ${t('currency')}</p>
                </div>
            </div>
            
            <div class="flex items-center gap-3">
                <button onclick="changeQty(${index}, -1)" class="w-8 h-8 bg-gray-100 text-gray-700 rounded-full font-bold flex items-center justify-center hover:bg-gray-200">-</button>
                <span class="font-bold text-gray-800 w-6 text-center">${item.qty}</span>
                <button onclick="changeQty(${index}, 1)" class="w-8 h-8 bg-gray-100 text-gray-700 rounded-full font-bold flex items-center justify-center hover:bg-gray-200">+</button>
            </div>
            
            <div class="text-left flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
                <span class="font-bold text-gray-800 min-w-[80px] text-center">${item.price * item.qty} ${t('currency')}</span>
                <button onclick="removeItem(${index})" class="text-red-500 hover:text-red-700 transition-all">🗑️</button>
            </div>
        `;
        content.appendChild(row);
    });

    calculateTotal(cart);
}

// دالة لتعديل الكمية
window.changeQty = function(index, change) {
    let cart = JSON.parse(localStorage.getItem('vora_cart')) || [];
    cart[index].qty += change;

    if (cart[index].qty <= 0) {
        cart.splice(index, 1);
    }

    localStorage.setItem('vora_cart', JSON.stringify(cart));
    renderCart();
};

// دالة لحذف منتج تماماً من السلة
window.removeItem = function(index) {
    let cart = JSON.parse(localStorage.getItem('vora_cart')) || [];
    cart.splice(index, 1);
    localStorage.setItem('vora_cart', JSON.stringify(cart));
    renderCart();
};

// حساب المجموع الكلي
function calculateTotal(cart) {
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
    document.getElementById('subtotalPrice').textContent = `${subtotal} ${t('currency')}`;
    document.getElementById('totalPrice').textContent = `${subtotal} ${t('currency')}`;
}

// إرسال الطلب لجوجل شيت
window.submitOrder = async function() {
    const name = document.getElementById('customerName').value.trim();
    const phone = document.getElementById('customerPhone').value.trim();
    const address = document.getElementById('customerAddress').value.trim();
    const email = document.getElementById('customerEmail').value.trim();

    if (!name || !phone || !address || !email) {
        return showMessage(t('checkoutRequired'));
    }

    const cart = JSON.parse(localStorage.getItem('vora_cart')) || [];
    if (cart.length === 0) return;

    const itemsSummary = cart.map(item => `${item.name} (${item.qty} ${t('pieces')})`).join(' + ');
    const totalAmount = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);

    const orderData = {
        userEmail: email,
        customerName: name,
        customerPhone: phone,
        customerAddress: address,
        items: itemsSummary,
        total: totalAmount,
        status: t('statusPending'),
        date: new Date().toLocaleString('ar-EG')
    };

    showMessage(t('checkoutProcessing'));

    try {
        const response = await placeOrder(orderData);
        if (response.success) {
            localStorage.removeItem('vora_cart');
            showMessage(t('orderSuccess'));
            setTimeout(() => {
                window.location.href = "home.html";
            }, 2500);
        } else {
            showMessage(`${t('orderFailed')}: ${response.error}`);
        }
    } catch (err) {
        showMessage(t('orderError'));
    }
};

window.hideMessage = hideMessage;
