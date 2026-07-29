import Icon from './icons.js';

window.trackOrder = function(e) {
    e.preventDefault();
    const orderId = document.getElementById('orderIdInput').value.trim();
    const orders = JSON.parse(localStorage.getItem('vora_orders')) || [];
    const order = orders.find(o => o.orderId === orderId);
    const result = document.getElementById('trackResult');
    if (!order) {
        const lang = localStorage.getItem('vora_lang') || 'ar';
        result.style.display = 'block';
        result.innerHTML = `<div class="bg-red-50 border border-red-200 rounded-2xl p-8 text-center">${Icon.close()}${Icon.close()}<p class="text-red-700 font-bold mt-3">${t('orderNotFound')}</p><p class="text-red-500 text-sm mt-1">${t('orderNotFoundHint')}</p></div>`;
        return false;
    }
    renderOrderStatus(order);
    return false;
};

function renderOrderStatus(order) {
    const lang = localStorage.getItem('vora_lang') || 'ar';
    const arStatuses = ['قيد المراجعة', 'قيد التجهيز', 'تم الشحن', 'تم التسليم'];
    const enStatuses = ['Pending Review', 'Processing', 'Shipped', 'Delivered'];
    const currentIdx = arStatuses.indexOf(order.status);
    const step = Math.max(0, currentIdx);
    const displayStatuses = lang === 'ar' ? arStatuses : enStatuses;
    const result = document.getElementById('trackResult');
    result.style.display = 'block';
    result.innerHTML = `
        <div class="bg-white rounded-2xl p-6 border border-stone-200">
            <div class="flex items-center justify-between mb-4">
                <span class="text-xs text-stone-400">${order.orderId}</span>
                <span class="text-xs text-stone-400">${order.orderDate ? new Date(order.orderDate).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US') : ''}</span>
            </div>

            <div class="flex items-center justify-between mb-6">
                ${displayStatuses.map((s, i) => `
                    <div class="flex flex-col items-center ${i <= step ? 'text-amber-600' : 'text-stone-300'}">
                        <div class="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 ${i <= step ? 'bg-amber-600 text-white border-amber-600' : 'border-stone-300 bg-white'}">${i + 1}</div>
                        <span class="text-[10px] mt-1 whitespace-nowrap font-semibold">${s}</span>
                    </div>
                `).join('')}
            </div>

            <div class="border-t border-stone-100 pt-4 space-y-2 text-sm">
                <div class="flex justify-between"><span class="text-stone-400">${t('orderCustomer')}:</span><span class="font-semibold">${order.customerName || ''}</span></div>
                <div class="flex justify-between"><span class="text-stone-400">${t('orderTotalPaid')}:</span><span class="font-bold text-amber-600">${order.total} ${t('currency')}</span></div>
                ${order.trackingId ? `<div class="flex justify-between"><span class="text-stone-400">${t('orderTracking')}:</span><span class="font-semibold text-blue-600">${order.trackingId}</span></div>` : ''}
                ${step >= 2 && arStatuses.indexOf(order.status) >= 2 ? `<a href="https://www.google.com/maps/dir/?api=1" target="_blank" class="block mt-3 text-center text-xs text-blue-600 underline">${Icon.map()} ${t('orderTrackOnMap')}</a>` : ''}
            </div>
            <div class="border-t border-stone-100 pt-4 mt-4">
                <h4 class="text-xs font-bold text-stone-500 mb-2">${Icon.pkg()} ${t('orderProducts')}</h4>
                <div class="space-y-1">
                    ${(() => {
                        let items = [];
                        try { items = order.itemDetails ? JSON.parse(order.itemDetails) : []; } catch(e) {}
                        if (items.length) {
                            return items.map(i => `<div class="flex justify-between text-sm"><span class="text-stone-700">${i.name} \u00d7${i.qty}</span><span class="font-semibold text-amber-600">${i.price * i.qty} ${t('currency')}</span></div>`).join('');
                        }
                        return `<p class="text-stone-500 text-xs">${order.items || ''}</p>`;
                    })()}
                </div>
            </div>
        </div>
        <a href="home.html" class="block text-center text-amber-600 hover:text-amber-700 text-sm font-semibold mt-2">${Icon.arrowR()} ${t('orderBackHome')}</a>
    `;
}

document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('orderId');
    if (id) {
        document.getElementById('orderIdInput').value = id;
        const orders = JSON.parse(localStorage.getItem('vora_orders')) || [];
        const order = orders.find(o => o.orderId === id);
        if (order) renderOrderStatus(order);
    }
});
