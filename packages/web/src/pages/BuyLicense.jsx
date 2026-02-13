import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  FaCrown,
  FaCheck,
  FaTag,
  FaShoppingCart,
  FaCreditCard,
  FaPercent,
  FaTimes,
  FaCheckCircle,
  FaShieldAlt,
  FaTrophy,
  FaGift,
  FaRobot,
  FaTicketAlt,
  FaChartBar,
  FaInfinity,
  FaHeadset,
  FaLock,
  FaTimesCircle,
  FaCopy,
  FaKey,
  FaStar,
  FaQuestionCircle,
  FaChevronDown,
  FaChevronUp,
  FaDiscord,
  FaBolt,
  FaServer,
  FaUsers,
  FaGem,
  FaRocket,
  FaHeart,
  FaArrowRight,
  FaStripe
} from 'react-icons/fa';
import { purchaseService } from '../services/api.service';
import { useToast } from '../contexts/ToastContext';
import { useTranslation } from '../contexts/LanguageContext';

// Fallback pricing plans
const FALLBACK_PLANS = [
  { id: 'monthly', name: '1 Miesiac', duration: 1, price: 30, pricePerMonth: 30, isPopular: false, savings: null },
  { id: 'semiannual', name: '6 Miesiecy', duration: 6, price: 175, pricePerMonth: 29, isPopular: true, savings: 10 },
  { id: 'annual', name: '12 Miesiecy', duration: 12, price: 340, pricePerMonth: 28, isPopular: false, savings: 20 }
];

// All VIP Features
const ALL_FEATURES = [
  { icon: FaShieldAlt, title: 'Auto-Moderacja', desc: 'Zaawansowane filtry antyspamowe, anti-raid i ochrona serwera' },
  { icon: FaTrophy, title: 'System Poziomów', desc: 'Nieograniczone poziomy, role za poziomy, własne karty XP' },
  { icon: FaGift, title: 'Giveaways', desc: 'Nieograniczone konkursy z wieloma zwycięzcami i wymaganiami' },
  { icon: FaRobot, title: 'Reaction Roles', desc: 'Nieograniczone panele reakcji z customowymi emoji' },
  { icon: FaTicketAlt, title: 'System Ticketów', desc: 'Zaawansowane tickety z formularzami i transkryptami' },
  { icon: FaChartBar, title: 'Statystyki', desc: 'Szczegółowe statystyki serwera, kanały licznikowe' },
  { icon: FaInfinity, title: 'Bez Limitów', desc: 'Brak ograniczeń na liczbę użytkowników i komend' },
  { icon: FaHeadset, title: 'Wsparcie Priority', desc: 'Priorytetowa pomoc techniczna 24/7' }
];

// FAQ items
const FAQ_ITEMS = [
  {
    q: 'Jak aktywować licencję?',
    a: 'Po zakupie otrzymasz klucz licencji. Przejdź do zakładki "Aktywuj Licencję", wpisz klucz i wybierz serwer, na którym chcesz aktywować bota.'
  },
  {
    q: 'Czy mogę przenieść licencję na inny serwer?',
    a: 'Tak! W panelu "Moje Licencje" możesz dezaktywować licencję na obecnym serwerze i aktywować ją na nowym.'
  },
  {
    q: 'Co się stanie po wygaśnięciu licencji?',
    a: 'Bot pozostanie na serwerze, ale funkcje premium zostaną wyłączone. Możesz odnowić licencję w dowolnym momencie.'
  },
  {
    q: 'Jakie metody płatności są akceptowane?',
    a: 'Akceptujemy karty płatnicze (Visa, Mastercard), BLIK oraz przelewy bankowe przez bezpieczny system Stripe.'
  },
  {
    q: 'Czy mogę dostać fakturę VAT?',
    a: 'Tak, skontaktuj się z nami przez Discord po dokonaniu zakupu, a wystawimy fakturę VAT.'
  }
];

