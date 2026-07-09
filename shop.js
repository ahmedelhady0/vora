// shop.js - صفحة عرض المنتجات مع الفلاتر والبحث والترتيب
import { getProducts } from "./sheets-service.js";
import { showMessage, hideMessage } from "./firebase-config.js";

const BOTTLE_SVG = `
<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="24" y="4" width="16" height="8" rx="1.5" fill="currentColor" opacity="0.7"/>
    <path d="M20 14 Q20 12 22 12 L42 12 Q44 12 44 14 L48 30 Q49 36 49 42 L49 56 Q49 60 45 60 L19 60 Q15 60 15 56 L15 42 Q15 36 16 30 Z"
          stroke="currentColor" stroke-width="2" fill="none"/>
    <line x1="15" y1="34" x2="49" y2="34" stroke="currentColor" stroke-width="1.5" opacity="0.6"/>
</svg>`;

// التحقق من الجلسة
const userData = JSON.parse(localStorage.getItem('vora_user'));
if (!userData) {
    window.location.href = "index.html";
}

// حالة الفلاتر
let allProducts = [];
let activeCategory = "الكل";
let searchQuery = "";
let sortMode = "default";
let minPrice = null;
let maxPrice = null;

document.addEventListener("DOMContentLoaded", () => {
    updateCartCount();
    loadProducts();

    document.getElementById('shopSearch').addEventListener('input', debounce((e) => {
        searchQuery = e.target.value.trim().toLowerCase();
        renderProducts();
    }, 250));

    document.getElementById('sortSelect').addEventListener('change', (e) => {
        sortMode = e.target.value;
        renderProducts();
    });

    document.getElementById('minPrice').addEventListener('input', debounce((e) => {
        minPrice = e.target.value ? parseFloat(e.target.value) : null;
        renderProducts();
    }, 300));

    document.getElementById('maxPrice').addEventListener('input', debounce((e) => {
        maxPrice = e.target.value ? parseFloat(e.target.value) : null;
        renderProducts();
    }, 300));
});

function debounce(fn, delay) {
    let timer;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => fn(...args), delay);
    };
}

async function loadProducts() {
    const container = document.getElementById('productsContainer');
    renderSkeletons(container);

    try {
        allProducts = await getProducts();
        buildCategoryPills();
        renderProducts();
    } catch (err) {
        console.error('Error loading products:', err);
        container.innerHTML = `<p class="text-red-500 text-center col-span-full py-12">⚠️ حدث خطأ أثناء تحميل المنتجات</p>`;
    }
}

function renderSkeletons(container) {
    container.innerHTML = Array.from({ length: 6 }).map(() => `
        <div class="space-y-4">
            <div class="skeleton rounded-2xl h-80 w-full"></div>
            <div class="skeleton rounded h-4 w-1/3"></div>
            <div class="skeleton rounded h-5 w-2/3"></div>
            <div class="skeleton rounded h-12 w-full"></div>
        </div>
    `).join("");
}

function buildCategoryPills() {
    const categories = ["الكل", ...new Set(allProducts.map(p => p.category).filter(Boolean))];
    const wrap = document.getElementById('categoryPills');
    wrap.innerHTML = categories.map(cat => `
        <button class="category-pill ${cat === activeCategory ? 'active' : ''}" data-category="${cat}">
            ${cat}
        </button>
    `).join("");

    wrap.querySelectorAll('.category-pill').forEach(btn => {
        btn.addEventListener('click', () => {
            activeCategory = btn.dataset.category;
            wrap.querySelectorAll('.category-pill').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            renderProducts();
        });
    });
}

