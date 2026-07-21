import Icon from './icons.js';
import { getProducts, getSettingsFromFirestore, getUserFromFirestore } from "./sheets-service.js";
import { escapeHTML } from "./security-utils.js";

const BOTTLE_SVG = `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="24" y="4" width="16" height="8" rx="1.5" fill="currentColor" opacity="0.7"/><path d="M20 14 Q20 12 22 12 L42 12 Q44 12 44 14 L48 30 Q49 36 49 42 L49 56 Q49 60 45 60 L19 60 Q15 60 15 56 L15 42 Q15 36 16 30 Z" stroke="currentColor" stroke-width="2" fill="none"/><line x1="15" y1="34" x2="49" y2="34" stroke="currentColor" stroke-width="1.5" opacity="0.6"/></svg>`;

let product = null;
let productQty = 1;
let reviewRating = 0;
let allProds = [];
let selectedVariant = null;

function formatPrice(price) {
    return `LE ${Number(price).toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,')}`;
}
function priceNum(price) {
    return Math.round(Number(price) * 100);
}

async function loadSettings() {
    try {
        const cloud = await getSettingsFromFirestore();
        if (cloud) localStorage.setItem('vora_settings', JSON.stringify(cloud));
    } catch (e) {}
}

function getProductId() {
    return new URLSearchParams(window.location.search).get('id');
}

