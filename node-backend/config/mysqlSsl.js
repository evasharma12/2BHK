/**
 * mysql2 TLS options for RDS/Aurora when require_secure_transport is enabled.
 *
 * - DB_SSL=true|1|yes  → always use TLS (rejectUnauthorized: false for now).
 * - DB_SSL=false|0|no|off → never use TLS (local MySQL).
 * - DB_SSL unset       → use TLS for non-localhost hosts (RDS/Aurora) so deploys
 *                        work even if App Runner has no .env and DB_SSL was omitted.
 */
function getMysql2Ssl() {
  const v = String(process.env.DB_SSL || '')
    .toLowerCase()
    .trim();

  if (v === 'false' || v === '0' || v === 'no' || v === 'off') {
    return undefined;
  }
  if (v === 'true' || v === '1' || v === 'yes') {
    return { rejectUnauthorized: false };
  }

  const host = process.env.DB_HOST || process.env.MYSQLHOST || 'localhost';
  const isLocal =
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host === '::1';

  if (!isLocal) {
    return { rejectUnauthorized: false };
  }

  return undefined;
}

module.exports = { getMysql2Ssl };