function getFilteredProducts() {
    let list = [...allProducts];

    if (activeCategory !== "الكل") {
        list = list.filter(p => p.category === activeCategory);
    }

    if (searchQuery) {
        list = list.filter(p =>
            (p.name || "").toLowerCase().includes(searchQuery) ||
            (p.description || "").toLowerCase().includes(searchQuery) ||
            (p.category || "").toLowerCase().includes(searchQuery)
        );
    }

    if (minPrice !== null && !isNaN(minPrice)) {
        list = list.filter(p => parseFloat(p.price) >= minPrice);
    }
    if (maxPrice !== null && !isNaN(maxPrice)) {
        list = list.filter(p => parseFloat(p.price) <= maxPrice);
    }

    switch (sortMode) {
        case "price-asc":
            list.sort((a, b) => parseFloat(a.price) - parseFloat(b.price));
            break;
        case "price-desc":
            list.sort((a, b) => parseFloat(b.price) - parseFloat(a.price));
            break;
        case "rating-desc":
            list.sort((a, b) => (parseFloat(b.rating) || 0) - (parseFloat(a.rating) || 0));
            break;
        case "name-asc":
            list.sort((a, b) => (a.name || "").localeCompare(b.name || "", 'ar'));
            break;
        default:
            break; // الأحدث = ترتيب الشيت كما هو
    }

    return list;
}

function renderProducts() {
    const container = document.getElementById('productsContainer');
    const countEl = document.getElementById('resultsCount');
    const filtered = getFilteredProducts();

    countEl.textContent = allProducts.length > 0
        ? `عرض ${filtered.length} من أصل ${allProducts.length} منتج`
        : "";

    container.innerHTML = "";

    if (allProducts.length === 0) {
        container.innerHTML = `
            <div class="col-span-full text-center py-16 space-y-4">
                <p class="text-4xl">🎁</p>
                <p class="text-2xl font-bold text-stone-900">لا توجد عطور بعد</p>
                <p class="text-stone-600">هنا هتظهر تشكيلة VORA بمجرد ما يتم إضافتها من لوحة الإدارة.</p>
            </div>`;
        return;
    }

    if (filtered.length === 0) {
        container.innerHTML = `
            <div class="col-span-full text-center py-16 space-y-4">
                <p class="text-4xl">🔍</p>
                <p class="text-2xl font-bold text-stone-900">لا توجد نتائج مطابقة</p>
                <p class="text-stone-600">جرّب تغيير الفلاتر أو كلمة البحث</p>
                <button onclick="window.resetFilters()" class="px-6 py-2.5 bg-amber-600 text-white rounded-lg font-semibold hover:bg-amber-700 transition">إعادة تعيين الفلاتر</button>
            </div>`;
        return;
    }

    filtered.forEach((prod, index) => {
        const rating = parseFloat(prod.rating) || 0;
        const stars = rating > 0 ? "★".repeat(Math.round(rating)) + "☆".repeat(5 - Math.round(rating)) : "☆☆☆☆☆";
        const isNew = allProducts.indexOf(prod) === 0;
        const discount = prod.discount && prod.originalPrice ? Math.round(((prod.originalPrice - prod.price) / prod.originalPrice) * 100) : 0;

        const card = document.createElement('div');
        card.className = "product-card group animate-fadeInUp";
        card.innerHTML = `
            <div class="relative overflow-hidden rounded-2xl bg-white border border-stone-200 p-6 h-80 flex items-center justify-center transform transition-all duration-300 group-hover:shadow-2xl">
                ${isNew ? '<span class="absolute top-4 right-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white px-4 py-2 rounded-full text-xs font-bold shadow-lg">جديد ✨</span>' : ''}
                ${discount > 0 ? `<span class="absolute top-4 left-4 bg-red-600 text-white px-4 py-2 rounded text-xs font-bold shadow-lg">Sale</span>` : ''}

                ${prod.image ? `
                    <img src="${prod.image}" alt="${prod.name}" class="w-full h-full object-contain transition-transform duration-300 group-hover:scale-105" loading="lazy" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                    <div class="w-full h-full text-amber-600 opacity-90 group-hover:opacity-100 transition-all" style="display:none;">
                        ${BOTTLE_SVG}
                    </div>
                ` : `
                    <div class="w-full h-full text-amber-600 opacity-90 group-hover:opacity-100 transition-all">
                        ${BOTTLE_SVG}
                    </div>
                `}
            </div>

            <div class="pt-6 space-y-3">
                <div class="flex items-start justify-between gap-2">
                    <span class="text-xs font-bold text-stone-500 uppercase tracking-widest italic">${prod.category || 'VORA'}</span>
                </div>

                <h3 class="text-lg font-bold text-stone-900 line-clamp-2 leading-tight italic" style="font-family: 'Playfair Display', serif;">${prod.name}</h3>

                <p class="text-sm text-stone-600 line-clamp-2 h-10">${prod.description || 'عطر فاخر من مجموعة VORA'}</p>

                <div class="flex items-center gap-2 pt-1">
                    <span class="text-yellow-500 text-sm font-semibold">${stars}</span>
                    <span class="text-xs text-stone-400">(${prod.ratingCount || 0})</span>
                </div>

                <div class="flex items-center justify-between pt-4 border-t border-stone-200">
                    <div>
                        ${prod.discount && prod.originalPrice ? `
                            <p class="text-xs text-stone-400 line-through mb-1">${prod.originalPrice} ج.م</p>
                            <p class="text-2xl font-bold text-red-600">${prod.price} ج.م</p>
                        ` : `
                            <p class="text-2xl font-bold text-stone-900">${prod.price} ج.م</p>
                        `}
                    </div>
                    <button onclick="addToCart('${prod.id}', '${prod.name}', ${prod.price})" class="w-14 h-14 bg-gradient-to-br from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-full flex items-center justify-center transition-all duration-300 transform hover:scale-110 shadow-lg">
                        🛍️
                    </button>
                </div>

                <button onclick="addToCart('${prod.id}', '${prod.name}', ${prod.price})" class="w-full py-2.5 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-orange-700 text-white font-semibold rounded-lg transition-all duration-300 text-sm shadow-md hover:shadow-lg">
                    إضافة للسلة +
                </button>
            </div>
        `;
        container.appendChild(card);
    });
}

