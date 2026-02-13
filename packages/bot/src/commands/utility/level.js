const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const { models } = require('@kira/shared');
const { createErrorEmbed } = require('../../utils/embedBuilder');
const logger = require('../../utils/logger');
const { createCanvas, loadImage } = require('@napi-rs/canvas');

// Funkcja generująca obrazek z informacjami o poziomie
async function generateLevelCard(user, userLevel, rank, guildName) {
  const canvas = createCanvas(800, 200);
  const context = canvas.getContext('2d');

  // Tło - gradient
  const gradient = context.createLinearGradient(0, 0, canvas.width, 0);
  gradient.addColorStop(0, '#1a1a2e');
  gradient.addColorStop(1, '#16213e');
  context.fillStyle = gradient;
  context.fillRect(0, 0, canvas.width, canvas.height);

  // Ramka
  context.strokeStyle = '#5865F2';
  context.lineWidth = 3;
  context.strokeRect(0, 0, canvas.width, canvas.height);

  // Oblicz progress
  const progress = userLevel.getProgress();

  // Progress bar - tło
  const barX = 220;
  const barY = 130;
  const barWidth = 520;
  const barHeight = 30;
  const barRadius = 15;

  // Tło progress bara
  context.fillStyle = '#2d2d44';
  context.beginPath();
  context.roundRect(barX, barY, barWidth, barHeight, barRadius);
  context.fill();

  // Wypełnienie progress bara
  const fillWidth = (progress.percentage / 100) * barWidth;
  if (fillWidth > 0) {
    const progressGradient = context.createLinearGradient(barX, 0, barX + barWidth, 0);
    progressGradient.addColorStop(0, '#5865F2');
    progressGradient.addColorStop(1, '#7289da');
    context.fillStyle = progressGradient;
    context.beginPath();
    context.roundRect(barX, barY, Math.max(fillWidth, barRadius * 2), barHeight, barRadius);
    context.fill();
  }

  // Tekst procentów na pasku
  context.font = 'bold 16px sans-serif';
  context.fillStyle = '#ffffff';
  context.textAlign = 'center';
  context.fillText(`${progress.percentage}%`, barX + barWidth / 2, barY + 21);

  // Avatar użytkownika (okrągły)
  context.save();
  context.beginPath();
  context.arc(100, 100, 70, 0, Math.PI * 2, true);
  context.closePath();
  context.clip();

  const avatarURL = user.displayAvatarURL({ extension: 'jpg', size: 256 });
  const avatar = await loadImage(avatarURL);
  context.drawImage(avatar, 30, 30, 140, 140);
  context.restore();

  // Obramowanie avatara
  context.strokeStyle = '#5865F2';
  context.lineWidth = 4;
  context.beginPath();
  context.arc(100, 100, 70, 0, Math.PI * 2, true);
  context.stroke();

  // Nazwa użytkownika
  context.font = 'bold 28px sans-serif';
  context.fillStyle = '#ffffff';
  context.textAlign = 'left';
  const username = user.username.length > 18 ? user.username.slice(0, 18) + '...' : user.username;
  context.fillText(username, 220, 45);

  // Rank
  context.font = 'bold 20px sans-serif';
  context.fillStyle = '#7289da';
  context.textAlign = 'right';
  context.fillText(`RANK #${rank}`, canvas.width - 30, 45);

  // Level
  context.font = 'bold 36px sans-serif';
  context.fillStyle = '#ffd700';
  context.textAlign = 'left';
  context.fillText(`LVL ${userLevel.level}`, 220, 90);

  // XP info
  context.font = '18px sans-serif';
  context.fillStyle = '#a0a0a0';
  context.textAlign = 'right';
  context.fillText(`${progress.currentXp.toLocaleString()} / ${progress.requiredXp.toLocaleString()} XP`, canvas.width - 30, 90);

  // Total XP
  context.font = '14px sans-serif';
  context.fillStyle = '#6a6a8a';
  context.textAlign = 'right';
  context.fillText(`Total: ${userLevel.xp.toLocaleString()} XP | Messages: ${userLevel.totalMessages.toLocaleString()}`, canvas.width - 30, 115);

  return canvas.toBuffer('image/png');
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('level')
    .setDescription('Check your level and XP progress')
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('User to check level for (optional)')
        .setRequired(false)
    ),

  async execute(interaction) {
    await interaction.deferReply();

    try {
      const targetUser = interaction.options.getUser('user') || interaction.user;

      // Sprawdź czy system poziomów jest włączony
      const guild = await models.Guild.findOne({
        where: { guildId: interaction.guildId, isActive: true }
      });

      if (!guild?.settings?.levelingEnabled) {
        return interaction.editReply({
          embeds: [createErrorEmbed('System wyłączony', 'System poziomów nie jest włączony na tym serwerze.')],
        });
      }

      // Pobierz dane użytkownika
      let userLevel = await models.UserLevel.findOne({
        where: {
          discordId: targetUser.id,
          guildId: interaction.guildId
        }
      });

      if (!userLevel) {
        // Utwórz nowy rekord jeśli nie istnieje
        userLevel = await models.UserLevel.create({
          discordId: targetUser.id,
          guildId: interaction.guildId,
          xp: 0,
          level: 0,
          totalMessages: 0
        });
      }

      // Oblicz ranking użytkownika
      const rank = await models.UserLevel.count({
        where: {
          guildId: interaction.guildId,
          xp: { [require('sequelize').Op.gt]: userLevel.xp }
        }
      }) + 1;

      // Wygeneruj obrazek
      const imageBuffer = await generateLevelCard(
        targetUser,
        userLevel,
        rank,
        interaction.guild.name
      );

      const attachment = new AttachmentBuilder(imageBuffer, { name: 'level-card.png' });

      await interaction.editReply({ files: [attachment] });

      // Zapisz użycie komendy
      await models.CommandUsage.create({
        guildId: interaction.guildId,
        userId: interaction.user.id,
        commandName: 'level',
        success: true
      });

    } catch (error) {
      logger.error('Level command error:', error);
      await interaction.editReply({
        embeds: [createErrorEmbed('Błąd', 'Nie udało się pobrać informacji o poziomie.')]
      });

      await models.CommandUsage.create({
        guildId: interaction.guildId,
        userId: interaction.user.id,
        commandName: 'level',
        success: false,
        errorMessage: error.message
      });
    }
  }
};