// Stats
const STATS = [
  { value: '500+', label: 'Serwerów', icon: FaServer },
  { value: '50K+', label: 'Użytkowników', icon: FaUsers },
  { value: '99.9%', label: 'Uptime', icon: FaBolt },
  { value: '24/7', label: 'Wsparcie', icon: FaHeadset }
];

export default function BuyLicense() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const toast = useToast();
  const [plans, setPlans] = useState(FALLBACK_PLANS);
  const [plansLoading, setPlansLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [promoCode, setPromoCode] = useState('');
  const [promoDiscount, setPromoDiscount] = useState(null);
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoError, setPromoError] = useState('');
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState(null);
  const [purchasedLicense, setPurchasedLicense] = useState(null);
  const [verifyingPayment, setVerifyingPayment] = useState(false);
  const [openFaq, setOpenFaq] = useState(null);
  const [showAllFeatures, setShowAllFeatures] = useState(false);

  // Fetch plans from API
  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const response = await purchaseService.getPlans();
        const apiPlans = response.data.data;
        if (apiPlans && apiPlans.length > 0) {
          setPlans(apiPlans);
          const popularPlan = apiPlans.find(p => p.isPopular);
          setSelectedPlan(popularPlan?.id || apiPlans[0]?.id);
        } else {
          setPlans(FALLBACK_PLANS);
          setSelectedPlan(FALLBACK_PLANS[1]?.id);
        }
      } catch (error) {
        setPlans(FALLBACK_PLANS);
        setSelectedPlan(FALLBACK_PLANS[1]?.id);
      } finally {
        setPlansLoading(false);
      }
    };
    fetchPlans();
  }, []);

  // Check for payment status
  useEffect(() => {
    const success = searchParams.get('success');
    const canceled = searchParams.get('canceled');
    const sessionId = searchParams.get('session_id');

    if (success === 'true' && sessionId) {
      setPaymentStatus('success');
      setVerifyingPayment(true);
      purchaseService.verifyPayment(sessionId)
        .then(response => {
          const data = response.data.data;
          if (data.licenseKey) setPurchasedLicense(data);
        })
        .catch(() => toast.error('Nie udało się pobrać klucza licencji'))
        .finally(() => setVerifyingPayment(false));
      toast.success('Płatność zakończona sukcesem!');
      navigate('/buy?paid=true', { replace: true });
    } else if (canceled === 'true') {
      setPaymentStatus('canceled');
      toast.error('Płatność została anulowana.');
      navigate('/buy', { replace: true });
    }
  }, [searchParams, navigate]);

  const getPlan = () => plans.find(p => p.id === selectedPlan);

  const calculateFinalPrice = () => {
    const plan = getPlan();
    if (!plan) return 0;
    let finalPrice = parseFloat(plan.price);
    if (promoDiscount) {
      if (promoDiscount.type === 'percentage') {
        finalPrice = finalPrice * (1 - promoDiscount.value / 100);
      } else {
        finalPrice = Math.max(0, finalPrice - promoDiscount.value);
      }
    }
    return Math.round(finalPrice * 100) / 100;
  };

  const handleValidatePromo = async () => {
    if (!promoCode.trim()) return;
    setPromoLoading(true);
    setPromoError('');
    setPromoDiscount(null);
    try {
      const response = await purchaseService.validatePromoCode(promoCode.trim());
      const discount = response.data.data;
      setPromoDiscount(discount);
      toast.success(`Kod zastosowany: -${discount.type === 'percentage' ? discount.value + '%' : discount.value + ' zł'}`);
    } catch (error) {
      const message = error.response?.data?.message || 'Nieprawidłowy kod rabatowy';
      setPromoError(message);
      toast.error(message);
    } finally {
      setPromoLoading(false);
    }
  };

  const handleRemovePromo = () => {
    setPromoCode('');
    setPromoDiscount(null);
    setPromoError('');
  };

  const handleCheckout = async () => {
    setCheckoutLoading(true);
    try {
      const response = await purchaseService.createCheckout({
        planId: selectedPlan,
        promoCode: promoDiscount ? promoCode : null
      });
      if (response.data.data?.checkoutUrl) {
        window.location.href = response.data.data.checkoutUrl;
      } else {
        toast.error('Brak URL do płatności');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Błąd podczas tworzenia płatności');
    } finally {
      setCheckoutLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Nigdy';
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? 'Nigdy' : date.toLocaleDateString('pl-PL');
  };

  const copyLicenseKey = () => {
    if (purchasedLicense?.licenseKey) {
      navigator.clipboard.writeText(purchasedLicense.licenseKey);
      toast.success('Klucz skopiowany!');
    }
  };

  // Success page
  if (paymentStatus === 'success') {
    return (
      <div className="max-w-2xl mx-auto text-center py-12">
        <div className="relative inline-block mb-8">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center shadow-2xl">
            <FaCheckCircle className="w-12 h-12 text-white" />
          </div>
          <div className="absolute -top-2 -right-2 w-8 h-8 bg-amber-400 rounded-full flex items-center justify-center">
            <FaCrown className="w-4 h-4 text-white" />
          </div>
        </div>
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
          Dziękujemy za zakup!
        </h1>
        <p className="text-xl text-gray-600 dark:text-gray-400 mb-8">
          Twoja licencja VIP została utworzona. Skopiuj klucz i aktywuj go na swoim serwerze.
        </p>

        {verifyingPayment ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
            <span className="ml-3 text-gray-500">Pobieranie klucza licencji...</span>
          </div>
        ) : purchasedLicense?.licenseKey ? (
          <div className="bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20 rounded-2xl p-8 mb-8 border-2 border-amber-200 dark:border-amber-700">
            <div className="flex items-center justify-center gap-2 mb-4">
              <FaKey className="w-6 h-6 text-amber-500" />
              <span className="font-bold text-lg text-gray-900 dark:text-white">Twój klucz licencji</span>
            </div>
            <div className="flex items-center gap-3 mb-6">
              <code className="flex-1 bg-white dark:bg-dark-800 border-2 border-amber-300 dark:border-amber-600 px-6 py-5 rounded-xl font-mono text-xl text-center text-gray-900 dark:text-white font-bold tracking-widest shadow-inner">
                {purchasedLicense.licenseKey}
              </code>
              <button
                onClick={copyLicenseKey}
                className="p-5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl transition-all hover:scale-105 shadow-lg"
              >
                <FaCopy className="w-6 h-6" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="bg-white dark:bg-dark-800 rounded-lg p-3">
                <span className="text-gray-500">Tier:</span>
                <span className="ml-2 font-bold text-purple-600">{purchasedLicense.tier}</span>
              </div>
              <div className="bg-white dark:bg-dark-800 rounded-lg p-3">
                <span className="text-gray-500">Wygasa:</span>
                <span className="ml-2 font-bold text-gray-900 dark:text-white">{formatDate(purchasedLicense.expiresAt)}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-6 mb-8">
            <p className="text-red-600">Nie udało się pobrać klucza. Sprawdź zakładkę "Moje Licencje".</p>
          </div>
        )}

        <div className="flex flex-wrap justify-center gap-4">
          <button onClick={() => navigate('/activate')} className="btn-primary flex items-center gap-2 px-6 py-3">
            <FaKey /> Aktywuj Licencję
          </button>
          <button onClick={() => navigate('/my-licenses')} className="btn-secondary px-6 py-3">
            Moje Licencje
          </button>
          <button onClick={() => { setPaymentStatus(null); setPurchasedLicense(null); }} className="btn-secondary px-6 py-3">
            Kup kolejną
          </button>
        </div>
      </div>
    );
  }

  // Canceled page
  if (paymentStatus === 'canceled') {
    return (
      <div className="max-w-lg mx-auto text-center py-12">
        <div className="w-20 h-20 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-6">
          <FaTimesCircle className="w-10 h-10 text-red-500" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Płatność anulowana</h1>
        <p className="text-gray-600 dark:text-gray-400 mb-8">
          Twoja płatność została anulowana. Jeśli to był błąd, możesz spróbować ponownie.
        </p>
        <button onClick={() => setPaymentStatus(null)} className="btn-primary">
          Spróbuj ponownie
        </button>
      </div>
    );
  }

  const plan = getPlan();
  const finalPrice = calculateFinalPrice();
  const discount = plan ? parseFloat(plan.price) - finalPrice : 0;

  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-purple-600 via-primary-600 to-amber-500 p-8 md:p-12">
       <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=%2230%22 height=%2230%22 viewBox=%220 0 30 30%22 fill=%22none%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cpath d=%22M1.22676 0C1.91374 0 2.45351 0.539773 2.45351 1.22676C2.45351 1.91374 1.91374 2.45351 1.22676 2.45351C0.539773 2.45351 0 1.91374 0 1.22676C0 0.539773 0.539773 0 1.22676 0Z%22 fill=%22rgba(255,255,255,0.07)%22%3E%3C/path%3E%3C/svg%3E')] opacity-50"></div>
        <div className="relative z-10 text-center text-white">
          <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full text-sm font-medium mb-6">
            <FaStar className="text-amber-300" />
            Ponad 500 serwerów nam zaufało
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Odblokuj pełną moc <span className="text-amber-300">KiraEvo</span>
          </h1>
          <p className="text-xl text-white/80 max-w-2xl mx-auto mb-8">
            Zaawansowana moderacja, system poziomów, giveaways i wiele więcej. Wszystko w jednym bocie.
          </p>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto">
            {STATS.map((stat, i) => (
              <div key={i} className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                <stat.icon className="w-6 h-6 mx-auto mb-2 text-amber-300" />
                <div className="text-2xl font-bold">{stat.value}</div>
                <div className="text-sm text-white/70">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Left - Plans */}
        <div className="xl:col-span-2 space-y-8">
          {/* Pricing Plans */}
          <div>
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-900/30">
                <FaCrown className="w-6 h-6 text-amber-500" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Wybierz plan</h2>
                <p className="text-gray-500 dark:text-gray-400">Im dłuższy okres, tym więcej oszczędzasz</p>
              </div>
            </div>

            {plansLoading ? (
              <div className="flex justify-center py-12">
                <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {plans.map((p) => {
                  const isSelected = selectedPlan === p.id;
                  return (
                    <div
                      key={p.id}
                      onClick={() => setSelectedPlan(p.id)}
                      className={`
                        relative rounded-2xl cursor-pointer transition-all duration-300 overflow-hidden
                        ${isSelected
                          ? 'ring-2 ring-primary-500 shadow-xl scale-[1.02]'
                          : 'hover:shadow-lg hover:scale-[1.01]'
                        }
                        ${p.isPopular ? 'bg-gradient-to-b from-primary-500 to-purple-600' : 'bg-white dark:bg-dark-800 border border-gray-200 dark:border-dark-600'}
                      `}
                    >
                      {/* Popular badge */}
                      {p.isPopular && (
                        <div className="bg-amber-400 text-amber-900 text-xs font-bold py-1.5 text-center">
                          NAJPOPULARNIEJSZY
                        </div>
                      )}

                      {/* Savings badge */}
                      {p.savings && !p.isPopular && (
                        <div className="absolute -top-0 -right-0">
                          <div className="bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-bl-xl">
                            -{p.savings}{p.savingsType === 'percentage' ? '%' : ' zł'}
                          </div>
                        </div>
                      )}

                      <div className={`p-6 ${p.isPopular ? 'text-white' : ''}`}>
                        {/* Tier badge */}
                        <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold mb-3 ${
                          p.isPopular ? 'bg-white/20' : 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400'
                        }`}>
                          <FaGem className="w-3 h-3" />
                          {p.tier || 'VIP'}
                        </div>

                        <h3 className={`text-xl font-bold mb-2 ${p.isPopular ? 'text-white' : 'text-gray-900 dark:text-white'}`}>
                          {p.name}
                        </h3>

                        {p.description && (
                          <p className={`text-sm mb-4 ${p.isPopular ? 'text-white/80' : 'text-gray-500 dark:text-gray-400'}`}>
                            {p.description}
                          </p>
                        )}

                        <div className="mb-4">
                          <div className="flex items-baseline gap-1">
                            <span className={`text-4xl font-bold ${p.isPopular ? 'text-white' : 'text-gray-900 dark:text-white'}`}>
                              {parseFloat(p.price).toFixed(0)}
                            </span>
                            <span className={p.isPopular ? 'text-white/70' : 'text-gray-500'}>zł</span>
                          </div>
                          <p className={`text-sm ${p.isPopular ? 'text-white/70' : 'text-gray-500'}`}>
                            {parseFloat(p.pricePerMonth).toFixed(2)} zł / miesiąc
                          </p>
                        </div>

                        {/* Features */}
                        {p.features && p.features.length > 0 && (
                          <div className="space-y-2 mb-4">
                            {p.features.slice(0, 4).map((feature, idx) => (
                              <div key={idx} className={`flex items-center gap-2 text-sm ${p.isPopular ? 'text-white/90' : 'text-gray-600 dark:text-gray-400'}`}>
                                <FaCheck className={`w-3 h-3 flex-shrink-0 ${p.isPopular ? 'text-amber-300' : 'text-green-500'}`} />
                                <span>{feature}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Select button */}
                        <div className={`
                          flex items-center justify-center gap-2 py-3 rounded-xl font-medium transition-colors
                          ${isSelected
                            ? p.isPopular
                              ? 'bg-white text-primary-600'
                              : 'bg-primary-500 text-white'
                            : p.isPopular
                              ? 'bg-white/20 text-white hover:bg-white/30'
                              : 'bg-gray-100 dark:bg-dark-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-dark-600'
                          }
                        `}>
                          {isSelected ? (
                            <>
                              <FaCheckCircle className="w-4 h-4" />
                              Wybrany
                            </>
                          ) : (
                            'Wybierz plan'
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Features Grid */}
          <div className="card p-6 relative">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <FaRocket className="text-primary-500" />
                Co otrzymujesz?
              </h3>
              <button
                onClick={() => setShowAllFeatures(!showAllFeatures)}
                className="text-sm text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-1"
              >
                {showAllFeatures ? 'Pokaż mniej' : 'Pokaż wszystko'}
                {showAllFeatures ? <FaChevronUp /> : <FaChevronDown />}
              </button>
            </div>

            <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 ${!showAllFeatures ? 'max-h-[280px] overflow-hidden' : ''}`}>
              {ALL_FEATURES.map((feature, i) => (
                <div key={i} className="flex gap-4 p-4 rounded-xl bg-gray-50 dark:bg-dark-700 hover:bg-gray-100 dark:hover:bg-dark-600 transition-colors">
                  <div className="p-3 rounded-xl bg-gradient-to-br from-primary-500 to-purple-600 shadow-lg flex-shrink-0">
                    <feature.icon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 dark:text-white">{feature.title}</h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{feature.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {!showAllFeatures && (
              <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-white dark:from-dark-800 to-transparent pointer-events-none rounded-b-2xl"></div>
            )}
          </div>

          {/* Promo Code */}
          <div className="card p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-xl bg-green-100 dark:bg-green-900/30">
                <FaTag className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Kod rabatowy</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">Masz kod? Użyj go tutaj!</p>
              </div>
            </div>

            {promoDiscount ? (
              <div className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800">
                <div className="flex items-center gap-3">
                  <FaCheckCircle className="w-5 h-5 text-green-500" />
                  <div>
                    <p className="font-medium text-green-700 dark:text-green-300">Kod: {promoCode}</p>
                    <p className="text-sm text-green-600 dark:text-green-400">
                      Rabat: {promoDiscount.type === 'percentage' ? `-${promoDiscount.value}%` : `-${promoDiscount.value} zł`}
                    </p>
                  </div>
                </div>
                <button onClick={handleRemovePromo} className="p-2 text-green-600 hover:bg-green-100 dark:hover:bg-green-900/30 rounded-lg">
                  <FaTimes />
                </button>
              </div>
            ) : (
              <div className="flex gap-3">
                <input
                  type="text"
                  value={promoCode}
                  onChange={(e) => { setPromoCode(e.target.value.toUpperCase()); setPromoError(''); }}
                  placeholder="Wpisz kod..."
                  className={`flex-1 px-4 py-3 rounded-xl border ${promoError ? 'border-red-300' : 'border-gray-200 dark:border-dark-600'} bg-gray-50 dark:bg-dark-700 font-mono uppercase`}
                />
                <button
                  onClick={handleValidatePromo}
                  disabled={promoLoading || !promoCode.trim()}
                  className="px-6 py-3 bg-green-500 hover:bg-green-600 text-white rounded-xl font-medium disabled:opacity-50 transition-colors"
                >
                  {promoLoading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : 'Zastosuj'}
                </button>
              </div>
            )}
            {promoError && <p className="text-sm text-red-500 mt-2">{promoError}</p>}
          </div>

          {/* FAQ */}
          <div className="card p-6">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
              <FaQuestionCircle className="text-primary-500" />
              Często zadawane pytania
            </h3>
            <div className="space-y-3">
              {FAQ_ITEMS.map((faq, i) => (
                <div key={i} className="border border-gray-100 dark:border-dark-700 rounded-xl overflow-hidden">
                  <button
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 dark:hover:bg-dark-700 transition-colors"
                  >
                    <span className="font-medium text-gray-900 dark:text-white">{faq.q}</span>
                    {openFaq === i ? <FaChevronUp className="text-gray-400" /> : <FaChevronDown className="text-gray-400" />}
                  </button>
                  {openFaq === i && (
                    <div className="px-4 pb-4 text-gray-600 dark:text-gray-400">
                      {faq.a}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right - Summary */}
        <div className="xl:col-span-1">
          <div className="sticky top-6 space-y-6">
            {/* Order Summary */}
            <div className="card p-6 shadow-lg">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                <FaShoppingCart className="text-primary-500" />
                Podsumowanie
              </h3>

              <div className="space-y-4 mb-6">
                <div className="flex justify-between items-center py-3 border-b border-gray-100 dark:border-dark-700">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30">
                      <FaCrown className="w-4 h-4 text-amber-500" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">Licencja {plan?.tier || 'VIP'}</p>
                      <p className="text-sm text-gray-500">{plan?.name}</p>
                    </div>
                  </div>
                  <span className="font-bold text-gray-900 dark:text-white">{plan ? parseFloat(plan.price).toFixed(0) : 0} zł</span>
                </div>

                {discount > 0 && (
                  <div className="flex justify-between items-center py-3 border-b border-gray-100 dark:border-dark-700">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                        <FaPercent className="w-4 h-4 text-green-500" />
                      </div>
                      <span className="text-green-600 dark:text-green-400">Rabat</span>
                    </div>
                    <span className="font-bold text-green-600">-{discount.toFixed(2)} zł</span>
                  </div>
                )}

                <div className="flex justify-between items-center pt-2">
                  <span className="text-lg font-bold text-gray-900 dark:text-white">Do zapłaty</span>
                  <div className="text-right">
                    {discount > 0 && (
                      <span className="text-sm text-gray-400 line-through mr-2">{plan ? parseFloat(plan.price).toFixed(0) : 0} zł</span>
                    )}
                    <span className="text-3xl font-bold text-gray-900 dark:text-white">{finalPrice.toFixed(0)} zł</span>
                  </div>
                </div>
              </div>

              {/* Checkout Button */}
              <button
                onClick={handleCheckout}
                disabled={checkoutLoading || !plan}
                className="w-full btn-gradient btn-lg font-bold gap-3"
              >
                {checkoutLoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Przetwarzanie...
                  </>
                ) : (
                  <>
                    <FaCreditCard />
                    Przejdź do płatności
                    <FaArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              {/* Security badges */}
              <div className="mt-6 pt-6 border-t border-gray-100 dark:border-dark-700">
                <div className="flex items-center justify-center gap-3 text-gray-400 mb-4">
                  <FaLock className="w-4 h-4" />
                  <span className="text-sm">Bezpieczna płatność</span>
                </div>
                <div className="flex items-center justify-center gap-4 opacity-50">
                  <svg className="h-6 dark:invert" viewBox="0 0 60 25" xmlns="http://www.w3.org/2000/svg" aria-label="Stripe">
                    <path fill="#635BFF" d="M59.64 14.28h-8.06c.19 1.93 1.6 2.55 3.2 2.55 1.64 0 2.96-.37 4.05-.95v3.32a13.35 13.35 0 0 1-4.56.85c-4.05 0-6.83-2.11-6.83-7.09 0-4.15 2.28-7.13 6.04-7.13 3.74 0 6.2 2.86 6.2 6.88 0 .52-.04 1.08-.04 1.57zm-4.39-4.52c0-.43-.15-1.54-1.64-1.54-1.31 0-1.86.88-2 1.54h3.64zM38.23 19.83V6.17h4.32l.22 1.47c.93-1.07 2.42-1.81 3.95-1.81v4.35c-.42-.07-.9-.11-1.5-.11-1.06 0-2.17.37-2.67.84v8.92h-4.32zm-8.3-9.22c0-1.03.94-1.43 2.13-1.43 1.43 0 3.23.52 4.66 1.43V6.44c-1.56-.62-3.1-.92-4.66-.92-3.8 0-6.32 1.98-6.32 5.3 0 5.17 7.11 4.34 7.11 6.57 0 1.22-1.06 1.62-2.55 1.62-1.75 0-3.99-.72-5.76-1.7v4.24c1.96.84 3.95 1.2 5.76 1.2 3.89 0 6.56-1.93 6.56-5.29-.04-5.58-7.15-4.59-7.15-6.84h.22zM14.59 22.92l4.03-.85V19.8l-4.52.95v2.17zm4.03-4.93V6.17l-4.48.95v11.82l4.48-.95zm-9.13 2.84v-4.62c-.74.33-1.73.56-2.55.56-1.55 0-2.35-.83-2.35-2.57V6.17H.13v8.76c0 3.87 2.13 5.91 5.37 5.91 1.55 0 3.13-.41 4-.01z"/>
                  </svg>
                </div>
              </div>
            </div>

            {/* Guarantee */}
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-2xl p-6 border border-green-200 dark:border-green-800">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 rounded-full bg-green-500">
                  <FaShieldAlt className="w-4 h-4 text-white" />
                </div>
                <h4 className="font-bold text-green-800 dark:text-green-300">Gwarancja satysfakcji</h4>
              </div>
              <p className="text-sm text-green-700 dark:text-green-400">
                Jeśli nie będziesz zadowolony, skontaktuj się z nami w ciągu 7 dni od zakupu, a zwrócimy pieniądze.
              </p>
            </div>

            {/* Support */}
            <div className="bg-gray-50 dark:bg-dark-700 rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 rounded-full bg-[#5865F2]">
                  <FaDiscord className="w-4 h-4 text-white" />
                </div>
                <h4 className="font-bold text-gray-900 dark:text-white">Potrzebujesz pomocy?</h4>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Dołącz do naszego serwera Discord i porozmawiaj z zespołem wsparcia.
              </p>
              <a
                href="https://discord.gg/kiraevo"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm font-medium text-[#5865F2] hover:underline"
              >
                Dołącz do Discord <FaArrowRight className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