window.resetFilters = function() {
    activeCategory = "الكل";
    searchQuery = "";
    sortMode = "default";
    minPrice = null;
    maxPrice = null;

    document.getElementById('shopSearch').value = "";
    document.getElementById('sortSelect').value = "default";
    document.getElementById('minPrice').value = "";
    document.getElementById('maxPrice').value = "";

    buildCategoryPills();
    renderProducts();
};

// ==================== Cart (مطابق لـ home.js) ====================
window.addToCart = function(id, name, price) {
    let cart = JSON.parse(localStorage.getItem('vora_cart')) || [];
    const itemIndex = cart.findIndex(item => item.id === id);

    if (itemIndex > -1) {
        cart[itemIndex].qty += 1;
    } else {
        cart.push({ id, name, price, qty: 1 });
    }

    localStorage.setItem('vora_cart', JSON.stringify(cart));
    updateCartCount();
    renderCartDrawer();
    showMessage(`✓ تمت إضافة "${name}" إلى السلة!`);
};

function updateCartCount() {
    const cart = JSON.parse(localStorage.getItem('vora_cart')) || [];
    const totalQty = cart.reduce((sum, item) => sum + item.qty, 0);
    document.getElementById('cartCount').textContent = totalQty;
}

window.openCartDrawer = function() {
    renderCartDrawer();
    document.getElementById('cartDrawer').classList.remove('translate-x-full');
    document.getElementById('cartDrawerOverlay').classList.remove('hidden');
    document.body.style.overflow = 'hidden';
};

window.closeCartDrawer = function() {
    document.getElementById('cartDrawer').classList.add('translate-x-full');
    document.getElementById('cartDrawerOverlay').classList.add('hidden');
    document.body.style.overflow = 'auto';
};

