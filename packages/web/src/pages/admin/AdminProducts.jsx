import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { FaBox, FaPlus, FaEdit, FaTrash, FaCrown, FaCheck, FaTimes, FaStar, FaSave, FaCog, FaGlobe } from 'react-icons/fa';
import { adminService } from '../../services/api.service';
import { useToast } from '../../contexts/ToastContext';
import { SkeletonCard } from '../../components/ui';
import { useTranslation } from '../../contexts/LanguageContext';

const MODULE_LIST = [
  { id: 'automod', label: 'Auto-Moderation' },
  { id: 'join-leave', label: 'Join/Leave' },
  { id: 'invite-logger', label: 'Invite Logger' },
  { id: 'leveling', label: 'Leveling' },
  { id: 'giveaways', label: 'Giveaways' },
  { id: 'music', label: 'Music' },
  { id: 'embed-creator', label: 'Embed Creator' },
  { id: 'reaction-roles', label: 'Reaction Roles' },
  { id: 'tickets', label: 'Tickets' },
  { id: 'custom-commands', label: 'Custom Commands' },
  { id: 'stats-channels', label: 'Stats Channels' },
  { id: 'temp-voice', label: 'Temp Voice' },
];

const DEFAULT_PRODUCT = {
  name: '',
  description: '',
  tier: 'VIP',
  duration: 1,
  price: 30,
  pricePerMonth: 30,
  maxServers: 1,
  features: [],
  featureLimits: [],
  isPopular: false,
  savings: null,
  savingsType: 'fixed',
  isActive: true,
  sortOrder: 0
};

