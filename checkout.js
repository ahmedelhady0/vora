import { placeOrder } from "./sheets-service.js";
import { showMessage, hideMessage } from "./firebase-config.js";

const DEFAULT_SHIPPING = {
    "القاهرة": 50, "الجيزة": 50, "الإسكندرية": 70, "الدقهلية": 80,
    "الشرقية": 80, "القليوبية": 60, "كفر الشيخ": 80, "الغربية": 80,
    "المنوفية": 80, "البحيرة": 80, "الإسماعيلية": 90, "السويس": 90,
    "بني سويف": 100, "الفيوم": 100, "المنيا": 120, "أسيوط": 130,
    "سوهاج": 130, "قنا": 140, "الأقصر": 150, "أسوان": 160,
    "البحر الأحمر": 150, "الوادي الجديد": 200, "مطروح": 150,
    "شمال سيناء": 180, "جنوب سيناء": 180, "دمياط": 80, "بورسعيد": 90
};

let stripe, elements, cardElement;

async function initStripe() {
    stripe = Stripe('pk_test_4eC39HqLyjWDarhtT1ZIdwO7');
    elements = stripe.elements();
    cardElement = elements.create('card', {
        style: {
            base: { fontFamily: 'Alexandria, sans-serif', fontSize: '16px', color: '#424770', '::placeholder': { color: '#aab7c4' } },
            invalid: { color: '#fa755a', iconColor: '#fa755a' }
        }
    });
    cardElement.mount('#card-element');
    cardElement.addEventListener('change', function(event) {
        const displayError = document.getElementById('card-errors');
        displayError.textContent = event.error ? event.error.message : '';
    });
}

document.addEventListener("DOMContentLoaded", async () => {
    initStripe();
    loadCartItems();
    setupPaymentMethodListeners();
    loadInstapayInfo();
});

function loadCartItems() {
    const cart = JSON.parse(localStorage.getItem('vora_cart')) || [];
    const orderItems = document.getElementById('orderItems');
    const sidebarItems = document.getElementById('sidebarItems');
    const itemCount = document.getElementById('itemCount');
    orderItems.innerHTML = '';
    sidebarItems.innerHTML = '';
    let total = 0;
    let itemsCount = 0;
    if (cart.length === 0) {
        orderItems.innerHTML = '<p class="text-stone-500 py-4">السلة فارغة</p>';
        updateTotals(0, 0);
        return;
    }
    cart.forEach(item => {
        const itemTotal = item.price * item.qty;
        total += itemTotal;
        itemsCount += item.qty;
        const itemDiv = document.createElement('div');
        itemDiv.className = 'flex justify-between items-center py-2 border-b border-stone-100 last:border-0';
        itemDiv.innerHTML = `<div><p class="font-semibold text-stone-900">${item.name}</p><p class="text-sm text-stone-500">${item.qty} × ${item.price} ${t('currency')}</p></div><p class="font-bold text-amber-600">${itemTotal} ${t('currency')}</p>`;
        orderItems.appendChild(itemDiv);
        const sidebarDiv = document.createElement('div');
        sidebarDiv.className = 'flex justify-between text-sm py-2 border-b border-stone-100 last:border-0';
        sidebarDiv.innerHTML = `<span class="text-stone-600">${item.name} ×${item.qty}</span><span class="font-semibold text-stone-900">${itemTotal} ${t('currency')}</span>`;
        sidebarItems.appendChild(sidebarDiv);
    });
    itemCount.textContent = itemsCount;
    updateTotals(total, 0);
}

function getShippingRates() {
    try { return JSON.parse(localStorage.getItem('vora_shipping')) || DEFAULT_SHIPPING; }
    catch { return DEFAULT_SHIPPING; }
}

window.updateShipping = function() {
    const gov = document.getElementById('governorate').value;
    const subtotal = parseFloat(localStorage.getItem('vora_cart_total') || 0);
    const rates = getShippingRates();
    const shipping = gov && rates[gov] ? rates[gov] : 0;
    updateTotals(subtotal, shipping);
};

function updateTotals(subtotal, shipping) {
    const total = subtotal + shipping;
    document.getElementById('subtotal').textContent = `${subtotal} ${t('currency')}`;
    document.getElementById('shippingCost').textContent = shipping > 0 ? `${shipping} ${t('currency')}` : shipping === 0 && document.getElementById('governorate').value ? `${t('cartFree')} ✓` : `${t('checkoutGovernorate')}`;
    document.getElementById('total').textContent = `${total} ${t('currency')}`;
    document.getElementById('sidebarTotal').textContent = `${total} ${t('currency')}`;
    localStorage.setItem('vora_checkout_total', total);
    localStorage.setItem('vora_cart_total', subtotal);
}

function loadInstapayInfo() {
    const settings = JSON.parse(localStorage.getItem('vora_settings')) || {};
    const el = document.getElementById('instapayDisplay');
    if (settings.instaName) {
        el.innerHTML = `${settings.instaName}<br><span dir="ltr" class="text-blue-600">${settings.instaNumber || ''}</span>`;
    } else {
        el.textContent = 'يرجى إضافة بيانات InstaPay من لوحة الإدارة';
    }
}

