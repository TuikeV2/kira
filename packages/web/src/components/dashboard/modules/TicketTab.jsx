import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { ticketService } from '../../../services/api.service';
import { useToast } from '../../../contexts/ToastContext';
import {
  FaTicketAlt, FaCog, FaPalette, FaSave, FaPaperPlane, FaHashtag, FaUserShield,
  FaPlus, FaTrash, FaEdit, FaWpforms, FaTags, FaChevronDown, FaChevronUp,
  FaGripVertical, FaCheck, FaTimes
} from 'react-icons/fa';
import { useTranslation } from '../../../contexts/LanguageContext';

const TicketTab = () => {
  const { t } = useTranslation();
  const toast = useToast();
  const { guildId } = useParams();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [discordCategories, setDiscordCategories] = useState([]);
  const [channels, setChannels] = useState([]);
  const [roles, setRoles] = useState([]);

  const [config, setConfig] = useState({
    enabled: false,
    ticketCategoryId: '',
    supportRoleIds: [],
    channelNamePattern: 'ticket-{number}',
    logChannelId: '',
    panelChannelId: '',
    panelTitle: 'Centrum Pomocy',
    panelDescription: 'Kliknij przycisk ponizej aby otworzyc ticket.',
    categories: [],
    useCategorySelect: false
  });

  const [sendingPanel, setSendingPanel] = useState(false);
  const [panelMode, setPanelMode] = useState('single');

  // Category management state
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [categoryForm, setCategoryForm] = useState({
    name: '',
    description: '',
    emoji: '',
    color: '#5865F2',
    categoryId: '',
    supportRoleIds: []
  });

  // Form field management state
  const [expandedCategory, setExpandedCategory] = useState(null);
  const [showFieldModal, setShowFieldModal] = useState(false);
  const [editingCategoryForField, setEditingCategoryForField] = useState(null);
  const [fieldForm, setFieldForm] = useState({
    id: '',
    label: '',
    style: 'short',
    required: true,
    placeholder: '',
    minLength: '',
    maxLength: ''
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        const configRes = await ticketService.getConfig(guildId);
        const channelsRes = await ticketService.getChannels(guildId);
        const rolesRes = await ticketService.getRoles(guildId);

        const rawChannels = Array.isArray(channelsRes.data) ? channelsRes.data : (channelsRes.data.data || []);
        const rolesData = rolesRes.data?.data;
        const rawRoles = Array.isArray(rolesData) ? rolesData : (rolesData?.roles || []);
        const configData = configRes.data.data || configRes.data || {};

        const cats = rawChannels.filter(c => c.type === 4);
        setDiscordCategories(cats);

        const textChannels = rawChannels.filter(c => c.type === 0);
        setChannels(textChannels);

        const validRoles = rawRoles.filter(r => r.name !== '@everyone');
        setRoles(validRoles);

        setConfig({
          enabled: configData.enabled ?? false,
          ticketCategoryId: configData.ticketCategoryId || '',
          supportRoleIds: configData.supportRoleIds || [],
          channelNamePattern: configData.channelNamePattern || 'ticket-{number}',
          logChannelId: configData.logChannelId || '',
          panelChannelId: configData.panelChannelId || '',
          panelTitle: configData.panelTitle || 'Centrum Pomocy',
          panelDescription: configData.panelDescription || 'Kliknij przycisk ponizej aby otworzyc ticket.',
          categories: configData.categories || [],
          useCategorySelect: configData.useCategorySelect ?? false
        });

      } catch (error) {
        toast.error("Nie udalo sie zaladowac konfiguracji ticketow.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [guildId]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setConfig(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleRoleToggle = (roleId) => {
    setConfig(prev => {
      const newRoles = prev.supportRoleIds.includes(roleId)
        ? prev.supportRoleIds.filter(id => id !== roleId)
        : [...prev.supportRoleIds, roleId];
      return { ...prev, supportRoleIds: newRoles };
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await ticketService.updateConfig(guildId, config);
      toast.success("Ustawienia ticketow zapisane!");
    } catch (error) {
      toast.error(error.response?.data?.message || "Nie udalo sie zapisac ustawien.");
    } finally {
      setSaving(false);
    }
  };

  const handleSendPanel = async () => {
    if (!config.panelChannelId) {
      toast.error("Najpierw wybierz kanal dla panelu!");
      return;
    }

    setSendingPanel(true);
    try {
      await ticketService.sendPanel(guildId, config.panelChannelId, panelMode);
      toast.success("Panel ticketow zostal wyslany!");
    } catch (error) {
      toast.error(error.response?.data?.message || "Nie udalo sie wyslac panelu.");
    } finally {
      setSendingPanel(false);
    }
  };

  // ============ CATEGORY MANAGEMENT ============

  const openAddCategoryModal = () => {
    setEditingCategory(null);
    setCategoryForm({
      name: '',
      description: '',
      emoji: '',
      color: '#5865F2',
      categoryId: '',
      supportRoleIds: []
    });
    setShowCategoryModal(true);
  };

  const openEditCategoryModal = (category) => {
    setEditingCategory(category);
    setCategoryForm({
      name: category.name || '',
      description: category.description || '',
      emoji: category.emoji || '',
      color: category.color || '#5865F2',
      categoryId: category.categoryId || '',
      supportRoleIds: category.supportRoleIds || []
    });
    setShowCategoryModal(true);
  };

  const handleCategoryFormChange = (e) => {
    const { name, value } = e.target;
    setCategoryForm(prev => ({ ...prev, [name]: value }));
  };

  const handleCategoryRoleToggle = (roleId) => {
    setCategoryForm(prev => {
      const newRoles = prev.supportRoleIds.includes(roleId)
        ? prev.supportRoleIds.filter(id => id !== roleId)
        : [...prev.supportRoleIds, roleId];
      return { ...prev, supportRoleIds: newRoles };
    });
  };

  const handleSaveCategory = async () => {
    if (!categoryForm.name.trim()) {
      toast.error("Nazwa kategorii jest wymagana!");
      return;
    }

    try {
      if (editingCategory) {
        await ticketService.updateCategory(guildId, editingCategory.id, categoryForm);
        setConfig(prev => ({
          ...prev,
          categories: prev.categories.map(c =>
            c.id === editingCategory.id ? { ...c, ...categoryForm } : c
          )
        }));
        toast.success("Kategoria zaktualizowana!");
      } else {
        const res = await ticketService.addCategory(guildId, categoryForm);
        const newCat = res.data.data || res.data;
        setConfig(prev => ({
          ...prev,
          categories: [...prev.categories, newCat]
        }));
        toast.success("Kategoria dodana!");
      }
      setShowCategoryModal(false);
    } catch (error) {
      toast.error(error.response?.data?.message || "Nie udalo sie zapisac kategorii.");
    }
  };

  const handleDeleteCategory = async (categoryId) => {
    if (!confirm("Czy na pewno chcesz usunac te kategorie?")) return;

    try {
      await ticketService.deleteCategory(guildId, categoryId);
      setConfig(prev => ({
        ...prev,
        categories: prev.categories.filter(c => c.id !== categoryId)
      }));
      toast.success("Kategoria usunieta!");
    } catch (error) {
      toast.error(error.response?.data?.message || "Nie udalo sie usunac kategorii.");
    }
  };

  // ============ FORM FIELD MANAGEMENT ============

  const toggleFormEnabled = async (category) => {
    try {
      const newEnabled = !category.form?.enabled;
      await ticketService.updateCategoryForm(guildId, category.id, { enabled: newEnabled });
      setConfig(prev => ({
        ...prev,
        categories: prev.categories.map(c =>
          c.id === category.id
            ? { ...c, form: { ...c.form, enabled: newEnabled } }
            : c
        )
      }));
      toast.success(newEnabled ? "Formularz wlaczony!" : "Formularz wylaczony!");
    } catch (error) {
      toast.error("Nie udalo sie zaktualizowac formularza.");
    }
  };

  const openAddFieldModal = (category) => {
    setEditingCategoryForField(category);
    setFieldForm({
      id: '',
      label: '',
      style: 'short',
      required: true,
      placeholder: '',
      minLength: '',
      maxLength: ''
    });
    setShowFieldModal(true);
  };

  const handleFieldFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFieldForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSaveField = async () => {
    if (!fieldForm.id.trim() || !fieldForm.label.trim()) {
      toast.error("ID i etykieta pola sa wymagane!");
      return;
    }

    try {
      const fieldData = {
        id: fieldForm.id.toLowerCase().replace(/[^a-z0-9_]/g, '_'),
        label: fieldForm.label,
        style: fieldForm.style,
        required: fieldForm.required,
        placeholder: fieldForm.placeholder || null,
        minLength: fieldForm.minLength ? parseInt(fieldForm.minLength) : null,
        maxLength: fieldForm.maxLength ? parseInt(fieldForm.maxLength) : null
      };

      await ticketService.addFormField(guildId, editingCategoryForField.id, fieldData);

      setConfig(prev => ({
        ...prev,
        categories: prev.categories.map(c =>
          c.id === editingCategoryForField.id
            ? {
                ...c,
                form: {
                  ...c.form,
                  fields: [...(c.form?.fields || []), fieldData]
                }
              }
            : c
        )
      }));

      toast.success("Pole dodane!");
      setShowFieldModal(false);
    } catch (error) {
      toast.error(error.response?.data?.message || "Nie udalo sie dodac pola.");
    }
  };

  const handleDeleteField = async (category, fieldId) => {
    try {
      await ticketService.deleteFormField(guildId, category.id, fieldId);
      setConfig(prev => ({
        ...prev,
        categories: prev.categories.map(c =>
          c.id === category.id
            ? {
                ...c,
                form: {
                  ...c.form,
                  fields: c.form.fields.filter(f => f.id !== fieldId)
                }
              }
            : c
        )
      }));
      toast.success("Pole usuniete!");
    } catch (error) {
      toast.error("Nie udalo sie usunac pola.");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-gray-500 dark:text-gray-400">Ladowanie modulu ticketow...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <div className="card p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary-50 dark:bg-primary-900/20">
              <FaTicketAlt className="w-5 h-5 text-primary-600 dark:text-primary-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">System Ticketow</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Skonfiguruj automatyczny system wsparcia
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className={`text-sm font-semibold ${config.enabled ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}`}>
              {config.enabled ? 'WLACZONY' : 'WYLACZONY'}
            </span>
            <button
              type="button"
              onClick={() => setConfig({ ...config, enabled: !config.enabled })}
              className={`
                relative inline-flex h-6 w-11 items-center rounded-full
                transition-colors duration-200
                focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:focus:ring-offset-dark-800
                ${config.enabled ? 'bg-green-500' : 'bg-gray-300 dark:bg-dark-600'}
              `}
              role="switch"
              aria-checked={config.enabled}
            >
              <span
                className={`
                  inline-block h-4 w-4 transform rounded-full bg-white shadow-md
                  transition-transform duration-200
                  ${config.enabled ? 'translate-x-6' : 'translate-x-1'}
                `}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Categories Section */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <FaTags className="w-4 h-4 text-purple-500" />
            <h3 className="font-semibold text-gray-900 dark:text-white">Kategorie Ticketow</h3>
          </div>
          <button
            onClick={openAddCategoryModal}
            className="btn-primary text-sm py-1.5 px-3"
          >
            <FaPlus className="w-3 h-3" />
            Dodaj Kategorie
          </button>
        </div>

        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Kategorie pozwalaja uzytkownikam wybrac typ zgloszenia. Kazda kategoria moze miec wlasny formularz.
        </p>

        {config.categories.length === 0 ? (
          <div className="text-center py-8 text-gray-400 dark:text-gray-500">
            <FaTags className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Brak kategorii. Dodaj pierwsza kategorie aby wlaczyc wybor typu zgloszenia.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {config.categories.map((category) => (
              <div
                key={category.id}
                className="border border-gray-200 dark:border-dark-600 rounded-lg overflow-hidden"
              >
                {/* Category Header */}
                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-dark-700/50">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{category.emoji || '📨'}</span>
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-white">{category.name}</h4>
                      {category.description && (
                        <p className="text-sm text-gray-500 dark:text-gray-400">{category.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setExpandedCategory(expandedCategory === category.id ? null : category.id)}
                      className="p-2 text-gray-400 hover:text-primary-500 transition-colors"
                      title="Pokaz formularz"
                    >
                      <FaWpforms className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => openEditCategoryModal(category)}
                      className="p-2 text-gray-400 hover:text-blue-500 transition-colors"
                      title="Edytuj"
                    >
                      <FaEdit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteCategory(category.id)}
                      className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                      title="Usun"
                    >
                      <FaTrash className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Expanded Form Section */}
                {expandedCategory === category.id && (
                  <div className="p-4 border-t border-gray-200 dark:border-dark-600">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Formularz:</span>
                        <button
                          onClick={() => toggleFormEnabled(category)}
                          className={`
                            relative inline-flex h-5 w-9 items-center rounded-full
                            transition-colors duration-200
                            ${category.form?.enabled ? 'bg-green-500' : 'bg-gray-300 dark:bg-dark-600'}
                          `}
                        >
                          <span
                            className={`
                              inline-block h-3 w-3 transform rounded-full bg-white shadow
                              transition-transform duration-200
                              ${category.form?.enabled ? 'translate-x-5' : 'translate-x-1'}
                            `}
                          />
                        </button>
                        <span className="text-xs text-gray-500">
                          {category.form?.enabled ? 'Wlaczony' : 'Wylaczony'}
                        </span>
                      </div>
                      {category.form?.enabled && (category.form?.fields?.length || 0) < 5 && (
                        <button
                          onClick={() => openAddFieldModal(category)}
                          className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
                        >
                          <FaPlus className="w-3 h-3" />
                          Dodaj pole
                        </button>
                      )}
                    </div>

                    {category.form?.enabled && (
                      <div className="space-y-2">
                        {(!category.form?.fields || category.form.fields.length === 0) ? (
                          <p className="text-sm text-gray-400 text-center py-4">
                            Brak pol formularza. Dodaj pola aby zbierac informacje od uzytkownikow.
                          </p>
                        ) : (
                          category.form.fields.map((field) => (
                            <div
                              key={field.id}
                              className="flex items-center justify-between p-3 bg-gray-100 dark:bg-dark-600 rounded-lg"
                            >
                              <div className="flex items-center gap-3">
                                <FaGripVertical className="w-3 h-3 text-gray-400" />
                                <div>
                                  <span className="font-medium text-gray-900 dark:text-white">{field.label}</span>
                                  <div className="flex items-center gap-2 text-xs text-gray-500">
                                    <span className="px-1.5 py-0.5 bg-gray-200 dark:bg-dark-500 rounded">
                                      {field.style === 'short' ? 'Krotki tekst' : 'Paragraf'}
                                    </span>
                                    {field.required && (
                                      <span className="text-red-500">Wymagane</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <button
                                onClick={() => handleDeleteField(category, field.id)}
                                className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                              >
                                <FaTrash className="w-3 h-3" />
                              </button>
                            </div>
                          ))
                        )}
                        {category.form?.fields?.length >= 5 && (
                          <p className="text-xs text-amber-600 text-center">
                            Osiagnieto limit 5 pol (maksimum Discord)
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Configuration Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column */}
        <div className="space-y-6">
          <div className="card p-6">
            <div className="flex items-center gap-2 mb-4">
              <FaCog className="w-4 h-4 text-gray-400" />
              <h3 className="font-semibold text-gray-900 dark:text-white">Ustawienia Ogolne</h3>
            </div>

            <div className="space-y-4">
              <div>
                <label className="label">Kategoria Ticketow (Discord)</label>
                <select
                  name="ticketCategoryId"
                  value={config.ticketCategoryId}
                  onChange={handleChange}
                  className="select"
                >
                  <option value="">Wybierz kategorie...</option>
                  {discordCategories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Nowe kanaly ticketow beda tworzone tutaj
                </p>
              </div>

              <div>
                <label className="label">Wzor Nazwy Kanalu</label>
                <input
                  type="text"
                  name="channelNamePattern"
                  value={config.channelNamePattern}
                  onChange={handleChange}
                  className="input font-mono"
                  placeholder="ticket-{number}"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Uzyj {'{number}'}, {'{username}'} lub {'{category}'} jako zmiennych
                </p>
              </div>

              <div>
                <label className="label">
                  <FaHashtag className="inline w-3 h-3 mr-1" />
                  Kanal Logow
                </label>
                <select
                  name="logChannelId"
                  value={config.logChannelId}
                  onChange={handleChange}
                  className="select"
                >
                  <option value="">Wybierz kanal...</option>
                  {channels.map(ch => (
                    <option key={ch.id} value={ch.id}>#{ch.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="card p-6">
            <div className="flex items-center gap-2 mb-4">
              <FaUserShield className="w-4 h-4 text-gray-400" />
              <h3 className="font-semibold text-gray-900 dark:text-white">Role Wsparcia (Domyslne)</h3>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
              Te role beda mialy dostep do wszystkich ticketow (mozna nadpisac per kategoria)
            </p>

            <div className="max-h-48 overflow-y-auto space-y-2 p-3 bg-gray-50 dark:bg-dark-700/50 rounded-lg border border-gray-200 dark:border-dark-600">
              {roles.length === 0 ? (
                <p className="text-sm text-gray-400">Brak dostepnych rol</p>
              ) : (
                roles.map(role => (
                  <label
                    key={role.id}
                    className="flex items-center gap-3 p-2 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-dark-600 transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={config.supportRoleIds.includes(role.id)}
                      onChange={() => handleRoleToggle(role.id)}
                      className="w-4 h-4 rounded text-primary-600 focus:ring-primary-500 border-gray-300 dark:border-dark-500"
                    />
                    <span
                      className="text-sm font-medium"
                      style={{ color: role.color ? `#${role.color.toString(16).padStart(6, '0')}` : undefined }}
                    >
                      {role.name}
                    </span>
                  </label>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          <div className="card p-6">
            <div className="flex items-center gap-2 mb-4">
              <FaPalette className="w-4 h-4 text-purple-500" />
              <h3 className="font-semibold text-gray-900 dark:text-white">Wyglad Panelu</h3>
            </div>

            <div className="space-y-4">
              <div>
                <label className="label">Tytul Panelu</label>
                <input
                  type="text"
                  name="panelTitle"
                  value={config.panelTitle}
                  onChange={handleChange}
                  className="input"
                  placeholder="Centrum Pomocy"
                />
              </div>

              <div>
                <label className="label">Opis Panelu</label>
                <textarea
                  name="panelDescription"
                  value={config.panelDescription}
                  onChange={handleChange}
                  rows="4"
                  className="input resize-y min-h-[100px]"
                  placeholder="Kliknij przycisk ponizej aby otworzyc ticket..."
                />
              </div>

              <div className="pt-4 border-t border-gray-200 dark:border-dark-700">
                <label className="label">Tryb Panelu</label>
                <select
                  value={panelMode}
                  onChange={(e) => setPanelMode(e.target.value)}
                  className="select"
                >
                  <option value="single">Jeden przycisk (wybor kategorii po kliknieciu)</option>
                  <option value="buttons">Osobny przycisk dla kazdej kategorii</option>
                  <option value="select">Lista rozwijana (select menu)</option>
                </select>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {config.categories.length === 0
                    ? 'Dodaj kategorie aby wlaczyc tryby z wieloma opcjami'
                    : `${config.categories.length} kategorii dostepnych`
                  }
                </p>
              </div>

              <div className="pt-4 border-t border-gray-200 dark:border-dark-700">
                <label className="label">
                  <FaHashtag className="inline w-3 h-3 mr-1" />
                  Kanal Panelu
                </label>
                <select
                  name="panelChannelId"
                  value={config.panelChannelId}
                  onChange={handleChange}
                  className="select"
                >
                  <option value="">Wybierz kanal...</option>
                  {channels.map(ch => (
                    <option key={ch.id} value={ch.id}>#{ch.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row justify-end gap-3">
        <button
          onClick={handleSendPanel}
          disabled={sendingPanel || !config.panelChannelId}
          className={`btn-secondary ${(!config.panelChannelId || sendingPanel) && 'opacity-50 cursor-not-allowed'}`}
        >
          {sendingPanel ? (
            <>
              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
              Wysylanie...
            </>
          ) : (
            <>
              <FaPaperPlane className="w-4 h-4" />
              Wyslij Panel
            </>
          )}
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="btn-primary"
        >
          {saving ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              Zapisywanie...
            </>
          ) : (
            <>
              <FaSave className="w-4 h-4" />
              Zapisz Konfiguracje
            </>
          )}
        </button>
      </div>

      {/* Category Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-dark-800 rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 dark:border-dark-700">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                {editingCategory ? 'Edytuj Kategorie' : 'Dodaj Kategorie'}
              </h3>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="label">Nazwa *</label>
                <input
                  type="text"
                  name="name"
                  value={categoryForm.name}
                  onChange={handleCategoryFormChange}
                  className="input"
                  placeholder="np. Support, Report, Aplikacja"
                />
              </div>
              <div>
                <label className="label">Opis</label>
                <input
                  type="text"
                  name="description"
                  value={categoryForm.description}
                  onChange={handleCategoryFormChange}
                  className="input"
                  placeholder="Krotki opis kategorii"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Emoji</label>
                  <input
                    type="text"
                    name="emoji"
                    value={categoryForm.emoji}
                    onChange={handleCategoryFormChange}
                    className="input"
                    placeholder="np. lub :custom:"
                  />
                </div>
                <div>
                  <label className="label">Kolor</label>
                  <input
                    type="color"
                    name="color"
                    value={categoryForm.color}
                    onChange={handleCategoryFormChange}
                    className="input h-10 p-1"
                  />
                </div>
              </div>
              <div>
                <label className="label">Kategoria Discord (opcjonalnie)</label>
                <select
                  name="categoryId"
                  value={categoryForm.categoryId}
                  onChange={handleCategoryFormChange}
                  className="select"
                >
                  <option value="">Uzyj domyslnej</option>
                  {discordCategories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Role wsparcia (opcjonalnie)</label>
                <div className="max-h-32 overflow-y-auto space-y-1 p-2 bg-gray-50 dark:bg-dark-700/50 rounded-lg border border-gray-200 dark:border-dark-600">
                  {roles.slice(0, 10).map(role => (
                    <label
                      key={role.id}
                      className="flex items-center gap-2 p-1.5 rounded cursor-pointer hover:bg-gray-100 dark:hover:bg-dark-600"
                    >
                      <input
                        type="checkbox"
                        checked={categoryForm.supportRoleIds.includes(role.id)}
                        onChange={() => handleCategoryRoleToggle(role.id)}
                        className="w-3.5 h-3.5 rounded text-primary-600"
                      />
                      <span className="text-sm" style={{ color: role.color ? `#${role.color.toString(16).padStart(6, '0')}` : undefined }}>
                        {role.name}
                      </span>
                    </label>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-1">Pozostaw puste aby uzyc domyslnych</p>
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 dark:border-dark-700 flex justify-end gap-3">
              <button
                onClick={() => setShowCategoryModal(false)}
                className="btn-secondary"
              >
                Anuluj
              </button>
              <button
                onClick={handleSaveCategory}
                className="btn-primary"
              >
                {editingCategory ? 'Zapisz' : 'Dodaj'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Field Modal */}
      {showFieldModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-dark-800 rounded-xl shadow-xl max-w-md w-full">
            <div className="p-6 border-b border-gray-200 dark:border-dark-700">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                Dodaj Pole Formularza
              </h3>
              <p className="text-sm text-gray-500">
                Kategoria: {editingCategoryForField?.name}
              </p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="label">ID Pola *</label>
                <input
                  type="text"
                  name="id"
                  value={fieldForm.id}
                  onChange={handleFieldFormChange}
                  className="input font-mono"
                  placeholder="np. temat, opis, nick"
                />
                <p className="text-xs text-gray-500 mt-1">Unikalne ID (male litery, bez spacji)</p>
              </div>
              <div>
                <label className="label">Etykieta *</label>
                <input
                  type="text"
                  name="label"
                  value={fieldForm.label}
                  onChange={handleFieldFormChange}
                  className="input"
                  placeholder="np. Temat zgloszenia"
                />
              </div>
              <div>
                <label className="label">Typ pola</label>
                <select
                  name="style"
                  value={fieldForm.style}
                  onChange={handleFieldFormChange}
                  className="select"
                >
                  <option value="short">Krotki tekst (1 linia)</option>
                  <option value="paragraph">Paragraf (wiele linii)</option>
                </select>
              </div>
              <div>
                <label className="label">Placeholder</label>
                <input
                  type="text"
                  name="placeholder"
                  value={fieldForm.placeholder}
                  onChange={handleFieldFormChange}
                  className="input"
                  placeholder="Tekst podpowiedzi..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Min. dlugosc</label>
                  <input
                    type="number"
                    name="minLength"
                    value={fieldForm.minLength}
                    onChange={handleFieldFormChange}
                    className="input"
                    min="0"
                    max="4000"
                  />
                </div>
                <div>
                  <label className="label">Max. dlugosc</label>
                  <input
                    type="number"
                    name="maxLength"
                    value={fieldForm.maxLength}
                    onChange={handleFieldFormChange}
                    className="input"
                    min="1"
                    max="4000"
                  />
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  name="required"
                  checked={fieldForm.required}
                  onChange={handleFieldFormChange}
                  className="w-4 h-4 rounded text-primary-600"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Pole wymagane</span>
              </label>
            </div>
            <div className="p-6 border-t border-gray-200 dark:border-dark-700 flex justify-end gap-3">
              <button
                onClick={() => setShowFieldModal(false)}
                className="btn-secondary"
              >
                Anuluj
              </button>
              <button
                onClick={handleSaveField}
                className="btn-primary"
              >
                Dodaj Pole
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TicketTab;
