import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { FaServer, FaUsers, FaCrown, FaSearch, FaExternalLinkAlt, FaSort, FaSortUp, FaSortDown } from 'react-icons/fa';
import { adminService } from '../../services/api.service';
import { SkeletonTable } from '../../components/ui';
import { useToast } from '../../contexts/ToastContext';
import { useTranslation } from '../../contexts/LanguageContext';
import { GlassCard } from '../../components/ui/GlassCard';
import { GlassStatCard } from '../../components/ui/GlassStatCard';
import { cn } from '../../lib/utils';

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

export default function AdminServers() {
  const { user } = useAuth();
  const toast = useToast();
  const { t } = useTranslation();
  const [servers, setServers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('memberCount');
  const [sortDir, setSortDir] = useState('desc');

  useEffect(() => {
    fetchServers();
  }, []);

  const fetchServers = async () => {
    try {
      const response = await adminService.getServers();
      setServers(response.data.data || []);
    } catch (error) {
      toast.error(t('adminServers.fetchError'));
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="w-48 h-8 bg-white/5 rounded animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[1,2,3].map(i => <div key={i} className="p-6 h-20 animate-pulse bg-white/5 rounded-2xl" />)}
        </div>
        <GlassCard className="p-6"><SkeletonTable rows={6} /></GlassCard>
      </div>
    );
  }

  // Filter and sort
  const filteredServers = servers
    .filter(s => s.name?.toLowerCase().includes(search.toLowerCase()) || s.id?.includes(search))
    .sort((a, b) => {
      let aVal = a[sortBy] || 0;
      let bVal = b[sortBy] || 0;
      if (typeof aVal === 'string') aVal = aVal.toLowerCase();
      if (typeof bVal === 'string') bVal = bVal.toLowerCase();
      if (sortDir === 'asc') return aVal > bVal ? 1 : -1;
      return aVal < bVal ? 1 : -1;
    });

  const toggleSort = (field) => {
    if (sortBy === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortDir('desc');
    }
  };

  const SortIcon = ({ field }) => {
    if (sortBy !== field) return <FaSort className="text-gray-400" />;
    return sortDir === 'asc' ? <FaSortUp className="text-blue-500" /> : <FaSortDown className="text-blue-500" />;
  };

  const totalMembers = servers.reduce((sum, s) => sum + (s.memberCount || 0), 0);

  return (
    <motion.div
      variants={stagger}
      initial="hidden"
      animate="show"
    >
      {/* Header */}
      <motion.div variants={fadeUp} className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <FaServer className="text-purple-500" />
            {t('adminServers.title')}
          </h1>
          <p className="text-gray-400 mt-1">
            {t('adminServers.subtitle', { count: servers.length, members: totalMembers.toLocaleString() })}
          </p>
        </div>

        {/* Search */}
        <div className="relative w-full md:w-80">
          <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder={t('adminServers.searchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input w-full pl-10 pr-4 py-2.5"
          />
        </div>
      </motion.div>

      {/* Stats Cards */}
      <motion.div variants={fadeUp} className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <GlassStatCard
          title={t('adminServers.servers')}
          value={servers.length}
          icon={FaServer}
          color="purple"
        />
        <GlassStatCard
          title={t('adminServers.users')}
          value={totalMembers}
          icon={FaUsers}
          color="blue"
        />
        <GlassStatCard
          title={t('adminServers.avgPerServer')}
          value={Math.round(totalMembers / (servers.length || 1))}
          icon={FaCrown}
          color="green"
        />
      </motion.div>

      {/* Table */}
      <motion.div variants={fadeUp}>
        <GlassCard className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-white/5">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    {t('adminServers.server')}
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider cursor-pointer hover:text-gray-200"
                    onClick={() => toggleSort('memberCount')}
                  >
                    <div className="flex items-center gap-1">
                      {t('adminServers.members')}
                      <SortIcon field="memberCount" />
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    {t('adminServers.owner')}
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    {t('adminServers.actions')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredServers.map((server) => (
                  <tr key={server.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <img
                          src={server.icon
                            ? `https://cdn.discordapp.com/icons/${server.id}/${server.icon}.png?size=64`
                            : 'https://cdn.discordapp.com/embed/avatars/0.png'}
                          alt={server.name}
                          className="w-10 h-10 rounded-lg"
                        />
                        <div>
                          <p className="font-medium text-white">{server.name}</p>
                          <p className="text-xs text-gray-400">
                            {server.channels || '?'} {t('adminServers.channels')}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <FaUsers className="text-gray-400" />
                        <span className="text-white font-medium">
                          {server.memberCount?.toLocaleString() || '?'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <code className="text-sm text-gray-400 bg-white/5 px-2 py-1 rounded">
                        {server.id}
                      </code>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-400">
                        {server.ownerId || 'N/A'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <Link
                        to={`/servers/${server.id}`}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-purple-400 hover:bg-purple-900/20 rounded-lg transition-colors"
                      >
                        <FaExternalLinkAlt className="text-xs" />
                        {t('adminServers.dashboard')}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredServers.length === 0 && (
            <div className="text-center py-12">
              <FaServer className="text-4xl text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400">
                {search ? t('adminServers.noResults') : t('adminServers.noServers')}
              </p>
            </div>
          )}
        </GlassCard>
      </motion.div>
    </motion.div>
  );
}
