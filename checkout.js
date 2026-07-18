import Icon from './icons.js';
import { placeOrder, getSettingsFromFirestore } from "./sheets-service.js";
import { escapeHTML } from "./security-utils.js";
import { showMessage, hideMessage } from "./firebase-config.js";

const DEFAULT_SHIPPING = {
    [t('govCairo')]: 50, [t('govGiza')]: 50, [t('govAlex')]: 70, [t('govDakahlia')]: 80,
    [t('govSharqia')]: 80, [t('govQalyubia')]: 60, [t('govKafr')]: 80, [t('govGharbia')]: 80,
    [t('govMonufia')]: 80, [t('govBeheira')]: 80, [t('govIsmailia')]: 90, [t('govSuez')]: 90,
    [t('govBeniSuef')]: 100, [t('govFayoum')]: 100, [t('govMinya')]: 120, [t('govAsyut')]: 130,
    [t('govSohag')]: 130, [t('govQena')]: 140, [t('govLuxor')]: 150, [t('govAswan')]: 160,
    [t('govRedSea')]: 150, [t('govNewValley')]: 200, [t('govMatrouh')]: 150,
    [t('govNorthSinai')]: 180, [t('govSouthSinai')]: 180, [t('govDamietta')]: 80, [t('govPortSaid')]: 90
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
    await loadSettingsFromCloud();
    initStripe();
    loadCartItems();
    setupPaymentMethodListeners();
    loadInstapayInfo();
});

async function loadSettingsFromCloud() {
    try {
        const cloud = await getSettingsFromFirestore();
        if (cloud) localStorage.setItem('vora_settings', JSON.stringify(cloud));
    } catch (e) { /* stay with local */ }
}

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
        const safeItemName = escapeHTML(item.name);
        itemDiv.innerHTML = `<div><p class="font-semibold text-stone-900">${safeItemName}</p><p class="text-sm text-stone-500">${item.qty} × ${item.price} ${t('currency')}</p></div><p class="font-bold text-amber-600">${itemTotal} ${t('currency')}</p>`;
        orderItems.appendChild(itemDiv);
        const sidebarDiv = document.createElement('div');
        sidebarDiv.className = 'flex justify-between text-sm py-2 border-b border-stone-100 last:border-0';
        sidebarDiv.innerHTML = `<span class="text-stone-600">${safeItemName} ×${item.qty}</span><span class="font-semibold text-stone-900">${itemTotal} ${t('currency')}</span>`;
        sidebarItems.appendChild(sidebarDiv);
    });
    itemCount.textContent = itemsCount;
    if (appliedDiscount > 0) {
        updateTotalsWithDiscount();
    } else {
        updateTotals(total, 0);
    }
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
    if (appliedDiscount > 0) {
        updateTotalsWithDiscount();
    } else {
        updateTotals(subtotal, shipping);
    }
};

function updateTotals(subtotal, shipping) {
    const total = subtotal + shipping;
    document.getElementById('subtotal').textContent = `${subtotal} ${t('currency')}`;
    document.getElementById('shippingCost').innerHTML = shipping > 0 ? `${shipping} ${t('currency')}` : shipping === 0 && document.getElementById('governorate').value ? `${t('cartFree')} ${Icon.check()}` : `${t('checkoutGovernorate')}`;
    document.getElementById('total').textContent = `${total} ${t('currency')}`;
    document.getElementById('sidebarTotal').textContent = `${total} ${t('currency')}`;
    localStorage.setItem('vora_checkout_total', total);
    localStorage.setItem('vora_cart_total', subtotal);
}

function loadInstapayInfo() {
    const settings = JSON.parse(localStorage.getItem('vora_settings')) || {};
    const el = document.getElementById('instapayDisplay');
    if (settings.instaName) {
        el.innerHTML = `${escapeHTML(settings.instaName)}<br><span dir="ltr" class="text-blue-600">${escapeHTML(settings.instaNumber || '')}</span>`;
    } else {
        el.textContent = t('checkoutInstapayRequired');
    }
}

let appliedDiscount = 0;

window.applyCoupon = function() {
    const code = document.getElementById('couponCode').value.trim().toUpperCase();
    const msg = document.getElementById('couponMessage');
    const settings = JSON.parse(localStorage.getItem('vora_settings')) || {};
    const coupons = settings.coupons || {};
    if (!code) {
        msg.className = 'text-xs mt-1 text-red-600';
        msg.textContent = t('checkoutDiscountPrompt');
        msg.classList.remove('hidden');
        return;
    }
    if (coupons[code]) {
        appliedDiscount = parseFloat(coupons[code]) || 0;
        msg.className = 'text-xs mt-1 text-green-600';
        msg.textContent = `${Icon.check()} تم تطبيق الخصم! خصم ${appliedDiscount}%`;
        msg.classList.remove('hidden');
        document.getElementById('discountRow').style.display = 'flex';
        updateTotalsWithDiscount();
    } else {
        appliedDiscount = 0;
        msg.className = 'text-xs mt-1 text-red-600';
        msg.textContent = '❌ كود الخصم غير صالح';
        msg.classList.remove('hidden');
        document.getElementById('discountRow').style.display = 'none';
        updateTotalsWithDiscount();
    }
};

