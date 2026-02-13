import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FaUsers, FaUserShield, FaUserPlus, FaSearch, FaEye, FaTrash,
  FaCrown, FaUser, FaSortAmountDown, FaSortAmountUp, FaBan, FaUndo
} from 'react-icons/fa';
import { adminService } from '../../services/api.service';
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from '../../contexts/LanguageContext';
import StatCard from '../../components/StatCard';
import { Modal, ConfirmDialog, Pagination } from '../../components/ui';
import { useToast } from '../../contexts/ToastContext';

export default function AdminUsers() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const toast = useToast();

  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [sort, setSort] = useState('created_at');
  const [order, setOrder] = useState('DESC');
  const [selectedUser, setSelectedUser] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [userDetails, setUserDetails] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [showBanModal, setShowBanModal] = useState(false);
  const [banReason, setBanReason] = useState('');
  const [banLoading, setBanLoading] = useState(false);
  const limit = 10;

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const params = { page, limit, sort, order };
      if (search) params.search = search;
      if (roleFilter) params.role = roleFilter;

      const response = await adminService.getUsers(params);
      setUsers(response.data.data);
      setTotalPages(response.data.pagination.totalPages);
      setTotalItems(response.data.pagination.total);
    } catch (error) {
      toast.error(t('common.fetchError') || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [page, search, roleFilter, sort, order]);

  const fetchStats = async () => {
    try {
      const response = await adminService.getUserStats();
      setStats(response.data.data);
    } catch (error) {
      toast.error(t('common.fetchError') || 'Failed to load stats');
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    fetchStats();
  }, []);

  const handleSearch = (e) => {
    setSearch(e.target.value);
    setPage(1);
  };

  const handleSort = (col) => {
    if (sort === col) {
      setOrder(order === 'DESC' ? 'ASC' : 'DESC');
    } else {
      setSort(col);
      setOrder('DESC');
    }
    setPage(1);
  };

  const handleViewDetails = async (u) => {
    setSelectedUser(u);
    setShowDetailsModal(true);
    setDetailsLoading(true);
    try {
      const response = await adminService.getUserDetails(u.id);
      setUserDetails(response.data.data);
    } catch (error) {
      toast.error(t('common.fetchError') || 'Failed to load user details');
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleRoleChange = async (u) => {
    const newRole = u.role === 'ADMIN' ? 'USER' : 'ADMIN';
    try {
      await adminService.updateUserRole(u.id, newRole);
      toast.success(t('adminUsers.roleUpdated') || `Rola zmieniona na ${newRole}`);
      fetchUsers();
      fetchStats();
    } catch (error) {
      toast.error(t('adminUsers.roleUpdateFailed') || 'Nie udalo sie zmienic roli');
    }
  };

  const handleDeleteUser = async () => {
    if (!deleteTarget) return;
    try {
      await adminService.deleteUser(deleteTarget.id);
      toast.success(t('adminUsers.userDeleted') || 'Uzytkownik usuniety');
      setDeleteTarget(null);
      fetchUsers();
      fetchStats();
    } catch (error) {
      toast.error(error.response?.data?.message || t('adminUsers.deleteFailed') || 'Nie udalo sie usunac');
    }
  };

  const handleSelectUser = (userId) => {
    setSelectedUsers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleSelectAll = () => {
    const selectableUsers = users.filter(u => u.discordId !== user.discordId);
    if (selectedUsers.length === selectableUsers.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(selectableUsers.map(u => u.id));
    }
  };

  const handleBanUsers = async () => {
    if (selectedUsers.length === 0) return;
    setBanLoading(true);
    try {
      await adminService.banUsers(selectedUsers, banReason || null);
      toast.success(`Zbanowano ${selectedUsers.length} uzytkownikow`);
      setShowBanModal(false);
      setBanReason('');
      setSelectedUsers([]);
      fetchUsers();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Nie udalo sie zbanowac uzytkownikow');
    } finally {
      setBanLoading(false);
    }
  };

  const handleUnbanUsers = async () => {
    if (selectedUsers.length === 0) return;
    setBanLoading(true);
    try {
      await adminService.unbanUsers(selectedUsers);
      toast.success(`Odbanowano ${selectedUsers.length} uzytkownikow`);
      setSelectedUsers([]);
      fetchUsers();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Nie udalo sie odbanowac uzytkownikow');
    } finally {
      setBanLoading(false);
    }
  };

  const SortIcon = ({ col }) => {
    if (sort !== col) return null;
    return order === 'DESC' ? <FaSortAmountDown className="w-3 h-3" /> : <FaSortAmountUp className="w-3 h-3" />;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="page-title">{t('adminUsers.title') || 'Zarzadzanie uzytkownikami'}</h1>
        <p className="page-subtitle">{t('adminUsers.subtitle') || 'Przegladaj i zarzadzaj uzytkownikami systemu'}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title={t('adminUsers.totalUsers') || 'Wszystkich uzytkownikow'}
          value={stats?.totalUsers || 0}
          icon={FaUsers}
          color="blue"
        />
        <StatCard
          title={t('adminUsers.admins') || 'Administratorzy'}
          value={stats?.adminCount || 0}
          icon={FaUserShield}
          color="purple"
        />
        <StatCard
          title={t('adminUsers.newThisMonth') || 'Nowi w tym miesiacu'}
          value={stats?.newUsersThisMonth || 0}
          icon={FaUserPlus}
          color="green"
        />
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder={t('adminUsers.searchPlaceholder') || 'Szukaj po nazwie, Discord ID lub email...'}
              value={search}
              onChange={handleSearch}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-dark-700 border border-gray-200 dark:border-dark-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <select
            value={roleFilter}
            onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
            className="px-4 py-2.5 bg-gray-50 dark:bg-dark-700 border border-gray-200 dark:border-dark-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">{t('adminUsers.allRoles') || 'Wszystkie role'}</option>
            <option value="ADMIN">Admin</option>
            <option value="USER">User</option>
          </select>
        </div>

        {/* Bulk actions */}
        {selectedUsers.length > 0 && (
          <div className="flex items-center gap-3 mt-3 pt-3 border-t border-gray-200 dark:border-dark-600">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Wybrano: <strong>{selectedUsers.length}</strong>
            </span>
            <button
              onClick={() => setShowBanModal(true)}
              disabled={banLoading}
              className="flex items-center gap-2 px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              <FaBan className="w-3.5 h-3.5" />
              Zbanuj
            </button>
            <button
              onClick={handleUnbanUsers}
              disabled={banLoading}
              className="flex items-center gap-2 px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              <FaUndo className="w-3.5 h-3.5" />
              Odbanuj
            </button>
            <button
              onClick={() => setSelectedUsers([])}
              className="px-3 py-1.5 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 text-sm transition-colors"
            >
              Wyczysc
            </button>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-dark-700 bg-gray-50 dark:bg-dark-800/50">
                <th className="w-10 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selectedUsers.length > 0 && selectedUsers.length === users.filter(u => u.discordId !== user.discordId).length}
                    onChange={handleSelectAll}
                    className="w-4 h-4 rounded border-gray-300 dark:border-dark-600 text-primary-500 focus:ring-primary-500"
                  />
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                  {t('adminUsers.user') || 'Uzytkownik'}
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                  Discord ID
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                  {t('adminUsers.role') || 'Rola'}
                </th>
                <th
                  className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase cursor-pointer hover:text-gray-700 dark:hover:text-gray-200 select-none"
                  onClick={() => handleSort('last_login')}
                >
                  <span className="flex items-center gap-1">
                    {t('adminUsers.lastLogin') || 'Ostatnie logowanie'}
                    <SortIcon col="last_login" />
                  </span>
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                  {t('adminUsers.licenses') || 'Licencje'}
                </th>
                <th
                  className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase cursor-pointer hover:text-gray-700 dark:hover:text-gray-200 select-none"
                  onClick={() => handleSort('created_at')}
                >
                  <span className="flex items-center gap-1">
                    {t('adminUsers.createdAt') || 'Utworzony'}
                    <SortIcon col="created_at" />
                  </span>
                </th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                  {t('adminUsers.actions') || 'Akcje'}
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-gray-100 dark:border-dark-700/50">
                    <td colSpan={8} className="px-4 py-4">
                      <div className="h-4 bg-gray-200 dark:bg-dark-700 rounded animate-pulse"></div>
                    </td>
                  </tr>
                ))
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-gray-400 dark:text-gray-500">
                    {t('adminUsers.noUsers') || 'Nie znaleziono uzytkownikow'}
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className={`border-b border-gray-100 dark:border-dark-700/50 hover:bg-gray-50 dark:hover:bg-dark-800/30 transition-colors ${u.isBanned ? 'bg-red-50 dark:bg-red-900/10' : ''}`}>
                    <td className="px-4 py-3">
                      {u.discordId !== user.discordId && (
                        <input
                          type="checkbox"
                          checked={selectedUsers.includes(u.id)}
                          onChange={() => handleSelectUser(u.id)}
                          className="w-4 h-4 rounded border-gray-300 dark:border-dark-600 text-primary-500 focus:ring-primary-500"
                        />
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <img
                            src={u.avatar
                              ? `https://cdn.discordapp.com/avatars/${u.discordId}/${u.avatar}.png?size=32`
                              : 'https://cdn.discordapp.com/embed/avatars/0.png'
                            }
                            alt=""
                            className={`w-8 h-8 rounded-full ${u.isBanned ? 'opacity-50' : ''}`}
                          />
                          {u.isBanned && (
                            <FaBan className="absolute -top-1 -right-1 w-4 h-4 text-red-500" />
                          )}
                        </div>
                        <div>
                          <span className={`text-sm font-medium ${u.isBanned ? 'text-gray-400 dark:text-gray-500 line-through' : 'text-gray-800 dark:text-gray-200'}`}>
                            {u.username || 'Unknown'}
                          </span>
                          {u.isBanned && u.banReason && (
                            <p className="text-xs text-red-500 truncate max-w-[150px]" title={u.banReason}>
                              {u.banReason}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-mono text-gray-500 dark:text-gray-400">{u.discordId}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${
                        u.role === 'ADMIN'
                          ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                          : 'bg-gray-100 dark:bg-dark-600 text-gray-700 dark:text-gray-300'
                      }`}>
                        {u.role === 'ADMIN' ? <FaCrown className="w-3 h-3" /> : <FaUser className="w-3 h-3" />}
                        {u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                      {u.lastLogin
                        ? new Date(u.lastLogin).toLocaleDateString('pl-PL')
                        : '-'
                      }
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {u.licensesCount || 0}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                      {new Date(u.createdAt).toLocaleDateString('pl-PL')}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleViewDetails(u)}
                          className="p-1.5 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                          title={t('adminUsers.viewDetails') || 'Szczegoly'}
                        >
                          <FaEye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleRoleChange(u)}
                          className="p-1.5 text-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-colors"
                          title={t('adminUsers.changeRole') || 'Zmien role'}
                        >
                          <FaUserShield className="w-4 h-4" />
                        </button>
                        {u.discordId !== user.discordId && (
                          <button
                            onClick={() => setDeleteTarget(u)}
                            className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                            title={t('common.delete')}
                          >
                            <FaTrash className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-4">
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            onPageChange={setPage}
            totalItems={totalItems}
            itemsPerPage={limit}
          />
        </div>
      </div>

      {/* User Details Modal */}
      {showDetailsModal && (
        <Modal
          isOpen={showDetailsModal}
          onClose={() => { setShowDetailsModal(false); setUserDetails(null); setSelectedUser(null); }}
          title={`${selectedUser?.username || 'User'} - ${t('adminUsers.details') || 'Szczegoly'}`}
        >
          {detailsLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : userDetails ? (
            <div className="space-y-4">
              {/* User Info */}
              <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-dark-700/50 rounded-lg">
                <img
                  src={userDetails.avatar
                    ? `https://cdn.discordapp.com/avatars/${userDetails.discordId}/${userDetails.avatar}.png?size=64`
                    : 'https://cdn.discordapp.com/embed/avatars/0.png'
                  }
                  alt=""
                  className="w-14 h-14 rounded-full"
                />
                <div>
                  <p className="font-semibold text-gray-800 dark:text-white">{userDetails.username}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{userDetails.email || '-'}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 font-mono">{userDetails.discordId}</p>
                </div>
                <span className={`ml-auto px-3 py-1 rounded-full text-xs font-semibold ${
                  userDetails.role === 'ADMIN'
                    ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                    : 'bg-gray-100 dark:bg-dark-600 text-gray-700 dark:text-gray-300'
                }`}>
                  {userDetails.role}
                </span>
              </div>

              {/* Licenses */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  {t('adminUsers.userLicenses') || 'Licencje uzytkownika'} ({userDetails.createdLicenses?.length || 0})
                </h3>
                {userDetails.createdLicenses?.length > 0 ? (
                  <div className="space-y-2">
                    {userDetails.createdLicenses.map((lic) => (
                      <div key={lic.id} className="p-3 bg-gray-50 dark:bg-dark-700/50 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                              lic.tier === 'VIP' ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300' :
                              'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                            }`}>{lic.tier}</span>
                            <span className={`px-2 py-0.5 rounded text-xs ${
                              lic.isActive ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' :
                              'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                            }`}>{lic.isActive ? 'Active' : 'Inactive'}</span>
                          </div>
                          <span className="text-xs text-gray-400">
                            {lic.expiresAt ? new Date(lic.expiresAt).toLocaleDateString('pl-PL') : 'Lifetime'}
                          </span>
                        </div>
                        <p className="text-xs font-mono text-gray-500 dark:text-gray-400 mt-1 break-all">{lic.licenseKey}</p>
                        {/* Guilds using this license */}
                        {lic.guilds?.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {lic.guilds.map((g) => (
                              <span key={g.guildId} className="text-xs px-2 py-0.5 bg-dark-600 text-gray-300 rounded">
                                {g.guildName || g.guildId}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 dark:text-gray-500 py-2">
                    {t('adminUsers.noLicenses') || 'Brak licencji'}
                  </p>
                )}
              </div>
            </div>
          ) : null}
        </Modal>
      )}

      {/* Delete Confirmation */}
      {deleteTarget && (
        <ConfirmDialog
          isOpen={!!deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onConfirm={handleDeleteUser}
          title={t('adminUsers.deleteConfirmTitle') || 'Usun uzytkownika'}
          message={`${t('adminUsers.deleteConfirmMessage') || 'Czy na pewno chcesz usunac uzytkownika'} ${deleteTarget.username}?`}
          confirmText={t('common.delete')}
          danger
        />
      )}

      {/* Ban Modal */}
      {showBanModal && (
        <Modal
          isOpen={showBanModal}
          onClose={() => { setShowBanModal(false); setBanReason(''); }}
          title={`Zbanuj ${selectedUsers.length} uzytkownikow`}
        >
          <div className="space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Zbanowani uzytkownicy nie beda mogli korzystac z systemu. Ta akcja jest odwracalna.
            </p>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Powod bana (opcjonalnie)
              </label>
              <input
                type="text"
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
                placeholder="np. Naruszenie regulaminu"
                maxLength={255}
                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-dark-700 border border-gray-200 dark:border-dark-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => { setShowBanModal(false); setBanReason(''); }}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 text-sm font-medium transition-colors"
              >
                Anuluj
              </button>
              <button
                onClick={handleBanUsers}
                disabled={banLoading}
                className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                {banLoading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <FaBan className="w-4 h-4" />
                )}
                Zbanuj {selectedUsers.length} uzytkownikow
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
