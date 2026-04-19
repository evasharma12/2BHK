/**
 * mysql2 TLS options for RDS/Aurora when require_secure_transport is enabled.
 * Set DB_SSL to true, 1, or yes (case-insensitive).
 */
function getMysql2Ssl() {
  const v = String(process.env.DB_SSL || '')
    .toLowerCase()
    .trim();
  if (v === 'true' || v === '1' || v === 'yes') {
    return { rejectUnauthorized: false };
  }
  return undefined;
}

module.exports = { getMysql2Ssl };