function updateTotalsWithDiscount() {
    const cart = JSON.parse(localStorage.getItem('vora_cart')) || [];
    const subtotal = cart.reduce((s, i) => s + (i.price * i.qty), 0);
    const gov = document.getElementById('governorate').value;
    const rates = getShippingRates();
    const shipping = gov && rates[gov] ? rates[gov] : 0;
    const discount = subtotal * (appliedDiscount / 100);
    const total = subtotal + shipping - discount;
    document.getElementById('subtotal').textContent = `${subtotal} ${t('currency')}`;
    document.getElementById('shippingCost').innerHTML = shipping > 0 ? `${shipping} ${t('currency')}` : shipping === 0 && gov ? `${t('cartFree')} ${Icon.check()}` : `${t('checkoutGovernorate')}`;
    document.getElementById('discountAmount').textContent = `-${Math.round(discount)} ${t('currency')}`;
    document.getElementById('total').textContent = `${Math.round(total)} ${t('currency')}`;
    document.getElementById('sidebarTotal').textContent = `${Math.round(total)} ${t('currency')}`;
    localStorage.setItem('vora_checkout_total', Math.round(total));
    localStorage.setItem('vora_cart_total', subtotal);
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
        const discountAmount = subtotal * (appliedDiscount / 100);
        const total = subtotal + shippingCost - discountAmount;
        const orderData = {
            customerName: document.getElementById('customerName').value,
            customerPhone: document.getElementById('customerPhone').value,
            customerAddress: document.getElementById('customerAddress').value,
            governorate: gov,
            paymentMethod: paymentMethod,
            items: cart.map(i => `${i.name} (${i.qty})`).join(' + '),
            itemDetails: JSON.stringify(cart),
            total: Math.round(total),
            shippingCost: shippingCost,
            subtotal: subtotal,
            discount: appliedDiscount > 0 ? `${appliedDiscount}%` : '',
            orderDate: new Date().toISOString(),
            date: new Date().toLocaleString('ar-EG'),
            status: t('statusPending'),
            userEmail: document.getElementById('customerEmail').value.trim()
        };
        if (paymentMethod === 'card') {
            showMessage('⚠️ الدفع الإلكتروني بالكارت غير مفعّل حالياً على الموقع. برجاء اختيار فودافون كاش أو إنستاباي أو الدفع عند الاستلام.');
            showLoading(false);
            return;
        } else if (paymentMethod === 'vodafone') {
            const vf = document.getElementById('vodafoneNumber').value;
            if (!vf || vf.length < 11) { showMessage('⚠️ رقم فودافون غير صحيح'); showLoading(false); return; }
            orderData.vodafoneNumber = vf;
        }
        orderData.orderId = 'VORA-' + Date.now();
        localStorage.setItem('vora_lastOrder', JSON.stringify(orderData));
        localStorage.setItem('vora_orders', JSON.stringify([...(JSON.parse(localStorage.getItem('vora_orders')) || []), { ...orderData, timestamp: Date.now() }]));
        // Save address for account page
        const addrEntry = { name: document.getElementById('customerName').value, phone: document.getElementById('customerPhone').value, address: document.getElementById('customerAddress').value, governorate: document.getElementById('governorate').value };
        let addresses = JSON.parse(localStorage.getItem('vora_addresses')) || [];
        const addrExists = addresses.find(a => a.name === addrEntry.name && a.phone === addrEntry.phone);
        if (!addrExists) addresses.push(addrEntry);
        localStorage.setItem('vora_addresses', JSON.stringify(addresses));
        const saved = await submitOrderToSheet(orderData);
        if (!saved) {
            showMessage('⚠️ تم تسجيل طلبك محلياً، لكن حدث خطأ في إرساله لقاعدة البيانات. برجاء إبلاغنا برقم الطلب ' + orderData.orderId + ' عبر واتساب للتأكيد.');
            showLoading(false);
            return;
        }
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
        const result = await placeOrder({
            ...orderData,
            action: 'placeOrder'
        });
        return !!(result && result.success);
    } catch (e) {
        console.error('Order save failed:', e);
        return false;
    }
}

function validateForm() {
    const name = document.getElementById('customerName').value.trim();
    const phone = document.getElementById('customerPhone').value.trim();
    const email = document.getElementById('customerEmail').value.trim();
    const address = document.getElementById('customerAddress').value.trim();
    const governorate = document.getElementById('governorate').value;
    const errors = [];
    if (!name) errors.push(t('checkoutName'));
    if (!phone) errors.push(t('checkoutPhone'));
    if (!email) errors.push(t('checkoutEmail'));
    if (!address) errors.push(t('checkoutAddress'));
    if (!governorate) errors.push(t('checkoutGovernorate'));
    if (errors.length > 0) { showMessage(t('checkoutRequiredFields')); return false; }
    if (!/^01[0-2][0-9]{8}$/.test(phone)) { showMessage(t('checkoutPhoneInvalid')); return false; }
    return true;
}

function showLoading(show, text = t('checkoutProcessing')) {
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
