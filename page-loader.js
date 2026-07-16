// Page Loader with Skeleton Support
// Include in all pages: <script src="page-loader.js" defer></script>

(function() {
    'use strict';

    // Page loader state
    const loaderState = {
        isPageLoaded: false,
        skeletonElements: [],
        contentElements: []
    };

    // Initialize page loader
    function initPageLoader() {
        // Find all skeleton elements
        loaderState.skeletonElements = document.querySelectorAll('.skeleton, [data-skeleton]');
        loaderState.contentElements = document.querySelectorAll('[data-content]');

        // Show skeletons immediately
        loaderState.skeletonElements.forEach(el => {
            el.style.display = '';
            el.classList.add('skeleton-active');
        });

        // Hide content initially
        loaderState.contentElements.forEach(el => {
            el.style.display = 'none';
        });

        // When DOM is ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', onPageReady);
        } else {
            onPageReady();
        }
    }

    // Called when page is ready
    function onPageReady() {
        loaderState.isPageLoaded = true;
        
        // Small delay to ensure smooth transition
        setTimeout(() => {
            hideSkeletons();
            showContent();
        }, 300);
    }

    // Hide skeleton elements
    function hideSkeletons() {
        loaderState.skeletonElements.forEach(el => {
            el.style.display = 'none';
            el.classList.remove('skeleton-active');
        });
    }

    // Show content elements
    function showContent() {
        loaderState.contentElements.forEach(el => {
            el.style.display = '';
        });
    }

    // Register skeleton element
    function registerSkeleton(element) {
        if (!loaderState.isPageLoaded) {
            loaderState.skeletonElements.push(element);
            element.style.display = '';
            element.classList.add('skeleton-active');
        }
    }

    // Register content element
    function registerContent(element) {
        if (!loaderState.isPageLoaded) {
            loaderState.contentElements.push(element);
            element.style.display = 'none';
        }
    }

    // Public API
    window.PageLoader = {
        init: initPageLoader,
        registerSkeleton,
        registerContent,
        hideSkeletons,
        showContent,
        onReady: (callback) => {
            if (loaderState.isPageLoaded) {
                callback();
            } else {
                document.addEventListener('DOMContentLoaded', callback);
            }
        }
    };
})();

// Skeleton template generators
window.SkeletonTemplates = {
    // Product card skeleton
    productCard() {
        return `
        <div class="product-card skeleton-card animate-fadeInUp">
            <div class="skeleton skeleton-image"></div>
            <div class="p-4 space-y-3">
                <div class="skeleton skeleton-text w-3/4"></div>
                <div class="skeleton skeleton-title"></div>
                <div class="skeleton skeleton-text w-1/2"></div>
                <div class="skeleton skeleton-button"></div>
            </div>
        </div>
        `;
    },

    // Category section skeleton
    categorySection() {
        return `
        <div class="category-section">
            <div class="flex items-center justify-between mb-6">
                <div class="skeleton skeleton-title w-48"></div>
                <div class="skeleton skeleton-text w-32"></div>
            </div>
            <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
                ${Array(4).fill(0).map(() => window.SkeletonTemplates.productCard()).join('')}
            </div>
        </div>
        `;
    },

    // Banner grid skeleton
    bannerGrid() {
        return `
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
            ${Array(3).fill(0).map(() => `
            <div class="skeleton skeleton-card" style="aspect-ratio: 4/3; min-height: 200px;"></div>
            `).join('')}
        </div>
        `;
    },

    // Brand slider skeleton
    brandSlider() {
        return `
        <div class="brand-track">
            ${Array(8).fill(0).map(() => `
            <div class="skeleton skeleton-avatar" style="width: 80px; height: 80px;"></div>
            `).join('')}
        </div>
        `;
    },

    // Hero skeleton
    hero() {
        return `
        <div class="space-y-6">
            <div class="skeleton skeleton-text w-48"></div>
            <div class="skeleton skeleton-title w-3/4"></div>
            <div class="skeleton skeleton-text w-1/2"></div>
            <div class="flex gap-4 pt-2">
                <div class="skeleton skeleton-button flex-1"></div>
                <div class="skeleton skeleton-button flex-1"></div>
            </div>
        </div>
        `;
    },

    // Newsletter skeleton
    newsletter() {
        return `
        <div class="newsletter-section">
            <div class="skeleton skeleton-title w-64 mx-auto"></div>
            <div class="skeleton skeleton-text w-80 mx-auto mt-2"></div>
            <div class="newsletter-form mt-4">
                <div class="skeleton skeleton-text w-full md:w-80 mx-auto"></div>
                <div class="skeleton skeleton-button w-full md:w-32 mx-auto mt-3"></div>
            </div>
        </div>
        `;
    },

    // Cart drawer skeleton
    cartDrawer() {
        return `
        <div class="space-y-4">
            ${Array(3).fill(0).map(() => `
            <div class="flex gap-4">
                <div class="skeleton skeleton-image" style="width: 80px; height: 80px; border-radius: 12px;"></div>
                <div class="flex-1 space-y-2">
                    <div class="skeleton skeleton-title w-3/4"></div>
                    <div class="skeleton skeleton-text w-1/2"></div>
                    <div class="skeleton skeleton-text w-1/4"></div>
                </div>
            </div>
            `).join('')}
        </div>
        `;
    }
};

// Initialize page loader
document.addEventListener('DOMContentLoaded', () => {
    window.PageLoader.init();
});