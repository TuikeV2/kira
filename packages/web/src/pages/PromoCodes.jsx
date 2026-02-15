import { useState, useEffect } from 'react';
import { promoCodeService } from '../services/api.service';
import { FaPlus, FaTrash, FaCheck, FaTimes, FaCopy, FaEdit, FaTags } from 'react-icons/fa';
import { PageHeader } from '../components/ui';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from '../contexts/LanguageContext';
import { useToast } from '../contexts/ToastContext';

export default function PromoCodes() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const toast = useToast();
  const [promoCodes, setPromoCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    code: '',
    discountType: 'percentage',
    discountValue: 10,
    maxUses: '',
    expiresAt: ''
  });

  useEffect(() => {
    fetchPromoCodes();
  }, []);

  const fetchPromoCodes = async () => {
    try {
      const response = await promoCodeService.getAll();
      setPromoCodes(response.data.data);
    } catch (error) {
      // fetch error handled silently
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      code: '',
      discountType: 'percentage',
      discountValue: 10,
      maxUses: '',
      expiresAt: ''
    });
    setEditingId(null);
    setShowCreate(false);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const data = {
        code: formData.code,
        discountType: formData.discountType,
        discountValue: parseFloat(formData.discountValue),
        maxUses: formData.maxUses ? parseInt(formData.maxUses) : null,
        expiresAt: formData.expiresAt || null
      };

      if (editingId) {
        await promoCodeService.update(editingId, data);
      } else {
        await promoCodeService.create(data);
      }

      resetForm();
      fetchPromoCodes();
    } catch (error) {
      toast.error(error.response?.data?.message || t('promoCodes.saveError'));
    }
  };

  const handleEdit = (promo) => {
    setFormData({
      code: promo.code,
      discountType: promo.discountType,
      discountValue: promo.discountValue,
      maxUses: promo.maxUses || '',
      expiresAt: promo.expiresAt ? promo.expiresAt.split('T')[0] : ''
    });
    setEditingId(promo.id);
    setShowCreate(true);
  };

  const handleDelete = async (id) => {
    if (!confirm(t('promoCodes.deleteConfirm'))) return;

    try {
      await promoCodeService.delete(id);
      fetchPromoCodes();
    } catch (error) {
      toast.error(t('promoCodes.deleteError'));
    }
  };

  const handleToggleActive = async (promo) => {
    try {
      await promoCodeService.update(promo.id, { isActive: !promo.isActive });
      fetchPromoCodes();
    } catch (error) {
      // toggle error handled silently
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success(t('promoCodes.codeCopied'));
  };

  if (loading) {
    return <div className="text-center py-8">{t('promoCodes.loading')}</div>;
  }

  if (user?.role !== 'ADMIN') {
    return <div className="text-center py-12 text-gray-500">{t('promoCodes.accessDenied')}</div>;
  }

  return (
    <div>
      <PageHeader
        title={t('promoCodes.title')}
        icon={FaTags}
        iconColor="text-green-500"
        actions={
          <button onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-2">
            <FaPlus />
            <span>{t('promoCodes.newCode')}</span>
          </button>
        }
      />

      {showCreate && (
        <div className="card p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
            {editingId ? t('promoCodes.editCode') : t('promoCodes.createCode')}
          </h2>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-700 dark:text-gray-300 mb-2">{t('promoCodes.code')}</label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  placeholder={t('promoCodes.codePlaceholder')}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-dark-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-dark-700 text-gray-900 dark:text-white"
                  required
                />
              </div>
              <div>
                <label className="block text-gray-700 dark:text-gray-300 mb-2">{t('promoCodes.discountType')}</label>
                <select
                  value={formData.discountType}
                  onChange={(e) => setFormData({ ...formData, discountType: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-dark-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-dark-700 text-gray-900 dark:text-white"
                >
                  <option value="percentage">{t('promoCodes.percentage')}</option>
                  <option value="fixed">{t('promoCodes.fixed')}</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-gray-700 dark:text-gray-300 mb-2">
                  {t('promoCodes.value')} {formData.discountType === 'percentage' ? '(%)' : '(PLN)'}
                </label>
                <input
                  type="number"
                  min="0"
                  max={formData.discountType === 'percentage' ? '100' : '9999'}
                  step={formData.discountType === 'percentage' ? '1' : '0.01'}
                  value={formData.discountValue}
                  onChange={(e) => setFormData({ ...formData, discountValue: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-dark-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-dark-700 text-gray-900 dark:text-white"
                  required
                />
              </div>
              <div>
                <label className="block text-gray-700 dark:text-gray-300 mb-2">{t('promoCodes.maxUses')}</label>
                <input
                  type="number"
                  min="1"
                  value={formData.maxUses}
                  onChange={(e) => setFormData({ ...formData, maxUses: e.target.value })}
                  placeholder={t('promoCodes.maxUsesPlaceholder')}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-dark-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-dark-700 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-gray-700 dark:text-gray-300 mb-2">{t('promoCodes.expires')}</label>
                <input
                  type="date"
                  value={formData.expiresAt}
                  onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-dark-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-dark-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>

            <div className="flex space-x-2">
              <button type="submit" className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg">
                {editingId ? t('promoCodes.save') : t('promoCodes.create')}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg"
              >
                {t('promoCodes.cancel')}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Desktop table */}
      <div className="card overflow-hidden hidden md:block">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-dark-700">
          <thead className="bg-gray-50 dark:bg-dark-700">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{t('promoCodes.code')}</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{t('promoCodes.discount')}</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{t('promoCodes.uses')}</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{t('promoCodes.isActive')}</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{t('promoCodes.expires')}</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{t('promoCodes.actions')}</th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-dark-800 divide-y divide-gray-200 dark:divide-dark-700">
            {promoCodes.length === 0 ? (
              <tr>
                <td colSpan="6" className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                  {t('promoCodes.noPromoCodes')}
                </td>
              </tr>
            ) : (
              promoCodes.map((promo) => (
                <tr key={promo.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-mono flex items-center gap-2 text-gray-900 dark:text-gray-100">
                    {promo.code}
                    <button
                      onClick={() => copyToClipboard(promo.code)}
                      className="text-gray-400 hover:text-blue-500 dark:hover:text-blue-400"
                    >
                      <FaCopy />
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${
                      promo.discountType === 'percentage'
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                        : 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300'
                    }`}>
                      {promo.discountType === 'percentage'
                        ? `${promo.discountValue}%`
                        : `${promo.discountValue} PLN`}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                    {promo.usedCount} / {promo.maxUses || '\u221e'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button onClick={() => handleToggleActive(promo)}>
                      {promo.isActive ? (
                        <FaCheck className="text-green-600 dark:text-green-400 hover:text-green-800" />
                      ) : (
                        <FaTimes className="text-red-600 dark:text-red-400 hover:text-red-800" />
                      )}
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                    {promo.expiresAt ? new Date(promo.expiresAt).toLocaleDateString() : t('promoCodes.never')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right space-x-2">
                    <button
                      onClick={() => handleEdit(promo)}
                      className="text-blue-600 hover:text-blue-800 p-2"
                      title={t('promoCodes.editTooltip')}
                    >
                      <FaEdit />
                    </button>
                    <button
                      onClick={() => handleDelete(promo.id)}
                      className="text-red-600 hover:text-red-800 p-2"
                      title={t('promoCodes.deleteTooltip')}
                    >
                      <FaTrash />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {promoCodes.length === 0 ? (
          <div className="card p-6 text-center text-gray-500 dark:text-gray-400">
            {t('promoCodes.noPromoCodes')}
          </div>
        ) : (
          promoCodes.map((promo) => (
            <div key={promo.id} className="card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <code className="text-sm font-mono font-bold text-gray-900 dark:text-gray-100">
                    {promo.code}
                  </code>
                  <button
                    onClick={() => copyToClipboard(promo.code)}
                    className="text-gray-400 hover:text-blue-500 p-1"
                  >
                    <FaCopy className="w-3.5 h-3.5" />
                  </button>
                </div>
                <button onClick={() => handleToggleActive(promo)}>
                  {promo.isActive ? (
                    <span className="flex items-center gap-1 text-xs text-green-500"><FaCheck className="w-3 h-3" /> Active</span>
                  ) : (
                    <span className="flex items-center gap-1 text-xs text-red-500"><FaTimes className="w-3 h-3" /> Inactive</span>
                  )}
                </button>
              </div>

              <div className="flex items-center gap-3 text-sm">
                <span className={`px-2 py-1 rounded text-xs font-semibold ${
                  promo.discountType === 'percentage'
                    ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                    : 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300'
                }`}>
                  {promo.discountType === 'percentage'
                    ? `${promo.discountValue}%`
                    : `${promo.discountValue} PLN`}
                </span>
                <span className="text-gray-500 dark:text-gray-400">
                  {promo.usedCount} / {promo.maxUses || '\u221e'} {t('promoCodes.uses').toLowerCase()}
                </span>
              </div>

              <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
                <span>{promo.expiresAt ? new Date(promo.expiresAt).toLocaleDateString() : t('promoCodes.never')}</span>
              </div>

              <div className="flex justify-end gap-2 border-t border-gray-200 dark:border-dark-700 pt-2">
                <button
                  onClick={() => handleEdit(promo)}
                  className="text-blue-600 hover:text-blue-800 p-2 text-sm flex items-center gap-1"
                >
                  <FaEdit className="w-3 h-3" /> {t('promoCodes.editTooltip') || 'Edit'}
                </button>
                <button
                  onClick={() => handleDelete(promo.id)}
                  className="text-red-600 hover:text-red-800 p-2 text-sm flex items-center gap-1"
                >
                  <FaTrash className="w-3 h-3" /> {t('promoCodes.deleteTooltip') || 'Delete'}
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}