/* =====================================================================
   Global Markets Gateway — shared storefront code
   Layout (header, menus, search, cart drawer, footer), cart storage,
   API helper, product cards, toasts, scroll reveals.
   ===================================================================== */
(function () {
  'use strict';

  // ---------- Icons ----------
  const I = {
    home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M4 10.5L12 4l8 6.5V20a1 1 0 0 1-1 1h-4.5v-6h-5v6H5a1 1 0 0 1-1-1z"/></svg>',
    grid: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="4" y="4" width="6.5" height="6.5" rx="1.6"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.6"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.6"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.6"/></svg>',
    cart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 4h2.2l2.2 11h10.4l2-8H6.3"/><circle cx="9" cy="19.5" r="1.4"/><circle cx="17" cy="19.5" r="1.4"/></svg>',
    menu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h10"/></svg>',
    search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.2-4.2"/></svg>',
    bag: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M5 8h14l-1.2 11.2a2 2 0 0 1-2 1.8H8.2a2 2 0 0 1-2-1.8L5 8z"/><path d="M9 10V7a3 3 0 0 1 6 0v3" stroke-linecap="round"/></svg>',
    close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
    arrow: '<svg class="flip" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
    left: '<svg class="flip" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 6l-6 6 6 6"/></svg>',
    right: '<svg class="flip" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg>',
    truck: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"><path d="M3 6h11v10H3zM14 9h4l3 3.5V16h-7z"/><circle cx="7" cy="17.5" r="1.8" fill="#fff"/><circle cx="17.5" cy="17.5" r="1.8" fill="#fff"/></svg>',
    shield: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"><path d="M12 3l7.5 3v5.5c0 4.6-3.2 8.3-7.5 9.5-4.3-1.2-7.5-4.9-7.5-9.5V6L12 3z"/><path d="M8.8 12.2l2.2 2.2 4.2-4.4" stroke-linecap="round"/></svg>',
    lock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><rect x="5" y="10.5" width="14" height="10" rx="2"/><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5"/></svg>',
    card: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="5.5" width="18" height="13" rx="2.5"/><path d="M3 10h18M7 15h3"/></svg>',
    refresh: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M20 11a8 8 0 0 0-14.3-4.9L4 8"/><path d="M4 4v4h4"/><path d="M4 13a8 8 0 0 0 14.3 4.9L20 16"/><path d="M20 20v-4h-4"/></svg>',
    pin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/></svg>',
    phone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/></svg>',
    mail: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3.5 6.5l8.5 6.5 8.5-6.5"/></svg>',
    wa: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.2a9.7 9.7 0 0 0-8.4 14.6L2.2 21.8l5.1-1.3A9.7 9.7 0 1 0 12 2.2zm0 17.7a8 8 0 0 1-4.1-1.1l-.3-.2-3 .8.8-2.9-.2-.3A8 8 0 1 1 12 19.9zm4.4-6c-.2-.1-1.4-.7-1.7-.8-.2-.1-.4-.1-.5.1l-.8 1c-.1.2-.3.2-.5.1a6.6 6.6 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.5-.4h-.5a.9.9 0 0 0-.6.3 2.7 2.7 0 0 0-.9 2c0 1.2.9 2.4 1 2.5.1.2 1.7 2.7 4.2 3.8 1.6.7 2.2.7 3 .6.5-.1 1.4-.6 1.6-1.2.2-.6.2-1.1.1-1.2l-.5-.4z"/></svg>'
  };

  // ---------- Language (English / Arabic) ----------
  const LANG = (() => { try { const s = localStorage.getItem('gmg_lang'); if (s === 'ar' || s === 'en') return s; } catch (e) { /* ignore */ } return (navigator.language || '').toLowerCase().startsWith('ar') ? 'ar' : 'en'; })();
  const RTL = LANG === 'ar';
  document.documentElement.lang = LANG;
  document.documentElement.dir = RTL ? 'rtl' : 'ltr';
  // English text is the key; Arabic is looked up. Missing entries simply stay in English.
  const AR = {
    // header / nav / footer
    'Shop all': 'كل المنتجات', 'Power Banks': 'بنوك الطاقة', 'Chargers': 'الشواحن', 'Cables': 'الكابلات', 'Car Chargers': 'شواحن السيارة',
    'Home': 'الرئيسية', 'All products': 'جميع المنتجات', 'Track order': 'تتبع الطلب', 'Contact us': 'اتصل بنا', 'Categories': 'الفئات', 'Shop': 'تسوّق', 'Cart': 'السلة', 'Track': 'تتبع',
    'Search': 'بحث', 'Open menu': 'فتح القائمة', 'Close': 'إغلاق', 'Your cart': 'سلة التسوق', 'Search chargers, power banks, cables…': 'ابحث عن شواحن، بنوك طاقة، كابلات…',
    'Popular': 'الأكثر بحثاً', 'GaN chargers': 'شواحن GaN', 'Magnetic': 'مغناطيسي', 'See all results': 'عرض كل النتائج', 'Sold out': 'نفدت الكمية',
    'No products match “{q}”. Try “charger”, “cable” or “power bank”.': 'لا توجد منتجات تطابق “{q}”. جرّب “شاحن” أو “كابل” أو “بنك طاقة”.',
    'Need help choosing?': 'تحتاج مساعدة في الاختيار؟', 'Chat on WhatsApp': 'تواصل عبر واتساب',
    'Genuine MEVRIO charging gear — GaN chargers, magnetic power banks and braided cables — delivered across the Sultanate of Oman.': 'منتجات شحن ميفريو الأصلية — شواحن GaN وبنوك طاقة مغناطيسية وكابلات مضفّرة — مع التوصيل لجميع أنحاء سلطنة عُمان.',
    'Cash on delivery': 'الدفع عند الاستلام', 'Help': 'المساعدة', 'Track your order': 'تتبع طلبك', 'Delivery': 'التوصيل', 'Returns & warranty': 'الإرجاع والضمان', 'Privacy': 'الخصوصية', 'Contact': 'تواصل معنا',
    'Sultanate of Oman': 'سلطنة عُمان', 'CR': 'س.ت', 'Tax ID': 'الرقم الضريبي', 'Shop by category': 'تسوّق حسب الفئة', '{n} items': '{n} منتجات', '1 item': 'منتج واحد',
    // cart
    'Add {x} more for free delivery': 'أضف {x} للحصول على توصيل مجاني', 'You get free delivery on this order': 'طلبك مؤهل للتوصيل المجاني',
    'Quantity': 'الكمية', 'Decrease': 'إنقاص', 'Increase': 'زيادة', 'Remove': 'إزالة', "That's the maximum available for this item.": 'هذه أقصى كمية متاحة لهذا المنتج.',
    'Your cart is empty': 'سلتك فارغة', 'Fast chargers, power banks and cables are waiting.': 'الشواحن السريعة وبنوك الطاقة والكابلات بانتظارك.', 'Start shopping': 'ابدأ التسوق',
    'Subtotal': 'المجموع الفرعي', 'Delivery and VAT calculated at checkout.': 'يتم احتساب التوصيل وضريبة القيمة المضافة عند الدفع.', 'Checkout': 'إتمام الشراء', 'View cart': 'عرض السلة',
    'Sorry, this item is sold out.': 'عذراً، نفدت كمية هذا المنتج.', 'You already have the maximum available ({n}) in your cart.': 'لديك بالفعل أقصى كمية متاحة ({n}) في السلة.',
    "Added {n} — that's the maximum available right now.": 'تمت إضافة {n} — وهي أقصى كمية متاحة حالياً.', 'Added to cart': 'تمت الإضافة إلى السلة',
    '{name} is sold out and was removed.': 'نفدت كمية {name} وتمت إزالته.', 'Only {n} × {name} can be ordered — quantity updated.': 'يمكن طلب {n} فقط من {name} — تم تحديث الكمية.',
    'Add {name} to cart': 'أضف {name} إلى السلة',
    // home
    'Free delivery over OMR 25': 'توصيل مجاني فوق ٢٥ ر.ع.', 'All 11 governorates': 'جميع المحافظات الـ ١١', 'Secure Thawani checkout': 'دفع آمن عبر ثواني', 'Cards or cash on delivery': 'بطاقة أو نقداً عند الاستلام',
    '1-year warranty': 'ضمان لمدة سنة', 'Genuine MEVRIO products': 'منتجات ميفريو أصلية', '14-day returns': 'إرجاع خلال ١٤ يوماً', 'Hassle-free exchange': 'استبدال بدون تعقيد',
    'Shop now': 'تسوّق الآن', 'Add to cart': 'أضف إلى السلة', '{n} products': '{n} منتجات', '1 product': 'منتج واحد', 'Shop {name}': 'تسوّق {name}',
    "We couldn't load products": 'تعذّر تحميل المنتجات', 'Please refresh the page.': 'يرجى تحديث الصفحة.',
    // shop
    'All': 'الكل', 'Results for “{q}”': 'نتائج البحث عن “{q}”', 'Clear search': 'مسح البحث', 'Fast chargers, power banks and cables — everything to keep your devices going.': 'شواحن سريعة وبنوك طاقة وكابلات — كل ما تحتاجه لتبقى أجهزتك مشحونة.',
    'No products found': 'لا توجد منتجات', 'Try a different search or browse all products.': 'جرّب بحثاً آخر أو تصفّح جميع المنتجات.', 'Browse all': 'تصفّح الكل', 'Something went wrong': 'حدث خطأ ما',
    'Featured': 'المميّزة', 'Best selling': 'الأكثر مبيعاً', 'Price: low to high': 'السعر: من الأقل للأعلى', 'Price: high to low': 'السعر: من الأعلى للأقل', 'Newest': 'الأحدث', 'Sort by': 'ترتيب حسب', 'Search': 'بحث',
    // product
    'Product not found': 'المنتج غير موجود', 'It may have been moved or is no longer available.': 'ربما تم نقله أو لم يعد متوفراً.', 'Browse the shop': 'تصفّح المتجر',
    'Save {x}': 'وفّر {x}', 'Delivery calculated at checkout.': 'يتم احتساب التوصيل عند الدفع.', '+ {p}% VAT and delivery calculated at checkout.': 'تُضاف ضريبة {p}٪ ويُحتسب التوصيل عند الدفع.', 'Price includes VAT. Delivery calculated at checkout.': 'السعر شامل الضريبة. يُحتسب التوصيل عند الدفع.',
    'Sold out — check back soon': 'نفدت الكمية — تابعنا قريباً', 'In stock · ready to ship': 'متوفر · جاهز للشحن', 'Buy now': 'اشترِ الآن', 'Decrease quantity': 'إنقاص الكمية', 'Increase quantity': 'زيادة الكمية',
    'Delivery across Oman': 'التوصيل لجميع أنحاء عُمان', 'Muscat 1–2 days · other governorates 2–5 days · free over {x}': 'مسقط ١–٢ يوم · باقي المحافظات ٢–٥ أيام · مجاناً فوق {x}',
    'Pay your way': 'ادفع بالطريقة التي تناسبك', 'Thawani Pay (Visa, Mastercard, debit) or cash on delivery': 'ثواني (فيزا، ماستركارد، بطاقة خصم) أو الدفع عند الاستلام', 'Genuine product · 14-day returns on defects': 'منتج أصلي · إرجاع خلال ١٤ يوماً للعيوب',
    'Description': 'الوصف', 'Specifications': 'المواصفات', 'SKU': 'رمز المنتج', 'Delivery & returns': 'التوصيل والإرجاع', "That’s the most you can order right now.": 'هذه أقصى كمية يمكنك طلبها حالياً.',
    'Orders placed before 2 pm are usually dispatched the same day from Muscat. You can return a defective item within 14 days in its original packaging.': 'الطلبات قبل الساعة ٢ ظهراً تُشحن عادةً في نفس اليوم من مسقط. يمكنك إرجاع المنتج المعيب خلال ١٤ يوماً في عبوته الأصلية.',
    'Read our policies': 'اقرأ سياساتنا', 'You may also like': 'قد يعجبك أيضاً', 'Pairs well with': 'يناسبه أيضاً', 'view {n}': 'صورة {n}', 'Show image {n}': 'عرض الصورة {n}',
    // cart page
    'Order summary': 'ملخص الطلب', 'Subtotal ({n} items)': 'المجموع الفرعي ({n} منتجات)', 'Subtotal (1 item)': 'المجموع الفرعي (منتج واحد)', 'Calculated at checkout': 'يُحتسب عند الدفع', 'Estimated total': 'الإجمالي التقديري',
    'Checkout securely': 'إتمام الشراء بأمان', 'Thawani Pay or cash on delivery': 'ثواني أو الدفع عند الاستلام', 'Continue shopping': 'متابعة التسوق', 'Debit': 'بطاقة خصم',
    // checkout
    'Contact': 'بيانات التواصل', 'Full name': 'الاسم الكامل', 'Mobile number': 'رقم الهاتف', 'Email': 'البريد الإلكتروني', '(optional — for your receipt)': '(اختياري — لإرسال الإيصال)', '(optional)': '(اختياري)',
    'Please enter your name.': 'يرجى إدخال اسمك.', 'Enter an 8-digit Omani mobile number.': 'أدخل رقم هاتف عُماني من ٨ أرقام.', "That email doesn't look right.": 'البريد الإلكتروني غير صحيح.',
    'Delivery address': 'عنوان التوصيل', 'Governorate': 'المحافظة', 'Select governorate': 'اختر المحافظة', 'Please choose a governorate.': 'يرجى اختيار المحافظة.', 'City / Wilayat / Area': 'المدينة / الولاية / المنطقة', 'Please enter your area.': 'يرجى إدخال المنطقة.',
    'Address details': 'تفاصيل العنوان', 'Way, building / villa no., flat, landmark': 'رقم السكة، المبنى / الفيلا، الشقة، معلم قريب', 'Please add your address details.': 'يرجى إضافة تفاصيل العنوان.', 'Delivery notes': 'ملاحظات التوصيل',
    'Best time to call, location pin, etc.': 'أفضل وقت للاتصال، رابط الموقع، إلخ.', 'e.g. Al Khuwair': 'مثال: الخوير', 'Payment': 'الدفع', 'Show order summary': 'عرض ملخص الطلب', 'Hide order summary': 'إخفاء ملخص الطلب', 'Place order': 'تأكيد الطلب',
    'Pay online with Thawani': 'ادفع إلكترونياً عبر ثواني', 'Visa, Mastercard or Omani debit card. You’ll be taken to Thawani’s secure page to pay.': 'فيزا أو ماستركارد أو بطاقة خصم عُمانية. سيتم تحويلك إلى صفحة ثواني الآمنة للدفع.',
    'Pay by cash or card to the courier when your order arrives.': 'ادفع نقداً أو بالبطاقة لمندوب التوصيل عند وصول طلبك.', 'Pay {x}': 'ادفع {x}', 'Place order · {x}': 'تأكيد الطلب · {x}',
    'Secure checkout · your details are only used for delivery': 'دفع آمن · تُستخدم بياناتك للتوصيل فقط', 'Opening secure payment…': 'جارٍ فتح صفحة الدفع الآمن…', 'Placing order…': 'جارٍ تأكيد الطلب…',
    'Your card payment was cancelled, so no money was taken. Your cart is still here — you can try again or choose cash on delivery.': 'تم إلغاء الدفع بالبطاقة ولم يتم خصم أي مبلغ. سلتك ما زالت محفوظة — يمكنك المحاولة مجدداً أو اختيار الدفع عند الاستلام.',
    'Add something before checking out.': 'أضف منتجاً قبل إتمام الشراء.', 'Could not load checkout. Please refresh.': 'تعذّر تحميل صفحة الدفع. يرجى التحديث.', 'Online ordering is temporarily unavailable. Please contact us on WhatsApp.': 'الطلب عبر الإنترنت غير متاح مؤقتاً. يرجى التواصل معنا عبر واتساب.',
    'Free': 'مجاني', 'from {x}': 'من {x}', 'Discount': 'الخصم', 'VAT ({p}%)': 'ضريبة القيمة المضافة ({p}٪)', 'VAT ({p}%) included': 'ضريبة القيمة المضافة ({p}٪) مشمولة', 'Total': 'الإجمالي',
    '{d} days': '{d} أيام',
    'We could not open the Thawani payment page right now. Please try again or choose Cash on Delivery.': 'تعذّر فتح صفحة الدفع عبر ثواني حالياً. يرجى المحاولة مجدداً أو اختيار الدفع عند الاستلام.',
    // order / track
    'Awaiting payment': 'بانتظار الدفع', 'Confirmed': 'مؤكد', 'Being prepared': 'قيد التجهيز', 'On the way': 'في الطريق', 'Delivered': 'تم التوصيل', 'Cancelled': 'ملغي', 'Refunded': 'تم الاسترداد',
    'Paid': 'مدفوع', 'Pay on delivery': 'الدفع عند الاستلام', 'Payment pending': 'الدفع قيد الانتظار', 'Payment cancelled': 'تم إلغاء الدفع', 'Payment failed': 'فشل الدفع',
    'Order placed': 'تم استلام الطلب', 'Payment received': 'تم استلام الدفع', 'Status updated': 'تم تحديث الحالة', 'Update': 'تحديث', 'Order': 'الطلب', 'VAT': 'الضريبة',
    'Delivering to {a}': 'التوصيل إلى {a}', 'Enter your order number and the mobile number you used at checkout.': 'أدخل رقم الطلب ورقم الهاتف الذي استخدمته عند الشراء.', 'Order number': 'رقم الطلب',
    'Mobile number or email': 'رقم الهاتف أو البريد الإلكتروني', 'Find my order': 'ابحث عن طلبي', 'Confirming your payment…': 'جارٍ تأكيد الدفع…', 'This only takes a moment.': 'لن يستغرق ذلك سوى لحظات.',
    'Thank you — order received!': 'شكراً لك — تم استلام طلبك!', 'Your payment was successful. ': 'تمت عملية الدفع بنجاح. ', 'We’ll call or WhatsApp you to confirm delivery. Keep your order number handy.': 'سنتصل بك أو نراسلك عبر واتساب لتأكيد التوصيل. احتفظ برقم طلبك.',
    'Payment not confirmed yet': 'لم يتم تأكيد الدفع بعد', 'If money was taken from your card, your order is safe — we’ll confirm it shortly. Otherwise you can try paying again.': 'إذا تم خصم المبلغ من بطاقتك فطلبك محفوظ — سنؤكده قريباً. وإلا يمكنك المحاولة مرة أخرى.',
    'Payment was not completed': 'لم تكتمل عملية الدفع', 'No money was taken. Your cart is still saved — try again or choose cash on delivery.': 'لم يتم خصم أي مبلغ. سلتك ما زالت محفوظة — حاول مجدداً أو اختر الدفع عند الاستلام.',
    'You can track this order any time from the': 'يمكنك تتبع هذا الطلب في أي وقت من', 'order tracking page': 'صفحة تتبع الطلبات', 'Try again': 'حاول مجدداً',
    'Both Order Number and Phone or Email are required to track an order.': 'رقم الطلب ورقم الهاتف أو البريد مطلوبان لتتبع الطلب.', 'No matching order found with the provided details.': 'لم يتم العثور على طلب مطابق لهذه البيانات.',
    'Please enter the full mobile number or email used for the order.': 'يرجى إدخال رقم الهاتف أو البريد الكامل المستخدم في الطلب.',
    // contact
    'WhatsApp': 'واتساب', 'Chat with our team — usually replies within minutes during working hours.': 'تحدث مع فريقنا — نرد عادةً خلال دقائق في أوقات العمل.', 'Call us': 'اتصل بنا',
    'Saturday – Thursday, 9 am – 9 pm.': 'السبت – الخميس، ٩ صباحاً – ٩ مساءً.', 'For orders, warranty and business enquiries.': 'للطلبات والضمان واستفسارات الأعمال.', 'Visit us': 'زورونا',
    'Track an order': 'تتبع طلباً', 'Check the status of your delivery with your order number.': 'تحقق من حالة التوصيل برقم طلبك.', 'Track order →': 'تتبع الطلب ←',
    // static page text (data-i18n)
    'Categories ': 'الفئات', 'Most loved': 'الأكثر حباً', 'Best sellers': 'الأكثر مبيعاً', 'GaN technology': 'تقنية GaN', 'Smaller. Cooler.<br>Seriously fast.': 'أصغر. أبرد.<br>وأسرع بكثير.',
    'Gallium-nitride chips waste less energy as heat, so MEVRIO GaN chargers deliver laptop-class power from a plug that fits in your palm — with the UK 3-pin plug used across Oman.': 'رقائق نيتريد الغاليوم تهدر طاقة أقل على شكل حرارة، لذلك تمنحك شواحن ميفريو GaN قوة تكفي للحاسوب المحمول من شاحن صغير بحجم راحة اليد — بالقابس البريطاني الثلاثي المستخدم في عُمان.',
    'USB-C PD output': 'خرج USB-C PD', 'smaller than silicon': 'أصغر من السيليكون', 'BS 1363 UK plug': 'قابس بريطاني BS 1363', 'Shop GaN chargers': 'تسوّق شواحن GaN', 'The collection': 'التشكيلة',
    'Charge everything you carry': 'اشحن كل ما تحمله', 'View all': 'عرض الكل', 'Genuine &amp; certified': 'أصلية ومعتمدة', 'Official MEVRIO products with over-heat, over-charge and short-circuit protection built in.': 'منتجات ميفريو الرسمية مع حماية مدمجة من الحرارة الزائدة والشحن الزائد وقصر الدائرة.',
    'Delivered across Oman': 'توصيل لجميع أنحاء عُمان', '1–2 days in Muscat and 2–5 days to every other governorate. Free over OMR 25.': '١–٢ يوم داخل مسقط و٢–٥ أيام لباقي المحافظات. مجاناً فوق ٢٥ ر.ع.',
    'If something isn’t right, we repair or replace it from our Al Khuwair service desk.': 'إذا واجهت أي مشكلة، نصلح المنتج أو نستبدله من مركز الخدمة في الخوير.', 'Shop by category ': 'تسوّق حسب الفئة',
    'Checkout ': 'إتمام الشراء', 'We’re here to help': 'نحن هنا لمساعدتك', 'Questions about a product, an order or a delivery? The fastest way to reach us is WhatsApp.': 'لديك سؤال عن منتج أو طلب أو توصيل؟ أسرع طريقة للتواصل معنا هي واتساب.',
    'Delivery, returns &amp; policies': 'التوصيل والإرجاع والسياسات', 'Operating under the commercial and consumer protection laws of the Sultanate of Oman.': 'نعمل وفقاً للقوانين التجارية وقانون حماية المستهلك في سلطنة عُمان.', 'Policies': 'السياسات'
  };
  function t(s, vars) {
    let out = (RTL && AR[s]) || s;
    if (vars) out = out.replace(/\{(\w+)\}/g, (m, k) => (vars[k] ?? m));
    return out;
  }
  function setLang(l) { try { localStorage.setItem('gmg_lang', l); localStorage.removeItem('gmg_store'); } catch (e) { /* ignore */ } location.reload(); }
  /** Translate static page text marked with data-i18n (the English text itself is the key). */
  function translateStatic(root = document) {
    if (!RTL) return;
    root.querySelectorAll('[data-i18n]').forEach(el => { const k = el.innerHTML.replace(/\s+/g, ' ').trim(); if (AR[k]) el.innerHTML = AR[k]; });
    root.querySelectorAll('[data-i18n-ph]').forEach(el => { const k = el.getAttribute('placeholder'); if (AR[k]) el.setAttribute('placeholder', AR[k]); });
    root.querySelectorAll('option[data-i18n-opt], [data-i18n-opt] option').forEach(el => { const k = el.textContent.trim(); if (AR[k]) el.textContent = AR[k]; });
  }
  const ARABIC_DIGITS = false; // keep Western digits for prices and phone numbers (common in Oman)

  // ---------- Helpers ----------
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const omr = baisa => RTL ? `${((baisa || 0) / 1000).toFixed(3)} ر.ع.` : 'OMR ' + ((baisa || 0) / 1000).toFixed(3);

  /** Light WebP copy for product photos; the server falls back to the original if no copy exists. */
  function thumb(url, size = 480) {
    if (!url) return '/images/placeholder-product.svg';
    if (/^\/(images\/products|uploads\/products)\//.test(url)) return `/thumbs/${size}${url}.webp`;
    return url;
  }

  async function api(path, opts = {}) {
    if (RTL && path.startsWith('/api/') && !/[?&]lang=/.test(path)) path += (path.includes('?') ? '&' : '?') + 'lang=ar';
    if (RTL && opts.body && typeof opts.body === 'object' && !Array.isArray(opts.body)) opts.body = { lang: 'ar', ...opts.body };
    const res = await fetch(path, {
      method: opts.method || 'GET',
      headers: opts.body ? { 'Content-Type': 'application/json' } : undefined,
      body: opts.body ? JSON.stringify(opts.body) : undefined
    });
    let data = null;
    try { data = await res.json(); } catch (e) { /* non-JSON */ }
    if (!res.ok || (data && data.success === false)) {
      const err = new Error(t((data && data.error) || `Request failed (${res.status})`));
      err.data = data;
      throw err;
    }
    return data;
  }

  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* private mode */ } }
  };

  // ---------- Cart ----------
  // Items: { sku, slug, name, image, price_baisa, retail_baisa, max_qty, qty }
  const Cart = {
    KEY: 'gmg_cart_v2',
    items() { return store.get(this.KEY, []); },
    save(items) { store.set(this.KEY, items); this.emit(); },
    count() { return this.items().reduce((n, i) => n + i.qty, 0); },
    subtotal() { return this.items().reduce((s, i) => s + i.price_baisa * i.qty, 0); },
    /** Returns the quantity actually in the cart for this SKU after adding. */
    add(p, qty = 1) {
      const items = this.items();
      const max = Math.max(0, p.max_qty ?? 10);
      let line = items.find(i => i.sku === p.sku);
      const before = line ? line.qty : 0;
      if (!line) {
        line = { sku: p.sku, slug: p.slug, name: p.name, image: p.image, price_baisa: p.price_baisa, retail_baisa: p.retail_baisa, max_qty: max, qty: 0 };
        items.push(line);
      }
      line.max_qty = max;
      line.price_baisa = p.price_baisa;
      line.qty = Math.min(max, line.qty + qty);
      this.save(items.filter(i => i.qty > 0));
      return { added: line.qty - before, qty: line.qty, max };
    },
    setQty(sku, qty) {
      const items = this.items();
      const line = items.find(i => i.sku === sku);
      if (!line) return;
      line.qty = Math.max(0, Math.min(line.max_qty || 10, qty));
      this.save(items.filter(i => i.qty > 0));
    },
    remove(sku) { this.save(this.items().filter(i => i.sku !== sku)); },
    clear() { this.save([]); },
    /** Re-check prices and stock with the server. Returns list of human-readable changes. */
    async sync() {
      const items = this.items();
      if (!items.length) return [];
      const notes = [];
      try {
        const res = await api('/api/cart/validate', { method: 'POST', body: { items: items.map(i => ({ sku: i.sku, quantity: i.qty })) } });
        const next = [];
        for (const it of items) {
          const v = res.items.find(x => x.sku === it.sku);
          if (!v || v.valid === false || !v.is_in_stock) { notes.push(t('{name} is sold out and was removed.', { name: it.name })); continue; }
          const line = { ...it, price_baisa: v.unit_price_baisa, max_qty: v.max_qty, slug: v.slug || it.slug, image: v.image_url || it.image, name: v.name || it.name };
          if (it.qty > v.max_qty) { notes.push(t('Only {n} × {name} can be ordered — quantity updated.', { n: v.max_qty, name: v.name || it.name })); line.qty = v.max_qty; }
          next.push(line);
        }
        this.save(next);
      } catch (e) { /* offline — keep local cart */ }
      return notes;
    },
    listeners: [],
    on(fn) { this.listeners.push(fn); },
    emit() { this.listeners.forEach(fn => fn(this.items())); }
  };
  window.addEventListener('storage', e => { if (e.key === Cart.KEY) Cart.emit(); });

  // ---------- Store info ----------
  let storeInfo = store.get('gmg_store', null);
  const storeReady = api('/api/store').then(r => { storeInfo = r.data; store.set('gmg_store', storeInfo); return storeInfo; }).catch(() => storeInfo || {});
  const categoriesReady = api('/api/categories').then(r => r.data).catch(() => []);

  // ---------- Toast ----------
  function toast(msg, type) {
    let host = $('.toast-host');
    if (!host) { host = document.createElement('div'); host.className = 'toast-host'; host.setAttribute('role', 'status'); host.setAttribute('aria-live', 'polite'); document.body.appendChild(host); }
    const t = document.createElement('div');
    t.className = 'toast' + (type === 'error' ? ' error' : '');
    t.innerHTML = (type === 'error' ? '' : `<span style="width:20px;height:20px;display:grid;place-items:center">${I.check}</span>`) + `<span>${esc(msg)}</span>`;
    host.appendChild(t);
    setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 300); }, 2800);
  }

  // ---------- Layout ----------
  const NAV = () => [
    { href: '/shop', label: t('Shop all') },
    { href: '/category/power-banks', label: t('Power Banks') },
    { href: '/category/chargers', label: t('Chargers') },
    { href: '/category/cables', label: t('Cables') },
    { href: '/category/car-chargers', label: t('Car Chargers') }
  ];

  function renderHeader() {
    const path = location.pathname;
    const active = href => (path === href || (href !== '/shop' && path.startsWith(href))) ? ' is-active' : '';
    const slot = $('#site-header');
    if (!slot) return;
    slot.outerHTML = `
      <div class="announce" id="announce">${RTL ? 'توصيل مجاني لجميع أنحاء عُمان للطلبات فوق <b>٢٥ ر.ع.</b>' : 'Free delivery across Oman on orders over <b>OMR 25</b>'}</div>
      <header class="site-header" id="siteHeader">
        <div class="wrap header-row">
          <div class="header-left">
            <button class="icon-btn menu-toggle" data-open="menuDrawer" aria-label="${t('Open menu')}">${I.menu}</button>
            <a class="brand" href="/" aria-label="Global Markets Gateway — home"><img src="/images/brand/logo-horizontal.png?v=20261028" alt="Global Markets Gateway" width="185" height="42"></a>
          </div>
          <nav class="main-nav" aria-label="Main">${NAV().map(n => `<a href="${n.href}" class="${active(n.href)}">${n.label}</a>`).join('')}</nav>
          <div class="header-right">
            <button class="lang-btn" type="button" data-lang="${RTL ? 'en' : 'ar'}" aria-label="${RTL ? 'Switch to English' : 'التبديل إلى العربية'}">${RTL ? 'EN' : 'عربي'}</button>
            <button class="icon-btn" data-search aria-label="${t('Search')}">${I.search}</button>
            <button class="icon-btn" data-open="cartDrawer" aria-label="${t('Cart')}">${I.bag}<span class="cart-count" id="cartCount">0</span></button>
          </div>
        </div>
      </header>
      <div class="drawer-backdrop" id="backdrop"></div>
      <aside class="drawer left" id="menuDrawer" aria-label="Menu" aria-hidden="true">
        <div class="drawer-head"><img src="/images/brand/logo-horizontal.png?v=20261028" alt="" style="height:32px;width:auto"><button class="icon-btn" data-close aria-label="${t('Close')}">${I.close}</button></div>
        <div class="drawer-body">
          <nav class="mobile-nav">
            <a href="/">${t('Home')}</a>
            <a href="/shop">${t('Shop all')} <small>${t('All products')}</small></a>
            <div class="sub" id="mobileCats"></div>
            <a href="/track">${t('Track order')}</a>
            <a href="/contact">${t('Contact us')}</a>
            <a href="#" data-lang="${RTL ? 'en' : 'ar'}" class="lang-row">${RTL ? 'English' : 'العربية'} <small>${RTL ? 'Language' : 'اللغة'}</small></a>
          </nav>
        </div>
        <div class="drawer-foot" id="menuFoot"></div>
      </aside>
      <aside class="drawer right" id="cartDrawer" aria-label="Your cart" aria-hidden="true">
        <div class="drawer-head"> <h3>${t('Your cart')} <span id="drawerCount" style="color:var(--muted);font-weight:500"></span></h3><button class="icon-btn" data-close aria-label="${t('Close')}">${I.close}</button></div>
        <div class="drawer-body" id="drawerBody"></div>
        <div class="drawer-foot mini-foot" id="drawerFoot"></div>
      </aside>
      <div class="search-panel" id="searchPanel" role="dialog" aria-label="Search products">
        <div class="wrap">
          <div class="search-bar">${I.search.replace('<svg', '<svg width="22" height="22"')}<input type="search" id="searchInput" placeholder="${t('Search chargers, power banks, cables…')}" autocomplete="off" aria-label="${t('Search')}"><button class="icon-btn" data-close-search aria-label="${t('Close')}">${I.close}</button></div>
        </div>
        <div class="search-results"><div class="wrap" id="searchResults"></div></div>
      </div>`;

    const header = $('#siteHeader');
    const onScroll = () => header.classList.toggle('is-scrolled', window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    // Drawers
    const backdrop = $('#backdrop');
    let lastFocus = null;
    const openDrawer = id => {
      closeAll();
      lastFocus = document.activeElement;
      const d = document.getElementById(id);
      d.classList.add('is-open'); d.setAttribute('aria-hidden', 'false');
      backdrop.classList.add('is-open');
      document.body.style.overflow = 'hidden';
      setTimeout(() => { const f = d.querySelector('button, a'); f && f.focus({ preventScroll: true }); }, 50);
      if (id === 'cartDrawer') renderDrawer();
    };
    const closeAll = () => {
      $$('.drawer.is-open').forEach(d => { d.classList.remove('is-open'); d.setAttribute('aria-hidden', 'true'); });
      backdrop.classList.remove('is-open');
      $('#searchPanel').classList.remove('is-open');
      document.body.style.overflow = '';
      if (lastFocus) { lastFocus.focus({ preventScroll: true }); lastFocus = null; }
      document.dispatchEvent(new CustomEvent('gmg:closed'));
    };
    window.GMG_openCart = () => openDrawer('cartDrawer');
    window.GMG_openDrawer = openDrawer;
    document.addEventListener('click', e => {
      const o = e.target.closest('[data-open]');
      if (o) { e.preventDefault(); openDrawer(o.dataset.open); return; }
      if (e.target.closest('[data-close]') || e.target === backdrop) { closeAll(); return; }
      if (e.target.closest('[data-search]')) { openSearch(); return; }
      if (e.target.closest('[data-close-search]')) { closeAll(); }
      const lb = e.target.closest('[data-lang]'); if (lb) { e.preventDefault(); setLang(lb.dataset.lang); }
    });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeAll(); });

    // Search
    const panel = $('#searchPanel'); const input = $('#searchInput'); const results = $('#searchResults');
    let timer = null; let seq = 0;
    function openSearch() {
      closeAll();
      panel.classList.add('is-open'); backdrop.classList.add('is-open');
      document.body.style.overflow = 'hidden';
      setTimeout(() => input.focus(), 80);
      if (!input.value) showSearchHints();
    }
    async function showSearchHints() {
      const cats = await categoriesReady;
      results.innerHTML = `<p class="eyebrow" style="margin:6px 0 12px;color:var(--muted)">${t('Popular')}</p><div class="search-chips">${cats.map(c => `<a class="chip" href="/category/${esc(c.slug)}">${esc(c.name)}</a>`).join('')}<a class="chip" href="/shop?q=GaN">${t('GaN chargers')}</a><a class="chip" href="/shop?q=${RTL ? 'مغناطيسي' : 'magnetic'}">${t('Magnetic')}</a><a class="chip" href="/shop?q=100W">100W</a></div>`;
    }
    input.addEventListener('input', () => {
      clearTimeout(timer);
      const q = input.value.trim();
      if (q.length < 2) { showSearchHints(); return; }
      timer = setTimeout(async () => {
        const my = ++seq;
        try {
          const r = await api(`/api/products?search=${encodeURIComponent(q)}&limit=8`);
          if (my !== seq) return;
          results.innerHTML = r.data.length
            ? r.data.map(p => `<a class="search-hit" href="/product/${esc(p.slug)}"><span class="thumb"><img src="${thumb(p.primary_image, 480)}" alt=""></span><span><b>${esc(p.name)}</b><span>${esc(p.category.name)} · ${p.available ? omr(p.pricing.current_baisa) : t('Sold out')}</span></span></a>`).join('') +
              `<a class="link-arrow" style="margin-top:16px" href="/shop?q=${encodeURIComponent(q)}">${t('See all results')} ${I.arrow}</a>`
            : `<p class="search-empty">${t('No products match “{q}”. Try “charger”, “cable” or “power bank”.', { q: esc(q) })}</p>`;
        } catch (e) { /* ignore */ }
      }, 220);
    });
    input.addEventListener('keydown', e => { if (e.key === 'Enter' && input.value.trim()) location.href = `/shop?q=${encodeURIComponent(input.value.trim())}`; });

    // Categories into mobile menu
    categoriesReady.then(cats => {
      const sub = $('#mobileCats');
      if (sub) sub.innerHTML = cats.map(c => `<a href="/category/${esc(c.slug)}">${esc(c.name)} <small>${c.product_count}</small></a>`).join('');
    });

    storeReady.then(s => {
      if (s.announcement) $('#announce').textContent = s.announcement;
      const foot = $('#menuFoot');
      if (foot && (s.whatsapp || s.phone)) {
        const wa = (s.whatsapp || '').replace(/\D/g, '');
        foot.innerHTML = `<p style="font-size:13px;color:var(--muted);margin-bottom:10px">${t('Need help choosing?')}</p>${wa ? `<a class="btn btn-ghost btn-block" href="https://wa.me/${wa}" target="_blank" rel="noopener">${I.wa.replace('<svg', '<svg width="18" height="18" style="color:#25d366"')} ${t('Chat on WhatsApp')}</a>` : ''}`;
      }
    });
  }

  // ---------- Liquid bottom navigation (mobile) ----------
  // The active tab sits in a floating circle inside a curved notch. When another tab is tapped the
  // notch flows across like a wave, the circle drops out and pops back up at the new tab.
  function initTabbar(TABS, curIdx) {
    const bar = $('#tabbar'); if (!bar) return;
    const path = $('.tab-bg path', bar); const svg = $('.tab-bg', bar);
    const bubble = $('.tab-bubble', bar); const bubbleIcon = $('.tab-bubble-icon', bar);
    const items = $$('.tab-item', bar);
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const H = 64, R = 36, SH = 22, DEPTH = 33;
    let W = 0, x = 0, depth = DEPTH, active = curIdx, anim = null;

    const centerOf = i => { const r = items[i].getBoundingClientRect(); const b = bar.getBoundingClientRect(); return r.left - b.left + r.width / 2; };
    function draw() {
      const a = x - R - SH, b = x + R + SH, d = depth;
      path.setAttribute('d', d < 0.5
        ? `M0 0H${W}V${H}H0Z`
        : `M0 0H${a}C${a + SH * .9} 0 ${x - R * .78} ${d} ${x} ${d}C${x + R * .78} ${d} ${b - SH * .9} 0 ${b} 0H${W}V${H}H0Z`);
      bubble.style.transform = `translate3d(${x - 27}px,0,0)`;
    }
    function layout() {
      W = bar.clientWidth; svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
      if (active >= 0) x = centerOf(active); else { x = W / 2; depth = 0; }
      draw();
    }
    function setIcon(i) { bubbleIcon.innerHTML = i >= 0 ? TABS[i].icon : ''; }
    function moveTo(i, done) {
      cancelAnimationFrame(anim);
      items.forEach((el, k) => el.classList.toggle('is-active', k === i));
      if (reduce || active === i || W === 0) {
        active = i; x = centerOf(i); depth = DEPTH; setIcon(i); bubble.classList.remove('is-hidden'); draw(); done && done(); return;
      }
      const from = active >= 0 ? x : centerOf(i); const to = centerOf(i);
      const fromDepth = active >= 0 ? DEPTH : 0;
      active = i;
      bubble.classList.add('is-hidden');
      const dur = 460; const t0 = performance.now();
      const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      const step = now => {
        const t = Math.min(1, (now - t0) / dur); const e = ease(t);
        x = from + (to - from) * e;
        // the notch flattens in the middle of the move, like a wave travelling along the bar
        const base = fromDepth + (DEPTH - fromDepth) * e;
        depth = base * (1 - .55 * Math.sin(Math.PI * t));
        draw();
        if (t < 1) anim = requestAnimationFrame(step);
        else { depth = DEPTH; draw(); setIcon(i); bubble.classList.remove('is-hidden'); bubble.classList.remove('pop'); void bubble.offsetWidth; bubble.classList.add('pop'); done && done(); }
      };
      anim = requestAnimationFrame(step);
    }

    bar.addEventListener('click', e => {
      const it = e.target.closest('.tab-item'); if (!it) return;
      const i = +it.dataset.i; const tb = TABS[i];
      e.preventDefault();
      if (tb.key === 'cats') { moveTo(i); window.GMG_openDrawer && window.GMG_openDrawer('catSheet'); return; }
      if (i === curIdx && active === i) { window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
      try { sessionStorage.setItem('gmg_tab', String(i)); } catch (err) { /* ignore */ }
      moveTo(i, () => setTimeout(() => { location.href = tb.href; }, 60));
    });
    // Closing the categories sheet returns the notch to this page's tab
    document.addEventListener('gmg:closed', () => {
      if (TABS[active] && TABS[active].key === 'cats' && curIdx !== active) {
        if (curIdx >= 0) moveTo(curIdx); else { items.forEach(el => el.classList.remove('is-active')); bubble.classList.add('is-hidden'); active = -1; depth = 0; draw(); }
      }
    });

    // On page load: continue the motion from the tab the visitor came from
    let prev = -1; try { prev = parseInt(sessionStorage.getItem('gmg_tab') ?? '-1', 10); sessionStorage.removeItem('gmg_tab'); } catch (err) { /* ignore */ }
    const start = () => {
      if (curIdx < 0) { active = -1; bubble.classList.add('is-hidden'); layout(); return; }
      if (prev >= 0 && prev !== curIdx && prev < TABS.length && !reduce) { active = prev; layout(); setIcon(prev); moveTo(curIdx); }
      else { active = curIdx; setIcon(curIdx); layout(); }
    };
    requestAnimationFrame(start);
    window.addEventListener('resize', () => { cancelAnimationFrame(anim); if (active >= 0) depth = DEPTH; layout(); });
  }

  function renderFooter() {
    const slot = $('#site-footer');
    if (!slot) return;
    const path = location.pathname;
    const current = path === '/' || path === '/index.html' ? 'home'
      : path.startsWith('/category/') ? 'cats'
      : (path === '/shop' || path.startsWith('/product/') || path === '/shop.html') ? 'shop'
      : (path === '/cart' || path === '/cart.html' || path === '/checkout' || path === '/checkout.html') ? 'cart'
      : (path === '/track' || path.startsWith('/order-confirmation')) ? 'track' : '';
    const TABS = [
      { key: 'home', href: '/', label: t('Home'), icon: I.home },
      { key: 'cats', href: '', label: t('Categories'), icon: I.grid },
      { key: 'shop', href: '/shop', label: t('Shop'), icon: I.bag },
      { key: 'cart', href: '/cart', label: t('Cart'), icon: I.cart },
      { key: 'track', href: '/track', label: t('Track'), icon: I.truck }
    ];
    const curIdx = TABS.findIndex(tb => tb.key === current);
    slot.outerHTML = `
      <footer class="site-footer">
        <div class="wrap foot-top">
          <div class="foot-brand">
            <img src="/images/brand/logo-horizontal-white.png?v=20261028" alt="Global Markets Gateway" width="203" height="46">
            <p>${t('Genuine MEVRIO charging gear — GaN chargers, magnetic power banks and braided cables — delivered across the Sultanate of Oman.')}</p>
            <div class="foot-pay"><span>${RTL ? 'ثواني' : 'Thawani Pay'}</span><span>Visa</span><span>Mastercard</span><span>${t('Cash on delivery')}</span></div>
          </div>
          <div><h4>${t('Shop')}</h4><ul id="footCats"><li><a href="/shop">${t('All products')}</a></li></ul></div>
          <div><h4>${t('Help')}</h4><ul>
            <li><a href="/track">${t('Track your order')}</a></li>
            <li><a href="/policies#delivery">${t('Delivery')}</a></li>
            <li><a href="/policies#returns">${t('Returns & warranty')}</a></li>
            <li><a href="/policies#privacy">${t('Privacy')}</a></li>
            <li><a href="/contact">${t('Contact us')}</a></li>
            <li><a href="#" data-lang="${RTL ? 'en' : 'ar'}">${RTL ? 'English' : 'العربية'}</a></li>
          </ul></div>
          <div><h4>${RTL ? 'تواصل معنا' : 'Contact'}</h4><ul class="foot-contact" id="footContact"></ul></div>
        </div>
        <div class="wrap foot-bottom"><span id="footLegal">© ${new Date().getFullYear()} Global Markets Gateway LLC · ${t('Sultanate of Oman')}</span><span id="footReg"></span></div>
      </footer>
      <a class="wa-float" id="waFloat" href="#" target="_blank" rel="noopener" aria-label="${t('Chat on WhatsApp')}" hidden>${I.wa}</a>
      <nav class="tabbar" id="tabbar" aria-label="Quick navigation">
        <svg class="tab-bg" aria-hidden="true"><path/></svg>
        <span class="tab-bubble" aria-hidden="true"><span class="tab-bubble-icon"></span></span>
        ${TABS.map((tb, i) => `<${tb.href ? `a href="${tb.href}"` : 'button type="button"'} class="tab-item${i === curIdx ? ' is-active' : ''}" data-i="${i}" ${i === curIdx ? 'aria-current="page"' : ''}><span class="tab-icon">${tb.icon}</span><span class="tab-label">${tb.label}</span>${tb.key === 'cart' ? '<b class="tab-count" id="tabCount"></b>' : ''}</${tb.href ? 'a' : 'button'}>`).join('')}
      </nav>
      <aside class="drawer bottom" id="catSheet" aria-label="Categories" aria-hidden="true">
        <div class="drawer-head"><h3>${t('Shop by category')}</h3><button class="icon-btn" data-close aria-label="${t('Close')}">${I.close}</button></div>
        <div class="drawer-body"><div class="cat-sheet-grid" id="catSheetGrid"></div></div>
      </aside>`;
    document.body.classList.add('has-tabbar');
    initTabbar(TABS, curIdx);
    categoriesReady.then(cats => {
      const g = $('#catSheetGrid'); if (!g) return;
      g.innerHTML = `<a class="cat-sheet-item all" href="/shop"><span class="ph">${I.grid}</span><b>${t('All products')}</b></a>` +
        cats.map(c => `<a class="cat-sheet-item" href="/category/${esc(c.slug)}"><span class="ph"><img src="${thumb(c.image_url, 480)}" alt="" loading="lazy"></span><b>${esc(c.name)}</b><small>${c.product_count === 1 ? t('1 item') : t('{n} items', { n: c.product_count })}</small></a>`).join('');
    });

    categoriesReady.then(cats => {
      $('#footCats').innerHTML = `<li><a href="/shop">${t('All products')}</a></li>` + cats.map(c => `<li><a href="/category/${esc(c.slug)}">${esc(c.name)}</a></li>`).join('');
    });
    storeReady.then(s => {
      const wa = (s.whatsapp || '').replace(/\D/g, '');
      $('#footContact').innerHTML = [
        s.address && `<li>${I.pin}<span>${esc(s.address)}</span></li>`,
        s.phone && `<li>${I.phone}<a href="tel:${esc(s.phone.replace(/\s/g, ''))}" dir="ltr">${esc(s.phone)}</a></li>`,
        wa && `<li>${I.wa}<a href="https://wa.me/${wa}" target="_blank" rel="noopener">${t('WhatsApp')} <span dir="ltr">${esc(s.whatsapp)}</span></a></li>`,
        s.email && `<li>${I.mail}<a href="mailto:${esc(s.email)}">${esc(s.email)}</a></li>`
      ].filter(Boolean).join('');
      $('#footLegal').textContent = `© ${new Date().getFullYear()} ${RTL ? 'بوابة الأسواق العالمية ش.م.م' : (s.legal_name || 'Global Markets Gateway LLC')} · ${t('Sultanate of Oman')}`;
      $('#footReg').textContent = [s.cr_number && `${t('CR')} ${s.cr_number}`, s.tax_number && `${t('Tax ID')} ${s.tax_number}`].filter(Boolean).join(' · ');
      const f = $('#waFloat');
      if (wa && f) { f.href = `https://wa.me/${wa}`; f.hidden = false; }
    });
  }

  // ---------- Cart drawer ----------
  function shipProgressHtml(subtotal) {
    const th = (storeInfo && storeInfo.free_shipping_threshold_baisa) || 25000;
    const pct = Math.min(100, Math.round(subtotal / th * 100));
    const left = th - subtotal;
    return `<div class="ship-progress"><p>${left > 0 ? t('Add {x} more for free delivery', { x: `<b>${omr(left)}</b>` }) : `<b>${t('You get free delivery on this order')}</b>`}</p><div class="ship-bar"><i style="width:${pct}%"></i></div></div>`;
  }
  function lineHtml(it, compact) {
    return `<div class="line-item" data-sku="${esc(it.sku)}">
      <a class="thumb" href="/product/${esc(it.slug)}"><img src="${thumb(it.image, 480)}" alt=""></a>
      <div>
        <a class="name" href="/product/${esc(it.slug)}">${esc(it.name)}</a>
        <div class="unit">${omr(it.price_baisa)}</div>
        <div class="qty sm" role="group" aria-label="${t('Quantity')}">
          <button type="button" data-dec aria-label="${t('Decrease')}">−</button>
          <input type="number" value="${it.qty}" min="1" max="${it.max_qty}" aria-label="${t('Quantity')}" readonly>
          <button type="button" data-inc aria-label="${t('Increase')}" ${it.qty >= it.max_qty ? 'disabled' : ''}>+</button>
        </div>
      </div>
      <div style="text-align:end"><div class="total">${omr(it.price_baisa * it.qty)}</div><button type="button" class="remove" data-remove>${t('Remove')}</button></div>
    </div>`;
  }
  function bindLines(root) {
    root.addEventListener('click', e => {
      const li = e.target.closest('.line-item'); if (!li) return;
      const sku = li.dataset.sku;
      const it = Cart.items().find(i => i.sku === sku); if (!it) return;
      if (e.target.closest('[data-inc]')) {
        if (it.qty >= it.max_qty) { toast(t("That's the maximum available for this item.")); return; }
        Cart.setQty(sku, it.qty + 1);
      } else if (e.target.closest('[data-dec]')) {
        Cart.setQty(sku, it.qty - 1);
      } else if (e.target.closest('[data-remove]')) {
        Cart.remove(sku);
      }
    });
  }
  function emptyCartHtml() {
    return `<div class="cart-empty">${I.bag}<h3>${t('Your cart is empty')}</h3><p>${t('Fast chargers, power banks and cables are waiting.')}</p><a class="btn btn-primary" href="/shop">${t('Start shopping')}</a></div>`;
  }
  function renderDrawer() {
    const body = $('#drawerBody'); const foot = $('#drawerFoot');
    if (!body) return;
    const items = Cart.items();
    $('#drawerCount').textContent = items.length ? `(${Cart.count()})` : '';
    if (!items.length) { body.innerHTML = emptyCartHtml(); foot.innerHTML = ''; foot.style.display = 'none'; return; }
    foot.style.display = '';
    const sub = Cart.subtotal();
    body.innerHTML = shipProgressHtml(sub) + `<div class="mini-items">${items.map(i => lineHtml(i, true)).join('')}</div>`;
    foot.innerHTML = `<div class="row"><span>${t('Subtotal')}</span><span>${omr(sub)}</span></div><small>${t('Delivery and VAT calculated at checkout.')}</small>
      <a class="btn btn-primary btn-block" href="/checkout">${t('Checkout')} ${I.arrow}</a><a class="btn btn-ghost btn-block" href="/cart">${t('View cart')}</a>`;
  }
  function updateCount(bump) {
    const el = $('#cartCount'); if (!el) return;
    const n = Cart.count();
    el.textContent = n > 99 ? '99+' : n;
    el.classList.toggle('has-items', n > 0);
    if (bump) { el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump'); }
    const tc = $('#tabCount');
    if (tc) {
      tc.textContent = n > 99 ? '99+' : n;
      tc.classList.toggle('has-items', n > 0);
      if (bump) { tc.classList.remove('bump'); void tc.offsetWidth; tc.classList.add('bump'); }
    }
  }

  // ---------- Fly-to-cart ----------
  function flyToCart(fromEl) {
    const target = $('#cartCount');
    if (!fromEl || !target || matchMedia('(prefers-reduced-motion: reduce)').matches) return Promise.resolve();
    const a = fromEl.getBoundingClientRect(); const b = target.closest('button').getBoundingClientRect();
    const dot = document.createElement('div'); dot.className = 'fly-dot';
    dot.style.left = (a.left + a.width / 2 - 7) + 'px'; dot.style.top = (a.top + a.height / 2 - 7) + 'px';
    document.body.appendChild(dot);
    const dx = b.left + b.width / 2 - (a.left + a.width / 2); const dy = b.top + b.height / 2 - (a.top + a.height / 2);
    const anim = dot.animate([
      { transform: 'translate(0,0) scale(1)', opacity: 1 },
      { transform: `translate(${dx * .5}px, ${dy - 80}px) scale(1.2)`, opacity: 1, offset: .5 },
      { transform: `translate(${dx}px, ${dy}px) scale(.4)`, opacity: .4 }
    ], { duration: 650, easing: 'cubic-bezier(.5,0,.2,1)' });
    return anim.finished.then(() => dot.remove());
  }

  /** Add a product to the cart with feedback. p: {sku, slug, name, image, price_baisa, retail_baisa, max_qty} */
  async function addToCart(p, qty, fromEl, { openDrawer = false } = {}) {
    if (!p.max_qty) { toast(t('Sorry, this item is sold out.'), 'error'); return false; }
    const r = Cart.add(p, qty);
    if (r.added <= 0) { toast(t('You already have the maximum available ({n}) in your cart.', { n: r.max }), 'error'); return false; }
    await flyToCart(fromEl);
    updateCount(true);
    try { if (window.fbq) fbq('track', 'AddToCart', { content_ids: [p.sku], content_name: p.name, content_type: 'product', value: (p.price_baisa * r.added) / 1000, currency: 'OMR' }); } catch (e) { /* ignore */ }
    if (r.added < qty) toast(t("Added {n} — that's the maximum available right now.", { n: r.added }));
    else toast(t('Added to cart'));
    if (openDrawer) window.GMG_openCart();
    return true;
  }

  // ---------- Product card ----------
  function productFromApi(p) {
    return { sku: p.sku, slug: p.slug, name: p.name, image: p.primary_image, price_baisa: p.pricing.current_baisa, retail_baisa: p.pricing.retail_baisa, max_qty: p.max_qty };
  }
  function cardHtml(p) {
    const sale = p.pricing.is_on_sale;
    const soldOut = !p.available;
    const alt = p.second_image;
    return `<article class="card${soldOut ? ' is-soldout' : ''}" data-slug="${esc(p.slug)}">
      <div class="card-media-wrap">
      <a class="card-media${alt ? ' has-alt' : ''}" href="/product/${esc(p.slug)}" aria-label="${esc(p.name)}">
        ${soldOut ? `<span class="badge soft">${t('Sold out')}</span>` : (sale ? `<span class="badge" dir="ltr">−${p.pricing.discount_percentage}%</span>` : '')}
        <img class="main" src="${thumb(p.primary_image, 480)}" alt="${esc(p.name)}" loading="lazy" decoding="async">
        ${alt ? `<img class="alt" src="${thumb(alt, 480)}" alt="" loading="lazy" decoding="async">` : ''}
      </a>
      <button class="quick-add" type="button" data-quick="${esc(p.sku)}" aria-label="${t('Add {name} to cart', { name: esc(p.name) })}">${I.plus}</button>
      </div>
      <div class="card-body">
        <span class="card-cat">${esc(p.category.name)}</span>
        <a class="card-title" href="/product/${esc(p.slug)}">${esc(p.name)}</a>
        <div class="price"><b>${omr(p.pricing.current_baisa)}</b>${sale ? `<s>${omr(p.pricing.retail_baisa)}</s>` : ''}</div>
      </div>
    </article>`;
  }
  /** Wire quick-add buttons inside a container that holds cards for the given products. */
  function bindCards(container, products) {
    const bySku = Object.fromEntries(products.map(p => [p.sku, p]));
    container.addEventListener('click', async e => {
      const btn = e.target.closest('[data-quick]'); if (!btn) return;
      e.preventDefault();
      const p = bySku[btn.dataset.quick]; if (!p) return;
      const ok = await addToCart(productFromApi(p), 1, btn);
      if (ok) { btn.classList.add('added'); btn.innerHTML = I.check; setTimeout(() => { btn.classList.remove('added'); btn.innerHTML = I.plus; }, 1400); }
    });
  }
  const skeletonCards = n => Array.from({ length: n }, () => '<div class="skel-card"><div class="skel"></div><div class="skel"></div><div class="skel"></div></div>').join('');

  // ---------- Reveal on scroll ----------
  function reveal(root = document) {
    const els = $$('.reveal, .reveal-stagger', root).filter(el => !el.classList.contains('is-in'));
    if (!('IntersectionObserver' in window)) { els.forEach(el => el.classList.add('is-in')); return; }
    const io = new IntersectionObserver(entries => entries.forEach(en => { if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); } }), { rootMargin: '0px 0px -8% 0px', threshold: .05 });
    els.forEach(el => io.observe(el));
  }

  // ---------- Boot ----------
  function boot() {
    translateStatic();
    renderHeader();
    renderFooter();
    updateCount(false);
    Cart.on(() => { updateCount(false); renderDrawer(); });
    reveal();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();

  window.GMG = { t, LANG, RTL, setLang, translateStatic, I, $, $$, esc, omr, thumb, api, Cart, toast, addToCart, cardHtml, bindCards, productFromApi, skeletonCards, reveal, storeReady, categoriesReady, lineHtml, bindLines, emptyCartHtml, shipProgressHtml, flyToCart, updateCount };
})();
