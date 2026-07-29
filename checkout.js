import Icon from './icons.js';
import { placeOrder, getSettingsFromFirestore } from "./sheets-service.js";
import { escapeHTML } from "./security-utils.js";
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
        const displayName = item.variantLabel ? `${escapeHTML(item.name)} (${escapeHTML(item.variantLabel)})` : escapeHTML(item.name);
        itemDiv.innerHTML = `<div><p class="font-semibold text-stone-900">${displayName}</p><p class="text-sm text-stone-500">${item.qty} × ${item.price} ${t('currency')}</p></div><p class="font-bold text-amber-600">${itemTotal} ${t('currency')}</p>`;
        orderItems.appendChild(itemDiv);
        const sidebarDiv = document.createElement('div');
        sidebarDiv.className = 'flex justify-between text-sm py-2 border-b border-stone-100 last:border-0';
        sidebarDiv.innerHTML = `<span class="text-stone-600">${displayName} ×${item.qty}</span><span class="font-semibold text-stone-900">${itemTotal} ${t('currency')}</span>`;
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
        const wa = settings.whatsapp || (settings.instaNumber || '').replace(/^0/, '20') || '201000000000';
        const msg = encodeURIComponent(t('checkoutInstapayNoteWhatsapp'));
        el.innerHTML = `${escapeHTML(settings.instaName)}<br><span dir="ltr" class="text-blue-600">${escapeHTML(settings.instaNumber || '')}</span>`;
        const link = document.getElementById('instapayWhatsappLink') || document.createElement('a');
        if (!link.id) {
            link.id = 'instapayWhatsappLink';
            link.target = '_blank';
            link.className = 'inline-flex items-center gap-1.5 mt-2 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold rounded-lg transition w-fit';
            link.innerHTML = `<svg class="w-4 h-4 inline-block align-middle" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg> <span data-i18n="checkoutInstapaySendWhatsapp"></span>`;
            link.href = `https://wa.me/${wa}?text=${msg}`;
            el.parentNode.appendChild(link);
        } else {
            link.href = `https://wa.me/${wa}?text=${msg}`;
        }
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
        msg.textContent = `${Icon.check()} ${t('checkoutCouponApplied').replace('{discount}', appliedDiscount)}`;
        msg.classList.remove('hidden');
        document.getElementById('discountRow').style.display = 'flex';
        updateTotalsWithDiscount();
    } else {
        appliedDiscount = 0;
        msg.className = 'text-xs mt-1 text-red-600';
        msg.textContent = `❌ ${t('checkoutCouponInvalid')}`;
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
            items: cart.map(i => `${i.name}${i.variantLabel ? ` (${i.variantLabel})` : ''} (${i.qty})`).join(' + '),
            itemDetails: JSON.stringify(cart),
            total: Math.round(total),
            shippingCost: shippingCost,
            subtotal: subtotal,
            discount: appliedDiscount > 0 ? `${appliedDiscount}%` : '',
            orderDate: new Date().toISOString(),
            date: new Date().toLocaleString(getLang() === 'ar' ? 'ar-EG' : 'en-US'),
            status: t('statusPending'),
            userEmail: document.getElementById('customerEmail').value.trim()
        };
        if (paymentMethod === 'card') {
            showMessage(t('checkoutCardNotAvailable'));
            showLoading(false);
            return;
        } else if (paymentMethod === 'vodafone') {
            const vf = document.getElementById('vodafoneNumber').value;
            if (!vf || vf.length < 11) { showMessage(t('checkoutInvalidVodafone')); showLoading(false); return; }
            orderData.vodafoneNumber = vf;
        }
        orderData.orderId = 'VORA-' + Date.now();
        localStorage.setItem('vora_lastOrder', JSON.stringify(orderData));
        // Save address for account page
        const addrEntry = { name: document.getElementById('customerName').value, phone: document.getElementById('customerPhone').value, address: document.getElementById('customerAddress').value, governorate: document.getElementById('governorate').value };
        let addresses = JSON.parse(localStorage.getItem('vora_addresses')) || [];
        const addrExists = addresses.find(a => a.name === addrEntry.name && a.phone === addrEntry.phone);
        if (!addrExists) addresses.push(addrEntry);
        localStorage.setItem('vora_addresses', JSON.stringify(addresses));
        const saved = await submitOrderToSheet(orderData);
        if (!saved) {
            showMessage(t('checkoutLocalOnly').replace('{orderId}', orderData.orderId));
            showLoading(false);
            return;
        }
        localStorage.removeItem('vora_cart');
        showMessage(`✅ ${t('checkoutSuccess')}`);
        setTimeout(() => { window.location.href = 'confirmation.html'; }, 1500);
    } catch (error) {
        console.error('Error:', error);
        showMessage(`❌ ${t('checkoutError')}`);
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
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { showMessage(t('checkoutEmailInvalid')); return false; }
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