window.goToCheckout = function() {
    const cart = JSON.parse(localStorage.getItem('vora_cart')) || [];
    if (cart.length === 0) {
        showMessage('⚠️ السلة فارغة. أضف منتجات أولاً');
        return;
    }
    window.location.href = 'checkout.html';
};

function renderCartDrawer() {
    const cart = JSON.parse(localStorage.getItem('vora_cart')) || [];
    const body = document.getElementById('cartDrawerBody');
    const footer = document.getElementById('cartDrawerFooter');

    if (cart.length === 0) {
        body.innerHTML = `
            <div class="text-center py-16 space-y-4">
                <div class="text-6xl">🛍️</div>
                <p class="font-bold text-stone-900 text-lg">سلتك فارغة</p>
                <p class="text-stone-600 text-sm">أضف عطرك المفضل لتبدأ التسوق</p>
            </div>`;
        footer.classList.add('hidden');
        return;
    }

    footer.classList.remove('hidden');
    body.innerHTML = "";

    let total = 0;
    cart.forEach((item, index) => {
        total += item.price * item.qty;
        const subtotal = item.price * item.qty;

        const row = document.createElement('div');
        row.className = "flex gap-4 pb-4 border-b border-stone-200 last:border-0 group hover:bg-stone-50/50 rounded-lg p-3 transition";
        row.innerHTML = `
            <div class="relative w-20 h-24 bg-gradient-to-br from-amber-100 to-stone-100 rounded-lg flex items-center justify-center text-amber-600 flex-shrink-0 shadow-md">
                ${BOTTLE_SVG}
                <div class="absolute inset-0 rounded-lg bg-gradient-to-t from-black/10 to-transparent"></div>
            </div>
            <div class="flex-1 space-y-2">
                <div>
                    <p class="font-bold text-stone-900 text-sm">${item.name}</p>
                    <p class="text-xs text-stone-500">${item.price} ج.م</p>
                </div>
                <div class="flex items-center gap-1 bg-stone-100 rounded-lg w-fit">
                    <button onclick="changeDrawerQty(${index}, -1)" class="w-7 h-7 flex items-center justify-center hover:bg-stone-200 rounded transition text-sm font-bold">−</button>
                    <span class="w-8 text-center font-bold text-stone-900 text-sm">${item.qty}</span>
                    <button onclick="changeDrawerQty(${index}, 1)" class="w-7 h-7 flex items-center justify-center hover:bg-stone-200 rounded transition text-sm font-bold">+</button>
                </div>
            </div>
            <div class="flex flex-col items-end justify-between">
                <button class="text-red-500 hover:text-red-700 opacity-0 group-hover:opacity-100 transition text-lg" onclick="removeDrawerItem(${index})">🗑️</button>
                <p class="font-bold text-amber-600 text-sm">${subtotal} ج.م</p>
            </div>
        `;
        body.appendChild(row);
    });

    document.getElementById('cartDrawerTotal').textContent = `${total} ج.م`;
    document.getElementById('cartSubtotal').textContent = `${total} ج.م`;
    document.getElementById('cartShipping').textContent = 'مجاني';
}

window.changeDrawerQty = function(index, change) {
    let cart = JSON.parse(localStorage.getItem('vora_cart')) || [];
    cart[index].qty += change;
    if (cart[index].qty <= 0) cart.splice(index, 1);
    localStorage.setItem('vora_cart', JSON.stringify(cart));
    updateCartCount();
    renderCartDrawer();
};

window.removeDrawerItem = function(index) {
    let cart = JSON.parse(localStorage.getItem('vora_cart')) || [];
    cart.splice(index, 1);
    localStorage.setItem('vora_cart', JSON.stringify(cart));
    updateCartCount();
    renderCartDrawer();
};

window.logout = function() {
    localStorage.removeItem('vora_user');
    localStorage.removeItem('vora_cart');
    window.location.href = "index.html";
};

window.hideMessage = hideMessage;