function buildCard(prod, index) {
    const rating = parseFloat(prod.rating) || 0;
    const stars = rating > 0 ? "★".repeat(Math.round(rating)) + "☆".repeat(5 - Math.round(rating)) : "☆☆☆☆☆";
    const discount = prod.discount && prod.originalPrice ? Math.round(((prod.originalPrice - prod.price) / prod.originalPrice) * 100) : 0;
    const stock = prod.stock ?? 50;
    const outOfStock = stock <= 0;
    const safeId = prod.id.replace(/'/g, "\\'");
    const safeNameHtml = escapeHTML(prod.name);
    const safeImageHtml = escapeHTML(prod.image);
    const imageContent = prod.image ? `<img src="${safeImageHtml}" alt="${safeNameHtml}" loading="lazy" onload="this.classList.add('loaded')" onerror="this.style.display='none'; this.parentNode.querySelector('.fallback').style.display='flex';">` : '';
    let badgeHtml = "";
    if (index === 0) badgeHtml += `<span class="badge badge-new">${t('newBadge')}</span>`;
    if (discount > 0) badgeHtml += `<span class="badge badge-sale">-${discount}%</span>`;
    if (outOfStock) badgeHtml += `<span class="badge badge-out">${t('outOfStockBadge')}</span>`;
    const sizeHtml = prod.size ? `<span style="font-weight:400;color:#9c7c8c;"> • ${prod.size}</span>` : '';

    const card = document.createElement('div');
    card.className = "product-card";
    card.style.cssText = 'flex: 0 0 200px; scroll-snap-align: start;';
    card.innerHTML = `
        <div class="card-media">
            ${badgeHtml}
            ${imageContent}
            <div class="fallback w-full h-full flex items-center justify-center text-amber-600 opacity-70" style="${prod.image ? 'display:none;' : 'display:flex;'}">${BOTTLE_SVG}</div>
            <a class="card-link" href="product.html?id=${safeId}" title="${safeNameHtml}"></a>
        </div>
        <div class="card-information">
            <div class="card-information__wrapper text-center">
                <div class="card-vendor">${escapeHTML(prod.vendor || 'VORA')}${sizeHtml}</div>
                <a class="card-title" href="product.html?id=${safeId}"><span class="text">${safeNameHtml}</span></a>
                <div class="rating-row"><span class="stars">${stars}</span></div>
                <div class="card-price">
                    <span class="price-current">${prod.price} ${t('currency')}</span>
                    ${prod.discount && prod.originalPrice ? `<span class="price-original">${prod.originalPrice} ${t('currency')}</span>` : ''}
                </div>
            </div>
        </div>
    `;
    card.style.animation = `fadeInUp 0.4s ease-out ${index * 0.08}s both`;
    return card;
}

async function loadProduct() {
    const id = getProductId();
    if (!id) { document.getElementById('productName').textContent = t('prodNotFound'); return; }

    let products;
    try { products = await getProducts(); }
    catch { products = []; }
    allProds = products || [];

    product = allProds.find(p => p.id === id);
    if (!product) { document.getElementById('productName').textContent = t('prodNotFound'); return; }

    renderProduct();
    const variantParam = new URLSearchParams(window.location.search).get('variant');
    if (variantParam !== null && product.variants && product.variants[variantParam]) {
        setTimeout(() => selectVariant(parseInt(variantParam)), 100);
    }
    renderRecentlyViewed();
    renderRelated();
    renderReviews();
    trackRecentlyViewed(id);
}

function renderProduct() {
    const p = product;
    document.title = `VORA - ${p.name}`;
    document.getElementById('breadcrumbProduct').textContent = p.name;

    // JSON-LD schema.org/Product for SEO
    const schemaPrice = p.variants && p.variants.length > 0
        ? Math.min(...p.variants.map(v => v.price))
        : p.price;
    const schema = {
        "@context": "https://schema.org/",
        "@type": "Product",
        "name": p.name,
        "description": p.description || "",
        "image": p.image || "",
        "brand": { "@type": "Brand", "name": p.vendor || "VORA" },
        "offers": {
            "@type": "Offer",
            "price": schemaPrice,
            "priceCurrency": "EGP",
            "availability": (p.stock ?? 50) > 0
                ? "https://schema.org/InStock"
                : "https://schema.org/OutOfStock"
        }
    };
    if (parseFloat(p.rating) > 0) {
        schema.aggregateRating = {
            "@type": "AggregateRating",
            "ratingValue": parseFloat(p.rating),
            "reviewCount": p.ratingCount || 0
        };
    }
    if (p.originalPrice && p.originalPrice > schemaPrice) {
        schema.offers.priceSpecification = {
            "@type": "UnitPriceSpecification",
            "price": schemaPrice,
            "priceCurrency": "EGP",
            "referenceQuantity": { "@type": "QuantitativeValue", "value": 1 }
        };
    }
    let oldSchema = document.getElementById('productSchema');
    if (oldSchema) oldSchema.remove();
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.id = 'productSchema';
    script.textContent = JSON.stringify(schema);
    document.head.appendChild(script);

    const allProdImages = [p.image, ...(p.variants || []).map(v => v.image).filter(Boolean)];
    const uniqueProdImages = [...new Set(allProdImages)].filter(Boolean);
    if (uniqueProdImages.length > 0) {
        const container = document.getElementById('productImageContainer');
        const img = document.createElement('img');
        img.src = uniqueProdImages[0];
        img.alt = p.name;
        img.className = 'product-page-image';
        img.id = 'productMainImage';
        img.loading = 'lazy';
        img.decoding = 'async';
        img.onerror = function() { this.style.display = 'none'; const fb = document.getElementById('productImageFallback'); if (fb) fb.style.display = 'flex'; };
        container.prepend(img);
        const fb = document.getElementById('productImageFallback');
        if (fb) fb.style.display = 'none';

        if (uniqueProdImages.length > 1) {
            let _currentIdx = 0;
            let _paused = false;
            const mainImg = img;
            container.addEventListener('mouseenter', () => { _paused = true; });
            container.addEventListener('mouseleave', () => { _paused = false; });
            window._productSwiper = setInterval(() => {
                if (_paused) return;
                _currentIdx = (_currentIdx + 1) % uniqueProdImages.length;
                mainImg.style.opacity = '0';
                setTimeout(() => {
                    mainImg.src = uniqueProdImages[_currentIdx];
                    mainImg.style.opacity = '1';
                }, 150);
            }, 2000);
            window._productSwiperImages = uniqueProdImages;
            window._productSwiperGoTo = function(idx) {
                _currentIdx = idx % uniqueProdImages.length;
                mainImg.src = uniqueProdImages[_currentIdx];
                _paused = true;
                setTimeout(() => { _paused = false; }, 4000);
            };
        }
    }

    document.getElementById('productBrand').textContent = p.vendor || 'VORA';
    document.getElementById('productName').textContent = p.name;

    const rating = parseFloat(p.rating) || 0;
    const starsEl = document.getElementById('productRating');
    if (rating > 0) {
        starsEl.innerHTML = `<span class="stars" style="color:#f59e0b;font-size:18px;">${"★".repeat(Math.round(rating))+"☆".repeat(5-Math.round(rating))}</span><span class="text-sm text-stone-400">(${p.ratingCount || 0})</span>`;
    }

    document.getElementById('productDescription').textContent = p.description || '';

    const genderEl = document.getElementById('productGender');
    if (p.gender) {
        const labels = { man: t('man'), woman: t('woman'), unisex: t('unisex') };
        genderEl.innerHTML = `<span class="product-gender ${p.gender}">${labels[p.gender] || p.gender}</span>`;
        genderEl.style.display = 'block';
    } else if (p.sections) {
        const sec = p.sections;
        if (sec.includes('for-him')) { genderEl.innerHTML = `<span class="product-gender man">${t('man')}</span>`; genderEl.style.display = 'block'; }
        else if (sec.includes('for-her')) { genderEl.innerHTML = `<span class="product-gender woman">${t('woman')}</span>`; genderEl.style.display = 'block'; }
        else if (sec.includes('unisex')) { genderEl.innerHTML = `<span class="product-gender unisex">${t('unisex')}</span>`; genderEl.style.display = 'block'; }
        else genderEl.style.display = 'none';
    } else {
        genderEl.style.display = 'none';
    }

    const vendorEl = document.getElementById('productVendor');
    if (p.vendor) {
        vendorEl.innerHTML = `<span class="product-vendor">${t('vendor')}: <span>${p.vendor}</span></span>`;
        vendorEl.style.display = 'block';
    } else {
        vendorEl.style.display = 'none';
    }

    const stock = p.stock ?? 50;
    const outOfStock = stock <= 0;
    document.getElementById('productStock').innerHTML = outOfStock
        ? `<span style="color:#dc2626;font-weight:700;font-size:14px;">${t('outOfStock')}</span>`
        : `<span style="color:#16a34a;font-size:14px;">${Icon.check()} ${t('inStock')}</span>`;

    const hotStock = document.getElementById('productHotStock');
    if (!outOfStock && stock <= 5 && stock > 0) {
        hotStock.style.display = 'block';
        hotStock.querySelector('.hotStock-text').textContent = t('hurryText').replace('{n}', stock);
        const pct = Math.min(stock / 10 * 100, 100);
        hotStock.querySelector('.hotStock-progress-item').style.width = pct + '%';
    } else {
        hotStock.style.display = 'none';
    }

    const priceEl = document.getElementById('productPrice');
    if (p.discount && p.originalPrice) {
        priceEl.innerHTML = `
            <div class="price price--medium price--on-sale">
                <dl>
                    <div class="price__regular">
                        <dd class="price__last"><span class="price-item price-item--regular">${formatPrice(p.originalPrice)}</span></dd>
                    </div>
                    <div class="1 price__sale">
                        <dd class="price__last" data-last="${priceNum(p.price)}"><span class="price-item price-item--sale">${formatPrice(p.price)}</span></dd>
                    </div>
                    <small class="unit-price caption hidden">
                        <dt class="visually-hidden">Unit price</dt>
                        <dd class="price__last"><span></span><span aria-hidden="true">/</span><span class="visually-hidden">&nbsp;per&nbsp;</span><span></span></dd>
                    </small>
                </dl>
            </div>`;
    } else {
        priceEl.innerHTML = `
            <div class="price price--medium">
                <dl>
                    <div class="price__regular">
                        <dd class="price__last"><span class="price-item price-item--regular">${formatPrice(p.price)}</span></dd>
                    </div>
                    <small class="unit-price caption hidden">
                        <dt class="visually-hidden">Unit price</dt>
                        <dd class="price__last"><span></span><span aria-hidden="true">/</span><span class="visually-hidden">&nbsp;per&nbsp;</span><span></span></dd>
                    </small>
                </dl>
            </div>`;
    }

    const variantEl = document.getElementById('productVariants');
    selectedVariant = null;
    if (p.variants && p.variants.length > 0) {
        const lang = getLang();
        variantEl.style.display = 'block';
        let optionsHtml = p.variants.map((v, i) => `
            <button class="variant-option ${i === 0 ? 'active' : ''}" data-index="${i}" onclick="selectVariant(${i})">
                ${lang === 'ar' && v.name ? v.name : v.nameEn || v.name}
            </button>
        `).join('');
        variantEl.innerHTML = `<div class="variant-label">${t('chooseOption')}</div><div class="variant-options">${optionsHtml}</div>`;
        selectedVariant = p.variants[0];
        // Set initial variant image if available
        if (selectedVariant.image) {
            const mainImg = document.getElementById('productMainImage');
            if (mainImg) mainImg.src = selectedVariant.image;
        }
    } else {
        variantEl.style.display = 'none';
        variantEl.innerHTML = '';
    }
    updatePriceDisplay();

    const details = document.getElementById('productDetails');
    let detailHtml = '';
    if (p.size) detailHtml += `<div><div class="detail-label">${t('size')}</div><div class="detail-value">${p.size}</div></div>`;
    details.innerHTML = detailHtml;

    document.getElementById('addToCartBtn').disabled = outOfStock;
    if (outOfStock) document.getElementById('addToCartBtn').textContent = t('outOfStock');
    document.getElementById('buyNowBtn').disabled = outOfStock;

    const addInfo = document.getElementById('productAdditionalInfo');
    const addInfoContent = document.getElementById('additionalInfoContent');
    if (p.additionalInfo) {
        addInfoContent.innerHTML = p.additionalInfo;
        addInfo.style.display = 'block';
    } else {
        addInfo.style.display = 'none';
    }

    updateSubtotal();

    setTimeout(() => { document.getElementById('breadcrumbShop').textContent = t('navShop'); document.getElementById('breadcrumbHome').textContent = t('navHome'); }, 50);
    injectProductJsonLd(p);
}

function injectProductJsonLd(p) {
    const existing = document.getElementById('productJsonLd');
    if (existing) existing.remove();
    const script = document.createElement('script');
    script.id = 'productJsonLd';
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify({
        '@context': 'https://schema.org/',
        '@type': 'Product',
        name: p.name,
        description: p.description || '',
        image: p.image || '',
        sku: p.id,
        brand: { '@type': 'Brand', name: p.vendor || 'VORA' },
        offers: {
            '@type': 'Offer',
            url: window.location.href,
            priceCurrency: 'EGP',
            price: parseFloat(p.price) || 0,
            availability: (p.stock || 50) > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock'
        }
    }, null, 2);
    document.head.appendChild(script);
}

function renderRelated() {
    const container = document.getElementById('relatedProducts');
    if (!container || !product) return;
    const related = allProds.filter(p => p.id !== product.id && (p.category === product.category || p.brand === product.brand || (p.gender && p.gender === product.gender) || (p.vendor && p.vendor === product.vendor))).slice(0, 8);
    if (related.length === 0) { container.parentElement.style.display = 'none'; return; }
    container.parentElement.style.display = 'block';
    related.forEach((prod, i) => container.appendChild(buildCard(prod, i)));
}

function renderRecentlyViewed() {
    const container = document.getElementById('recentlyViewedProducts');
    if (!container) return;
    const ids = JSON.parse(localStorage.getItem('vora_recently_viewed')) || [];
    const items = ids.map(id => allProds.find(p => p.id === id)).filter(Boolean).filter(p => p.id !== product?.id);
    if (items.length === 0) { container.parentElement.style.display = 'none'; return; }
    container.parentElement.style.display = 'block';
    items.slice(0, 8).forEach((prod, i) => container.appendChild(buildCard(prod, i)));
}

function renderReviews() {
    const container = document.getElementById('reviewsContainer');
    if (!container || !product) return;
    const allReviews = JSON.parse(localStorage.getItem('vora_reviews')) || {};
    const reviews = allReviews[product.id] || [];
    if (reviews.length === 0) {
        container.innerHTML = `<p class="text-stone-400 text-sm text-center py-8">${t('prodNoReviews')}</p>`;
        return;
    }
    container.innerHTML = reviews.map(r => `
        <div class="review-card">
            <div class="flex items-center justify-between mb-1">
                <span class="name">${r.name}</span>
                <span class="date">${r.date}</span>
            </div>
            <div class="stars">${"★".repeat(r.rating)+"☆".repeat(5-r.rating)}</div>
            <p class="text">${r.text}</p>
        </div>
    `).join('');
}

window.setReviewStar = function(n) {
    reviewRating = n;
    const container = document.getElementById('reviewStarRating');
    container.innerHTML = '';
    for (let i = 1; i <= 5; i++) {
        const s = document.createElement('span');
        s.textContent = i <= n ? '★' : '☆';
        s.className = i <= n ? 'text-amber-500 cursor-pointer hover:scale-110 transition' : 'cursor-pointer hover:scale-110 transition';
        s.onclick = () => setReviewStar(i);
        container.appendChild(s);
    }
};

window.submitReview = function() {
    if (!reviewRating) { showMessage(t('prodSelectRating')); return; }
    const name = document.getElementById('reviewName').value.trim() || t('navLogin');
    const text = document.getElementById('reviewText').value.trim();
    if (!text) { showMessage(t('prodWriteReview')); return; }
    const allReviews = JSON.parse(localStorage.getItem('vora_reviews')) || {};
    if (!allReviews[product.id]) allReviews[product.id] = [];
    allReviews[product.id].unshift({ name, text, rating: reviewRating, date: new Date().toLocaleDateString(getLang() === 'ar' ? 'ar-EG' : 'en-US') });
    localStorage.setItem('vora_reviews', JSON.stringify(allReviews));
    document.getElementById('reviewName').value = '';
    document.getElementById('reviewText').value = '';
    reviewRating = 0;
    document.getElementById('reviewStarRating').innerHTML = '';
    for (let i = 1; i <= 5; i++) {
        const s = document.createElement('span');
        s.textContent = '☆';
        s.className = 'cursor-pointer hover:scale-110 transition';
        s.onclick = () => setReviewStar(i);
        document.getElementById('reviewStarRating').appendChild(s);
    }
    showMessage(t('prodReviewSubmitted'));
    renderReviews();
};

window.selectVariant = function(index) {
    if (!product.variants) return;
    selectedVariant = product.variants[index];
    document.querySelectorAll('.variant-option').forEach((el, i) => {
        el.classList.toggle('active', i === index);
    });
    // Change main image to variant image
    if (selectedVariant.image) {
        const allImgs = window._productSwiperImages;
        if (allImgs && allImgs.length > 1) {
            const idx = allImgs.indexOf(selectedVariant.image);
            if (idx >= 0 && window._productSwiperGoTo) window._productSwiperGoTo(idx);
            else {
                const mainImg = document.getElementById('productMainImage');
                if (mainImg) mainImg.src = selectedVariant.image;
            }
        } else {
            const mainImg = document.getElementById('productMainImage');
            if (mainImg) mainImg.src = selectedVariant.image;
        }
    }
    // Update stock display
    const stockEl = document.getElementById('productStock');
    const hotStock = document.getElementById('productHotStock');
    const stock = selectedVariant.stock ?? 50;
    const outOfStock = stock <= 0;
    if (stockEl) {
        stockEl.innerHTML = outOfStock
            ? `<span style="color:#dc2626;font-weight:700;font-size:14px;">${t('outOfStock')}</span>`
            : `<span style="color:#16a34a;font-size:14px;">${Icon.check()} ${t('inStock')}</span>`;
    }
    document.getElementById('addToCartBtn').disabled = outOfStock;
    document.getElementById('buyNowBtn').disabled = outOfStock;
    if (outOfStock) document.getElementById('addToCartBtn').textContent = t('outOfStock');
    else document.getElementById('addToCartBtn').textContent = t('addToCart');
    if (hotStock) {
        if (!outOfStock && stock <= 5) {
            hotStock.style.display = 'block';
            const ht = hotStock.querySelector('.hotStock-text');
            if (ht) ht.textContent = t('hurryText').replace('{n}', stock);
            const pct = Math.min(stock / 10 * 100, 100);
            const bar = hotStock.querySelector('.hotStock-progress-item');
            if (bar) bar.style.width = pct + '%';
        } else {
            hotStock.style.display = 'none';
        }
    }
    updatePriceDisplay();
    updateSubtotal();
};

function getActivePrice() {
    if (selectedVariant) return selectedVariant.price;
    return product ? product.price : 0;
}

function updatePriceDisplay() {
    if (!product) return;
    const p = product;
    const activePrice = getActivePrice();
    const priceEl = document.getElementById('productPrice');
    if (p.discount && p.originalPrice) {
        priceEl.innerHTML = `
            <div class="price price--medium price--on-sale">
                <dl>
                    <div class="price__regular">
                        <dd class="price__last"><span class="price-item price-item--regular">${formatPrice(p.originalPrice)}</span></dd>
                    </div>
                    <div class="price__sale">
                        <dd class="price__last"><span class="price-item price-item--sale">${formatPrice(activePrice)}</span></dd>
                    </div>
                    <small class="unit-price caption hidden">
                        <dt class="visually-hidden">Unit price</dt>
                        <dd class="price__last"><span></span><span aria-hidden="true">/</span><span class="visually-hidden">&nbsp;per&nbsp;</span><span></span></dd>
                    </small>
                </dl>
            </div>`;
    } else {
        priceEl.innerHTML = `
            <div class="price price--medium">
                <dl>
                    <div class="price__regular">
                        <dd class="price__last"><span class="price-item price-item--regular">${formatPrice(activePrice)}</span></dd>
                    </div>
                    <small class="unit-price caption hidden">
                        <dt class="visually-hidden">Unit price</dt>
                        <dd class="price__last"><span></span><span aria-hidden="true">/</span><span class="visually-hidden">&nbsp;per&nbsp;</span><span></span></dd>
                    </small>
                </dl>
            </div>`;
    }
}

window.changeQty = function(delta) {
    productQty = Math.max(1, productQty + delta);
    document.getElementById('productQty').textContent = productQty;
    updateSubtotal();
};

function updateSubtotal() {
    if (!product) return;
    const activePrice = getActivePrice();
    const subtotal = activePrice * productQty;
    const el = document.getElementById('productSubtotal');
    if (el) el.textContent = `${t('subtotal')}: ${subtotal} ${t('currency')}`;
}

window.addToCartFromPage = function() {
    if (!product) return;
    const activePrice = getActivePrice();
    const variantLabel = selectedVariant ? (getLang() === 'ar' ? selectedVariant.name : selectedVariant.nameEn || selectedVariant.name) : '';
    let cart = JSON.parse(localStorage.getItem('vora_cart')) || [];
    const cartKey = product.id + (variantLabel ? '::' + variantLabel : '');
    const existing = cart.findIndex(i => {
        const key = i.id + (i.variantLabel ? '::' + i.variantLabel : '');
        return key === cartKey;
    });
    if (existing > -1) {
        cart[existing].qty += productQty;
    } else {
        const variantImage = selectedVariant?.image || '';
        cart.push({
            id: product.id,
            name: product.name,
            variantLabel: variantLabel,
            price: activePrice,
            image: variantImage || product.image || '',
            qty: productQty
        });
    }
    localStorage.setItem('vora_cart', JSON.stringify(cart));
    updateCartCount();
    const displayName = product.name + (variantLabel ? ` (${variantLabel})` : '');
    showMessage(`${Icon.check()} تمت إضافة "${displayName}" إلى السلة`);
};

window.buyNow = function() {
    if (!product) return;
    addToCartFromPage();
    setTimeout(() => { window.location.href = 'checkout.html'; }, 300);
};

window.toggleAdditionalInfo = function(el) {
    el.classList.toggle('open');
    const content = document.getElementById('additionalInfoContent');
    content.classList.toggle('open');
};

function updateCartCount() {
    const cart = JSON.parse(localStorage.getItem('vora_cart')) || [];
    const totalQty = cart.reduce((s, i) => s + i.qty, 0);
    const el = document.getElementById('cartCount');
    if (el) el.textContent = totalQty;
}

window.shareOnWhatsApp = function() {
    if (!product) return;
    const settings = JSON.parse(localStorage.getItem('vora_settings')) || {};
    const wa = settings.whatsapp || '201000000000';
    const activePrice = getActivePrice();
    const msg = `${Icon.phone()} ${t('whatsappMsg').replace('{name}', product.name).replace('{price}', activePrice).replace('{currency}', t('currency'))}`;
    window.open(`https://wa.me/${wa}?text=${encodeURIComponent(msg)}`, '_blank');
};

function trackRecentlyViewed(id) {
    let viewed = JSON.parse(localStorage.getItem('vora_recently_viewed')) || [];
    viewed = viewed.filter(v => v !== id);
    viewed.unshift(id);
    if (viewed.length > 10) viewed = viewed.slice(0, 10);
    localStorage.setItem('vora_recently_viewed', JSON.stringify(viewed));
}

function updateUserNav() {
    const user = JSON.parse(localStorage.getItem('vora_user'));
    const desktopEl = document.getElementById('userNavLink');
    const mobileEl = document.getElementById('userNavMobile');
    if (user && user.username) {
        const name = user.username.length > 10 ? user.username.substring(0, 10) + '…' : user.username;
        if (desktopEl) { desktopEl.innerHTML = `<span class="text-sm font-semibold text-stone-700 hover:text-amber-600">${name}</span>`; desktopEl.href = 'home.html'; }
        if (mobileEl) { mobileEl.innerHTML = `<span class="text-sm font-semibold text-white/80">${name}</span>`; mobileEl.href = 'home.html'; }
    } else {
        if (desktopEl) { desktopEl.innerHTML = '👤'; desktopEl.href = 'index.html'; }
        if (mobileEl) { mobileEl.innerHTML = '👤'; mobileEl.href = 'index.html'; }
    }
    if (user && (user.role === 'admin' || user.role === 'manager')) {
        document.getElementById('adminNavLink')?.classList.remove('hidden');
        document.getElementById('adminNavMobile')?.classList.remove('hidden');
    } else if (user && user.uid) {
        getUserFromFirestore(user.uid).then(liveUser => {
            if (liveUser && (liveUser.role === 'admin' || liveUser.role === 'manager')) {
                document.getElementById('adminNavLink')?.classList.remove('hidden');
                document.getElementById('adminNavMobile')?.classList.remove('hidden');
                user.role = liveUser.role;
                localStorage.setItem('vora_user', JSON.stringify(user));
            }
        }).catch(() => {});
    }
}

window.openMobileMenu = function() { document.getElementById('mobileMenu').classList.add('open'); document.getElementById('mobileMenuOverlay').classList.add('show'); document.body.style.overflow = 'hidden'; };
window.closeMobileMenu = function() { document.getElementById('mobileMenu').classList.remove('open'); document.getElementById('mobileMenuOverlay').classList.remove('show'); document.body.style.overflow = 'auto'; };
window.navigateTo = function(url) { closeMobileMenu(); setTimeout(() => { window.location.href = url; }, 150); };
window.logout = function() { localStorage.removeItem('vora_user'); window.location.href = 'home.html'; };

window.showMessage = function(msg) {
    const box = document.getElementById('messageBox');
    const text = document.getElementById('messageText');
    const iconEl = document.getElementById('messageIcon');
    if (box && text) {
        text.innerHTML = msg;
        if (iconEl) {
            const isSuccess = msg.includes(t('success')) || msg.includes('✅');
            iconEl.innerHTML = isSuccess ? Icon.check() : Icon.warning();
            iconEl.className = 'flex justify-center text-4xl mb-2 ' + (isSuccess ? 'text-green-600' : 'text-red-500');
        }
        box.classList.remove('hidden');
    }
};
window.hideMessage = function() { document.getElementById('messageBox').classList.add('hidden'); };

// Cart Drawer
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
    if (cart.length === 0) { showMessage(`⚠️ ${t('prodCartEmpty')}`); return; }
    window.location.href = 'checkout.html';
};
function renderCartDrawer() {
    const cart = JSON.parse(localStorage.getItem('vora_cart')) || [];
    const body = document.getElementById('cartDrawerBody');
    const footer = document.getElementById('cartDrawerFooter');
    if (cart.length === 0) {
        body.innerHTML = `<div class="text-center py-16 space-y-4"><div class="text-6xl">🛍️</div><p class="font-bold text-stone-900 text-lg">${t('cartEmptyTitle')}</p><p class="text-stone-600 text-sm">${t('cartEmptyHint')}</p></div>`;
        footer.classList.add('hidden'); return;
    }
    footer.classList.remove('hidden');
    body.innerHTML = "";
    let total = 0;
    cart.forEach((item, index) => {
        total += item.price * item.qty;
        const subtotal = item.price * item.qty;
        const itemSrc = item.image || (allProds.find(p => p.id === item.id)?.image) || '';
        const drawerImage = itemSrc ? `<img src="${itemSrc}" alt="${item.name}" loading="lazy" class="w-full h-full object-cover rounded-lg">` : BOTTLE_SVG;
        const displayName = item.variantLabel ? `${item.name} (${item.variantLabel})` : item.name;
        const row = document.createElement('div');
        row.className = "flex gap-4 pb-4 border-b border-stone-200 last:border-0 group hover:bg-stone-50/50 rounded-lg p-3 transition";
        row.innerHTML = `
            <div class="relative w-20 h-24 bg-gradient-to-br from-amber-100 to-stone-100 rounded-lg flex items-center justify-center text-amber-600 flex-shrink-0 shadow-md overflow-hidden">
                ${drawerImage}
                <div class="absolute inset-0 rounded-lg bg-gradient-to-t from-black/10 to-transparent pointer-events-none"></div>
            </div>
            <div class="flex-1 space-y-2">
                <div>
                    <p class="font-bold text-stone-900 text-sm">${displayName}</p>
                    <p class="text-xs text-stone-500">${item.price} ${t('currency')}</p>
                </div>
                <div class="flex items-center gap-1 bg-stone-100 rounded-lg w-fit">
                    <button onclick="changeDrawerQty(${index}, -1)" class="w-7 h-7 flex items-center justify-center hover:bg-stone-200 rounded transition text-sm font-bold">−</button>
                    <span class="w-8 text-center font-bold text-stone-900 text-sm">${item.qty}</span>
                    <button onclick="changeDrawerQty(${index}, 1)" class="w-7 h-7 flex items-center justify-center hover:bg-stone-200 rounded transition text-sm font-bold">+</button>
                </div>
            </div>
            <div class="flex flex-col items-end justify-between">
                <button class="text-red-500 hover:text-red-700 opacity-100 transition text-lg" onclick="removeDrawerItem(${index})">${Icon.trash()}</button>
                <p class="font-bold text-amber-600 text-sm">${subtotal} ${t('currency')}</p>
            </div>`;
        body.appendChild(row);
    });
    document.getElementById('cartDrawerTotal').textContent = `${total} ${t('currency')}`;
    document.getElementById('cartSubtotal').textContent = `${total} ${t('currency')}`;
}
window.changeDrawerQty = function(index, change) {
    let cart = JSON.parse(localStorage.getItem('vora_cart')) || [];
    cart[index].qty += change;
    if (cart[index].qty <= 0) cart.splice(index, 1);
    localStorage.setItem('vora_cart', JSON.stringify(cart));
    renderCartDrawer();
    updateCartCount();
};
window.removeDrawerItem = function(index) {
    let cart = JSON.parse(localStorage.getItem('vora_cart')) || [];
    cart.splice(index, 1);
    localStorage.setItem('vora_cart', JSON.stringify(cart));
    renderCartDrawer();
    updateCartCount();
};

document.addEventListener("DOMContentLoaded", async () => {
    await loadSettings();
    updateUserNav();
    setTimeout(() => { const loader = document.getElementById('pageLoader'); if (loader) loader.classList.add('hidden'); }, 400);
    document.querySelectorAll('.lang-toggle-btn').forEach(el => { const text = getLang() === 'ar' ? 'EN' : 'AR'; el.textContent = '🌐 ' + text; });
    document.getElementById('langToggle').textContent = getLang() === 'ar' ? 'EN' : 'AR';
    loadProduct();
    updateCartCount();
    if (window.applyTranslations) setTimeout(applyTranslations, 100);
});
window.addEventListener('beforeunload', () => {
    if (window._productSwiper) clearInterval(window._productSwiper);
});
