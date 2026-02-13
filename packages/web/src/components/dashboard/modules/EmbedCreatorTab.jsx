import React, { useState } from 'react';
import { FaPaperPlane, FaImage, FaPlus, FaTrash, FaEdit, FaDownload, FaTimes } from 'react-icons/fa';
import { dashboardService } from '../../../services/api.service';
import DiscordPreview from '../DiscordPreview';
import { useTranslation } from '../../../contexts/LanguageContext';

export default function EmbedCreatorTab({ guildId, channels, setMessage }) {
  const { t } = useTranslation();
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [editMode, setEditMode] = useState(false);

  // Stan lokalny tylko dla tej zakładki
  const [embedData, setEmbedData] = useState({
    channelId: '',
    messageId: '',
    color: '#3b82f6',
    footer: '',
    useEmbed: true,
    baseImage: '',
    sections: [
        { titleText: '', content: '' }
    ]
  });

  const getChannelName = (id) => channels.find(c => c.id === id)?.name || 'unknown-channel';

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setEmbedData({ ...embedData, baseImage: reader.result });
      };
      reader.readAsDataURL(file);
    }
  };

  const addEmbedSection = () => {
      setEmbedData({
          ...embedData,
          sections: [...embedData.sections, { titleText: '', content: '' }]
      });
  };

  const removeEmbedSection = (index) => {
      const newSections = [...embedData.sections];
      newSections.splice(index, 1);
      setEmbedData({ ...embedData, sections: newSections });
  };

  const updateEmbedSection = (index, field, value) => {
      const newSections = [...embedData.sections];
      newSections[index][field] = value;
      setEmbedData({ ...embedData, sections: newSections });
  };

  const handleLoadMessage = async () => {
    if (!embedData.channelId || !embedData.messageId) {
      setMessage({ type: 'error', text: t('embedCreator.selectChannelAndId') });
      return;
    }
    setLoading(true);
    try {
      const res = await dashboardService.fetchMessage(guildId, embedData.channelId, embedData.messageId);
      const msg = res.data.data || res.data;

      const embeds = msg.embeds || [];
      const attachments = msg.attachments || [];

      if (embeds.length > 0) {
        // Parse embeds back into sections
        // The embed creator uses pairs: image embed + text embed per section
        // We try to reconstruct sections from the loaded embeds
        const sections = [];
        let i = 0;
        while (i < embeds.length) {
          const embed = embeds[i];
          const section = { titleText: '', content: '', loadedImageUrl: '' };

          // Check if this embed has an image (could be a section header)
          if (embed.image && embed.image.url) {
            section.loadedImageUrl = embed.image.url;
            // The title text was rendered into the image, we can't extract it
            // but we set the URL so user can see the current image
            section.titleText = embed.title || '';

            // Check if next embed is the text part of this section
            if (i + 1 < embeds.length && !embeds[i + 1].image?.url) {
              section.content = embeds[i + 1].description || '';
              i += 2;
            } else {
              section.content = embed.description || '';
              i++;
            }
          } else {
            // Text-only embed
            section.titleText = embed.title || '';
            section.content = embed.description || '';
            i++;
          }

          sections.push(section);
        }

        // Get color from first embed
        const firstColor = embeds[0]?.color || '#3b82f6';

        // Get footer from last embed
        const lastEmbed = embeds[embeds.length - 1];
        const footer = lastEmbed?.footer?.text || '';

        setEmbedData(prev => ({
          ...prev,
          color: firstColor,
          footer,
          useEmbed: true,
          sections: sections.length > 0 ? sections : [{ titleText: '', content: '' }]
        }));
        setEditMode(true);
        setMessage({ type: 'success', text: t('embedCreator.messageLoaded') });
      } else if (msg.content) {
        // Plain text message
        setEmbedData(prev => ({
          ...prev,
          useEmbed: false,
          sections: [{ titleText: '', content: msg.content }]
        }));
        setEditMode(true);
        setMessage({ type: 'success', text: t('embedCreator.textMessageLoaded') });
      } else {
        setMessage({ type: 'error', text: t('embedCreator.noEditableContent') });
      }
    } catch (error) {
      const errMsg = error.response?.status === 404
        ? t('embedCreator.messageNotFound')
        : t('embedCreator.loadFailed');
      setMessage({ type: 'error', text: errMsg });
    } finally {
      setLoading(false);
    }
  };

  const handleCancelEdit = () => {
    setEditMode(false);
    setEmbedData({
      channelId: embedData.channelId,
      messageId: '',
      color: '#3b82f6',
      footer: '',
      useEmbed: true,
      baseImage: '',
      sections: [{ titleText: '', content: '' }]
    });
    setMessage({ type: 'success', text: t('embedCreator.editCancelled') });
  };

  const handleSendEmbed = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
        await dashboardService.sendEmbed(guildId, {
            channelId: embedData.channelId,
            messageId: embedData.messageId || null,
            baseImage: embedData.baseImage,
            sections: embedData.sections,
            useEmbed: embedData.useEmbed,
            embed: {
                color: parseInt(embedData.color.replace('#', ''), 16),
                footer: { text: embedData.footer }
            }
        });
        setMessage({ type: 'success', text: embedData.messageId ? t('embedCreator.messageEdited') : t('embedCreator.messageSent') });
        if(!embedData.messageId) {
             setEmbedData({ ...embedData, sections: [{ titleText: '', content: '' }] });
        }
        if (editMode) {
            setEditMode(false);
        }
    } catch (error) {
        setMessage({ type: 'error', text: t('embedCreator.processFailed') });
    } finally {
        setSaving(false);
    }
  };

  return (
    <div className="flex flex-col xl:flex-row gap-6">
        <div className="flex-1">
            <form onSubmit={handleSendEmbed} className="card p-6 space-y-4">
                <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center mb-4">
                    {editMode
                      ? <><FaEdit className="mr-2 text-yellow-500" /> {t('embedCreator.editTitle')}</>
                      : <><FaPaperPlane className="mr-2 text-blue-500" /> {t('embedCreator.title')}</>
                    }
                </h2>

                {/* Channel selector first */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('embedCreator.destinationChannel')}</label>
                    <select value={embedData.channelId} onChange={e => setEmbedData({...embedData, channelId: e.target.value})} className="w-full border border-gray-300 dark:border-dark-600 rounded-lg p-2.5 bg-white dark:bg-dark-700 text-gray-900 dark:text-white" required>
                        <option value="">{t('embedCreator.selectChannel')}</option>
                        {channels.map(c => <option key={c.id} value={c.id}>#{c.name}</option>)}
                    </select>
                </div>

                {/* Edit existing message section */}
                <div className="bg-gray-50 dark:bg-dark-700 p-4 rounded-lg border border-gray-200 dark:border-dark-600">
                    <h3 className="font-bold text-gray-700 dark:text-gray-300 mb-1 flex items-center">
                        <FaEdit className="mr-2 text-yellow-500" /> {t('embedCreator.editExisting')}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                        {t('embedCreator.editExistingDesc')}
                    </p>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={embedData.messageId}
                            onChange={e => setEmbedData({...embedData, messageId: e.target.value})}
                            className="flex-1 border border-gray-300 dark:border-dark-600 rounded-lg p-2.5 bg-white dark:bg-dark-600 text-gray-900 dark:text-white text-sm"
                            placeholder={t('embedCreator.messageIdPlaceholder')}
                        />
                        <button
                            type="button"
                            onClick={handleLoadMessage}
                            disabled={loading || !embedData.channelId || !embedData.messageId}
                            className="px-4 py-2.5 bg-yellow-500 hover:bg-yellow-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-bold rounded-lg flex items-center text-sm whitespace-nowrap"
                        >
                            {loading ? t('embedCreator.loading') : <><FaDownload className="mr-1" /> {t('embedCreator.load')}</>}
                        </button>
                        {editMode && (
                            <button
                                type="button"
                                onClick={handleCancelEdit}
                                className="px-4 py-2.5 bg-red-500 hover:bg-red-600 text-white font-bold rounded-lg flex items-center text-sm whitespace-nowrap"
                            >
                                <FaTimes className="mr-1" /> {t('embedCreator.cancel')}
                            </button>
                        )}
                    </div>
                    {!embedData.channelId && embedData.messageId && (
                        <p className="text-xs text-yellow-500 mt-2">{t('embedCreator.selectChannelFirst')}</p>
                    )}
                </div>

                {editMode && (
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
                        <p className="text-sm text-yellow-700 dark:text-yellow-300 font-medium">
                            {t('embedCreator.editingMessage')} <code className="bg-yellow-100 dark:bg-yellow-900/40 px-1.5 py-0.5 rounded text-xs">{embedData.messageId}</code> &mdash; {t('embedCreator.editingDesc')}
                        </p>
                    </div>
                )}

                <div className="flex items-center bg-gray-50 dark:bg-dark-700 p-4 rounded-lg border border-gray-200 dark:border-dark-600 justify-between">
                        <div>
                            <h3 className="font-bold text-gray-700 dark:text-gray-300">{t('embedCreator.messageStyle')}</h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{t('embedCreator.messageStyleDesc')}</p>
                        </div>
                        <button
                        type="button"
                        onClick={() => setEmbedData({...embedData, useEmbed: !embedData.useEmbed})}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${embedData.useEmbed ? 'bg-blue-600' : 'bg-gray-300 dark:bg-dark-500'}`}
                        >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${embedData.useEmbed ? 'translate-x-6' : 'translate-x-1'}`} />
                        </button>
                </div>

                {embedData.useEmbed && (
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('embedCreator.embedColor')}</label>
                        <input type="color" value={embedData.color} onChange={e => setEmbedData({...embedData, color: e.target.value})} className="w-full h-11 border border-gray-300 dark:border-dark-600 rounded-lg p-1 bg-white dark:bg-dark-700" />
                    </div>
                )}

                <div className="border border-dashed border-gray-300 dark:border-dark-600 rounded-lg p-4 bg-gray-50 dark:bg-dark-700 text-center">
                    <label className="cursor-pointer block">
                        <div className="text-gray-500 dark:text-gray-400 flex flex-col items-center">
                            <FaImage className="text-2xl mb-2" />
                            <span className="text-sm font-medium">
                                {editMode ? t('embedCreator.uploadImageEdit') : t('embedCreator.uploadImage')}
                            </span>
                            <span className="text-xs text-gray-400 dark:text-gray-500 mt-1">{t('embedCreator.imageOverlay')}</span>
                        </div>
                        <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                    </label>
                    {embedData.baseImage && (
                        <div className="mt-2 text-xs text-green-600 dark:text-green-400 font-bold">{t('embedCreator.newImageLoaded')}</div>
                    )}
                    {editMode && !embedData.baseImage && embedData.sections.some(s => s.loadedImageUrl) && (
                        <div className="mt-2 text-xs text-blue-600 dark:text-blue-400 font-bold">
                            {t('embedCreator.currentImageReplace')}
                        </div>
                    )}
                </div>

                {/* Show loaded images from existing message */}
                {editMode && embedData.sections.some(s => s.loadedImageUrl) && !embedData.baseImage && (
                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                        <p className="text-xs font-bold text-blue-700 dark:text-blue-300 mb-2">{t('embedCreator.currentImages')}</p>
                        <div className="flex gap-2 flex-wrap">
                            {embedData.sections.filter(s => s.loadedImageUrl).map((s, i) => (
                                <img key={i} src={s.loadedImageUrl} alt={`Section ${i + 1}`} className="h-16 rounded border border-blue-300 dark:border-blue-700" />
                            ))}
                        </div>
                        <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">{t('embedCreator.uploadToReplace')}</p>
                    </div>
                )}

                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('embedCreator.messageSections')}</label>
                        <button type="button" onClick={addEmbedSection} className="text-sm text-blue-600 dark:text-blue-400 flex items-center font-bold hover:underline">
                            <FaPlus className="mr-1" /> {t('embedCreator.addSection')}
                        </button>
                    </div>

                    {embedData.sections.map((section, index) => (
                        <div key={index} className="border border-gray-200 dark:border-dark-600 rounded-lg p-4 bg-gray-50 dark:bg-dark-700 relative group">
                            <button
                                type="button"
                                onClick={() => removeEmbedSection(index)}
                                className="absolute top-2 right-2 text-red-400 hover:text-red-600 dark:text-red-500 dark:hover:text-red-400"
                            >
                                <FaTrash />
                            </button>

                            <div className="grid gap-3">
                                <div>
                                    <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">{t('embedCreator.imageHeaderText')}</label>
                                    <input
                                        type="text"
                                        value={section.titleText}
                                        onChange={(e) => updateEmbedSection(index, 'titleText', e.target.value)}
                                        className="w-full border border-gray-300 dark:border-dark-600 rounded p-2 text-sm mt-1 bg-white dark:bg-dark-600 text-gray-900 dark:text-white"
                                        placeholder={t('embedCreator.headerPlaceholder')}
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">{t('embedCreator.bodyContent')}</label>
                                    <textarea
                                        value={section.content}
                                        onChange={(e) => updateEmbedSection(index, 'content', e.target.value)}
                                        className="w-full border border-gray-300 dark:border-dark-600 rounded p-2 text-sm mt-1 bg-white dark:bg-dark-600 text-gray-900 dark:text-white"
                                        rows="3"
                                        placeholder={t('embedCreator.bodyPlaceholder')}
                                    ></textarea>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {embedData.useEmbed && (
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('embedCreator.footerText')}</label>
                        <input type="text" value={embedData.footer} onChange={e => setEmbedData({...embedData, footer: e.target.value})} className="w-full border border-gray-300 dark:border-dark-600 rounded-lg p-2.5 bg-white dark:bg-dark-700 text-gray-900 dark:text-white" placeholder={t('embedCreator.footerPlaceholder')} />
                    </div>
                )}

                <button type="submit" disabled={saving} className={`w-full ${editMode ? 'bg-yellow-500 hover:bg-yellow-600' : 'bg-blue-600 hover:bg-blue-700'} text-white font-bold py-2.5 rounded-lg flex justify-center items-center`}>
                    {saving ? t('embedCreator.processing') : editMode
                      ? <><FaEdit className="mr-2" /> {t('embedCreator.editMessage')}</>
                      : <><FaPaperPlane className="mr-2" /> {t('embedCreator.sendMessage')}</>
                    }
                </button>
            </form>
        </div>
        <div className="w-full xl:w-96">
            <div className="sticky top-6">
                    <h3 className="font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">{t('embedCreator.livePreview')}</h3>
                    <DiscordPreview
                        channelName={getChannelName(embedData.channelId)}
                        embed={{ color: embedData.color, footer: embedData.footer }}
                        useEmbed={embedData.useEmbed}
                        embedSections={embedData.sections.map(s => ({
                            ...s,
                            image: embedData.baseImage || s.loadedImageUrl || ''
                        }))}
                    />
            </div>
        </div>
    </div>
  );
}
