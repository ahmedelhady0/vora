// checkout.js
import { getProducts } from "./sheets-service.js";
import { showMessage, hideMessage } from "./firebase-config.js";

let stripe, elements, cardElement;

// تهيئة Stripe
async function initStripe() {
    // استخدم مفتاح Stripe الخاص بك (استبدل بمفتاحك الفعلي)
    stripe = Stripe('pk_test_4eC39HqLyjWDarhtT1ZIdwO7');
    elements = stripe.elements();
    cardElement = elements.create('card', {
        style: {
            base: {
                fontFamily: 'Alexandria, sans-serif',
                fontSize: '16px',
                color: '#424770',
                '::placeholder': {
                    color: '#aab7c4',
                }
            },
            invalid: {
                color: '#fa755a',
                iconColor: '#fa755a'
            }
        }
    });
    cardElement.mount('#card-element');
    
    cardElement.addEventListener('change', function(event) {
        const displayError = document.getElementById('card-errors');
        if (event.error) {
            displayError.textContent = event.error.message;
        } else {
            displayError.textContent = '';
        }
    });
}

// تحميل البيانات عند فتح الصفحة
document.addEventListener("DOMContentLoaded", async () => {
    const userData = JSON.parse(localStorage.getItem('vora_user'));
    if (!userData) {
        window.location.href = "index.html";
        return;
    }

    initStripe();
    loadCartItems();
    setupPaymentMethodListeners();
});

// تحميل عناصر السلة
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
        updateTotals(0);
        return;
    }
    
    cart.forEach(item => {
        const itemTotal = item.price * item.qty;
        total += itemTotal;
        itemsCount += item.qty;
        
        // Main view
        const itemDiv = document.createElement('div');
        itemDiv.className = 'flex justify-between items-center py-2 border-b border-stone-100 last:border-0';
        itemDiv.innerHTML = `
            <div>
                <p class="font-semibold text-stone-900">${item.name}</p>
                <p class="text-sm text-stone-500">${item.qty} × ${item.price} ج.م</p>
            </div>
            <p class="font-bold text-amber-600">${itemTotal} ج.م</p>
        `;
        orderItems.appendChild(itemDiv);
        
        // Sidebar preview
        const sidebarDiv = document.createElement('div');
        sidebarDiv.className = 'flex justify-between text-sm py-2 border-b border-stone-100 last:border-0';
        sidebarDiv.innerHTML = `
            <span class="text-stone-600">${item.name} ×${item.qty}</span>
            <span class="font-semibold text-stone-900">${itemTotal} ج.م</span>
        `;
        sidebarItems.appendChild(sidebarDiv);
    });
    
    itemCount.textContent = itemsCount;
    updateTotals(total);
}

// تحديث الإجماليات
function updateTotals(subtotal) {
    const shippingCost = subtotal > 300 ? 0 : 50; // شحن مجاني فوق 300 ج.م
    const total = subtotal + shippingCost;
    
    document.getElementById('subtotal').textContent = `${subtotal} ج.م`;
    document.getElementById('shippingCost').textContent = shippingCost === 0 ? 'مجاني ✓' : `${shippingCost} ج.م`;
    document.getElementById('total').textContent = `${total} ج.م`;
    document.getElementById('sidebarTotal').textContent = `${total} ج.م`;
    
    localStorage.setItem('vora_checkout_total', total);
}

// إعداد مستمعي طرق الدفع
function setupPaymentMethodListeners() {
    const radioButtons = document.querySelectorAll('input[name="paymentMethod"]');
    radioButtons.forEach(radio => {
        radio.addEventListener('change', function() {
            const cardContainer = document.getElementById('cardContainer');
            const vodafoneContainer = document.getElementById('vodafoneContainer');
            
            if (this.value === 'card') {
                cardContainer.classList.remove('hidden');
                vodafoneContainer.classList.add('hidden');
            } else if (this.value === 'vodafone') {
                cardContainer.classList.add('hidden');
                vodafoneContainer.classList.remove('hidden');
            } else {
                cardContainer.classList.add('hidden');
                vodafoneContainer.classList.add('hidden');
            }
        });
    });
}