export default function AdminProducts() {
  const { user } = useAuth();
  const toast = useToast();
  const { t } = useTranslation();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [formData, setFormData] = useState(DEFAULT_PRODUCT);
  const [saving, setSaving] = useState(false);
  const [newFeature, setNewFeature] = useState('');

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await adminService.getProducts();
      setProducts(response.data.data || []);
    } catch (error) {
      toast.error(t('adminProducts.fetchError'));
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingProduct(null);
    setFormData(DEFAULT_PRODUCT);
    setShowModal(true);
  };

  const handleEdit = (product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name || '',
      description: product.description || '',
      tier: product.tier || 'VIP',
      duration: product.duration || 1,
      price: parseFloat(product.price) || 0,
      pricePerMonth: parseFloat(product.pricePerMonth) || 0,
      maxServers: product.maxServers || 1,
      features: product.features || [],
      featureLimits: product.featureLimits || [],
      isPopular: product.isPopular || false,
      savings: product.savings || null,
      savingsType: product.savingsType || 'fixed',
      isActive: product.isActive !== false,
      sortOrder: product.sortOrder || 0
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!confirm(t('adminProducts.deleteConfirm'))) return;

    try {
      await adminService.deleteProduct(id);
      toast.success(t('adminProducts.deleted'));
      fetchProducts();
    } catch (error) {
      toast.error(t('adminProducts.deleteError'));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const data = {
        ...formData,
        pricePerMonth: formData.pricePerMonth || (formData.price / formData.duration)
      };

      if (editingProduct) {
        await adminService.updateProduct(editingProduct.id, data);
        toast.success(t('adminProducts.updated'));
      } else {
        await adminService.createProduct(data);
        toast.success(t('adminProducts.created'));
      }

      setShowModal(false);
      fetchProducts();
    } catch (error) {
      const msg = error.response?.data?.message || t('adminProducts.saveError');
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const addFeature = () => {
    if (newFeature.trim()) {
      setFormData({
        ...formData,
        features: [...formData.features, newFeature.trim()]
      });
      setNewFeature('');
    }
  };

  const removeFeature = (index) => {
    setFormData({
      ...formData,
      features: formData.features.filter((_, i) => i !== index)
    });
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="w-48 h-8 bg-gray-200 dark:bg-dark-700 rounded animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1,2,3,4].map(i => <SkeletonCard key={i} />)}
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <FaBox className="text-amber-500" />
            {t('adminProducts.title')}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            {t('adminProducts.subtitle')}
          </p>
        </div>
        <button
          onClick={handleCreate}
          className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-medium transition-colors"
        >
          <FaPlus />
          {t('adminProducts.addProduct')}
        </button>
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {products.map((product) => (
          <div
            key={product.id}
            className={`bg-white dark:bg-dark-800 rounded-xl border-2 p-6 relative ${
              product.isActive
                ? product.isPopular
                  ? 'border-amber-400 dark:border-amber-500'
                  : 'border-gray-200 dark:border-dark-600'
                : 'border-red-200 dark:border-red-800 opacity-60'
            }`}
          >
            {/* Badges */}
            <div className="absolute -top-3 left-4 flex gap-2">
              {product.isPopular && (
                <span className="bg-amber-500 text-white text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1">
                  <FaStar className="text-xs" /> {t('adminProducts.popular')}
                </span>
              )}
              {!product.isActive && (
                <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                  {t('adminProducts.inactive')}
                </span>
              )}
            </div>

            {/* Savings badge */}
            {product.savings && (
              <div className="absolute -top-3 right-4">
                <span className="bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                  -{product.savings}{product.savingsType === 'percentage' ? '%' : ' zł'}
                </span>
              </div>
            )}

            <div className="pt-2">
              {/* Tier */}
              <span className={`inline-block px-2 py-1 rounded text-xs font-bold mb-2 ${
                product.tier === 'VIP'
                  ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                  : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
              }`}>
                {product.tier}
              </span>

              {/* Name & Price */}
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">{product.name}</h3>
              <div className="flex items-baseline gap-1 mt-2">
                <span className="text-3xl font-bold text-gray-900 dark:text-white">
                  {parseFloat(product.price).toFixed(0)}
                </span>
                <span className="text-gray-500">{t('adminProducts.currency')}</span>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {parseFloat(product.pricePerMonth).toFixed(2)} {t('adminProducts.perMonth')}
              </p>

              {/* Duration & Servers */}
              <div className="mt-4 space-y-1 text-sm text-gray-600 dark:text-gray-400">
                <p>{t('adminProducts.durationLabel')} <span className="font-medium">{product.duration} {t('adminProducts.durationMonths')}</span></p>
                <p>{t('adminProducts.maxServersLabel')} <span className="font-medium">{product.maxServers === -1 ? t('adminProducts.unlimited') : product.maxServers}</span></p>
                <p>{t('adminProducts.orderLabel')} <span className="font-medium">{product.sortOrder}</span></p>
              </div>

              {/* Features */}
              {product.features && product.features.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-100 dark:border-dark-700">
                  <p className="text-xs font-bold text-gray-500 uppercase mb-2">{t('adminProducts.features')}:</p>
                  <div className="space-y-1">
                    {product.features.slice(0, 3).map((feature, i) => (
                      <p key={i} className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
                        <FaCheck className="text-green-500 text-xs" />
                        {feature}
                      </p>
                    ))}
                    {product.features.length > 3 && (
                      <p className="text-xs text-gray-400">{t('adminProducts.moreFeatures', { count: product.features.length - 3 })}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 mt-4 pt-4 border-t border-gray-100 dark:border-dark-700">
                <button
                  onClick={() => handleEdit(product)}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                >
                  <FaEdit />
                  {t('adminProducts.edit')}
                </button>
                <button
                  onClick={() => handleDelete(product.id)}
                  className="px-3 py-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                >
                  <FaTrash />
                </button>
              </div>
            </div>
          </div>
        ))}

        {products.length === 0 && (
          <div className="col-span-full text-center py-12 card">
            <FaBox className="text-4xl text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <p className="text-gray-500 dark:text-gray-400 mb-4">{t('adminProducts.noProducts')}</p>
            <button
              onClick={handleCreate}
              className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-medium transition-colors"
            >
              <FaPlus />
              {t('adminProducts.addProduct')}
            </button>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-dark-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 dark:border-dark-700">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {editingProduct ? t('adminProducts.editProduct') : t('adminProducts.newProduct')}
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('adminProducts.productName')}
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-white"
                    placeholder={t('adminProducts.productNamePlaceholder')}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('adminProducts.tier')}
                  </label>
                  <select
                    value={formData.tier}
                    onChange={(e) => setFormData({ ...formData, tier: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-white"
                  >
                    <option value="PREMIUM">PREMIUM</option>
                    <option value="VIP">VIP</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('adminProducts.duration')}
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.duration}
                    onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) || 1 })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('adminProducts.price')}
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('adminProducts.pricePerMonth')}
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.pricePerMonth || (formData.price / formData.duration).toFixed(2)}
                    onChange={(e) => setFormData({ ...formData, pricePerMonth: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('adminProducts.maxServers')}
                  </label>
                  <input
                    type="number"
                    min="-1"
                    value={formData.maxServers}
                    onChange={(e) => setFormData({ ...formData, maxServers: parseInt(e.target.value) || 1 })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-white"
                    placeholder={t('adminProducts.maxServersPlaceholder')}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('adminProducts.sortOrder')}
                  </label>
                  <input
                    type="number"
                    value={formData.sortOrder}
                    onChange={(e) => setFormData({ ...formData, sortOrder: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Savings */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('adminProducts.savings')}
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.savings || ''}
                    onChange={(e) => setFormData({ ...formData, savings: e.target.value ? parseInt(e.target.value) : null })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-white"
                    placeholder={t('adminProducts.savingsPlaceholder')}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('adminProducts.savingsType')}
                  </label>
                  <select
                    value={formData.savingsType}
                    onChange={(e) => setFormData({ ...formData, savingsType: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-white"
                  >
                    <option value="fixed">{t('adminProducts.savingsFixed')}</option>
                    <option value="percentage">{t('adminProducts.savingsPercentage')}</option>
                  </select>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('adminProducts.description')}
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-white"
                  rows={2}
                  placeholder={t('adminProducts.descriptionPlaceholder')}
                />
              </div>

              {/* Features */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('adminProducts.features')}
                </label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={newFeature}
                    onChange={(e) => setNewFeature(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addFeature())}
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-white"
                    placeholder={t('adminProducts.addFeature')}
                  />
                  <button
                    type="button"
                    onClick={addFeature}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                  >
                    <FaPlus />
                  </button>
                </div>
                <div className="space-y-1">
                  {formData.features.map((feature, index) => (
                    <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-dark-700 rounded-lg">
                      <FaCheck className="text-green-500 text-sm" />
                      <span className="flex-1 text-sm text-gray-700 dark:text-gray-300">{feature}</span>
                      <button
                        type="button"
                        onClick={() => removeFeature(index)}
                        className="text-red-500 hover:text-red-600"
                      >
                        <FaTimes />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Feature Limits */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                  <FaCog className="text-gray-400" />
                  {t('adminProducts.featureLimits') || 'Feature Limits'}
                </label>
                <div className="space-y-2 max-h-64 overflow-y-auto border border-gray-200 dark:border-dark-600 rounded-lg p-3">
                  {MODULE_LIST.map((mod) => {
                    const fl = formData.featureLimits.find(f => f.moduleId === mod.id) || { moduleId: mod.id, enabled: false, maxItems: '', subFeatures: [], showOnLanding: false, description: '' };
                    const updateFL = (updates) => {
                      const existing = formData.featureLimits.filter(f => f.moduleId !== mod.id);
                      setFormData({ ...formData, featureLimits: [...existing, { ...fl, ...updates }] });
                    };
                    return (
                      <div key={mod.id} className="p-3 bg-gray-50 dark:bg-dark-700 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={fl.enabled}
                              onChange={(e) => updateFL({ enabled: e.target.checked })}
                              className="rounded border-gray-300 text-amber-500 focus:ring-amber-500"
                            />
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{mod.label}</span>
                          </div>
                          <label className="flex items-center gap-1 text-xs text-gray-500">
                            <FaGlobe className="w-3 h-3" />
                            <input
                              type="checkbox"
                              checked={fl.showOnLanding}
                              onChange={(e) => updateFL({ showOnLanding: e.target.checked })}
                              className="rounded border-gray-300 text-blue-500 focus:ring-blue-500"
                            />
                            Landing
                          </label>
                        </div>
                        {fl.enabled && (
                          <div className="grid grid-cols-2 gap-2 mt-2">
                            <input
                              type="number"
                              min="0"
                              value={fl.maxItems || ''}
                              onChange={(e) => updateFL({ maxItems: e.target.value ? parseInt(e.target.value) : '' })}
                              className="px-2 py-1 text-xs border border-gray-300 dark:border-dark-600 rounded bg-white dark:bg-dark-600 text-gray-900 dark:text-white"
                              placeholder={t('adminProducts.maxItems') || 'Max items (0=unlimited)'}
                            />
                            <input
                              type="text"
                              value={fl.description || ''}
                              onChange={(e) => updateFL({ description: e.target.value })}
                              className="px-2 py-1 text-xs border border-gray-300 dark:border-dark-600 rounded bg-white dark:bg-dark-600 text-gray-900 dark:text-white"
                              placeholder={t('adminProducts.featureDesc') || 'Description for landing'}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Toggles */}
              <div className="flex gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="rounded border-gray-300 text-amber-500 focus:ring-amber-500"
                  />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('adminProducts.active')}</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isPopular}
                    onChange={(e) => setFormData({ ...formData, isPopular: e.target.checked })}
                    className="rounded border-gray-300 text-amber-500 focus:ring-amber-500"
                  />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('adminProducts.popular')}</span>
                </label>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-dark-700">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-700 rounded-lg transition-colors"
                >
                  {t('adminProducts.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                >
                  {saving ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <FaSave />
                  )}
                  {editingProduct ? t('adminProducts.saveChanges') : t('adminProducts.createProduct')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
