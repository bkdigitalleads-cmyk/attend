/**
 * Removes the push entitlement (aps-environment) that expo-notifications'
 * config plugin adds. The app only schedules local notifications (the trial
 * reminder), which do not need it, and the "Attend App Store" provisioning
 * profile has no Push Notifications capability, so a build with it fails.
 *
 * Listed in app.json "plugins". Expo applies the expo-notifications plugin
 * after the app.json plugins, and mods run newest first, so this one runs
 * after it and has the last word.
 */
const { withEntitlementsPlist } = require('expo/config-plugins');

module.exports = function withoutPushEntitlement(config) {
  return withEntitlementsPlist(config, (cfg) => {
    delete cfg.modResults['aps-environment'];
    return cfg;
  });
};
