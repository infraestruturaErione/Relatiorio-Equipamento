const rules = require('../../../shared/validation-rules.json');

const ipv4Regex = new RegExp(rules.ipv4Pattern);
const macRegex = new RegExp(rules.macPattern);
const vlanRegex = new RegExp(rules.vlanPattern);
const networkRangeRegex = new RegExp(rules.networkRangePattern);

function normalize(value) {
  return String(value || '').trim();
}

function isValidIpv4(value) {
  return ipv4Regex.test(normalize(value));
}

function isValidMac(value) {
  return macRegex.test(normalize(value));
}

function isValidVlan(value) {
  const normalized = normalize(value);
  return vlanRegex.test(normalized) && Number(normalized) <= Number(rules.maxVlan);
}

function isValidNetworkRange(value) {
  return networkRangeRegex.test(normalize(value));
}

module.exports = {
  isValidIpv4,
  isValidMac,
  isValidVlan,
  isValidNetworkRange,
};
