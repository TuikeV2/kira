const LICENSE_TIERS = {
  FREE: {
    name: 'Free',
    maxServers: 1,
    features: ['mute', 'unmute', 'warn', 'warnings', 'license', 'stats']
  },
  PREMIUM: {
    name: 'Premium',
    maxServers: 5,
    features: ['mute', 'unmute', 'warn', 'warnings', 'clear', 'license', 'setup', 'stats']
  },
  VIP: {
    name: 'VIP',
    maxServers: -1,
    features: 'all'
  }
};

function canUseCommand(tier, commandName) {
  const tierConfig = LICENSE_TIERS[tier];
  if (!tierConfig) return false;

  if (tierConfig.features === 'all') return true;

  return tierConfig.features.includes(commandName);
}

function getTierConfig(tier) {
  return LICENSE_TIERS[tier] || null;
}

module.exports = {
  LICENSE_TIERS,
  canUseCommand,
  getTierConfig
};
