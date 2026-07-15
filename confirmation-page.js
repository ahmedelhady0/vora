import Icon from './icons.js';

const order = JSON.parse(localStorage.getItem('vora_lastOrder'));
const el = document.getElementById('orderDetails');

if (order) {
    const settings = JSON.parse(localStorage.getItem('vora_settings')) || {};
    document.getElementById('whatsappDisplay').textContent = settings.whatsapp || '01000000000';

    const payMethod = order.paymentMethod === 'instapay' ? t('checkoutInstapay') : order.paymentMethod === 'cash' ? t('checkoutCod') : order.paymentMethod === 'vodafone' ? t('footerVodafoneCash') : t('footerVisa');

    el.innerHTML = `
        <div class="flex justify-between text-stone-600 text-sm">
            <span>${t('orderId')}:</span>
            <span class="font-bold text-stone-900" dir="ltr">#${order.orderId}</span>
        </div>
        <div class="flex justify-between text-stone-600 text-sm">
            <span>${t('orderDate')}:</span>
            <span class="font-bold text-stone-900">${order.date}</span>
        </div>
        <div class="flex justify-between text-stone-600 text-sm">
            <span>${t('orderPayment')}:</span>
            <span class="font-bold text-stone-900">${payMethod}</span>
        </div>
        <div class="flex justify-between text-stone-600 text-sm">
            <span>${t('orderGovernorate')}:</span>
            <span class="font-bold text-stone-900">${order.governorate}</span>
        </div>
        <div class="border-t border-amber-200 pt-3 mt-3 flex justify-between font-bold text-amber-700">
            <span>${t('orderTotalPaid')}:</span>
            <span>${order.total} ${t('currency')}</span>
        </div>
        <a href="tracking.html?orderId=${order.orderId}" class="block mt-4 text-center text-sm text-blue-600 hover:text-blue-800 font-semibold">${Icon.pkg()} ${t('orderTrackOnMap')}</a>
    `;
} else {
    el.innerHTML = `<p class="text-stone-500 text-sm">${t('orderNotFoundHint')}</p>`;
}
