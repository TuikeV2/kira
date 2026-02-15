import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  FaUsers, FaUserShield, FaUserPlus, FaSearch, FaEye, FaTrash,
  FaCrown, FaUser, FaSortAmountDown, FaSortAmountUp, FaBan, FaUndo
} from 'react-icons/fa';
import { adminService } from '../../services/api.service';
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from '../../contexts/LanguageContext';
import { GlassStatCard } from '../../components/ui/GlassStatCard';
import { GlassCard } from '../../components/ui/GlassCard';
import { Modal, ConfirmDialog, Pagination } from '../../components/ui';
import { useToast } from '../../contexts/ToastContext';
import { cn } from '../../lib/utils';

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};
const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

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
    } catch {
      toast.error(t('common.fetchError') || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [page, search, roleFilter, sort, order]);

  const fetchStats = async () => {
    try {
      const response = await adminService.getUserStats();
      setStats(response.data.data);
    } catch {
      toast.error(t('common.fetchError') || 'Failed to load stats');
    }
  };

  useEffect(() => { fetchUsers(); }, [fetchUsers]);
  useEffect(() => { fetchStats(); }, []);

  const handleSearch = (e) => { setSearch(e.target.value); setPage(1); };

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
    } catch {
      toast.error(t('common.fetchError') || 'Failed to load user details');
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleRoleChange = async (u) => {
    const newRole = u.role === 'ADMIN' ? 'USER' : 'ADMIN';
    try {
      await adminService.updateUserRole(u.id, newRole);
      toast.success(t('adminUsers.roleUpdated') || `Role changed to ${newRole}`);
      fetchUsers();
      fetchStats();
    } catch {
      toast.error(t('adminUsers.roleUpdateFailed') || 'Failed to change role');
    }
  };

  const handleDeleteUser = async () => {
    if (!deleteTarget) return;
    try {
      await adminService.deleteUser(deleteTarget.id);
      toast.success(t('adminUsers.userDeleted') || 'User deleted');
      setDeleteTarget(null);
      fetchUsers();
      fetchStats();
    } catch (error) {
      toast.error(error.response?.data?.message || t('adminUsers.deleteFailed') || 'Failed to delete');
    }
  };

  const handleSelectUser = (userId) => {
    setSelectedUsers(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
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
      toast.success(`Banned ${selectedUsers.length} users`);
      setShowBanModal(false);
      setBanReason('');
      setSelectedUsers([]);
      fetchUsers();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to ban users');
    } finally {
      setBanLoading(false);
    }
  };

  const handleUnbanUsers = async () => {
    if (selectedUsers.length === 0) return;
    setBanLoading(true);
    try {
      await adminService.unbanUsers(selectedUsers);
      toast.success(`Unbanned ${selectedUsers.length} users`);
      setSelectedUsers([]);
      fetchUsers();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to unban users');
    } finally {
      setBanLoading(false);
    }
  };

  const SortIcon = ({ col }) => {
    if (sort !== col) return null;
    return order === 'DESC' ? <FaSortAmountDown className="w-3 h-3" /> : <FaSortAmountUp className="w-3 h-3" />;
  };

  return (
    <motion.div className="space-y-6" variants={stagger} initial="hidden" animate="show">
      {/* Header */}
      <motion.div variants={fadeUp}>
        <h1 className="text-2xl font-bold text-white">{t('adminUsers.title') || 'User Management'}</h1>
        <p className="text-gray-400 mt-1">{t('adminUsers.subtitle') || 'Browse and manage system users'}</p>
      </motion.div>

      {/* Stats */}
      <motion.div variants={fadeUp} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <GlassStatCard
          title={t('adminUsers.totalUsers') || 'Total users'}
          value={stats?.totalUsers || 0}
          icon={FaUsers}
          color="blue"
        />
        <GlassStatCard
          title={t('adminUsers.admins') || 'Admins'}
          value={stats?.adminCount || 0}
          icon={FaUserShield}
          color="purple"
        />
        <GlassStatCard
          title={t('adminUsers.newThisMonth') || 'New this month'}
          value={stats?.newUsersThisMonth || 0}
          icon={FaUserPlus}
          color="green"
        />
      </motion.div>

      {/* Filters */}
      <motion.div variants={fadeUp}>
        <GlassCard className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                type="text"
                placeholder={t('adminUsers.searchPlaceholder') || 'Search by name, Discord ID or email...'}
                value={search}
                onChange={handleSearch}
                className="input pl-10"
              />
            </div>
            <select
              value={roleFilter}
              onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
              className="select w-auto min-w-[140px]"
            >
              <option value="">{t('adminUsers.allRoles') || 'All roles'}</option>
              <option value="ADMIN">Admin</option>
              <option value="USER">User</option>
            </select>
          </div>

          {/* Bulk actions */}
          {selectedUsers.length > 0 && (
            <div className="flex items-center gap-3 mt-3 pt-3 border-t border-white/10">
              <span className="text-sm text-gray-400">
                Selected: <strong className="text-white">{selectedUsers.length}</strong>
              </span>
              <button
                onClick={() => setShowBanModal(true)}
                disabled={banLoading}
                className="btn-danger btn-sm"
              >
                <FaBan className="w-3.5 h-3.5" />
                Ban
              </button>
              <button
                onClick={handleUnbanUsers}
                disabled={banLoading}
                className="btn-success btn-sm"
              >
                <FaUndo className="w-3.5 h-3.5" />
                Unban
              </button>
              <button
                onClick={() => setSelectedUsers([])}
                className="text-sm text-gray-400 hover:text-white transition-colors"
              >
                Clear
              </button>
            </div>
          )}
        </GlassCard>
      </motion.div>

      {/* Table */}
      <motion.div variants={fadeUp}>
        <GlassCard className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10 bg-white/5">
                  <th className="w-10 px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedUsers.length > 0 && selectedUsers.length === users.filter(u => u.discordId !== user.discordId).length}
                      onChange={handleSelectAll}
                      className="w-4 h-4 rounded border-white/20 bg-white/5 text-primary-500 focus:ring-primary-500"
                    />
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase">
                    {t('adminUsers.user') || 'User'}
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase">
                    Discord ID
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase">
                    {t('adminUsers.role') || 'Role'}
                  </th>
                  <th
                    className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase cursor-pointer hover:text-gray-200 select-none"
                    onClick={() => handleSort('last_login')}
                  >
                    <span className="flex items-center gap-1">
                      {t('adminUsers.lastLogin') || 'Last login'}
                      <SortIcon col="last_login" />
                    </span>
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase">
                    {t('adminUsers.licenses') || 'Licenses'}
                  </th>
                  <th
                    className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase cursor-pointer hover:text-gray-200 select-none"
                    onClick={() => handleSort('created_at')}
                  >
                    <span className="flex items-center gap-1">
                      {t('adminUsers.createdAt') || 'Created'}
                      <SortIcon col="created_at" />
                    </span>
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-400 uppercase">
                    {t('adminUsers.actions') || 'Actions'}
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-b border-white/5">
                      <td colSpan={8} className="px-4 py-4">
                        <div className="h-4 bg-white/5 rounded animate-pulse" />
                      </td>
                    </tr>
                  ))
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-gray-500">
                      {t('adminUsers.noUsers') || 'No users found'}
                    </td>
                  </tr>
                ) : (
                  users.map((u) => (
                    <tr key={u.id} className={cn(
                      'border-b border-white/5 hover:bg-white/5 transition-colors',
                      u.isBanned && 'bg-red-500/5'
                    )}>
                      <td className="px-4 py-3">
                        {u.discordId !== user.discordId && (
                          <input
                            type="checkbox"
                            checked={selectedUsers.includes(u.id)}
                            onChange={() => handleSelectUser(u.id)}
                            className="w-4 h-4 rounded border-white/20 bg-white/5 text-primary-500 focus:ring-primary-500"
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
                              className={cn('w-8 h-8 rounded-full', u.isBanned && 'opacity-50')}
                            />
                            {u.isBanned && (
                              <FaBan className="absolute -top-1 -right-1 w-4 h-4 text-red-500" />
                            )}
                          </div>
                          <div>
                            <span className={cn(
                              'text-sm font-medium',
                              u.isBanned ? 'text-gray-500 line-through' : 'text-gray-200'
                            )}>
                              {u.username || 'Unknown'}
                            </span>
                            {u.isBanned && u.banReason && (
                              <p className="text-xs text-red-400 truncate max-w-[150px]" title={u.banReason}>
                                {u.banReason}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-mono text-gray-500">{u.discordId}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn(
                          'inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold',
                          u.role === 'ADMIN'
                            ? 'bg-purple-500/15 text-purple-300 ring-1 ring-purple-500/20'
                            : 'bg-white/10 text-gray-300 ring-1 ring-white/10'
                        )}>
                          {u.role === 'ADMIN' ? <FaCrown className="w-3 h-3" /> : <FaUser className="w-3 h-3" />}
                          {u.role}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-400">
                        {u.lastLogin ? new Date(u.lastLogin).toLocaleDateString('pl-PL') : '-'}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm font-medium text-gray-300">{u.licensesCount || 0}</span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-400">
                        {new Date(u.createdAt).toLocaleDateString('pl-PL')}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleViewDetails(u)}
                            className="p-1.5 text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors"
                            title={t('adminUsers.viewDetails') || 'Details'}
                          >
                            <FaEye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleRoleChange(u)}
                            className="p-1.5 text-purple-400 hover:bg-purple-500/10 rounded-lg transition-colors"
                            title={t('adminUsers.changeRole') || 'Change role'}
                          >
                            <FaUserShield className="w-4 h-4" />
                          </button>
                          {u.discordId !== user.discordId && (
                            <button
                              onClick={() => setDeleteTarget(u)}
                              className="p-1.5 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
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
        </GlassCard>
      </motion.div>

      {/* User Details Modal */}
      {showDetailsModal && (
        <Modal
          isOpen={showDetailsModal}
          onClose={() => { setShowDetailsModal(false); setUserDetails(null); setSelectedUser(null); }}
          title={`${selectedUser?.username || 'User'} - ${t('adminUsers.details') || 'Details'}`}
        >
          {detailsLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : userDetails ? (
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 bg-white/5 rounded-xl">
                <img
                  src={userDetails.avatar
                    ? `https://cdn.discordapp.com/avatars/${userDetails.discordId}/${userDetails.avatar}.png?size=64`
                    : 'https://cdn.discordapp.com/embed/avatars/0.png'
                  }
                  alt=""
                  className="w-14 h-14 rounded-full"
                />
                <div>
                  <p className="font-semibold text-white">{userDetails.username}</p>
                  <p className="text-sm text-gray-400">{userDetails.email || '-'}</p>
                  <p className="text-xs text-gray-500 font-mono">{userDetails.discordId}</p>
                </div>
                <span className={cn(
                  'ml-auto px-3 py-1 rounded-full text-xs font-semibold',
                  userDetails.role === 'ADMIN'
                    ? 'bg-purple-500/15 text-purple-300'
                    : 'bg-white/10 text-gray-300'
                )}>
                  {userDetails.role}
                </span>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-gray-300 mb-2">
                  {t('adminUsers.userLicenses') || 'User licenses'} ({userDetails.createdLicenses?.length || 0})
                </h3>
                {userDetails.createdLicenses?.length > 0 ? (
                  <div className="space-y-2">
                    {userDetails.createdLicenses.map((lic) => (
                      <div key={lic.id} className="p-3 bg-white/5 rounded-xl">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className={cn(
                              'px-2 py-0.5 rounded text-xs font-semibold',
                              lic.tier === 'VIP' ? 'bg-purple-500/15 text-purple-300' : 'bg-cyan-500/15 text-cyan-300'
                            )}>{lic.tier}</span>
                            <span className={cn(
                              'px-2 py-0.5 rounded text-xs',
                              lic.isActive ? 'bg-green-500/15 text-green-300' : 'bg-red-500/15 text-red-300'
                            )}>{lic.isActive ? 'Active' : 'Inactive'}</span>
                          </div>
                          <span className="text-xs text-gray-500">
                            {lic.expiresAt ? new Date(lic.expiresAt).toLocaleDateString('pl-PL') : 'Lifetime'}
                          </span>
                        </div>
                        <p className="text-xs font-mono text-gray-500 mt-1 break-all">{lic.licenseKey}</p>
                        {lic.guilds?.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {lic.guilds.map((g) => (
                              <span key={g.guildId} className="text-xs px-2 py-0.5 bg-white/10 text-gray-300 rounded">
                                {g.guildName || g.guildId}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 py-2">
                    {t('adminUsers.noLicenses') || 'No licenses'}
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
          title={t('adminUsers.deleteConfirmTitle') || 'Delete user'}
          message={`${t('adminUsers.deleteConfirmMessage') || 'Are you sure you want to delete user'} ${deleteTarget.username}?`}
          confirmText={t('common.delete')}
          danger
        />
      )}

      {/* Ban Modal */}
      {showBanModal && (
        <Modal
          isOpen={showBanModal}
          onClose={() => { setShowBanModal(false); setBanReason(''); }}
          title={`Ban ${selectedUsers.length} users`}
        >
          <div className="space-y-4">
            <p className="text-sm text-gray-400">
              Banned users will not be able to use the system. This action is reversible.
            </p>
            <div>
              <label className="label">Ban reason (optional)</label>
              <input
                type="text"
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
                placeholder="e.g. Terms violation"
                maxLength={255}
                className="input"
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => { setShowBanModal(false); setBanReason(''); }}
                className="btn-ghost"
              >
                Cancel
              </button>
              <button
                onClick={handleBanUsers}
                disabled={banLoading}
                className="btn-danger"
              >
                {banLoading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <FaBan className="w-4 h-4" />
                )}
                Ban {selectedUsers.length} users
              </button>
            </div>
          </div>
        </Modal>
      )}
    </motion.div>
  );
}
