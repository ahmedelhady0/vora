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
        btn.classList.remove('text-pink-700', 'border-b-2', 'border-pink-600', 'font-bold');
        btn.classList.add('text-gray-500', 'font-medium');
    });

    const activeBtn = document.getElementById(`btn-${tabId}`);
    activeBtn.classList.remove('text-gray-500', 'font-medium');
    activeBtn.classList.add('text-pink-700', 'border-b-2', 'border-pink-600', 'font-bold');
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
            row.className = "border-b border-pink-50 hover:bg-pink-50/50 transition-all";
            row.innerHTML = `
                <td class="p-4 text-sm text-gray-600">${order.date || ''}</td>
                <td class="p-4 font-bold text-gray-800">${order.customerName}</td>
                <td class="p-4 text-gray-700" style="direction: ltr; text-align: right;">${order.customerPhone}</td>
                <td class="p-4 text-sm text-gray-600 max-w-xs truncate" title="${order.items}">${order.items}</td>
                <td class="p-4 font-bold text-pink-700">${order.total} ج.م</td>
                <td class="p-4">
                    <span class="inline-block px-3 py-1 text-xs font-bold rounded-full bg-amber-100 text-amber-800">
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

    if (!name || !category || !price) {
        return showMessage("يرجى ملء الحقول الأساسية: الاسم، الفئة، والسعر");
    }

    const newProd = {
        id: "VORA-" + Math.floor(1000 + Math.random() * 9000), // توليد كود تلقائي للمنتج
        name,
        category,
        price,
        description,
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
