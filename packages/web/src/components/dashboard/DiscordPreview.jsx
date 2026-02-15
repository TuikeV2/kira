import React from 'react';
import { FaHashtag, FaExternalLinkAlt } from 'react-icons/fa';
import botAvatar from '../../assets/img/avatar.png';

const DiscordPreview = ({
  message,
  image,
  channelName,
  titleText,
  embed,
  embedSections,
  useEmbed = true,
  imageOptions = {},
  buttons = []
}) => {
  const {
    fontFamily = 'sans-serif',
    fontSize = 40,
    fontWeight = 'bold',
    textColor = '#ffffff',
    useGradient = false,
    gradientColors = ['#ff512f', '#f09819'],
    gradientDirection = 'horizontal',
    showBorder = false,
    borderColor = '#ffffff',
    overlayOpacity = 0.4
  } = imageOptions;

  const processMessage = (msg) => {
    if (!msg) return '';
    return msg
      .replace(/\{user\}/g, '<span class="bg-[#5865F2]/30 text-[#5865F2] rounded px-1 cursor-pointer hover:bg-[#5865F2]/50">@User</span>')
      .replace(/\{username\}/g, '<strong>User</strong>')
      .replace(/\{server\}/g, '<strong>Server Name</strong>')
      .replace(/\{memberCount\}/g, '<strong>123</strong>');
  };

  const getTextStyle = () => {
    const baseStyle = {
      fontFamily,
      fontSize: `${Math.round(fontSize * 0.6)}px`,
      fontWeight,
      textShadow: '2px 2px 8px rgba(0,0,0,0.8)',
    };

    if (useGradient && gradientColors && gradientColors.length >= 2) {
      const direction = gradientDirection === 'vertical' ? 'to bottom' :
                       gradientDirection === 'diagonal' ? '45deg' : 'to right';
      return {
        ...baseStyle,
        background: `linear-gradient(${direction}, ${gradientColors.join(', ')})`,
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
      };
    }

    return {
      ...baseStyle,
      color: textColor,
    };
  };

  const getButtonStyle = (style, isLink) => {
    if (isLink) return 'bg-[#4e5058] hover:bg-[#6d6f78] text-white';

    const normalizedStyle = style?.toUpperCase?.() || style;
    const styles = {
      PRIMARY: 'bg-[#5865F2] hover:bg-[#4752C4] text-white',
      SECONDARY: 'bg-[#4e5058] hover:bg-[#6d6f78] text-white',
      SUCCESS: 'bg-[#248046] hover:bg-[#1a6334] text-white',
      DANGER: 'bg-[#da373c] hover:bg-[#a12d31] text-white',
      LINK: 'bg-[#4e5058] hover:bg-[#6d6f78] text-white'
    };
    return styles[normalizedStyle] || styles.PRIMARY;
  };

  const renderGeneratedImage = (section, idx) => (
    <div
      key={`img-${idx}`}
      className="relative rounded-lg overflow-hidden max-w-[520px] mb-2 mt-2"
      style={showBorder ? { border: `3px solid ${borderColor}` } : {}}
    >
      <img src={section.image} alt="Generated Header" className="block w-full h-32 object-cover" />
      <div
        className="absolute inset-0 flex items-center justify-center"
        style={{ backgroundColor: `rgba(0, 0, 0, ${overlayOpacity})` }}
      >
        <span
          className="px-4 text-center uppercase"
          style={getTextStyle()}
        >
          {section.titleText || 'Section Title'}
        </span>
      </div>
    </div>
  );

  const renderEmbed = (embedData) => {
    if (!embedData) return null;

    const hasContent = embedData.title || embedData.description || embedData.author ||
                       (embedData.fields && embedData.fields.length > 0) ||
                       embedData.image || embedData.thumbnail || embedData.footer;

    if (!hasContent) return null;

    return (
      <div
        className="mt-2 bg-[#2b2d31] border-l-4 rounded-r max-w-[520px] overflow-hidden flex"
        style={{ borderLeftColor: embedData.color || '#2b2d31' }}
      >
        <div className="flex-1 px-4 py-3">
          {/* Author */}
          {embedData.author && embedData.author.name && (
            <div className="flex items-center gap-2 mb-2">
              {(embedData.author.iconUrl || embedData.author.icon_url) && (
                <img
                  src={embedData.author.iconUrl || embedData.author.icon_url}
                  alt=""
                  className="w-6 h-6 rounded-full object-cover"
                  onError={(e) => e.target.style.display = 'none'}
                />
              )}
              {embedData.author.url ? (
                <a
                  href={embedData.author.url}
                  className="text-sm font-medium text-white hover:underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {embedData.author.name}
                </a>
              ) : (
                <span className="text-sm font-medium text-white">{embedData.author.name}</span>
              )}
            </div>
          )}

          {/* Title */}
          {embedData.title && (
            embedData.url ? (
              <a
                href={embedData.url}
                className="font-bold text-[#00a8fc] hover:underline text-base block mb-1"
                target="_blank"
                rel="noopener noreferrer"
              >
                {embedData.title}
              </a>
            ) : (
              <div className="font-bold text-white text-base mb-1">{embedData.title}</div>
            )
          )}

          {/* Description */}
          {embedData.description && (
            <div
              className="text-[#dbdee1] text-sm whitespace-pre-wrap mb-2"
              dangerouslySetInnerHTML={{ __html: processMessage(embedData.description) }}
            />
          )}

          {/* Fields */}
          {embedData.fields && embedData.fields.length > 0 && (
            <div className="grid gap-2 mt-2" style={{
              gridTemplateColumns: embedData.fields.some(f => f.inline)
                ? 'repeat(auto-fill, minmax(150px, 1fr))'
                : '1fr'
            }}>
              {embedData.fields.map((field, idx) => (
                <div
                  key={idx}
                  className={field.inline ? '' : 'col-span-full'}
                >
                  <div className="text-white font-semibold text-sm">{field.name}</div>
                  <div
                    className="text-[#dbdee1] text-sm whitespace-pre-wrap"
                    dangerouslySetInnerHTML={{ __html: processMessage(field.value) }}
                  />
                </div>
              ))}
            </div>
          )}

          {/* Embed Image */}
          {embedData.image && embedData.image.url && (
            <div className="mt-3">
              <img
                src={embedData.image.url}
                alt=""
                className="max-w-full rounded max-h-[300px] object-contain"
                onError={(e) => e.target.style.display = 'none'}
              />
            </div>
          )}

          {/* Footer */}
          {(embedData.footer || embedData.timestamp) && (
            <div className="flex items-center gap-2 text-xs text-gray-400 mt-3 pt-2 border-t border-gray-700">
              {embedData.footer && (embedData.footer.iconUrl || embedData.footer.icon_url) && (
                <img
                  src={embedData.footer.iconUrl || embedData.footer.icon_url}
                  alt=""
                  className="w-5 h-5 rounded-full object-cover"
                  onError={(e) => e.target.style.display = 'none'}
                />
              )}
              {embedData.footer && embedData.footer.text && (
                <span>{embedData.footer.text}</span>
              )}
              {embedData.footer && embedData.footer.text && embedData.timestamp && (
                <span className="mx-1">•</span>
              )}
              {embedData.timestamp && (
                <span>{new Date().toLocaleDateString('pl-PL', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}</span>
              )}
            </div>
          )}
        </div>

        {/* Thumbnail */}
        {embedData.thumbnail && embedData.thumbnail.url && (
          <div className="flex-shrink-0 p-3">
            <img
              src={embedData.thumbnail.url}
              alt=""
              className="w-20 h-20 rounded object-cover"
              onError={(e) => e.target.style.display = 'none'}
            />
          </div>
        )}
      </div>
    );
  };

  const renderButtons = () => {
    if (!buttons || buttons.length === 0) return null;

    return (
      <div className="mt-2 flex flex-wrap gap-2">
        {buttons.map((btn, idx) => {
          const isLink = btn.isLink || btn.style === 'LINK' || btn.style?.toUpperCase?.() === 'LINK';
          return (
            <button
              key={idx}
              className={`px-4 py-2 rounded text-sm font-medium transition-colors flex items-center gap-2 ${getButtonStyle(btn.style, isLink)}`}
              disabled
            >
              {btn.emoji && <span>{btn.emoji}</span>}
              {btn.label}
              {isLink && <FaExternalLinkAlt className="w-3 h-3" />}
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <div className="bg-[#313338] rounded-md overflow-hidden font-sans text-gray-100 p-4 shadow-lg border border-[#1e1f22]">
      <div className="text-xs font-bold text-gray-400 uppercase mb-4 tracking-wide flex items-center">
        <FaHashtag className="mr-1 text-gray-500" /> {channelName || 'general'}
      </div>

      <div className="flex items-start space-x-4 group hover:bg-[#2e3035] -mx-4 px-4 py-2 transition-colors">
        <img
          src={botAvatar}
          alt="KiraEvo"
          className="w-10 h-10 rounded-full flex-shrink-0 object-cover"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2">
            <span className="font-medium text-white hover:underline cursor-pointer">「🟣」 𝓚𝓲𝓻𝓪  𝓔𝓿𝓸𝓵𝓿𝓮𝓭</span>
            <span className="bg-[#5865F2] text-white text-[10px] px-1.5 rounded-[3px] py-[1px] flex items-center h-4">BOT</span>
            <span className="text-xs text-gray-400 ml-2">Today at {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          </div>

          {message && (
            <div
              className="text-[#dbdee1] mt-1 whitespace-pre-wrap leading-relaxed"
              dangerouslySetInnerHTML={{ __html: processMessage(message) }}
            />
          )}

          {image && (
            <div
              className="mt-3 relative rounded-lg overflow-hidden max-w-full h-auto max-h-64 inline-block"
              style={showBorder ? { border: `3px solid ${borderColor}` } : {}}
            >
              <img src={image} alt="Attachment" className="block max-w-full h-auto" />
              <div
                className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none"
                style={{ backgroundColor: `rgba(0, 0, 0, ${overlayOpacity})` }}
              >
                <span
                  className="px-2 rounded mb-8 uppercase"
                  style={getTextStyle()}
                >
                  {titleText || 'Title Text'}
                </span>
              </div>
            </div>
          )}

          {/* FULL EMBED with all features */}
          {embed && !embedSections && renderEmbed(embed)}

          {/* ADVANCED SECTIONS (Embed Mode) */}
          {embedSections && useEmbed && embedSections.map((section, idx) => (
            <div key={idx} className="mt-2">
              {section.image && renderGeneratedImage(section, idx)}

              {(section.content || (idx === embedSections.length - 1 && embed?.footer)) && (
                <div className="bg-[#2b2d31] border-l-4 rounded-r px-4 py-3 max-w-[520px]" style={{ borderLeftColor: embed?.color || '#3b82f6' }}>
                  {section.content && <div className="text-[#dbdee1] text-sm whitespace-pre-wrap">{section.content}</div>}
                  {idx === embedSections.length - 1 && embed?.footer && (
                    <div className="text-xs text-gray-400 mt-2 pt-2 border-t border-gray-700">
                      {typeof embed.footer === 'string' ? embed.footer : embed.footer.text}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}

          {/* ADVANCED SECTIONS (Regular Message Mode) */}
          {embedSections && !useEmbed && (
            <div className="mt-1">
              <div className="text-[#dbdee1] whitespace-pre-wrap leading-relaxed">
                {embedSections.map(s => s.content).join('\n\n')}
              </div>
              {embedSections.some(s => s.image) && (
                <div className="grid grid-cols-2 gap-2 mt-3 max-w-[520px]">
                  {embedSections.filter(s => s.image).map((section, idx) => (
                    <div key={idx} className={embedSections.filter(s => s.image).length === 1 ? "col-span-2" : ""}>
                      {renderGeneratedImage(section, idx)}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Buttons */}
          {renderButtons()}

        </div>
      </div>
    </div>
  );
};

export default DiscordPreview;
