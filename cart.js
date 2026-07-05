// cart.js
import { placeOrder } from "./sheets-service.js";
import { showMessage, hideMessage } from "./firebase-config.js";

// التحقق من تسجيل الدخول
const userData = JSON.parse(localStorage.getItem('vora_user'));
if (!userData) {
    window.location.href = "index.html";
}

document.addEventListener("DOMContentLoaded", () => {
    renderCart();
});

// عرض محتويات السلة وتحديث الإجماليات
function renderCart() {
    const cart = JSON.parse(localStorage.getItem('vora_cart')) || [];
    const content = document.getElementById('cartContent');
    const form = document.getElementById('checkoutForm');

    if (cart.length === 0) {
        content.innerHTML = `<p class="text-gray-500 text-center py-12">السلة فارغة حالياً.. اذهب للرئيسية واكتشف عطورنا الفاخرة!</p>`;
        form.classList.add('hidden');
        return;
    }

    form.classList.remove('hidden');
    content.innerHTML = "";

    cart.forEach((item, index) => {
        const row = document.createElement('div');
        row.className = "bg-white p-4 rounded-xl border border-pink-100 flex flex-col sm:flex-row justify-between items-center gap-4 shadow-sm";
        row.innerHTML = `
            <div class="flex-1 text-center sm:text-right">
                <h4 class="text-lg font-bold text-gray-800">${item.name}</h4>
                <p class="text-sm text-pink-600 font-medium">${item.price} ج.م</p>
            </div>
            <div class="flex items-center gap-3">
                <button onclick="changeQty(${index}, -1)" class="w-8 h-8 bg-gray-100 text-gray-700 rounded-full font-bold flex items-center justify-center hover:bg-gray-200">-</button>
                <span class="font-bold text-gray-800 w-6 text-center">${item.qty}</span>
                <button onclick="changeQty(${index}, 1)" class="w-8 h-8 bg-gray-100 text-gray-700 rounded-full font-bold flex items-center justify-center hover:bg-gray-200">+</button>
            </div>
            <div class="text-left flex items-center gap-4">
                <span class="font-bold text-gray-800 min-w-[80px] text-center">${item.price * item.qty} ج.م</span>
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
    document.getElementById('subtotalPrice').textContent = `${subtotal} ج.م`;
    document.getElementById('totalPrice').textContent = `${subtotal} ج.م`;
}

// إرسال الطلب لجوجل شيت
window.submitOrder = async function() {
    const name = document.getElementById('customerName').value.trim();
    const phone = document.getElementById('customerPhone').value.trim();
    const address = document.getElementById('customerAddress').value.trim();

    if (!name || !phone || !address) {
        return showMessage("يرجى ملء جميع تفاصيل الشحن والتوصيل");
    }

    const cart = JSON.parse(localStorage.getItem('vora_cart')) || [];
    if (cart.length === 0) return;

    // تجهيز تفاصيل المنتجات في نص واحد لعرضه في عمود واحد بالشيت
    const itemsSummary = cart.map(item => `${item.name} (${item.qty} قطع)`).join(' + ');
    const totalAmount = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);

    const orderData = {
        userEmail: userData.email,
        customerName: name,
        customerPhone: phone,
        customerAddress: address,
        items: itemsSummary,
        total: totalAmount,
        status: "قيد المراجعة",
        date: new Date().toLocaleString('ar-EG')
    };

    showMessage("جاري إرسال طلبك الفاخر إلى النظام...");

    try {
        const response = await placeOrder(orderData);
        if (response.success) {
            localStorage.removeItem('vora_cart'); // تفريغ السلة بعد نجاح الطلب
            showMessage("تم استلام طلبك بنجاح! شكراً لاختيارك Vora ✨");
            setTimeout(() => {
                window.location.href = "home.html";
            }, 2500);
        } else {
            showMessage(`عذراً، فشل إرسال الطلب: ${response.error}`);
        }
    } catch (err) {
        showMessage("حدث خطأ في الاتصال بالخادم، يرجى المحاولة مرة أخرى.");
    }
};

window.hideMessage = hideMessage;
