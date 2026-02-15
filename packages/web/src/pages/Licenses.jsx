import { useState, useEffect } from 'react';
import { licenseService } from '../services/api.service';
import { FaPlus, FaTrash, FaCheck, FaTimes, FaCopy, FaKey } from 'react-icons/fa';
import { PageHeader } from '../components/ui';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from '../contexts/LanguageContext';
import { useToast } from '../contexts/ToastContext';

export default function Licenses() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const toast = useToast();
  const [licenses, setLicenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [formData, setFormData] = useState({
      tier: 'FREE',
      duration: '30days',
      customDate: '',
      maxServers: 1
  });

  useEffect(() => {
    fetchLicenses();
  }, []);

  const fetchLicenses = async () => {
    try {
      const response = await licenseService.getAll();
      setLicenses(response.data.data);
    } catch (error) {
      // fetch error handled silently
    } finally {
      setLoading(false);
    }
  };

  const calculateExpiresAt = () => {
    const { duration, customDate } = formData;

    if (duration === 'lifetime') {
      return null;
    }

    if (duration === 'custom') {
      return customDate || null;
    }

    const now = new Date();
    const daysMap = {
      '30days': 30,
      '90days': 90,
      '1year': 365
    };

    const days = daysMap[duration];
    if (!days) return null;

    now.setDate(now.getDate() + days);
    return now.toISOString().split('T')[0];
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const expiresAt = calculateExpiresAt();
      await licenseService.create({
          tier: formData.tier,
          expiresAt,
          maxServers: parseInt(formData.maxServers)
      });
      setShowCreate(false);
      setFormData({ tier: 'FREE', duration: '30days', customDate: '', maxServers: 1 });
      fetchLicenses();
    } catch (error) {
      toast.error(t('pages.adminLicenses.createError') || 'Failed to create license');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm(t('pages.adminLicenses.deleteConfirm'))) return;

    try {
      await licenseService.delete(id);
      fetchLicenses();
    } catch (error) {
      toast.error(t('pages.adminLicenses.deleteError') || 'Failed to delete license');
    }
  };

  const copyToClipboard = (text) => {
      navigator.clipboard.writeText(text);
      toast.success(t('pages.adminLicenses.keyCopied'));
  };

  if (loading) {
    return <div className="text-center py-8">{t('pages.adminLicenses.loading')}</div>;
  }

  if (user?.role !== 'ADMIN') {
      return <div className="text-center py-12 text-gray-500">{t('pages.adminLicenses.accessDenied')}</div>;
  }

  return (
    <div>
      <PageHeader
        title={t('pages.adminLicenses.title')}
        icon={FaKey}
        iconColor="text-yellow-500"
        actions={
          <button onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-2">
            <FaPlus />
            <span>{t('pages.adminLicenses.createLicense')}</span>
          </button>
        }
      />

      {showCreate && (
        <div className="card p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
            {t('pages.adminLicenses.createLicense') || 'Create New License'}
          </h2>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-gray-700 dark:text-gray-300 mb-2">
                      {t('pages.adminLicenses.tier') || 'Tier'}
                    </label>
                    <select
                        value={formData.tier}
                        onChange={(e) => setFormData({ ...formData, tier: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-dark-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-dark-700 text-gray-900 dark:text-white"
                    >
                        <option value="FREE">Free</option>
                        <option value="PREMIUM">Premium</option>
                        <option value="VIP">VIP</option>
                    </select>
                </div>
                <div>
                     <label className="block text-gray-700 dark:text-gray-300 mb-2">
                       {t('pages.adminLicenses.maxServers') || 'Max Uses (Servers)'}
                     </label>
                     <input
                        type="number"
                        min="1"
                        value={formData.maxServers}
                        onChange={(e) => setFormData({ ...formData, maxServers: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-dark-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-dark-700 text-gray-900 dark:text-white"
                     />
                </div>
            </div>

            <div>
              <label className="block text-gray-700 dark:text-gray-300 mb-2">
                {t('pages.adminLicenses.duration') || 'Duration'}
              </label>
              <select
                value={formData.duration}
                onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-dark-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-dark-700 text-gray-900 dark:text-white"
              >
                <option value="30days">30 Days</option>
                <option value="90days">90 Days</option>
                <option value="1year">1 Year</option>
                <option value="lifetime">Lifetime (No Expiration)</option>
                <option value="custom">Custom Date</option>
              </select>
            </div>
            {formData.duration === 'custom' && (
              <div>
                <label className="block text-gray-700 dark:text-gray-300 mb-2">Custom Expiration Date</label>
                <input
                  type="date"
                  value={formData.customDate}
                  onChange={(e) => setFormData({ ...formData, customDate: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-dark-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-dark-700 text-gray-900 dark:text-white"
                  required
                />
              </div>
            )}
            <div className="flex space-x-2">
              <button type="submit" className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg">
                {t('pages.adminLicenses.create') || 'Create'}
              </button>
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg"
              >
                {t('pages.adminLicenses.cancel') || 'Cancel'}
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
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">License Key</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Tier</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Max Servers</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Active</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Expires</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-dark-800 divide-y divide-gray-200 dark:divide-dark-700">
            {licenses.map((license) => (
              <tr key={license.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-mono flex items-center gap-2 text-gray-900 dark:text-gray-100">
                    {license.licenseKey}
                    <button onClick={() => copyToClipboard(license.licenseKey)} className="text-gray-400 hover:text-blue-500 dark:hover:text-blue-400"><FaCopy/></button>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 rounded text-xs font-semibold ${
                    license.tier === 'VIP' ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300' :
                    license.tier === 'PREMIUM' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300' :
                    'bg-gray-100 dark:bg-dark-600 text-gray-800 dark:text-gray-300'
                  }`}>
                    {license.tier}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                  {license.maxServers === -1 ? 'Unlimited' : license.maxServers}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {license.isActive ? (
                    <FaCheck className="text-green-600 dark:text-green-400" />
                  ) : (
                    <FaTimes className="text-red-600 dark:text-red-400" />
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                  {license.expiresAt ? new Date(license.expiresAt).toLocaleDateString() : 'Never'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                    <button
                      onClick={() => handleDelete(license.id)}
                      className="text-red-600 hover:text-red-800 p-2"
                      title="Delete License"
                    >
                      <FaTrash />
                    </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {licenses.length === 0 ? (
          <div className="card p-6 text-center text-gray-500 dark:text-gray-400">
            {t('pages.adminLicenses.noLicenses') || 'No licenses found'}
          </div>
        ) : (
          licenses.map((license) => (
            <div key={license.id} className="card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className={`px-2 py-1 rounded text-xs font-semibold ${
                  license.tier === 'VIP' ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300' :
                  license.tier === 'PREMIUM' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300' :
                  'bg-gray-100 dark:bg-dark-600 text-gray-800 dark:text-gray-300'
                }`}>
                  {license.tier}
                </span>
                <div className="flex items-center gap-2">
                  {license.isActive ? (
                    <span className="flex items-center gap-1 text-xs text-green-500"><FaCheck className="w-3 h-3" /> Active</span>
                  ) : (
                    <span className="flex items-center gap-1 text-xs text-red-500"><FaTimes className="w-3 h-3" /> Inactive</span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <code className="text-xs font-mono text-gray-900 dark:text-gray-100 bg-gray-100 dark:bg-dark-700 px-2 py-1 rounded break-all flex-1">
                  {license.licenseKey}
                </code>
                <button onClick={() => copyToClipboard(license.licenseKey)} className="text-gray-400 hover:text-blue-500 p-1 flex-shrink-0">
                  <FaCopy className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
                <span>Max: {license.maxServers === -1 ? 'Unlimited' : license.maxServers}</span>
                <span>{license.expiresAt ? new Date(license.expiresAt).toLocaleDateString() : 'Never'}</span>
              </div>

              <div className="flex justify-end border-t border-gray-200 dark:border-dark-700 pt-2">
                <button
                  onClick={() => handleDelete(license.id)}
                  className="text-red-600 hover:text-red-800 p-2 text-sm flex items-center gap-1"
                >
                  <FaTrash className="w-3 h-3" /> Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}