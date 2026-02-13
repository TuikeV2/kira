const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { models } = require('@kira/shared');
const { createSuccessEmbed, createErrorEmbed } = require('../../utils/embedBuilder');
const logger = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('xpadmin')
    .setDescription('Zarzadzaj XP i poziomami uzytkownikow')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(subcommand =>
      subcommand
        .setName('set')
        .setDescription('Ustaw XP uzytkownika')
        .addUserOption(option =>
          option
            .setName('user')
            .setDescription('Uzytkownik')
            .setRequired(true)
        )
        .addIntegerOption(option =>
          option
            .setName('xp')
            .setDescription('Ilosc XP')
            .setRequired(true)
            .setMinValue(0)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('give')
        .setDescription('Dodaj XP uzytkownikowi')
        .addUserOption(option =>
          option
            .setName('user')
            .setDescription('Uzytkownik')
            .setRequired(true)
        )
        .addIntegerOption(option =>
          option
            .setName('xp')
            .setDescription('Ilosc XP do dodania')
            .setRequired(true)
            .setMinValue(1)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('take')
        .setDescription('Zabierz XP uzytkownikowi')
        .addUserOption(option =>
          option
            .setName('user')
            .setDescription('Uzytkownik')
            .setRequired(true)
        )
        .addIntegerOption(option =>
          option
            .setName('xp')
            .setDescription('Ilosc XP do zabrania')
            .setRequired(true)
            .setMinValue(1)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('setlevel')
        .setDescription('Ustaw poziom uzytkownika')
        .addUserOption(option =>
          option
            .setName('user')
            .setDescription('Uzytkownik')
            .setRequired(true)
        )
        .addIntegerOption(option =>
          option
            .setName('level')
            .setDescription('Nowy poziom')
            .setRequired(true)
            .setMinValue(0)
            .setMaxValue(1000)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('reset')
        .setDescription('Zresetuj XP i poziom uzytkownika')
        .addUserOption(option =>
          option
            .setName('user')
            .setDescription('Uzytkownik')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('resetall')
        .setDescription('Zresetuj XP i poziomy wszystkich uzytkownikow na serwerze')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('giveall')
        .setDescription('Dodaj XP wszystkim uzytkownikom')
        .addIntegerOption(option =>
          option
            .setName('xp')
            .setDescription('Ilosc XP do dodania')
            .setRequired(true)
            .setMinValue(1)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('giverole')
        .setDescription('Dodaj XP wszystkim uzytkownikom z dana rola')
        .addRoleOption(option =>
          option
            .setName('role')
            .setDescription('Rola')
            .setRequired(true)
        )
        .addIntegerOption(option =>
          option
            .setName('xp')
            .setDescription('Ilosc XP do dodania')
            .setRequired(true)
            .setMinValue(1)
        )
    ),

  async execute(interaction) {
    await interaction.deferReply();

    try {
      // Sprawdz czy system poziomow jest wlaczony
      const guild = await models.Guild.findOne({
        where: { guildId: interaction.guildId, isActive: true }
      });

      if (!guild?.settings?.levelingEnabled) {
        return interaction.editReply({
          embeds: [createErrorEmbed('System wylaczony', 'System poziomow nie jest wlaczony na tym serwerze.')]
        });
      }

      const subcommand = interaction.options.getSubcommand();

      switch (subcommand) {
        case 'set':
          await handleSetXp(interaction);
          break;
        case 'give':
          await handleGiveXp(interaction);
          break;
        case 'take':
          await handleTakeXp(interaction);
          break;
        case 'setlevel':
          await handleSetLevel(interaction);
          break;
        case 'reset':
          await handleReset(interaction);
          break;
        case 'resetall':
          await handleResetAll(interaction);
          break;
        case 'giveall':
          await handleGiveAll(interaction);
          break;
        case 'giverole':
          await handleGiveRole(interaction);
          break;
      }

    } catch (error) {
      logger.error('XPAdmin command error:', error);
      await interaction.editReply({
        embeds: [createErrorEmbed('Blad', 'Wystapil blad podczas wykonywania komendy.')]
      });
    }
  }
};

async function handleSetXp(interaction) {
  const user = interaction.options.getUser('user');
  const xp = interaction.options.getInteger('xp');

  let [userLevel, created] = await models.UserLevel.findOrCreate({
    where: {
      discordId: user.id,
      guildId: interaction.guildId
    },
    defaults: {
      xp: 0,
      level: 0,
      totalMessages: 0
    }
  });

  const oldXp = userLevel.xp;
  userLevel.xp = xp;
  userLevel.level = models.UserLevel.getLevelFromXp(xp);
  await userLevel.save();

  const embed = new EmbedBuilder()
    .setColor('#00ff00')
    .setTitle('XP Ustawione')
    .setDescription(`Ustawiono XP dla ${user}`)
    .addFields(
      { name: 'Poprzednie XP', value: oldXp.toLocaleString(), inline: true },
      { name: 'Nowe XP', value: xp.toLocaleString(), inline: true },
      { name: 'Poziom', value: userLevel.level.toString(), inline: true }
    )
    .setTimestamp();

  await interaction.editReply({ embeds: [embed] });
  logger.info(`[XPAdmin] ${interaction.user.tag} set ${user.tag}'s XP to ${xp} in ${interaction.guild.name}`);
}

async function handleGiveXp(interaction) {
  const user = interaction.options.getUser('user');
  const xpToAdd = interaction.options.getInteger('xp');

  let [userLevel, created] = await models.UserLevel.findOrCreate({
    where: {
      discordId: user.id,
      guildId: interaction.guildId
    },
    defaults: {
      xp: 0,
      level: 0,
      totalMessages: 0
    }
  });

  const oldXp = userLevel.xp;
  const oldLevel = userLevel.level;
  userLevel.xp += xpToAdd;
  userLevel.level = models.UserLevel.getLevelFromXp(userLevel.xp);
  await userLevel.save();

  const embed = new EmbedBuilder()
    .setColor('#00ff00')
    .setTitle('XP Dodane')
    .setDescription(`Dodano ${xpToAdd.toLocaleString()} XP dla ${user}`)
    .addFields(
      { name: 'Poprzednie XP', value: oldXp.toLocaleString(), inline: true },
      { name: 'Nowe XP', value: userLevel.xp.toLocaleString(), inline: true },
      { name: 'Poziom', value: `${oldLevel} -> ${userLevel.level}`, inline: true }
    )
    .setTimestamp();

  await interaction.editReply({ embeds: [embed] });
  logger.info(`[XPAdmin] ${interaction.user.tag} gave ${xpToAdd} XP to ${user.tag} in ${interaction.guild.name}`);
}

async function handleTakeXp(interaction) {
  const user = interaction.options.getUser('user');
  const xpToTake = interaction.options.getInteger('xp');

  let userLevel = await models.UserLevel.findOne({
    where: {
      discordId: user.id,
      guildId: interaction.guildId
    }
  });

  if (!userLevel) {
    return interaction.editReply({
      embeds: [createErrorEmbed('Brak danych', 'Ten uzytkownik nie ma jeszcze zadnych punktow doswiadczenia.')]
    });
  }

  const oldXp = userLevel.xp;
  const oldLevel = userLevel.level;
  userLevel.xp = Math.max(0, userLevel.xp - xpToTake);
  userLevel.level = models.UserLevel.getLevelFromXp(userLevel.xp);
  await userLevel.save();

  const embed = new EmbedBuilder()
    .setColor('#ff9900')
    .setTitle('XP Zabrane')
    .setDescription(`Zabrano ${xpToTake.toLocaleString()} XP od ${user}`)
    .addFields(
      { name: 'Poprzednie XP', value: oldXp.toLocaleString(), inline: true },
      { name: 'Nowe XP', value: userLevel.xp.toLocaleString(), inline: true },
      { name: 'Poziom', value: `${oldLevel} -> ${userLevel.level}`, inline: true }
    )
    .setTimestamp();

  await interaction.editReply({ embeds: [embed] });
  logger.info(`[XPAdmin] ${interaction.user.tag} took ${xpToTake} XP from ${user.tag} in ${interaction.guild.name}`);
}

async function handleSetLevel(interaction) {
  const user = interaction.options.getUser('user');
  const level = interaction.options.getInteger('level');

  // Oblicz XP potrzebne na dany poziom
  let requiredXp = 0;
  for (let i = 0; i < level; i++) {
    requiredXp += models.UserLevel.getRequiredXp(i);
  }

  let [userLevel, created] = await models.UserLevel.findOrCreate({
    where: {
      discordId: user.id,
      guildId: interaction.guildId
    },
    defaults: {
      xp: 0,
      level: 0,
      totalMessages: 0
    }
  });

  const oldLevel = userLevel.level;
  userLevel.xp = requiredXp;
  userLevel.level = level;
  await userLevel.save();

  const embed = new EmbedBuilder()
    .setColor('#00ff00')
    .setTitle('Poziom Ustawiony')
    .setDescription(`Ustawiono poziom dla ${user}`)
    .addFields(
      { name: 'Poprzedni poziom', value: oldLevel.toString(), inline: true },
      { name: 'Nowy poziom', value: level.toString(), inline: true },
      { name: 'XP', value: requiredXp.toLocaleString(), inline: true }
    )
    .setTimestamp();

  await interaction.editReply({ embeds: [embed] });
  logger.info(`[XPAdmin] ${interaction.user.tag} set ${user.tag}'s level to ${level} in ${interaction.guild.name}`);
}

async function handleReset(interaction) {
  const user = interaction.options.getUser('user');

  const deleted = await models.UserLevel.destroy({
    where: {
      discordId: user.id,
      guildId: interaction.guildId
    }
  });

  if (deleted === 0) {
    return interaction.editReply({
      embeds: [createErrorEmbed('Brak danych', 'Ten uzytkownik nie ma jeszcze zadnych punktow doswiadczenia.')]
    });
  }

  const embed = new EmbedBuilder()
    .setColor('#ff0000')
    .setTitle('XP Zresetowane')
    .setDescription(`Zresetowano XP i poziom dla ${user}`)
    .setTimestamp();

  await interaction.editReply({ embeds: [embed] });
  logger.info(`[XPAdmin] ${interaction.user.tag} reset ${user.tag}'s XP in ${interaction.guild.name}`);
}

async function handleResetAll(interaction) {
  const count = await models.UserLevel.destroy({
    where: {
      guildId: interaction.guildId
    }
  });

  const embed = new EmbedBuilder()
    .setColor('#ff0000')
    .setTitle('Wszystkie XP Zresetowane')
    .setDescription(`Zresetowano XP i poziomy dla ${count} uzytkownikow`)
    .setTimestamp();

  await interaction.editReply({ embeds: [embed] });
  logger.info(`[XPAdmin] ${interaction.user.tag} reset all XP (${count} users) in ${interaction.guild.name}`);
}

async function handleGiveAll(interaction) {
  const xpToAdd = interaction.options.getInteger('xp');

  const [updatedCount] = await models.UserLevel.update(
    {
      xp: models.sequelize.literal(`xp + ${xpToAdd}`)
    },
    {
      where: {
        guildId: interaction.guildId
      }
    }
  );

  // Przelicz poziomy dla wszystkich
  const allUsers = await models.UserLevel.findAll({
    where: { guildId: interaction.guildId }
  });

  for (const user of allUsers) {
    const newLevel = models.UserLevel.getLevelFromXp(user.xp);
    if (newLevel !== user.level) {
      user.level = newLevel;
      await user.save();
    }
  }

  const embed = new EmbedBuilder()
    .setColor('#00ff00')
    .setTitle('XP Dodane Wszystkim')
    .setDescription(`Dodano ${xpToAdd.toLocaleString()} XP dla ${updatedCount} uzytkownikow`)
    .setTimestamp();

  await interaction.editReply({ embeds: [embed] });
  logger.info(`[XPAdmin] ${interaction.user.tag} gave ${xpToAdd} XP to all users (${updatedCount}) in ${interaction.guild.name}`);
}

async function handleGiveRole(interaction) {
  const role = interaction.options.getRole('role');
  const xpToAdd = interaction.options.getInteger('xp');

  // Pobierz wszystkich czlonkow z ta rola
  await interaction.guild.members.fetch();
  const membersWithRole = interaction.guild.members.cache.filter(m => m.roles.cache.has(role.id) && !m.user.bot);

  let updatedCount = 0;
  for (const [, member] of membersWithRole) {
    let [userLevel, created] = await models.UserLevel.findOrCreate({
      where: {
        discordId: member.id,
        guildId: interaction.guildId
      },
      defaults: {
        xp: 0,
        level: 0,
        totalMessages: 0
      }
    });

    userLevel.xp += xpToAdd;
    userLevel.level = models.UserLevel.getLevelFromXp(userLevel.xp);
    await userLevel.save();
    updatedCount++;
  }

  const embed = new EmbedBuilder()
    .setColor('#00ff00')
    .setTitle('XP Dodane')
    .setDescription(`Dodano ${xpToAdd.toLocaleString()} XP dla ${updatedCount} uzytkownikow z rola ${role}`)
    .setTimestamp();

  await interaction.editReply({ embeds: [embed] });
  logger.info(`[XPAdmin] ${interaction.user.tag} gave ${xpToAdd} XP to ${updatedCount} users with role ${role.name} in ${interaction.guild.name}`);
}
