// admin.js
import { getOrders, addProduct } from "./sheets-service.js";
import { showMessage, hideMessage } from "./firebase-config.js";

// التحقق من صلاحيات المشرف
const userData = JSON.parse(localStorage.getItem('vora_user'));
if (!userData || (userData.role !== 'admin' && userData.role !== 'manager')) {
    // إذا لم يكن مسؤولاً، يتم إرجاعه للرئيسية فوراً لحماية الصفحة
    window.location.href = "home.html";
}

document.addEventListener("DOMContentLoaded", () => {
    loadAdminOrders();
});

// التنقل بين تبويبات لوحة التحكم (الطلبات / إضافة منتج)
window.switchTab = function(tabId) {
    // إخفاء كافة التبويبات
    document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('block'));
    
    // إظهار التبويب المختار
    const target = document.getElementById(tabId);
    target.classList.remove('hidden');
    target.classList.add('block');

    // تغيير نمط الأزرار النشطة
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.style.color = 'var(--muted)';
        btn.style.borderBottom = 'none';
        btn.classList.remove('font-bold');
        btn.classList.add('font-medium');
    });

    const activeBtn = document.getElementById(`btn-${tabId}`);
    activeBtn.classList.remove('font-medium');
    activeBtn.classList.add('font-bold');
    activeBtn.style.color = 'var(--wine)';
    activeBtn.style.borderBottom = '2px solid var(--wine)';
};

// جلب وعرض الأوردرات الواردة للمشرفين
async function loadAdminOrders() {
    const tbody = document.getElementById('adminOrdersTable');
    try {
        const orders = await getOrders(); // سحب كل الطلبات بدون تحديد إيميل معين
        tbody.innerHTML = "";

        if (orders.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" class="p-8 text-center text-gray-500">لا توجد طلبات مسجلة في النظام حتى الآن.</td></tr>`;
            return;
        }

        orders.forEach(order => {
            const row = document.createElement('tr');
            row.className = "transition-all";
            row.style.borderBottom = "1px solid var(--gold-mist)";
            row.innerHTML = `
                <td class="p-4 text-sm text-gray-600">${order.date || ''}</td>
                <td class="p-4 font-bold" style="color: var(--charcoal);">${order.customerName}</td>
                <td class="p-4 text-gray-700" style="direction: ltr; text-align: right;">${order.customerPhone}</td>
                <td class="p-4 text-sm text-gray-600 max-w-xs truncate" title="${order.items}">${order.items}</td>
                <td class="p-4 font-bold" style="color: var(--wine);">${order.total} ج.م</td>
                <td class="p-4">
                    <span class="inline-block px-3 py-1 text-xs font-bold rounded-full" style="background: var(--gold-mist); color: var(--wine-deep);">
                        ${order.status || 'قيد المراجعة'}
                    </span>
                </td>
            `;
            tbody.appendChild(row);
        });
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="6" class="p-8 text-center text-red-500">حدث خطأ أثناء تحميل الطلبات من جوجل شيت.</td></tr>`;
    }
}

// دالة إضافة عطر جديد وحفظه في المخزن
window.addNewProduct = async function() {
    const name = document.getElementById('prodName').value.trim();
    const category = document.getElementById('prodCategory').value.trim();
    const price = parseFloat(document.getElementById('prodPrice').value);
    const description = document.getElementById('prodDesc').value.trim();
    const image = document.getElementById('prodImage').value.trim();
    const originalPriceRaw = document.getElementById('prodOriginalPrice').value;
    const originalPrice = originalPriceRaw ? parseFloat(originalPriceRaw) : null;

    if (!name || !category || !price) {
        return showMessage("يرجى ملء الحقول الأساسية: الاسم، الفئة، والسعر");
    }

    const newProd = {
        id: "VORA-" + Math.floor(1000 + Math.random() * 9000), // توليد كود تلقائي للمنتج
        name,
        category,
        price,
        description,
        image: image || "",
        originalPrice: originalPrice || "",
        discount: originalPrice && originalPrice > price ? true : "",
        rating: 5,      // تقييم افتراضي ابتدائي للمنتج الجديد
        ratingCount: 1  // عدد التقييمات الابتدائية
    };

    showMessage("جاري حفظ العطر الجديد في جوجل شيت...");

    try {
        const response = await addProduct(newProd);
        if (response.success) {
            showMessage(`تم إضافة العطر الجديد (${name}) للمخزن بنجاح! ✨`);
            // تفريغ حقول الإدخال
            document.getElementById('prodName').value = "";
            document.getElementById('prodCategory').value = "";
            document.getElementById('prodPrice').value = "";
            document.getElementById('prodDesc').value = "";
            document.getElementById('prodImage').value = "";
            document.getElementById('prodOriginalPrice').value = "";

            // تحديث الجدول احتياطياً والعودة لتبويب الطلبات
            switchTab('orders-tab');
            loadAdminOrders();
        } else {
            showMessage(`خطأ أثناء الحفظ: ${response.error}`);
        }
    } catch (err) {
        showMessage("فشل الاتصال بجوجل شيت، يرجى مراجعة صلاحيات وموقع الـ Apps Script.");
    }
};

window.hideMessage = hideMessage;