// إرسال الطلب
window.submitOrder = async function() {
    const paymentMethod = document.querySelector('input[name="paymentMethod"]:checked').value;
    
    // التحقق من صحة البيانات
    if (!validateForm()) {
        showMessage('⚠️ يرجى ملء جميع الحقول بشكل صحيح', 'error');
        return;
    }
    
    showLoading(true, 'جاري معالجة طلبك...');
    
    try {
        const orderData = {
            customerName: document.getElementById('customerName').value,
            customerPhone: document.getElementById('customerPhone').value,
            customerAddress: document.getElementById('customerAddress').value,
            governorate: document.getElementById('governorate').value,
            deliveryDate: document.getElementById('deliveryDate').value,
            paymentMethod: paymentMethod,
            cart: JSON.parse(localStorage.getItem('vora_cart')),
            total: localStorage.getItem('vora_checkout_total'),
            orderDate: new Date().toISOString(),
            status: 'pending'
        };
        
        if (paymentMethod === 'card') {
            // معالجة الدفع ببطاقة credit
            const { token } = await stripe.createToken(cardElement);
            
            if (token) {
                orderData.stripeToken = token.id;
                // تحويل إلى خادم backend لمعالجة الدفع
                // const response = await fetch('YOUR_BACKEND/charge', {
                //     method: 'POST',
                //     headers: { 'Content-Type': 'application/json' },
                //     body: JSON.stringify(orderData)
                // });
                
                showMessage('✓ تم تأكيد طلبك بنجاح! سيتم توصيله قريباً.', 'success');
            }
        } else if (paymentMethod === 'vodafone') {
            const vodafoneNumber = document.getElementById('vodafoneNumber').value;
            if (!vodafoneNumber || vodafoneNumber.length < 11) {
                showMessage('⚠️ رقم فودافون غير صحيح', 'error');
                showLoading(false);
                return;
            }
            orderData.vodafoneNumber = vodafoneNumber;
            showMessage('✓ سيتم إرسال رسالة تأكيد الدفع على هاتفك', 'success');
        } else {
            // الدفع عند الاستلام
            showMessage('✓ تم استقبال طلبك! سيتم التوصيل قريباً', 'success');
        }
        
        // حفظ الطلب في localStorage (في التطبيق الحقيقي، احفظه في قاعدة بيانات)
        const orders = JSON.parse(localStorage.getItem('vora_orders')) || [];
        orders.push({
            ...orderData,
            orderId: 'ORD-' + Date.now(),
            timestamp: Date.now()
        });
        localStorage.setItem('vora_orders', JSON.stringify(orders));
        
        // إرسال الطلب إلى Google Sheets
        await submitOrderToSheet(orderData);
        
        // إفراغ السلة
        localStorage.removeItem('vora_cart');
        
        // الانتقال للصفحة الرئيسية بعد 2 ثانية
        setTimeout(() => {
            window.location.href = 'home.html';
        }, 2000);
        
    } catch (error) {
        console.error('Error:', error);
        showMessage('❌ حدث خطأ في معالجة الطلب. يرجى المحاولة مجدداً', 'error');
    } finally {
        showLoading(false);
    }
};

// إرسال الطلب إلى Google Sheets
async function submitOrderToSheet(orderData) {
    try {
        const response = await fetch('https://script.google.com/macros/s/YOUR_SCRIPT_ID/usercontent', {
            method: 'POST',
            body: JSON.stringify({
                action: 'addOrder',
                orderData: orderData
            })
        });
        console.log('Order saved to sheets:', response.ok);
    } catch (error) {
        console.log('Could not save to sheets:', error);
    }
}

// التحقق من صحة البيانات
function validateForm() {
    const name = document.getElementById('customerName').value.trim();
    const phone = document.getElementById('customerPhone').value.trim();
    const address = document.getElementById('customerAddress').value.trim();
    const governorate = document.getElementById('governorate').value;
    const deliveryDate = document.getElementById('deliveryDate').value;
    
    if (!name || !phone || !address || !governorate || !deliveryDate) {
        return false;
    }
    
    // التحقق من صيغة الهاتف
    if (!/^201[0-2][0-9]{8}$/.test(phone)) {
        showMessage('⚠️ رقم الهاتف يجب أن يكون 11 رقماً مصرياً (مثال: 201012345678)', 'error');
        return false;
    }
    
    return true;
}

// عرض/إخفاء عداد التحميل
function showLoading(show, text = 'جاري المعالجة...') {
    const loadingBox = document.getElementById('loadingBox');
    const loadingText = document.getElementById('loadingText');
    
    if (show) {
        loadingText.textContent = text;
        loadingBox.classList.remove('hidden');
        document.getElementById('submitBtn').disabled = true;
    } else {
        loadingBox.classList.add('hidden');
        document.getElementById('submitBtn').disabled = false;
    }
}

// دوال الرسائل
window.showMessage = showMessage;
window.hideMessage = function() {
    hideMessage();
};