function setupPaymentMethodListeners() {
    document.querySelectorAll('input[name="paymentMethod"]').forEach(radio => {
        radio.addEventListener('change', function() {
            document.getElementById('cardContainer').classList.toggle('hidden', this.value !== 'card');
            document.getElementById('vodafoneContainer').classList.toggle('hidden', this.value !== 'vodafone');
            document.getElementById('instapayContainer').classList.toggle('hidden', this.value !== 'instapay');
        });
    });
}

window.submitOrder = async function() {
    const paymentMethod = document.querySelector('input[name="paymentMethod"]:checked').value;
    if (!validateForm()) { showMessage('⚠️ يرجى ملء جميع الحقول بشكل صحيح'); return; }
    showLoading(true, 'جاري معالجة طلبك...');
    try {
        const gov = document.getElementById('governorate').value;
        const rates = getShippingRates();
        const shippingCost = rates[gov] || 0;
        const cart = JSON.parse(localStorage.getItem('vora_cart')) || [];
        const subtotal = cart.reduce((s, i) => s + (i.price * i.qty), 0);
        const total = subtotal + shippingCost;
        const orderData = {
            customerName: document.getElementById('customerName').value,
            customerPhone: document.getElementById('customerPhone').value,
            customerAddress: document.getElementById('customerAddress').value,
            governorate: gov,
            deliveryDate: document.getElementById('deliveryDate').value,
            paymentMethod: paymentMethod,
            items: cart.map(i => `${i.name} (${i.qty})`).join(' + '),
            itemDetails: JSON.stringify(cart),
            total: total,
            shippingCost: shippingCost,
            subtotal: subtotal,
            orderDate: new Date().toISOString(),
            date: new Date().toLocaleString('ar-EG'),
            status: 'قيد المراجعة',
            userEmail: document.getElementById('customerEmail').value.trim()
        };
        if (paymentMethod === 'card') {
            const { token } = await stripe.createToken(cardElement);
            if (token) orderData.stripeToken = token.id;
        } else if (paymentMethod === 'vodafone') {
            const vf = document.getElementById('vodafoneNumber').value;
            if (!vf || vf.length < 11) { showMessage('⚠️ رقم فودافون غير صحيح'); showLoading(false); return; }
            orderData.vodafoneNumber = vf;
        }
        orderData.orderId = 'VORA-' + Date.now();
        localStorage.setItem('vora_lastOrder', JSON.stringify(orderData));
        localStorage.setItem('vora_orders', JSON.stringify([...(JSON.parse(localStorage.getItem('vora_orders')) || []), { ...orderData, timestamp: Date.now() }]));
        await submitOrderToSheet(orderData);
        localStorage.removeItem('vora_cart');
        showMessage('✓ تم استلام طلبك بنجاح! جاري تحويلك لصفحة التأكيد...');
        setTimeout(() => { window.location.href = 'confirmation.html'; }, 1500);
    } catch (error) {
        console.error('Error:', error);
        showMessage('❌ حدث خطأ في معالجة الطلب. يرجى المحاولة مجدداً');
    } finally { showLoading(false); }
};

async function submitOrderToSheet(orderData) {
    try {
        await placeOrder({
            action: 'placeOrder',
            userEmail: orderData.userEmail,
            customerName: orderData.customerName,
            customerPhone: orderData.customerPhone,
            customerAddress: orderData.customerAddress,
            governorate: orderData.governorate,
            paymentMethod: orderData.paymentMethod,
            items: orderData.items,
            total: orderData.total,
            status: orderData.status,
            date: orderData.date
        });
    } catch (e) { console.log('Sheets save optional:', e); }
}

function validateForm() {
    const name = document.getElementById('customerName').value.trim();
    const phone = document.getElementById('customerPhone').value.trim();
    const email = document.getElementById('customerEmail').value.trim();
    const address = document.getElementById('customerAddress').value.trim();
    const governorate = document.getElementById('governorate').value;
    const deliveryDate = document.getElementById('deliveryDate').value;
    if (!name || !phone || !email || !address || !governorate || !deliveryDate) return false;
    if (!/^01[0-2][0-9]{8}$/.test(phone)) { showMessage('⚠️ رقم الهاتف يجب أن يكون 11 رقماً مصرياً (مثال: 01012345678)'); return false; }
    return true;
}

function showLoading(show, text = 'جاري المعالجة...') {
    const loadingBox = document.getElementById('loadingBox');
    const loadingText = document.getElementById('loadingText');
    if (show) { loadingText.textContent = text; loadingBox.classList.remove('hidden'); document.getElementById('submitBtn').disabled = true; }
    else { loadingBox.classList.add('hidden'); document.getElementById('submitBtn').disabled = false; }
}

window.showMessage = showMessage;
window.hideMessage = function() { hideMessage(); };

document.addEventListener('change', function(e) {
    if (e.target.id === 'governorate') updateShipping();
});
