// Shared Components for VORA Perfume Shop
// Include this file in all pages: <script src="components.js" charset="utf-8"></script>

const Components = {
    // Render Navigation Bar
    renderNav() {
        const lang = localStorage.getItem('vora_lang') || 'ar';
        const isRTL = lang === 'ar';
        const isAdmin = document.body.classList.contains('admin-page') || window.location.pathname.includes('admin.html');
        const isAccount = window.location.pathname.includes('account.html');
        
        return `
<nav class="fixed top-0 left-0 right-0 z-50 bg-[#f8c8dc]/95 backdrop-blur-md border-b border-[#d88aa8]">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center h-20">
        <!-- Mobile: Left - Profile + Menu -->
        <div class="flex md:hidden items-center gap-2">
            <a href="index.html" class="text-stone-700 hover:text-amber-600 transition text-xs" data-i18n="footerAccount" title="حساب المستخدم" id="userNavMobile">
                <svg class="w-2.5 h-2.5 inline-block align-middle" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                    <circle cx="12" cy="7" r="4"/>
                </svg>
            </a>
            <button onclick="openMobileMenu()" class="text-stone-700 text-xl">
                <svg class="w-5 h-5 inline-block align-middle" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="3" y1="12" x2="21" y2="12"/>
                    <line x1="3" y1="6" x2="21" y2="6"/>
                    <line x1="3" y1="18" x2="21" y2="18"/>
                </svg>
            </button>
        </div>
        
        <!-- Center: VORA + Subtitle -->
        <div class="flex flex-col items-center md:items-start md:flex-1">
            <a href="home.html" id="navLogo" class="text-center md:text-right">
                <span class="text-2xl font-bold text-stone-900 tracking-widest" style="font-family:'Playfair Display',serif;">VORA</span>
            </a>
            <span class="text-[11px] text-stone-500 md:hidden -mt-0.5" style="font-family:'Playfair Display',serif;font-style:italic;letter-spacing:0.5px;">the essence of radiance</span>
        </div>
        
        <!-- Desktop: Nav Links -->
        <div class="hidden md:flex items-center gap-8">
            <a href="home.html" class="text-stone-600 hover:text-amber-600 transition font-medium text-sm" data-i18n="navHome"></a>
            <a href="shop.html" class="text-stone-600 hover:text-amber-600 transition font-medium text-sm" data-i18n="navShop"></a>
            <a href="brands.html" class="text-stone-600 hover:text-amber-600 transition font-medium text-sm" data-i18n="navBrands">
                <svg class="w-4 h-4 inline-block align-middle" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M3 9h18v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9Z"/>
                    <path d="M3 9 6 3h12l3 6"/>
                    <path d="M9 21v-6h6v6"/>
                </svg>
            </a>
            <a href="about.html" class="text-stone-600 hover:text-amber-600 transition font-medium text-sm" data-i18n="navAbout"></a>
            <a href="admin.html" id="adminNavLink" class="hidden text-stone-600 hover:text-amber-600 transition font-medium text-sm" data-i18n="navAdmin">
                <svg class="w-4 h-4 inline-block align-middle" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="3"/>
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                </svg>
            </a>
        </div>
        
        <!-- Right: Search, Lang (desktop), Profile (desktop), Cart -->
        <div class="flex items-center gap-3 md:gap-5">
            <button onclick="openSearchOverlay()" class="text-stone-700 hover:text-amber-600 transition text-lg">
                <svg class="w-4 h-4 inline-block align-middle" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="11" cy="11" r="8"/>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
            </button>
            <button onclick="toggleLang()" class="hidden md:inline text-stone-700 hover:text-amber-600 transition text-xs font-bold px-2 py-1 border border-stone-300 rounded" id="langToggle" data-i18n="langToggle">EN</button>
            <a href="index.html" class="hidden md:inline text-stone-700 hover:text-amber-600 transition text-xs" data-i18n="footerAccount" title="حساب المستخدم" id="userNavLink">
                <svg class="w-2.5 h-2.5 inline-block align-middle" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                    <circle cx="12" cy="7" r="4"/>
                </svg>
            </a>
            <button onclick="openCartDrawer()" class="relative text-stone-700 hover:text-amber-600 transition">
                <span class="text-xl"><svg class="w-4 h-4 inline-block align-middle" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg></span>
                <span id="cartCount" class="absolute -top-2 -right-2 bg-gradient-to-r from-red-500 to-red-600 text-white text-[10px] rounded-full w-4.5 h-4.5 flex items-center justify-center font-bold shadow-lg" style="min-width:18px;height:18px;">0</span>
            </button>
        </div>
    </div>
</nav>

<!-- Mobile Menu -->
<div id="mobileMenuOverlay" onclick="closeMobileMenu()"></div>
<div id="mobileMenu">
    <div class="menu-header">
        <span class="text-sm font-bold text-white/40 tracking-widest uppercase" data-i18n="menuTitle">القائمة</span>
        <button onclick="closeMobileMenu()"><svg class="w-4 h-4 inline-block align-middle" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
    </div>
    <div class="menu-link" onclick="navigateTo('index.html')" data-i18n="menuProfile"><svg class="w-4 h-4 inline-block align-middle" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> Profile</div>
    <div class="menu-link" onclick="navigateTo('home.html')" data-i18n="menuHome"><svg class="w-4 h-4 inline-block align-middle" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg> Home</div>
    <div class="menu-link" onclick="navigateTo('shop.html')" data-i18n="menuShop"><svg class="w-4 h-4 inline-block align-middle" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg> Shop</div>
    <div class="menu-link" onclick="navigateTo('shop.html?section=best-sellers')" data-i18n="menuOffers"><svg class="w-4 h-4 inline-block align-middle" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2H2v10l9.29 9.29c.94.94 2.48.94 3.42 0l6.58-6.58c.94-.94.94-2.48 0-3.42L12 2Z"/><path d="M7 7h.01"/></svg> Special offers</div>
    <div class="menu-link" onclick="navigateTo('brands.html')" data-i18n="menuBrands"><svg class="w-4 h-4 inline-block align-middle" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9h18v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9Z"/><path d="M3 9 6 3h12l3 6"/><path d="M9 21v-6h6v6"/></svg> Shop by brand</div>
    <div class="menu-link" onclick="navigateTo('shop.html?section=new-arrivals')" data-i18n="menuNewArrivals"><svg class="w-4 h-4 inline-block align-middle" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg> New arrival</div>
    <div class="menu-link" onclick="navigateTo('about.html')" data-i18n="menuAbout"><svg class="w-4 h-4 inline-block align-middle" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg> About</div>
    <div class="menu-link" onclick="closeMobileMenu(); setTimeout(()=>{ var f=document.getElementById('footer'); if(f) f.scrollIntoView({behavior:'smooth'}); },100);" data-i18n="menuContact"><svg class="w-4 h-4 inline-block align-middle" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg> Contact</div>
    <a href="admin.html" id="adminNavMobile" class="hidden" onclick="closeMobileMenu()"><svg class="w-4 h-4 inline-block align-middle" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg> Admin</a>
    <div class="border-t border-white/10 my-2"></div>
    <div class="menu-link text-amber-400/80 font-semibold" onclick="navigateTo('index.html')" data-i18n="menuSignIn"><svg class="w-4 h-4 inline-block align-middle" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="2.5"/><path d="M12 2v14"/><path d="m19 17-4-4"/><path d="M16 21v-4"/></svg> Sign in</div>
    <div class="menu-link text-white/60" onclick="navigateTo('index.html')" data-i18n="menuCreateAccount"><svg class="w-4 h-4 inline-block align-middle" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg> Create an account</div>
    <button onclick="toggleLang(); closeMobileMenu();" class="lang-toggle-btn w-full text-right px-6 py-2.5 text-white/50 hover:text-white transition text-xs font-medium" data-i18n="langToggle"><svg class="w-4 h-4 inline-block align-middle" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg> EN</button>
    <div class="menu-link" style="color:rgba(255,255,255,0.2);font-size:12px;margin-top:2px;" onclick="logout(); closeMobileMenu();" data-i18n="menuLogout"><svg class="w-4 h-4 inline-block align-middle" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg> Logout</div>
</div>

<!-- Search Overlay -->
<div id="searchOverlay">
    <button class="search-close" onclick="closeSearchOverlay()"><svg class="w-4 h-4 inline-block align-middle" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
    <div class="search-wrap">
        <input type="text" id="searchOverlayInput" data-i18n-placeholder="searchPlaceholder" placeholder="Search for a perfume..." oninput="liveSearch(this.value)" autofocus>
        <div id="searchOverlayResults" class="search-results"></div>
    </div>
</div>

<!-- Toast Container -->
<div class="toast-container" id="toastContainer"></div>
`;
    },

    // Render Footer
    renderFooter() {
        return `
<footer class="bg-[#f8c8dc] text-[#5a2a3a] border-t border-[#d88aa8]">
    <div class="max-w-7xl mx-auto px-4 py-8">
        <div class="grid grid-cols-2 md:grid-cols-4 gap-6 mb-6">
            <div class="col-span-2 md:col-span-1">
                <div class="flex items-center gap-2 mb-2" id="footerLogo">
                    <span class="text-base font-bold text-white tracking-wider" style="font-family: 'Playfair Display', serif;">VORA</span>
                </div>
                <p class="text-xs leading-relaxed text-[#666]" data-i18n="footerDesc">عطور فاخرة تجمع بين الأصالة والحداثة.</p>
            </div>
            <div>
                <h4 class="text-white font-semibold text-xs mb-2" data-i18n="footerQuickLinks">روابط سريعة</h4>
                <ul class="space-y-1.5 text-xs">
                    <li><a href="home.html" class="hover:text-[var(--primary)] transition" data-i18n="navHome">الرئيسية</a></li>
                    <li><a href="shop.html" class="hover:text-[var(--primary)] transition" data-i18n="navShop">المتجر</a></li>
                    <li><a href="admin.html" class="hover:text-[var(--primary)] transition" data-i18n="navAdmin">الإدارة</a></li>
                    <li><a href="return-policy.html" class="hover:text-[var(--primary)] transition" id="footerReturnPolicy" data-i18n="returnPolicy">سياسة الإرجاع</a></li>
                    <li><a href="tracking.html" class="hover:text-[var(--primary)] transition" data-i18n="footerTrack"><svg class="w-4 h-4 inline-block align-middle" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M16 16 2 16M18 5h2a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1"/><path d="M10 10 h4 v4 h-4 z"/></svg> تتبع الطلب</a></li>
                    <li><a href="account.html" class="hover:text-[var(--primary)] transition" data-i18n="footerAccount"><svg class="w-4 h-4 inline-block align-middle" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> الحساب</a></li>
                </ul>
            </div>
            <div>
                <h4 class="text-white font-semibold text-xs mb-2" data-i18n="footerContact">تواصل معنا</h4>
                <ul class="space-y-1.5 text-xs">
                    <li id="footerWhatsapp">واتساب: 01000000000</li>
                    <li id="footerEmail">بريد: info@vora.com</li>
                    <li id="footerInstagram">انستجرام: v0ra.eg</li>
                </ul>
            </div>
            <div>
                <h4 class="text-white font-semibold text-xs mb-2" data-i18n="footerPaymentTitle">طرق الدفع</h4>
                <ul class="space-y-1.5 text-xs">
                    <li data-i18n="footerVisa"><svg class="w-4 h-4 inline-block align-middle" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg> فيزا / ماستركارد</li>
                    <li data-i18n="footerVodafoneCash"><svg class="w-4 h-4 inline-block align-middle" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg> فودافون كاش</li>
                    <li data-i18n="footerInstaPay"><svg class="w-4 h-4 inline-block align-middle" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18"/><path d="M3 10h18"/><path d="M5 6l7-3 7 3"/><path d="M4 10v11"/><path d="M20 10v11"/></svg> إنستا باي</li>
                    <li data-i18n="footerCod"><svg class="w-4 h-4 inline-block align-middle" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2"/><path d="M6 12h.01M18 12h.01"/></svg> الدفع عند الاستلام</li>
                </ul>
            </div>
        </div>
        <div class="border-t border-[#d88aa8] pt-4 text-center text-[10px] text-[#5a2a3a]">
            &#169; 2026 VORA. <span data-i18n="footerRights">جميع الحقوق محفوظة</span>.
        </div>
    </div>
</footer>
`;
    },

    // Render Cart Drawer
    renderCartDrawer() {
        return `
<!-- Cart Drawer -->
<div id="cartDrawerOverlay" class="fixed inset-0 bg-black/50 backdrop-blur-sm hidden z-40 transition-all" onclick="closeCartDrawer()"></div>
<div id="cartDrawer" class="fixed right-0 top-0 h-screen w-full max-w-md bg-white shadow-2xl transform translate-x-full transition-transform duration-300 z-50 overflow-hidden flex flex-col">
    <div class="sticky top-0 bg-gradient-to-b from-white to-stone-50 p-6 border-b border-stone-200 flex justify-between items-center">
        <div>
            <h3 class="text-2xl font-bold text-stone-900" data-i18n="cartDrawerTitle"><svg class="w-6 h-6 inline-block" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg></h3>
            <p class="text-sm text-stone-500" data-i18n="cartDrawerSelected">عطورك المختارة</p>
        </div>
        <button onclick="closeCartDrawer()" class="text-2xl text-stone-400 hover:text-stone-900 transition"><svg class="w-4 h-4 inline-block align-middle" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
    </div>
    
    <div id="cartDrawerBody" class="flex-1 overflow-y-auto p-6 space-y-4"></div>
    
    <div id="cartDrawerFooter" class="hidden sticky bottom-0 bg-gradient-to-t from-stone-50 via-white border-t border-stone-200 p-6 space-y-4">
        <div class="space-y-2 pb-4 border-b border-stone-200">
            <div class="flex justify-between text-sm text-stone-600">
                <span data-i18n="cartDrawerSubtotal">إجمالي المنتجات:</span>
                <span id="cartSubtotal">0 ج.م</span>
            </div>
            <div class="flex justify-between text-sm text-stone-600" style="display:none">
                <span data-i18n="cartDrawerShipping">الشحن:</span>
                <span id="cartShipping">مجاني</span>
            </div>
        </div>
        <div class="flex justify-between text-lg font-bold text-stone-900 pb-4">
            <span data-i18n="cartDrawerTotal">الإجمالي:</span>
            <span id="cartDrawerTotal" class="bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">0 ج.م</span>
        </div>
        <button onclick="goToCheckout()" class="w-full py-3 bg-gradient-to-r from-amber-600 to-amber-700 text-white font-bold rounded-lg hover:shadow-lg transition transform hover:scale-105 flex items-center justify-center gap-2">
            <svg class="w-4 h-4 inline-block align-middle" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg> <span data-i18n="cartDrawerCheckout">إتمام الطلب</span>
        </button>
        <button onclick="closeCartDrawer()" class="w-full py-2 border-2 border-stone-200 text-stone-900 font-semibold rounded-lg hover:border-stone-300 transition" data-i18n="cartDrawerContinue">
            مواصلة التسوق
        </button>
    </div>
</div>
`;
    },

    // Render Message Box
    renderMessageBox() {
        return `
<div id="messageBox" class="hidden fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 transition-all">
    <div class="bg-white rounded-2xl p-8 max-w-xs w-full text-center shadow-2xl border border-stone-100 space-y-4 animate-scaleIn">
        <div id="messageIcon" class="mx-auto text-4xl"><svg class="w-4 h-4 inline-block align-middle" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div>
        <p id="messageText" class="text-base font-medium text-stone-800 leading-relaxed"></p>
        <button onclick="hideMessage()" class="w-full py-2.5 bg-amber-600 text-white rounded-lg font-semibold hover:bg-amber-700 transition" data-i18n="okBtn"></button>
    </div>
</div>
`;
    },

    // Initialize all components (only if not already in page)
    init() {
        const noNav = document.body.hasAttribute('data-no-nav');
        if (!noNav && !document.querySelector('nav')) {
            document.body.insertAdjacentHTML('afterbegin', this.renderNav());
        }
        if (!document.querySelector('footer')) {
            document.body.insertAdjacentHTML('beforeend', this.renderFooter());
        }
        if (!document.getElementById('cartDrawer')) {
            const footer = document.querySelector('footer');
            if (footer) {
                footer.insertAdjacentHTML('beforebegin', this.renderCartDrawer());
            } else {
                document.body.insertAdjacentHTML('beforeend', this.renderCartDrawer());
            }
        }
        if (!document.getElementById('messageBox')) {
            document.body.insertAdjacentHTML('beforeend', this.renderMessageBox());
        }
        if (window.applyTranslations) {
            setTimeout(() => window.applyTranslations(), 0);
        }
    }
};

// Auto-initialize on DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
    Components.init();
});

// Export for manual initialization if needed
window.Components = Components;